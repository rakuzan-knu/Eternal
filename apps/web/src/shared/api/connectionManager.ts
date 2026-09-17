export type ConnectionState = 'ACTIVE' | 'HIBERNATING' | 'DISCONNECTED';

export type StateChangeListener = (state: ConnectionState) => void;
export type WakeListener = () => void;

class ConnectionManager {
  private state: ConnectionState = 'ACTIVE';
  private hibernateTimer: NodeJS.Timeout | null = null;
  private readonly stateListeners = new Set<StateChangeListener>();
  private readonly wakeListeners = new Set<WakeListener>();
  private isInitialized = false;

  private readonly HIBERNATE_GRACE_MS = 30_000; // 30s background grace before socket hibernation

  constructor() {
    this.init();
  }

  public init(): void {
    if (this.isInitialized || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    this.isInitialized = true;

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('focus', this.handleFocus);
    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Initial state check
    if (document.visibilityState === 'hidden') {
      this.scheduleHibernate();
    }
  }

  public destroy(): void {
    if (!this.isInitialized || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    this.cancelHibernate();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('focus', this.handleFocus);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);

    this.stateListeners.clear();
    this.wakeListeners.clear();
    this.isInitialized = false;
  }

  public isTabVisible(): boolean {
    if (typeof document === 'undefined') return true;
    return document.visibilityState === 'visible';
  }

  public getState(): ConnectionState {
    return this.state;
  }

  public addStateListener(listener: StateChangeListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  public addWakeListener(listener: WakeListener): () => void {
    this.wakeListeners.add(listener);
    return () => this.wakeListeners.delete(listener);
  }

  public wake(): void {
    this.cancelHibernate();
    if (this.state !== 'ACTIVE') {
      this.setState('ACTIVE');
      this.notifyWake();
    }
  }

  public hibernateNow(): void {
    this.cancelHibernate();
    if (this.state !== 'HIBERNATING') {
      this.setState('HIBERNATING');
    }
  }

  public scheduleHibernate(delayMs: number = this.HIBERNATE_GRACE_MS): void {
    this.cancelHibernate();
    this.hibernateTimer = setTimeout(() => {
      if (document.visibilityState === 'hidden') {
        this.hibernateNow();
      }
    }, delayMs);
  }

  public cancelHibernate(): void {
    if (this.hibernateTimer) {
      clearTimeout(this.hibernateTimer);
      this.hibernateTimer = null;
    }
  }

  /**
   * Exponential backoff with full jitter to avoid thundering-herd reconnect storms
   */
  public calculateBackoffDelay(attempt: number, baseMs = 1000, maxMs = 10000, factor = 2): number {
    const rawDelay = Math.min(maxMs, baseMs * Math.pow(factor, attempt));
    // Full jitter between 50% and 100% of rawDelay
    const jitter = rawDelay * (0.5 + Math.random() * 0.5);
    return Math.floor(jitter);
  }

  private setState(newState: ConnectionState): void {
    if (this.state === newState) return;
    this.state = newState;
    for (const listener of this.stateListeners) {
      try {
        listener(newState);
      } catch {
        // Safe listener invocation
      }
    }
  }

  private notifyWake(): void {
    for (const listener of this.wakeListeners) {
      try {
        listener();
      } catch {
        // Safe listener invocation
      }
    }
  }

  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      this.wake();
    } else {
      this.scheduleHibernate();
    }
  };

  private handleFocus = (): void => {
    if (document.visibilityState === 'visible') {
      this.wake();
    }
  };

  private handleBlur = (): void => {
    if (document.visibilityState === 'hidden') {
      this.scheduleHibernate();
    }
  };

  private handleOnline = (): void => {
    this.wake();
  };

  private handleOffline = (): void => {
    this.setState('DISCONNECTED');
  };
}

export const connectionManager = new ConnectionManager();
