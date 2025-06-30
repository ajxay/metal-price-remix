const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function upsertFormula(value) {
  const existing = await prisma.formula.findFirst({ where: { value } });
  if (existing) {
    await prisma.formula.update({ where: { id: existing.id }, data: { value } });
  } else {
    await prisma.formula.create({ data: { value } });
  }
}

async function main() {
  await upsertFormula('1');
  await upsertFormula('2');
  await upsertFormula('3');
  await prisma.formula.updateMany({ data: { isActive: false } });
  const f1 = await prisma.formula.findFirst({ where: { value: '1' } });
  if (f1) await prisma.formula.update({ where: { id: f1.id }, data: { isActive: true } });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 