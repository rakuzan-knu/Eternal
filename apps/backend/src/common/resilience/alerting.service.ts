import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CircuitBreaker } from './circuit-breaker';

export interface DeadLetterAlertPayload {
  originalQueue: string;
  jobId: string;
  jobName: string;
  data: unknown;
  failedReason: string;
  stackTrace?: string | undefined;
  attemptsMade: number;
  failedAt: string;
  traceId?: string | undefined;
  isPoisonPill?: boolean | undefined;
}

export interface DeprecatedApiAlertPayload {
  route: string;
  method: string;
  apiVersion?: string | undefined;
  clientType: string;
  clientVersion?: string | undefined;
  userAgent?: string | undefined;
  sunsetDate?: string | undefined;
  successor?: string | undefined;
  isOutdatedMobile?: boolean | undefined;
}

@Injectable()
export class AlertingService {
  private readonly logger = new Logger(AlertingService.name);
  private readonly slackWebhookUrl?: string | undefined;
  private readonly alertmanagerWebhookUrl?: string | undefined;
  private readonly genericAlertWebhookUrl?: string | undefined;

  private readonly slackCircuitBreaker = new CircuitBreaker({
    name: 'slack-alerts',
    failureThreshold: 3,
    resetTimeoutMs: 30_000,
  });

  private readonly alertmanagerCircuitBreaker = new CircuitBreaker({
    name: 'alertmanager-alerts',
    failureThreshold: 3,
    resetTimeoutMs: 30_000,
  });

  constructor(private readonly configService: ConfigService) {
    this.slackWebhookUrl = this.configService.get<string>('SLACK_WEBHOOK_URL');
    this.alertmanagerWebhookUrl = this.configService.get<string>('ALERTMANAGER_WEBHOOK_URL');
    this.genericAlertWebhookUrl = this.configService.get<string>('ALERT_WEBHOOK_URL');
  }

  async sendDlqAlert(payload: DeadLetterAlertPayload): Promise<void> {
    const alertTitle = payload.isPoisonPill
      ? `🚨 [POISON PILL ISOLATED] Queue: ${payload.originalQueue}`
      : `⚠️ [DEAD LETTER QUEUE] Job Failed 3x: ${payload.originalQueue}`;

    // Always log structured high-severity message
    this.logger.error({
      message: alertTitle,
      event: 'DLQ_JOB_ROUTED',
      queue: payload.originalQueue,
      jobId: payload.jobId,
      jobName: payload.jobName,
      attemptsMade: payload.attemptsMade,
      failedReason: payload.failedReason,
      isPoisonPill: payload.isPoisonPill || false,
      traceId: payload.traceId,
      failedAt: payload.failedAt,
      stackTrace: payload.stackTrace,
    });

    const alertPromises: Promise<void>[] = [];

    // 1. Slack notification
    if (this.slackWebhookUrl) {
      alertPromises.push(this.dispatchSlackAlert(alertTitle, payload));
    }

    // 2. Alertmanager notification
    if (this.alertmanagerWebhookUrl) {
      alertPromises.push(this.dispatchAlertmanagerAlert(alertTitle, payload));
    }

    // 3. Generic Webhook notification
    if (this.genericAlertWebhookUrl) {
      alertPromises.push(this.dispatchGenericWebhook(alertTitle, payload));
    }

    if (alertPromises.length > 0) {
      await Promise.allSettled(alertPromises);
    }
  }

  private async dispatchSlackAlert(title: string, payload: DeadLetterAlertPayload): Promise<void> {
    if (!this.slackWebhookUrl) return;

    await this.slackCircuitBreaker.execute(
      async () => {
        const slackMessage = {
          text: title,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: title.substring(0, 150),
                emoji: true,
              },
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*Queue:* \`${payload.originalQueue}\``,
                },
                {
                  type: 'mrkdwn',
                  text: `*Job ID:* \`${payload.jobId}\``,
                },
                {
                  type: 'mrkdwn',
                  text: `*Job Type:* \`${payload.jobName}\``,
                },
                {
                  type: 'mrkdwn',
                  text: `*Attempts:* \`${payload.attemptsMade}\``,
                },
              ],
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Reason:* \`\`\`${payload.failedReason.substring(0, 500)}\`\`\``,
              },
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `Failed at: ${payload.failedAt} | Trace: ${payload.traceId ?? 'n/a'}`,
                },
              ],
            },
          ],
        };

        await axios.post(this.slackWebhookUrl!, slackMessage, { timeout: 4000 });
      },
      (err) => {
        this.logger.warn(`Failed to deliver Slack DLQ alert: ${(err as Error).message}`);
      },
    );
  }

  private async dispatchAlertmanagerAlert(
    title: string,
    payload: DeadLetterAlertPayload,
  ): Promise<void> {
    if (!this.alertmanagerWebhookUrl) return;

    await this.alertmanagerCircuitBreaker.execute(
      async () => {
        const alertmanagerPayload = [
          {
            labels: {
              alertname: payload.isPoisonPill ? 'BullMQPoisonPillDetected' : 'BullMQDeadLetterJob',
              severity: payload.isPoisonPill ? 'critical' : 'warning',
              queue: payload.originalQueue,
              job_type: payload.jobName,
              service: 'social-network-backend',
            },
            annotations: {
              summary: title,
              description: `Job ${payload.jobId} failed after ${payload.attemptsMade} attempts in queue ${payload.originalQueue}: ${payload.failedReason}`,
              job_id: payload.jobId,
              failed_at: payload.failedAt,
            },
            startsAt: payload.failedAt,
          },
        ];

        await axios.post(this.alertmanagerWebhookUrl!, alertmanagerPayload, { timeout: 4000 });
      },
      (err) => {
        this.logger.warn(`Failed to deliver Alertmanager DLQ alert: ${(err as Error).message}`);
      },
    );
  }

  private async dispatchGenericWebhook(
    title: string,
    payload: DeadLetterAlertPayload,
  ): Promise<void> {
    if (!this.genericAlertWebhookUrl) return;

    try {
      await axios.post(
        this.genericAlertWebhookUrl,
        {
          event: 'DLQ_ALERT',
          title,
          payload,
        },
        { timeout: 4000 },
      );
    } catch (err) {
      this.logger.warn(`Failed to deliver generic webhook DLQ alert: ${(err as Error).message}`);
    }
  }

  private readonly deprecationAlertDebounce = new Map<string, number>();

  /**
   * Fires an alert when deprecated API routes are accessed by mobile clients.
   * Debounced per (route + method + clientType + clientVersion) every 5 minutes.
   */
  async sendDeprecatedApiUsageAlert(payload: DeprecatedApiAlertPayload): Promise<void> {
    const key = `${payload.method}:${payload.route}:${payload.clientType}:${payload.clientVersion || 'unknown'}`;
    const now = Date.now();
    const lastSent = this.deprecationAlertDebounce.get(key) || 0;
    if (now - lastSent < 5 * 60 * 1000) {
      return; // debounced
    }
    this.deprecationAlertDebounce.set(key, now);

    const alertTitle = `📱 [DEPRECATED API CALLED] ${payload.clientType.toUpperCase()} App v${payload.clientVersion || 'unknown'} -> ${payload.method} ${payload.route}`;

    this.logger.warn({
      message: alertTitle,
      event: 'DEPRECATED_API_MOBILE_CLIENT_ACCESSED',
      route: payload.route,
      method: payload.method,
      apiVersion: payload.apiVersion,
      clientType: payload.clientType,
      clientVersion: payload.clientVersion,
      userAgent: payload.userAgent,
      sunsetDate: payload.sunsetDate,
      successor: payload.successor,
    });

    const alertPromises: Promise<void>[] = [];

    if (this.slackWebhookUrl) {
      alertPromises.push(
        this.slackCircuitBreaker.execute(
          async () => {
            const slackMessage = {
              text: alertTitle,
              blocks: [
                {
                  type: 'header',
                  text: {
                    type: 'plain_text',
                    text: alertTitle.substring(0, 150),
                    emoji: true,
                  },
                },
                {
                  type: 'section',
                  fields: [
                    { type: 'mrkdwn', text: `*Route:* \`${payload.method} ${payload.route}\`` },
                    { type: 'mrkdwn', text: `*Client Type:* \`${payload.clientType}\`` },
                    {
                      type: 'mrkdwn',
                      text: `*App Version:* \`${payload.clientVersion || 'n/a'}\``,
                    },
                    { type: 'mrkdwn', text: `*Sunset Date:* \`${payload.sunsetDate || 'n/a'}\`` },
                  ],
                },
                {
                  type: 'context',
                  elements: [
                    {
                      type: 'mrkdwn',
                      text: `Successor: ${payload.successor || 'none'} | User-Agent: \`${payload.userAgent || 'n/a'}\``,
                    },
                  ],
                },
              ],
            };
            await axios.post(this.slackWebhookUrl!, slackMessage, { timeout: 4000 });
          },
          (err) => {
            this.logger.warn(
              `Failed to deliver Slack Deprecated API alert: ${(err as Error).message}`,
            );
          },
        ),
      );
    }

    if (this.alertmanagerWebhookUrl) {
      alertPromises.push(
        this.alertmanagerCircuitBreaker.execute(
          async () => {
            const alertmanagerPayload = [
              {
                labels: {
                  alertname: 'DeprecatedApiMobileClientUsage',
                  severity: 'warning',
                  route: payload.route,
                  method: payload.method,
                  client_type: payload.clientType,
                  service: 'social-network-backend',
                },
                annotations: {
                  summary: alertTitle,
                  description: `${payload.clientType} client v${payload.clientVersion || 'unknown'} invoked deprecated route ${payload.method} ${payload.route}. Sunset: ${payload.sunsetDate || 'none'}`,
                },
                startsAt: new Date().toISOString(),
              },
            ];
            await axios.post(this.alertmanagerWebhookUrl!, alertmanagerPayload, { timeout: 4000 });
          },
          (err) => {
            this.logger.warn(
              `Failed to deliver Alertmanager Deprecated API alert: ${(err as Error).message}`,
            );
          },
        ),
      );
    }

    if (alertPromises.length > 0) {
      await Promise.allSettled(alertPromises);
    }
  }
}
