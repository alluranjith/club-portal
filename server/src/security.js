const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-change-me";
const TOKEN_TTL = "7d";
const RESET_TTL_MS = 30 * 60 * 1000; // 30 minutes

async function hashPassword(plain) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function issueToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name }, JWT_SECRET, {
    expiresIn: TOKEN_TTL,
  });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// 6-digit code for display/manual entry, plus a URL-safe token for a
// clickable reset link. Either path resets the password.
function generateResetCredentials() {
  const code = String(crypto.randomInt(100000, 999999));
  const token = crypto.randomBytes(24).toString("hex");
  return { code, token, expiresAt: Date.now() + RESET_TTL_MS };
}

module.exports = {
  hashPassword,
  verifyPassword,
  issueToken,
  verifyToken,
  generateResetCredentials,
};
