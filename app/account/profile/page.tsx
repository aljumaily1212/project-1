"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api";
import { clearSession, useSession } from "@/lib/auth";
import { errorText, useT } from "@/lib/i18n";
import { deleteAccountSchema, type DeleteAccountForm } from "@/lib/validation";
import { Button, Card, Field, Input, PageHeader } from "@/components/common";
import { toast } from "sonner";

export default function ProfilePage() {
  const { t } = useT();
  const { session } = useSession();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DeleteAccountForm>({ resolver: zodResolver(deleteAccountSchema), defaultValues: { password: "", confirm: false } });

  async function onSubmit({ password }: DeleteAccountForm) {
    try {
      await api.deleteMyAccount(password);
      clearSession();
      // A full reload clears any patient data left in the browser's memory.
      window.location.replace("/");
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  return (
    <>
      <PageHeader title={t("profile.title")} />
      <div className="max-w-xl space-y-4">
        <Card className="space-y-1">
          <p className="font-semibold">{session?.user.name}</p>
          <p className="text-sm text-slate-500" dir="ltr">
            {session?.user.phone}
          </p>
        </Card>

        <Card className="space-y-4 border-red-200">
          <div className="space-y-1">
            <h2 className="font-semibold text-red-700">{t("profile.delete")}</h2>
            <p className="text-sm text-slate-600">{t("profile.deleteHint")}</p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <Field label={t("login.password")} error={errors.password?.message}>
              <Input type="password" dir="ltr" autoComplete="current-password" invalid={!!errors.password} {...register("password")} />
            </Field>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5 size-4 accent-red-600" {...register("confirm")} />
              <span>{t("profile.confirm")}</span>
            </label>
            {errors.confirm?.message && <p className="text-xs text-destructive">{t("validation.confirmDelete")}</p>}
            <Button type="submit" variant="danger" loading={isSubmitting}>
              {t("profile.deleteButton")}
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
