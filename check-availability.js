const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check Spring Festival fair
  const springFair = await prisma.fair.findFirst({
    where: { name: { contains: 'Spring' } },
    select: { id: true, name: true }
  });
  console.log('Spring Fair:', springFair);

  if (springFair) {
    // Check applications for Spring Festival
    const applications = await prisma.application.findMany({
      where: { fairId: springFair.id },
      select: { id: true, vendorHouseId: true, status: true }
    });
    console.log('\nSpring Fair applications:');
    applications.forEach(a => console.log('House:', a.vendorHouseId, '- Status:', a.status));

    // Check bookings for Spring Festival
    const bookings = await prisma.booking.findMany({
      where: { fairId: springFair.id },
      select: { id: true, vendorHouseId: true, bookingStatus: true }
    });
    console.log('\nSpring Fair bookings:');
    bookings.forEach(b => console.log('House:', b.vendorHouseId, '- Status:', b.bookingStatus));
  }

  // Check a vendor with a password
  const vendor = await prisma.user.findFirst({
    where: { role: 'vendor', passwordHash: { not: null } },
    select: { email: true, firstName: true, passwordHash: true }
  });
  console.log('\nVendor with password:', vendor?.email, '- has hash:', !!vendor?.passwordHash);
}

main().then(() => prisma.$disconnect());
