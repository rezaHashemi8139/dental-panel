import { useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { PencilIcon, PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { adminClient } from "@/api/client";
import type { Plan } from "@/gen/dental/v1/subscription_pb";
import { useFormat } from "@/lib/format";
import { uuidToString } from "@/lib/uuid";
import { PlanDialog } from "@/components/plan-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const plansRoute = getRouteApi("/app/plans");

/** Data of /plans (src/router.tsx): every plan, the ones on sale first. */
export async function loadPlans(): Promise<Plan[]> {
  return (await adminClient.listPlans({})).plans;
}

/** Which dialog is open: a new plan, or editing one. */
type Editing = { kind: "new" } | { kind: "edit"; plan: Plan } | null;

export function PlansPage() {
  const { t } = useTranslation();
  const format = useFormat();
  const plans = plansRoute.useLoaderData();
  const [editing, setEditing] = useState<Editing>(null);

  return (
    <Card className="w-full max-w-5xl">
      <CardHeader>
        <CardTitle>{t("plans.title")}</CardTitle>
        <CardDescription>{t("plans.description")}</CardDescription>
        <CardAction>
          <Button onClick={() => setEditing({ kind: "new" })}>
            <PlusIcon data-icon="inline-start" />
            {t("plans.new")}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {plans.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("plans.empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("plans.columns.name")}</TableHead>
                <TableHead>{t("plans.columns.maxClinics")}</TableHead>
                <TableHead>{t("plans.columns.maxDevices")}</TableHead>
                <TableHead>{t("plans.columns.duration")}</TableHead>
                <TableHead>{t("plans.columns.price")}</TableHead>
                <TableHead>{t("plans.columns.maxPurchases")}</TableHead>
                <TableHead>{t("plans.columns.status")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={uuidToString(plan.id)} className={plan.active ? undefined : "text-muted-foreground"}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>{format.number(plan.maxClinics)}</TableCell>
                  <TableCell>{format.number(plan.maxDevicesPerClinic)}</TableCell>
                  <TableCell>{format.days(plan.durationDays)}</TableCell>
                  <TableCell>{format.rials(plan.priceRials)}</TableCell>
                  <TableCell>
                    {plan.maxPurchasesPerOwner === 0
                      ? t("plans.unlimited")
                      : format.number(plan.maxPurchasesPerOwner)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={plan.active ? "default" : "outline"}>
                      {t(plan.active ? "plans.status.active" : "plans.status.inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditing({ kind: "edit", plan })}>
                      <PencilIcon data-icon="inline-start" />
                      {t("plans.edit")}
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
        <PlanDialog
          open
          plan={editing.kind === "edit" ? editing.plan : null}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </Card>
  );
}
