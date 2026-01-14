import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function setVendorPassword() {
  const vendorEmail = process.argv[2] || 'test-vendor-1768374646124-0@test.com';
  const password = process.argv[3] || 'vendor123';

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { email: vendorEmail },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    console.log(`Password set for vendor: ${user.email}`);
    console.log(`Email: ${vendorEmail}`);
    console.log(`Password: ${password}`);
  } catch (error) {
    console.error('Error setting password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setVendorPassword();
