import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { timestampDate, type Timestamp } from "@bufbuild/protobuf/wkt";

type DateLike = Timestamp | Date | number;

function toDate(value: DateLike): Date {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  return timestampDate(value);
}

/**
 * Numbers, amounts and dates in the current language: its digits, and its calendar
 * (e.g. the Persian calendar for Persian). Missing values show as a dash.
 */
export function useFormat() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage;

  return useMemo(() => {
    const number = new Intl.NumberFormat(locale);
    const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
    const dateTime = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
    const empty = t("common.empty");

    return {
      number: (value: number | bigint) => number.format(value),
      /** An amount in Iranian rials, as the server keeps them. */
      rials: (value: bigint) => t("common.rials", { amount: number.format(value) }),
      days: (count: number) => t("common.days", { count, days: number.format(count) }),
      /** A subscription's limits, e.g. "1 clinic, 2 devices per clinic". */
      limits: (clinics: number, devices: number) =>
        t("subscriptions.list.limits", {
          clinics: t("common.clinics", { count: clinics, clinics: number.format(clinics) }),
          devices: t("common.devicesPerClinic", { count: devices, devices: number.format(devices) }),
        }),
      date: (value: DateLike | undefined) => (value === undefined ? empty : date.format(toDate(value))),
      dateTime: (value: DateLike | undefined) => (value === undefined ? empty : dateTime.format(toDate(value))),
    };
  }, [locale, t]);
}
