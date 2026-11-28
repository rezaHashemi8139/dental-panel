import { useState, type ReactNode } from "react";
import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeftIcon, BanIcon, SearchXIcon, Trash2Icon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { adminClient } from "@/api/client";
import { hasReason } from "@/api/errors";
import type { ClinicDetail, GetSubscriptionResponse } from "@/gen/dental/v1/admin_pb";
import { useFormat } from "@/lib/format";
import { fromPersonIdentity } from "@/lib/identity";
import { paymentMethodKey } from "@/lib/payment";
import { daysLeft, fromListedStatus } from "@/lib/subscription";
import { uuidFromString, uuidToString } from "@/lib/uuid";
import { CancelSubscriptionDialog } from "@/components/cancel-subscription-dialog";
import { ClinicFacts, DevicesTable } from "@/components/clinic-details";
import { DeleteSubscriptionDialog } from "@/components/delete-subscription-dialog";
import { Detail } from "@/components/detail";
import { ListEmpty, ListPage } from "@/components/list-page";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS_BADGE } from "./subscriptions-page";

const subscriptionRoute = getRouteApi("/app/subscriptions/$subscriptionId");

/** Data of /subscriptions/$subscriptionId (src/router.tsx); null when there is no such subscription. */
export async function loadSubscription(subscriptionId: string): Promise<GetSubscriptionResponse | null> {
  const id = uuidFromString(subscriptionId);
  if (!id) return null;
  return adminClient.getSubscription({ id }).catch((error: unknown) => {
    if (hasReason(error, "subscription_not_found")) return null;
    throw error;
  });
}

/**
 * One subscription in full: its owner, how it was bought, and the owner's clinics
 * with every device. The address bar keeps where it was opened from (the list's
 * filters, or an owner's account: ?code=…), so going back returns there.
 */
export function SubscriptionPage() {
  const data = subscriptionRoute.useLoaderData();
  const search = subscriptionRoute.useSearch();
  const { t } = useTranslation();

  const back = (
    <Button variant="ghost" size="sm" asChild>
      <Link to="/subscriptions" search={search}>
        <ArrowLeftIcon className="rtl:rotate-180" data-icon="inline-start" />
        {search.code ? t("subscription.backToAccount") : t("subscriptions.backToList")}
      </Link>
    </Button>
  );

  return (
    <ListPage>
      {data?.item?.subscription ? (
        <SubscriptionDetails data={data} back={back} />
      ) : (
        <>
          <div>{back}</div>
          <Alert>
            <SearchXIcon />
            <AlertDescription>{t("subscription.notFound")}</AlertDescription>
          </Alert>
        </>
      )}
    </ListPage>
  );
}

function SubscriptionDetails({ data, back }: { data: GetSubscriptionResponse; back: ReactNode }) {
  const { t } = useTranslation();
  const format = useFormat();
  // Where it was opened from, to go back there once it is deleted.
  const search = subscriptionRoute.useSearch();
  const navigate = useNavigate();
  const [canceling, setCanceling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const item = data.item!;
  const subscription = item.subscription!;
  const { purchase } = item;
  const status = fromListedStatus(item.status);
  const code = fromPersonIdentity(item.identity);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            {subscription.planName}
            <Badge
              variant={status ? STATUS_BADGE[status] : "outline"}
              title={subscription.canceledAt ? format.dateTime(subscription.canceledAt) : undefined}
            >
              {status ? t(`subscriptions.status.${status}`) : t("common.empty")}
            </Badge>
          </CardTitle>
          <CardDescription>
            {t("subscriptions.list.period", {
              start: format.date(subscription.startsAt),
              end: format.date(subscription.endsAt),
            })}
            {status === "active" &&
              ` · ${t("subscriptions.list.daysLeft", { days: format.days(daysLeft(subscription, Date.now())) })}`}
          </CardDescription>
          <CardAction className="flex flex-wrap gap-2">
            {back}
            {(status === "active" || status === "upcoming") && (
              <Button variant="destructive" size="sm" onClick={() => setCanceling(true)}>
                <BanIcon data-icon="inline-start" />
                {t("subscriptions.cancel.button")}
              </Button>
            )}
            <Button variant="destructive" size="sm" onClick={() => setDeleting(true)}>
              <Trash2Icon data-icon="inline-start" />
              {t("subscriptions.delete.button")}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Detail label={t("subscription.details.owner")}>
              <span className="flex flex-wrap items-center gap-2">
                {code ? (
                  <Link to="/subscriptions" search={{ code }} className="underline-offset-4 hover:underline">
                    {item.user?.fullName || code}
                  </Link>
                ) : (
                  item.user?.fullName
                )}
                {item.userDisabled && <Badge variant="destructive">{t("subscriptions.user.disabled")}</Badge>}
              </span>
            </Detail>
            <Detail label={t("subscriptions.user.username")} ltr>
              {item.user?.username}
            </Detail>
            <Detail label={t("subscriptions.user.identityCode")} ltr>
              {code ?? t("common.empty")}
            </Detail>
            <Detail label={t("subscriptions.user.phone")} ltr>
              {item.phone || t("common.empty")}
            </Detail>
            <Detail label={t("subscriptions.user.email")} ltr>
              {data.email || t("common.empty")}
            </Detail>
            <Detail label={t("subscription.details.limits")}>
              {format.limits(subscription.maxClinics, subscription.maxDevicesPerClinic)}
            </Detail>
            <Detail label={t("subscription.details.amount")}>
              {format.rials(purchase ? purchase.amountRials : subscription.priceRials)}
            </Detail>
            <Detail label={t("subscription.details.source")}>
              {purchase ? t("subscriptions.list.source.app") : t("subscriptions.list.source.panel")}
              <span className="block text-xs font-normal text-muted-foreground">
                {purchase ? t(paymentMethodKey(purchase.method)) : t("subscriptions.purchases.soldByAdmin")}
              </span>
            </Detail>
            {purchase && (
              <Detail label={t("subscription.details.completedAt")}>{format.dateTime(purchase.reviewedAt)}</Detail>
            )}
            {subscription.canceledAt && (
              <Detail label={t("subscription.details.canceledAt")}>{format.dateTime(subscription.canceledAt)}</Detail>
            )}
            <Detail label={t("subscription.details.note")}>{subscription.note || t("common.empty")}</Detail>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("subscription.clinics.title")}</CardTitle>
          <CardDescription>{t("subscription.clinics.description")}</CardDescription>
        </CardHeader>
        {data.clinics.length === 0 && (
          <CardContent>
            <ListEmpty>{t("subscription.clinics.empty")}</ListEmpty>
          </CardContent>
        )}
      </Card>

      {data.clinics.map((clinic) => (
        <ClinicCard key={uuidToString(clinic.id)} clinic={clinic} maxDevices={subscription.maxDevicesPerClinic} />
      ))}

      {canceling && (
        <CancelSubscriptionDialog subscription={subscription} onOpenChange={(open) => !open && setCanceling(false)} />
      )}
      {deleting && (
        <DeleteSubscriptionDialog
          subscription={subscription}
          purchased={!!purchase}
          onDeleted={() => navigate({ to: "/subscriptions", search })}
          onOpenChange={setDeleting}
        />
      )}
    </>
  );
}

/** A clinic as this subscription covers it, linked to its own page; then every device. */
function ClinicCard({ clinic, maxDevices }: { clinic: ClinicDetail; maxDevices: number }) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <Link
            to="/clinics/$clinicId"
            params={{ clinicId: uuidToString(clinic.id) }}
            title={t("clinic.open")}
            className="underline-offset-4 hover:underline"
          >
            {clinic.name}
          </Link>
          {clinic.overClinicLimit && <Badge variant="destructive">{t("clinic.overLimit")}</Badge>}
        </CardTitle>
        <CardDescription>
          <span dir="ltr">{t("clinic.licenseNumber", { number: clinic.licenseNumber })}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <ClinicFacts clinic={clinic} maxDevices={maxDevices} />
        {clinic.installations.length === 0 ? (
          <ListEmpty>{t("clinic.devices.empty")}</ListEmpty>
        ) : (
          <DevicesTable installations={clinic.installations} />
        )}
      </CardContent>
    </Card>
  );
}
