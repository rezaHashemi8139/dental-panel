import { getRouteApi, Link, useCanGoBack, useRouter } from "@tanstack/react-router";
import { AlertTriangleIcon, ArrowLeftIcon, SearchXIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { adminClient } from "@/api/client";
import { hasReason } from "@/api/errors";
import type { GetClinicResponse } from "@/gen/dental/v1/admin_pb";
import { useFormat } from "@/lib/format";
import { fromPersonIdentity } from "@/lib/identity";
import { uuidFromString } from "@/lib/uuid";
import { ClinicFacts, DevicesTable } from "@/components/clinic-details";
import { Detail } from "@/components/detail";
import { ListEmpty, ListPage } from "@/components/list-page";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const clinicRoute = getRouteApi("/app/clinics/$clinicId");

/** Data of /clinics/$clinicId (src/router.tsx); null when there is no such clinic. */
export async function loadClinic(clinicId: string): Promise<GetClinicResponse | null> {
  const id = uuidFromString(clinicId);
  if (!id) return null;
  return adminClient.getClinic({ id }).catch((error: unknown) => {
    if (hasReason(error, "clinic_not_found")) return null;
    throw error;
  });
}

/**
 * One clinic in full: its details, its owner with the subscription in force now, and
 * every device. The limit flags are the ones Login checks now, so a device marked
 * beyond the limit really cannot log in. Opened from anywhere a clinic is shown, so
 * "back" is the browser's.
 */
export function ClinicPage() {
  const data = clinicRoute.useLoaderData();
  const { t } = useTranslation();
  const router = useRouter();
  const canGoBack = useCanGoBack();

  const back = canGoBack && (
    <Button variant="ghost" size="sm" onClick={() => router.history.back()}>
      <ArrowLeftIcon className="rtl:rotate-180" data-icon="inline-start" />
      {t("clinic.back")}
    </Button>
  );

  if (!data?.clinic) {
    return (
      <ListPage>
        {back && <div>{back}</div>}
        <Alert>
          <SearchXIcon />
          <AlertDescription>{t("clinic.notFound")}</AlertDescription>
        </Alert>
      </ListPage>
    );
  }

  const { clinic } = data;
  return (
    <ListPage>
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            {clinic.name}
            {clinic.overClinicLimit && <Badge variant="destructive">{t("clinic.overLimit")}</Badge>}
          </CardTitle>
          <CardDescription>
            <span dir="ltr">{t("clinic.licenseNumber", { number: clinic.licenseNumber })}</span>
          </CardDescription>
          {back && <CardAction>{back}</CardAction>}
        </CardHeader>
        <CardContent>
          <ClinicFacts clinic={clinic} maxDevices={data.maxDevicesPerClinic} />
        </CardContent>
      </Card>

      <OwnerCard data={data} />

      <Card>
        <CardHeader>
          <CardTitle>{t("clinic.devices.title")}</CardTitle>
          <CardDescription>{t("clinic.devices.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {clinic.installations.length === 0 ? (
            <ListEmpty>{t("clinic.devices.empty")}</ListEmpty>
          ) : (
            <DevicesTable installations={clinic.installations} />
          )}
        </CardContent>
      </Card>
    </ListPage>
  );
}

/** Who owns the clinic, and the subscription in force now (its limits are the ones applied). */
function OwnerCard({ data }: { data: GetClinicResponse }) {
  const { t } = useTranslation();
  const format = useFormat();
  const code = fromPersonIdentity(data.ownerIdentity);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("clinic.owner.title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!data.paidUntil && (
          <Alert variant="destructive">
            <AlertTriangleIcon />
            <AlertDescription>{t("clinic.owner.noSubscription")}</AlertDescription>
          </Alert>
        )}
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label={t("clinic.owner.name")}>
            <span className="flex flex-wrap items-center gap-2">
              {code ? (
                <Link to="/subscriptions" search={{ code }} className="underline-offset-4 hover:underline">
                  {data.owner?.fullName || code}
                </Link>
              ) : (
                data.owner?.fullName
              )}
              {data.ownerDisabled && <Badge variant="destructive">{t("subscriptions.user.disabled")}</Badge>}
            </span>
          </Detail>
          <Detail label={t("subscriptions.user.username")} ltr>
            {data.owner?.username}
          </Detail>
          <Detail label={t("subscriptions.user.identityCode")} ltr>
            {code ?? t("common.empty")}
          </Detail>
          <Detail label={t("subscriptions.user.phone")} ltr>
            {data.ownerPhone || t("common.empty")}
          </Detail>
          <Detail label={t("subscriptions.user.email")} ltr>
            {data.ownerEmail || t("common.empty")}
          </Detail>
          <Detail label={t("clinic.owner.subscription")}>
            {data.paidUntil ? t("clinic.owner.paidUntil", { date: format.dateTime(data.paidUntil) }) : t("users.noSubscription")}
          </Detail>
          {data.paidUntil && (
            <Detail label={t("clinic.owner.limits")}>
              {format.limits(data.maxClinics, data.maxDevicesPerClinic)}
            </Detail>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}
