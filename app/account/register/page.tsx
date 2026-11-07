"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserRound, Users } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { setHandoff } from "@/lib/handoff";
import { saveSession, useIsPatient } from "@/lib/auth";
import { errorText, useT } from "@/lib/i18n";
import { registerSchema, type RegisterForm } from "@/lib/validation";
import { AuthShell } from "@/components/account";
import { Button, Card, Field, Input } from "@/components/common";

// The phone number already has an account. Either it's this person's own account (sign in), or it belongs to someone
// in their family: the account owner signs in and adds them as a family member, with their own medical file.
function PhoneTaken({ phone, name }: { phone: string; name: string }) {
  const { t } = useT();
  const router = useRouter();
  const go = (addName?: string) => {
    setHandoff({ phone, addName });
    router.push("/");
  };
  return (
    <div role="alert" className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" data-phone-taken>
      <p className="font-semibold">
        {t("register.taken.title")} <span dir="ltr">{phone}</span>
      </p>
      <div className="space-y-1.5">
        <p>{t("register.taken.mine")}</p>
        <Button type="button" className="w-full" onClick={() => go()}>
          <UserRound className="size-4" aria-hidden />
          {t("register.taken.login")}
        </Button>
      </div>
      <div className="space-y-1.5 border-t border-amber-300 pt-3">
        <p>{t("register.taken.family")}</p>
        <Button type="button" variant="secondary" className="w-full" onClick={() => go(name)}>
          <Users className="size-4" aria-hidden />
          {t("register.taken.addMe")}
        </Button>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useT();
  const isPatient = useIsPatient();
  const [error, setError] = useState("");
  // Filled when the server says this phone number already has an account.
  const [taken, setTaken] = useState<{ phone: string; name: string } | null>(null);

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
    setTaken(null);
    try {
      const res = await api.register(values);
      saveSession({ token: res.access_token, refreshToken: res.refresh_token, user: res.user });
    } catch (err) {
      // 409 = "already exists". Instead of a plain error, show the two ways forward.
      if (err instanceof ApiError && (err.status === 409 || err.code === "phone_taken")) setTaken({ phone: values.phone, name: values.name });
      else setError(errorText(err, t));
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
            <Input maxLength={60} placeholder={t("validation.nameExample")} autoComplete="name" invalid={!!errors.name} {...register("name")} />
          </Field>
          <Field label={t("login.phone")} error={errors.phone?.message}>
            <Input type="tel" inputMode="numeric" dir="ltr" autoComplete="username" placeholder="07XXXXXXXXX" invalid={!!errors.phone} {...register("phone")} />
          </Field>
          <Field label={t("login.password")} error={errors.password?.message}>
            <Input type="password" dir="ltr" autoComplete="new-password" invalid={!!errors.password} {...register("password")} />
          </Field>

          {taken && <PhoneTaken phone={taken.phone} name={taken.name} />}

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
