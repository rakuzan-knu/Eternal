/**
 * Visual Connection Quality Radar Engine
 *
 * Converts obscure technical WebRTC metrics (Packet Loss %, Jitter ms, Frame Drops)
 * into intuitive, plain-language diagnostics and an animated visual radar status.
 *
 * Examples:
 * - "У Ивана слабый Wi-Fi (потери пакетов)"
 * - "У Анны перегружен процессор (просадка FPS)"
 * - "Слабое освещение (темная камера)"
 * - "Нестабильный интернет (высокий пинг)"
 */

export type ConnectionQualityLevel = 'excellent' | 'fair' | 'poor';

export type QualityIssueType =
  'none' | 'packet_loss' | 'cpu_overload' | 'high_latency' | 'low_light';

export interface RawQualityMetrics {
  packetLossPercent: number; // 0 to 100
  fps: number; // Current rendering FPS (0 - 60)
  jitterMs: number; // Jitter in milliseconds
  rttMs: number; // Round trip time in milliseconds
  luminance?: number | null; // 0 (black) to 255 (white)
}

export interface RadarDiagnosticResult {
  quality: ConnectionQualityLevel;
  healthScore: number; // 0 to 100
  primaryIssue: QualityIssueType;
  headline: string;
  plainLanguageHint: string;
  technicalDetails: string;
  recommendation: string;
  colorHex: string;
  pulseSpeedSec: number;
}

/**
 * Diagnostic thresholds
 */
export const QUALITY_THRESHOLDS = {
  PACKET_LOSS_FAIR: 4.0, // > 4% is degraded
  PACKET_LOSS_POOR: 12.0, // > 12% is severe packet loss
  FPS_FAIR: 20, // < 20 FPS is degraded
  FPS_POOR: 12, // < 12 FPS is severe CPU throttling
  JITTER_FAIR_MS: 40, // > 40 ms
  JITTER_POOR_MS: 90, // > 90 ms
  RTT_FAIR_MS: 200, // > 200 ms
  RTT_POOR_MS: 400, // > 400 ms
  LUMINANCE_DARK: 28, // < 28 is underexposed/dark
} as const;

/**
 * Evaluates raw network & video metrics and produces a user-friendly radar diagnosis.
 */
export function analyzeConnectionQuality(
  metrics: RawQualityMetrics,
  userName?: string | null,
  isLocal: boolean = false,
): RadarDiagnosticResult {
  const { packetLossPercent, fps, jitterMs, rttMs, luminance } = metrics;
  const name = userName?.trim() || (isLocal ? 'вас' : 'собеседника');

  // 1. Check Severe Network Packet Loss (Wi-Fi dropouts)
  if (packetLossPercent >= QUALITY_THRESHOLDS.PACKET_LOSS_POOR) {
    const hint = isLocal
      ? `У вас слабый Wi-Fi (потери пакетов ${Math.round(packetLossPercent)}%)`
      : `У ${name} слабый Wi-Fi (потери пакетов)`;

    return {
      quality: 'poor',
      healthScore: Math.max(10, Math.round(100 - packetLossPercent * 2.5)),
      primaryIssue: 'packet_loss',
      headline: 'Слабый Wi-Fi',
      plainLanguageHint: hint,
      technicalDetails: `Потери: ${packetLossPercent.toFixed(1)}% • Пинг: ${Math.round(rttMs)} мс`,
      recommendation: isLocal
        ? 'Подойдите ближе к роутеру или переключитесь на проводной интернет'
        : 'У собеседника прерывается сигнал беспроводной сети',
      colorHex: '#ef4444', // Red-500
      pulseSpeedSec: 0.8,
    };
  }

  // 2. Check CPU Overload / GPU Hardware Throttling
  // If FPS is critically low but packet loss is minimal, the bottleneck is hardware computation
  if (
    fps < QUALITY_THRESHOLDS.FPS_POOR &&
    packetLossPercent < QUALITY_THRESHOLDS.PACKET_LOSS_FAIR
  ) {
    const hint = isLocal
      ? `У вас перегружен процессор (просадка до ${Math.round(fps)} FPS)`
      : `У ${name} перегружен процессор (просадка FPS)`;

    return {
      quality: 'poor',
      healthScore: Math.max(15, Math.round((fps / 30) * 50)),
      primaryIssue: 'cpu_overload',
      headline: 'Перегружен процессор',
      plainLanguageHint: hint,
      technicalDetails: `FPS: ${Math.round(fps)} • Пакеты в норме`,
      recommendation: isLocal
        ? 'Закройте тяжелые фоновые вкладки и программы'
        : 'Устройство собеседника испытывает высокую нагрузку',
      colorHex: '#f97316', // Orange-500
      pulseSpeedSec: 1.0,
    };
  }

  // 3. Check Moderate Packet Loss
  if (packetLossPercent >= QUALITY_THRESHOLDS.PACKET_LOSS_FAIR) {
    const hint = isLocal
      ? `Нестабильный Wi-Fi (потери ${Math.round(packetLossPercent)}%)`
      : `У ${name} слабый Wi-Fi (потери пакетов)`;

    return {
      quality: 'fair',
      healthScore: Math.max(40, Math.round(100 - packetLossPercent * 3.5)),
      primaryIssue: 'packet_loss',
      headline: 'Нестабильный Wi-Fi',
      plainLanguageHint: hint,
      technicalDetails: `Потери: ${packetLossPercent.toFixed(1)}% • Jitter: ${Math.round(jitterMs)} мс`,
      recommendation: 'Возможны кратковременные задержки аудио и артефакты видео',
      colorHex: '#f59e0b', // Amber-500
      pulseSpeedSec: 1.4,
    };
  }

  // 4. Check Moderate FPS Drop (CPU/Power throttle)
  if (
    fps < QUALITY_THRESHOLDS.FPS_FAIR &&
    packetLossPercent < QUALITY_THRESHOLDS.PACKET_LOSS_FAIR
  ) {
    const hint = isLocal
      ? `Небольшая просадка FPS (${Math.round(fps)} к/с)`
      : `У ${name} перегружен процессор (просадка FPS)`;

    return {
      quality: 'fair',
      healthScore: Math.max(50, Math.round((fps / 30) * 75)),
      primaryIssue: 'cpu_overload',
      headline: 'Просадка FPS',
      plainLanguageHint: hint,
      technicalDetails: `FPS: ${Math.round(fps)} • Задержка: ${Math.round(rttMs)} мс`,
      recommendation: 'Снизьте разрешение видео или отключите энергосбережение',
      colorHex: '#f59e0b',
      pulseSpeedSec: 1.5,
    };
  }

  // 5. Check High Latency / Bufferbloat
  if (rttMs >= QUALITY_THRESHOLDS.RTT_POOR_MS || jitterMs >= QUALITY_THRESHOLDS.JITTER_POOR_MS) {
    const hint = isLocal
      ? `Высокая задержка сети (${Math.round(rttMs)} мс)`
      : `У ${name} нестабильный интернет (высокая задержка)`;

    return {
      quality: 'fair',
      healthScore: 55,
      primaryIssue: 'high_latency',
      headline: 'Высокая задержка',
      plainLanguageHint: hint,
      technicalDetails: `RTT: ${Math.round(rttMs)} мс • Jitter: ${Math.round(jitterMs)} мс`,
      recommendation: 'Присутствует заметное эхо или задержка ответа',
      colorHex: '#eab308', // Yellow-500
      pulseSpeedSec: 1.6,
    };
  }

  // 6. Check Low Ambient Light (Dark camera)
  if (
    luminance !== undefined &&
    luminance !== null &&
    luminance < QUALITY_THRESHOLDS.LUMINANCE_DARK
  ) {
    const hint = isLocal
      ? 'Слабое освещение (темная камера)'
      : `У ${name} слабое освещение (темная камера)`;

    return {
      quality: 'fair',
      healthScore: 78,
      primaryIssue: 'low_light',
      headline: 'Слабое освещение',
      plainLanguageHint: hint,
      technicalDetails: `Освещенность: ${Math.round((luminance / 255) * 100)}% • Связь 100%`,
      recommendation: 'Включите дополнительный источник света или лампу',
      colorHex: '#a855f7', // Purple-500
      pulseSpeedSec: 2.0,
    };
  }

  // 7. Optimal / Excellent Connection
  return {
    quality: 'excellent',
    healthScore: 98,
    primaryIssue: 'none',
    headline: 'Отличное качество',
    plainLanguageHint: 'Связь стабильная и плавная',
    technicalDetails: `Пинг: ${Math.round(rttMs)} мс • ${Math.round(fps)} FPS • Без потерь`,
    recommendation: 'Все параметры видео и звука на высшем уровне',
    colorHex: '#10b981', // Emerald-500
    pulseSpeedSec: 2.5,
  };
}

/**
 * Visual Quality Radar Tracker for sampling and tracking video stream health
 */
export class VisualQualityRadarTracker {
  private currentMetrics: RawQualityMetrics = {
    packetLossPercent: 0,
    fps: 30,
    jitterMs: 12,
    rttMs: 35,
    luminance: null,
  };

  private listeners = new Set<(diag: RadarDiagnosticResult) => void>();
  private userName?: string | null;
  private isLocal: boolean;
  private sampleTimer: number | null = null;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;

  constructor(userName?: string | null, isLocal: boolean = false) {
    this.userName = userName;
    this.isLocal = isLocal;
  }

  public setUserName(name?: string | null): void {
    this.userName = name;
    this.emit();
  }

  public updateMetrics(partial: Partial<RawQualityMetrics>): void {
    this.currentMetrics = {
      ...this.currentMetrics,
      ...partial,
    };
    this.emit();
  }

  public getDiagnosis(): RadarDiagnosticResult {
    return analyzeConnectionQuality(this.currentMetrics, this.userName, this.isLocal);
  }

  public subscribe(fn: (diag: RadarDiagnosticResult) => void): () => void {
    this.listeners.add(fn);
    fn(this.getDiagnosis());
    return () => {
      this.listeners.delete(fn);
    };
  }

  /**
   * Samples a 16x16 thumbnail from a live video element to evaluate luminance.
   */
  public sampleVideoLuminance(videoEl: HTMLVideoElement | null): number | null {
    if (!videoEl || videoEl.readyState < 2 || videoEl.videoWidth === 0) {
      return null;
    }

    try {
      if (!this.offscreenCanvas) {
        if (typeof document !== 'undefined') {
          this.offscreenCanvas = document.createElement('canvas');
          this.offscreenCanvas.width = 16;
          this.offscreenCanvas.height = 16;
          this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
        }
      }

      if (!this.offscreenCtx || !this.offscreenCanvas) return null;

      this.offscreenCtx.drawImage(videoEl, 0, 0, 16, 16);
      const imgData = this.offscreenCtx.getImageData(0, 0, 16, 16).data;

      let totalLum = 0;
      const pixelCount = 16 * 16;
      for (let i = 0; i < imgData.length; i += 4) {
        const r = imgData[i];
        const g = imgData[i + 1];
        const b = imgData[i + 2];
        // Standard Rec. 601 luma formula
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        totalLum += lum;
      }

      const avgLum = totalLum / pixelCount;
      this.updateMetrics({ luminance: avgLum });
      return avgLum;
    } catch {
      return null;
    }
  }

  public dispose(): void {
    if (this.sampleTimer !== null) {
      clearInterval(this.sampleTimer);
      this.sampleTimer = null;
    }
    this.listeners.clear();
    this.offscreenCanvas = null;
    this.offscreenCtx = null;
  }

  private emit(): void {
    const diag = this.getDiagnosis();
    for (const listener of this.listeners) {
      listener(diag);
    }
  }
}
