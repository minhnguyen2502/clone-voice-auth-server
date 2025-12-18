// ======================================================
// IMPORTS
// ======================================================
const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

// ======================================================
// DATABASE INIT
// ======================================================
const db = new Database("auth.db");

// Tạo bảng user
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    apiKey TEXT PRIMARY KEY,
    credits INTEGER,
    expiration TEXT,
    notes TEXT,
    status TEXT
  )
`).run();

// Bảng log infer
db.prepare(`
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    apiKey TEXT,
    textLength INTEGER,
    time TEXT
  )
`).run();

// Bảng admin config
db.prepare(`
CREATE TABLE IF NOT EXISTS admin (
  id INTEGER PRIMARY KEY,
  passwordHash TEXT
)
`).run();

// Tạo admin mặc định nếu chưa có
const adminRow = db.prepare("SELECT * FROM admin WHERE id=1").get();
if (!adminRow) {
  const hash = crypto.createHash("sha256").update("admin123").digest("hex");
  db.prepare("INSERT INTO admin (id, passwordHash) VALUES (1, ?)").run(hash);
  console.log("⚠️ Đã tạo admin mặc định: admin123");
}

// ======================================================
// UTIL FUNCTIONS
// ======================================================

// Random key đẹp
function generateApiKey() {
  return "KEY-" + crypto.randomBytes(12).toString("hex").toUpperCase();
}

// Tạo session token (HMAC)
function createSessionToken(apiKey) {
  const secret = "SERVER_SECRET_ABC";
  return crypto.createHmac("sha256", secret)
    .update(apiKey + Date.now())
    .digest("hex");
}

// Admin JWT
const ADMIN_JWT_SECRET = "JWT_SECRET_SUPER_SAFE";

// ======================================================
// ADMIN AUTH
// ======================================================

// Login
app.post("/admin/login", (req, res) => {
  const { password } = req.body;

  const row = db.prepare("SELECT passwordHash FROM admin WHERE id=1").get();
  const hash = crypto.createHash("sha256").update(password).digest("hex");

  if (hash !== row.passwordHash) {
    return res.json({ success: false });
  }

  const token = jwt.sign({ role: "admin" }, ADMIN_JWT_SECRET, { expiresIn: "2h" });
  res.json({ success: true, token });
});

// Middleware verify admin
function verifyAdmin(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.json({ success: false, error: "NO_TOKEN" });

  try {
    jwt.verify(token, ADMIN_JWT_SECRET);
    next();
  } catch (err) {
    return res.json({ success: false, error: "INVALID_TOKEN" });
  }
}

// ======================================================
// ADMIN FEATURES
// ======================================================

// Get all keys
app.get("/admin/keys", verifyAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM users").all();
  res.json(rows);
});

// Create key (random)
app.post("/admin/create-key", verifyAdmin, (req, res) => {
  const key = generateApiKey();
  const { credits, expiration, notes } = req.body;

  db.prepare(`
    INSERT INTO users (apiKey, credits, expiration, notes, status)
    VALUES (?, ?, ?, ?, 'active')
  `).run(key, credits, expiration, notes || "");

  res.json({ success: true, apiKey: key });
});

// Disable / Enable key
app.post("/admin/toggle-status", verifyAdmin, (req, res) => {
  const { apiKey } = req.body;

  const row = db.prepare("SELECT status FROM users WHERE apiKey=?").get(apiKey);
  const newStatus = row.status === "active" ? "disabled" : "active";

  db.prepare("UPDATE users SET status=? WHERE apiKey=?").run(newStatus, apiKey);

  res.json({ success: true, status: newStatus });
});

// Update credit
app.post("/admin/update-credit", verifyAdmin, (req, res) => {
  db.prepare("UPDATE users SET credits=? WHERE apiKey=?")
    .run(req.body.amount, req.body.apiKey);
  res.json({ success: true });
});

// Update expiration
app.post("/admin/update-expiration", verifyAdmin, (req, res) => {
  db.prepare("UPDATE users SET expiration=? WHERE apiKey=?")
    .run(req.body.expiration, req.body.apiKey);
  res.json({ success: true });
});

// Delete key
app.post("/admin/delete", verifyAdmin, (req, res) => {
  db.prepare("DELETE FROM users WHERE apiKey=?").run(req.body.apiKey);
  res.json({ success: true });
});

// Export CSV
app.get("/admin/export", verifyAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM users").all();
  let csv = "apiKey,credits,expiration,status,notes\n";

  rows.forEach(r => {
    csv += `${r.apiKey},${r.credits},${r.expiration},${r.status},${r.notes}\n`;
  });

  res.setHeader("Content-Type", "text/csv");
  res.send(csv);
});

// Change admin password
app.post("/admin/change-password", verifyAdmin, (req, res) => {
  const newPass = req.body.newPassword;
  const hash = crypto.createHash("sha256").update(newPass).digest("hex");

  db.prepare("UPDATE admin SET passwordHash=? WHERE id=1").run(hash);

  res.json({ success: true });
});

// Dashboard stats
app.get("/admin/dashboard", verifyAdmin, (req, res) => {
  const totalUsers = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
  const totalCredits = db.prepare("SELECT SUM(credits) AS c FROM users").get().c || 0;
  const disabledKeys = db.prepare("SELECT COUNT(*) AS n FROM users WHERE status='disabled'").get().n;
  const infer24h = db.prepare("SELECT COUNT(*) AS n FROM logs WHERE time > datetime('now', '-1 day')").get().n;

  res.json({
    totalUsers,
    totalCredits,
    disabledKeys,
    infer24h
  });
});

// GET latest 200 logs
app.get("/admin/logs", verifyAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM logs ORDER BY id DESC LIMIT 200
  `).all();
  res.json(rows);
});

// ======================================================
// USER INFER
// ======================================================
app.post("/infer", (req, res) => {
  const { apiKey, text } = req.body;

  const user = db.prepare("SELECT * FROM users WHERE apiKey=?").get(apiKey);
  if (!user) return res.json({ success: false, error: "INVALID_KEY" });
  if (user.status !== "active") return res.json({ success: false, error: "DISABLED" });

  if (new Date() > new Date(user.expiration))
    return res.json({ success: false, error: "EXPIRED" });

  const cost = text.length;
  if (user.credits < cost)
    return res.json({ success: false, error: "NOT_ENOUGH_CREDIT" });

  // Trừ credit
  db.prepare("UPDATE users SET credits=? WHERE apiKey=?")
    .run(user.credits - cost, apiKey);

  // Log
  db.prepare("INSERT INTO logs (apiKey, textLength, time) VALUES (?, ?, datetime('now'))")
    .run(apiKey, cost);

  // Generate session token
  const sessionToken = createSessionToken(apiKey);

  res.json({
    success: true,
    sessionToken,
    remainingCredits: user.credits - cost
  });
});

// ======================================================
app.listen(3000, () => {
  console.log("🔥 FULL AUTH SERVER + SQLITE running on port 3000");
});
