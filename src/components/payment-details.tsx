import { useTranslation } from "react-i18next";
import { PaymentMethod } from "@/gen/dental/v1/subscription_pb";
import type { PaymentReview } from "@/gen/dental/v1/admin_pb";
import { useFormat } from "@/lib/format";
import { formatCardNumber, formatIban, manualTransfer, paymentMethodKey, purchaseModeKey } from "@/lib/payment";
import { Detail } from "@/components/detail";

/**
 * What an administrator checks a payment against the bank statement with: the
 * amount, where it was sent, the bank's reference and when it was paid.
 */
export function PaymentDetails({ review }: { review: PaymentReview }) {
  const { t } = useTranslation();
  const format = useFormat();
  const { payment, account } = review;
  if (!payment) return null;
  const transfer = manualTransfer(payment);
  // Nothing was paid (PAYMENT_METHOD_FREE): no transfer to check and no account it went to.
  const free = payment.method === PaymentMethod.FREE;
  const empty = t("common.empty");

  // The account's number the owner had to use for this method, then the other one.
  const destination =
    account &&
    (payment.method === PaymentMethod.BANK_TRANSFER
      ? [account.iban && formatIban(account.iban), account.cardNumber && formatCardNumber(account.cardNumber)]
      : [account.cardNumber && formatCardNumber(account.cardNumber), account.iban && formatIban(account.iban)]
    ).filter(Boolean);

  return (
    <dl className="grid gap-4 rounded-lg border p-3 sm:grid-cols-2">
      {review.user && <Detail label={t("payments.details.owner")}>{review.user.fullName}</Detail>}
      <Detail label={t("payments.details.plan")}>
        {payment.planName}
        <span className="block text-xs font-normal text-muted-foreground">
          {format.days(payment.durationDays)} · {format.limits(payment.maxClinics, payment.maxDevicesPerClinic)}
        </span>
      </Detail>
      <Detail label={t("payments.details.mode")}>{t(purchaseModeKey(payment.mode))}</Detail>

      <Detail label={t(free ? "payments.columns.amount" : "payments.details.amount")}>
        <span className="text-base">{format.rials(payment.amountRials)}</span>
        {payment.creditRials > 0n && (
          <span className="block text-xs font-normal text-muted-foreground">
            {t("payments.details.credit", {
              price: format.rials(payment.priceRials),
              credit: format.rials(payment.creditRials),
            })}
          </span>
        )}
      </Detail>

      <Detail label={t("payments.details.method")}>
        {t(paymentMethodKey(payment.method))}
        {free && (
          <span className="block text-xs font-normal text-muted-foreground">{t("payments.details.freeHint")}</span>
        )}
      </Detail>
      {!free && (
        <>
          <Detail label={t("payments.details.account")}>
            {account ? (
              <>
                {account.bankName} · {account.holderName}
                {destination?.map((number) => (
                  <span key={number} dir="ltr" className="block font-mono text-xs font-normal text-muted-foreground">
                    {number}
                  </span>
                ))}
              </>
            ) : (
              empty
            )}
          </Detail>
    
          <Detail label={t("payments.details.reference")} ltr>
            <span className="font-mono">{transfer?.reference || empty}</span>
          </Detail>
          <Detail label={t("payments.details.paidAt")}>{format.dateTime(transfer?.paidAt)}</Detail>
          <Detail label={t("payments.details.payerCard")} ltr>
            {transfer?.payerCardLast4 ? <span className="font-mono">•••• {transfer.payerCardLast4}</span> : empty}
          </Detail>
        </>
      )}
      <Detail label={t("payments.details.reportedAt")}>{format.dateTime(payment.createdAt)}</Detail>
    </dl>
  );
}
