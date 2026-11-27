import { useTranslation } from "react-i18next";
import type { PaymentAccount } from "@/gen/dental/v1/subscription_pb";
import { useFormat } from "@/lib/format";
import { accountsById, manualTransfer, paymentMethodKey, purchaseModeKey } from "@/lib/payment";
import type { SubscriptionRow } from "@/lib/subscription";
import { uuidToString } from "@/lib/uuid";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/**
 * Completed purchases: one per subscription, bought in the desktop app (an approved
 * payment) or sold by an administrator in the panel. Newest first, like the subscriptions.
 */
export function PurchasesTable({
  rows,
  accounts,
}: {
  rows: readonly SubscriptionRow[];
  accounts: readonly PaymentAccount[];
}) {
  const { t } = useTranslation();
  const format = useFormat();
  const byId = accountsById(accounts);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("subscriptions.purchases.columns.completedAt")}</TableHead>
          <TableHead>{t("subscriptions.purchases.columns.plan")}</TableHead>
          <TableHead>{t("subscriptions.purchases.columns.method")}</TableHead>
          <TableHead>{t("subscriptions.purchases.columns.amount")}</TableHead>
          <TableHead>{t("subscriptions.purchases.columns.reference")}</TableHead>
          <TableHead>{t("subscriptions.purchases.columns.period")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ subscription, purchase, status }) => {
          const transfer = purchase && manualTransfer(purchase);
          const account = transfer && byId.get(uuidToString(transfer.paymentAccountId));
          return (
            <TableRow key={uuidToString(subscription.id)} className="align-top">
              <TableCell>{purchase ? format.dateTime(purchase.reviewedAt) : t("common.empty")}</TableCell>
              <TableCell>
                <span className="font-medium">{subscription.planName}</span>
                <span className="block text-xs text-muted-foreground">
                  {purchase ? t(purchaseModeKey(purchase.mode)) : t("subscriptions.purchases.panelSale")}
                </span>
              </TableCell>
              <TableCell>
                {purchase ? t(paymentMethodKey(purchase.method)) : t("subscriptions.purchases.soldByAdmin")}
              </TableCell>
              <TableCell>
                <span className="font-medium">
                  {format.rials(purchase ? purchase.amountRials : subscription.priceRials)}
                </span>
                {purchase && purchase.creditRials > 0n && (
                  <span className="block text-xs text-muted-foreground">
                    {t("subscriptions.purchases.credit", {
                      price: format.rials(purchase.priceRials),
                      credit: format.rials(purchase.creditRials),
                    })}
                  </span>
                )}
              </TableCell>
              <TableCell className="max-w-56 whitespace-normal">
                {transfer ? (
                  <>
                    <span dir="ltr" className="font-mono">
                      {transfer.reference}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {format.dateTime(transfer.paidAt)}
                      {account && ` · ${account.bankName}`}
                    </span>
                  </>
                ) : !purchase && subscription.note ? (
                  <span className="text-xs text-muted-foreground">{subscription.note}</span>
                ) : (
                  t("common.empty")
                )}
              </TableCell>
              <TableCell>
                {t("subscriptions.list.period", {
                  start: format.date(subscription.startsAt),
                  end: format.date(subscription.endsAt),
                })}
                {status === "canceled" && (
                  <span className="block text-xs text-destructive">
                    {t("subscriptions.purchases.subscriptionCanceled")}
                  </span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
