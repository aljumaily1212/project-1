"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { errorText, useT } from "@/lib/i18n";
import { changePasswordSchema, type ChangePasswordForm } from "@/lib/validation";
import { Button, Card, Field, Input, PageHeader } from "@/components/common";

const EMPTY: ChangePasswordForm = { current_password: "", new_password: "", confirm: "" };

// Change the password while signed in: the current one, then the new one twice.
export function ChangePasswordCard() {
  const { t } = useT();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordForm>({ resolver: zodResolver(changePasswordSchema), defaultValues: EMPTY });

  async function onSubmit({ current_password, new_password }: ChangePasswordForm) {
    try {
      await api.changePassword({ current_password, new_password });
      toast.success(t("password.changed"));
      reset(EMPTY);
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-semibold">{t("password.change")}</h2>
        <p className="text-sm text-slate-600">{t("password.changeHint")}</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4" data-change-password>
        <Field label={t("password.current")} error={errors.current_password?.message}>
          <Input type="password" dir="ltr" autoComplete="current-password" invalid={!!errors.current_password} {...register("current_password")} />
        </Field>
        <Field label={t("password.new")} error={errors.new_password?.message}>
          <Input type="password" dir="ltr" autoComplete="new-password" invalid={!!errors.new_password} {...register("new_password")} />
        </Field>
        <Field label={t("password.confirm")} error={errors.confirm?.message}>
          <Input type="password" dir="ltr" autoComplete="new-password" invalid={!!errors.confirm} {...register("confirm")} />
        </Field>
        <Button type="submit" loading={isSubmitting}>
          {t("password.save")}
        </Button>
      </form>
    </Card>
  );
}

// The staff version: its own page, reached from the link under the name in the sidebar.
export function ChangePasswordPage() {
  const { t } = useT();
  return (
    <>
      <PageHeader title={t("password.change")} />
      <div className="max-w-xl">
        <ChangePasswordCard />
      </div>
    </>
  );
}
