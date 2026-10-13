/** Internal cancellation has a distinct identity from a device/permission failure. */
export class CallSetupCancelledError extends DOMException {
  constructor() {
    super('Call setup was cancelled', 'AbortError');
  }
}
