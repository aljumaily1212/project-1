"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api";
import { saveSession, useIsPatient } from "@/lib/auth";
import { errorText, useT } from "@/lib/i18n";
import { registerSchema, type RegisterForm } from "@/lib/validation";
import { AuthShell } from "@/components/account";
import { Button, Card, Field, Input } from "@/components/common";

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useT();
  const isPatient = useIsPatient();
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  useEffect(() => {
    if (isPatient) router.replace("/account");
  }, [isPatient, router]);

  async function onSubmit(values: RegisterForm) {
    setError("");
    try {
      const res = await api.register(values);
      saveSession({ token: res.access_token, refreshToken: res.refresh_token, user: res.user });
    } catch (err) {
      setError(errorText(err, t));
    }
  }

  return (
    <AuthShell
      title={t("account.register.title")}
      subtitle={t("account.register.subtitle")}
      footer={
        <>
          {t("account.register.hasAccount")}{" "}
          <Link href="/" className="font-medium text-brand-600 hover:underline">
            {t("account.register.login")}
          </Link>
        </>
      }
    >
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Field label={t("account.register.name")} error={errors.name?.message}>
            <Input autoComplete="name" invalid={!!errors.name} {...register("name")} />
          </Field>
          <Field label={t("login.phone")} error={errors.phone?.message}>
            <Input type="tel" inputMode="numeric" dir="ltr" autoComplete="username" placeholder="07XXXXXXXXX" invalid={!!errors.phone} {...register("phone")} />
          </Field>
          <Field label={t("login.password")} error={errors.password?.message}>
            <Input type="password" dir="ltr" autoComplete="new-password" invalid={!!errors.password} {...register("password")} />
          </Field>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" loading={isSubmitting} className="h-11 w-full">
            {t("account.register.submit")}
          </Button>
        </form>
      </Card>
    </AuthShell>
  );
}
