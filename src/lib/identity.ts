import { create } from "@bufbuild/protobuf";
import { PersonIdentitySchema, type PersonIdentity } from "@/gen/dental/v1/person_pb";

/**
 * Who a person is (PersonIdentity on the server): one identification code, e.g. a
 * national ID or any other official code. People are unique across the system by it.
 */

// Same rule as the server (dental-server/proto/dental/v1/person.proto).
export const IDENTITY_CODE_PATTERN = /^[A-Z0-9]{5,20}$/;

/** A code as typed (any case, with spaces or dashes), the way the server takes it. */
export function normalizeIdentityCode(code: string): string {
  return code.replace(/[\s-]/g, "").toUpperCase();
}

/** An identification code from the address bar (?code=…); anything malformed reads as none. */
export function parseIdentityCode(value: unknown): string | undefined {
  // The router parses search values as JSON, so an all-digit value may arrive as a number.
  const code = typeof value === "number" ? String(value) : typeof value === "string" ? value : "";
  return IDENTITY_CODE_PATTERN.test(code) ? code : undefined;
}

export function toPersonIdentity(code: string): PersonIdentity {
  return create(PersonIdentitySchema, { number: code });
}

/** The identification code, or null if the account has none on file. */
export function fromPersonIdentity(identity: PersonIdentity | undefined): string | null {
  return identity?.number || null;
}
