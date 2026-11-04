// Appends a suffix to every prompt before it is sent in ChatGPT.
const SUFFIX = "answer this in one word";
console.log("[one-word] content script loaded");

const INPUT_SELECTOR = "#prompt-textarea";
// Find the send button belonging to the main prompt box. We look for the
// submit button inside the same form as the input, with fallbacks for older layouts.
function getSendButton() {
  const input = document.querySelector(INPUT_SELECTOR);
  const form = input && input.closest("form");
  const candidates = form
    ? Array.from(form.querySelectorAll('button[type="submit"]'))
    : [];
  const send = candidates.find(
    (b) => !/stop/i.test(b.getAttribute("aria-label") || "")
  );
  return (
    send ||
    document.querySelector(
      'button[data-testid="send-button"], button[aria-label="Send"]'
    )
  );
}

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
  console.log("[one-word] before:", JSON.stringify(getText(input)));
  appendSuffix(input);
  console.log("[one-word] after:", JSON.stringify(getText(input)));
  // Give ChatGPT a moment to register the edit, then click send ourselves.
  setTimeout(() => {
    const btn = getSendButton();
    if (btn) {
      bypass = true;
      btn.click();
      bypass = false;
      console.log("[one-word] clicked send");
    } else {
      console.warn("[one-word] send button not found");
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
    const btn = e.target.closest("button");
    if (!btn || btn !== getSendButton()) return;
    const input = getInput();
    if (!input || !getText(input).trim()) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    sendAfterAppend(input);
  },
  true
);