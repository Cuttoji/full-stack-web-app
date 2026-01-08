import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const testEmails = [
    'admin@example.com',
    'cs@example.com',
    'finance-leader@example.com',
    'finance@example.com',
    'sales-leader@example.com',
    'sales@example.com',
    'headtech@example.com',
    'leader-rental@example.com',
    'leader-install@example.com',
    'leader-printer@example.com',
    'leader-it@example.com',
    'tech1@example.com',
    'tech2@example.com',
    'tech3@example.com',
    'tech4@example.com',
  ];

  console.log('🔎 Removing test users:', testEmails.join(', '));

  const deleteResult = await prisma.user.deleteMany({
    where: { email: { in: testEmails } },
  });

  console.log(`🗑️  Deleted ${deleteResult.count} test users.`);

  const remaining = await prisma.user.findMany({
    where: { email: { in: testEmails } },
    select: { email: true },
  });

  if (remaining.length) {
    console.log('⚠️  Remaining test users:', remaining.map((r) => r.email).join(', '));
  } else {
    console.log('✅ No remaining test users found.');
  }
}

main()
  .catch((e) => {
    console.error('❌ Cleanup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
