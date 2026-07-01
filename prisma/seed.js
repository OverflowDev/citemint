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

// These are concise demo summaries of real public pages, not copied full articles.
const sources = [
  {
    creator: "Team Circle — Agent Stack",
    wallet: walletAt(0),
    title: "Introducing Circle Agent Stack",
    url: "https://www.circle.com/blog/introducing-circle-agent-stack-financial-infrastructure-for-the-agentic-economy",
    price: 110,
    tags: "AI agents, USDC, agent wallets, programmable payments",
    excerpt: "Circle describes infrastructure for agents to hold funds, discover services, and transact programmatically within human-defined controls.",
    content: "Circle Agent Stack combines agent wallets, a service marketplace, a command-line interface, nanopayments, and implementation skills. The central idea is that autonomous software needs controlled access to programmable money, structured service discovery, and spending policies. Agent wallets can apply limits and allowlists while USDC supports predictable machine-initiated payments."
  },
  {
    creator: "Team Circle — Nanopayments",
    wallet: walletAt(1),
    title: "Circle Nanopayments Launches on Testnet",
    url: "https://www.circle.com/blog/circle-nanopayments-launches-on-testnet-as-the-core-primitive-for-agentic-economic-activity",
    price: 95,
    tags: "nanopayments, Circle Gateway, Arc testnet, microtransactions",
    excerpt: "Circle presents gas-free testnet USDC transfers down to one millionth of a dollar for pay-per-use and machine-to-machine activity.",
    content: "Circle Nanopayments is a testnet payment primitive powered by Gateway. It is designed for gas-free transfers as small as $0.000001, making pay-per-call, pay-per-crawl, and machine-to-machine markets practical. A paying agent signs an authorization rather than sending a separate onchain transaction for every tiny purchase, while the service records settlement and seller revenue."
  },
  {
    creator: "Circle Developer — x402",
    wallet: walletAt(2),
    title: "Turn Your API into a Storefront for Agents",
    url: "https://www.circle.com/blog/turn-your-api-into-a-storefront-for-agents",
    price: 125,
    tags: "x402, paid APIs, Arc, agent commerce",
    excerpt: "A practical seller flow where an API advertises a price, an agent authorizes USDC payment, and access continues automatically.",
    content: "An agent-ready API can return a 402 Payment Required response with machine-readable payment terms. The agent evaluates the offer, signs a USDC payment authorization, retries the request, and receives the resource. On Arc testnet, Gateway can record seller revenue and support later withdrawal to a payout wallet. This makes a niche API behave like an automated storefront."
  },
  {
    creator: "Open Source Guides",
    wallet: walletAt(3),
    title: "Getting Paid for Open Source Work",
    url: "https://opensource.guide/getting-paid/",
    price: 80,
    tags: "open source, maintainers, sustainable funding, creators",
    excerpt: "A practical guide to funding maintainer time, creating revenue streams, and making a credible case for support.",
    content: "Open-source work often begins voluntarily, but maintainers can seek sustainable support through employers, grants, crowdfunding, sponsorships, consulting, and related revenue streams. A strong funding case explains the value created, who benefits, what resources are needed, and how financial support will improve the project. Usage-linked citation payments offer another possible signal of downstream value."
  },
  {
    creator: "Nikhil Chandhok — Circle",
    wallet: walletAt(4),
    title: "Building the Financial Rails for the Agentic Economy",
    url: "https://www.circle.com/blog/building-the-financial-rails-for-the-agentic-economy",
    price: 140,
    tags: "agentic economy, stablecoins, creator services, USDC",
    excerpt: "A view of agents as economic participants that can discover services and make tiny programmable payments across open infrastructure.",
    content: "Agentic systems need financial rails that work at software speed. Programmable stablecoins can let agents pay for data, compute, content, and APIs without a human approving each small action. Open payment protocols and service marketplaces could allow specialized providers to become always-on merchants, while spending policies and predictable settlement keep automated activity controlled."
  }
];

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
  console.log(`Seeded ${sources.length} real public sources with ${localWallets.length ? "local test" : "placeholder"} wallets.`);
}

main().finally(() => prisma.$disconnect());
