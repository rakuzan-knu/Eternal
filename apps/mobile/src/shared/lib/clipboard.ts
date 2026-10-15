import { Platform } from 'react-native';

/**
 * Checks if system clipboard contains an email address.
 * Returns the email string or null.
 */
export async function getClipboardEmail(): Promise<string | null> {
  try {
    let text: string | undefined;

    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        text = (await navigator.clipboard.readText())?.trim();
      }
    } else {
      const Clipboard = require('expo-clipboard');
      const hasString = await Clipboard.hasStringAsync();
      if (hasString) {
        text = (await Clipboard.getStringAsync())?.trim();
      }
    }

    if (!text) return null;

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (emailRegex.test(text)) {
      return text;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Checks if system clipboard contains a verification/reset code or token.
 */
export async function getClipboardResetCode(): Promise<string | null> {
  try {
    let text: string | undefined;

    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        text = (await navigator.clipboard.readText())?.trim();
      }
    } else {
      const Clipboard = require('expo-clipboard');
      const hasString = await Clipboard.hasStringAsync();
      if (hasString) {
        text = (await Clipboard.getStringAsync())?.trim();
      }
    }

    if (!text) return null;

    if (/^[0-9]{6}$/.test(text) || /^[a-zA-Z0-9-_]{16,64}$/.test(text)) {
      return text;
    }
    return null;
  } catch {
    return null;
  }
}
