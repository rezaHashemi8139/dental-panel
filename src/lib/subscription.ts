import { timestampMs } from "@bufbuild/protobuf/wkt";
import { PaymentStatus, PurchaseMode, type Payment, type Subscription } from "@/gen/dental/v1/subscription_pb";
import { uuidToString } from "./uuid";

/** "replaced": ended early because an upgrade took its place (see subscriptionRows). */
export type SubscriptionStatus = "active" | "upcoming" | "ended" | "replaced" | "canceled";

const DAY_MS = 24 * 60 * 60 * 1000;

const ms = (value: Subscription["startsAt"]) => (value ? timestampMs(value) : 0);

export function subscriptionStatus(subscription: Subscription, now: number): SubscriptionStatus {
  if (subscription.canceledAt) return "canceled";
  if (now < ms(subscription.startsAt)) return "upcoming";
  if (now >= ms(subscription.endsAt)) return "ended";
  return "active";
}

/**
 * When the user's paid time ends (renewals already bought included), or null if
 * they have none left. Same rule as the server's SellSubscription.
 */
export function paidUntil(subscriptions: readonly Subscription[], now: number): number | null {
  const end = Math.max(0, ...subscriptions.filter((s) => !s.canceledAt).map((s) => ms(s.endsAt)));
  return end > now ? end : null;
}

/** The period a subscription of `durationDays` sold now would get: it starts when the paid time ends. */
export function nextPeriod(subscriptions: readonly Subscription[], durationDays: number, now: number) {
  const start = paidUntil(subscriptions, now) ?? now;
  return { start, end: start + durationDays * DAY_MS };
}

/**
 * Whether a subscription that has ended was cut short by an upgrade: the next one
 * starts exactly when it ended and was bought with PURCHASE_MODE_UPGRADE_NOW.
 */
function replacedByUpgrade(
  subscription: Subscription,
  subscriptions: readonly Subscription[],
  purchases: ReadonlyMap<string, Payment>,
): boolean {
  const end = ms(subscription.endsAt);
  return subscriptions.some(
    (next) =>
      next !== subscription &&
      ms(next.startsAt) === end &&
      purchases.get(uuidToString(next.id))?.mode === PurchaseMode.UPGRADE_NOW,
  );
}

export interface SubscriptionRow {
  subscription: Subscription;
  status: SubscriptionStatus;
  /** The approved payment that bought it; none when an administrator sold it in the panel. */
  purchase?: Payment;
  /** Whole days left, for an active subscription. */
  daysLeft?: number;
}

/** A user's subscriptions as the panel lists them, each with how it was bought. */
export function subscriptionRows(
  subscriptions: readonly Subscription[],
  payments: readonly Payment[],
  now: number,
): SubscriptionRow[] {
  // Payment.subscription_id is set exactly when the payment was approved.
  const purchases = new Map(
    payments
      .filter((payment) => payment.status === PaymentStatus.APPROVED && payment.subscriptionId.length > 0)
      .map((payment) => [uuidToString(payment.subscriptionId), payment]),
  );
  return subscriptions.map((subscription) => {
    let status = subscriptionStatus(subscription, now);
    if (status === "ended" && replacedByUpgrade(subscription, subscriptions, purchases)) status = "replaced";
    return {
      subscription,
      status,
      purchase: purchases.get(uuidToString(subscription.id)),
      daysLeft: status === "active" ? Math.ceil((ms(subscription.endsAt) - now) / DAY_MS) : undefined,
    };
  });
}
