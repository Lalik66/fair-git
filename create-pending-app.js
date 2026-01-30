const path = require('path');
const { PrismaClient } = require(path.join(__dirname, 'backend', 'node_modules', '@prisma', 'client'));
const prisma = new PrismaClient();

async function main() {
  // Get the first vendor profile
  const vendor = await prisma.vendorProfile.findFirst();
  if (!vendor) {
    console.log('No vendor profile found. Cannot create application.');
    return;
  }

  // Get the first active fair
  const fair = await prisma.fair.findFirst({ where: { status: 'active' } });
  if (!fair) {
    console.log('No active fair found. Creating one...');
    // Try any fair
    const anyFair = await prisma.fair.findFirst();
    if (!anyFair) {
      console.log('No fairs at all. Cannot create application.');
      return;
    }
    console.log('Using fair:', anyFair.name, anyFair.id);
  }

  const fairToUse = fair || await prisma.fair.findFirst();

  // Create a pending application for H-101
  const house = await prisma.vendorHouse.findFirst({ where: { houseNumber: 'H-101' } });
  if (!house) {
    console.log('H-101 not found');
    return;
  }

  const app = await prisma.application.create({
    data: {
      vendorProfileId: vendor.id,
      vendorHouseId: house.id,
      fairId: fairToUse.id,
      status: 'pending',
    }
  });

  console.log('Created pending application:', app.id, 'for house H-101');
  console.log('Vendor:', vendor.id);
  console.log('Fair:', fairToUse.id);
}

main().then(() => prisma.$disconnect());
