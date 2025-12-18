import { supabase } from "./_supabase.js";
import { requireAdmin } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ success: false, error: "METHOD_NOT_ALLOWED" });
    return;
  }

  const admin = requireAdmin(req, res);
  if (!admin) return;

  const { data: usersCountData } = await supabase
    .from("users")
    .select("count", { count: "exact", head: true });
  const totalUsers = usersCountData?.length ?? usersCountData?.count ?? 0;

  const { data: creditsData, error: creditErr } = await supabase
    .from("users")
    .select("credits");

  const totalCredits =
    creditErr || !creditsData
      ? 0
      : creditsData.reduce((sum, row) => sum + (row.credits || 0), 0);

  const { data: disabledData, error: disabledErr } = await supabase
    .from("users")
    .select("count", { count: "exact", head: true })
    .eq("status", "disabled");

  const disabledKeys =
    disabledErr || !disabledData
      ? 0
      : disabledData.count ?? disabledData.length ?? 0;

  const { data: inferData, error: inferErr } = await supabase
    .from("logs")
    .select("id", { count: "exact", head: true })
    .gt("time", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const infer24h =
    inferErr || !inferData
      ? 0
      : inferData.count ?? inferData.length ?? 0;

  res.json({
    totalUsers,
    totalCredits,
    disabledKeys,
    infer24h,
  });
}
