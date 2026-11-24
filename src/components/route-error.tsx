import { useState } from "react";
import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { CircleAlertIcon, RefreshCwIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toMessage } from "@/api/errors";
import { translateMessage } from "@/i18n/message";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/** Shown in place of a page whose data could not be loaded (router's errorComponent). */
export function RouteError({ error }: ErrorComponentProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);

  async function retry() {
    setRetrying(true);
    try {
      // `sync` waits for the loaders to finish.
      await router.invalidate({ sync: true });
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertDescription>{translateMessage(toMessage(error))}</AlertDescription>
      </Alert>
      <Button variant="outline" onClick={retry} disabled={retrying}>
        <RefreshCwIcon className={cn(retrying && "animate-spin")} data-icon="inline-start" />
        {t("common.retry")}
      </Button>
    </div>
  );
}
