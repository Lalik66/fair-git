// Script to delete performance test applications
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteTestData() {
  // Find all performance test vendor users
  const testUsers = await prisma.user.findMany({
    where: {
      email: { contains: 'perf-test-' },
    },
  });

  console.log(`Found ${testUsers.length} performance test users to delete...`);

  // Delete them (cascade will clean up profiles and applications)
  for (const user of testUsers) {
    await prisma.user.delete({
      where: { id: user.id },
    });
  }

  console.log(`Deleted ${testUsers.length} performance test users and their data.`);
  await prisma.$disconnect();
}

deleteTestData().catch(console.error);
