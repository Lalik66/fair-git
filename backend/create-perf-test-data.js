// Script to create 100 test applications for performance testing
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestData() {
  const numToCreate = 100;

  // Get fairs
  let fairs = await prisma.fair.findMany({
    where: { status: { in: ['active', 'upcoming'] } },
    take: 2,
  });

  if (fairs.length === 0) {
    console.log('No fairs found, please create fairs first');
    await prisma.$disconnect();
    return;
  }

  // Get houses
  const houses = await prisma.vendorHouse.findMany({
    where: { houseNumber: { startsWith: 'H-' } },
  });

  if (houses.length === 0) {
    console.log('No houses found, please create houses first');
    await prisma.$disconnect();
    return;
  }

  // Get admin user for review
  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });

  const categories = ['handicrafts', 'food_beverages', 'clothing', 'accessories', 'other'];
  const statuses = ['pending', 'approved', 'rejected'];
  const prefixes = ['Premium', 'Quality', 'Best', 'Super', 'Elite', 'Top', 'First', 'Master', 'Pro', 'Expert'];
  const suffixes = ['Crafts', 'Foods', 'Fashion', 'Goods', 'Products', 'Trading', 'Shop', 'Store', 'Market', 'Hub'];

  let createdCount = 0;
  for (let i = 0; i < numToCreate; i++) {
    const email = `perf-test-${Date.now()}-${i}@test.com`;
    const status = statuses[i % statuses.length];

    const user = await prisma.user.create({
      data: { email, firstName: prefixes[i % prefixes.length], lastName: 'Vendor', role: 'vendor', isActive: true }
    });

    const profile = await prisma.vendorProfile.create({
      data: {
        userId: user.id,
        companyName: `${prefixes[i % prefixes.length]} ${suffixes[i % suffixes.length]} ${i}`,
        businessDescription: 'Test business description for performance testing. This is a quality provider.',
        productCategory: categories[i % categories.length]
      }
    });

    await prisma.application.create({
      data: {
        vendorProfileId: profile.id,
        fairId: fairs[i % fairs.length].id,
        vendorHouseId: houses[i % houses.length].id,
        status: status,
        submittedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        reviewedAt: status !== 'pending' ? new Date() : null,
        reviewedById: status !== 'pending' ? admin?.id : null
      }
    });

    createdCount++;
    if (createdCount % 20 === 0) {
      console.log(`Created ${createdCount}/${numToCreate} applications...`);
    }
  }

  console.log(`Done! Created ${createdCount} test applications.`);
  await prisma.$disconnect();
}

createTestData().catch(console.error);
