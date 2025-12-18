import { supabase } from "./_supabase.js";
import { requireAdmin } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "METHOD_NOT_ALLOWED" });
  }

  const admin = requireAdmin(req, res);
  if (!admin) return;

  const { apiKey } = req.body || {};

  // Load user by correct column
  const { data: user, error: getErr } = await supabase
    .from("users")
    .select("status")
    .eq("apikey", apiKey)       // 🔥 FIX HERE
    .single();

  if (getErr || !user) {
    return res.status(404).json({ success: false, error: "KEY_NOT_FOUND" });
  }

  const newStatus = user.status === "active" ? "disabled" : "active";

  const { error } = await supabase
    .from("users")
    .update({ status: newStatus })
    .eq("apikey", apiKey);    // 🔥 FIX HERE

  if (error) {
    return res.status(500).json({ success: false, error: error.message });
  }

  res.json({ success: true, status: newStatus });
}
