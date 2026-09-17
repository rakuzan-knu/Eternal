import { resolveEditableText } from './e2ee/messageE2ee';

export interface EditableMessage {
  readonly id: string;
  readonly body: string | null;
  readonly conversationId: string;
  readonly sender?: { readonly id?: string | null } | null;
}

/**
 * Shared edit entrypoint for all thread panes. Resolves the decrypted
 * prefill (never raw envelope JSON), prompts, and re-saves through the
 * caller's edit — which re-encrypts when the original was an envelope.
 * Undecryptable messages refuse with an explanation instead of corrupting
 * the stored ciphertext on save.
 */
export async function promptEditMessage(
  message: EditableMessage,
  peerUserId: string | null,
  edit: (messageId: string, body: string, originalBody: string | null) => Promise<unknown>,
): Promise<void> {
  const { editable, text } = await resolveEditableText(message.body, {
    peerUserId,
    conversationId: message.conversationId,
    senderId: message.sender?.id ?? null,
  });
  if (!editable) {
    window.alert('This encrypted message cannot be edited on this device.');
    return;
  }
  const nextBody = window.prompt('Edit message', text);
  if (!nextBody || nextBody === text) return;
  try {
    await edit(message.id, nextBody, message.body);
  } catch {
    window.alert('Could not save the edit. Please try again.');
  }
}
