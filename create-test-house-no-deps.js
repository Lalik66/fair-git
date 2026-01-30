const path = require('path');
const { PrismaClient } = require(path.join(__dirname, 'backend', 'node_modules', '@prisma', 'client'));
const prisma = new PrismaClient();

async function main() {
  // Create a vendor house with no applications or bookings
  const house = await prisma.vendorHouse.create({
    data: {
      houseNumber: 'DELETE-TEST-' + Date.now(),
      latitude: 40.4093,
      longitude: 49.8671,
      areaSqm: 20,
      price: 300,
      description: 'Test house for deletion - no dependencies',
      isEnabled: true,
    },
  });
  console.log('Created house:', house.id, house.houseNumber);
  console.log('This house has zero applications and zero bookings.');
}

main().then(() => prisma.$disconnect());
