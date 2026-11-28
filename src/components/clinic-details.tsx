import { useState } from "react";
import { durationMs } from "@bufbuild/protobuf/wkt";
import { cn } from "cn";
import { ExternalLinkIcon, InfoIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ClinicDetail, InstallationDetail } from "@/gen/dental/v1/admin_pb";
import type { GeoLocation } from "@/gen/dental/v1/installation_pb";
import { useFormat } from "@/lib/format";
import { toHex, uuidToString } from "@/lib/uuid";
import { Detail } from "@/components/detail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const DAY_MS = 24 * 60 * 60 * 1000;
const GIB = 1024 ** 3;

/**
 * A clinic's details as a <dl>. `maxDevices` is the device limit to show the active
 * devices against; 0 shows the count alone (no subscription in force).
 */
export function ClinicFacts({ clinic, maxDevices }: { clinic: ClinicDetail; maxDevices: number }) {
  const { t } = useTranslation();
  const format = useFormat();
  const active = clinic.installations.filter((installation) => !installation.revokedAt).length;

  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Detail label={t("clinic.details.phone")} ltr>
        {clinic.phone || t("common.empty")}
      </Detail>
      <Detail label={t("clinic.details.province")}>{clinic.province || t("common.empty")}</Detail>
      <Detail label={t("clinic.details.city")}>{clinic.city || t("common.empty")}</Detail>
      <Detail label={t("clinic.details.postalCode")} ltr>
        {clinic.postalCode || t("common.empty")}
      </Detail>
      <div className="sm:col-span-2">
        <Detail label={t("clinic.details.address")}>{clinic.address || t("common.empty")}</Detail>
      </div>
      <Detail label={t("clinic.details.location")}>
        {clinic.location ? <MapLink location={clinic.location} /> : t("common.empty")}
      </Detail>
      <Detail label={t("clinic.details.devices")}>
        {maxDevices > 0
          ? t("clinic.details.devicesOfLimit", { count: format.number(active), max: format.number(maxDevices) })
          : format.number(active)}
      </Detail>
      <Detail label={t("clinic.details.members")}>{format.number(clinic.memberCount)}</Detail>
      <Detail label={t("clinic.details.patients")}>{format.number(clinic.patientCount)}</Detail>
      <Detail label={t("clinic.details.createdAt")}>{format.dateTime(clinic.createdAt)}</Detail>
      <Detail label={t("clinic.details.updatedAt")}>{format.dateTime(clinic.updatedAt)}</Detail>
    </dl>
  );
}

/** The point as coordinates, opened on OpenStreetMap. */
function MapLink({ location }: { location: GeoLocation }) {
  const latitude = location.latitude.toFixed(5);
  const longitude = location.longitude.toFixed(5);
  return (
    <a
      href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
    >
      <span dir="ltr">
        {latitude}, {longitude}
      </span>
      <ExternalLinkIcon className="size-3.5" />
    </a>
  );
}

/**
 * Every device of a clinic, in the server's order (not revoked first, then newest
 * first), with only what tells them apart; a row opens the device's full specs.
 */
export function DevicesTable({ installations }: { installations: readonly InstallationDetail[] }) {
  const { t } = useTranslation();
  const format = useFormat();
  const [open, setOpen] = useState<InstallationDetail | null>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("clinic.devices.columns.computer")}</TableHead>
            <TableHead>{t("clinic.devices.columns.status")}</TableHead>
            <TableHead>{t("clinic.devices.columns.appVersion")}</TableHead>
            <TableHead>{t("clinic.devices.columns.lastSeen")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {installations.map((installation) => (
            <TableRow
              key={uuidToString(installation.id)}
              onClick={() => setOpen(installation)}
              className={cn("cursor-pointer", installation.revokedAt && "text-muted-foreground")}
            >
              <TableCell>
                <span dir="ltr" className="font-medium">
                  {installation.hostname || t("common.empty")}
                </span>
                <span dir="ltr" className="block text-xs text-muted-foreground">
                  {installation.osName || t("common.empty")}
                </span>
              </TableCell>
              <TableCell>
                <DeviceStatus installation={installation} />
              </TableCell>
              <TableCell>
                <span dir="ltr">{installation.appVersion || t("common.empty")}</span>
              </TableCell>
              <TableCell>{format.dateTime(installation.lastSeenAt)}</TableCell>
              <TableCell className="text-end">
                {/* The row opens it too; the button is there for the keyboard. */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpen(installation);
                  }}
                >
                  <InfoIcon data-icon="inline-start" />
                  {t("clinic.devices.details")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {open && <DeviceDialog installation={open} onOpenChange={(next) => !next && setOpen(null)} />}
    </>
  );
}

/** Active or revoked, and whether it is beyond the device limit. */
function DeviceStatus({ installation }: { installation: InstallationDetail }) {
  const { t } = useTranslation();
  return (
    <span className="flex flex-wrap items-center gap-1">
      {installation.revokedAt ? (
        <Badge variant="destructive">{t("clinic.devices.revoked")}</Badge>
      ) : (
        <Badge>{t("clinic.devices.active")}</Badge>
      )}
      {installation.overDeviceLimit && <Badge variant="destructive">{t("clinic.devices.overLimit")}</Badge>}
    </span>
  );
}

/** Everything the server knows about one device. */
function DeviceDialog({
  installation,
  onOpenChange,
}: {
  installation: InstallationDetail;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const format = useFormat();
  const empty = t("common.empty");
  const user = installation.lastLoginUser;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            <span dir="ltr">{installation.hostname || empty}</span>
          </DialogTitle>
          <DialogDescription asChild>
            <div>
              <DeviceStatus installation={installation} />
            </div>
          </DialogDescription>
        </DialogHeader>

        <dl className="grid gap-4 sm:grid-cols-2">
          <Detail label={t("clinic.devices.fields.operatingSystem")} ltr>
            {installation.osName || empty}
          </Detail>
          <Detail label={t("clinic.devices.fields.osVersion")} ltr>
            {installation.osVersion || empty}
          </Detail>
          <Detail label={t("clinic.devices.fields.cpu")} ltr>
            {installation.cpuModel || empty}
          </Detail>
          <Detail label={t("clinic.devices.fields.cores")}>{format.number(installation.cpuCores)}</Detail>
          <Detail label={t("clinic.devices.fields.memory")}>
            {t("clinic.devices.gigabytes", { size: format.number(gibibytes(installation.memoryBytes)) })}
          </Detail>
          <Detail label={t("clinic.devices.fields.appVersion")} ltr>
            {installation.appVersion || empty}
          </Detail>
          <Detail label={t("clinic.devices.fields.offlineAccess")}>
            {installation.offlineAccess
              ? format.days(Math.round((durationMs(installation.offlineAccess) / DAY_MS) * 10) / 10)
              : empty}
          </Detail>
          <Detail label={t("clinic.devices.fields.lastLogin")}>
            {installation.lastLoginAt ? format.dateTime(installation.lastLoginAt) : t("clinic.devices.neverLoggedIn")}
            {user && (
              <span className="block text-xs font-normal text-muted-foreground">
                {user.fullName} · <span dir="ltr">{user.username}</span>
              </span>
            )}
          </Detail>
          <Detail label={t("clinic.devices.fields.lastSeen")}>{format.dateTime(installation.lastSeenAt)}</Detail>
          <Detail label={t("clinic.devices.fields.createdAt")}>{format.dateTime(installation.createdAt)}</Detail>
          {installation.revokedAt && (
            <Detail label={t("clinic.devices.fields.revokedAt")}>{format.dateTime(installation.revokedAt)}</Detail>
          )}
          <div className="sm:col-span-2">
            <Detail label={t("clinic.devices.fields.mac")}>
              {installation.macAddresses.length === 0
                ? empty
                : installation.macAddresses.map((mac) => (
                    <span key={mac} dir="ltr" className="block font-mono">
                      {mac}
                    </span>
                  ))}
            </Detail>
          </div>
          {/* The same computer keeps it across reinstalls of the app. */}
          <div className="sm:col-span-2">
            <Detail label={t("clinic.devices.fields.machineId")}>
              <span dir="ltr" className="block font-mono text-xs break-all">
                {toHex(installation.machineIdHash)}
              </span>
            </Detail>
          </div>
        </dl>
      </DialogContent>
    </Dialog>
  );
}

/** Bytes of memory in GiB, to one decimal. */
function gibibytes(bytes: bigint): number {
  return Math.round((Number(bytes) / GIB) * 10) / 10;
}
