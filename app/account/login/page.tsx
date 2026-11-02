"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api";
import { MOCK_LOGINS, MOCK_PASSWORD } from "@/lib/api/mock";
import { saveSession, useIsPatient } from "@/lib/auth";
import { USE_MOCK } from "@/lib/config";
import { errorText, useT } from "@/lib/i18n";
import { loginSchema, type LoginForm } from "@/lib/validation";
import { AuthShell } from "@/components/account";
import { Button, Card, Field, Input } from "@/components/common";

export default function PatientLoginPage() {
  const router = useRouter();
  const { t } = useT();
  const isPatient = useIsPatient();
  const [error, setError] = useState("");
  const [isStaff, setIsStaff] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    if (isPatient) router.replace("/account");
  }, [isPatient, router]);

  async function onSubmit(values: LoginForm) {
    setError("");
    setIsStaff(false);
    try {
      const res = await api.login(values);
      if (res.user.role !== "patient") {
        setIsStaff(true);
        setError(t("account.login.patientsOnly"));
        return;
      }
      saveSession({ token: res.access_token, refreshToken: res.refresh_token, user: res.user });
    } catch (err) {
      setError(errorText(err, t));
    }
  }

  return (
    <AuthShell
      title={t("account.login.title")}
      subtitle={t("account.login.subtitle")}
      footer={
        <>
          {t("account.login.noAccount")}{" "}
          <Link href="/account/register" className="font-medium text-brand-600 hover:underline">
            {t("account.login.register")}
          </Link>
        </>
      }
    >
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Field label={t("login.phone")} error={errors.phone?.message}>
            <Input type="tel" inputMode="numeric" dir="ltr" autoComplete="username" placeholder="07XXXXXXXXX" invalid={!!errors.phone} {...register("phone")} />
          </Field>
          <Field label={t("login.password")} error={errors.password?.message}>
            <Input type="password" dir="ltr" autoComplete="current-password" invalid={!!errors.password} {...register("password")} />
          </Field>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
          {isStaff && (
            <Button type="button" variant="secondary" className="w-full" onClick={() => router.replace("/login")}>
              {t("account.login.goStaff")}
            </Button>
          )}

          <Button type="submit" loading={isSubmitting} className="h-11 w-full">
            {t("login.submit")}
          </Button>
        </form>
      </Card>

      {USE_MOCK && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">
          {t("login.mockHint")}{" "}
          <span dir="ltr">
            {MOCK_LOGINS.patient} / {MOCK_PASSWORD}
          </span>
        </p>
      )}
    </AuthShell>
  );
}
