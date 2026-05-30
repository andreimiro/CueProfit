import { Overview } from "@/components/app/overview";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspaces(name, currency)");
  const workspace = memberships?.[0]?.workspaces as
    | { name?: string; currency?: string }
    | null;
  const currency = workspace?.currency ?? "RON";

  return <Overview currency={currency} />;
}
