"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CreditCard, Lock, ShieldCheck } from "lucide-react";
import { demoGateway } from "@/lib/api/mock";
import type { PaymentStatus } from "@/lib/api";
import { USE_MOCK } from "@/lib/config";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { amountText } from "@/components/money";
import { Button, Field, Input } from "@/components/common";
import { LanguageSwitch } from "@/components/language-switch";

// The code the demo "sends by SMS". Qi's sandbox also uses a fixed code for its 3-D Secure step.
const DEMO_CODE = "123123";

type Step = "card" | "code" | "busy";

// A stand-in for the payment gateway's own page, only in the demo (fake data). With the real backend,
// the patient goes to Qi Card's page instead, and this page is never used.
function DemoGateway() {
  const { t } = useT();
  const params = useSearchParams();
  const paymentId = params.get("payment") ?? "";
  const info = useLoad(() => demoGateway.info(paymentId), paymentId);
  const [step, setStep] = useState<Step>("card");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  async function finish(outcome: Exclude<PaymentStatus, "created">) {
    setStep("busy");
    try {
      const back = await demoGateway.finish(paymentId, outcome);
      // Like the real gateway, it sends the patient back to the clinic's site with the payment id.
      window.location.assign(back);
    } catch (err) {
      setError(errorText(err, t));
      setStep("card");
    }
  }

  if (info.state.status === "loading") return <p className="py-10 text-center text-slate-500">{t("gateway.loading")}</p>;
  if (info.state.status === "error") return <p className="py-10 text-center text-red-700">{errorText(info.state.error, t)}</p>;
  const { amount, currency, finished } = info.state.data;
  if (finished) return <p className="py-10 text-center text-slate-600">{t("gateway.alreadyDone")}</p>;

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-slate-50 p-4 text-center">
        <p className="text-sm text-slate-500">{t("gateway.payTo")}</p>
        <p className="font-semibold">{t("app.name")}</p>
        <p className="mt-2 text-3xl font-bold" data-gateway-amount>
          {amountText(amount, currency, t)}
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {step === "card" && (
        <form
          className="space-y-4"
          data-gateway-step="card"
          onSubmit={(e) => {
            e.preventDefault();
            setStep("code");
          }}
        >
          {/* Filled in and locked: nobody should type a real card into a demo. */}
          <Field label={t("gateway.cardNumber")}>
            <Input dir="ltr" readOnly value="0000 0000 0000 0000" className="font-mono" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("gateway.expiry")}>
              <Input dir="ltr" readOnly value="12/30" className="font-mono" />
            </Field>
            <Field label="CVV">
              <Input dir="ltr" readOnly value="000" className="font-mono" />
            </Field>
          </div>
          <Button type="submit" className="h-11 w-full">
            <Lock className="size-4" aria-hidden />
            {t("gateway.pay", { amount: amountText(amount, currency, t) })}
          </Button>
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <button type="button" className="text-red-700 hover:underline" onClick={() => finish("failed")} data-gateway="decline">
              {t("gateway.simulateDecline")}
            </button>
            <button type="button" className="text-slate-600 hover:underline" onClick={() => finish("canceled")} data-gateway="cancel">
              {t("gateway.cancel")}
            </button>
          </div>
        </form>
      )}

      {step === "code" && (
        // The bank's check (3-D Secure): a code sent by SMS to the card owner's phone.
        <form
          className="space-y-4"
          data-gateway-step="code"
          onSubmit={(e) => {
            e.preventDefault();
            void finish(code === DEMO_CODE ? "success" : "authentication_failed");
          }}
        >
          <div className="flex items-start gap-3 rounded-lg bg-brand-50 p-3 text-sm text-brand-800">
            <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
            <p>{t("gateway.codeSent")}</p>
          </div>
          <Field label={t("gateway.code")} hint={t("gateway.demoCode", { code: DEMO_CODE })}>
            <Input
              inputMode="numeric"
              dir="ltr"
              maxLength={6}
              autoComplete="one-time-code"
              className="text-center font-mono text-lg tracking-[0.5em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              autoFocus
            />
          </Field>
          <Button type="submit" className="h-11 w-full" disabled={code.length !== 6}>
            {t("gateway.confirm")}
          </Button>
          <button type="button" className="w-full text-center text-sm text-slate-600 hover:underline" onClick={() => finish("canceled")}>
            {t("gateway.cancel")}
          </button>
        </form>
      )}

      {step === "busy" && <p className="py-6 text-center text-slate-600">{t("gateway.processing")}</p>}
    </div>
  );
}

export default function DemoGatewayPage() {
  const { t } = useT();
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="absolute top-4 end-4">
        <LanguageSwitch />
      </div>
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-800 px-5 py-4 text-white">
          <span className="flex items-center gap-2 font-semibold">
            <CreditCard className="size-5" aria-hidden />
            {t("gateway.title")}
          </span>
          <span className="flex items-center gap-1 text-xs opacity-80">
            <Lock className="size-3.5" aria-hidden />
            {t("gateway.secure")}
          </span>
        </div>
        <p className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-xs text-amber-800">{t("gateway.demoNote")}</p>
        <div className="p-5">
          {USE_MOCK ? (
            <Suspense fallback={<p className="py-10 text-center text-slate-500">{t("gateway.loading")}</p>}>
              <DemoGateway />
            </Suspense>
          ) : (
            <p className="py-10 text-center text-slate-600">{t("gateway.notAvailable")}</p>
          )}
        </div>
      </div>
    </main>
  );
}
