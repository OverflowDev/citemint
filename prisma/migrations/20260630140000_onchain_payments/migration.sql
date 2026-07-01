-- CreateTable
CREATE TABLE "AgentAuthorization" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "questionHash" TEXT NOT NULL,
    "maxBudgetMicros" INTEGER NOT NULL,
    "nonce" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentAuthorization_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "AgentQuestion"
ADD COLUMN "payerWallet" TEXT,
ADD COLUMN "paymentMode" TEXT NOT NULL DEFAULT 'mock',
ADD COLUMN "network" TEXT,
ADD COLUMN "authorizationId" TEXT;

-- AlterTable
ALTER TABLE "CitationPayment"
ADD COLUMN "paymentId" TEXT,
ADD COLUMN "chainId" INTEGER,
ADD COLUMN "contractAddress" TEXT,
ADD COLUMN "blockNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AgentAuthorization_nonce_key" ON "AgentAuthorization"("nonce");
CREATE INDEX "AgentAuthorization_walletAddress_idx" ON "AgentAuthorization"("walletAddress");
CREATE INDEX "AgentAuthorization_expiresAt_idx" ON "AgentAuthorization"("expiresAt");
CREATE UNIQUE INDEX "AgentQuestion_authorizationId_key" ON "AgentQuestion"("authorizationId");
CREATE INDEX "AgentQuestion_payerWallet_idx" ON "AgentQuestion"("payerWallet");
CREATE UNIQUE INDEX "CitationPayment_paymentId_key" ON "CitationPayment"("paymentId");

-- AddForeignKey
ALTER TABLE "AgentQuestion" ADD CONSTRAINT "AgentQuestion_authorizationId_fkey"
FOREIGN KEY ("authorizationId") REFERENCES "AgentAuthorization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
