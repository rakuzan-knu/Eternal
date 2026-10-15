/**
 * Accurately calculates the viewport coordinates (top, left) for a floating toolbar
 * centered directly above the user's active text selection inside a <textarea>.
 */
export function getTextareaSelectionCoordinates(
  textarea: HTMLTextAreaElement,
): { top: number; left: number } | null {
  const { selectionStart, selectionEnd, value } = textarea;
  if (
    selectionStart === null ||
    selectionEnd === null ||
    selectionStart === selectionEnd ||
    !value.slice(selectionStart, selectionEnd).trim()
  ) {
    return null;
  }

  // Fallback for SSR or headless test environments without DOM geometry
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    const rect = textarea.getBoundingClientRect();
    return { top: Math.max(12, rect.top), left: rect.left + rect.width / 2 };
  }

  try {
    const computed = window.getComputedStyle(textarea);
    const mirror = document.createElement('div');

    const propertiesToCopy = [
      'direction',
      'boxSizing',
      'width',
      'overflowX',
      'overflowY',
      'borderTopWidth',
      'borderRightWidth',
      'borderBottomWidth',
      'borderLeftWidth',
      'paddingTop',
      'paddingRight',
      'paddingBottom',
      'paddingLeft',
      'fontStyle',
      'fontVariant',
      'fontWeight',
      'fontSize',
      'lineHeight',
      'fontFamily',
      'textAlign',
      'textTransform',
      'textIndent',
      'letterSpacing',
      'wordSpacing',
      'tabSize',
    ];

    mirror.style.position = 'fixed';
    mirror.style.visibility = 'hidden';
    mirror.style.pointerEvents = 'none';
    mirror.style.top = `${textarea.getBoundingClientRect().top}px`;
    mirror.style.left = `${textarea.getBoundingClientRect().left}px`;
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordWrap = 'break-word';

    propertiesToCopy.forEach((prop) => {
      (mirror.style as any)[prop] = (computed as any)[prop];
    });

    const textBefore = value.substring(0, selectionStart);
    const selectedText = value.substring(selectionStart, selectionEnd);
    const textAfter = value.substring(selectionEnd);

    const span = document.createElement('span');
    span.textContent = selectedText;

    mirror.appendChild(document.createTextNode(textBefore));
    mirror.appendChild(span);
    mirror.appendChild(document.createTextNode(textAfter));

    document.body.appendChild(mirror);

    const spanRect = span.getBoundingClientRect();
    document.body.removeChild(mirror);

    const relativeTop = spanRect.top - textarea.scrollTop;
    const targetTop = Math.max(12, relativeTop);
    const targetLeft = Math.max(
      16,
      Math.min(window.innerWidth - 16, spanRect.left + spanRect.width / 2),
    );

    return {
      top: targetTop,
      left: targetLeft,
    };
  } catch {
    const rect = textarea.getBoundingClientRect();
    return { top: Math.max(12, rect.top), left: rect.left + rect.width / 2 };
  }
}
