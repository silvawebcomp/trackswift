const { PrismaClient } = require('@prisma/client');

const globalStore = globalThis;
const prisma = globalStore.__trackswiftPrisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalStore.__trackswiftPrisma = prisma;
}

module.exports = prisma;
