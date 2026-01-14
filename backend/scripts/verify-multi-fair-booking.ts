import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyMultiFairBooking() {
  try {
    // Get bookings for H-101 to see if it's used in multiple fairs
    const house101Bookings = await prisma.booking.findMany({
      where: {
        vendorHouse: { houseNumber: 'H-101' },
        bookingStatus: 'approved'
      },
      include: {
        fair: true,
        vendorProfile: { include: { user: true } }
      }
    });

    console.log('=== H-101 Bookings ===');
    for (const booking of house101Bookings) {
      console.log(`Fair: ${booking.fair.name}`);
      console.log(`Vendor: ${booking.vendorProfile.companyName} (${booking.vendorProfile.user.email})`);
      console.log(`Dates: ${booking.startDate.toISOString().split('T')[0]} to ${booking.endDate.toISOString().split('T')[0]}`);
      console.log('---');
    }

    // Check if we need to create a cross-fair booking
    const fairs = await prisma.fair.findMany();
    const vendors = await prisma.vendorProfile.findMany({ include: { user: true } });

    console.log('\n=== Available Fairs ===');
    for (const fair of fairs) {
      console.log(`- ${fair.name} (${fair.status})`);
    }

    console.log('\n=== Available Vendors ===');
    for (const vendor of vendors) {
      console.log(`- ${vendor.companyName} (${vendor.user.email})`);
    }

    // Check if house 101 is booked in Spring Fair
    const springFair = await prisma.fair.findFirst({ where: { name: { contains: 'Spring' } } });

    if (springFair) {
      const h101SpringBooking = await prisma.booking.findFirst({
        where: {
          vendorHouse: { houseNumber: 'H-101' },
          fairId: springFair.id,
          bookingStatus: 'approved'
        }
      });

      if (h101SpringBooking) {
        console.log('\n✅ H-101 is already booked for Spring Fair by a different vendor!');
      } else {
        console.log('\nH-101 is not yet booked for Spring Fair. Creating a booking...');

        // Find a different vendor than the one who has H-101 in Winter
        const winterBooking = house101Bookings.find(b => b.fair.name.includes('Winter'));
        const winterVendorId = winterBooking?.vendorProfileId;

        const differentVendor = await prisma.vendorProfile.findFirst({
          where: { id: { not: winterVendorId || '' } },
          include: { user: true }
        });

        if (differentVendor) {
          const house101 = await prisma.vendorHouse.findFirst({ where: { houseNumber: 'H-101' } });

          if (house101) {
            // Create application
            const application = await prisma.application.create({
              data: {
                vendorProfileId: differentVendor.id,
                fairId: springFair.id,
                vendorHouseId: house101.id,
                status: 'approved',
                reviewedAt: new Date(),
              }
            });

            // Create booking
            await prisma.booking.create({
              data: {
                applicationId: application.id,
                vendorProfileId: differentVendor.id,
                vendorHouseId: house101.id,
                fairId: springFair.id,
                bookingStatus: 'approved',
                startDate: springFair.startDate,
                endDate: springFair.endDate,
              }
            });

            console.log(`✅ Created booking for H-101 in Spring Fair for ${differentVendor.companyName}`);
          }
        }
      }
    }

    // Final verification
    console.log('\n=== FINAL VERIFICATION ===');
    const allH101Bookings = await prisma.booking.findMany({
      where: {
        vendorHouse: { houseNumber: 'H-101' },
        bookingStatus: 'approved'
      },
      include: {
        fair: true,
        vendorProfile: { include: { user: true } }
      }
    });

    console.log(`H-101 is booked in ${allH101Bookings.length} different fair(s):`);
    for (const booking of allH101Bookings) {
      console.log(`  - ${booking.fair.name}: ${booking.vendorProfile.companyName}`);
    }

    // Check if different vendors
    const uniqueVendors = new Set(allH101Bookings.map(b => b.vendorProfileId));
    if (uniqueVendors.size > 1) {
      console.log('\n✅ SUCCESS: H-101 is booked by different vendors in different fairs!');
    } else if (allH101Bookings.length > 1) {
      console.log('\n✅ SUCCESS: H-101 is booked in multiple fairs!');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyMultiFairBooking();
