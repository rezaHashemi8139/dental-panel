import { useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { PencilIcon, PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { adminClient } from "@/api/client";
import type { PaymentAccount } from "@/gen/dental/v1/subscription_pb";
import { useFormat } from "@/lib/format";
import { formatCardNumber, formatIban } from "@/lib/payment";
import { uuidToString } from "@/lib/uuid";
import { PaymentAccountDialog } from "@/components/payment-account-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const paymentAccountsRoute = getRouteApi("/app/payment-accounts");

/** Data of /payment-accounts (src/router.tsx): every account, the active ones first, in position order. */
export async function loadPaymentAccounts(): Promise<PaymentAccount[]> {
  return (await adminClient.listPaymentAccounts({})).accounts;
}

/** Which dialog is open: a new account, or editing one. */
type Editing = { kind: "new" } | { kind: "edit"; account: PaymentAccount } | null;

export function PaymentAccountsPage() {
  const { t } = useTranslation();
  const format = useFormat();
  const accounts = paymentAccountsRoute.useLoaderData();
  const [editing, setEditing] = useState<Editing>(null);
  // A new account goes after the others by default.
  const nextPosition = accounts.reduce((max, account) => Math.max(max, account.position + 1), 0);

  return (
    <Card className="w-full max-w-5xl">
      <CardHeader>
        <CardTitle>{t("paymentAccounts.title")}</CardTitle>
        <CardDescription>{t("paymentAccounts.description")}</CardDescription>
        <CardAction>
          <Button onClick={() => setEditing({ kind: "new" })}>
            <PlusIcon data-icon="inline-start" />
            {t("paymentAccounts.new")}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("paymentAccounts.empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("paymentAccounts.columns.bank")}</TableHead>
                <TableHead>{t("paymentAccounts.columns.holder")}</TableHead>
                <TableHead>{t("paymentAccounts.columns.cardNumber")}</TableHead>
                <TableHead>{t("paymentAccounts.columns.iban")}</TableHead>
                <TableHead>{t("paymentAccounts.columns.position")}</TableHead>
                <TableHead>{t("paymentAccounts.columns.status")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow
                  key={uuidToString(account.id)}
                  className={account.active ? undefined : "text-muted-foreground"}
                >
                  <TableCell className="font-medium">{account.bankName}</TableCell>
                  <TableCell>{account.holderName}</TableCell>
                  <TableCell>
                    {account.cardNumber ? (
                      <span dir="ltr" className="font-mono">
                        {formatCardNumber(account.cardNumber)}
                      </span>
                    ) : (
                      t("common.empty")
                    )}
                  </TableCell>
                  <TableCell>
                    {account.iban ? (
                      <span dir="ltr" className="font-mono">
                        {formatIban(account.iban)}
                      </span>
                    ) : (
                      t("common.empty")
                    )}
                  </TableCell>
                  <TableCell>{format.number(account.position)}</TableCell>
                  <TableCell>
                    <Badge variant={account.active ? "default" : "outline"}>
                      {t(account.active ? "paymentAccounts.status.active" : "paymentAccounts.status.inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditing({ kind: "edit", account })}>
                      <PencilIcon data-icon="inline-start" />
                      {t("paymentAccounts.edit")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Mounted only while open, so every opening starts with a fresh form. */}
      {editing && (
        <PaymentAccountDialog
          account={editing.kind === "edit" ? editing.account : null}
          nextPosition={nextPosition}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </Card>
  );
}
