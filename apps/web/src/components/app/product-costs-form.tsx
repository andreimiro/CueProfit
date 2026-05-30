"use client";

import { useState, useTransition } from "react";

import { Panel, PanelHeader } from "@/components/app/cards";
import { PageHeader } from "@/components/app/page-header";
import { saveWorkspaceCosts, type ProductCostsInput } from "@/app/dashboard/costs/actions";

type WorkspaceCosts = {
  default_margin_rate: number | null;
  default_shipping_cost: number | null;
  default_return_rate: number;
  default_payment_fee_rate: number;
  default_vat_rate: number;
  default_validation_rate: number;
  currency: string;
};

function pct(value: number | null | undefined): string {
  if (value == null) return "";
  return String(Number((value * 100).toFixed(2)));
}

function num(value: number | null | undefined): string {
  if (value == null) return "";
  return String(value);
}

export function ProductCostsForm({
  workspaceId,
  initial,
}: {
  workspaceId: string;
  initial: WorkspaceCosts;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setMessage(null);
    const marginPct = formData.get("default_margin_rate");
    const shipping = formData.get("default_shipping_cost");

    const input: ProductCostsInput = {
      default_margin_rate:
        marginPct === "" || marginPct == null ? null : Number(marginPct) / 100,
      default_shipping_cost:
        shipping === "" || shipping == null ? null : Number(shipping),
      default_return_rate: Number(formData.get("default_return_rate")) / 100,
      default_payment_fee_rate: Number(formData.get("default_payment_fee_rate")) / 100,
      default_vat_rate: Number(formData.get("default_vat_rate")) / 100,
      default_validation_rate: Number(formData.get("default_validation_rate")) / 100,
    };

    startTransition(async () => {
      const result = await saveWorkspaceCosts(workspaceId, input);
      setMessage(result.ok ? "Saved. Profit recompute will use these defaults." : result.error);
    });
  }

  return (
    <form action={onSubmit}>
      <Panel>
        <PanelHeader
          title="Default product economics"
          hint="Applied when a SKU has no specific cost row yet"
        />
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <Field
            label="Gross margin"
            name="default_margin_rate"
            suffix="%"
            defaultValue={pct(initial.default_margin_rate)}
            hint="Share of revenue left after COGS, before ads."
          />
          <Field
            label="Shipping cost"
            name="default_shipping_cost"
            suffix={initial.currency}
            defaultValue={num(initial.default_shipping_cost)}
            hint="Average outbound shipping per order."
          />
          <Field
            label="Return rate"
            name="default_return_rate"
            suffix="%"
            defaultValue={pct(initial.default_return_rate)}
            hint="Expected share of orders returned."
          />
          <Field
            label="Payment fee"
            name="default_payment_fee_rate"
            suffix="%"
            defaultValue={pct(initial.default_payment_fee_rate)}
            hint="Card / processor fee as % of revenue."
          />
          <Field
            label="VAT rate"
            name="default_vat_rate"
            suffix="%"
            defaultValue={pct(initial.default_vat_rate)}
            hint="Used when VAT mode is configured on the workspace."
          />
          <Field
            label="Validation rate"
            name="default_validation_rate"
            suffix="%"
            defaultValue={pct(initial.default_validation_rate)}
            hint="Share of orders that complete successfully."
          />
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-edge px-5 py-4">
          <p className="text-sm text-muted">
            Per-SKU overrides can be added later via CSV upload.
          </p>
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-profit px-4 py-2.5 text-sm font-semibold text-on-profit transition hover:bg-profit-strong disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save defaults"}
          </button>
        </div>
        {message ? <p className="px-5 pb-4 text-sm text-profit">{message}</p> : null}
      </Panel>
    </form>
  );
}

function Field({
  label,
  name,
  suffix,
  defaultValue,
  hint,
}: {
  label: string;
  name: string;
  suffix: string;
  defaultValue: string;
  hint: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-fg">{label}</span>
      <div className="relative">
        <input
          name={name}
          type="number"
          step="any"
          min="0"
          defaultValue={defaultValue}
          className="w-full rounded-xl border border-edge bg-panel px-3 py-2.5 pr-14 text-sm text-fg outline-none transition focus:border-profit/40"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-faint">
          {suffix}
        </span>
      </div>
      <span className="block text-xs leading-5 text-muted">{hint}</span>
    </label>
  );
}
