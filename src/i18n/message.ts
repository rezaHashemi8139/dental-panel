import type { ParseKeys } from "i18next";
import i18n from "./index";

/**
 * Text to show later: a translation key plus values. Keep the object in state and
 * translate it while rendering, so it follows language changes.
 */
export interface Message {
  key: ParseKeys;
  params?: Record<string, unknown>;
}

/** The text of a message in the current language. */
export function translateMessage(message: Message): string {
  return i18n.t(message.key, { ...message.params, defaultValue: message.key });
}
