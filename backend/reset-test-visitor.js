const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetTestVisitor() {
  try {
    // Delete vendor profile if exists
    await prisma.vendorProfile.deleteMany({
      where: {
        user: {
          email: 'test-visitor-upgrade@test.com'
        }
      }
    });
    console.log('Deleted vendor profile (if any)');

    // Reset user role to 'user'
    const user = await prisma.user.update({
      where: { email: 'test-visitor-upgrade@test.com' },
      data: { role: 'user' },
      select: { email: true, role: true }
    });
    console.log('Reset user:', user);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetTestVisitor();
