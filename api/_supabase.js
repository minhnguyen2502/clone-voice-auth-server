import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl) {
  console.error("❌ Missing SUPABASE_URL");
}

if (!supabaseServiceRoleKey) {
  console.error("❌ Missing SUPABASE_SERVICE_ROLE");
}

export const supabase = createClient(
  supabaseUrl || "",
  supabaseServiceRoleKey || "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
