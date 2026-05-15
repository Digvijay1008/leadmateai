import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:postgres@localhost:5432/leadmate?schema=public"
    }
  }
});

async function main() {
  const configs = await prisma.agentConfiguration.findMany({
    select: {
      id: true,
      tenantId: true,
      ttsProvider: true,
      ttsModel: true,
      ttsVoiceId: true,
      llmProvider: true
    }
  });
  console.dir(configs, {depth: null});
}

main().finally(() => prisma.$disconnect());
