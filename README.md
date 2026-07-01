# CiteMint

Onchain pay-per-proof research for the Lepton Agents Hackathon. Users deposit Arc Testnet USDC into `CiteMintEscrow`, sign a one-question spending authorization, and let the research agent settle each selected creator citation onchain.

## Live flow

1. A creator connects an EVM wallet, signs a wallet-ownership challenge, and registers a public source with a citation price.
2. A research user connects a wallet on Arc Testnet.
3. The user approves USDC and deposits a small amount into the CiteMint escrow contract.
4. The user selects a maximum spend and signs a ten-minute authorization bound to the exact question, wallet, budget, escrow, chain and nonce.
5. The server ranks indexed sources and selects up to four within the signed budget and live escrow balance.
6. The authorized operator calls `settleCitation` for each selected source.
7. The contract sends the creator their net USDC and the configured fee to the platform treasury.
8. PostgreSQL stores the question, answer, payment ID, block number and Arc transaction hash.
9. The UI links every paid citation to its ArcScan receipt.

Private keys are never requested by the browser. Wallet signatures do not approve tokens. Only explicit ERC-20 approval and deposit transactions can move user USDC into escrow.

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
PAYMENT_MODE="contract"

AGENT_WALLET_ADDRESS="0x..."
ARC_RPC_URL="https://rpc.testnet.arc.network"
ARC_USDC_ADDRESS="0x3600000000000000000000000000000000000000"
NEXT_PUBLIC_ARC_CHAIN_ID="5042002"
NEXT_PUBLIC_ARC_RPC_URL="https://rpc.testnet.arc.network"
NEXT_PUBLIC_ARC_USDC_ADDRESS="0x3600000000000000000000000000000000000000"
NEXT_PUBLIC_ARC_EXPLORER_URL="https://testnet.arcscan.app"
NEXT_PUBLIC_CITEMINT_ESCROW_ADDRESS="0x..."

# Server only. Use a restricted testnet operator, never NEXT_PUBLIC.
OPERATOR_PRIVATE_KEY="0x..."

# Deployment only; remove from hosted runtime after operator rotation.
DEPLOYER_PRIVATE_KEY="0x..."

OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4.1-mini"
```

`AGENT_WALLET_ID` and `CIRCLE_API_KEY` are reserved for a future Circle developer-controlled-wallet adapter and can remain blank for contract mode.

## Database commands

```powershell
npm.cmd run db:generate
npm.cmd run db:deploy
npm.cmd run db:seed   # new demo database only; this clears demo records
```

## Contract commands

```powershell
npm.cmd run contract:compile
npm.cmd run contract:deploy
```

Deployment automatically saves the deployed address into `.env`.

## Run and verify

```powershell
npm.cmd install
npm.cmd run lint
npm.cmd run build
npm.cmd run dev
```

Open `http://localhost:3000`, deposit Arc Testnet USDC on `/ask`, sign the question authorization, and verify each receipt on ArcScan.

## Operator rotation

The deployer is the initial operator. For hosting, create a separate testnet operator wallet, add it from the owner controls on `/dashboard`, set its key as `OPERATOR_PRIVATE_KEY`, verify a settlement, then keep the deployer key offline. Never commit `.env`, seed phrases or private keys.

## Safety

This build is Arc Testnet only. Test USDC has no real-world value. The current contract gives an approved backend operator power to settle from deposited balances; the application mitigates that with single-use signed question authorizations. A mainnet release should additionally enforce user authorization in the contract itself or use Circle Gateway/x402 authorization.
