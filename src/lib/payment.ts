import type { ParseKeys } from "i18next";
import {
  PaymentMethod,
  PaymentStatus,
  PurchaseMode,
  type ManualTransfer,
  type Payment,
  type PaymentAccount,
} from "@/gen/dental/v1/subscription_pb";
import { uuidToString } from "./uuid";

/** Payment statuses as the panel names them, e.g. in the address bar (?status=pending). */
export type PaymentStatusName = "pending" | "approved" | "rejected" | "canceled";

const STATUS_NAMES: Record<PaymentStatusName, PaymentStatus> = {
  pending: PaymentStatus.PENDING,
  approved: PaymentStatus.APPROVED,
  rejected: PaymentStatus.REJECTED,
  canceled: PaymentStatus.CANCELED,
};

export function isPaymentStatusName(value: unknown): value is PaymentStatusName {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(STATUS_NAMES, value);
}

export function toPaymentStatus(name: PaymentStatusName): PaymentStatus {
  return STATUS_NAMES[name];
}

/** The status's name, or null for one this panel does not know (newer server). */
export function paymentStatusName(status: PaymentStatus): PaymentStatusName | null {
  const entry = Object.entries(STATUS_NAMES).find(([, value]) => value === status);
  return entry ? (entry[0] as PaymentStatusName) : null;
}

export function paymentMethodKey(method: PaymentMethod): ParseKeys {
  switch (method) {
    case PaymentMethod.CARD_TO_CARD:
      return "payments.method.cardToCard";
    case PaymentMethod.BANK_TRANSFER:
      return "payments.method.bankTransfer";
    case PaymentMethod.FREE:
      return "payments.method.free";
    default:
      return "payments.method.unknown";
  }
}

export function purchaseModeKey(mode: PurchaseMode): ParseKeys {
  switch (mode) {
    case PurchaseMode.EXTEND:
      return "payments.mode.extend";
    case PurchaseMode.UPGRADE_NOW:
      return "payments.mode.upgradeNow";
    default:
      return "payments.mode.unknown";
  }
}

/** The owner's own report of the transfer, if the payment has one. */
export function manualTransfer(payment: Payment): ManualTransfer | undefined {
  return payment.details.case === "transfer" ? payment.details.value : undefined;
}

/** Splits digits into groups of 4, as printed on cards and IBANs: "6037 9975 …". */
function groupsOfFour(text: string): string {
  return text.replace(/(.{4})(?=.)/g, "$1 ");
}

export const formatCardNumber = groupsOfFour;
export const formatIban = groupsOfFour;

/** Payment accounts by ID (uuidToString), to find where a payment's money went. */
export function accountsById(accounts: readonly PaymentAccount[]): Map<string, PaymentAccount> {
  return new Map(accounts.map((account) => [uuidToString(account.id), account]));
}

/** A card number as typed (spaces or dashes between groups allowed) → its digits. */
export function normalizeCardNumber(text: string): string {
  return text.replace(/[\s-]/g, "");
}

/** An IBAN as typed (spaces allowed, any case) → "IR" and its digits. */
export function normalizeIban(text: string): string {
  return text.replace(/\s/g, "").toUpperCase();
}

/** Same rules as the server (admin.proto, CreatePaymentAccountRequest). */
export const CARD_NUMBER_PATTERN = /^[0-9]{16}$/;
export const IBAN_PATTERN = /^IR[0-9]{24}$/;
