const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const { publicAdmin, signAccessToken } = require('../utils/auth');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function login({ email, password }) {
  const admin = await prisma.admin.findUnique({ where: { email: normalizeEmail(email) } });
  if (!admin || !(await bcrypt.compare(String(password || ''), admin.passwordHash))) {
    throw new HttpError(401, 'Invalid email or password.');
  }
  return { admin: publicAdmin(admin), accessToken: signAccessToken(admin) };
}

module.exports = { login };
