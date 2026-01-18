const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const fairs = await prisma.fair.findMany({
    where: { name: { contains: 'DOUBLE_CLICK_TEST_146' } }
  });
  console.log('Fairs with DOUBLE_CLICK_TEST_146:', JSON.stringify(fairs, null, 2));
  console.log('Total count:', fairs.length);
  await prisma.$disconnect();
}

check();
