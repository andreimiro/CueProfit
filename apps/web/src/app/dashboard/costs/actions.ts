"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ProductCostsInput = {
  default_margin_rate: number | null;
  default_shipping_cost: number | null;
  default_return_rate: number;
  default_payment_fee_rate: number;
  default_vat_rate: number;
  default_validation_rate: number;
};

export async function saveWorkspaceCosts(
  workspaceId: string,
  input: ProductCostsInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in" };
  }

  const { error } = await supabase
    .from("workspaces")
    .update({
      default_margin_rate: input.default_margin_rate,
      default_shipping_cost: input.default_shipping_cost,
      default_return_rate: input.default_return_rate,
      default_payment_fee_rate: input.default_payment_fee_rate,
      default_vat_rate: input.default_vat_rate,
      default_validation_rate: input.default_validation_rate,
    })
    .eq("id", workspaceId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/costs");
  revalidatePath("/dashboard/settings");

  await fetch(`${process.env.PYTHON_API_URL}/internal/workspaces/${workspaceId}/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.PYTHON_API_INTERNAL_TOKEN}`,
    },
    body: JSON.stringify({ mode: "daily" }),
    cache: "no-store",
  }).catch(() => undefined);

  return { ok: true };
}
