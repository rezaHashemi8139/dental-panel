import { durationMs } from "@bufbuild/protobuf/wkt";
import { ExternalLinkIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ClinicDetail, InstallationDetail } from "@/gen/dental/v1/admin_pb";
import type { GeoLocation } from "@/gen/dental/v1/installation_pb";
import { useFormat } from "@/lib/format";
import { toHex, uuidToString } from "@/lib/uuid";
import { Detail } from "@/components/detail";
import { Badge } from "@/components/ui/badge";
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

/** Every device of a clinic, in the server's order (not revoked first, then newest first). */
export function DevicesTable({ installations }: { installations: readonly InstallationDetail[] }) {
  const { t } = useTranslation();
  const format = useFormat();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("clinic.devices.columns.computer")}</TableHead>
          <TableHead>{t("clinic.devices.columns.status")}</TableHead>
          <TableHead>{t("clinic.devices.columns.system")}</TableHead>
          <TableHead>{t("clinic.devices.columns.hardware")}</TableHead>
          <TableHead>{t("clinic.devices.columns.mac")}</TableHead>
          <TableHead>{t("clinic.devices.columns.appVersion")}</TableHead>
          <TableHead>{t("clinic.devices.columns.offlineAccess")}</TableHead>
          <TableHead>{t("clinic.devices.columns.lastLogin")}</TableHead>
          <TableHead>{t("clinic.devices.columns.lastSeen")}</TableHead>
          <TableHead>{t("clinic.devices.columns.createdAt")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {installations.map((installation) => {
          const revoked = installation.revokedAt !== undefined;
          return (
            <TableRow
              key={uuidToString(installation.id)}
              className={revoked ? "align-top text-muted-foreground" : "align-top"}
            >
              <TableCell>
                <span dir="ltr" className="font-medium">
                  {installation.hostname || t("common.empty")}
                </span>
                {/* The same computer keeps this across reinstalls of the app. */}
                <span dir="ltr" className="block font-mono text-xs text-muted-foreground">
                  {t("clinic.devices.machine", { id: toHex(installation.machineIdHash).slice(0, 12) })}
                </span>
              </TableCell>
              <TableCell>
                <span className="flex flex-col items-start gap-1">
                  {revoked ? (
                    <>
                      <Badge variant="destructive">{t("clinic.devices.revoked")}</Badge>
                      <span className="text-xs">
                        {t("clinic.devices.revokedAt", { date: format.dateTime(installation.revokedAt) })}
                      </span>
                    </>
                  ) : (
                    <Badge>{t("clinic.devices.active")}</Badge>
                  )}
                  {installation.overDeviceLimit && (
                    <Badge variant="destructive">{t("clinic.devices.overLimit")}</Badge>
                  )}
                </span>
              </TableCell>
              <TableCell>
                <span dir="ltr">{installation.osName || t("common.empty")}</span>
                {installation.osVersion && (
                  <span dir="ltr" className="block text-xs text-muted-foreground">
                    {installation.osVersion}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <span dir="ltr">{installation.cpuModel || t("common.empty")}</span>
                <span className="block text-xs text-muted-foreground">
                  {t("clinic.devices.cores", {
                    count: installation.cpuCores,
                    cores: format.number(installation.cpuCores),
                  })}
                  {" · "}
                  {t("clinic.devices.memory", { size: format.number(gibibytes(installation.memoryBytes)) })}
                </span>
              </TableCell>
              <TableCell>
                {installation.macAddresses.length === 0
                  ? t("common.empty")
                  : installation.macAddresses.map((mac) => (
                      <span key={mac} dir="ltr" className="block font-mono text-xs">
                        {mac}
                      </span>
                    ))}
              </TableCell>
              <TableCell>
                <span dir="ltr">{installation.appVersion || t("common.empty")}</span>
              </TableCell>
              <TableCell>
                {installation.offlineAccess
                  ? format.days(Math.round((durationMs(installation.offlineAccess) / DAY_MS) * 10) / 10)
                  : t("common.empty")}
              </TableCell>
              <TableCell>
                {installation.lastLoginAt ? (
                  <>
                    {format.dateTime(installation.lastLoginAt)}
                    {installation.lastLoginUser && (
                      <span className="block text-xs text-muted-foreground">
                        {installation.lastLoginUser.fullName}
                        <span dir="ltr" className="block">
                          {installation.lastLoginUser.username}
                        </span>
                      </span>
                    )}
                  </>
                ) : (
                  t("clinic.devices.neverLoggedIn")
                )}
              </TableCell>
              <TableCell>{format.dateTime(installation.lastSeenAt)}</TableCell>
              <TableCell>{format.dateTime(installation.createdAt)}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

/** Bytes of memory in GiB, to one decimal. */
function gibibytes(bytes: bigint): number {
  return Math.round((Number(bytes) / GIB) * 10) / 10;
}
