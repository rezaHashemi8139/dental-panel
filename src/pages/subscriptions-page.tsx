import { useMemo, useState, type ReactNode } from "react";
import { create } from "@bufbuild/protobuf";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getRouteApi, useNavigate, useRouter } from "@tanstack/react-router";
import { BanIcon, LoaderCircleIcon, PlusIcon, SearchIcon, UserXIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { adminClient } from "@/api/client";
import { hasReason } from "@/api/errors";
import { findUserSchema, type FindUserInput, type FindUserValues } from "@/auth/schemas";
import { PaymentReviewSchema, type GetUserResponse, type PaymentReview } from "@/gen/dental/v1/admin_pb";
import { PaymentStatus, type PaymentAccount, type Plan, type Subscription } from "@/gen/dental/v1/subscription_pb";
import { fieldError } from "@/lib/form";
import { useFormat } from "@/lib/format";
import { fromPersonIdentity, toPersonIdentity } from "@/lib/identity";
import { accountsById, manualTransfer, purchaseModeKey } from "@/lib/payment";
import { paidUntil, subscriptionRows, type SubscriptionStatus } from "@/lib/subscription";
import { uuidToString } from "@/lib/uuid";
import { CancelSubscriptionDialog } from "@/components/cancel-subscription-dialog";
import { Detail } from "@/components/detail";
import { FormField } from "@/components/form-field";
import { PaymentsTable } from "@/components/payments-table";
import { PurchasesTable } from "@/components/purchases-table";
import { SellSubscriptionDialog } from "@/components/sell-subscription-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { loadPaymentAccounts } from "./payment-accounts-page";
import { loadPlans } from "./plans-page";

const subscriptionsRoute = getRouteApi("/app/subscriptions");

export interface SubscriptionsData {
  /** The identification code searched for, if any. */
  code: string | null;
  /** The account found; null if none was searched for or none has this code. */
  user: GetUserResponse | null;
  /** Plans on sale, for selling a subscription. */
  plans: Plan[];
  /** Every payment account, to show where the user's payments were sent. */
  accounts: PaymentAccount[];
}

/** Data of /subscriptions?code=… (src/router.tsx). */
export async function loadSubscriptions(code: string | null): Promise<SubscriptionsData> {
  if (!code) return { code: null, user: null, plans: [], accounts: [] };
  const [user, plans, accounts] = await Promise.all([
    adminClient.getUser({ identity: toPersonIdentity(code) }).catch((error: unknown) => {
      if (hasReason(error, "user_not_found")) return null;
      throw error;
    }),
    loadPlans(),
    loadPaymentAccounts(),
  ]);
  return { code, user, plans: plans.filter((plan) => plan.active), accounts };
}

export function SubscriptionsPage() {
  const { code, user, plans, accounts } = subscriptionsRoute.useLoaderData();
  const { t } = useTranslation();

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("subscriptions.title")}</CardTitle>
          <CardDescription>{t("subscriptions.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* A new form when the search changes from outside (back/forward). */}
          <FindUserForm key={code ?? ""} code={code} />
        </CardContent>
      </Card>

      {code && !user && (
        <Alert>
          <UserXIcon />
          <AlertDescription>{t("subscriptions.notFound", { code })}</AlertDescription>
        </Alert>
      )}
      {user && <UserDetails user={user} plans={plans} accounts={accounts} />}
    </div>
  );
}

function FindUserForm({ code }: { code: string | null }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FindUserInput, unknown, FindUserValues>({
    resolver: zodResolver(findUserSchema),
    defaultValues: { code: code ?? "" },
  });

  async function submit(values: FindUserValues) {
    // The same search again reloads it, e.g. to see changes made elsewhere.
    if (values.code === code) await router.invalidate({ sync: true });
    else await navigate({ to: "/subscriptions", search: { code: values.code } });
  }

  return (
    <form className="flex flex-col gap-4 sm:flex-row sm:items-start" onSubmit={handleSubmit(submit)} noValidate>
      <div className="sm:w-64">
        <FormField
          id="find-code"
          label={t("subscriptions.search.code")}
          error={fieldError(errors.code)}
          maxLength={30}
          autoFocus={!code}
          latin
          {...register("code")}
        />
      </div>

      {/* Lined up with the input, below its label. */}
      <Button type="submit" className="sm:mt-7" disabled={isSubmitting}>
        {isSubmitting ? <LoaderCircleIcon className="animate-spin" /> : <SearchIcon data-icon="inline-start" />}
        {t("subscriptions.search.submit")}
      </Button>
    </form>
  );
}

const STATUS_BADGE: Record<SubscriptionStatus, "default" | "secondary" | "outline" | "destructive"> = {
  active: "default",
  upcoming: "secondary",
  ended: "outline",
  replaced: "outline",
  canceled: "destructive",
};

/**
 * The user's payments not approved (pending, rejected or canceled) as the payments page
 * shows them, with who paid and where the money went. Approved ones are completed purchases.
 */
function toReviews(user: GetUserResponse, accounts: readonly PaymentAccount[]): PaymentReview[] {
  const byId = accountsById(accounts);
  return user.payments.filter((payment) => payment.status !== PaymentStatus.APPROVED).map((payment) => {
    const transfer = manualTransfer(payment);
    return create(PaymentReviewSchema, {
      payment,
      user: user.user,
      identity: user.identity,
      phone: user.phone,
      account: transfer && byId.get(uuidToString(transfer.paymentAccountId)),
    });
  });
}

function UserDetails({
  user,
  plans,
  accounts,
}: {
  user: GetUserResponse;
  plans: Plan[];
  accounts: PaymentAccount[];
}) {
  const { t } = useTranslation();
  const format = useFormat();
  const code = fromPersonIdentity(user.identity);
  const [selling, setSelling] = useState(false);
  const [canceling, setCanceling] = useState<Subscription | null>(null);
  const reviews = useMemo(() => toReviews(user, accounts), [user, accounts]);
  const now = Date.now();
  const until = paidUntil(user.subscriptions, now);
  const rows = subscriptionRows(user.subscriptions, user.payments, now);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            {user.user?.fullName}
            {user.disabled && <Badge variant="destructive">{t("subscriptions.user.disabled")}</Badge>}
          </CardTitle>
          <CardDescription>
            {until ? t("subscriptions.user.paidUntil", { date: format.dateTime(until) }) : t("subscriptions.user.noPaidTime")}
          </CardDescription>
          <CardAction>
            <Button onClick={() => setSelling(true)}>
              <PlusIcon data-icon="inline-start" />
              {t("subscriptions.sell.button")}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Detail label={t("subscriptions.user.username")} ltr>
              {user.user?.username}
            </Detail>
            <Detail label={t("subscriptions.user.identityCode")} ltr>
              {code ?? t("common.empty")}
            </Detail>
            <Detail label={t("subscriptions.user.phone")} ltr>
              {user.phone || t("common.empty")}
            </Detail>
            <Detail label={t("subscriptions.user.createdAt")}>{format.date(user.createdAt)}</Detail>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("subscriptions.list.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {user.subscriptions.length === 0 ? (
            <Empty>{t("subscriptions.list.empty")}</Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("subscriptions.list.columns.plan")}</TableHead>
                  <TableHead>{t("subscriptions.list.columns.period")}</TableHead>
                  <TableHead>{t("subscriptions.list.columns.status")}</TableHead>
                  <TableHead>{t("subscriptions.list.columns.source")}</TableHead>
                  <TableHead>{t("subscriptions.list.columns.note")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ subscription, status, purchase, daysLeft }) => (
                  <TableRow key={uuidToString(subscription.id)} className="align-top">
                    <TableCell>
                      <span className="font-medium">{subscription.planName}</span>
                      <span className="block text-xs text-muted-foreground">
                        {format.limits(subscription.maxClinics, subscription.maxDevicesPerClinic)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {t("subscriptions.list.period", {
                        start: format.date(subscription.startsAt),
                        end: format.date(subscription.endsAt),
                      })}
                      {daysLeft !== undefined && (
                        <span className="block text-xs text-muted-foreground">
                          {t("subscriptions.list.daysLeft", { days: format.days(daysLeft) })}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={STATUS_BADGE[status]}
                        title={subscription.canceledAt ? format.dateTime(subscription.canceledAt) : undefined}
                      >
                        {t(`subscriptions.status.${status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {purchase ? t("subscriptions.list.source.app") : t("subscriptions.list.source.panel")}
                      <span className="block text-xs text-muted-foreground">
                        {purchase ? t(purchaseModeKey(purchase.mode)) : format.rials(subscription.priceRials)}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-48 truncate whitespace-nowrap" title={subscription.note}>
                      {subscription.note || t("common.empty")}
                    </TableCell>
                    <TableCell className="text-end">
                      {(status === "active" || status === "upcoming") && (
                        <Button variant="destructive" size="sm" onClick={() => setCanceling(subscription)}>
                          <BanIcon data-icon="inline-start" />
                          {t("subscriptions.cancel.button")}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("subscriptions.purchases.title")}</CardTitle>
          <CardDescription>{t("subscriptions.purchases.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <Empty>{t("subscriptions.purchases.empty")}</Empty>
          ) : (
            <PurchasesTable rows={rows} accounts={accounts} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("subscriptions.payments.title")}</CardTitle>
          <CardDescription>{t("subscriptions.payments.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <Empty>{t("subscriptions.payments.empty")}</Empty>
          ) : (
            <PaymentsTable reviews={reviews} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("subscriptions.clinics.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {user.ownedClinics.length === 0 ? (
            <Empty>{t("subscriptions.clinics.empty")}</Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("subscriptions.clinics.columns.name")}</TableHead>
                  <TableHead>{t("subscriptions.clinics.columns.licenseNumber")}</TableHead>
                  <TableHead>{t("subscriptions.clinics.columns.city")}</TableHead>
                  <TableHead>{t("subscriptions.clinics.columns.installations")}</TableHead>
                  <TableHead>{t("subscriptions.clinics.columns.createdAt")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.ownedClinics.map((clinic) => (
                  <TableRow key={uuidToString(clinic.id)}>
                    <TableCell className="font-medium">{clinic.name}</TableCell>
                    <TableCell>
                      <span dir="ltr">{clinic.licenseNumber}</span>
                    </TableCell>
                    <TableCell>{clinic.city}</TableCell>
                    <TableCell>{format.number(clinic.installationCount)}</TableCell>
                    <TableCell>{format.date(clinic.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selling && <SellSubscriptionDialog user={user} plans={plans} onOpenChange={setSelling} />}
      {canceling && (
        <CancelSubscriptionDialog subscription={canceling} onOpenChange={(open) => !open && setCanceling(null)} />
      )}
    </>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>;
}
