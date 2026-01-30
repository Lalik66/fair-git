const path = require('path');
const { PrismaClient } = require(path.join(__dirname, 'backend', 'node_modules', '@prisma', 'client'));
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.application.deleteMany({
    where: { id: '3eff4eaf-379c-4a82-8fe3-393676292e7b' }
  });
  console.log('Deleted', result.count, 'applications');
}

main().then(() => prisma.$disconnect());
