import { getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { adminClient } from "@/api/client";
import type { PatientListItem } from "@/gen/dental/v1/admin_pb";
import { Gender } from "@/gen/dental/v1/patient_pb";
import { useFormat } from "@/lib/format";
import { fromPersonIdentity } from "@/lib/identity";
import { PAGE_SIZE, parsePage, parseQuery } from "@/lib/pagination";
import { uuidToString } from "@/lib/uuid";
import { ListPagination } from "@/components/list-pagination";
import { ListSearch } from "@/components/list-search";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const patientsRoute = getRouteApi("/app/patients");

/** ?q=… (name, identification code or phone) and ?page=… (none for the first). */
export interface PatientsSearch {
  q?: string;
  page?: number;
}

export function parsePatientsSearch(search: Record<string, unknown>): PatientsSearch {
  return { q: parseQuery(search.q), page: parsePage(search.page) };
}

export interface PatientsData {
  query: string;
  page: number;
  patients: PatientListItem[];
  /** Matching patients on every page. */
  total: number;
}

/** Data of /patients (src/router.tsx), one page, newest first. */
export async function loadPatients(search: PatientsSearch): Promise<PatientsData> {
  const query = search.q ?? "";
  const page = search.page ?? 1;
  const response = await adminClient.listPatients({ query, page, pageSize: PAGE_SIZE });
  return { query, page, patients: response.patients, total: response.totalCount };
}

const GENDER_KEYS = {
  [Gender.MALE]: "patients.gender.male",
  [Gender.FEMALE]: "patients.gender.female",
} as const;

/** A Gregorian "YYYY-MM-DD" as a local date, to show in the current calendar; undefined if none. */
function birthDate(value: string): Date | undefined {
  const [year, month, day] = value.split("-").map(Number);
  return value ? new Date(year, month - 1, day) : undefined;
}

export function PatientsPage() {
  const { t } = useTranslation();
  const format = useFormat();
  const { query, page, patients, total } = patientsRoute.useLoaderData();

  return (
    <Card className="w-full max-w-6xl">
      <CardHeader>
        <CardTitle>{t("patients.title")}</CardTitle>
        <CardDescription>{t("patients.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ListSearch
          key={query}
          query={query}
          label={t("patients.search.label")}
          placeholder={t("patients.search.placeholder")}
        />

        {patients.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t(query ? "patients.noResults" : "patients.empty")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("patients.columns.patient")}</TableHead>
                <TableHead>{t("patients.columns.phone")}</TableHead>
                <TableHead>{t("patients.columns.birthDate")}</TableHead>
                <TableHead>{t("patients.columns.gender")}</TableHead>
                <TableHead>{t("patients.columns.clinics")}</TableHead>
                <TableHead>{t("patients.columns.treatments")}</TableHead>
                <TableHead>{t("patients.columns.createdAt")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.map((patient) => (
                <TableRow key={uuidToString(patient.id)} className="align-top">
                  <TableCell>
                    <span className="font-medium">
                      {patient.firstName} {patient.lastName}
                    </span>
                    <span dir="ltr" className="block text-xs text-muted-foreground">
                      {fromPersonIdentity(patient.identity) ?? t("common.empty")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span dir="ltr">{patient.phone || t("common.empty")}</span>
                  </TableCell>
                  <TableCell>{format.date(birthDate(patient.birthDate))}</TableCell>
                  <TableCell>
                    {patient.gender === Gender.MALE || patient.gender === Gender.FEMALE
                      ? t(GENDER_KEYS[patient.gender])
                      : t("common.empty")}
                  </TableCell>
                  <TableCell>{format.number(patient.clinicCount)}</TableCell>
                  <TableCell>{format.number(patient.treatmentCount)}</TableCell>
                  <TableCell title={t("patients.updatedAt", { time: format.dateTime(patient.updatedAt) })}>
                    {format.date(patient.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {total > 0 && <ListPagination page={page} total={total} shown={patients.length} />}
      </CardContent>
    </Card>
  );
}
