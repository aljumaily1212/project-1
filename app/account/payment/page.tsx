"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { api, type PaymentSession } from "@/lib/api";
import { errorText, useT } from "@/lib/i18n";
import { isFinal, goToPayment, paymentReturnUrl } from "@/lib/payment";
import { amountText } from "@/components/money";
import { Button, Card, PageHeader } from "@/components/common";

// How often to ask, and for how long, before saying "still waiting".
const EVERY_MS = 1500;
const GIVE_UP_MS = 60_000;

// The patient comes back here from the payment page. Coming back proves nothing, so this page asks the
// server until it knows the result (the server hears it from the gateway, and checks it).
function PaymentResult() {
  const { t, locale } = useT();
  const paymentId = useSearchParams().get("payment") ?? "";
  const [payment, setPayment] = useState<PaymentSession | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [startedAt] = useState(() => Date.now());
  const [timedOut, setTimedOut] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    async function check() {
      try {
        const latest = await api.paymentStatus(paymentId);
        if (stop) return;
        setPayment(latest);
        if (isFinal(latest.status)) return;
      } catch (err) {
        if (!stop) setError(err);
        return;
      }
      if (Date.now() - startedAt > GIVE_UP_MS) setTimedOut(true);
      else timer = setTimeout(check, EVERY_MS);
    }
    void check();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [paymentId, startedAt]);

  // Try again: a new payment for what's still owed.
  async function retry() {
    if (!payment) return;
    setRetrying(true);
    try {
      goToPayment(await api.startPayment(payment.appointment_id, { idempotency_key: crypto.randomUUID(), return_url: paymentReturnUrl() }));
    } catch (err) {
      toast.error(errorText(err, t));
      setRetrying(false);
    }
  }

  if (error) {
    return (
      <Card className="space-y-3 text-center">
        <p className="text-red-700">{errorText(error, t)}</p>
        <Link href="/account/appointments" replace className="font-medium text-brand-600 hover:underline">
          {t("payment.toAppointments")}
        </Link>
      </Card>
    );
  }

  const status = payment?.status ?? "created";
  const amount = payment ? amountText(payment.amount, payment.currency, t) : "";
  const deadline = payment?.pay_by ? new Intl.DateTimeFormat(locale === "ar" ? "ar-IQ-u-nu-latn" : "en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(payment.pay_by)) : null;

  return (
    <Card className="space-y-4 text-center" data-payment-status={status}>
      {status === "created" && (
        <>
          <Clock className={`mx-auto size-12 text-brand-600 ${timedOut ? "" : "animate-pulse"}`} aria-hidden />
          <h2 className="text-xl font-semibold">{timedOut ? t("payment.stillWaiting") : t("payment.checking")}</h2>
          <p className="text-slate-600">{timedOut ? t("payment.stillWaitingHint") : t("payment.checkingHint")}</p>
        </>
      )}
      {status === "success" && (
        <>
          <CheckCircle2 className="mx-auto size-12 text-emerald-600" aria-hidden />
          <h2 className="text-xl font-semibold">{t("payment.success")}</h2>
          <p className="text-slate-600">{t("payment.successHint", { amount })}</p>
        </>
      )}
      {(status === "failed" || status === "authentication_failed" || status === "canceled") && (
        <>
          <XCircle className="mx-auto size-12 text-red-600" aria-hidden />
          <h2 className="text-xl font-semibold">{t(`payment.${status}`)}</h2>
          <p className="text-slate-600">{t("payment.notCharged")}</p>
          {deadline && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{t("payment.payBy", { time: deadline })}</p>}
          <Button className="w-full" loading={retrying} onClick={retry}>
            {t("payment.retry", { amount })}
          </Button>
        </>
      )}
      <Link href="/account/appointments" replace className="inline-block font-medium text-brand-600 hover:underline">
        {t("payment.toAppointments")}
      </Link>
    </Card>
  );
}

export default function PaymentResultPage() {
  const { t } = useT();
  return (
    <>
      <PageHeader title={t("payment.title")} />
      <div className="max-w-md">
        {/* useSearchParams needs a Suspense boundary in a static export. */}
        <Suspense fallback={null}>
          <PaymentResult />
        </Suspense>
      </div>
    </>
  );
}
