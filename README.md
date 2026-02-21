<p align="center">
  <img src="./assets/banner.png" alt="ENSRouter Banner" width="100%" />
</p>

<h1 align="center"><img src="./frontend/public/logo.png" alt="ENSRouter Logo" width="48" height="48" style="vertical-align: middle;" /> ENSRouter</h1>
<p align="center"><i>Your ENS, Your Rules</i></p>

<p align="center">
  A cross-chain payment routing platform that leverages ENS text records to store user payment preferences. Configure once, receive payments anywhere — automatically routed to your preferred chain and token allocation.
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/Built%20with-ENS-5298FF?style=for-the-badge&logo=ethereum&logoColor=white" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Powered%20by-LI.FI-E85EFF?style=for-the-badge" /></a>
  <a href="https://ethglobal.com/showcase/ensrouter-c4ksu"><img src="https://img.shields.io/badge/ETHGlobal-HackMoney 2026-4A90A4?style=for-the-badge&logo=ethereum&logoColor=white" /></a>
</p>

<p align="center">
  <a href="#-what-is-ensrouter">What is it</a> •
  <a href="#-how-it-works">How It Works</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-supported-chains">Chains</a> •
  <a href="#-tech-stack">Stack</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-api-reference">API</a>
</p>

---

## 🔮 What is ENSRouter?

ENSRouter solves the fragmented wallet problem in crypto. Instead of managing multiple addresses across different chains and asking senders to bridge manually, you configure your preferences once via ENS text records — and every payment automatically routes to your desired chain and token allocation.

> *"One ENS. Any chain. Your tokens. Automatically."*

<p align="center">
  <a href="https://ethglobal.com/showcase/ensrouter-c4ksu">
    <img src="https://img.shields.io/badge/🏆_View_Project_on-ETHGlobal_Showcase-00D395?style=for-the-badge&labelColor=1a1b1f" alt="View on ETHGlobal Showcase" />
  </a>
</p>

### The Problem

- You have USDC scattered across 5 chains
- Senders never know which address to use
- Manual bridging is expensive and time-consuming
- You want ETH on Base but receive USDC on Ethereum

### The Solution

Set up your ENSRouter profile once:
- **Preferred chain**: Base
- **Token allocation**: 60% USDC, 30% ETH, 10% DAI
- **Slippage tolerance**: 0.5%

Now anyone can send USDC to `yourname.eth` on any chain — ENSRouter reads your ENS preferences and automatically bridges + swaps via LI.FI to deliver exactly what you want, where you want it.

---

## ✨ Key Features

- **📛 ENS-Native Preferences** — Your payment routing rules live in ENS text records, portable across all dApps
- **⛓️ Cross-Chain Routing** — Send from any chain, receive on your preferred chain via LI.FI
- **💱 Automatic Token Conversion** — Set allocation percentages and receive a diversified portfolio
- **📱 QR Code Sharing** — Generate shareable payment links and QR codes for your profile
- **🔔 Telegram Notifications** — Get notified when payments arrive
- **⚡ Real-Time Tracking** — Watch your payment progress through each step

---

## 🔄 How It Works

ENSRouter follows a simple flow: **Setup Profile → Share Link → Receive Payments**.

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENSROUTER — PAYMENT FLOW                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ① SET UP YOUR PROFILE                                         │
│   Connect wallet, enter ENS name, configure preferences         │
│   → Writes to ENS text records on Ethereum mainnet              │
│                         ↓                                       │
│   ② SHARE YOUR PAYMENT LINK                                     │
│   Get a QR code or link: chainrouter.app/pay/yourname.eth      │
│   Share it anywhere — Twitter, invoices, your website           │
│                         ↓                                       │
│   ③ SENDER INITIATES PAYMENT                                    │
│   Sender enters your ENS + USDC amount                          │
│   ENSRouter resolves your profile from ENS text records         │
│                         ↓                                       │
│   ④ AUTOMATIC ROUTING                                           │
│   For each token in your allocation:                            │
│   • Direct transfer if same chain + same token                  │
│   • LI.FI bridge + swap for cross-chain conversions             │
│                         ↓                                       │
│   ⑤ RECEIVE YOUR TOKENS                                         │
│   Tokens arrive on your preferred chain                         │
│   Get notified via Telegram (optional)                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### ENS Text Record Schema

ENSRouter stores preferences in standard ENS text records:

| Key | Example Value | Description |
|-----|---------------|-------------|
| `ENSRouter.chain` | `base` | Destination chain ID |
| `ENSRouter.tokenAlloc` | `USDC:60,ETH:30,DAI:10` | Token allocation percentages |
| `ENSRouter.slippage` | `0.5` | Maximum slippage tolerance (%) |

These records are written via the ENS Public Resolver in a single multicall transaction.

---

## 🏗️ Architecture

### High-Level System Design

```
┌──────────────────────────────────────────────────────────────────────┐
│                       ENSROUTER SYSTEM                               │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                   NEXT.JS 16 FRONTEND                           │ │
│  │                                                                  │ │
│  │   /profile           /send              Landing Page             │ │
│  │   ┌──────────┐      ┌──────────┐       ┌──────────────┐        │ │
│  │   │ ENS Setup │      │ Payment  │       │ 3D Dither    │        │ │
│  │   │ Chain    │      │ Preview  │       │ Animation    │        │ │
│  │   │ Tokens   │      │ Tracker  │       │ (Three.js)   │        │ │
│  │   │ Slippage │      │ Status   │       │              │        │ │
│  │   └────┬─────┘      └────┬─────┘       └──────────────┘        │ │
│  │        │                 │                                      │ │
│  │        ▼                 ▼                                      │ │
│  │   ┌─────────────────────────────────────────────────┐          │ │
│  │   │                  WAGMI + VIEM                    │          │ │
│  │   │  useEnsText() · useWriteContract() · useBridge() │          │ │
│  │   └──────────────────────┬──────────────────────────┘          │ │
│  └──────────────────────────┼──────────────────────────────────────┘ │
│                             │                                        │
│         ┌───────────────────┼───────────────────┐                    │
│         │                   │                   │                    │
│         ▼                   ▼                   ▼                    │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐          │
│  │  ENS Public  │    │   LI.FI     │    │  Express.js     │          │
│  │  Resolver    │    │   Protocol  │    │  Backend        │          │
│  │              │    │             │    │                 │          │
│  │  Read/Write  │    │  Bridge     │    │  /api/ens/*     │          │
│  │  Text Records│    │  Swap       │    │  /api/webhook/* │          │
│  │  on Ethereum │    │  Quote      │    │  /api/telegram/*│          │
│  └─────────────┘    └─────────────┘    └────────┬────────┘          │
│                                                  │                   │
│                              ┌───────────────────┼───────────────┐   │
│                              │                   │               │   │
│                              ▼                   ▼               │   │
│                       ┌─────────────┐    ┌─────────────┐        │   │
│                       │  MongoDB    │    │  Telegram   │        │   │
│                       │             │    │  Bot API    │        │   │
│                       │  users      │    │             │        │   │
│                       │  txns       │    │  Notify on  │        │   │
│                       │  queue      │    │  payment    │        │   │
│                       └─────────────┘    └─────────────┘        │   │
│                                                                  │   │
└──────────────────────────────────────────────────────────────────────┘
```

### Payment Execution Flow

```
Sender                    Frontend                  LI.FI               Recipient
  │                          │                        │                     │
  │  Enter ENS + amount      │                        │                     │
  │─────────────────────────►│                        │                     │
  │                          │                        │                     │
  │                          │  Read ENS text records │                     │
  │                          │◄───────────────────────│                     │
  │                          │                        │                     │
  │  Preview: 60% USDC,      │                        │                     │
  │  30% ETH, 10% DAI on Base│                        │                     │
  │◄─────────────────────────│                        │                     │
  │                          │                        │                     │
  │  Confirm payment         │                        │                     │
  │─────────────────────────►│                        │                     │
  │                          │                        │                     │
  │                          │  For each allocation:  │                     │
  │                          │  ────────────────────► │                     │
  │                          │                        │                     │
  │                          │  Bridge + Swap         │                     │
  │                          │  ◄──────────────────── │                     │
  │                          │                        │                     │
  │                          │                        │  Tokens arrive      │
  │                          │                        │ ───────────────────►│
  │                          │                        │                     │
  │  Payment complete!       │  Webhook notification  │                     │
  │◄─────────────────────────│─────────────────────►  │  Telegram alert    │
  │                          │                        │ ───────────────────►│
```

---

## ⛓️ Supported Chains

| Chain | Chain ID | Status |
|-------|----------|--------|
| **Ethereum** | 1 | ✅ Source + Destination |
| **Base** | 8453 | ✅ Source + Destination |
| **Arbitrum** | 42161 | ✅ Source + Destination |
| **Polygon** | 137 | ✅ Source + Destination |
| **Optimism** | 10 | ✅ Source + Destination |

### Supported Tokens

| Token | Ethereum | Base | Arbitrum | Polygon | Optimism |
|-------|----------|------|----------|---------|----------|
| USDC | ✅ | ✅ | ✅ | ✅ | ✅ |
| ETH | ✅ | ✅ | ✅ | ✅ | ✅ |
| DAI | ✅ | ✅ | ✅ | ✅ | ✅ |
| USDT | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 16 + React 19 | App router, SSR, API routes |
| **Styling** | Tailwind CSS 4 + shadcn/ui | Component library + custom design |
| **Web3** | wagmi v3 + viem v2 | Wallet connection, contract calls |
| **Wallet UI** | RainbowKit v2 | Multi-wallet connection modal |
| **Bridging** | LI.FI SDK | Cross-chain swaps and bridges |
| **3D Graphics** | Three.js + React Three Fiber | Landing page animations |
| **State** | Zustand v5 | Client-side state management |
| **Forms** | React Hook Form + Zod | Form handling + validation |
| **Backend** | Express.js + TypeScript | REST API server |
| **Database** | MongoDB + Mongoose | User registry, transaction history |
| **Notifications** | Telegraf (Telegram Bot) | Payment alerts |
| **ENS** | viem ENS utilities | Read/write text records |

---

## 📁 Project Structure

```
ensrouter/
├── frontend/                          # Next.js 16 application
│   ├── app/                           # App router pages
│   │   ├── page.tsx                   # Landing page with 3D animation
│   │   ├── profile/page.tsx           # ENS profile setup
│   │   └── send/page.tsx              # Send payment interface
│   ├── components/                    # React components
│   │   ├── ENSProfileCard.tsx         # Display recipient profile
│   │   ├── PaymentStatusTracker.tsx   # Real-time payment progress
│   │   ├── PaymentPreview.tsx         # Payment breakdown preview
│   │   ├── AllocationSliders.tsx      # Token allocation UI
│   │   ├── ChainSelector.tsx          # Chain dropdown
│   │   ├── Dither.tsx                 # Three.js dither effect
│   │   └── ui/                        # shadcn/ui components
│   ├── hooks/                         # Custom React hooks
│   │   ├── useChainRouterProfile.ts   # Read ENS preferences
│   │   ├── useSetProfile.ts           # Write profile to ENS
│   │   ├── usePayment.ts              # Execute payment flow
│   │   ├── useBridgeUSDC.ts           # LI.FI bridge integration
│   │   └── useBridgeEstimate.ts       # Get bridge quotes
│   ├── lib/                           # Utilities & config
│   │   ├── chains.ts                  # Supported chains config
│   │   ├── tokenList.ts               # Token addresses per chain
│   │   ├── validations.ts             # Zod schemas
│   │   └── wagmi.ts                   # Wagmi configuration
│   └── types/                         # TypeScript interfaces
│
├── backend/                           # Express.js API
│   ├── src/
│   │   ├── index.ts                   # Express app + routes
│   │   ├── config/                    # Database connection
│   │   ├── routes/
│   │   │   ├── ens.ts                 # ENS resolution endpoints
│   │   │   ├── webhook.ts             # Bridge event webhooks
│   │   │   └── telegram.ts            # Telegram bot webhook
│   │   ├── services/
│   │   │   ├── ENSService.ts          # ENS resolution logic
│   │   │   ├── TelegramService.ts     # Telegram notifications
│   │   │   └── WebhookService.ts      # Webhook processing
│   │   └── models/
│   │       ├── User.ts                # ENS → address mapping
│   │       └── NotificationQueue.ts   # Retry queue
│   ├── docker-compose.yml             # MongoDB + mongo-express
│   └── render.yaml                    # Render.com deployment
│
└── assets/                            # Images, logos
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- MongoDB (local via Docker or Atlas)
- Ethereum RPC URL (for ENS resolution)

### Installation

```bash
# Clone the repository
git clone https://github.com/SakshiShah29/ENSRouter.git
cd ENSRouter

# ─── Frontend ──────────────────────────────────────────────────
cd frontend
npm install
cp .env.example .env.local
# Add your environment variables
npm run dev          # Starts on http://localhost:3000

# ─── Backend ───────────────────────────────────────────────────
cd ../backend
npm install
cp .env.example .env
# Add your environment variables

# Start MongoDB with Docker
npm run db:up

# Start the server
npm run dev          # Starts on http://localhost:3001
```

### Environment Variables

**Frontend (.env.local)**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WEBHOOK_SECRET=your-webhook-secret
```

**Backend (.env)**
```env
# Database
MONGODB_URI=mongodb://localhost:27017/ensrouter

# Ethereum RPC (for ENS resolution)
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY

# Telegram Bot (optional)
TELEGRAM_BOT_TOKEN=your-bot-token
BACKEND_URL=https://your-backend-url.com

# Security
WEBHOOK_SECRET=your-webhook-secret
PORT=3001
```

---

## 📡 API Reference

### ENS Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ens/resolve/:ensName` | Resolve ENS name to address + text records |
| `GET` | `/api/ens/user/:ensName` | Get stored user mapping |
| `POST` | `/api/ens/register` | Register/update user (ENS + ETH address) |

### Webhook Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/webhook/bridge-events` | Receive bridge completion events |

### Telegram Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/telegram/webhook` | Telegram bot webhook endpoint |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Server status |

---

## 🔐 Key Addresses

**ENS Public Resolver (Ethereum Mainnet)**
```
0xF29100983E058B709F3D539b0c765937B804AC15
```

**USDC Addresses**
| Chain | Address |
|-------|---------|
| Ethereum | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| Base | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Arbitrum | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |
| Polygon | `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` |
| Optimism | `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85` |

---

## 🤝 Contributing

Contributions are welcome! Whether you want to add new chains, improve the UI, or enhance the bridging logic:

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/new-chain`)
3. Commit your changes (`git commit -m 'Add Avalanche support'`)
4. Push to the branch (`git push origin feat/new-chain`)
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.

---

<p align="center">
  <i>Built with <a href="https://ens.domains">ENS</a> + <a href="https://li.fi">LI.FI</a></i><br/>
  <i>Cross-chain payments, simplified.</i>
</p>
