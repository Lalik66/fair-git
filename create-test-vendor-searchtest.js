// Create a test vendor for Feature 151 testing
// Run from the backend directory

const path = require('path');
const backendPath = path.join(__dirname, 'backend');

// Add backend's node_modules to require path
module.paths.unshift(path.join(backendPath, 'node_modules'));

const bcrypt = require('bcryptjs');

async function main() {
  // Use dynamic import for Prisma client
  const { PrismaClient } = await import('./backend/node_modules/@prisma/client/index.js');
  const prisma = new PrismaClient();

  try {
    const email = 'searchtest-vendor@test.com';
    const password = 'TestPass123!';

    // Check if user exists
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Create the user with hashed password
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          firstName: 'SearchTest',
          lastName: 'Vendor',
          role: 'vendor',
          isActive: true,
        },
      });
      console.log('Created user:', user.id);
    } else {
      console.log('User already exists:', user.id);
    }

    // Check if vendor profile exists
    let vendorProfile = await prisma.vendorProfile.findUnique({
      where: { userId: user.id }
    });

    if (!vendorProfile) {
      vendorProfile = await prisma.vendorProfile.create({
        data: {
          userId: user.id,
          companyName: 'SEARCHTEST123',
          businessDescription: 'Test company for search test - unique identifier SEARCHTEST123',
          productCategory: 'handicrafts',
        },
      });
      console.log('Created vendor profile:', vendorProfile.id);
    } else {
      // Update company name to SEARCHTEST123
      vendorProfile = await prisma.vendorProfile.update({
        where: { userId: user.id },
        data: { companyName: 'SEARCHTEST123' }
      });
      console.log('Updated vendor profile:', vendorProfile.id);
    }

    console.log('');
    console.log('Login credentials:');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Company Name: SEARCHTEST123');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
