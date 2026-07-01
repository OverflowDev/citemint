-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "demoBalanceMicros" INTEGER NOT NULL DEFAULT 500000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Creator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "walletVerifiedAt" TIMESTAMP(3),
    "walletVerificationMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Creator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletChallenge" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "citationPriceMicros" INTEGER NOT NULL,
    "tags" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentQuestion" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "maxBudgetMicros" INTEGER NOT NULL,
    "answer" TEXT NOT NULL,
    "totalSpentMicros" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CitationPayment" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "amountMicros" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "txHash" TEXT,
    "mockReceiptId" TEXT NOT NULL,
    "selectionReason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CitationPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Creator_walletAddress_key" ON "Creator"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "WalletChallenge_nonce_key" ON "WalletChallenge"("nonce");

-- CreateIndex
CREATE INDEX "WalletChallenge_walletAddress_idx" ON "WalletChallenge"("walletAddress");

-- CreateIndex
CREATE INDEX "WalletChallenge_expiresAt_idx" ON "WalletChallenge"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Source_url_key" ON "Source"("url");

-- CreateIndex
CREATE UNIQUE INDEX "CitationPayment_mockReceiptId_key" ON "CitationPayment"("mockReceiptId");

-- CreateIndex
CREATE INDEX "CitationPayment_questionId_idx" ON "CitationPayment"("questionId");

-- CreateIndex
CREATE INDEX "CitationPayment_creatorId_idx" ON "CitationPayment"("creatorId");

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitationPayment" ADD CONSTRAINT "CitationPayment_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "AgentQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitationPayment" ADD CONSTRAINT "CitationPayment_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitationPayment" ADD CONSTRAINT "CitationPayment_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
