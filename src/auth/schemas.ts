import { z } from "zod";
import type { ParseKeys } from "i18next";
import { IRAN } from "@/lib/countries";
import { FIDA_CODE_PATTERN, isValidNationalId, NATIONALITY_PATTERN, type Identity } from "@/lib/identity";
import { CARD_NUMBER_PATTERN, IBAN_PATTERN, normalizeCardNumber, normalizeIban } from "@/lib/payment";

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

// --- Plans (src/components/plan-dialog.tsx) ---------------------------------

/** A whole number typed as text, from `min` to `max`. Same limits as the server (admin.proto). */
const wholeNumber = (min: number, max: number, key: ParseKeys) =>
  z
    .string()
    .trim()
    .refine((v) => /^[0-9]{1,9}$/.test(v) && Number(v) >= min && Number(v) <= max, message(key));

/** Numbers stay text in the form, so the inputs can hold what is typed; converted on submit. */
export const planSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, message("auth.validation.required"))
    // Counted in characters (code points) like the server, not UTF-16 units.
    .refine((v) => [...v].length <= 100, message("plans.validation.nameLength")),
  maxClinics: wholeNumber(1, 1000, "plans.validation.limit"),
  maxDevicesPerClinic: wholeNumber(1, 1000, "plans.validation.limit"),
  durationDays: wholeNumber(1, 3650, "plans.validation.durationDays"),
  // Up to 18 digits always fits the server's int64.
  priceRials: z.string().trim().regex(/^[0-9]{1,18}$/, message("plans.validation.price")),
  // Empty (or 0) means unlimited.
  maxPurchasesPerOwner: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^[0-9]{1,9}$/.test(v) && Number(v) <= 1000), message("plans.validation.maxPurchases")),
  active: z.boolean(),
});
export type PlanValues = z.infer<typeof planSchema>;

// --- Subscriptions (src/pages/subscriptions-page.tsx) -------------------------

/** An account by identity (src/lib/identity.ts). The nationality is only used for foreign nationals. */
export const findUserSchema = z
  .object({
    kind: z.enum(["national", "foreign"]),
    number: z.string().trim(),
    nationality: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "national") {
      if (!isValidNationalId(v.number)) {
        ctx.addIssue({ code: "custom", path: ["number"], message: message("subscriptions.validation.nationalId") });
      }
      return;
    }
    // FIDA codes are typed in any case; the server keeps them in capitals (see toIdentity).
    if (!FIDA_CODE_PATTERN.test(v.number.toUpperCase())) {
      ctx.addIssue({ code: "custom", path: ["number"], message: message("subscriptions.validation.fidaCode") });
    }
    if (!NATIONALITY_PATTERN.test(v.nationality) || v.nationality === IRAN) {
      ctx.addIssue({ code: "custom", path: ["nationality"], message: message("subscriptions.validation.nationality") });
    }
  });
export type FindUserValues = z.infer<typeof findUserSchema>;

/** The identity a valid find-user form describes. */
export function toIdentity(values: FindUserValues): Identity {
  return values.kind === "national"
    ? { kind: "national", number: values.number.trim(), nationality: IRAN }
    : { kind: "foreign", number: values.number.trim().toUpperCase(), nationality: values.nationality };
}

export const sellSubscriptionSchema = z.object({
  planId: z.string().min(1, message("subscriptions.validation.plan")),
  note: z
    .string()
    .trim()
    .refine((v) => [...v].length <= 500, message("subscriptions.validation.noteLength")),
});
export type SellSubscriptionValues = z.infer<typeof sellSubscriptionSchema>;

// --- Payments (src/components/approve-payment-dialog.tsx, reject-payment-dialog.tsx) ---

export const approvePaymentSchema = z.object({
  note: z
    .string()
    .trim()
    .refine((v) => [...v].length <= 500, message("subscriptions.validation.noteLength")),
});
export type ApprovePaymentValues = z.infer<typeof approvePaymentSchema>;

export const rejectPaymentSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, message("payments.validation.reasonRequired"))
    .refine((v) => [...v].length <= 500, message("payments.validation.reasonLength")),
});
export type RejectPaymentValues = z.infer<typeof rejectPaymentSchema>;

// --- Payment accounts (src/components/payment-account-dialog.tsx) ------------

const accountName = z
  .string()
  .trim()
  .min(1, message("auth.validation.required"))
  .refine((v) => [...v].length <= 100, message("paymentAccounts.validation.nameLength"));

/** Card number and IBAN as typed; normalized (src/lib/payment.ts) before checking and on submit. */
export const paymentAccountSchema = z
  .object({
    bankName: accountName,
    holderName: accountName,
    cardNumber: z
      .string()
      .refine((v) => v.trim() === "" || CARD_NUMBER_PATTERN.test(normalizeCardNumber(v)), {
        message: message("paymentAccounts.validation.cardNumber"),
      }),
    iban: z
      .string()
      .refine((v) => v.trim() === "" || IBAN_PATTERN.test(normalizeIban(v)), {
        message: message("paymentAccounts.validation.iban"),
      }),
    // The server's int32.
    position: z
      .string()
      .trim()
      .refine((v) => /^-?[0-9]{1,9}$/.test(v), message("paymentAccounts.validation.position")),
    active: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.cardNumber.trim() === "" && v.iban.trim() === "") {
      ctx.addIssue({
        code: "custom",
        path: ["cardNumber"],
        message: message("paymentAccounts.validation.destinationRequired"),
      });
    }
  });
export type PaymentAccountValues = z.infer<typeof paymentAccountSchema>;
