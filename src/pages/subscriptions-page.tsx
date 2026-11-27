import { useMemo, useState, type ReactNode } from "react";
import { create } from "@bufbuild/protobuf";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getRouteApi, useNavigate, useRouter } from "@tanstack/react-router";
import { BanIcon, LoaderCircleIcon, PlusIcon, SearchIcon, UserXIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { adminClient } from "@/api/client";
import { hasReason } from "@/api/errors";
import { findUserSchema, toIdentity, type FindUserValues } from "@/auth/schemas";
import { PaymentReviewSchema, type GetUserResponse, type PaymentReview } from "@/gen/dental/v1/admin_pb";
import type { PaymentAccount, Plan, Subscription } from "@/gen/dental/v1/subscription_pb";
import { countryName, foreignCountries } from "@/lib/countries";
import { fieldError } from "@/lib/form";
import { useFormat } from "@/lib/format";
import { fromPersonIdentity, toIdentitySearch, toPersonIdentity, type Identity } from "@/lib/identity";
import { accountsById, manualTransfer } from "@/lib/payment";
import { paidUntil, subscriptionStatus, type SubscriptionStatus } from "@/lib/subscription";
import { uuidToString } from "@/lib/uuid";
import { CancelSubscriptionDialog } from "@/components/cancel-subscription-dialog";
import { Detail } from "@/components/detail";
import { FormField } from "@/components/form-field";
import { PaymentsTable } from "@/components/payments-table";
import { SellSubscriptionDialog } from "@/components/sell-subscription-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { loadPaymentAccounts } from "./payment-accounts-page";
import { loadPlans } from "./plans-page";

const subscriptionsRoute = getRouteApi("/app/subscriptions");

export interface SubscriptionsData {
  /** The identity searched for, if any. */
  identity: Identity | null;
  /** The account found; null if none was searched for or none has this identity. */
  user: GetUserResponse | null;
  /** Plans on sale, for selling a subscription. */
  plans: Plan[];
  /** Every payment account, to show where the user's payments were sent. */
  accounts: PaymentAccount[];
}

/** Data of /subscriptions?kind=…&number=…&nationality=… (src/router.tsx). */
export async function loadSubscriptions(identity: Identity | null): Promise<SubscriptionsData> {
  if (!identity) return { identity: null, user: null, plans: [], accounts: [] };
  const [user, plans, accounts] = await Promise.all([
    adminClient.getUser({ identity: toPersonIdentity(identity) }).catch((error: unknown) => {
      if (hasReason(error, "user_not_found")) return null;
      throw error;
    }),
    loadPlans(),
    loadPaymentAccounts(),
  ]);
  return { identity, user, plans: plans.filter((plan) => plan.active), accounts };
}

export function SubscriptionsPage() {
  const { identity, user, plans, accounts } = subscriptionsRoute.useLoaderData();
  const { t } = useTranslation();
  const searchKey = identity ? `${identity.kind}:${identity.number}:${identity.nationality}` : "";

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("subscriptions.title")}</CardTitle>
          <CardDescription>{t("subscriptions.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* A new form when the search changes from outside (back/forward). */}
          <FindUserForm key={searchKey} identity={identity} />
        </CardContent>
      </Card>

      {identity && !user && (
        <Alert>
          <UserXIcon />
          <AlertDescription>{t("subscriptions.notFound", { number: identity.number })}</AlertDescription>
        </Alert>
      )}
      {user && <UserDetails user={user} plans={plans} accounts={accounts} />}
    </div>
  );
}

/** Foreign nationals in Iran are most often Afghan: the nationality first offered. */
const DEFAULT_FOREIGN_NATIONALITY = "AF";

function FindUserForm({ identity }: { identity: Identity | null }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const router = useRouter();
  const countries = useMemo(() => foreignCountries(i18n.resolvedLanguage), [i18n.resolvedLanguage]);
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FindUserValues>({
    resolver: zodResolver(findUserSchema),
    defaultValues: {
      kind: identity?.kind ?? "national",
      number: identity?.number ?? "",
      nationality: identity?.kind === "foreign" ? identity.nationality : DEFAULT_FOREIGN_NATIONALITY,
    },
  });
  const kind = watch("kind");

  async function submit(values: FindUserValues) {
    const next = toIdentity(values);
    const same =
      identity?.kind === next.kind && identity.number === next.number && identity.nationality === next.nationality;
    // The same search again reloads it, e.g. to see changes made elsewhere.
    if (same) await router.invalidate({ sync: true });
    else await navigate({ to: "/subscriptions", search: toIdentitySearch(next) });
  }

  return (
    <form className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start" onSubmit={handleSubmit(submit)} noValidate>
      <Controller
        control={control}
        name="kind"
        render={({ field }) => (
          <div className="flex flex-col gap-1.5 sm:w-56">
            <Label htmlFor="find-kind" className="mb-1">
              {t("subscriptions.search.type")}
            </Label>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="find-kind" ref={field.ref} className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="national">{t("subscriptions.search.national")}</SelectItem>
                <SelectItem value="foreign">{t("subscriptions.search.foreign")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      />

      <div className="sm:w-56">
        <FormField
          id="find-number"
          label={t(kind === "national" ? "subscriptions.search.nationalId" : "subscriptions.search.fidaCode")}
          error={fieldError(errors.number)}
          inputMode={kind === "national" ? "numeric" : "text"}
          maxLength={kind === "national" ? 10 : 20}
          autoFocus={!identity}
          latin
          {...register("number")}
        />
      </div>
      {kind === "foreign" && (
        <Controller
          control={control}
          name="nationality"
          render={({ field }) => {
            const nationalityError = fieldError(errors.nationality);
            return (
              <div className="flex flex-col gap-1.5 sm:w-56">
                <Label htmlFor="find-nationality" className="mb-1">
                  {t("subscriptions.search.nationality")}
                </Label>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="find-nationality"
                    ref={field.ref}
                    className="h-9 w-full"
                    aria-invalid={!!nationalityError}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {nationalityError && <p className="text-xs text-destructive">{nationalityError}</p>}
              </div>
            );
          }}
        />
      )}

      {/* Lined up with the inputs, below their labels. */}
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
  canceled: "destructive",
};

/** The user's payments as the payments page shows them, with who paid and where the money went. */
function toReviews(user: GetUserResponse, accounts: readonly PaymentAccount[]): PaymentReview[] {
  const byId = accountsById(accounts);
  return user.payments.map((payment) => {
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
  const { t, i18n } = useTranslation();
  const format = useFormat();
  const identity = fromPersonIdentity(user.identity);
  const [selling, setSelling] = useState(false);
  const [canceling, setCanceling] = useState<Subscription | null>(null);
  const reviews = useMemo(() => toReviews(user, accounts), [user, accounts]);
  const now = Date.now();
  const until = paidUntil(user.subscriptions, now);

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
            {identity?.kind === "foreign" ? (
              <>
                <Detail label={t("subscriptions.user.fidaCode")} ltr>
                  {identity.number}
                </Detail>
                <Detail label={t("subscriptions.user.nationality")}>
                  {countryName(identity.nationality, i18n.resolvedLanguage)}
                </Detail>
              </>
            ) : (
              <Detail label={t("subscriptions.user.nationalId")} ltr>
                {identity?.number ?? t("common.empty")}
              </Detail>
            )}
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
                  <TableHead>{t("subscriptions.list.columns.limits")}</TableHead>
                  <TableHead>{t("subscriptions.list.columns.price")}</TableHead>
                  <TableHead>{t("subscriptions.list.columns.status")}</TableHead>
                  <TableHead>{t("subscriptions.list.columns.note")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.subscriptions.map((subscription) => {
                  const status = subscriptionStatus(subscription, now);
                  return (
                    <TableRow key={uuidToString(subscription.id)}>
                      <TableCell className="font-medium">{subscription.planName}</TableCell>
                      <TableCell>
                        {t("subscriptions.list.period", {
                          start: format.date(subscription.startsAt),
                          end: format.date(subscription.endsAt),
                        })}
                      </TableCell>
                      <TableCell>{format.limits(subscription.maxClinics, subscription.maxDevicesPerClinic)}</TableCell>
                      <TableCell>{format.rials(subscription.priceRials)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={STATUS_BADGE[status]}
                          title={subscription.canceledAt ? format.dateTime(subscription.canceledAt) : undefined}
                        >
                          {t(`subscriptions.status.${status}`)}
                        </Badge>
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
                  );
                })}
              </TableBody>
            </Table>
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
