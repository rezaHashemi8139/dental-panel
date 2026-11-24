import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@tanstack/react-router";
import { LoaderCircleIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { adminClient } from "@/api/client";
import { toMessage } from "@/api/errors";
import { planSchema, type PlanValues } from "@/auth/schemas";
import type { Plan } from "@/gen/dental/v1/admin_pb";
import { translateMessage, type Message } from "@/i18n/message";
import { fieldError } from "@/lib/form";
import { useFormat } from "@/lib/format";
import { FormField } from "@/components/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface PlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The plan to edit; null for a new one. */
  plan: Plan | null;
}

const NEW_PLAN: PlanValues = {
  name: "",
  maxClinics: "1",
  maxDevicesPerClinic: "1",
  durationDays: "365",
  priceRials: "",
  active: true,
};

function toValues(plan: Plan): PlanValues {
  return {
    name: plan.name,
    maxClinics: String(plan.maxClinics),
    maxDevicesPerClinic: String(plan.maxDevicesPerClinic),
    durationDays: String(plan.durationDays),
    priceRials: plan.priceRials.toString(),
    active: plan.active,
  };
}

/** Creates a plan, or edits one. The plans list reloads once it is saved. */
export function PlanDialog({ open, onOpenChange, plan }: PlanDialogProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const router = useRouter();
  const [error, setError] = useState<Message | null>(null);
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PlanValues>({
    resolver: zodResolver(planSchema),
    defaultValues: plan ? toValues(plan) : NEW_PLAN,
  });

  const price = watch("priceRials").trim();
  const pricePreview = /^[0-9]{1,18}$/.test(price) ? format.rials(BigInt(price)) : undefined;

  async function submit(values: PlanValues) {
    setError(null);
    const fields = {
      name: values.name,
      maxClinics: Number(values.maxClinics),
      maxDevicesPerClinic: Number(values.maxDevicesPerClinic),
      durationDays: Number(values.durationDays),
      priceRials: BigInt(values.priceRials),
    };
    try {
      if (plan) await adminClient.updatePlan({ id: plan.id, ...fields, active: values.active });
      else await adminClient.createPlan(fields);
      await router.invalidate({ sync: true });
      onOpenChange(false);
    } catch (e) {
      setError(toMessage(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-md">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(submit)} noValidate>
          <DialogHeader>
            <DialogTitle>{t(plan ? "plans.dialog.editTitle" : "plans.dialog.createTitle")}</DialogTitle>
            <DialogDescription>
              {t(plan ? "plans.dialog.editDescription" : "plans.dialog.createDescription")}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{translateMessage(error)}</AlertDescription>
            </Alert>
          )}

          <FormField
            id="plan-name"
            label={t("plans.fields.name")}
            error={fieldError(errors.name)}
            autoFocus
            {...register("name")}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="plan-max-clinics"
              label={t("plans.fields.maxClinics")}
              error={fieldError(errors.maxClinics)}
              inputMode="numeric"
              latin
              {...register("maxClinics")}
            />
            <FormField
              id="plan-max-devices"
              label={t("plans.fields.maxDevices")}
              error={fieldError(errors.maxDevicesPerClinic)}
              inputMode="numeric"
              latin
              {...register("maxDevicesPerClinic")}
            />
          </div>
          <FormField
            id="plan-duration"
            label={t("plans.fields.durationDays")}
            error={fieldError(errors.durationDays)}
            inputMode="numeric"
            latin
            {...register("durationDays")}
          />
          <FormField
            id="plan-price"
            label={t("plans.fields.priceRials")}
            error={fieldError(errors.priceRials)}
            hint={pricePreview}
            inputMode="numeric"
            latin
            {...register("priceRials")}
          />

          {plan && (
            <Controller
              control={control}
              name="active"
              render={({ field }) => (
                <div className="flex items-start gap-3">
                  <Switch
                    id="plan-active"
                    className="mt-0.5"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-describedby="plan-active-hint"
                  />
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="plan-active">{t("plans.fields.active")}</Label>
                    <p id="plan-active-hint" className="text-xs text-muted-foreground">
                      {t("plans.fields.activeHint")}
                    </p>
                  </div>
                </div>
              )}
            />
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircleIcon className="animate-spin" />}
              {isSubmitting ? t("plans.dialog.working") : t(plan ? "plans.dialog.save" : "plans.dialog.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
