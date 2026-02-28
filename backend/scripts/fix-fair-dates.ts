/**
 * Fix fair dates: Spring Festival 2026 → 01.05.2026, Winter 2026 → 01.12.2026
 * Run: npx ts-node scripts/fix-fair-dates.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const UPDATES: Array<{
  names: string[];
  startDate: Date;
  endDate: Date;
}> = [
  {
    names: ['Spring Festival 2026', 'Spring Festival'],
    startDate: new Date('2026-05-01'),
    endDate: new Date('2026-05-31'),
  },
  {
    names: ['Winter 2026', 'Winter'],
    startDate: new Date('2026-12-01'),
    endDate: new Date('2027-01-05'),
  },
];

async function fixFairDates() {
  console.log('Fixing fair dates...\n');

  const updatedIds = new Set<string>();

  for (const { names, startDate, endDate } of UPDATES) {
    for (const name of names) {
      const fair = await prisma.fair.findFirst({
        where: { name },
      });
      if (fair) {
        const updated = await prisma.fair.update({
          where: { id: fair.id },
          data: { startDate, endDate },
        });
        updatedIds.add(fair.id);
        console.log(
          `✓ ${updated.name}: ${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`
        );
        break;
      }
    }
  }

  // Fallback: update any active/upcoming fair with wrong dates (by name hint)
  const allFairs = await prisma.fair.findMany({
    where: { status: { in: ['active', 'upcoming'] } },
  });
  for (const fair of allFairs) {
    if (updatedIds.has(fair.id)) continue;
    const start = fair.startDate.getTime();
    const may1 = new Date('2026-05-01').getTime();
    const dec1 = new Date('2026-12-01').getTime();
    const isSpring = fair.name.toLowerCase().includes('spring');
    const isWinter = fair.name.toLowerCase().includes('winter');
    if (isSpring && Math.abs(start - may1) > 86400000) {
      await prisma.fair.update({
        where: { id: fair.id },
        data: { startDate: new Date('2026-05-01'), endDate: new Date('2026-05-31') },
      });
      console.log(`✓ ${fair.name}: 2026-05-01 - 2026-05-31`);
    } else if (isWinter && Math.abs(start - dec1) > 86400000) {
      await prisma.fair.update({
        where: { id: fair.id },
        data: { startDate: new Date('2026-12-01'), endDate: new Date('2027-01-05') },
      });
      console.log(`✓ ${fair.name}: 2026-12-01 - 2027-01-05`);
    }
  }

  console.log('\nDone.');
}

fixFairDates()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
