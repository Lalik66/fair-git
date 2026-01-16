const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const visitorEmail = 'visitor@test.com';

  // Check if visitor exists
  const existing = await prisma.user.findUnique({ where: { email: visitorEmail } });
  if (existing) {
    console.log('Visitor already exists');
    // Ensure password is set
    const hash = await bcrypt.hash('visitor123', 10);
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash: hash, role: 'user' }
    });
    console.log('Password reset to: visitor123');
    return;
  }

  // Create visitor user
  const hash = await bcrypt.hash('visitor123', 10);
  const visitor = await prisma.user.create({
    data: {
      email: visitorEmail,
      firstName: 'Test',
      lastName: 'Visitor',
      role: 'user',
      passwordHash: hash,
      isActive: true,
      preferredLanguage: 'en'
    }
  });

  console.log('Visitor created:', visitor.email);
  console.log('Password: visitor123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
