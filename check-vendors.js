const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const vendors = await prisma.user.findMany({
    where: { role: 'vendor' },
    select: { id: true, email: true, firstName: true, lastName: true }
  });
  console.log('Vendor accounts:');
  vendors.forEach(v => console.log(v.email, '-', v.firstName, v.lastName));

  // Also check for available houses in Spring Festival
  const houses = await prisma.vendorHouse.findMany({
    select: { id: true, houseNumber: true, isEnabled: true }
  });
  console.log('\nAll vendor houses:');
  houses.forEach(h => console.log(h.houseNumber, '- enabled:', h.isEnabled));
}

main().then(() => prisma.$disconnect());
