const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const { verifyAccessToken } = require('../utils/auth');

async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new HttpError(401, 'Authentication required.');

    const payload = verifyAccessToken(token);
    if (payload.access !== 'ADMIN') throw new HttpError(401, 'Invalid or expired session.');
    const admin = await prisma.admin.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true }
    });
    if (!admin) throw new HttpError(401, 'Invalid or expired session.');
    req.admin = admin;
    next();
  } catch (error) {
    next(error.statusCode ? error : new HttpError(401, 'Invalid or expired session.'));
  }
}

function requireAdmin(req, _res, next) {
  if (!req.admin) return next(new HttpError(403, 'Administrator access required.'));
  next();
}

module.exports = { requireAdmin, requireAuth };
