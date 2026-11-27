import { getRouteApi, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { adminClient } from "@/api/client";
import type { PaymentReview } from "@/gen/dental/v1/admin_pb";
import { PaymentStatus } from "@/gen/dental/v1/subscription_pb";
import { PAGE_SIZE, parsePage, parseQuery } from "@/lib/pagination";
import { isPaymentStatusName, toPaymentStatus, type PaymentStatusName } from "@/lib/payment";
import { ListPagination } from "@/components/list-pagination";
import { ListSearch } from "@/components/list-search";
import { PaymentsTable } from "@/components/payments-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const paymentsRoute = getRouteApi("/app/payments");

/** Which payments are listed. Pending ones (the queue to review) unless the address says otherwise. */
export type PaymentsFilter = PaymentStatusName | "all";

const FILTERS: readonly PaymentsFilter[] = ["pending", "approved", "rejected", "canceled", "all"];

/**
 * ?status=approved|rejected|canceled|all (none, or anything else, means pending),
 * ?q=… (owner's name, username, identification code or phone, or the transfer reference)
 * and ?page=… (none for the first).
 */
export interface PaymentsSearch {
  status?: Exclude<PaymentsFilter, "pending">;
  q?: string;
  page?: number;
}

export function parsePaymentsSearch(search: Record<string, unknown>): PaymentsSearch {
  const status = search.status;
  return {
    status: status === "all" || (isPaymentStatusName(status) && status !== "pending") ? status : undefined,
    q: parseQuery(search.q),
    page: parsePage(search.page),
  };
}

export interface PaymentsData {
  filter: PaymentsFilter;
  query: string;
  page: number;
  payments: PaymentReview[];
  /** Matching payments on every page. */
  total: number;
}

/** Data of /payments (src/router.tsx), one page: pending payments oldest first, the others newest first. */
export async function loadPayments(search: PaymentsSearch): Promise<PaymentsData> {
  const filter: PaymentsFilter = search.status ?? "pending";
  const status = filter === "all" ? PaymentStatus.UNSPECIFIED : toPaymentStatus(filter);
  const query = search.q ?? "";
  const page = search.page ?? 1;
  const response = await adminClient.listPayments({ status, query, page, pageSize: PAGE_SIZE });
  return { filter, query, page, payments: response.payments, total: response.totalCount };
}

export function PaymentsPage() {
  const { t } = useTranslation();
  const { filter, query, page, payments, total } = paymentsRoute.useLoaderData();

  return (
    <Card className="w-full max-w-6xl">
      <CardHeader>
        <CardTitle>{t("payments.title")}</CardTitle>
        <CardDescription>{t("payments.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ListSearch
          key={query}
          query={query}
          label={t("payments.search.label")}
          placeholder={t("payments.search.placeholder")}
        />
        <nav aria-label={t("payments.filter.label")} className="flex flex-wrap gap-1">
          {FILTERS.map((item) => (
            <Button key={item} asChild size="sm" variant={item === filter ? "secondary" : "ghost"}>
              <Link
                to="/payments"
                search={{ status: item === "pending" ? undefined : item, q: query || undefined }}
                aria-current={item === filter ? "page" : undefined}
              >
                {t(`payments.filter.${item}`)}
              </Link>
            </Button>
          ))}
        </nav>

        {payments.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t(filter === "pending" && !query ? "payments.emptyPending" : "payments.empty")}
          </p>
        ) : (
          <PaymentsTable reviews={payments} showOwner />
        )}
        {total > 0 && <ListPagination page={page} total={total} shown={payments.length} />}
      </CardContent>
    </Card>
  );
}
