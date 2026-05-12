/**
 * DevToolkit - Common JS Utilities for Static HTML Prototypes
 * Provides clipboard copy that works on file:// protocol
 */

/**
 * Copy text to clipboard. Works on both secure contexts (HTTPS/localhost)
 * and file:// protocol by falling back to execCommand.
 * @param {string} text - The text to copy
 * @returns {Promise<boolean>} true if copy succeeded
 */
function dtCopy(text) {
  if (!text) return Promise.resolve(false);

  // Try modern Clipboard API first (requires secure context)
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopy(text));
  }

  // Fallback for file:// protocol
  return Promise.resolve(fallbackCopy(text));
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, ta.value.length);
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { /* ignore */ }
  document.body.removeChild(ta);
  return ok;
}

/**
 * Show copy feedback on a button element.
 * Changes button text to "已复制" with green color for 1.2 seconds.
 * @param {HTMLElement} btn - The button element to show feedback on
 * @param {string} [originalText='复制'] - The original button text to restore
 */
function dtCopyFeedback(btn, originalText) {
  if (!btn) return;
  originalText = originalText || btn.textContent || '复制';
  btn.textContent = '已复制';
  btn.style.color = '#16a34a';
  if (btn.classList) {
    btn.classList.add('copied');
  }
  setTimeout(() => {
    btn.textContent = originalText;
    btn.style.color = '';
    if (btn.classList) {
      btn.classList.remove('copied');
    }
  }, 1200);
}

/**
 * Copy text and show feedback on button.
 * Combines dtCopy + dtCopyFeedback.
 * @param {string} text - Text to copy
 * @param {HTMLElement} btn - Button for feedback
 * @param {string} [originalText] - Original button text
 */
function dtCopyWithFeedback(text, btn, originalText) {
  if (!text) return;
  dtCopy(text).then(() => dtCopyFeedback(btn, originalText));
}
