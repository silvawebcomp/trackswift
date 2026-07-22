const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const { publicUser, signAccessToken } = require('../utils/auth');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function register({ name, email, password }) {
  const cleanName = String(name || '').trim();
  const cleanEmail = normalizeEmail(email);
  if (cleanName.length < 2) throw new HttpError(400, 'Name must contain at least 2 characters.');
  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) throw new HttpError(400, 'Enter a valid email address.');
  if (String(password || '').length < 10) throw new HttpError(400, 'Password must contain at least 10 characters.');

  const existing = await prisma.user.findUnique({ where: { email: cleanEmail }, select: { id: true } });
  if (existing) throw new HttpError(409, 'An account already exists for this email address.');

  const user = await prisma.user.create({
    data: { name: cleanName, email: cleanEmail, passwordHash: await bcrypt.hash(password, 12) }
  });
  return { user: publicUser(user), accessToken: signAccessToken(user) };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (!user || !(await bcrypt.compare(String(password || ''), user.passwordHash))) {
    throw new HttpError(401, 'Invalid email or password.');
  }
  return { user: publicUser(user), accessToken: signAccessToken(user) };
}

module.exports = { login, register };
