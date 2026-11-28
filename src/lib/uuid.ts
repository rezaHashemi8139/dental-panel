/** The server sends IDs as 16 raw UUID bytes; this is their usual text form. */
export function uuidToString(bytes: Uint8Array): string {
  const hex = toHex(bytes);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The 16 raw bytes of a UUID in its usual text form (e.g. from the address bar); null if it is not one. */
export function uuidFromString(text: string): Uint8Array | null {
  if (!UUID_PATTERN.test(text)) return null;
  const hex = text.replace(/-/g, "");
  return Uint8Array.from({ length: 16 }, (_, i) => parseInt(hex.slice(i * 2, i * 2 + 2), 16));
}

/** Bytes as lowercase hex, e.g. to show part of a hash. */
export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
