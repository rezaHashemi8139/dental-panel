import { getRouteApi, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { adminClient } from "@/api/client";
import type { PaymentReview } from "@/gen/dental/v1/admin_pb";
import { PaymentStatus } from "@/gen/dental/v1/subscription_pb";
import { useFormat } from "@/lib/format";
import { isPaymentStatusName, toPaymentStatus, type PaymentStatusName } from "@/lib/payment";
import { PaymentsTable } from "@/components/payments-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const paymentsRoute = getRouteApi("/app/payments");

/** Which payments are listed. Pending ones (the queue to review) unless the address says otherwise. */
export type PaymentsFilter = PaymentStatusName | "all";

const FILTERS: readonly PaymentsFilter[] = ["pending", "approved", "rejected", "canceled", "all"];

/** ?status=approved|rejected|canceled|all; none (or anything else) means pending. */
export interface PaymentsSearch {
  status?: Exclude<PaymentsFilter, "pending">;
}

export function parsePaymentsSearch(search: Record<string, unknown>): PaymentsSearch {
  const status = search.status;
  if (status === "all" || (isPaymentStatusName(status) && status !== "pending")) return { status };
  return {};
}

/** How many payments the server sends at most; it allows up to 500. */
const LIMIT = 100;

export interface PaymentsData {
  filter: PaymentsFilter;
  payments: PaymentReview[];
}

/** Data of /payments (src/router.tsx): pending payments oldest first, the others newest first. */
export async function loadPayments(search: PaymentsSearch): Promise<PaymentsData> {
  const filter: PaymentsFilter = search.status ?? "pending";
  const status = filter === "all" ? PaymentStatus.UNSPECIFIED : toPaymentStatus(filter);
  const { payments } = await adminClient.listPayments({ status, limit: LIMIT });
  return { filter, payments };
}

export function PaymentsPage() {
  const { t } = useTranslation();
  const format = useFormat();
  const { filter, payments } = paymentsRoute.useLoaderData();

  return (
    <Card className="w-full max-w-6xl">
      <CardHeader>
        <CardTitle>{t("payments.title")}</CardTitle>
        <CardDescription>{t("payments.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <nav aria-label={t("payments.filter.label")} className="flex flex-wrap gap-1">
          {FILTERS.map((item) => (
            <Button key={item} asChild size="sm" variant={item === filter ? "secondary" : "ghost"}>
              <Link
                to="/payments"
                search={item === "pending" ? {} : { status: item }}
                aria-current={item === filter ? "page" : undefined}
              >
                {t(`payments.filter.${item}`)}
              </Link>
            </Button>
          ))}
        </nav>

        {payments.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t(filter === "pending" ? "payments.emptyPending" : "payments.empty")}
          </p>
        ) : (
          <>
            <PaymentsTable reviews={payments} showOwner />
            {payments.length >= LIMIT && (
              <p className="text-xs text-muted-foreground">
                {t("payments.limited", { limit: format.number(LIMIT) })}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
