"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { api, type Service } from "@/lib/api";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { serviceSchema, type ServiceForm } from "@/lib/validation";
import { Button, Card, ErrorState, Field, Input, PageHeader, Select } from "@/components/common";
import { CardsSkeleton } from "@/components/skeleton";

const EMPTY: ServiceForm = { name: "", name_ar: "", kind: "test", price: 0, currency: "IQD" };

// One form used both to edit a service and to add a new one.
function ServiceCard({ service, onSaved }: { service?: Service; onSaved: () => void }) {
  const { t } = useT();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ServiceForm>({ resolver: zodResolver(serviceSchema), defaultValues: service ?? EMPTY });

  async function onSubmit(values: ServiceForm) {
    try {
      if (service) await api.updateService(service.id, values);
      else await api.createService(values);
      toast.success(t("prices.saved"));
      if (!service) {
        reset(EMPTY);
        onSaved();
      }
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
        {!service && <h2 className="font-semibold">{t("prices.add")}</h2>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("prices.nameAr")} error={errors.name_ar?.message}>
            <Input invalid={!!errors.name_ar} {...register("name_ar")} />
          </Field>
          <Field label={t("prices.nameEn")} error={errors.name?.message}>
            <Input dir="ltr" invalid={!!errors.name} {...register("name")} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t("prices.kind")}>
            <Select {...register("kind")}>
              <option value="test">{t("prices.kind.test")}</option>
              <option value="xray">{t("prices.kind.xray")}</option>
              <option value="procedure">{t("prices.kind.procedure")}</option>
            </Select>
          </Field>
          <Field label={t("prices.price")} error={errors.price?.message}>
            <Input type="number" dir="ltr" invalid={!!errors.price} {...register("price", { valueAsNumber: true })} />
          </Field>
          <Field label={t("prices.currency")}>
            <Select {...register("currency")}>
              <option value="IQD">{t("common.currency")}</option>
              <option value="USD">{t("common.usd")}</option>
            </Select>
          </Field>
        </div>
        <Button type="submit" loading={isSubmitting}>
          {service ? t("prices.save") : t("prices.create")}
        </Button>
      </form>
    </Card>
  );
}

export default function PricesPage() {
  const { t } = useT();
  const { state, reload } = useLoad(api.listServices);

  return (
    <>
      <PageHeader title={t("prices.title")} description={t("prices.subtitle")} />
      {state.status === "loading" && <CardsSkeleton count={3} />}
      {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
      {state.status === "success" && (
        <div className="grid items-start gap-3 lg:grid-cols-2">
          {state.data.map((service) => (
            <ServiceCard key={service.id} service={service} onSaved={reload} />
          ))}
          <ServiceCard onSaved={reload} />
        </div>
      )}
    </>
  );
}
