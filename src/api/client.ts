import { Code, ConnectError, createClient, type Interceptor } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { AdminService } from "@/gen/dental/v1/admin_pb";
import { endSession, getSession } from "@/auth/store";

/** Calls that take longer fail with DEADLINE_EXCEEDED (shown as "server unreachable"). */
const TIMEOUT_MS = 20_000;

/**
 * Sends the admin session's CSRF token with every call. The session's JWT is an
 * HttpOnly cookie the server set at login: the browser sends it by itself and
 * scripts here can never read it. A call the server refuses with UNAUTHENTICATED
 * (session expired or revoked, administrator disabled) ends the session here too,
 * so the panel goes back to the login screen and says why.
 */
const sessionInterceptor: Interceptor = (next) => async (req) => {
  const session = getSession();
  if (session) req.header.set("X-CSRF-Token", session.csrfToken);
  try {
    return await next(req);
  } catch (error) {
    // Only the session that was sent: not a failed login, not one that already changed.
    if (session && getSession() === session && ConnectError.from(error).code === Code.Unauthenticated) {
      endSession({ key: "errors.sessionEnded" });
    }
    throw error;
  }
};

/**
 * The RPCs are served on the panel's own origin: forwarded to the dental server by
 * the Vite dev server (vite.config.ts) or, in production, by the web server in front
 * of both (see README.md). Uses the Connect protocol with binary Protobuf
 * (application/proto), which the server accepts alongside JSON.
 */
const transport = createConnectTransport({
  baseUrl: window.location.origin,
  useBinaryFormat: true,
  interceptors: [sessionInterceptor],
  defaultTimeoutMs: TIMEOUT_MS,
});

export const adminClient = createClient(AdminService, transport);
