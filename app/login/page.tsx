"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api";
import { MOCK_LOGINS, MOCK_PASSWORD } from "@/lib/api/mock";
import { canUseDashboard, homeFor, saveSession, useSession } from "@/lib/auth";
import { USE_MOCK } from "@/lib/config";
import { errorText, useT } from "@/lib/i18n";
import { loginSchema, type LoginForm } from "@/lib/validation";
import { AuthShell } from "@/components/account";
import { Button, Card, Field, Input } from "@/components/common";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useT();
  const { session } = useSession();
  const [error, setError] = useState("");
  const [isPatient, setIsPatient] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    if (session && canUseDashboard(session.user.role)) router.replace(homeFor(session.user.role));
  }, [session, router]);

  async function onSubmit(values: LoginForm) {
    setError("");
    setIsPatient(false);
    try {
      const res = await api.login(values);
      if (!canUseDashboard(res.user.role)) {
        setIsPatient(true);
        setError(t("login.staffOnly"));
        return;
      }
      saveSession({ token: res.access_token, refreshToken: res.refresh_token, user: res.user });
    } catch (err) {
      setError(errorText(err, t));
    }
  }

  return (
    <AuthShell title={t("nav.staff")} subtitle={t("app.subtitle")}>
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
          {isPatient && (
            <Button type="button" variant="secondary" className="w-full" onClick={() => router.replace("/account/login")}>
              {t("login.goPatient")}
            </Button>
          )}

          <Button type="submit" loading={isSubmitting} className="w-full">
            {t("login.submit")}
          </Button>
        </form>
      </Card>

      {USE_MOCK && (
        <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">
          <p>{t("login.mockHint")}</p>
          <p dir="ltr">
            {t("nav.reception")} {MOCK_LOGINS.reception} · {t("nav.doctor")} {MOCK_LOGINS.doctor} · {t("nav.pharmacy")} {MOCK_LOGINS.pharmacy}
          </p>
          <p dir="ltr">{MOCK_PASSWORD}</p>
        </div>
      )}
    </AuthShell>
  );
}
