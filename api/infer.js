import crypto from "crypto";
import { supabase } from "./_supabase.js";

function createSessionToken(apiKey) {
  const secret = process.env.SESSION_TOKEN_SECRET || "DEV_SESSION_SECRET";
  return crypto
    .createHmac("sha256", secret)
    .update(apiKey + Date.now().toString())
    .digest("hex");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "METHOD_NOT_ALLOWED" });
    return;
  }

  const { apiKey, text } = req.body || {};
  if (!apiKey || !text) {
    res.status(400).json({ success: false, error: "MISSING_PARAMS" });
    return;
  }

  const { data: user, error: userErr } = await supabase
    .from("users")
    .select("*")
    .eq("apiKey", apiKey)
    .single();

  if (userErr || !user) {
    res.json({ success: false, error: "INVALID_KEY" });
    return;
  }

  if (user.status !== "active") {
    res.json({ success: false, error: "DISABLED" });
    return;
  }

  if (new Date() > new Date(user.expiration)) {
    res.json({ success: false, error: "EXPIRED" });
    return;
  }

  const cost = text.length;
  if (user.credits < cost) {
    res.json({ success: false, error: "NOT_ENOUGH_CREDIT" });
    return;
  }

  const { error: updErr } = await supabase
    .from("users")
    .update({ credits: user.credits - cost })
    .eq("apiKey", apiKey);

  if (updErr) {
    res.status(500).json({ success: false, error: updErr.message });
    return;
  }

  await supabase.from("logs").insert({
    apiKey,
    textLength: cost,
  });

  const sessionToken = createSessionToken(apiKey);

  res.json({
    success: true,
    sessionToken,
    remainingCredits: user.credits - cost,
  });
}
