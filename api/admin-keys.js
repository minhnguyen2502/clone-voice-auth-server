import { supabase } from "./_supabase.js";
import { requireAdmin } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "METHOD_NOT_ALLOWED" });
  }

  const admin = requireAdmin(req, res);
  if (!admin) return;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("apikey", { ascending: true });

  if (error) {
    console.error("🔥 admin-keys ERROR:", error);
    return res.status(500).json({ success: false, error: error.message });
  }

  // CHUYỂN TÊN CỘT CHO ĐÚNG CLIENT
  const mapped = data.map(u => ({
    apiKey: u.apikey,        // 🔥 fix here
    credits: u.credits,
    expiration: u.expiration,
    notes: u.notes,
    status: u.status,
  }));

  res.json(mapped);
}
