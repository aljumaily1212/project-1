"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarCheck, Eye, EyeOff, ListOrdered, Pill, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { MOCK_LOGINS, MOCK_PASSWORD, resetMockData } from "@/lib/api/mock";
import { clearSession, homeFor, saveSession, useSession } from "@/lib/auth";
import { USE_MOCK } from "@/lib/config";
import { errorText, useT } from "@/lib/i18n";
import { loginSchema, type LoginForm } from "@/lib/validation";
import { LanguageSwitch } from "@/components/language-switch";
import { LogoMark, Wordmark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, Field, Input } from "@/components/common";
import { Separator } from "@/components/ui/separator";

const FEATURES = [
  { icon: CalendarCheck, title: "login.feature.booking", hint: "login.feature.bookingHint" },
  { icon: ListOrdered, title: "login.feature.queue", hint: "login.feature.queueHint" },
  { icon: Pill, title: "login.feature.pharmacy", hint: "login.feature.pharmacyHint" },
] as const;

const DEMO_ACCOUNTS = [
  { label: "nav.patient", phone: MOCK_LOGINS.patient },
  { label: "nav.reception", phone: MOCK_LOGINS.reception },
  { label: "nav.doctor", phone: MOCK_LOGINS.doctor },
  { label: "nav.pharmacy", phone: MOCK_LOGINS.pharmacy },
  { label: "nav.manager", phone: MOCK_LOGINS.manager },
] as const;

function BrandPanel() {
  const { t } = useT();
  return (
    <section className="login-panel relative hidden flex-col justify-between overflow-hidden p-12 text-[#f8fafc] lg:flex">
      <div className="login-grid absolute inset-0" aria-hidden />

      <div className="relative flex items-center gap-3">
        <LogoMark size={48} />
        <div>
          <p className="text-lg font-bold">{t("app.name")}</p>
          <p className="text-sm opacity-75">{t("login.panel.tagline")}</p>
        </div>
      </div>

      <div className="relative max-w-lg space-y-6">
        <h1 className="text-4xl font-bold leading-tight">{t("login.panel.title")}</h1>
        <p className="opacity-75">{t("login.panel.subtitle")}</p>
        <div className="grid grid-cols-3 gap-3">
          {FEATURES.map(({ icon: Icon, title, hint }) => (
            <div key={title} className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <Icon className="mb-3 size-5 text-[#5eead4]" aria-hidden />
              <p className="font-semibold">{t(title)}</p>
              <p className="text-sm opacity-70">{t(hint)}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="relative flex items-center gap-2 text-sm opacity-70">
        <ShieldCheck className="size-4" aria-hidden />
        {t("login.trust")}
      </p>
    </section>
  );
}

function DemoAccounts({ onPick }: { onPick: (phone: string) => void }) {
  const { t } = useT();

  function reset() {
    resetMockData();
    clearSession();
    window.location.reload();
  }

  return (
    <div className="space-y-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
      <p className="font-medium">{t("login.demo")}</p>
      <div className="grid grid-cols-2 gap-2">
        {DEMO_ACCOUNTS.map(({ label, phone }) => (
          <Button key={phone} type="button" variant="secondary" onClick={() => onPick(phone)}>
            {t(label)}
          </Button>
        ))}
      </div>
      <p dir="auto">{t("login.demoPassword", { p: MOCK_PASSWORD })}</p>
      <button type="button" onClick={reset} className="text-xs underline">
        {t("login.reset")}
      </button>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { t } = useT();
  const { session } = useSession();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  // After login, every role goes to its own page.
  useEffect(() => {
    if (session) router.replace(homeFor(session.user.role));
  }, [session, router]);

  async function onSubmit(values: LoginForm) {
    setError("");
    try {
      const res = await api.login(values);
      saveSession({ token: res.access_token, refreshToken: res.refresh_token, user: res.user });
    } catch (err) {
      setError(errorText(err, t));
    }
  }

  function fillDemo(phone: string) {
    setValue("phone", phone, { shouldValidate: true });
    setValue("password", MOCK_PASSWORD, { shouldValidate: true });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <BrandPanel />

      <main className="flex min-h-screen flex-col px-4 py-6 sm:px-8">
        <div className="flex justify-end gap-2">
          <ThemeToggle />
          <LanguageSwitch />
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 py-10">
          <div className="flex items-center gap-2 text-2xl lg:hidden">
            <LogoMark size={40} />
            <Wordmark />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">{t("login.title")}</h2>
            <p className="text-slate-600">{t("login.subtitle")}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <Field label={t("login.phone")} error={errors.phone?.message}>
              <Input
                type="tel"
                inputMode="numeric"
                dir="ltr"
                autoComplete="username"
                placeholder="07XXXXXXXXX"
                className="h-11"
                invalid={!!errors.phone}
                {...register("phone")}
              />
            </Field>
            <Field label={t("login.password")} error={errors.password?.message}>
              {/* Passwords are typed left to right, so the eye always sits on the right, away from the text. */}
              <div className="relative" dir="ltr">
                <Input
                  type={showPassword ? "text" : "password"}
                  dir="ltr"
                  autoComplete="current-password"
                  className="h-11 pe-11"
                  invalid={!!errors.password}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                  className="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-slate-500 hover:text-slate-800"
                >
                  {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                </button>
              </div>
            </Field>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" loading={isSubmitting} className="h-11 w-full text-base">
              {t("login.submit")}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-600">
            {t("login.noAccount")}{" "}
            <Link href="/account/register" className="font-medium text-brand-600 hover:underline">
              {t("login.register")}
            </Link>
          </p>

          {USE_MOCK && (
            <>
              <Separator />
              <DemoAccounts onPick={fillDemo} />
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-500">{t("login.footer")}</p>
      </main>
    </div>
  );
}
