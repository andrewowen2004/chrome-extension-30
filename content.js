// Appends a suffix to every prompt before it is sent in ChatGPT.
const SUFFIX = "answer this in one word";

const INPUT_SELECTOR = "#prompt-textarea";
const SEND_SELECTOR = 'button[data-testid="send-button"]';

// While true, our own synthetic click is allowed through untouched.
let bypass = false;

function getInput() {
  return document.querySelector(INPUT_SELECTOR);
}

function getText(el) {
  return el.tagName === "TEXTAREA" ? el.value : el.innerText;
}

function appendSuffix(el) {
  const text = getText(el).trim();
  if (!text || text.toLowerCase().endsWith(SUFFIX)) return;

  el.focus();

  if (el.tagName === "TEXTAREA") {
    // Plain textarea: use the native setter so React notices the change.
    const setter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value"
    ).set;
    setter.call(el, el.value + " " + SUFFIX);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  } else {
    // contenteditable (ProseMirror): move the cursor to the end and insert text.
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand("insertText", false, " " + SUFFIX);
  }
}

function sendAfterAppend(input) {
  appendSuffix(input);
  // Give ChatGPT a moment to register the edit, then click send ourselves.
  setTimeout(() => {
    const btn = document.querySelector(SEND_SELECTOR);
    if (btn) {
      bypass = true;
      btn.click();
      bypass = false;
    }
  }, 60);
}

// Enter key (without Shift) in the main prompt box.
document.addEventListener(
  "keydown",
  (e) => {
    if (e.key !== "Enter" || e.shiftKey || e.isComposing || bypass) return;
    const input = getInput();
    if (!input || !input.contains(e.target)) return;
    if (!getText(input).trim()) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    sendAfterAppend(input);
  },
  true
);

// Clicking the send button.
document.addEventListener(
  "click",
  (e) => {
    if (bypass) return;
    const btn = e.target.closest(SEND_SELECTOR);
    if (!btn) return;
    const input = getInput();
    if (!input || !getText(input).trim()) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    sendAfterAppend(input);
  },
  true
);