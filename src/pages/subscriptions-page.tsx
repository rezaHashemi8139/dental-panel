import { useMemo, useState } from "react";
import { create } from "@bufbuild/protobuf";
import { getRouteApi, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeftIcon, BanIcon, PlusIcon, Trash2Icon, UserIcon, UserXIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { adminClient } from "@/api/client";
import { hasReason } from "@/api/errors";
import {
  PaymentReviewSchema,
  type GetUserResponse,
  type PaymentReview,
  type SubscriptionListItem,
} from "@/gen/dental/v1/admin_pb";
import { PaymentStatus, type PaymentAccount, type Plan, type Subscription } from "@/gen/dental/v1/subscription_pb";
import { useFormat } from "@/lib/format";
import {
  fromPersonIdentity,
  IDENTITY_CODE_PATTERN,
  normalizeIdentityCode,
  parseIdentityCode,
  toPersonIdentity,
} from "@/lib/identity";
import { PAGE_SIZE, parsePage, parseQuery } from "@/lib/pagination";
import { accountsById, manualTransfer, paymentMethodKey, purchaseModeKey } from "@/lib/payment";
import {
  daysLeft,
  fromListedStatus,
  isSubscriptionFilter,
  paidUntil,
  SUBSCRIPTION_FILTERS,
  subscriptionRows,
  toListedStatus,
  type SubscriptionFilter,
  type SubscriptionStatus,
} from "@/lib/subscription";
import { uuidToString } from "@/lib/uuid";
import { CancelSubscriptionDialog } from "@/components/cancel-subscription-dialog";
import { DeleteSubscriptionDialog } from "@/components/delete-subscription-dialog";
import { DeleteUserDialog } from "@/components/delete-user-dialog";
import { Detail } from "@/components/detail";
import { ListEmpty, ListFilters, ListPage, ListResults } from "@/components/list-page";
import { ListPagination } from "@/components/list-pagination";
import { ListSearch } from "@/components/list-search";
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

/**
 * ?status=active|upcoming|ended|canceled (none: all), ?q=… (owner's name, username,
 * identification code or phone) and ?page=… (none for the first) for the list of every
 * subscription; ?code=… for one owner's account instead. The list's parameters stay
 * while an account is open, so going back returns to the same page of the list.
 */
export interface SubscriptionsSearch {
  status?: SubscriptionFilter;
  q?: string;
  page?: number;
  code?: string;
}

export function parseSubscriptionsSearch(search: Record<string, unknown>): SubscriptionsSearch {
  return {
    status: isSubscriptionFilter(search.status) ? search.status : undefined,
    q: parseQuery(search.q),
    page: parsePage(search.page),
    code: parseIdentityCode(search.code),
  };
}

export interface SubscriptionsList {
  filter: SubscriptionFilter | undefined;
  query: string;
  page: number;
  items: SubscriptionListItem[];
  /** Matching subscriptions on every page. */
  total: number;
}

export interface SubscriptionsData {
  /** The identification code of the account open, if any. */
  code: string | null;
  /** The account open; null if none is or none has this code. */
  user: GetUserResponse | null;
  /** One page of every subscription; null while an account is open. */
  list: SubscriptionsList | null;
  /** Plans on sale, for selling a subscription. */
  plans: Plan[];
  /** Every payment account, to show where the user's payments were sent. */
  accounts: PaymentAccount[];
}

/** Data of /subscriptions (src/router.tsx): the list, or one account. */
export async function loadSubscriptions(search: SubscriptionsSearch): Promise<SubscriptionsData> {
  const { code } = search;
  if (!code) {
    const query = search.q ?? "";
    const page = search.page ?? 1;
    const response = await adminClient.listSubscriptions({
      status: toListedStatus(search.status),
      query,
      page,
      pageSize: PAGE_SIZE,
    });
    const list = { filter: search.status, query, page, items: response.items, total: response.totalCount };
    return { code: null, user: null, list, plans: [], accounts: [] };
  }
  const [user, plans, accounts] = await Promise.all([
    adminClient.getUser({ identity: toPersonIdentity(code) }).catch((error: unknown) => {
      if (hasReason(error, "user_not_found")) return null;
      throw error;
    }),
    loadPlans(),
    loadPaymentAccounts(),
  ]);
  return { code, user, list: null, plans: plans.filter((plan) => plan.active), accounts };
}

export function SubscriptionsPage() {
  const { code, user, list, plans, accounts } = subscriptionsRoute.useLoaderData();
  const search = subscriptionsRoute.useSearch();
  const { t } = useTranslation();

  return (
    <ListPage>
      <ListFilters title={t("subscriptions.title")} description={t("subscriptions.description")}>
        {/* A new box when the search changes from outside (back/forward). */}
        <ListSearch
          key={search.q ?? ""}
          query={search.q ?? ""}
          label={t("subscriptions.search.label")}
          placeholder={t("subscriptions.search.placeholder")}
        />
        {list ? (
          <StatusFilter list={list} />
        ) : (
          <div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/subscriptions" search={{ ...search, code: undefined }}>
                <ArrowLeftIcon className="rtl:rotate-180" data-icon="inline-start" />
                {t("subscriptions.backToList")}
              </Link>
            </Button>
          </div>
        )}
      </ListFilters>

      {list && <SubscriptionsListView list={list} />}
      {code && !user && (
        <Alert>
          <UserXIcon />
          <AlertDescription>{t("subscriptions.notFound", { code })}</AlertDescription>
        </Alert>
      )}
      {user && <UserDetails user={user} plans={plans} accounts={accounts} />}
    </ListPage>
  );
}

/** Links to the list of one status, or of every subscription; the search stays. */
function StatusFilter({ list }: { list: SubscriptionsList }) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t("subscriptions.filter.label")} className="flex flex-wrap gap-1">
      {[undefined, ...SUBSCRIPTION_FILTERS].map((item) => (
        <Button key={item ?? "all"} asChild size="sm" variant={item === list.filter ? "secondary" : "ghost"}>
          <Link
            to="/subscriptions"
            search={{ status: item, q: list.query || undefined }}
            aria-current={item === list.filter ? "page" : undefined}
          >
            {item ? t(`subscriptions.status.${item}`) : t("subscriptions.filter.all")}
          </Link>
        </Button>
      ))}
    </nav>
  );
}

/** One page of every subscription, newest first, each linked to its owner's account. */
function SubscriptionsListView({ list }: { list: SubscriptionsList }) {
  const { t } = useTranslation();
  const format = useFormat();
  const now = Date.now();
  // A search that is a whole identification code may be an owner with no subscription yet.
  const lookup = list.query ? normalizeIdentityCode(list.query) : "";
  const canOpen = list.items.length === 0 && IDENTITY_CODE_PATTERN.test(lookup);

  return (
    <ListResults
      footer={list.total > 0 && <ListPagination page={list.page} total={list.total} shown={list.items.length} />}
    >
      {list.items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <p className="text-center text-sm text-muted-foreground">{t("subscriptions.list.emptyAll")}</p>
          {canOpen && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/subscriptions" search={{ code: lookup }}>
                <UserIcon data-icon="inline-start" />
                {t("subscriptions.list.openByCode", { code: lookup })}
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("subscriptions.list.columns.owner")}</TableHead>
              <TableHead>{t("subscriptions.list.columns.plan")}</TableHead>
              <TableHead>{t("subscriptions.list.columns.period")}</TableHead>
              <TableHead>{t("subscriptions.list.columns.status")}</TableHead>
              <TableHead>{t("subscriptions.list.columns.source")}</TableHead>
              <TableHead>{t("subscriptions.list.columns.amount")}</TableHead>
              <TableHead>{t("subscriptions.list.columns.clinics")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.items.map((item) => {
              const { subscription, purchase } = item;
              if (!subscription) return null;
              const code = fromPersonIdentity(item.identity);
              const status = fromListedStatus(item.status);
              return (
                <TableRow key={uuidToString(subscription.id)} className="align-top">
                  <TableCell>
                    {code ? (
                      <Link
                        to="/subscriptions"
                        search={{ status: list.filter, q: list.query || undefined, page: pageParam(list.page), code }}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {item.user?.fullName || code}
                      </Link>
                    ) : (
                      <span className="font-medium">{item.user?.fullName}</span>
                    )}
                    <span dir="ltr" className="block text-xs text-muted-foreground">
                      {code ?? item.user?.username}
                    </span>
                    {item.userDisabled && (
                      <Badge variant="destructive" className="mt-1">
                        {t("subscriptions.user.disabled")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      to="/subscriptions/$subscriptionId"
                      params={{ subscriptionId: uuidToString(subscription.id) }}
                      search={{ status: list.filter, q: list.query || undefined, page: pageParam(list.page) }}
                      title={t("subscription.open")}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {subscription.planName}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {format.limits(subscription.maxClinics, subscription.maxDevicesPerClinic)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {t("subscriptions.list.period", {
                      start: format.date(subscription.startsAt),
                      end: format.date(subscription.endsAt),
                    })}
                    {status === "active" && (
                      <span className="block text-xs text-muted-foreground">
                        {t("subscriptions.list.daysLeft", { days: format.days(daysLeft(subscription, now)) })}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={status ? STATUS_BADGE[status] : "outline"}
                      title={subscription.canceledAt ? format.dateTime(subscription.canceledAt) : undefined}
                    >
                      {status ? t(`subscriptions.status.${status}`) : t("common.empty")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {purchase ? t("subscriptions.list.source.app") : t("subscriptions.list.source.panel")}
                    <span className="block text-xs text-muted-foreground">
                      {purchase ? t(paymentMethodKey(purchase.method)) : t("subscriptions.purchases.soldByAdmin")}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">
                    {format.rials(purchase ? purchase.amountRials : subscription.priceRials)}
                  </TableCell>
                  <TableCell>
                    {/* The owner's clinics now, with their devices that are not revoked. */}
                    {item.ownedClinics.length === 0
                      ? t("common.empty")
                      : item.ownedClinics.map((clinic) => (
                          <span key={uuidToString(clinic.id)} className="block whitespace-nowrap">
                            <Link
                              to="/clinics/$clinicId"
                              params={{ clinicId: uuidToString(clinic.id) }}
                              title={t("clinic.open")}
                              className="font-medium underline-offset-4 hover:underline"
                            >
                              {clinic.name}
                            </Link>
                            <span className="text-xs text-muted-foreground">
                              {" · "}
                              {format.devices(clinic.installationCount)}
                            </span>
                          </span>
                        ))}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </ListResults>
  );
}

/** Page 1 is left out of the address bar. */
const pageParam = (page: number) => (page > 1 ? page : undefined);

export const STATUS_BADGE: Record<SubscriptionStatus, "default" | "secondary" | "outline" | "destructive"> = {
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
  // The account's address (with the list's), for coming back from a subscription.
  const search = subscriptionsRoute.useSearch();
  const navigate = subscriptionsRoute.useNavigate();
  const router = useRouter();
  const code = fromPersonIdentity(user.identity);
  const [selling, setSelling] = useState(false);
  const [canceling, setCanceling] = useState<Subscription | null>(null);
  const [deleting, setDeleting] = useState<{ subscription: Subscription; purchased: boolean } | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
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
          <CardAction className="flex flex-wrap gap-2">
            <Button onClick={() => setSelling(true)}>
              <PlusIcon data-icon="inline-start" />
              {t("subscriptions.sell.button")}
            </Button>
            {user.user && (
              <Button variant="destructive" onClick={() => setDeletingUser(true)}>
                <Trash2Icon data-icon="inline-start" />
                {t("users.delete.button")}
              </Button>
            )}
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
            <Detail label={t("subscriptions.user.email")} ltr>
              {user.email || t("common.empty")}
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
            <ListEmpty>{t("subscriptions.list.empty")}</ListEmpty>
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
                      <Link
                        to="/subscriptions/$subscriptionId"
                        params={{ subscriptionId: uuidToString(subscription.id) }}
                        search={search}
                        title={t("subscription.open")}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {subscription.planName}
                      </Link>
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
                    <TableCell>
                      <span className="flex justify-end gap-2">
                        {(status === "active" || status === "upcoming") && (
                          <Button variant="destructive" size="sm" onClick={() => setCanceling(subscription)}>
                            <BanIcon data-icon="inline-start" />
                            {t("subscriptions.cancel.button")}
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="icon-sm"
                          title={t("subscriptions.delete.button")}
                          aria-label={t("subscriptions.delete.button")}
                          onClick={() => setDeleting({ subscription, purchased: !!purchase })}
                        >
                          <Trash2Icon />
                        </Button>
                      </span>
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
            <ListEmpty>{t("subscriptions.purchases.empty")}</ListEmpty>
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
            <ListEmpty>{t("subscriptions.payments.empty")}</ListEmpty>
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
            <ListEmpty>{t("subscriptions.clinics.empty")}</ListEmpty>
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
                    <TableCell>
                      <Link
                        to="/clinics/$clinicId"
                        params={{ clinicId: uuidToString(clinic.id) }}
                        title={t("clinic.open")}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {clinic.name}
                      </Link>
                    </TableCell>
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
      {deleting && (
        <DeleteSubscriptionDialog
          subscription={deleting.subscription}
          purchased={deleting.purchased}
          onDeleted={() => router.invalidate({ sync: true })}
          onOpenChange={(open) => !open && setDeleting(null)}
        />
      )}
      {deletingUser && user.user && (
        <DeleteUserDialog
          user={user.user}
          ownedClinicCount={user.ownedClinics.length}
          // The account is gone: back to the list, with its filters.
          onDeleted={() => navigate({ search: { ...search, code: undefined } })}
          onOpenChange={setDeletingUser}
        />
      )}
    </>
  );
}
