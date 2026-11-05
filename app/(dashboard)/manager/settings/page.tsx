"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { api, type ClinicSettings } from "@/lib/api";
import { errorText, useT, type MessageKey } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { settingsSchema, type SettingsForm } from "@/lib/validation";
import { Button, Card, ErrorState, Field, Input, PageHeader } from "@/components/common";
import { FormSkeleton } from "@/components/skeleton";

const FIELDS: (keyof ClinicSettings)[] = ["cancel_hours", "no_show_limit", "deposit_amount", "prescription_days", "usd_rate", "welfare_discount_percent"];

function SettingsFormCard({ initial }: { initial: ClinicSettings }) {
  const { t } = useT();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SettingsForm>({ resolver: zodResolver(settingsSchema), defaultValues: initial });

  async function onSubmit(values: SettingsForm) {
    try {
      await api.updateSettings(values);
      toast.success(t("settings.saved"));
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  return (
    <Card className="max-w-xl">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {FIELDS.map((name) => (
          <Field key={name} label={t(`settings.${name}` as MessageKey)} error={errors[name]?.message}>
            <Input type="number" dir="ltr" invalid={!!errors[name]} {...register(name, { valueAsNumber: true })} />
          </Field>
        ))}
        <Button type="submit" loading={isSubmitting} className="w-full">
          {t("settings.save")}
        </Button>
      </form>
    </Card>
  );
}

export default function SettingsPage() {
  const { t } = useT();
  const { state, reload } = useLoad(api.getSettings);

  return (
    <>
      <PageHeader title={t("settings.title")} description={t("settings.subtitle")} />
      {state.status === "loading" && <FormSkeleton fields={6} />}
      {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
      {state.status === "success" && <SettingsFormCard initial={state.data} />}
    </>
  );
}
