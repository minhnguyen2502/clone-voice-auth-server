import { supabase } from "./_supabase.js";
import { requireAdmin } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "METHOD_NOT_ALLOWED" });
  }

  const admin = requireAdmin(req, res);
  if (!admin) return;

  const { apiKey, expiration } = req.body || {};

  const { error } = await supabase
    .from("users")
    .update({ expiration })
    .eq("apikey", apiKey);     // 🔥 FIX HERE

  if (error) {
    return res.status(500).json({ success: false, error: error.message });
  }

  res.json({ success: true });
}
