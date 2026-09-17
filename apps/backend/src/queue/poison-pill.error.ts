export class PoisonPillError extends Error {
  public readonly isPoisonPill = true;
  public readonly context?: Record<string, unknown> | undefined;

  constructor(message: string, context?: Record<string, unknown>) {
    super(`[POISON_PILL] ${message}`);
    this.name = 'PoisonPillError';
    this.context = context;
  }
}
