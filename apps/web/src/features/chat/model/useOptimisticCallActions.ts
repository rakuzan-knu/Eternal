/**
 * Predictive UI with Auto-Reconciliation Engine (Optimistic Local State)
 *
 * Implements 0ms instant UI state transitions, synthetic audio feedback clicks,
 * background signaling dispatch, and a strict 1500ms acknowledgment reconciliation
 * window with automatic state rollback and user alert upon timeout.
 */

export interface OptimisticActionOptions<T> {
  actionName: string;
  optimisticValue: T;
  currentValue: T;
  onApply: (val: T) => void;
  onRollback: (val: T, errorMsg: string) => void;
  dispatchSignaling: (actionId: string, value: T) => Promise<boolean> | void;
  timeoutMs?: number; // default 1500ms
  enableAudioClick?: boolean;
}

export class OptimisticReconciliationManager {
  private pendingActions = new Map<
    string,
    {
      actionName: string;
      previousValue: unknown;
      timer: ReturnType<typeof setTimeout>;
      onRollback: (val: unknown, msg: string) => void;
    }
  >();

  /**
   * Plays a crisp, subtle synthetic audio click (0ms latency feedback)
   */
  public playSyntheticClick(): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.045);
      setTimeout(() => {
        void ctx.close();
      }, 60);
    } catch {
      // Audio click ignored in restricted environments
    }
  }

  /**
   * Executes an action optimistically with 1500ms auto-rollback guarantee
   */
  public executeOptimistic<T>(options: OptimisticActionOptions<T>): string {
    const {
      actionName,
      optimisticValue,
      currentValue,
      onApply,
      onRollback,
      dispatchSignaling,
      timeoutMs = 1500,
      enableAudioClick = true,
    } = options;

    if (enableAudioClick) {
      this.playSyntheticClick();
    }

    // 1. Instant 0ms local state update
    onApply(optimisticValue);

    const actionId = `opt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // 2. Schedule 1500ms reconciliation timeout
    const timer = setTimeout(() => {
      if (this.pendingActions.has(actionId)) {
        console.warn(
          `[OptimisticUI] Action ${actionName} (${actionId}) timed out after ${timeoutMs}ms. Reverting...`,
        );
        onRollback(currentValue, 'Ошибка сети. Действие отменено.');
        this.pendingActions.delete(actionId);
      }
    }, timeoutMs);

    this.pendingActions.set(actionId, {
      actionName,
      previousValue: currentValue,
      timer,
      onRollback: onRollback as (val: unknown, msg: string) => void,
    });

    // 3. Dispatch over signaling network asynchronously
    try {
      void dispatchSignaling(actionId, optimisticValue);
    } catch (err) {
      this.reconcileReject(actionId, String(err));
    }

    return actionId;
  }

  /**
   * Called when server/peer sends confirmation ACK for an optimistic action
   */
  public reconcileAck(actionId: string): boolean {
    const entry = this.pendingActions.get(actionId);
    if (!entry) return false;

    clearTimeout(entry.timer);
    this.pendingActions.delete(actionId);
    return true;
  }

  /**
   * Called when server/peer rejects the action explicitly
   */
  public reconcileReject(actionId: string, reason = 'Ошибка сети.'): boolean {
    const entry = this.pendingActions.get(actionId);
    if (!entry) return false;

    clearTimeout(entry.timer);
    entry.onRollback(entry.previousValue, reason);
    this.pendingActions.delete(actionId);
    return true;
  }

  public getPendingCount(): number {
    return this.pendingActions.size;
  }

  public clear(): void {
    this.pendingActions.forEach((entry) => {
      clearTimeout(entry.timer);
    });
    this.pendingActions.clear();
  }
}

export const globalOptimisticReconciliation = new OptimisticReconciliationManager();
