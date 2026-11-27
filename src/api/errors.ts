import { Code, ConnectError } from "@connectrpc/connect";
import type { ParseKeys } from "i18next";
import type { Message } from "@/i18n/message";

/**
 * The server never sends finished text: an error's message is a stable reason
 * code (dental-server/internal/service/common.go). Reasons the panel can meet,
 * with the text shown for them.
 */
const REASONS: Record<string, ParseKeys> = {
  invalid_argument: "errors.invalidInput",
  invalid_credentials: "errors.invalidCredentials",
  user_disabled: "errors.userDisabled",
  unauthenticated: "errors.sessionEnded",
  user_not_found: "errors.userNotFound",
  plan_not_found: "errors.planNotFound",
  plan_inactive: "errors.planInactive",
  subscription_not_found: "errors.subscriptionNotFound",
  payment_not_found: "errors.paymentNotFound",
  // Approved, rejected or canceled by the owner meanwhile.
  payment_not_pending: "errors.paymentNotPending",
  // An upgrade, but a later subscription was sold after it was reported.
  renewal_queued: "errors.renewalQueued",
  payment_account_not_found: "errors.paymentAccountNotFound",
  // The server is up but its database is not ready yet.
  unavailable: "errors.serverUnavailable",
};

/** Whether an API call failed with this reason (e.g. "user_not_found"). */
export function hasReason(error: unknown, reason: string): boolean {
  return error instanceof ConnectError && error.rawMessage === reason;
}

/** Turns anything an API call threw into a message to show. */
export function toMessage(error: unknown): Message {
  if (!(error instanceof ConnectError)) {
    const details = error instanceof Error ? error.message : String(error);
    return { key: "errors.unknown", params: { details } };
  }

  const reason = REASONS[error.rawMessage];
  if (reason) return { key: reason };

  switch (error.code) {
    // 404: the server does not have this RPC (yet).
    case Code.Unimplemented:
      return { key: "errors.unsupported" };
    // No answer from the server: the network failed, the request timed out, or
    // something in between (e.g. the dev proxy) answered instead of the server.
    case Code.Unknown:
    case Code.Unavailable:
    case Code.DeadlineExceeded:
      return { key: "errors.serverUnreachable" };
    default:
      return { key: "errors.server", params: { details: error.rawMessage || Code[error.code] } };
  }
}
