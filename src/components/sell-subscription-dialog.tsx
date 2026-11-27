import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "@tanstack/react-router";
import { InfoIcon, LoaderCircleIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { adminClient } from "@/api/client";
import { toMessage } from "@/api/errors";
import { sellSubscriptionSchema, type SellSubscriptionValues } from "@/auth/schemas";
import type { GetUserResponse } from "@/gen/dental/v1/admin_pb";
import type { Plan } from "@/gen/dental/v1/subscription_pb";
import { translateMessage, type Message } from "@/i18n/message";
import { fieldError } from "@/lib/form";
import { useFormat } from "@/lib/format";
import { nextPeriod } from "@/lib/subscription";
import { uuidToString } from "@/lib/uuid";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface SellSubscriptionDialogProps {
  onOpenChange: (open: boolean) => void;
  user: GetUserResponse;
  /** Plans on sale. */
  plans: readonly Plan[];
}

/** Sells a subscription to a clinic owner. The page reloads once it is recorded. */
export function SellSubscriptionDialog({ onOpenChange, user, plans }: SellSubscriptionDialogProps) {
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
  } = useForm<SellSubscriptionValues>({
    resolver: zodResolver(sellSubscriptionSchema),
    defaultValues: { planId: "", note: "" },
  });

  const selected = plans.find((plan) => uuidToString(plan.id) === watch("planId"));
  const period = selected && nextPeriod(user.subscriptions, selected.durationDays, Date.now());

  async function submit(values: SellSubscriptionValues) {
    const plan = plans.find((item) => uuidToString(item.id) === values.planId);
    if (!plan || !user.user) return;
    setError(null);
    try {
      await adminClient.sellSubscription({ userId: user.user.id, planId: plan.id, note: values.note });
      await router.invalidate({ sync: true });
      onOpenChange(false);
    } catch (e) {
      setError(toMessage(e));
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-md">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(submit)} noValidate>
          <DialogHeader>
            <DialogTitle>{t("subscriptions.sell.title")}</DialogTitle>
            <DialogDescription>{t("subscriptions.sell.description", { name: user.user?.fullName })}</DialogDescription>
          </DialogHeader>

          {plans.length === 0 ? (
            <Alert variant="warning">
              <InfoIcon />
              <AlertDescription>
                <Link to="/plans">{t("subscriptions.sell.noPlans")}</Link>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{translateMessage(error)}</AlertDescription>
                </Alert>
              )}

              <Controller
                control={control}
                name="planId"
                render={({ field }) => {
                  const planError = fieldError(errors.planId);
                  return (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="sell-plan" className="mb-1">
                        {t("subscriptions.sell.plan")}
                      </Label>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger
                          id="sell-plan"
                          ref={field.ref}
                          className="h-9 w-full"
                          aria-invalid={!!planError}
                          aria-describedby={planError ? "sell-plan-error" : undefined}
                        >
                          <SelectValue placeholder={t("subscriptions.sell.planPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          {plans.map((plan) => (
                            <SelectItem key={uuidToString(plan.id)} value={uuidToString(plan.id)}>
                              {plan.name}
                              <span className="text-muted-foreground">
                                {" · "}
                                {format.days(plan.durationDays)} · {format.rials(plan.priceRials)}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {planError && (
                        <p id="sell-plan-error" className="text-xs text-destructive">
                          {planError}
                        </p>
                      )}
                    </div>
                  );
                }}
              />

              {selected && period && (
                <Alert variant="info">
                  <InfoIcon />
                  <AlertDescription>
                    <p>
                      {t("subscriptions.sell.summary", {
                        start: format.dateTime(period.start),
                        end: format.dateTime(period.end),
                        price: format.rials(selected.priceRials),
                      })}
                    </p>
                    <p>{format.limits(selected.maxClinics, selected.maxDevicesPerClinic)}</p>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sell-note" className="mb-1">
                  {t("subscriptions.sell.note")}
                </Label>
                <Textarea
                  id="sell-note"
                  rows={2}
                  aria-invalid={!!errors.note}
                  aria-describedby="sell-note-hint"
                  {...register("note")}
                />
                <p
                  id="sell-note-hint"
                  className={errors.note ? "text-xs text-destructive" : "text-xs text-muted-foreground"}
                >
                  {fieldError(errors.note) ?? t("subscriptions.sell.noteHint")}
                </p>
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            {plans.length > 0 && (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <LoaderCircleIcon className="animate-spin" />}
                {isSubmitting ? t("subscriptions.sell.working") : t("subscriptions.sell.submit")}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
