"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { api, type Role, type StaffUser } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { errorText, useT, type MessageKey } from "@/lib/i18n";
import { usePaged } from "@/lib/paging";
import { editStaffSchema, staffSchema, type EditStaffForm, type StaffForm } from "@/lib/validation";
import { Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, Pager, Select } from "@/components/common";
import { CardsSkeleton } from "@/components/skeleton";

export const ROLE_LABEL: Record<Role, MessageKey> = {
  patient: "nav.patient",
  reception: "nav.reception",
  doctor: "nav.doctor",
  pharmacy: "nav.pharmacy",
  manager: "nav.manager",
  lab: "nav.lab",
  accountant: "nav.accountant",
};

// Reception creates staff. The manager can create every kind of account, managers and patients included.
const STAFF_ROLES: StaffForm["role"][] = ["reception", "doctor", "pharmacy", "lab", "accountant"];
const MANAGER_ROLES: StaffForm["role"][] = [...STAFF_ROLES, "manager", "patient"];

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
  const role = useWatch({ control, name: "role" });
  const isDoctor = role === "doctor";
  const { session } = useSession();
  const creatable = session?.user.role === "manager" ? MANAGER_ROLES : STAFF_ROLES;

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
        <h2 className="font-semibold">{session?.user.role === "manager" ? t("users.createAny") : t("users.create")}</h2>
        <Field label={t("users.role")}>
          <Select {...register("role")}>
            {creatable.map((option) => (
              <option key={option} value={option}>
                {t(ROLE_LABEL[option])}
              </option>
            ))}
          </Select>
        </Field>
        {role === "patient" && <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{t("users.patientHint")}</p>}
        <Field label={t("users.name")} error={errors.name?.message}>
          <Input maxLength={60} placeholder={t("validation.nameExample")} invalid={!!errors.name} {...register("name")} />
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

// The manager's edit form, opened under the account's row.
function EditStaff({ user, onDone }: { user: StaffUser; onDone: (saved: boolean) => void }) {
  const { t } = useT();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditStaffForm>({ resolver: zodResolver(editStaffSchema), defaultValues: { name: user.name, phone: user.phone, new_password: "" } });

  async function onSubmit({ name, phone, new_password }: EditStaffForm) {
    try {
      await api.updateStaff(user.id, { name, phone, new_password: new_password || undefined });
      toast.success(t("users.saved"));
      onDone(true);
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3 rounded-lg bg-slate-50 p-3" data-edit-staff={user.id}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("users.name")} error={errors.name?.message}>
          <Input maxLength={60} placeholder={t("validation.nameExample")} invalid={!!errors.name} {...register("name")} />
        </Field>
        <Field label={t("login.phone")} error={errors.phone?.message}>
          <Input type="tel" inputMode="numeric" dir="ltr" invalid={!!errors.phone} {...register("phone")} />
        </Field>
      </div>
      <Field label={t("users.newPassword")} error={errors.new_password?.message}>
        <Input type="password" dir="ltr" autoComplete="new-password" placeholder={t("users.newPasswordHint")} invalid={!!errors.new_password} {...register("new_password")} />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" loading={isSubmitting}>
          {t("users.save")}
        </Button>
        <Button type="button" variant="secondary" onClick={() => onDone(false)}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}

// One account in the list. The manager can edit it, and stop or restart it.
function StaffRow({ user, canManage, isMe, onChanged }: { user: StaffUser; canManage: boolean; isMe: boolean; onChanged: () => void }) {
  const { t } = useT();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    setSaving(true);
    try {
      await api.setStaffActive(user.id, !user.active);
      toast.success(user.active ? t("users.disabled") : t("users.enabled"));
      setConfirming(false);
      onChanged();
    } catch (err) {
      toast.error(errorText(err, t));
    }
    setSaving(false);
  }

  return (
    <li className="space-y-3 py-3 text-sm" data-staff={user.id}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className={user.active ? "" : "opacity-60"}>
          <p className="font-medium">
            {user.name}
            {isMe && <span className="text-slate-500"> ({t("users.me")})</span>}
          </p>
          <p className="text-slate-500" dir="ltr">
            {user.phone}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!user.active && <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">{t("users.stopped")}</span>}
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">{t(ROLE_LABEL[user.role])}</span>
          {canManage && !editing && !confirming && (
            <>
              <Button variant="ghost" onClick={() => setEditing(true)}>
                {t("users.edit")}
              </Button>
              {!isMe && (
                <Button variant="ghost" onClick={() => (user.active ? setConfirming(true) : void toggle())} loading={saving && !user.active}>
                  {user.active ? t("users.disable") : t("users.enable")}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      {editing && (
        <EditStaff
          user={user}
          onDone={(saved) => {
            setEditing(false);
            if (saved) onChanged();
          }}
        />
      )}
      {confirming && (
        // Stopping signs the person out, so it asks once more and says what happens.
        <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-red-800">{t(user.role === "doctor" ? "users.disableDoctorHint" : "users.disableHint", { name: user.name })}</p>
          <div className="flex gap-2">
            <Button variant="danger" loading={saving} onClick={toggle}>
              {t("users.confirmDisable")}
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

// Used by both /reception/users and /manager/users.
export function StaffUsersPage() {
  const { t } = useT();
  const { session } = useSession();
  const isManager = session?.user.role === "manager";
  // Search by name or phone, filter by job, and 20 per page from the server: there will be thousands of patient accounts.
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  // Waits until typing stops for a moment, so every letter doesn't send a request.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);
  const users = usePaged((q) => api.listStaff({ ...q, search, role: roleFilter || undefined }), `${search}|${roleFilter}`);
  const { state, reload, refresh, items } = users;
  const filtering = search !== "" || roleFilter !== "";

  return (
    <>
      <PageHeader title={t("users.title")} description={isManager ? t("users.subtitleManager") : t("users.subtitle")} />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <CreateStaffCard onCreated={refresh} />
        <Card className="space-y-3">
          <h2 className="font-semibold">{isManager ? t("users.listAll") : t("users.list")}</h2>
          {state.status === "loading" && <CardsSkeleton count={1} />}
          {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
          {state.status === "success" && (users.total > 0 || filtering) && (
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-slate-400" aria-hidden />
                <Input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("users.search")}
                  aria-label={t("users.search")}
                  className="ps-9"
                />
              </div>
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as Role | "")}
                aria-label={t("users.filterRole")}
              >
                <option value="">{t("users.allRoles")}</option>
                {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                  <option key={r} value={r}>
                    {t(ROLE_LABEL[r])}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {state.status === "success" && items.length === 0 && <EmptyState title={t(filtering ? "users.noMatch" : "users.empty")} />}
          {state.status === "success" && (
            <ul className="divide-y divide-slate-200">
              {items.map((user) => (
                <StaffRow key={user.id} user={user} canManage={isManager} isMe={user.id === session?.user.id} onChanged={refresh} />
              ))}
            </ul>
          )}
          <Pager page={users.page} pageSize={users.pageSize} total={users.total} loading={users.loadingPage} onPage={users.setPage} />
        </Card>
      </div>
    </>
  );
}
