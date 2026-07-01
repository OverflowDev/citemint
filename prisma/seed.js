/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const { existsSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const prisma = new PrismaClient();
const walletFile = resolve("test-wallets.local.json");
const localWallets = existsSync(walletFile) ? JSON.parse(readFileSync(walletFile, "utf8")).wallets : [];
const fallbackWallets = [
  "0x1A2b3C4d5E6f708192A3b4C5d6E7F8091A2b3C4d",
  "0x2B3c4D5e6F708192a3B4c5D6e7F8091A2B3c4D5e",
  "0x3C4d5E6f708192A3b4C5d6E7f8091A2b3C4d5E6f",
  "0x4D5e6F708192a3B4c5D6e7F8091A2B3c4D5e6F70",
  "0x5E6f708192A3b4C5d6E7f8091A2b3C4D5e6F7081"
];
const walletAt = (index) => localWallets[index]?.address || fallbackWallets[index];
void walletAt;

// Start empty — register sources from the UI to exercise the full flow from scratch.
const sources = [];

async function main() {
  await prisma.citationPayment.deleteMany();
  await prisma.agentQuestion.deleteMany();
  await prisma.agentAuthorization.deleteMany();
  await prisma.source.deleteMany();
  await prisma.creator.deleteMany();
  await prisma.walletChallenge.deleteMany();

  await prisma.user.upsert({
    where: { walletAddress: "0xA93F4F1085C2d17A5c2F62A073A19c72d40b9E01" },
    update: { name: "CiteMint Sponsored Agent", demoBalanceMicros: 500000 },
    create: { name: "CiteMint Sponsored Agent", walletAddress: "0xA93F4F1085C2d17A5c2F62A073A19c72d40b9E01", demoBalanceMicros: 500000 }
  });

  for (const item of sources) {
    const creator = await prisma.creator.create({
      data: {
        name: item.creator,
        walletAddress: item.wallet,
        walletVerifiedAt: new Date(),
        walletVerificationMethod: localWallets.length ? "seeded_test_wallet" : "seeded_placeholder"
      }
    });
    await prisma.source.create({
      data: {
        creatorId: creator.id,
        title: item.title,
        url: item.url,
        content: item.content,
        excerpt: item.excerpt,
        citationPriceMicros: item.price,
        tags: item.tags
      }
    });
  }
  console.log(`Cleared demo data. Seeded ${sources.length} sources — register your own from the UI.`);
}

main().finally(() => prisma.$disconnect());
