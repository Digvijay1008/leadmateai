import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const c = await prisma.agentConfiguration.findFirst({
    include: { tenant: true }
  });
  console.log("Agent Config:");
  console.log("TTS Provider:", c.ttsProvider);
  console.log("TTS Voice ID:", c.ttsVoiceId);
  console.log("TTS Model:", c.ttsModel);
  console.log("LLM Provider:", c.llmProvider);
}
run().finally(() => prisma.$disconnect());
