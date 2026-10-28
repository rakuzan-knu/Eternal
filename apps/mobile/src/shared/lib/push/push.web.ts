import type { PushData } from '@social-network/shared-contracts';

export type PushStatus = 'enabled' | 'off' | 'blocked' | 'unsupported' | 'unconfigured';

export function setVisibleConversation(_id: string | null) {}

export function pushData(_value: unknown): PushData | null {
  return null;
}

export function configurePushPresentation() {}

export async function pushStatus(): Promise<PushStatus> {
  return 'unsupported';
}

export async function enablePush(_ask: boolean): Promise<PushStatus> {
  return 'unsupported';
}

export async function disablePush(_optOut: boolean): Promise<void> {}

export async function refreshPush(): Promise<void> {}

export function onPushOpened(_handler: (data: PushData) => void): () => void {
  return () => {};
}
