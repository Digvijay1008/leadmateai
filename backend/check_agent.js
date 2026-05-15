const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const configs = await prisma.agentConfiguration.findMany({
    select: {
      tenantId: true,
      ttsProvider: true,
      ttsModel: true,
      llmProvider: true
    }
  });
  console.log("Database configs:", configs);
}

run().finally(() => prisma.$disconnect());
