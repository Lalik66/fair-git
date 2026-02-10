const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestVisitor() {
  const passwordHash = await bcrypt.hash('TestVisitor123!', 10);

  try {
    const user = await prisma.user.upsert({
      where: { email: 'test-visitor-upgrade@test.com' },
      update: { role: 'user', passwordHash, isActive: true },
      create: {
        email: 'test-visitor-upgrade@test.com',
        firstName: 'Test',
        lastName: 'VisitorUpgrade',
        role: 'user',
        passwordHash,
        isActive: true,
      }
    });
    console.log('Created/updated test visitor:', user.email, 'role:', user.role);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestVisitor();
