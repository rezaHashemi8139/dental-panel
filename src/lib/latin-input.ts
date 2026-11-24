import type { ClipboardEvent, KeyboardEvent } from "react";

/**
 * Latin-only typing for fields like username and password: whatever keyboard
 * layout is active (Persian, Arabic, Russian, ...), a key that would type a
 * non-Latin character types the character that same key gives on a US keyboard.
 * Keys that already type plain ASCII are left alone, so Latin layouts such as
 * AZERTY keep working as printed on the keys.
 */

/** Physical key (`KeyboardEvent.code`) → [without Shift, with Shift] on a US keyboard. */
const US_LAYOUT: Record<string, readonly [string, string]> = {
  Backquote: ["`", "~"],
  Digit1: ["1", "!"],
  Digit2: ["2", "@"],
  Digit3: ["3", "#"],
  Digit4: ["4", "$"],
  Digit5: ["5", "%"],
  Digit6: ["6", "^"],
  Digit7: ["7", "&"],
  Digit8: ["8", "*"],
  Digit9: ["9", "("],
  Digit0: ["0", ")"],
  Minus: ["-", "_"],
  Equal: ["=", "+"],
  BracketLeft: ["[", "{"],
  BracketRight: ["]", "}"],
  Backslash: ["\\", "|"],
  Semicolon: [";", ":"],
  Quote: ["'", '"'],
  Comma: [",", "<"],
  Period: [".", ">"],
  Slash: ["/", "?"],
  Space: [" ", " "],
  Numpad0: ["0", "0"],
  Numpad1: ["1", "1"],
  Numpad2: ["2", "2"],
  Numpad3: ["3", "3"],
  Numpad4: ["4", "4"],
  Numpad5: ["5", "5"],
  Numpad6: ["6", "6"],
  Numpad7: ["7", "7"],
  Numpad8: ["8", "8"],
  Numpad9: ["9", "9"],
  NumpadDecimal: [".", "."],
  NumpadAdd: ["+", "+"],
  NumpadSubtract: ["-", "-"],
  NumpadMultiply: ["*", "*"],
  NumpadDivide: ["/", "/"],
};

function usCharacter(event: KeyboardEvent): string | null {
  const letter = /^Key([A-Z])$/.exec(event.code)?.[1];
  if (letter) {
    const upper = event.shiftKey !== event.getModifierState("CapsLock");
    return upper ? letter : letter.toLowerCase();
  }
  const pair = US_LAYOUT[event.code];
  return pair ? pair[event.shiftKey ? 1 : 0] : null;
}

/** True for a key that would type something other than plain printable ASCII. */
function typesNonAscii(key: string): boolean {
  if (key === "Dead") return true;
  const chars = [...key];
  return chars.length === 1 && !/^[\x20-\x7e]$/.test(key);
}

/** Inserts text at the caret like typing would: fires `input` (so forms see it) and keeps undo. */
function insertText(input: HTMLInputElement, text: string) {
  input.focus();
  if (document.execCommand("insertText", false, text)) return;
  // Fallback if execCommand is ever unavailable.
  input.setRangeText(text, input.selectionStart ?? input.value.length, input.selectionEnd ?? input.value.length, "end");
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Persian (U+06F0-06F9) and Arabic-Indic (U+0660-0669) digits → 0-9 (for pasted text, which has no physical keys). */
function latinDigits(text: string): string {
  return text.replace(/[\u06f0-\u06f9\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) & 0xf));
}

export function latinKeyDown(event: KeyboardEvent<HTMLInputElement>) {
  // Shortcuts (Ctrl/⌘) and AltGr characters are the user's own choice; IME input can't be remapped.
  if (event.ctrlKey || event.metaKey || event.altKey || event.nativeEvent.isComposing) return;
  if (!typesNonAscii(event.key)) return;
  const character = usCharacter(event);
  if (character === null) return;
  event.preventDefault();
  insertText(event.currentTarget, character);
  blockRestOfKey(event.currentTarget);
}

/**
 * Some keys type several characters, e.g. Shift+R on the Windows Persian keyboard
 * types "ريال". The browser fires one keydown for the first one (cancelled above),
 * but the rest arrive as text without a keydown of their own. Drop any text typed
 * until the key is released or another key is pressed.
 */
function blockRestOfKey(input: HTMLInputElement) {
  const block = (event: InputEvent) => {
    if (event.inputType === "insertText") event.preventDefault();
  };
  const stop = () => {
    input.removeEventListener("beforeinput", block);
    input.removeEventListener("keyup", stop);
    input.removeEventListener("keydown", stop);
    input.removeEventListener("blur", stop);
  };
  // Added after insertText, so the Latin character itself is not blocked. A native
  // keydown listener on the input runs before React's (on the root), so the next
  // key press is never blocked.
  input.addEventListener("beforeinput", block);
  input.addEventListener("keyup", stop);
  input.addEventListener("keydown", stop);
  input.addEventListener("blur", stop);
}

export function latinPaste(event: ClipboardEvent<HTMLInputElement>) {
  const text = event.clipboardData.getData("text/plain");
  const latin = latinDigits(text);
  if (latin === text) return;
  event.preventDefault();
  insertText(event.currentTarget, latin);
}
