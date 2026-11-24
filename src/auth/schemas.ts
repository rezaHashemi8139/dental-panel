import { z } from "zod";
import type { ParseKeys } from "i18next";

/**
 * Form rules. Error messages are translation keys, translated while rendering
 * (see `fieldError` in src/lib/form.ts) so they follow language changes.
 * The server checks everything again.
 */
const message = (key: ParseKeys) => key;

const required = z.string().min(1, message("auth.validation.required"));

export const loginSchema = z.object({
  username: required,
  password: required,
});
export type LoginValues = z.infer<typeof loginSchema>;
