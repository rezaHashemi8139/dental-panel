import { useTranslation } from "react-i18next";
import { useSession } from "@/auth/store";
import { useFormat } from "@/lib/format";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function HomePage() {
  const { t } = useTranslation();
  const format = useFormat();
  const session = useSession();
  // AppLayout only renders this while logged in.
  if (!session) return null;

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{t("home.welcome", { name: session.admin.fullName })}</CardTitle>
        <CardDescription>{t("home.description")}</CardDescription>
      </CardHeader>
      <CardFooter className="text-xs text-muted-foreground">
        {t("home.sessionExpires", { time: format.dateTime(session.expiresAt) })}
      </CardFooter>
    </Card>
  );
}
