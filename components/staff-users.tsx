"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { api, type StaffRole } from "@/lib/api";
import { errorText, useT, type MessageKey } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { staffSchema, type StaffForm } from "@/lib/validation";
import { Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, Select } from "@/components/common";
import { CardsSkeleton } from "@/components/skeleton";

export const ROLE_LABEL: Record<StaffRole, MessageKey> = {
  reception: "nav.reception",
  doctor: "nav.doctor",
  pharmacy: "nav.pharmacy",
  manager: "nav.manager",
};

// Roles that can be created from this page. Manager accounts are made by the company.
const CREATABLE: StaffForm["role"][] = ["reception", "doctor", "pharmacy"];

const EMPTY: StaffForm = {
  name: "",
  phone: "",
  password: "",
  role: "reception",
  name_en: "",
  specialty_ar: "",
  specialty_en: "",
  branch: "main",
  fee: 25000,
};

function CreateStaffCard({ onCreated }: { onCreated: () => void }) {
  const { t } = useT();
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<StaffForm>({ resolver: zodResolver(staffSchema), defaultValues: EMPTY });
  const isDoctor = useWatch({ control, name: "role" }) === "doctor";

  async function onSubmit({ name_en, specialty_ar, specialty_en, branch, fee, ...account }: StaffForm) {
    try {
      await api.createStaff({
        ...account,
        doctor: account.role === "doctor" ? { name_en, specialty_ar, specialty_en, branch, fee } : undefined,
      });
      toast.success(t("users.created"));
      reset(EMPTY);
      onCreated();
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <h2 className="font-semibold">{t("users.create")}</h2>
        <Field label={t("users.role")}>
          <Select {...register("role")}>
            {CREATABLE.map((role) => (
              <option key={role} value={role}>
                {t(ROLE_LABEL[role])}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("users.name")} error={errors.name?.message}>
          <Input invalid={!!errors.name} {...register("name")} />
        </Field>
        <Field label={t("login.phone")} error={errors.phone?.message}>
          <Input type="tel" inputMode="numeric" dir="ltr" placeholder="07XXXXXXXXX" invalid={!!errors.phone} {...register("phone")} />
        </Field>
        <Field label={t("login.password")} error={errors.password?.message}>
          <Input type="password" dir="ltr" autoComplete="new-password" invalid={!!errors.password} {...register("password")} />
        </Field>

        {isDoctor && (
          <fieldset className="space-y-4 rounded-lg border border-slate-200 p-4">
            <legend className="px-1 text-sm font-medium">{t("users.doctorInfo")}</legend>
            <Field label={t("users.nameEn")} error={errors.name_en?.message}>
              <Input dir="ltr" invalid={!!errors.name_en} {...register("name_en")} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("users.specialtyAr")} error={errors.specialty_ar?.message}>
                <Input invalid={!!errors.specialty_ar} {...register("specialty_ar")} />
              </Field>
              <Field label={t("users.specialtyEn")} error={errors.specialty_en?.message}>
                <Input dir="ltr" invalid={!!errors.specialty_en} {...register("specialty_en")} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("users.branch")}>
                <Select {...register("branch")}>
                  <option value="main">{t("users.branchMain")}</option>
                  <option value="second">{t("users.branchSecond")}</option>
                </Select>
              </Field>
              <Field label={t("users.fee")} error={errors.fee?.message}>
                <Input type="number" min={0} step={1000} dir="ltr" invalid={!!errors.fee} {...register("fee", { valueAsNumber: true })} />
              </Field>
            </div>
          </fieldset>
        )}

        <Button type="submit" loading={isSubmitting} className="w-full">
          {t("users.submit")}
        </Button>
      </form>
    </Card>
  );
}

// Used by both /reception/users and /manager/users.
export function StaffUsersPage() {
  const { t } = useT();
  const { state, reload } = useLoad(api.listStaff);

  return (
    <>
      <PageHeader title={t("users.title")} description={t("users.subtitle")} />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <CreateStaffCard onCreated={reload} />
        <Card className="space-y-3">
          <h2 className="font-semibold">{t("users.list")}</h2>
          {state.status === "loading" && <CardsSkeleton count={1} />}
          {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
          {state.status === "success" && state.data.length === 0 && <EmptyState title={t("users.empty")} />}
          {state.status === "success" && (
            <ul className="divide-y divide-slate-200">
              {state.data.map((user) => (
                <li key={user.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-slate-500" dir="ltr">
                      {user.phone}
                    </p>
                  </div>
                  <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                    {t(ROLE_LABEL[user.role])}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
