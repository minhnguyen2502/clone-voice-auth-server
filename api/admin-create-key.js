import crypto from "crypto";
import { supabase } from "./_supabase.js";
import { verifyAdminToken } from "./_auth.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ success: false, error: "METHOD_NOT_ALLOWED" });
    }

    // -------------------------------
    // VERIFY ADMIN TOKEN
    // -------------------------------
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ success: false, error: "NO_AUTH_HEADER" });
    }

    const admin = verifyAdminToken(auth);
    if (!admin) {
      return res.status(403).json({ success: false, error: "INVALID_ADMIN_TOKEN" });
    }

    // -------------------------------
    // PARSE INPUT
    // -------------------------------
    const { credits, expiration, notes } = req.body || {};

    // Generate random key
    const apiKey = "KEY-" + crypto.randomBytes(12).toString("hex").toUpperCase();

    // Fix expiration to ISO format (Supabase TEXT accepts any string)
    let expString = expiration ? expiration : null;

    // -------------------------------
    // INSERT TO TABLE `users`
    // -------------------------------
    const { error } = await supabase.from("users").insert({
      apikey: apiKey,                   // 🔥 correct column!
      credits: Number(credits) || 0,
      expiration: expString,            // TEXT column → OK
      notes: notes || "",
      status: "active"
    });

    if (error) {
      console.error("🔥 CREATE-KEY ERROR:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true, apiKey });
  }

  catch (err) {
    console.error("🔥 CREATE-KEY CRASH:", err);
    return res.status(500).json({
      success: false,
      error: "SERVER_CRASH",
      message: err.message
    });
  }
}
