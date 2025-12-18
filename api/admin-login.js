import crypto from "crypto";
import { supabase } from "./_supabase.js";
import { signAdminToken } from "./_auth.js";

export default async function handler(req, res) {
  try {
    // Wrong method → return JSON, không crash
    if (req.method !== "POST") {
      return res.status(405).json({ success: false, error: "METHOD_NOT_ALLOWED" });
    }

    // Body missing → return JSON
    const { password } = req.body || {};
    if (!password) {
      return res.status(400).json({ success: false, error: "MISSING_PASSWORD" });
    }

    // Query admin row
    const query = await supabase
      .from("admin")
      .select("passwordhash")
      .eq("id", 1)
      .single();

    if (query.error) {
      return res.status(500).json({ success: false, error: query.error.message });
    }

    if (!query.data) {
      return res.status(500).json({ success: false, error: "ADMIN_ROW_MISSING" });
    }

    const storedHash = query.data.passwordhash;

    const hash = crypto.createHash("sha256").update(password).digest("hex");

    if (hash !== storedHash) {
      return res.status(401).json({ success: false, error: "INCORRECT_PASSWORD" });
    }

    const token = signAdminToken({ role: "admin" });

    return res.json({ success: true, token });
  }

  catch (err) {
    console.error("🔥 ADMIN-LOGIN CRASH:", err);
    return res.status(500).json({
      success: false,
      error: "SERVER_CRASH",
      message: err.message,
      stack: err.stack,
    });
  }
}
