const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get vendor houses
  const houses = await prisma.vendorHouse.findMany({ take: 5 });
  console.log('=== VENDOR HOUSES ===');
  houses.forEach(h => console.log(`ID: ${h.id}, Number: ${h.houseNumber}, Enabled: ${h.isEnabled}`));

  // Get fairs
  const fairs = await prisma.fair.findMany({ where: { status: { in: ['active', 'upcoming'] } } });
  console.log('\n=== ACTIVE/UPCOMING FAIRS ===');
  fairs.forEach(f => console.log(`ID: ${f.id}, Name: ${f.name}, Status: ${f.status}`));

  // Get a test vendor
  const vendors = await prisma.user.findMany({
    where: { role: 'vendor' },
    include: { vendorProfile: true },
    take: 3
  });
  console.log('\n=== TEST VENDORS ===');
  vendors.forEach(v => console.log(`ID: ${v.id}, Email: ${v.email}, Profile: ${v.vendorProfile?.id || 'None'}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
