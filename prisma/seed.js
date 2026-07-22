require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient, UserRole } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const name = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password || password.length < 10) {
    throw new Error('ADMIN_NAME, ADMIN_EMAIL, and an ADMIN_PASSWORD of at least 10 characters are required.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, role: UserRole.ADMIN },
    create: { name, email, passwordHash, role: UserRole.ADMIN }
  });

  console.log(`Administrator ready: ${admin.email}`);
}

main()
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
