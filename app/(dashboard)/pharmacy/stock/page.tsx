"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDownToLine, PackagePlus, Pencil, Pill, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { api, type StockItem } from "@/lib/api";
import { SHOW_DEMO_ACCOUNTS } from "@/lib/config";
import { dateTime, fullDate } from "@/lib/display";
import { barcodeKey, parseBarcode, type ScannedCode } from "@/lib/gs1";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { STOCK_UNITS, receiveSchema, stockSchema, type ReceiveForm, type StockForm } from "@/lib/validation";
import { Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, Select } from "@/components/common";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { CardsSkeleton } from "@/components/skeleton";
import { StockAlerts, StockBadges, unitText } from "@/components/stock";

const EMPTY: StockForm = { name: "", unit: "tablet", quantity: 0, low_level: 10, expires_on: "", barcode: "" };

// Adds a new item, or edits one. An empty date box means the item has no expiry date.
// preset fills in what a scanned barcode already told us (its code and expiry).
function StockItemForm({
  item,
  preset,
  onDone,
  onCancel,
}: {
  item?: StockItem;
  preset?: Partial<StockForm>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { t } = useT();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StockForm>({
    resolver: zodResolver(stockSchema),
    defaultValues: item
      ? { name: item.name, unit: item.unit as StockForm["unit"], quantity: item.quantity, low_level: item.low_level, expires_on: item.expires_on ?? "", barcode: item.barcode ?? "" }
      : { ...EMPTY, ...preset },
  });

  async function onSubmit(values: StockForm) {
    const body = { ...values, expires_on: values.expires_on || null, barcode: values.barcode || null };
    try {
      if (item) await api.updateStock(item.id, body);
      else await api.createStock(body);
      toast.success(t("stock.saved"));
      onDone();
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("stock.name")} error={errors.name?.message}>
          <Input dir="ltr" placeholder="Paracetamol 500mg" invalid={!!errors.name} {...register("name")} />
        </Field>
        <Field label={t("stock.unit")}>
          <Select {...register("unit")}>
            {STOCK_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {t(`stock.unitName.${unit}`)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t("stock.quantity")} error={errors.quantity?.message}>
          <Input type="number" min={0} dir="ltr" invalid={!!errors.quantity} {...register("quantity", { valueAsNumber: true })} />
        </Field>
        <Field label={t("stock.lowLevel")} hint={t("stock.lowLevelHint")} error={errors.low_level?.message}>
          <Input type="number" min={0} dir="ltr" invalid={!!errors.low_level} {...register("low_level", { valueAsNumber: true })} />
        </Field>
        <Field label={t("stock.expiresOn")}>
          <Input type="date" dir="ltr" {...register("expires_on")} />
        </Field>
      </div>
      <Field label={t("stock.barcode")} hint={t("stock.barcodeHint")}>
        <Input dir="ltr" className="font-mono" {...register("barcode")} />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" loading={isSubmitting}>
          {t("stock.save")}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}

// A delivery came in: add to the quantity, and set the new expiry date if there is one.
function ReceiveForm({ item, expiry = "", onDone, onCancel }: { item: StockItem; expiry?: string; onDone: () => void; onCancel: () => void }) {
  const { t } = useT();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ReceiveForm>({ resolver: zodResolver(receiveSchema), defaultValues: { quantity: 0, expires_on: expiry } });

  async function onSubmit({ quantity, expires_on }: ReceiveForm) {
    try {
      await api.receiveStock(item.id, { quantity, expires_on: expires_on || null });
      toast.success(t("stock.received"));
      onDone();
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-wrap items-end gap-2">
      <div className="w-32">
        <Field label={t("stock.addQuantity")} error={errors.quantity?.message}>
          <Input type="number" min={1} dir="ltr" invalid={!!errors.quantity} {...register("quantity", { valueAsNumber: true })} />
        </Field>
      </div>
      <div className="w-44">
        <Field label={t("stock.newExpiry")}>
          <Input type="date" dir="ltr" {...register("expires_on")} />
        </Field>
      </div>
      <Button type="submit" loading={isSubmitting}>
        {t("stock.receive")}
      </Button>
      <Button type="button" variant="secondary" onClick={onCancel}>
        {t("common.cancel")}
      </Button>
    </form>
  );
}

function StockRow({ item, onChanged }: { item: StockItem; onChanged: () => void }) {
  const { t } = useT();
  const [mode, setMode] = useState<"view" | "receive" | "edit">("view");
  const done = () => {
    setMode("view");
    onChanged();
  };

  return (
    <li data-stock={item.name} className="space-y-3 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="font-semibold" dir="ltr">
            {item.name}
          </p>
          <p className="text-sm text-slate-500">
            {t("stock.lowAt", { n: item.low_level })}
          </p>
          <StockBadges item={item} />
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-lg font-bold ${item.level === "ok" ? "" : item.level === "low" ? "text-amber-700" : "text-red-700"}`}>
            {unitText(item.quantity, item.unit, t)}
          </span>
          {mode === "view" && (
            <>
              <Button onClick={() => setMode("receive")}>{t("stock.receive")}</Button>
              <Button variant="secondary" onClick={() => setMode("edit")}>
                {t("stock.edit")}
              </Button>
            </>
          )}
        </div>
      </div>
      {mode === "receive" && <ReceiveForm item={item} onDone={done} onCancel={() => setMode("view")} />}
      {mode === "edit" && <StockItemForm item={item} onDone={done} onCancel={() => setMode("view")} />}
    </li>
  );
}

// Sample codes to try the scanner without a real box. Only on a developer's computer.
const DEMO_CODES = [
  { label: "Paracetamol", code: "(01)06290000000011(17)280531(10)LOT42" },
  { label: "Amoxicillin", code: "06290000000028" },
  { label: "?", code: "(01)06290000009999(17)271200(10)B7" },
];

// Scan a box: a known item opens its delivery form with the expiry filled in;
// an unknown code can be linked to an existing item or start a new one.
function ScanPanel({ stock, onChanged, onClose }: { stock: StockItem[]; onChanged: () => void; onClose: () => void }) {
  const { t } = useT();
  const [scanned, setScanned] = useState<ScannedCode | null>(null);
  const [linkTo, setLinkTo] = useState("");
  const [creating, setCreating] = useState(false);
  // Goes up with every scan, so each scan gets fresh forms instead of keeping the last one's values.
  const [scanCount, setScanCount] = useState(0);
  const key = scanned ? barcodeKey(scanned) : null;
  const match = key ? stock.find((s) => s.barcode === key) : undefined;

  function read(code: string) {
    setScanned(parseBarcode(code));
    setScanCount((n) => n + 1);
    setLinkTo("");
    setCreating(false);
  }

  // Saves the scanned code on an item that had none, so next time the scan finds it.
  async function link() {
    const item = stock.find((s) => String(s.id) === linkTo);
    if (!item || !key) return;
    try {
      await api.updateStock(item.id, { name: item.name, unit: item.unit, quantity: item.quantity, low_level: item.low_level, expires_on: item.expires_on, barcode: key });
      toast.success(t("scan.linked"));
      onChanged();
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  const finished = () => {
    setScanned(null);
    onChanged();
  };

  return (
    <Card className="mb-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{t("scan.title")}</h2>
        <Button variant="ghost" onClick={onClose}>
          {t("common.cancel")}
        </Button>
      </div>
      <BarcodeScanner onCode={read} />
      {SHOW_DEMO_ACCOUNTS && (
        <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {t("scan.tryDemo")}
          {DEMO_CODES.map((d) => (
            <button key={d.code} type="button" onClick={() => read(d.code)} className="rounded bg-slate-100 px-2 py-0.5 font-mono">
              {d.label}
            </button>
          ))}
        </p>
      )}

      {scanned && (
        <div key={scanCount} className="space-y-3 rounded-lg border border-slate-200 p-3" data-scan-result>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            <span>
              {t("scan.code")}: <span className="font-mono" dir="ltr">{key}</span>
            </span>
            {scanned.expiry && <span>{t("scan.expiry")}: {fullDate(scanned.expiry)}</span>}
            {scanned.batch && (
              <span>
                {t("scan.batch")}: <span className="font-mono" dir="ltr">{scanned.batch}</span>
              </span>
            )}
          </p>

          {match ? (
            <>
              <p className="font-semibold" dir="ltr">
                {match.name} · {unitText(match.quantity, match.unit, t)}
              </p>
              <ReceiveForm item={match} expiry={scanned.expiry ?? ""} onDone={finished} onCancel={() => setScanned(null)} />
            </>
          ) : creating ? (
            <StockItemForm preset={{ barcode: key ?? "", expires_on: scanned.expiry ?? "" }} onDone={finished} onCancel={() => setCreating(false)} />
          ) : (
            <div className="space-y-3">
              <p className="font-medium text-amber-800">{t("scan.unknown")}</p>
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-56 flex-1">
                  <Field label={t("scan.linkTo")}>
                    <Select value={linkTo} onChange={(e) => setLinkTo(e.target.value)}>
                      <option value="">{t("scan.pickItem")}</option>
                      {stock
                        .filter((s) => !s.barcode)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </Select>
                  </Field>
                </div>
                <Button disabled={!linkTo} onClick={link}>
                  {t("scan.link")}
                </Button>
                <Button variant="secondary" onClick={() => setCreating(true)}>
                  {t("scan.newItem")}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

const MOVE_ICON = { create: PackagePlus, receive: ArrowDownToLine, dispense: Pill, edit: Pencil } as const;

// The latest changes to the stock, newest first: who did what, by how much, and what is left.
function StockLog({ version }: { version: number }) {
  const { t, locale } = useT();
  const [limit, setLimit] = useState(10);
  const { state, reload, refresh } = useLoad(() => api.stockLog(limit), String(limit), { every: 10000, keepPrevious: true });

  // Changes made on this page show in the log straight away.
  useEffect(() => {
    if (version > 0) refresh();
  }, [version, refresh]);

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">{t("stockLog.title")}</h2>
      {state.status === "loading" && <CardsSkeleton count={1} />}
      {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
      {state.status === "success" && state.data.length === 0 && <p className="text-sm text-slate-500">{t("stockLog.empty")}</p>}
      {state.status === "success" && (
        <ol className="space-y-3">
          {state.data.map((move) => {
            const Icon = MOVE_ICON[move.kind];
            return (
              <li key={move.id} data-stock-move={move.kind} className="flex gap-3 text-sm">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <span className="font-medium">
                      {t(`stockLog.kind.${move.kind}`)} · <span dir="ltr">{move.item_name}</span>
                    </span>
                    {move.change !== 0 && (
                      <span dir="ltr" className={`font-semibold ${move.change > 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {move.change > 0 ? "+" : "−"}
                        {Math.abs(move.change)}
                      </span>
                    )}
                  </p>
                  <p className="text-slate-500">
                    {t("stockLog.left", { n: unitText(move.quantity_after, move.unit, t) })}
                    {move.note && ` · ${t("stockLog.for", { name: move.note })}`}
                  </p>
                  <p className="text-xs text-slate-500">
                    {move.by} · {dateTime(move.at, locale)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {state.status === "success" && state.data.length === limit && (
        <Button variant="secondary" className="w-full" onClick={() => setLimit(limit + 20)}>
          {t("stockLog.more")}
        </Button>
      )}
    </Card>
  );
}

export default function StockPage() {
  const { t } = useT();
  const { state, reload, refresh } = useLoad(api.listStock);
  // Goes up after every change made here, so the log on the side updates too.
  const [version, setVersion] = useState(0);
  const changed = useCallback(() => {
    refresh();
    setVersion((v) => v + 1);
  }, [refresh]);
  const [adding, setAdding] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [query, setQuery] = useState("");

  const items = state.status === "success" ? state.data.filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase())) : [];

  return (
    <>
      <PageHeader
        title={t("stock.title")}
        description={t("stock.subtitle")}
        action={
          <div className="flex gap-2">
            {!scanning && (
              <Button onClick={() => setScanning(true)}>
                <ScanLine className="size-4" aria-hidden />
                {t("scan.open")}
              </Button>
            )}
            {!adding && (
              <Button variant="secondary" onClick={() => setAdding(true)}>
                {t("stock.add")}
              </Button>
            )}
          </div>
        }
      />
      {state.status === "success" && <StockAlerts items={state.data} />}
      {scanning && state.status === "success" && <ScanPanel stock={state.data} onChanged={changed} onClose={() => setScanning(false)} />}
      {adding && (
        <Card className="mb-4">
          <h2 className="mb-3 font-semibold">{t("stock.add")}</h2>
          <StockItemForm
            onDone={() => {
              setAdding(false);
              changed();
            }}
            onCancel={() => setAdding(false)}
          />
        </Card>
      )}
      <div className="grid items-start gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {state.status === "loading" && <CardsSkeleton count={2} />}
          {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
          {state.status === "success" && (
            <Card className="space-y-3 p-0">
              <div className="px-4 pt-4">
                <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("stock.search")} aria-label={t("stock.search")} />
              </div>
              {items.length === 0 ? (
                <div className="p-4">
                  <EmptyState title={t("stock.empty")} />
                </div>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {items.map((item) => (
                    <StockRow key={item.id} item={item} onChanged={changed} />
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
        <StockLog version={version} />
      </div>
    </>
  );
}
