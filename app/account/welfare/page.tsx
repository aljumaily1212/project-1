"use client";

import { useEffect, useState } from "react";
import { Camera, CheckCircle2, Clock, HandHeart, XCircle } from "lucide-react";
import { toast } from "sonner";
import { api, type FamilyMember, type WelfareRequest } from "@/lib/api";
import { yearDate } from "@/lib/display";
import { errorText, useT } from "@/lib/i18n";
import { shrinkPhoto } from "@/lib/image";
import { useLoad } from "@/lib/useLoad";
import { localToday } from "@/lib/validation";
import { Button, Card, ErrorState, Field, Input, PageHeader } from "@/components/common";
import { CardsSkeleton } from "@/components/skeleton";

// Sending (or sending again) the welfare card for one person: the card number and a photo of the card.
function SendCard({ patientId, onSent }: { patientId: number; onSent: () => void }) {
  const { t } = useT();
  const [cardNumber, setCardNumber] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);

  // The preview link is freed when the form closes, so the browser doesn't keep the photo in memory.
  useEffect(() => () => URL.revokeObjectURL(preview), [preview]);

  function choose(file: File | null) {
    setPhoto(file);
    setPreview(file ? URL.createObjectURL(file) : "");
  }

  async function send() {
    if (!photo) return;
    setSaving(true);
    try {
      await api.submitWelfare(patientId, { card_number: cardNumber, photo: await shrinkPhoto(photo) });
      toast.success(t("welfare.sent"));
      onSent();
    } catch (err) {
      toast.error(errorText(err, t));
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3" data-welfare-form={patientId}>
      <Field label={t("welfare.cardNumber")} hint={t("welfare.cardNumberHint")}>
        <Input dir="ltr" inputMode="numeric" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} />
      </Field>
      <Field label={t("welfare.photo")} hint={t("welfare.photoHint")}>
        {/* capture opens the back camera on a phone; on a computer it's a normal file picker. */}
        <Input type="file" accept="image/*" capture="environment" onChange={(e) => choose(e.target.files?.[0] ?? null)} />
      </Field>
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element -- a local preview, not a page image to optimise
        <img src={preview} alt={t("welfare.photo")} className="max-h-56 rounded-lg border border-slate-200 object-contain" />
      )}
      <Button disabled={!photo || cardNumber.trim().length < 4} loading={saving} onClick={send}>
        <Camera className="size-4" aria-hidden />
        {t("welfare.send")}
      </Button>
    </div>
  );
}

function PersonCard({ person, request, percent, onChanged }: { person: FamilyMember; request: WelfareRequest | undefined; percent: number; onChanged: () => void }) {
  const { t, locale } = useT();
  const [sending, setSending] = useState(false);
  const today = localToday();
  const expired = request?.status === "approved" && !!request.valid_until && request.valid_until < today;
  // A new photo can be sent when there's none yet, after a rejection, or when the approval ran out.
  const canSend = !request || request.status === "rejected" || expired;

  return (
    <Card className="space-y-3" data-welfare-person={person.id}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">
          {person.name} <span className="font-normal text-slate-500">({t(`relation.${person.relation}`)})</span>
        </h2>
        {request?.status === "pending" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            <Clock className="size-3.5" aria-hidden />
            {t("welfare.status.pending")}
          </span>
        )}
        {request?.status === "approved" && !expired && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="size-3.5" aria-hidden />
            {t("welfare.status.approved")}
          </span>
        )}
        {(request?.status === "rejected" || expired) && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
            <XCircle className="size-3.5" aria-hidden />
            {expired ? t("welfare.status.expired") : t("welfare.status.rejected")}
          </span>
        )}
      </div>

      {request?.status === "pending" && <p className="text-sm text-slate-600">{t("welfare.pendingHint")}</p>}
      {request?.status === "approved" && !expired && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {t("welfare.approvedHint", { percent, date: yearDate(request.valid_until!, locale) })}
        </p>
      )}
      {expired && <p className="text-sm text-slate-600">{t("welfare.expiredHint", { date: yearDate(request!.valid_until!, locale) })}</p>}
      {request?.status === "rejected" && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{t("welfare.rejectedHint", { reason: request.reject_reason })}</p>
      )}

      {canSend &&
        (sending ? (
          <SendCard patientId={person.id} onSent={onChanged} />
        ) : (
          <Button variant="secondary" onClick={() => setSending(true)}>
            {request ? t("welfare.sendAgain") : t("welfare.start")}
          </Button>
        ))}
    </Card>
  );
}

// "الرعاية الاجتماعية": families covered by Iraq's social protection network get a discount on the visit fee.
export default function WelfarePage() {
  const { t } = useT();
  const { state, reload, refresh } = useLoad(() => Promise.all([api.myFamily(), api.myWelfare(), api.getSettings()]));

  return (
    <>
      <PageHeader title={t("welfare.title")} description={t("welfare.subtitle")} />
      <div className="max-w-2xl space-y-4">
        {state.status === "success" && state.data[2].welfare_discount_percent > 0 && (
          <Card className="flex gap-3 bg-brand-50">
            <HandHeart className="size-6 shrink-0 text-brand-600" aria-hidden />
            <div className="space-y-1 text-sm">
              <p className="font-semibold">{t("welfare.offer", { percent: state.data[2].welfare_discount_percent })}</p>
              <p className="text-slate-600">{t("welfare.howItWorks")}</p>
              <p className="text-xs text-slate-500">{t("welfare.privacy")}</p>
            </div>
          </Card>
        )}
        {state.status === "success" && state.data[2].welfare_discount_percent === 0 && <Card className="text-sm text-slate-600">{t("welfare.off")}</Card>}
        {state.status === "loading" && <CardsSkeleton count={2} />}
        {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
        {state.status === "success" &&
          state.data[2].welfare_discount_percent > 0 &&
          state.data[0].map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              request={state.data[1].find((w) => w.patient_id === person.id)}
              percent={state.data[2].welfare_discount_percent}
              onChanged={refresh}
            />
          ))}
      </div>
    </>
  );
}
