import { supabase } from "./_supabase.js";
import { requireAdmin } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ success: false, error: "METHOD_NOT_ALLOWED" });
    return;
  }

  const admin = requireAdmin(req, res);
  if (!admin) return;

  const { data, error } = await supabase
    .from("logs")
    .select("*")
    .order("time", { ascending: false })
    .limit(200);

  if (error) {
    res.status(500).json({ success: false, error: error.message });
    return;
  }

  res.json(data || []);
}
