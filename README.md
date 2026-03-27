# PayGuard 🛡️
### Nigeria's Trust Layer for Social Commerce

PayGuard is an escrow-powered payment platform built for Nigerian social commerce. It holds funds securely via Interswitch until both buyer and seller are satisfied - eliminating scams, failed deliveries, and he-said-she-said disputes that cost Nigerians billions every year.

---

## The Problem

Nigeria lost N52.26 billion to digital fraud in 2024 alone. E-commerce and social commerce are the most affected channels. Buyers get scammed after paying. Sellers ship goods and never get paid. There is no trust layer protecting either side.

PayGuard fixes that.

---

## How It Works

1. Seller creates a transaction and shares a payment link directly in WhatsApp or Instagram
2. Buyer pays via Interswitch Webpay - funds are held in escrow, not sent to seller
3. Seller ships the item and enters a tracking number
4. Buyer confirms delivery - funds are released automatically to seller
5. If something goes wrong, either party raises a dispute and funds are frozen until resolved

---

## Live Demo

**https://pay-guard-xi.vercel.app**

---

## Team TrustNaija

| Name | Role | Contributions |
|------|------|---------------|
| Victoria | PM and Backend Lead | Project management, Supabase database schema and migrations, edge functions architecture, Interswitch API integration planning, escrow logic, dispute engine, trust score system, transaction service layer, deployment coordination |
| Chima | Frontend Developer | All UI screens and components, landing page, authentication flow, seller dashboard, buyer dashboard, transaction detail page, payment link page, admin panel, UI design and polish |
| Preye | Full Stack Developer | Interswitch Webpay integration, payment webhook, KYC and BVN verification, Supabase edge functions, SMS notifications via Termii, auto-release function, shared frontend and backend support |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| UI Components | shadcn/ui + Framer Motion |
| Backend | Supabase Edge Functions (Deno) |
| Database | Supabase PostgreSQL with Row Level Security |
| Payments In | Interswitch Webpay / PAYDirect API |
| Payments Out | Interswitch Transfer / Disbursement API |
| Identity | Interswitch BVN and NIN Verification API |
| Notifications | Termii SMS API |
| Hosting | Vercel (frontend) + Supabase (backend) |

---

## Interswitch APIs Used

- **PAYDirect / Webpay** - Collects buyer payment via card, bank transfer or USSD
- **Transfer / Disbursement API** - Releases funds to seller automatically after delivery
- **BVN Verification API** - Verifies user identity before first transaction
- **Transaction Status API** - Confirms payment was received and settled server-side

---

## Key Features

**For Sellers**
- Create transactions and generate shareable payment links
- Get notified instantly when a buyer pays
- Enter tracking number after shipping
- See all transactions with real-time status updates
- Trust score that builds with every completed transaction
- Wallet showing escrow balance and released earnings

**For Buyers**
- Pay securely knowing money is held in escrow
- Confirm delivery to release funds to seller
- Raise a dispute with evidence if something goes wrong
- Trust score that grows with good behaviour
- Full transaction history

**For Both**
- BVN verification for identity security
- SMS notifications at every critical step
- Tiered dispute resolution — auto for small amounts, admin review for larger ones
- Public trust scores visible on every payment link

---

## Database Schema

Core tables: profiles, transactions, disputes, wallets, bank_accounts, user_roles, reviews

Key features of the schema:
- Row Level Security on all tables
- Auto dispute tier assignment based on transaction amount
- Wallet auto-created on user signup
- Guest buyer linking when unregistered buyer creates an account
- Full audit trail on all transactions including cancellations and edits

---

## Edge Functions

| Function | Purpose |
|----------|---------|
| create-checkout | Initiates Interswitch Webpay session |
| confirm-payment | Verifies payment server-side after redirect |
| payment-webhook | Background payment confirmation fallback |
| auto-release | Auto-releases escrow after 48-hour delivery timeout |
| raise-dispute | Creates dispute ticket and freezes funds |
| send-notification | Sends SMS notifications via Termii |
| update-delivery | Updates shipping and delivery status |
| verify-kyc | Verifies BVN and NIN via Interswitch |

---

## Getting Started

### Prerequisites
- Node.js v18 or higher
- A Supabase account
- An Interswitch merchant account

### Local Setup
```bash
# Clone the repository
git clone https://github.com/VikkyRia/PayGuard.git
cd PayGuard

# Install dependencies
npm install

# Copy env template and fill in your values
cp .env.example .env

# Start the development server
npm run dev
```

### Environment Variables
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_ref
```

---

## Sandbox Test Card
```
Card Number : 5061040000000000094
Expiry      : Any future date
PIN         : 1234
OTP         : 123456
```

---

## License

MIT © TrustNaija 2026
