import { useSyncExternalStore } from "react";
import type { Message } from "@/i18n/message";

/** The logged-in administrator (AdminService.Login). */
export interface AdminSession {
  token: string;
  /** Milliseconds since the epoch. */
  expiresAt: number;
  admin: {
    /** UUID text form. */
    id: string;
    username: string;
    fullName: string;
  };
}

/**
 * The current session. Kept in sessionStorage, so it survives a page reload but
 * not closing the tab, and is never shared with other tabs. It ends by itself
 * when it expires, and when the server refuses it (src/api/client.ts).
 */
const STORAGE_KEY = "session";
/** setTimeout's largest delay (about 24.8 days); longer sessions are checked again after it. */
const MAX_TIMER_MS = 2 ** 31 - 1;

let session: AdminSession | null = null;
/** Why the last session ended by itself, shown once on the login screen. */
let endedMessage: Message | null = null;
let expiryTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

export function getSession(): AdminSession | null {
  return session;
}

function isSession(value: unknown): value is AdminSession {
  const s = value as AdminSession | null;
  return (
    typeof s?.token === "string" &&
    typeof s.expiresAt === "number" &&
    typeof s.admin?.id === "string" &&
    typeof s.admin.username === "string" &&
    typeof s.admin.fullName === "string"
  );
}

/** Restores the session of this tab, if it has not expired. Call once before rendering. */
export function loadSession(): void {
  let saved: unknown = null;
  try {
    saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null");
  } catch {
    // Storage unavailable or unreadable: logged out.
  }
  if (isSession(saved) && saved.expiresAt > Date.now()) {
    apply(saved);
  } else {
    save(null);
  }
}

export function setSession(next: AdminSession): void {
  endedMessage = null;
  apply(next);
  save(next);
}

/**
 * Ends the session on this side. `reason` is shown on the login screen; pass null
 * when the administrator logged out on purpose.
 */
export function endSession(reason: Message | null): void {
  if (!session) return;
  endedMessage = reason;
  apply(null);
  save(null);
}

/** Why the last session ended by itself, once: later calls return null. */
export function takeEndedMessage(): Message | null {
  const message = endedMessage;
  endedMessage = null;
  return message;
}

function apply(next: AdminSession | null) {
  session = next;
  clearTimeout(expiryTimer);
  if (next) scheduleExpiry(next);
  listeners.forEach((listener) => listener());
}

function scheduleExpiry(current: AdminSession) {
  const delay = current.expiresAt - Date.now();
  expiryTimer = setTimeout(
    () => {
      if (session !== current) return;
      if (Date.now() >= current.expiresAt) endSession({ key: "errors.sessionExpired" });
      else scheduleExpiry(current);
    },
    Math.min(Math.max(delay, 0), MAX_TIMER_MS),
  );
}

function save(next: AdminSession | null) {
  try {
    if (next) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable: the session just won't survive a reload.
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The current session; re-renders when it starts or ends. */
export function useSession(): AdminSession | null {
  return useSyncExternalStore(subscribe, getSession);
}
