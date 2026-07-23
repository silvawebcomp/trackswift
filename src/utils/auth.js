const jwt = require('jsonwebtoken');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters.');
  }
  return secret;
}

function signAccessToken(admin) {
  return jwt.sign(
    { sub: admin.id, email: admin.email, access: 'ADMIN' },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h', issuer: 'trackswift' }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret(), { issuer: 'trackswift' });
}

function publicAdmin(admin) {
  return { id: admin.id, name: admin.name, email: admin.email };
}

module.exports = { publicAdmin, signAccessToken, verifyAccessToken };
