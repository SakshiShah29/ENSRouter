# ENSRouter — ENS Profiles as Cross-Chain Liquidity Preferences

## The One-Liner

**Your ENS name becomes your DeFi autopilot.** Anyone pays `you.eth` → USDC lands on Arc → bridges to your preferred chain via Circle Gateway → Across Protocol fills your token split via intents — all configured via ENS text records you control.

---

## The Problem

Today, receiving crypto payments is broken in three ways:

1. **Chain fragmentation** — "Send me USDC" immediately raises the question: on which chain? Senders have to ask, recipients have to check balances, and mistakes are costly.
2. **Post-receipt manual labor** — After receiving USDC, users manually bridge to their preferred chain and manually swap into their desired token mix. Every time.
3. **No portable preferences** — Your DeFi preferences (chain, slippage, token allocations) live nowhere. They're in your head. Every app makes you reconfigure from scratch.
4. **Gas on destination chains** — Even if bridging is solved, swapping tokens on the destination chain requires gas tokens the sender doesn't have.

## The Solution

ENSRouter turns your ENS name into a **self-describing payment endpoint**. You set your liquidity preferences once in ENS text records, and any payment to your ENS name automatically:

1. Lands as USDC on **Arc** (the liquidity hub)
2. Bridges via **Circle Gateway/CCTP** to your preferred destination chain (instant, <500ms)
3. Swaps into your preferred token allocation via **Across Protocol intents** on the destination chain — **solvers bear the gas cost**, not the sender or recipient

The sender just needs your ENS name. Everything else is handled.

---

## How It Works — User Flows

### Flow 1: Recipient Sets Up Their Profile (One-Time)

```
1. Connect wallet to ENSRouter dashboard
2. Link your ENS name (e.g., alice.eth)
3. Configure preferences via a clean UI:
   - Destination chain: Base
   - Token allocation: 50% USDC, 30% ETH, 20% USDT
   - Slippage tolerance: 0.5%
   - Auto-swap: enabled
4. Dashboard writes these as ENS text records:
   - ENSRouter.chain     → "base"
   - ENSRouter.alloc     → "USDC:50,ETH:30,USDT:20"
   - ENSRouter.slippage  → "0.5"
   - ENSRouter.autoswap  → "true"
5. Done. Your ENS name is now a smart payment endpoint.
```

### Flow 2: Sender Pays via ENSRouter

```
1. Go to ENSRouter "Send" page
2. Type recipient ENS name: alice.eth
3. ENSRouter resolves:
   - alice.eth address (from ENS)
   - alice's preferences (from ENS text records)
4. UI shows: "Alice prefers to receive on Base as 50% USDC / 30% ETH / 20% USDT"
5. Sender approves USDC transfer on Arc
6. Backend orchestrates:
   a. USDC deposited into Circle Gateway on Arc
   b. Gateway bridges USDC to Base via CCTP (instant, <500ms)
   c. USDC arrives on Base
   d. For non-USDC portions, Across Swap API creates intents on Base:
      - Intent 1: "Swap 150 USDC → ETH for alice.eth"
      - Intent 2: "Swap 100 USDC → USDT for alice.eth"
   e. Across solvers/relayers fill the intents (they bear the gas cost)
   f. Remaining 250 USDC transferred directly to alice.eth on Base
7. Sender sees: "✅ Delivered to alice.eth on Base"
```

### Flow 3: DAO/Company Batch Payroll

```
1. Upload CSV: [alice.eth, 5000], [bob.eth, 3000], [carol.eth, 7000]
2. ENSRouter reads each recipient's ENS preferences
3. Shows preview:
   - alice.eth → Base (50% USDC, 30% ETH, 20% USDT)
   - bob.eth  → Arbitrum (100% USDC)
   - carol.eth → Ethereum (70% ETH, 30% USDC)
4. Single approval on Arc → Gateway fans out to all chains
5. Across intents handle token swaps on each destination chain
6. Each person receives funds exactly how they want them
```

---

## Why Intents Solve the Gas Problem

Traditional swaps require someone to pay gas on the destination chain. With intent-based execution via Across:

- The **sender** only pays gas on Arc (USDC-denominated, predictable)
- The **Across solver/relayer** bears destination chain gas costs
- The solver recoups gas + earns a spread from the swap execution
- The **recipient** receives slightly less due to solver spread (transparent, shown upfront)
- **Nobody** needs native gas tokens on the destination chain

The sender sees the exact breakdown before confirming:

```
Sending 500 USDC to alice.eth

alice.eth preferences:
  Chain: Base | Allocation: 50% USDC / 30% ETH / 20% USDT

Breakdown:
  250.00 USDC  → delivered as USDC (no swap needed)
  148.80 USDC  → swapped to ~0.06 ETH via Across
   99.10 USDC  → swapped to ~99.05 USDT via Across
    2.10 USDC  → fees (Circle bridge + Across solver spread)
```

---

## ENS Text Record Schema

Using custom-prefixed keys per ENS best practices (custom records with app prefix):

| Key | Example Value | Purpose |
|-----|---------------|---------|
| `ENSRouter.chain` | `"base"` | Preferred destination chain |
| `ENSRouter.alloc` | `"USDC:50,ETH:30,USDT:20"` | Token allocation percentages (must sum to 100) |
| `ENSRouter.slippage` | `"0.5"` | Max slippage tolerance (%) for Across swaps |
| `ENSRouter.autoswap` | `"true"` | Enable auto-swap on arrival |
| `ENSRouter.fallback` | `"arc"` | Fallback chain if preferred unavailable |

**Why this schema works:**
- Human-readable when inspecting ENS records directly
- Compact enough to fit ENS text record limits
- Parseable with simple string splitting (no JSON overhead)
- Prefixed with `ENSRouter.` to avoid collisions per ENS convention
- When `autoswap` is `"false"`, only bridging happens (USDC delivered as-is on preferred chain)

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                        │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │  Profile     │  │  Send USDC   │  │  Batch Payroll          │ │
│  │  Setup Page  │  │  Page        │  │  Dashboard              │ │
│  └──────┬──────┘  └──────┬───────┘  └────────────┬────────────┘ │
└─────────┼────────────────┼───────────────────────┼──────────────┘
          │                │                       │
          ▼                ▼                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                     CORE ENGINE (API Routes)                     │
│                                                                  │
│  ┌──────────────┐  ┌───────────────┐  ┌───────────────────────┐ │
│  │ ENS Module   │  │ Bridge Module │  │ Swap Module           │ │
│  │              │  │               │  │                       │ │
│  │ Read/write   │  │ Circle        │  │ Across Swap API       │ │
│  │ text records │  │ Gateway/CCTP  │  │ /swap/approval        │ │
│  │ via wagmi    │  │ + Bridge Kit  │  │                       │ │
│  │              │  │               │  │ Creates intents on    │ │
│  │ Resolve ENS  │  │ Arc → dest    │  │ destination chain     │ │
│  │ name + prefs │  │ chain bridge  │  │ Solvers fill + pay gas│ │
│  └──────────────┘  └───────────────┘  └───────────────────────┘ │
└──────────┬───────────────┬───────────────────────┬──────────────┘
           │               │                       │
           ▼               ▼                       ▼
┌────────────────┐ ┌────────────────┐  ┌─────────────────────────┐
│    ENS          │ │  Circle Arc    │  │  Destination Chain      │
│    (Ethereum)   │ │                │  │  (Base / Arb / Eth)     │
│                 │ │  USDC hub      │  │                         │
│  Text records   │ │  Sender pays   │  │  USDC arrives via CCTP  │
│  storage &      │ │  here in USDC  │  │           │             │
│  resolution     │ │       │        │  │           ▼             │
│                 │ │       ▼        │  │  Across solver fills    │
│                 │ │  Gateway/CCTP  │  │  intents, swaps USDC    │
│                 │ │  bridges to    │──│→ into preferred tokens  │
│                 │ │  dest chain    │  │           │             │
│                 │ │                │  │           ▼             │
│                 │ │                │  │  Tokens delivered to    │
│                 │ │                │  │  recipient wallet       │
└────────────────┘ └────────────────┘  └─────────────────────────┘
```

### Why This 3-Layer Split?

| Layer | Tool | Responsibility |
|-------|------|----------------|
| **Preferences** | ENS | Store & resolve user's chain + token preferences |
| **Bridging** | Circle Gateway / CCTP / Bridge Kit | Move USDC from Arc to destination chain. Arc is the liquidity hub. |
| **Swapping** | Across Swap API (intents) | Convert USDC to preferred tokens on destination chain. Solvers bear gas. |

**Arc has no DEX liquidity yet** — Uniswap, Curve, etc. are testnet participants but pools aren't live. So swaps MUST happen on the destination chain where liquidity exists. Across Protocol is an **official Arc crosschain partner** (alongside Stargate and Wormhole), making this integration story very clean for judges.

---

## Technical Implementation

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 14 + App Router | Fast, SSR for ENS resolution |
| Wallet | wagmi v2 + viem + RainbowKit | ENS hooks built-in (but custom ENS code added to qualify) |
| ENS Read | `useEnsText` from wagmi | Read text records for any .eth name |
| ENS Write | Resolver contract interaction via viem | Set text records from profile UI |
| Bridge | Circle Gateway / CCTP + Bridge Kit SDK | Arc → destination chain USDC bridge |
| Liquidity Hub | Arc (Circle L1) | USDC entry point, stablecoin gas, sub-second finality |
| Swaps | Across Swap API (`/swap/approval`) | Intent-based token swaps on destination chain |
| Swap SDK | `@across-protocol/app-sdk` | TypeScript client for quotes, execution, tracking |
| Styling | Tailwind CSS + shadcn/ui | Clean, fast to build |

### Key Code Snippets

**1. Reading ENS preferences (wagmi):**
```typescript
import { useEnsText } from 'wagmi'
import { normalize } from 'viem/ens'

function useENSRouterProfile(ensName: string) {
  const chain = useEnsText({ name: normalize(ensName), key: 'ENSRouter.chain' })
  const alloc = useEnsText({ name: normalize(ensName), key: 'ENSRouter.alloc' })
  const slippage = useEnsText({ name: normalize(ensName), key: 'ENSRouter.slippage' })
  const autoswap = useEnsText({ name: normalize(ensName), key: 'ENSRouter.autoswap' })

  return {
    chain: chain.data,                              // "base"
    alloc: parseAlloc(alloc.data),                  // [{token:"USDC",pct:50}, ...]
    slippage: parseFloat(slippage.data || "0.5"),
    autoswap: autoswap.data === "true",
  }
}

function parseAlloc(raw: string | undefined) {
  if (!raw) return [{ token: "USDC", pct: 100 }]
  return raw.split(",").map(part => {
    const [token, pct] = part.split(":")
    return { token, pct: parseInt(pct) }
  })
}
```

**2. Writing ENS preferences (viem — profile setup):**
```typescript
import { namehash } from 'viem/ens'

async function setENSRouterProfile(
  walletClient: WalletClient,
  ensName: string,
  preferences: { chain: string; alloc: string; slippage: string; autoswap: string }
) {
  const node = namehash(ensName)
  const resolverAddress = '0x...' // ENS Public Resolver

  for (const [key, value] of Object.entries(preferences)) {
    await walletClient.writeContract({
      address: resolverAddress,
      abi: resolverAbi,
      functionName: 'setText',
      args: [node, `ENSRouter.${key}`, value],
    })
  }
}
```

**3. Bridge USDC from Arc → destination chain (Circle Bridge Kit):**
```typescript
import { BridgeKit } from '@circle-fin/bridge-kit'

async function bridgeToDestination(
  amount: string,
  destinationChain: string,
  recipientAddress: string
) {
  const kit = new BridgeKit({ /* config */ })

  const result = await kit.bridge({
    from: { adapter: viemAdapter, chain: "Arc" },
    to: { adapter: viemAdapter, chain: destinationChain },
    amount: amount,
    recipient: recipientAddress,
  })

  return result // USDC now on destination chain
}
```

**4. Swap via Across intents on destination chain:**
```typescript
import axios from 'axios'
import { parseUnits } from 'viem'

// Token addresses on Base (example)
const TOKENS_BASE: Record<string, string> = {
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  ETH:  '0x0000000000000000000000000000000000000000', // native
  USDT: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
}

async function getAcrossSwapQuote(
  inputAmount: string,      // in USDC base units
  outputToken: string,      // token address on destination
  destinationChainId: number,
  depositorAddress: string
) {
  const { data } = await axios.get('https://app.across.to/api/swap/approval', {
    params: {
      tradeType: 'minOutput',
      amount: inputAmount,
      inputToken: TOKENS_BASE.USDC,      // USDC on destination chain
      originChainId: destinationChainId,  // same chain — swap only
      outputToken: outputToken,
      destinationChainId: destinationChainId,
      depositor: depositorAddress,
    }
  })

  return {
    expectedOutput: data.expectedOutput,
    totalFee: data.fees?.totalRelayFee,
    approvalTx: data.approvalTx,        // ready-to-submit approval tx
    swapTx: data.swapTx,                // ready-to-submit swap tx
  }
}
```

**5. Full orchestration — the core engine:**
```typescript
async function executeENSRouterPayment(
  senderAddress: string,
  recipientEns: string,
  totalUsdc: number
) {
  // Step 1: Resolve ENS preferences
  const profile = await resolveENSRouterProfile(recipientEns)
  const recipientAddress = await resolveEnsAddress(recipientEns)

  // Step 2: Bridge USDC from Arc → destination chain via Circle Gateway
  const bridgeResult = await bridgeToDestination(
    totalUsdc.toString(),
    profile.chain,       // e.g., "base"
    recipientAddress
  )

  // Step 3: Wait for USDC to arrive on destination chain
  await waitForBridgeCompletion(bridgeResult)

  // Step 4: For each allocation, execute Across swap or direct transfer
  for (const { token, pct } of profile.alloc) {
    const amount = (totalUsdc * pct) / 100

    if (token === "USDC") {
      // No swap needed — USDC already on destination chain
      await transferUSDC(recipientAddress, amount, profile.chain)
    } else if (profile.autoswap) {
      // Create Across intent for this token portion
      const quote = await getAcrossSwapQuote(
        parseUnits(amount.toString(), 6).toString(),
        TOKENS[profile.chain][token],
        CHAIN_IDS[profile.chain],
        recipientAddress
      )

      // Execute the swap via Across (solver fills it, pays gas)
      await executeAcrossSwap(quote)
    }
  }
}
```

**6. Across App SDK setup (alternative to raw API):**
```typescript
import { createAcrossClient } from "@across-protocol/app-sdk"
import { base, arbitrum, mainnet } from "viem/chains"

const acrossClient = createAcrossClient({
  integratorId: "ENSRouter",  // request from Across team
  chains: [base, arbitrum, mainnet],
})

// Get quote
const quote = await acrossClient.getQuote({
  inputToken: USDC_ADDRESS,
  outputToken: ETH_ADDRESS,
  originChainId: base.id,
  destinationChainId: base.id,  // same-chain swap
  inputAmount: parseUnits("150", 6),
})

// Execute deposit
await acrossClient.executeQuote({
  walletClient,
  deposit: quote.deposit,
})

// Track status
const status = await fetch(
  `https://app.across.to/api/deposit/status?depositTxHash=${txHash}`
)
```

---

## Pages / Screens to Build

### 1. Landing Page (`/`)
- Hero: "Your ENS name. Your rules. Pay anyone, everywhere."
- How it works in 3 steps with animation
- CTA: "Set Up Your Profile" / "Send USDC"

### 2. Profile Setup Page (`/profile`)
- Connect wallet → detect ENS name
- Form: select destination chain (dropdown), drag sliders for token allocation (pie chart updates live)
- Set slippage, toggle auto-swap
- "Save to ENS" button → writes text records (multiple txns)
- Show live preview of what senders will see

### 3. Send Page (`/send`)
- Input: recipient ENS name
- Auto-resolve: shows recipient's avatar + preferences
- Input: USDC amount
- Preview breakdown:
  - USDC portion → direct transfer (no fee)
  - Non-USDC portions → Across quote with estimated output + solver spread
  - Total fees (bridge + solver)
- Approve + Send button
- Real-time status tracker:
  `Depositing on Arc → Bridging via Gateway → Swapping via Across → Delivered ✅`

### 4. Batch Payroll Page (`/batch`)
- Upload CSV or manually add rows: [ENS name, amount]
- Table shows resolved preferences for each recipient
- Total cost summary with aggregated fees
- Single-click execute all

### 5. Dashboard (`/dashboard`)
- Your current ENS preferences (live from chain)
- Transaction history: who paid you, when, what you received
- Edit preferences shortcut

---

## 24-Hour Build Plan

### Hours 0–2: Setup & Scaffold
- [ ] `npx create-next-app@latest ENSRouter --typescript --tailwind`
- [ ] Install dependencies:
  - `wagmi`, `viem`, `@rainbow-me/rainbowkit` (wallet + ENS)
  - `@circle-fin/bridge-kit` (Arc bridging)
  - `@across-protocol/app-sdk` (intent-based swaps)
  - `axios` (Across API fallback)
- [ ] Set up wallet connection (RainbowKit) with Ethereum + Arc + Base chains
- [ ] Create Circle Developer Account at console.circle.com
- [ ] Get Arc testnet funds from faucet.circle.com
- [ ] Request Across integrator ID (proceed without it — add later)
- [ ] Set up project structure: `/app/profile`, `/app/send`, `/app/batch`, `/app/dashboard`

### Hours 2–5: ENS Integration (Critical Path — Bounty Qualifier)
- [ ] Build `useENSRouterProfile` hook (read text records via `useEnsText`)
- [ ] Build profile setup form with live pie chart for allocation
- [ ] Implement `setText` calls to write preferences to ENS resolver
- [ ] Test with a real .eth name on Sepolia/mainnet
- [ ] Build ENS preview card component (shows name + avatar + preferences)
- [ ] **IMPORTANT**: Use wagmi hooks directly (not just RainbowKit) — this is required for ENS bounty qualification

### Hours 5–9: Arc + Circle Gateway Integration (Bounty Qualifier)
- [ ] Implement USDC deposit flow on Arc
- [ ] Integrate Circle Bridge Kit for Arc → destination chain bridging
- [ ] OR integrate Circle Gateway API directly for instant USDC bridging
- [ ] Build the route planner: read ENS prefs → determine bridge path → estimate fees
- [ ] Build real-time bridge status tracker

### Hours 9–13: Across Swap Integration (Core Value Prop)
- [ ] Set up Across App SDK client with supported chains
- [ ] Implement `getAcrossSwapQuote()` for each non-USDC token in allocation
- [ ] Build the swap executor that creates intents per allocation split
- [ ] Wire up the complete Send page:
  ENS lookup → preview with Across quotes → approve → bridge → swap → status
- [ ] Handle edge cases:
  - 100% USDC allocation (no swaps, bridge only)
  - `autoswap = false` (bridge USDC only, skip Across)
  - `isAmountTooLow` from Across API (show error, suggest higher amount)
  - Unsupported tokens on destination chain

### Hours 13–16: Batch Payroll + Polish
- [ ] Build CSV upload + parsing
- [ ] Multi-recipient ENS resolution (parallel reads)
- [ ] Batch execution with progress tracking per recipient
- [ ] Error handling and retry logic

### Hours 16–19: Dashboard + UX Polish
- [ ] Transaction history view
- [ ] Responsive design pass
- [ ] Loading states, error toasts, success animations
- [ ] "Edit Profile" flow from dashboard

### Hours 19–22: Testing + Demo Prep
- [ ] End-to-end test: set profile → send → bridge → swap → receive on correct chain
- [ ] Record demo video (screen recording + narration)
- [ ] Test on Arc testnet with real Circle Gateway
- [ ] Test Across swaps on Base/Arbitrum testnet
- [ ] Fix any broken flows

### Hours 22–24: Submission
- [ ] Clean architecture diagram (for submission)
- [ ] Write product feedback for Circle (required by bounty!)
- [ ] Write README with setup instructions
- [ ] Push to GitHub (open source, required by both bounties)
- [ ] Record final demo video (2-3 minutes)
- [ ] Write project description for ETHGlobal showcase
- [ ] Submit to bounties:
  - ENS: "Integrate ENS" ($3,500 pool) + "Most Creative ENS for DeFi" ($1,500)
  - Arc: "Best Crosschain Financial Apps Using Arc as Liquidity Hub" ($5,000)

---

## Scope Cuts (If Running Behind)

| Priority | Feature | Keep/Cut | Notes |
|----------|---------|----------|-------|
| **P0** | ENS text record read/write | MUST KEEP | Required for ENS bounty |
| **P0** | Single send flow with ENS resolution | MUST KEEP | Core product |
| **P0** | Arc USDC deposit + Circle Gateway bridge | MUST KEEP | Required for Arc bounty |
| **P0** | Circle product feedback | MUST KEEP | Required for Arc bounty qualification |
| **P1** | Across intent-based swaps | KEEP | Core differentiator, solves gas problem |
| **P1** | Real-time status tracker | KEEP | Great for demo |
| **P1** | Send preview with fee breakdown | KEEP | Shows product polish |
| **P2** | Batch payroll | CUT IF NEEDED | Nice to have |
| **P2** | Dashboard/history | CUT IF NEEDED | Nice to have |
| **P3** | Multiple destination chains | Can hardcode to Base only | Simplify |
| **P3** | Fancy landing page | CUT | Go straight to app |

**Minimum viable demo (~10 hours):** Profile setup (ENS write) + Single send with ENS resolution + Arc → Base bridge via Circle Gateway + Across swap on Base + Delivery. No batch, no dashboard. **Still qualifies for all bounties.**

**Even leaner MVP (~7 hours):** Same as above but with `autoswap = false` only (bridge USDC to preferred chain, no token swaps). Add Across swaps as "V2 feature" in demo. Still qualifies for both bounties but weaker on the "creative ENS" prize.

---

## Bounty Qualification Checklist

### ENS — "Integrate ENS" ($3,500 split pool)

- [x] Custom ENS code beyond RainbowKit (wagmi `useEnsText` hooks)
- [x] Functional demo, no hard-coded values
- [x] Video recording or live demo link
- [x] Open source on GitHub

### ENS — "Most Creative Use of ENS for DeFi" ($1,500)

- [x] ENS used beyond simple name → address mapping
- [x] Text records store DeFi preferences (chain, allocation, slippage)
- [x] ENS is central to the product, not an afterthought
- [x] Novel application: ENS names as self-describing payment endpoints

### Arc — "Best Crosschain Financial Apps Using Arc as Liquidity Hub" ($5,000)

- [x] **Required tools:** Arc ✅, Circle Gateway ✅, USDC ✅, Circle Wallets ✅
- [x] Functional MVP with frontend + backend
- [x] Architecture diagram
- [x] Product feedback for Circle (clear and actionable)
- [x] Video demonstration + presentation
- [x] GitHub repo link
- [x] App treats multiple chains as one liquidity surface
- [x] Arc used as hub to move USDC where needed
- [x] Seamless UX despite crosschain complexity

---

## Why Judges Will Love This

**For ENS judges:**
- Goes way beyond name → address resolution
- Uses ENS text records as a portable DeFi preference layer (novel!)
- Custom text record schema shows deep understanding of ENS capabilities
- Not an afterthought — ENS IS the product
- Users' wallets become their DeFi identity

**For Arc/Circle judges:**
- Arc is the central USDC liquidity hub (exactly what they asked for)
- Uses Circle Gateway for instant crosschain bridging (their flagship product)
- Uses Circle Bridge Kit SDK (shows familiarity with their developer tools)
- Real use case: crosschain payments with preference-aware routing
- Demonstrates chain abstraction: sender on Arc, recipient on any chain
- Across is an **official Arc crosschain partner** — this integration is blessed

**For the "creative" factor:**
- Nobody has turned ENS names into self-describing payment endpoints before
- The concept is simple to explain in a 2-min demo
- Visual demo is compelling: type a name → see preferences → watch money flow across chains
- Intent-based architecture means zero gas friction for users

---

## Key Technical Decisions & Rationale

| Decision | Rationale |
|----------|-----------|
| **No swaps on Arc** | No DEX liquidity on Arc yet (Uniswap, Curve are testnet-only participants). Swaps must happen on destination chains where pools exist. |
| **Across for swaps, not Uniswap SDK** | Across uses intent-based execution: solvers bear gas costs, users never need destination chain gas tokens. Also, Across has a simple REST API (`/swap/approval`) vs. complex Uniswap contract interactions. |
| **Across over UniswapX** | Across is an official Arc partner, has better docs for third-party integrators, provides ready-to-submit transactions via API, and has an App SDK. |
| **Circle Gateway for bridging (not Across bridge)** | Arc bounty requires Circle tools. Using Gateway ensures qualification. Across handles only the swap layer on the destination chain. |
| **ENS text records (not a database)** | Fully decentralized, portable across any app. User owns their preferences. No backend database needed. Perfect for hackathon scope. |
| **Custom `ENSRouter.*` prefix** | Per ENS convention for custom records. Avoids collisions with other apps. |

---

## Potential Extensions (Post-Hackathon / Pitch as V2)

- **ENS Subnames for teams:** `alice.company.eth` with inherited default preferences
- **Streaming payments:** Combine with Superfluid for ENS-configured salary streams
- **Privacy mode:** Use Arc's opt-in privacy features for confidential payroll
- **Agent integration:** AI agents that can pay any ENS name without knowing chain details
- **Widget/SDK:** Embed a "Pay me" button on any website that reads ENS preferences
- **Multi-stablecoin support:** EURC, USDT as input currencies (Arc supports EURC gas)
- **Conditional preferences:** "If amount > 10k, route to Ethereum. Otherwise, Base."
