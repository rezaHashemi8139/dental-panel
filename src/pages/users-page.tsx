import { useState } from "react";
import { getRouteApi, Link, useRouter } from "@tanstack/react-router";
import { Trash2Icon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { adminClient } from "@/api/client";
import type { UserListItem } from "@/gen/dental/v1/admin_pb";
import { useFormat } from "@/lib/format";
import { fromPersonIdentity } from "@/lib/identity";
import { PAGE_SIZE, parsePage, parseQuery } from "@/lib/pagination";
import { uuidToString } from "@/lib/uuid";
import { DeleteUserDialog } from "@/components/delete-user-dialog";
import { ListEmpty, ListFilters, ListPage, ListResults } from "@/components/list-page";
import { ListPagination } from "@/components/list-pagination";
import { ListSearch } from "@/components/list-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const usersRoute = getRouteApi("/app/users");

/** ?q=… (full name, username, identification code, phone or email) and ?page=… (none for the first). */
export interface UsersSearch {
  q?: string;
  page?: number;
}

export function parseUsersSearch(search: Record<string, unknown>): UsersSearch {
  return { q: parseQuery(search.q), page: parsePage(search.page) };
}

export interface UsersData {
  query: string;
  page: number;
  users: UserListItem[];
  /** Matching users on every page. */
  total: number;
}

/** Data of /users (src/router.tsx), one page of desktop-app accounts (never admins), newest first. */
export async function loadUsers(search: UsersSearch): Promise<UsersData> {
  const query = search.q ?? "";
  const page = search.page ?? 1;
  const response = await adminClient.listUsers({ query, page, pageSize: PAGE_SIZE });
  return { query, page, users: response.users, total: response.totalCount };
}

export function UsersPage() {
  const { t } = useTranslation();
  const format = useFormat();
  const router = useRouter();
  const { query, page, users, total } = usersRoute.useLoaderData();
  const [deleting, setDeleting] = useState<UserListItem | null>(null);

  return (
    <ListPage>
      <ListFilters title={t("users.title")} description={t("users.description")}>
        <ListSearch
          key={query}
          query={query}
          label={t("users.search.label")}
          placeholder={t("users.search.placeholder")}
        />
      </ListFilters>

      <ListResults footer={total > 0 && <ListPagination page={page} total={total} shown={users.length} />}>
        {users.length === 0 ? (
          <ListEmpty>{t(query ? "users.noResults" : "users.empty")}</ListEmpty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("users.columns.name")}</TableHead>
                <TableHead>{t("users.columns.username")}</TableHead>
                <TableHead>{t("users.columns.identityCode")}</TableHead>
                <TableHead>{t("users.columns.phone")}</TableHead>
                <TableHead>{t("users.columns.email")}</TableHead>
                <TableHead>{t("users.columns.subscription")}</TableHead>
                <TableHead>{t("users.columns.ownedClinics")}</TableHead>
                <TableHead>{t("users.columns.memberClinics")}</TableHead>
                <TableHead>{t("users.columns.installations")}</TableHead>
                <TableHead>{t("users.columns.lastLogin")}</TableHead>
                <TableHead>{t("users.columns.createdAt")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((item) => {
                const { user } = item;
                if (!user) return null;
                const code = fromPersonIdentity(item.identity);
                return (
                  <TableRow key={uuidToString(user.id)} className={item.disabled ? "text-muted-foreground" : undefined}>
                    <TableCell>
                      <span className="flex flex-wrap items-center gap-2">
                        {/* The account's subscriptions, payments and clinics. */}
                        {code ? (
                          <Link
                            to="/subscriptions"
                            search={{ code }}
                            className="font-medium underline-offset-4 hover:underline"
                          >
                            {user.fullName || code}
                          </Link>
                        ) : (
                          <span className="font-medium">{user.fullName}</span>
                        )}
                        {item.disabled && <Badge variant="destructive">{t("users.disabled")}</Badge>}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span dir="ltr">{user.username}</span>
                    </TableCell>
                    <TableCell>
                      <span dir="ltr">{code ?? t("common.empty")}</span>
                    </TableCell>
                    <TableCell>
                      <span dir="ltr">{item.phone || t("common.empty")}</span>
                    </TableCell>
                    <TableCell>
                      <span dir="ltr">{item.email || t("common.empty")}</span>
                    </TableCell>
                    <TableCell>
                      {item.planName ? (
                        <>
                          <span className="font-medium">{item.planName}</span>
                          {item.paidUntil && (
                            <span className="block text-xs text-muted-foreground">
                              {t("users.paidUntil", { date: format.date(item.paidUntil) })}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">{t("users.noSubscription")}</span>
                      )}
                    </TableCell>
                    <TableCell>{format.number(item.ownedClinicCount)}</TableCell>
                    <TableCell>{format.number(item.memberClinicCount)}</TableCell>
                    {/* Devices not revoked, across the clinics the account owns. */}
                    <TableCell>{format.number(item.installationCount)}</TableCell>
                    <TableCell>
                      {item.lastLoginAt ? format.dateTime(item.lastLoginAt) : t("users.neverLoggedIn")}
                    </TableCell>
                    <TableCell>{format.date(item.createdAt)}</TableCell>
                    <TableCell className="text-end">
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        title={t("users.delete.button")}
                        aria-label={t("users.delete.button")}
                        onClick={() => setDeleting(item)}
                      >
                        <Trash2Icon />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </ListResults>

      {deleting?.user && (
        <DeleteUserDialog
          user={deleting.user}
          ownedClinicCount={deleting.ownedClinicCount}
          onDeleted={() => router.invalidate({ sync: true })}
          onOpenChange={(open) => !open && setDeleting(null)}
        />
      )}
    </ListPage>
  );
}
