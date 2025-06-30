const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.formula.upsert({ where: { value: '1' }, update: {}, create: { value: '1' } });
  await prisma.formula.upsert({ where: { value: '2' }, update: {}, create: { value: '2' } });
  await prisma.formula.upsert({ where: { value: '3' }, update: {}, create: { value: '3' } });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 