# CiteMint

Onchain pay-per-proof research for the Lepton Agents Hackathon. Users deposit Arc Testnet USDC into the CiteMint escrow contract, sign a one-question spending authorization, and let the research agent settle each selected creator citation onchain. Two escrow versions are included: an operator-trusted v1 and a fully payer-authorized v2 (see [Trustless settlement](#trustless-settlement-v2)).

## Live flow

1. A creator connects an EVM wallet, signs a wallet-ownership challenge, and registers a public source with a citation price.
2. A research user connects a wallet on Arc Testnet.
3. The user approves USDC and deposits a small amount into the CiteMint escrow contract.
4. The user selects a maximum spend and signs a ten-minute authorization bound to the exact question, wallet, budget, escrow, chain and nonce.
5. The server ranks indexed sources and selects up to four within the signed budget and live escrow balance.
6. The operator settles each selected source onchain — `settleCitation` in v1, or `settleWithAuthorization` (which verifies the payer's signed budget voucher on-chain) in v2.
7. The contract sends the creator their net USDC and the configured fee to the platform treasury.
8. PostgreSQL stores the question, answer, payment ID, block number and Arc transaction hash.
9. The UI links every paid citation to its ArcScan receipt.

Private keys are never requested by the browser. Wallet signatures do not approve tokens. Only explicit ERC-20 approval and deposit transactions can move user USDC into escrow.

API routes are rate-limited per IP, expired authorizations/challenges are purged, single-use authorizations are consumed atomically with the question record, and source-URL ingestion is hardened against SSRF (private/metadata ranges, DNS resolution, and per-hop redirect validation).

## Contract

`contracts/CiteMintEscrow.sol` supports:

- user `deposit` and `withdraw`
- operator-only `settleCitation`
- replay protection through unique `paymentId` values
- owner-controlled operator, treasury, fee and pause settings
- a hard platform-fee cap of 10%
- excess-token rescue without touching user liabilities

The deployed contract address is configured with `NEXT_PUBLIC_CITEMINT_ESCROW_ADDRESS`.

## Application architecture

```text
Creator wallet proof -> PostgreSQL source marketplace

User wallet -> USDC approve -> escrow deposit
    -> signed question authorization
    -> source ranking and budget policy
    -> operator settleCitation transactions
    -> creator USDC + treasury fee
    -> PostgreSQL answer and Arc receipts
```

PostgreSQL stores searchable content and application history. Arc stores deposits, withdrawals and payment settlement. The database never replaces onchain settlement.

## Environment

```env
DATABASE_URL="postgresql://...-pooler/..."
DIRECT_URL="postgresql://.../..."

# "mock" | "contract" (operator-trusted v1) | "contract-v2" (payer-signed EIP-712 budget voucher)
PAYMENT_MODE="contract-v2"
# Must mirror PAYMENT_MODE so the browser targets the right escrow deployment.
NEXT_PUBLIC_PAYMENT_MODE="contract-v2"

# Optional fallback payer for mock mode only; ignored in contract / contract-v2 mode.
AGENT_WALLET_ADDRESS="0x..."
ARC_RPC_URL="https://rpc.testnet.arc.network"
ARC_USDC_ADDRESS="0x3600000000000000000000000000000000000000"
NEXT_PUBLIC_ARC_CHAIN_ID="5042002"
NEXT_PUBLIC_ARC_RPC_URL="https://rpc.testnet.arc.network"
NEXT_PUBLIC_ARC_USDC_ADDRESS="0x3600000000000000000000000000000000000000"
NEXT_PUBLIC_ARC_EXPLORER_URL="https://testnet.arcscan.app"
# v1 escrow (operator-trusted). Saved by `contract:deploy`.
NEXT_PUBLIC_CITEMINT_ESCROW_ADDRESS="0x..."
# v2 escrow (payer-signed voucher). Saved by `contract:deploy:v2`. Required when PAYMENT_MODE="contract-v2".
NEXT_PUBLIC_CITEMINT_ESCROW_V2_ADDRESS="0x..."

# Server only. Signs/relays settlement transactions. Use a restricted testnet operator, never NEXT_PUBLIC.
OPERATOR_PRIVATE_KEY="0x..."

# Deployment only; remove from hosted runtime after operator rotation.
DEPLOYER_PRIVATE_KEY="0x..."

OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4.1-mini"
```

`OPENAI_API_KEY` is optional — without it the agent composes the answer from source excerpts instead of calling a model. `AGENT_WALLET_ID` and `CIRCLE_API_KEY` are reserved for a future Circle developer-controlled-wallet adapter and can remain blank.

## Database commands

```powershell
npm.cmd run db:generate
npm.cmd run db:deploy
npm.cmd run db:seed   # clears all demo data and seeds an empty marketplace (register sources from the UI)
```

## Contract commands

```powershell
npm.cmd run contract:compile      # v1 (operator-trusted)
npm.cmd run contract:deploy       # saves NEXT_PUBLIC_CITEMINT_ESCROW_ADDRESS

npm.cmd run contract:compile:v2   # v2 (payer-signed voucher)
npm.cmd run contract:deploy:v2    # saves NEXT_PUBLIC_CITEMINT_ESCROW_V2_ADDRESS
```

Deployment automatically saves the deployed address into `.env`. Deploying uses `DEPLOYER_PRIVATE_KEY`, with optional `CONTRACT_OWNER_ADDRESS`, `PLATFORM_TREASURY_ADDRESS` and `PLATFORM_FEE_BPS` (0–1000).

## Run and verify

```powershell
npm.cmd install
npm.cmd run lint
npm.cmd run test    # vitest: money math, source ranking, SSRF guard, EIP-712 voucher round-trip
npm.cmd run build
npm.cmd run dev
```

Open `http://localhost:3000`, deposit Arc Testnet USDC on `/ask`, sign the question authorization, and verify each receipt on ArcScan. Creators can register public sources on `/register` and track paid citations, usage and dated receipts on `/earnings` by connecting their payout wallet.

## Operator rotation

The deployer is the initial operator. For hosting, create a separate testnet operator wallet, add it from the owner controls on `/dashboard`, set its key as `OPERATOR_PRIVATE_KEY`, verify a settlement, then keep the deployer key offline. Never commit `.env`, seed phrases or private keys.

## Trustless settlement (v2)

`contracts/CiteMintEscrowV2.sol` removes the operator's unilateral power. Instead of a trusted push, every settlement must be covered by the payer's own **EIP-712 budget voucher** — a single signature bound to their wallet, question hash, maximum spend, deadline and nonce. `settleWithAuthorization` verifies that signature on-chain and enforces the cumulative budget, so the operator can only relay settlements the payer actually authorized; it can never exceed the signed budget, touch another question, or act without a valid signature. A leaked operator key cannot drain balances.

Deploy and switch to it alongside v1 (v1 keeps working until you migrate):

```powershell
npm.cmd run contract:deploy:v2   # saves NEXT_PUBLIC_CITEMINT_ESCROW_V2_ADDRESS
```

Then set `PAYMENT_MODE="contract-v2"` and `NEXT_PUBLIC_PAYMENT_MODE="contract-v2"`. Deposits, balances and admin use the same ABI, so the escrow UI is unchanged; only the `/ask` flow signs a typed-data voucher instead of a plaintext message.

## Safety

This build is Arc Testnet only. Test USDC has no real-world value. The v1 `contract` mode gives an approved backend operator power to settle from deposited balances (mitigated off-chain by single-use signed question authorizations). The v2 `contract-v2` mode is the recommended path: it enforces the payer's signed budget voucher in the contract itself, so the operator becomes a bounded relayer. A production release could tighten this further to itemized `(creator, amount)` authorization or use Circle Gateway/x402.
