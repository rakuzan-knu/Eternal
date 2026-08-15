import { Injectable } from '@nestjs/common';
import * as promClient from 'prom-client';

@Injectable()
export class MetricsService {
  private httpRequestDuration!: promClient.Histogram;
  private httpRequestTotal!: promClient.Counter;
  private httpRequestErrors!: promClient.Counter;
  private activeConnections!: promClient.Gauge;
  private databaseQueryDuration!: promClient.Histogram;
  private redisOperationDuration!: promClient.Histogram;
  private processUptime!: promClient.Gauge;

  constructor() {
    this.initializeMetrics();
    this.setupDefaultMetrics();
  }

  private initializeMetrics() {
    // HTTP Request Duration (in seconds)
    this.httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    });

    // HTTP Request Total
    this.httpRequestTotal = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    // HTTP Errors
    this.httpRequestErrors = new promClient.Counter({
      name: 'http_requests_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'error_code'],
    });

    // Active WebSocket Connections
    this.activeConnections = new promClient.Gauge({
      name: 'websocket_connections_active',
      help: 'Number of active WebSocket connections',
    });

    // Database Query Duration
    this.databaseQueryDuration = new promClient.Histogram({
      name: 'database_query_duration_seconds',
      help: 'Duration of database queries',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
    });

    // Redis Operation Duration
    this.redisOperationDuration = new promClient.Histogram({
      name: 'redis_operation_duration_seconds',
      help: 'Duration of Redis operations',
      labelNames: ['command'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
    });

    // Process Uptime
    this.processUptime = new promClient.Gauge({
      name: 'process_uptime_seconds',
      help: 'Application uptime in seconds',
    });
  }

  private setupDefaultMetrics() {
    // Collect Node.js default metrics
    promClient.collectDefaultMetrics({
      prefix: 'nodejs_',
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
    });

    // Update uptime every 10 seconds
    setInterval(() => {
      this.processUptime.set(process.uptime());
    }, 10000);
  }

  async getMetrics(): Promise<string> {
    return promClient.register.metrics();
  }

  recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    this.httpRequestDuration.observe(
      { method, route, status_code: statusCode },
      duration / 1000, // Convert to seconds
    );
    this.httpRequestTotal.inc({ method, route, status_code: statusCode });
  }

  recordHttpError(method: string, route: string, errorCode: number) {
    this.httpRequestErrors.inc({ method, route, error_code: errorCode });
  }

  incrementActiveConnections() {
    this.activeConnections.inc();
  }

  decrementActiveConnections() {
    this.activeConnections.dec();
  }

  recordDatabaseQuery(operation: string, table: string, duration: number) {
    this.databaseQueryDuration.observe(
      { operation, table },
      duration / 1000, // Convert to seconds
    );
  }

  recordRedisOperation(command: string, duration: number) {
    this.redisOperationDuration.observe(
      { command },
      duration / 1000, // Convert to seconds
    );
  }
}
