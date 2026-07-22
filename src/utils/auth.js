const jwt = require('jsonwebtoken');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters.');
  }
  return secret;
}

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h', issuer: 'trackswift' }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret(), { issuer: 'trackswift' });
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

module.exports = { publicUser, signAccessToken, verifyAccessToken };
