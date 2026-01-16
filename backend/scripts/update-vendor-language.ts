// Script to update vendor language preference for testing
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateVendorLanguage(email: string, language: 'az' | 'en') {
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { preferredLanguage: language },
      select: {
        id: true,
        email: true,
        preferredLanguage: true,
        firstName: true,
      },
    });
    console.log(`Updated user ${user.email} language to ${user.preferredLanguage}`);
    console.log(`User ID: ${user.id}`);
    return user;
  } catch (error) {
    console.error('Error updating language:', error);
    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: npx ts-node scripts/update-vendor-language.ts <email> <language>');
  console.log('Example: npx ts-node scripts/update-vendor-language.ts test@test.com en');
  process.exit(1);
}

const [email, language] = args;
if (!['az', 'en'].includes(language)) {
  console.error('Language must be "az" or "en"');
  process.exit(1);
}

updateVendorLanguage(email, language as 'az' | 'en')
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  });
