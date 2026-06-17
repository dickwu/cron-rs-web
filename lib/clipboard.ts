/**
 * Copy text to the clipboard, working in both secure and insecure contexts.
 *
 * The dashboard is commonly served over plain HTTP (e.g. http://10.101.0.18:3000/),
 * where `navigator.clipboard` is undefined. Fall back to a hidden <textarea> plus
 * the legacy `execCommand('copy')` so one-click copy keeps working there.
 */
export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy path (e.g. permission denied, insecure context).
    }
  }

  if (typeof document === 'undefined') return false;

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    // Keep it out of view and unscrollable while still selectable.
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    ta.style.left = '-9999px';
    ta.setAttribute('readonly', '');
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
