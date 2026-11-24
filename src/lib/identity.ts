import { create } from "@bufbuild/protobuf";
import { IdentityType, PersonIdentitySchema, type PersonIdentity } from "@/gen/dental/v1/person_pb";
import { IRAN } from "./countries";

/**
 * Who a person is, officially (PersonIdentity on the server): an Iranian national
 * ID, or the FIDA code of a foreign national together with their nationality.
 */
export type IdentityKind = "national" | "foreign";

export interface Identity {
  kind: IdentityKind;
  number: string;
  /** ISO 3166-1 alpha-2; always "IR" for a national ID. */
  nationality: string;
}

export const NATIONAL_ID_PATTERN = /^[0-9]{10}$/;
export const FIDA_CODE_PATTERN = /^[A-Z0-9]{5,20}$/;
export const NATIONALITY_PATTERN = /^[A-Z]{2}$/;

/** Iranian national ID: 10 digits, the last one a check digit (same rule as the server and the desktop app). */
export function isValidNationalId(id: string): boolean {
  if (!NATIONAL_ID_PATTERN.test(id) || id === id[0].repeat(10)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(id[i]) * (10 - i);
  const remainder = sum % 11;
  const check = Number(id[9]);
  return remainder < 2 ? check === remainder : check === 11 - remainder;
}

/** Whether an identity is complete and well-formed, as the server requires. */
export function isValidIdentity(identity: Identity): boolean {
  return identity.kind === "national"
    ? identity.nationality === IRAN && isValidNationalId(identity.number)
    : FIDA_CODE_PATTERN.test(identity.number) &&
        NATIONALITY_PATTERN.test(identity.nationality) &&
        identity.nationality !== IRAN;
}

/** An identity in the address bar, e.g. ?kind=foreign&number=AB12345&nationality=AF. */
export interface IdentitySearch {
  kind?: IdentityKind;
  number?: string;
  nationality?: string;
}

/** Reads an identity from search parameters; anything incomplete or malformed reads as none. */
export function parseIdentitySearch(search: Record<string, unknown>): IdentitySearch {
  // The router parses search values as JSON, so an all-digit value may arrive as a number.
  const text = (value: unknown) => (typeof value === "number" ? String(value) : typeof value === "string" ? value : "");
  const kind: IdentityKind = search.kind === "foreign" ? "foreign" : "national";
  const identity: Identity = {
    kind,
    number: text(search.number),
    nationality: kind === "national" ? IRAN : text(search.nationality),
  };
  return isValidIdentity(identity) ? toIdentitySearch(identity) : {};
}

export function toIdentitySearch(identity: Identity): IdentitySearch {
  return identity.kind === "national"
    ? { kind: "national", number: identity.number }
    : { kind: "foreign", number: identity.number, nationality: identity.nationality };
}

export function identityFromSearch(search: IdentitySearch): Identity | null {
  if (!search.kind || !search.number) return null;
  return {
    kind: search.kind,
    number: search.number,
    nationality: search.kind === "national" ? IRAN : (search.nationality ?? ""),
  };
}

export function toPersonIdentity(identity: Identity): PersonIdentity {
  return create(PersonIdentitySchema, {
    type: identity.kind === "national" ? IdentityType.NATIONAL : IdentityType.FOREIGN,
    number: identity.number,
    nationality: identity.nationality,
  });
}

export function fromPersonIdentity(identity: PersonIdentity | undefined): Identity | null {
  if (!identity) return null;
  if (identity.type === IdentityType.NATIONAL) return { kind: "national", number: identity.number, nationality: IRAN };
  if (identity.type === IdentityType.FOREIGN) {
    return { kind: "foreign", number: identity.number, nationality: identity.nationality };
  }
  return null;
}
