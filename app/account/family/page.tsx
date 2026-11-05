"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { api, type FamilyMember } from "@/lib/api";
import { age, fullDate } from "@/lib/display";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { familySchema, type FamilyForm } from "@/lib/validation";
import { Button, Card, ErrorState, Field, Input, PageHeader, Select } from "@/components/common";
import { CardsSkeleton } from "@/components/skeleton";

const RELATIONS: FamilyForm["relation"][] = ["child", "parent", "spouse", "sibling", "other"];
const EMPTY: FamilyForm = { name: "", relation: "child", birth_date: "", phone: "" };

// Adds someone to the account, or edits them. Empty boxes are sent as null.
function MemberForm({ member, onDone, onCancel }: { member?: FamilyMember; onDone: () => void; onCancel: () => void }) {
  const { t } = useT();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FamilyForm>({
    resolver: zodResolver(familySchema),
    defaultValues: member
      ? { name: member.name, relation: member.relation as FamilyForm["relation"], birth_date: member.birth_date ?? "", phone: member.phone ?? "" }
      : EMPTY,
  });

  async function onSubmit(values: FamilyForm) {
    const body = { ...values, birth_date: values.birth_date || null, phone: values.phone || null };
    try {
      if (member) await api.updateFamilyMember(member.id, body);
      else await api.addFamilyMember(body);
      toast.success(member ? t("family.saved") : t("family.added"));
      onDone();
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("family.name")} error={errors.name?.message}>
          <Input maxLength={60} placeholder={t("validation.nameExample")} invalid={!!errors.name} {...register("name")} />
        </Field>
        <Field label={t("family.relation")}>
          <Select {...register("relation")}>
            {RELATIONS.map((r) => (
              <option key={r} value={r}>
                {t(`relation.${r}`)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("family.birthDate")} hint={t("family.optional")} error={errors.birth_date?.message}>
          <Input type="date" dir="ltr" invalid={!!errors.birth_date} {...register("birth_date")} />
        </Field>
        <Field label={t("login.phone")} hint={t("family.phoneHint")} error={errors.phone?.message}>
          <Input type="tel" inputMode="numeric" dir="ltr" placeholder="07XXXXXXXXX" invalid={!!errors.phone} {...register("phone")} />
        </Field>
      </div>
      <div className="flex gap-2">
        <Button type="submit" loading={isSubmitting}>
          {member ? t("family.save") : t("family.add")}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}

function MemberCard({ member, onChanged }: { member: FamilyMember; onChanged: () => void }) {
  const { t } = useT();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const isSelf = member.relation === "self";
  const years = member.birth_date ? age(member.birth_date) : null;

  async function remove() {
    try {
      await api.removeFamilyMember(member.id);
      toast.success(t("family.removed", { name: member.name }));
      onChanged();
    } catch (err) {
      toast.error(errorText(err, t));
      setConfirming(false);
    }
  }

  return (
    <Card className="space-y-3" data-family-member={member.name}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{member.name}</p>
          <p className="text-sm text-slate-500">
            {t(`relation.${member.relation}`)}
            {years && ` · ${t(`family.age.${years.unit}`, { n: years.n })}`}
            {member.birth_date && ` · ${fullDate(member.birth_date)}`}
          </p>
          {member.phone && (
            <p className="text-sm text-slate-500" dir="ltr">
              {member.phone}
            </p>
          )}
        </div>
        {isSelf ? (
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">{t("family.owner")}</span>
        ) : (
          !editing &&
          !confirming && (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditing(true)}>
                {t("family.edit")}
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(true)}>
                {t("family.remove")}
              </Button>
            </div>
          )
        )}
      </div>
      {editing && (
        <MemberForm
          member={member}
          onCancel={() => setEditing(false)}
          onDone={() => {
            setEditing(false);
            onChanged();
          }}
        />
      )}
      {confirming && (
        // Asked first, because removing someone also removes them from the "for whom" list when booking.
        <div className="space-y-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          <p>{t("family.confirmRemove", { name: member.name })}</p>
          <div className="flex gap-2">
            <Button variant="danger" onClick={remove}>
              {t("family.yesRemove")}
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function FamilyPage() {
  const { t } = useT();
  const { state, reload, refresh } = useLoad(api.myFamily);
  const [adding, setAdding] = useState(false);

  return (
    <>
      <PageHeader
        title={t("family.title")}
        description={t("family.subtitle")}
        action={!adding && <Button onClick={() => setAdding(true)}>{t("family.add")}</Button>}
      />
      {adding && (
        <Card className="mb-4">
          <h2 className="mb-3 font-semibold">{t("family.add")}</h2>
          <MemberForm
            onCancel={() => setAdding(false)}
            onDone={() => {
              setAdding(false);
              refresh();
            }}
          />
        </Card>
      )}
      {state.status === "loading" && <CardsSkeleton count={2} />}
      {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
      {state.status === "success" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {state.data.map((m) => (
            <MemberCard key={m.id} member={m} onChanged={refresh} />
          ))}
        </div>
      )}
    </>
  );
}
