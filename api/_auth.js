import jwt from "jsonwebtoken";

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;

// ---------------------------------------------
// SIGN ADMIN TOKEN
// ---------------------------------------------
export function signAdminToken(payload) {
  return jwt.sign(payload, ADMIN_JWT_SECRET, {
    expiresIn: "12h",
  });
}

// ---------------------------------------------
// VERIFY ADMIN TOKEN (CHUẨN CHO VERCEL SERVERLESS)
// ---------------------------------------------
export function verifyAdminToken(token) {
  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
    return decoded;
  } catch (err) {
    console.error("❌ INVALID TOKEN:", err.message);
    return null;
  }
}

// ---------------------------------------------
// MIDDLEWARE VERSION (KHÔNG BAO GIỜ THROW)
// ---------------------------------------------
export function requireAdmin(req, res) {
  const token = req.headers.authorization;

  if (!token) {
    res.status(401).json({ success: false, error: "NO_AUTH_HEADER" });
    return null;
  }

  const decoded = verifyAdminToken(token);
  if (!decoded) {
    res.status(403).json({ success: false, error: "INVALID_ADMIN_TOKEN" });
    return null;
  }

  return decoded;
}
