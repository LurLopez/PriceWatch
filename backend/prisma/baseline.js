const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT to_regclass('public.products')::text AS products,
            to_regclass('public._prisma_migrations')::text AS migrations`,
  );
  const { products, migrations } = rows[0] || {};

  // Base creada con `prisma db push` y sin historial de migraciones:
  // se marca la migración base como aplicada para no perder datos.
  if (products && !migrations) {
    console.log('BASELINE_NEEDED');
    return;
  }

  console.log('BASELINE_NOT_NEEDED');
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
