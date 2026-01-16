const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const vendorEmail = 'test-vendor-1768374646143-1@test.com';

  // Get vendor
  const vendor = await prisma.user.findUnique({ where: { email: vendorEmail } });
  if (!vendor) {
    console.log('Vendor not found');
    return;
  }

  console.log('Vendor found:', vendorEmail);
  console.log('Has password:', !!vendor.passwordHash);

  // Set a known password if needed
  if (!vendor.passwordHash) {
    const hash = await bcrypt.hash('vendor123', 10);
    await prisma.user.update({
      where: { id: vendor.id },
      data: { passwordHash: hash }
    });
    console.log('Password set to: vendor123');
  } else {
    // Verify the password
    const valid = await bcrypt.compare('vendor123', vendor.passwordHash);
    console.log('Password "vendor123" valid:', valid);
    if (!valid) {
      const hash = await bcrypt.hash('vendor123', 10);
      await prisma.user.update({
        where: { id: vendor.id },
        data: { passwordHash: hash }
      });
      console.log('Password reset to: vendor123');
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
