"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { api, type PharmacySale, type SaleLine, type StockItem } from "@/lib/api";
import { sheet } from "@/lib/excel";
import { dateTime, money } from "@/lib/display";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, Select } from "@/components/common";
import { CardsSkeleton } from "@/components/skeleton";
import { unitText } from "@/components/stock";
import { ExportButton } from "@/components/export-button";

type Row = { stockId: string; quantity: string };

const todayText = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// A sale without a prescription: pick items and how many, see the total, confirm.
function CounterSale({ stock, onSold }: { stock: StockItem[]; onSold: () => void }) {
  const { t } = useT();
  const [rows, setRows] = useState<Row[]>([{ stockId: "", quantity: "1" }]);
  const [customer, setCustomer] = useState("");
  const [saving, setSaving] = useState(false);
  // A new key after each sale, so pressing "sell" twice only sells once.
  const [key, setKey] = useState(() => crypto.randomUUID());
  // Only items that can be sold: not empty, not expired.
  const sellable = stock.filter((s) => s.level !== "out" && s.expiry !== "expired");

  const lines = rows.map((r) => {
    const item = stock.find((s) => String(s.id) === r.stockId);
    const quantity = Number(r.quantity);
    return { item, quantity, ok: !!item && Number.isInteger(quantity) && quantity > 0 && quantity <= item.quantity };
  });
  const total = lines.reduce((sum, l) => (l.ok ? sum + l.item!.price * l.quantity : sum), 0);
  const valid = lines.length > 0 && lines.every((l) => l.ok);
  const update = (index: number, change: Partial<Row>) => setRows(rows.map((r, i) => (i === index ? { ...r, ...change } : r)));

  async function sell() {
    setSaving(true);
    try {
      const sale = await api.sellOverCounter({
        customer,
        lines: lines.map((l) => ({ stock_id: l.item!.id, quantity: l.quantity })),
        idempotency_key: key,
      });
      toast.success(t("sales.sold", { amount: money(sale.total) }));
      setRows([{ stockId: "", quantity: "1" }]);
      setCustomer("");
      setKey(crypto.randomUUID());
      onSold();
    } catch (err) {
      toast.error(errorText(err, t));
    }
    setSaving(false);
  }

  return (
    <Card className="space-y-4">
      <h2 className="font-semibold">{t("sales.newSale")}</h2>
      {rows.map((row, index) => {
        const line = lines[index];
        return (
          <div key={index} className="space-y-1" data-sale-row>
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <Field label={t("sales.item")}>
                  <Select value={row.stockId} onChange={(e) => update(index, { stockId: e.target.value })}>
                    <option value="">{t("sales.pickItem")}</option>
                    {sellable.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {money(s.price)} {t("common.currency")}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="w-24">
                <Field label={t("sales.quantity")}>
                  <Input type="number" min={1} dir="ltr" value={row.quantity} onChange={(e) => update(index, { quantity: e.target.value })} />
                </Field>
              </div>
              {rows.length > 1 && (
                <Button type="button" variant="ghost" aria-label={t("sales.removeRow")} onClick={() => setRows(rows.filter((_, i) => i !== index))}>
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              )}
            </div>
            {line.item && line.quantity > line.item.quantity && (
              <p className="text-xs text-red-700">{t("pharmacy.notEnough", { n: unitText(line.item.quantity, line.item.unit, t) })}</p>
            )}
            {line.ok && (
              <p className="text-xs text-slate-600">{t("sales.lineCost", { qty: line.quantity, price: money(line.item!.price), total: money(line.item!.price * line.quantity) })}</p>
            )}
          </div>
        );
      })}
      <Button type="button" variant="secondary" onClick={() => setRows([...rows, { stockId: "", quantity: "1" }])}>
        {t("sales.addRow")}
      </Button>
      <Field label={t("sales.customer")}>
        <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder={t("sales.customerPlaceholder")} />
      </Field>
      <p className="text-lg font-bold" data-sale-total>
        {t("sales.total")}: {money(total)} {t("common.currency")}
      </p>
      <Button className="h-11 w-full" disabled={!valid} loading={saving} onClick={sell}>
        {t("sales.sell")}
      </Button>
    </Card>
  );
}

function SaleRow({ sale }: { sale: PharmacySale }) {
  const { t, locale } = useT();
  return (
    <li className="space-y-1 px-4 py-3 text-sm" data-sale>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">
          {sale.customer || t("sales.walkInCustomer")} · <span className="font-normal text-slate-500">{t(`sales.kind.${sale.kind}`)}</span>
        </span>
        <span className="font-bold">
          {money(sale.total)} {t("common.currency")}
        </span>
      </div>
      <p className="text-slate-600" dir="auto">
        {sale.lines.map((l) => `${l.name} × ${l.quantity}`).join("، ")}
      </p>
      <p className="text-xs text-slate-500">
        {sale.by} · {dateTime(sale.at, locale)}
      </p>
    </li>
  );
}

export default function SalesPage() {
  const { t, locale } = useT();
  const stock = useLoad(api.listStock);
  const sales = useLoad(() => api.listSales(todayText()), "", { every: 10000 });
  const dayTotal = sales.state.status === "success" ? sales.state.data.reduce((sum, s) => sum + s.total, 0) : 0;

  return (
    <>
      <PageHeader title={t("sales.title")} description={t("sales.subtitle")} />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        {stock.state.status === "loading" && <CardsSkeleton count={1} />}
        {stock.state.status === "error" && <ErrorState message={errorText(stock.state.error, t)} onRetry={stock.reload} />}
        {stock.state.status === "success" && (
          <CounterSale
            stock={stock.state.data}
            onSold={() => {
              stock.refresh();
              sales.refresh();
            }}
          />
        )}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">{t("sales.today")}</h2>
            <span className="flex items-center gap-3">
              <span className="font-bold" data-day-total>
                {money(dayTotal)} {t("common.currency")}
              </span>
              {sales.state.status === "success" && (
                <ExportButton
                  fileName={`pharmacy-sales-${todayText()}`}
                  disabled={sales.state.data.length === 0}
                  // One row per sold item, so Excel can add up quantities and money per medicine.
                  sheets={() => [
                    sheet(
                      t("sales.today"),
                      [
                        { header: t("export.date"), value: (r: { sale: PharmacySale; line: SaleLine }) => dateTime(r.sale.at, locale), width: 22 },
                        { header: t("export.kind"), value: (r) => t(`sales.kind.${r.sale.kind}`), width: 14 },
                        { header: t("export.customer"), value: (r) => r.sale.customer || t("sales.walkInCustomer"), width: 20 },
                        { header: t("sales.item"), value: (r) => r.line.name, width: 24 },
                        { header: t("sales.quantity"), value: (r) => r.line.quantity, width: 10 },
                        { header: t("export.unitPrice"), value: (r) => r.line.unit_price, width: 12 },
                        { header: t("export.amount"), value: (r) => r.line.total, width: 12 },
                        { header: t("export.by"), value: (r) => r.sale.by, width: 16 },
                      ],
                      sales.state.status === "success" ? sales.state.data.flatMap((sale) => sale.lines.map((line) => ({ sale, line }))) : [],
                    ),
                  ]}
                />
              )}
            </span>
          </div>
          {sales.state.status === "loading" && <CardsSkeleton count={1} />}
          {sales.state.status === "error" && <ErrorState message={errorText(sales.state.error, t)} onRetry={sales.reload} />}
          {sales.state.status === "success" &&
            (sales.state.data.length === 0 ? (
              <EmptyState title={t("sales.none")} />
            ) : (
              <Card className="p-0">
                <ul className="divide-y divide-slate-200">
                  {sales.state.data.map((s) => (
                    <SaleRow key={s.id} sale={s} />
                  ))}
                </ul>
              </Card>
            ))}
        </div>
      </div>
    </>
  );
}
