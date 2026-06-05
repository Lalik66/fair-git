// One-shot backfill: turn on isSharingLocation for every existing user so
// the default flip (false -> true) doesn't make pre-existing accounts vanish
// from their followers' maps. Safe to re-run; updateMany is idempotent.
//
// Usage (from backend/):
//   npx ts-node scripts/backfill-sharing-location.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    where: { isSharingLocation: false },
    data: { isSharingLocation: true },
  });
  console.log(`Backfilled ${result.count} user(s) to isSharingLocation=true`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
