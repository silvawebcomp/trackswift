const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const files = [
  'src/server.js', 'src/lib/prisma.js', 'src/middleware/auth.js',
  'src/middleware/errorHandler.js', 'src/routes/authRoutes.js',
  'src/routes/shipmentRoutes.js', 'src/routes/adminRoutes.js',
  'src/services/authService.js', 'src/services/shipmentService.js',
  'src/utils/auth.js', 'src/utils/asyncHandler.js', 'src/utils/httpError.js',
  'prisma/seed.js', 'public/app.js'
];

for (const file of files) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  new Function('require', 'module', 'exports', '__dirname', '__filename', source);
}

const schema = fs.readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8');
for (const requiredModel of ['model Admin', 'model Shipment', 'model ProgressEvent']) {
  if (!schema.includes(requiredModel)) throw new Error(`Missing ${requiredModel}`);
}

console.log(`Source check passed for ${files.length} JavaScript modules and the Prisma schema.`);
