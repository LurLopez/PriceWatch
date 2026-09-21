import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = [
    {
      id: 'prod-001',
      name: 'ThinkPad Pro X1 Gen 10',
      category: 'Laptops',
      brand: 'Lenovo',
      price: 1250,
      qualityRating: 4.8,
      stock: 8,
      specsScore: 92,
      imageUrl: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400',
      description: 'Portátil profesional con chasis de fibra de carbono.',
    },
    {
      id: 'prod-002',
      name: 'MacBook Air M2',
      category: 'Laptops',
      brand: 'Apple',
      price: 1099,
      qualityRating: 4.9,
      stock: 5,
      specsScore: 90,
      imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400',
      description: 'Diseño ultrafino con chip M2 y alta autonomía.',
    },
    {
      id: 'prod-003',
      name: 'Acer Aspire 3',
      category: 'Laptops',
      brand: 'Acer',
      price: 389,
      qualityRating: 3.9,
      stock: 25,
      specsScore: 64,
      imageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400',
      description: 'Portátil de entrada ideal para oficina y estudio.',
    },
    {
      id: 'prod-004',
      name: 'ASUS ROG Strix G16',
      category: 'Laptops',
      brand: 'ASUS',
      price: 1699,
      qualityRating: 4.7,
      stock: 4,
      specsScore: 96,
      imageUrl: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400',
      description: 'Portátil de alto rendimiento gráfico.',
    },
    {
      id: 'prod-005',
      name: 'HP Pavilion 15',
      category: 'Laptops',
      brand: 'HP',
      price: 649,
      qualityRating: 4.3,
      stock: 14,
      specsScore: 79,
      imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400',
      description: 'Portátil de uso general con buen equilibrio precio-calidad.',
    },
  ];

  for (const prod of products) {
    await prisma.product.upsert({
      where: { id: prod.id },
      update: prod,
      create: prod,
    });
  }

  console.log('Seed completado exitosamente: 5 productos insertados/actualizados.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
