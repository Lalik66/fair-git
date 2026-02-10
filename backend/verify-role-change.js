const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyRoleChange() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'test-visitor-upgrade@test.com' },
      select: { email: true, role: true, firstName: true, lastName: true }
    });
    console.log('User in database:', user);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyRoleChange();
