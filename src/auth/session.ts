import { timestampMs } from "@bufbuild/protobuf/wkt";
import { adminClient } from "@/api/client";
import { uuidToString } from "@/lib/uuid";
import { endSession, type AdminSession } from "./store";

/** Logs an administrator in. Throws what the API call threw (see toMessage in src/api/errors.ts). */
export async function login(username: string, password: string): Promise<AdminSession> {
  const res = await adminClient.login({ username: username.trim(), password });
  if (!res.admin || !res.sessionExpiresAt || !res.sessionToken) {
    throw new Error("The server's login answer is incomplete.");
  }
  return {
    token: res.sessionToken,
    expiresAt: timestampMs(res.sessionExpiresAt),
    admin: {
      id: uuidToString(res.admin.id),
      username: res.admin.username,
      fullName: res.admin.fullName,
    },
  };
}

/**
 * Ends the session on the server, then here. Logging out always works: if the
 * server cannot be told, its session just expires by itself.
 */
export async function logout(): Promise<void> {
  try {
    await adminClient.logout({});
  } catch (error) {
    console.warn("Could not end the session on the server:", error);
  } finally {
    endSession(null);
  }
}
