/** Birth dates as the server keeps them: Gregorian "YYYY-MM-DD", or empty when not given. */

/** The birth date as a local date, to show in the current calendar; undefined if none. */
export function parseBirthDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const [, year, month, day] = match.map(Number);
  return new Date(year, month - 1, day);
}

/** Whole years lived on the day of `now`; undefined if no birth date (or one in the future) is given. */
export function ageInYears(value: string, now: Date): number | undefined {
  const birth = parseBirthDate(value);
  if (!birth) return undefined;
  const hadBirthday =
    now.getMonth() > birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  const age = now.getFullYear() - birth.getFullYear() - (hadBirthday ? 0 : 1);
  return age >= 0 ? age : undefined;
}
