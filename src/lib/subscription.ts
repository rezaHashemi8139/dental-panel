import { timestampMs } from "@bufbuild/protobuf/wkt";
import type { Subscription } from "@/gen/dental/v1/subscription_pb";

export type SubscriptionStatus = "active" | "upcoming" | "ended" | "canceled";

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
