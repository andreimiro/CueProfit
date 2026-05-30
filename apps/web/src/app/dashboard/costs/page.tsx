import { ProductCostsForm } from "@/components/app/product-costs-form";
import { PageHeader } from "@/components/app/page-header";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CostsPage() {
  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id, workspaces(currency, default_margin_rate, default_shipping_cost, default_return_rate, default_payment_fee_rate, default_vat_rate, default_validation_rate)");

  const membership = memberships?.[0];
  const workspaceId = membership?.workspace_id as string | undefined;
  const workspace = membership?.workspaces as {
    currency?: string;
    default_margin_rate?: number | null;
    default_shipping_cost?: number | null;
    default_return_rate?: number;
    default_payment_fee_rate?: number;
    default_vat_rate?: number;
    default_validation_rate?: number;
  } | null;

  if (!workspaceId || !workspace) {
    return (
      <div className="px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
        <PageHeader title="Product costs" subtitle="Set default economics for profit calculations" />
        <p className="mt-6 text-sm text-muted">No workspace found.</p>
      </div>
    );
  }

  return (
    <div className="px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
      <div className="mx-auto w-full max-w-[960px] animate-reveal space-y-7">
        <PageHeader
          title="Product costs"
          subtitle="COGS, shipping and fees — used when a SKU has no specific cost row"
        />
        <ProductCostsForm
          workspaceId={workspaceId}
          initial={{
            currency: workspace.currency ?? "RON",
            default_margin_rate: workspace.default_margin_rate ?? null,
            default_shipping_cost: workspace.default_shipping_cost ?? null,
            default_return_rate: workspace.default_return_rate ?? 0,
            default_payment_fee_rate: workspace.default_payment_fee_rate ?? 0,
            default_vat_rate: workspace.default_vat_rate ?? 0,
            default_validation_rate: workspace.default_validation_rate ?? 1,
          }}
        />
      </div>
    </div>
  );
}
