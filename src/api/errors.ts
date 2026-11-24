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
  // The server is up but its database is not ready yet.
  unavailable: "errors.serverUnavailable",
};

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
