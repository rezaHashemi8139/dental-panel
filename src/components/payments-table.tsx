import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckIcon, XIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PaymentReview } from "@/gen/dental/v1/admin_pb";
import { PaymentMethod, PaymentStatus } from "@/gen/dental/v1/subscription_pb";
import { useFormat } from "@/lib/format";
import { fromPersonIdentity, toIdentitySearch } from "@/lib/identity";
import { manualTransfer, paymentStatusName, purchaseModeKey, type PaymentStatusName } from "@/lib/payment";
import { uuidToString } from "@/lib/uuid";
import { ApprovePaymentDialog } from "@/components/approve-payment-dialog";
import { RejectPaymentDialog } from "@/components/reject-payment-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const STATUS_BADGE: Record<PaymentStatusName, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "default",
  approved: "secondary",
  rejected: "destructive",
  canceled: "outline",
};

/** Which dialog is open, for which payment. */
type Reviewing = { action: "approve" | "reject"; review: PaymentReview } | null;

interface PaymentsTableProps {
  reviews: readonly PaymentReview[];
  /** Shows who paid, linked to their subscriptions page (off on that page itself). */
  showOwner?: boolean;
}

/** Reported payments, with Approve and Reject on the pending ones. */
export function PaymentsTable({ reviews, showOwner }: PaymentsTableProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const [reviewing, setReviewing] = useState<Reviewing>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("payments.columns.reportedAt")}</TableHead>
            {showOwner && <TableHead>{t("payments.columns.owner")}</TableHead>}
            <TableHead>{t("payments.columns.plan")}</TableHead>
            <TableHead>{t("payments.columns.amount")}</TableHead>
            <TableHead>{t("payments.columns.transfer")}</TableHead>
            <TableHead>{t("payments.columns.status")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {reviews.map((review) => {
            const { payment } = review;
            if (!payment) return null;
            const transfer = manualTransfer(payment);
            const status = paymentStatusName(payment.status);
            const identity = fromPersonIdentity(review.identity);
            return (
              <TableRow key={uuidToString(payment.id)} className="align-top">
                <TableCell>{format.dateTime(payment.createdAt)}</TableCell>
                {showOwner && (
                  <TableCell>
                    {identity ? (
                      <Link
                        to="/subscriptions"
                        search={toIdentitySearch(identity)}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {review.user?.fullName || identity.number}
                      </Link>
                    ) : (
                      <span className="font-medium">{review.user?.fullName}</span>
                    )}
                    {identity && (
                      <span dir="ltr" className="block text-xs text-muted-foreground">
                        {identity.number}
                      </span>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <span className="font-medium">{payment.planName}</span>
                  <span className="block text-xs text-muted-foreground">{t(purchaseModeKey(payment.mode))}</span>
                </TableCell>
                <TableCell className="font-medium">{format.rials(payment.amountRials)}</TableCell>
                <TableCell>
                  {transfer ? (
                    <>
                      <span dir="ltr" className="font-mono">
                        {transfer.reference}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {format.dateTime(transfer.paidAt)}
                        {review.account && ` · ${review.account.bankName}`}
                      </span>
                    </>
                  ) : payment.method === PaymentMethod.FREE ? (
                    <span className="text-muted-foreground">{t("payments.method.free")}</span>
                  ) : (
                    t("common.empty")
                  )}
                </TableCell>
                <TableCell className="max-w-56 whitespace-normal">
                  <Badge variant={status ? STATUS_BADGE[status] : "outline"}>
                    {status ? t(`payments.status.${status}`) : t("common.empty")}
                  </Badge>
                  {payment.status === PaymentStatus.REJECTED && payment.rejectionReason && (
                    <span className="mt-1 block text-xs text-muted-foreground">{payment.rejectionReason}</span>
                  )}
                </TableCell>
                <TableCell className="text-end">
                  {payment.status === PaymentStatus.PENDING && (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" onClick={() => setReviewing({ action: "approve", review })}>
                        <CheckIcon data-icon="inline-start" />
                        {t("payments.approve.button")}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setReviewing({ action: "reject", review })}
                      >
                        <XIcon data-icon="inline-start" />
                        {t("payments.reject.button")}
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Mounted only while open, so every opening starts with a fresh form. */}
      {reviewing?.action === "approve" && (
        <ApprovePaymentDialog review={reviewing.review} onOpenChange={(open) => !open && setReviewing(null)} />
      )}
      {reviewing?.action === "reject" && (
        <RejectPaymentDialog review={reviewing.review} onOpenChange={(open) => !open && setReviewing(null)} />
      )}
    </>
  );
}
