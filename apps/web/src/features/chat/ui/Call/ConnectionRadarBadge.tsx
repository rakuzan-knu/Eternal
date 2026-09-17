import React, { useState, useEffect, useRef, useMemo } from 'react';
import { WifiOff, Cpu, Activity, Sun, Info, CheckCircle2 } from 'lucide-react';
import {
  RawQualityMetrics,
  RadarDiagnosticResult,
  VisualQualityRadarTracker,
} from '../../lib/webrtc/visualQualityRadar';

interface ConnectionRadarBadgeProps {
  stream?: MediaStream | null;
  videoElement?: HTMLVideoElement | null;
  userName?: string | null;
  isLocal?: boolean;
  metricsOverride?: Partial<RawQualityMetrics>;
  className?: string;
}

export function ConnectionRadarBadge({
  stream,
  videoElement,
  userName,
  isLocal = false,
  metricsOverride,
  className = '',
}: ConnectionRadarBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const trackerRef = useRef<VisualQualityRadarTracker | null>(null);
  if (!trackerRef.current) {
    trackerRef.current = new VisualQualityRadarTracker(userName, isLocal);
  }

  const [diagnosis, setDiagnosis] = useState<RadarDiagnosticResult>(() =>
    trackerRef.current!.getDiagnosis(),
  );

  useEffect(() => {
    const tracker = trackerRef.current;
    if (!tracker) return;
    tracker.setUserName(userName);
  }, [userName]);

  useEffect(() => {
    const tracker = trackerRef.current;
    if (!tracker) return;

    if (metricsOverride) {
      tracker.updateMetrics(metricsOverride);
    }
  }, [metricsOverride]);

  useEffect(() => {
    const tracker = trackerRef.current;
    if (!tracker) return;

    const unsub = tracker.subscribe((d) => {
      setDiagnosis(d);
      // Auto-expand warning pill briefly when degraded
      if (d.quality !== 'excellent') {
        setIsExpanded(true);
      }
    });

    return () => {
      unsub();
    };
  }, []);

  // Periodic video luminance check
  useEffect(() => {
    if (!videoElement || !stream) return;
    const tracker = trackerRef.current;
    if (!tracker) return;

    const interval = setInterval(() => {
      tracker.sampleVideoLuminance(videoElement);
    }, 4000);

    return () => clearInterval(interval);
  }, [videoElement, stream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      trackerRef.current?.dispose();
    };
  }, []);

  const issueIcon = useMemo(() => {
    switch (diagnosis.primaryIssue) {
      case 'packet_loss':
        return <WifiOff size={12} className="text-rose-400 shrink-0" />;
      case 'cpu_overload':
        return <Cpu size={12} className="text-orange-400 shrink-0" />;
      case 'high_latency':
        return <Activity size={12} className="text-amber-400 shrink-0" />;
      case 'low_light':
        return <Sun size={12} className="text-purple-400 shrink-0" />;
      default:
        return <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />;
    }
  }, [diagnosis.primaryIssue]);

  const isDegraded = diagnosis.quality !== 'excellent';

  return (
    <div
      className={`relative inline-flex items-center pointer-events-auto select-none ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Radar Badge Trigger */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-label={`Состояние связи: ${diagnosis.headline}`}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium transition-all backdrop-blur-md border shadow-lg cursor-pointer ${
          diagnosis.quality === 'poor'
            ? 'bg-rose-950/70 border-rose-500/50 text-rose-200 hover:bg-rose-900/80 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
            : diagnosis.quality === 'fair'
              ? 'bg-amber-950/70 border-amber-500/50 text-amber-200 hover:bg-amber-900/80 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
              : 'bg-zinc-900/70 border-emerald-500/30 text-emerald-300 hover:bg-zinc-800/80'
        }`}
      >
        {/* Animated Visual Radar Scope */}
        <div className="relative w-3.5 h-3.5 flex items-center justify-center overflow-hidden rounded-full border border-white/20 bg-black/50">
          {/* Radar rotating sweep beam */}
          <div
            className="absolute inset-0 rounded-full animate-spin pointer-events-none"
            style={{
              animationDuration: `${diagnosis.pulseSpeedSec * 1.5}s`,
              background: `conic-gradient(from 0deg, transparent 0deg, ${diagnosis.colorHex}55 60deg, ${diagnosis.colorHex} 90deg, transparent 91deg)`,
            }}
          />
          {/* Concentric circle */}
          <div className="absolute inset-0.75 rounded-full border border-white/10" />
          {/* Center blip */}
          <div
            className="w-1.5 h-1.5 rounded-full z-10 animate-pulse shadow-sm"
            style={{
              backgroundColor: diagnosis.colorHex,
              animationDuration: `${diagnosis.pulseSpeedSec}s`,
            }}
          />
        </div>

        {/* Dynamic Plain-Language Title / Diagnosis text */}
        <div className="flex items-center gap-1 max-w-52.5 truncate">
          {issueIcon}
          {isDegraded ? (
            <span className="truncate font-semibold tracking-tight text-[10.5px]">
              {diagnosis.plainLanguageHint}
            </span>
          ) : (
            <span className="hidden sm:inline text-[10px] text-emerald-300/90">Связь отличная</span>
          )}
        </div>
      </button>

      {/* Floating Detailed Diagnostic Tooltip */}
      {(showTooltip || isExpanded) && (
        <div
          role="tooltip"
          className="absolute top-full left-0 mt-2 z-50 w-72 p-3 rounded-xl bg-zinc-950/95 border border-white/15 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-left"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px]"
                style={{
                  backgroundColor: diagnosis.colorHex,
                  boxShadow: `0 0 8px ${diagnosis.colorHex}`,
                }}
              />
              <span className="font-semibold text-xs text-white">{diagnosis.headline}</span>
            </div>
            <span
              className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border"
              style={{
                color: diagnosis.colorHex,
                borderColor: `${diagnosis.colorHex}44`,
                backgroundColor: `${diagnosis.colorHex}15`,
              }}
            >
              {diagnosis.quality === 'excellent'
                ? 'Отлично'
                : diagnosis.quality === 'fair'
                  ? 'Внимание'
                  : 'Проблема'}
            </span>
          </div>

          {/* Plain-Language Diagnosis */}
          <p className="text-xs font-medium text-zinc-200 mb-2 leading-relaxed">
            {diagnosis.plainLanguageHint}
          </p>

          {/* Actionable Advice */}
          <div className="flex items-start gap-1.5 bg-white/5 p-2 rounded-lg mb-2">
            <Info size={13} className="text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-zinc-300 leading-snug">{diagnosis.recommendation}</p>
          </div>

          {/* Technical WebRTC Telemetry Footer */}
          <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
            <span>{diagnosis.technicalDetails}</span>
            <span className="text-zinc-500">{diagnosis.healthScore}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
