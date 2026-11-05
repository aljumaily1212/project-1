"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { errorText, useT } from "@/lib/i18n";
import { forgotSchema, resetSchema, type ForgotForm, type ResetForm } from "@/lib/validation";
import { AuthShell } from "@/components/account";
import { Button, Field, Input } from "@/components/common";

// Step 1: the phone number. The server sends a 6-digit code by SMS.
function PhoneStep({ onSent }: { onSent: (phone: string, minutes: number, devCode?: string) => void }) {
  const { t } = useT();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotForm>({ resolver: zodResolver(forgotSchema), defaultValues: { phone: "" } });

  async function onSubmit({ phone }: ForgotForm) {
    try {
      const result = await api.forgotPassword(phone);
      onSent(phone, result.expires_in_minutes, result.dev_code);
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4" data-step="phone">
      <Field label={t("login.phone")} error={errors.phone?.message}>
        <Input type="tel" inputMode="numeric" dir="ltr" autoComplete="username" placeholder="07XXXXXXXXX" invalid={!!errors.phone} {...register("phone")} />
      </Field>
      <Button type="submit" className="h-11 w-full" loading={isSubmitting}>
        {t("password.sendCode")}
      </Button>
    </form>
  );
}

// Step 2: the code from the SMS and the new password, typed twice.
function CodeStep({ phone, minutes, devCode, onBack }: { phone: string; minutes: number; devCode?: string; onBack: () => void }) {
  const { t } = useT();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({ resolver: zodResolver(resetSchema), defaultValues: { code: "", new_password: "", confirm: "" } });

  async function onSubmit({ code, new_password }: ResetForm) {
    try {
      await api.resetPassword({ phone, code, new_password });
      toast.success(t("password.resetDone"));
      router.replace("/");
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4" data-step="code">
      <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
        {minutes > 0 ? t("password.codeSent", { phone, n: minutes }) : t("password.codeSentNoTime", { phone })}
      </p>
      {/* Only with the fake data: there is no real SMS, so the code is shown here to try the flow. */}
      {devCode && (
        <p className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800" data-dev-code={devCode}>
          {t("password.devCode")} <span className="font-mono font-bold" dir="ltr">{devCode}</span>
        </p>
      )}
      <Field label={t("password.code")} error={errors.code?.message}>
        <Input
          inputMode="numeric"
          dir="ltr"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="••••••"
          className="text-center font-mono text-lg tracking-[0.5em]"
          invalid={!!errors.code}
          {...register("code")}
        />
      </Field>
      <Field label={t("password.new")} error={errors.new_password?.message}>
        <Input type="password" dir="ltr" autoComplete="new-password" invalid={!!errors.new_password} {...register("new_password")} />
      </Field>
      <Field label={t("password.confirm")} error={errors.confirm?.message}>
        <Input type="password" dir="ltr" autoComplete="new-password" invalid={!!errors.confirm} {...register("confirm")} />
      </Field>
      <Button type="submit" className="h-11 w-full" loading={isSubmitting}>
        {t("password.save")}
      </Button>
      <button type="button" onClick={onBack} className="w-full text-center text-sm text-brand-600 hover:underline">
        {t("password.resend")}
      </button>
    </form>
  );
}

// Forgot password, for patients and staff alike. No sign-in needed.
export default function ForgotPasswordPage() {
  const { t } = useT();
  const [sent, setSent] = useState<{ phone: string; minutes: number; devCode?: string } | null>(null);

  return (
    <AuthShell
      title={t("password.forgotTitle")}
      subtitle={sent ? t("password.step2") : t("password.step1")}
      footer={
        <Link href="/" className="font-medium text-brand-600 hover:underline">
          {t("password.backToLogin")}
        </Link>
      }
    >
      {sent ? (
        <CodeStep phone={sent.phone} minutes={sent.minutes} devCode={sent.devCode} onBack={() => setSent(null)} />
      ) : (
        <PhoneStep onSent={(phone, minutes, devCode) => setSent({ phone, minutes, devCode })} />
      )}
    </AuthShell>
  );
}
