const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyVendorProfile() {
  try {
    const profile = await prisma.vendorProfile.findFirst({
      where: {
        user: {
          email: 'test-visitor-upgrade@test.com'
        }
      },
      include: {
        user: {
          select: { email: true, role: true }
        }
      }
    });
    console.log('Vendor profile:', profile ? 'EXISTS' : 'NOT FOUND');
    if (profile) {
      console.log('Profile ID:', profile.id);
      console.log('User:', profile.user);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyVendorProfile();
