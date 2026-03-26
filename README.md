# PayGuard 🛡️
### Nigeria's Trust Layer for Social Commerce

PayGuard is an escrow-powered payment platform built for Nigerian social commerce. It holds funds securely until both buyer and seller are satisfied — protecting both parties in every transaction.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Supabase Setup](#supabase-setup)
- [Interswitch Integration](#interswitch-integration)
- [Edge Functions](#edge-functions)
- [Deployment](#deployment)
- [Payment Flow](#payment-flow)

---

## Overview

PayGuard works as a middleman between buyers and sellers:

1. **Seller** creates a transaction and shares a payment link
2. **Buyer** pays via Interswitch Webpay — funds go into escrow
3. **Seller** ships the item
4. **Buyer** confirms receipt — funds are released to seller
5. Either party can raise a dispute if needed

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **React 18** | UI library |
| **TypeScript** | Type safety |
| **Vite** | Build tool & dev server |
| **Tailwind CSS** | Styling |
| **shadcn/ui** | UI component library |
| **Supabase** | Database, Auth, Edge Functions |
| **Interswitch Webpay** | Payment gateway (NGN) |
| **React Query** | Server state management |
| **React Hook Form + Zod** | Form handling & validation |
| **Framer Motion** | Animations |
| **Vercel** | Frontend hosting |

---

## Project Structure

```
payguard/
├── public/                         # Static assets
├── src/
│   ├── components/                 # Reusable UI components
│   │   ├── ui/                     # shadcn/ui base components
│   │   ├── admin/                  # Admin-only components
│   │   ├── CreateTransactionForm   # New transaction form
│   │   ├── WalletCard              # Wallet display
│   │   ├── KYCVerification         # KYC flow
│   │   ├── ShippingTracker         # Delivery tracking
│   │   ├── RaiseDisputeDialog      # Dispute flow
│   │   └── TransactionActions      # Buyer/seller actions
│   ├── pages/
│   │   ├── PaymentLink.tsx         # Public payment page (buyer lands here)
│   │   ├── Dashboard.tsx           # Authenticated user dashboard
│   │   ├── TransactionDetail.tsx   # Single transaction view
│   │   └── Admin.tsx               # Admin panel
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts           # Supabase client (reads from .env)
│   │       └── types.ts            # Auto-generated DB types
│   └── App.tsx                     # Root component & routes
├── supabase/
│   ├── config.toml                 # Supabase project config
│   ├── functions/
│   │   ├── create-checkout/        # Initiates Interswitch payment
│   │   ├── confirm-payment/        # Verifies payment after redirect
│   │   ├── payment-webhook/        # Handles Interswitch webhook
│   │   ├── auto-release/           # Auto-releases funds after timeout
│   │   ├── raise-dispute/          # Dispute creation
│   │   ├── send-notification/      # SMS/email notifications
│   │   ├── update-delivery/        # Delivery status updates
│   │   └── verify-kyc/             # KYC verification
│   └── migrations/                 # Database schema migrations
├── .env                            # Local environment variables (never commit)
├── .env.example                    # Template for environment variables
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## Getting Started

### Prerequisites

- **Node.js** v18 or higher — [Download here](https://nodejs.org)
- **Supabase CLI** — `npm install -g supabase`
- A **Supabase** account — [supabase.com](https://supabase.com)
- An **Interswitch** merchant account — [developer.interswitchgroup.com](https://developer.interswitchgroup.com)

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/payguard.git
cd payguard

# 2. Install dependencies
npm install

# 3. Copy the env template and fill in your values
cp .env.example .env

# 4. Start the development server
npm run dev
```

App will be running at `http://localhost:5173`

---

## Environment Variables

Create a `.env` file in the root of your project:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_ref
```

Find these values at:
**supabase.com → your project → Settings → API**

> ⚠️ Never commit your `.env` file to GitHub. It is already in `.gitignore`.

---

## Supabase Setup

### 1. Create a new Supabase project
Go to [supabase.com](https://supabase.com), create a new project and note your project ref.

### 2. Run migrations
Go to **Supabase Dashboard → SQL Editor** and run each file in the `supabase/migrations/` folder in chronological order (oldest first based on the timestamp in the filename).

### 3. Update config.toml
Make sure `supabase/config.toml` has your correct project ref:
```toml
project_id = "your-project-ref"
```

### 4. Link via CLI and deploy functions
```bash
supabase login
supabase link --project-ref your-project-ref
supabase functions deploy create-checkout
supabase functions deploy confirm-payment
supabase functions deploy payment-webhook
supabase functions deploy auto-release
supabase functions deploy raise-dispute
supabase functions deploy send-notification
supabase functions deploy update-delivery
supabase functions deploy verify-kyc
```

---

## Interswitch Integration

PayGuard uses **Interswitch Webpay** for NGN payments.

### Credentials needed
Get these from your [Interswitch dashboard](https://developer.interswitchgroup.com):

| Secret | Description |
|---|---|
| `INTERSWITCH_MERCHANT_CODE` | Your merchant code e.g. `MX12345` |
| `INTERSWITCH_PAY_ITEM_ID` | Your pay item ID |
| `INTERSWITCH_CLIENT_ID` | API credentials → Client ID |
| `INTERSWITCH_SECRET_KEY` | API credentials → Secret Key |

### Set secrets via CLI
```bash
supabase secrets set INTERSWITCH_MERCHANT_CODE=your_value
supabase secrets set INTERSWITCH_PAY_ITEM_ID=your_value
supabase secrets set INTERSWITCH_CLIENT_ID=your_value
supabase secrets set INTERSWITCH_SECRET_KEY=your_value
supabase secrets set SITE_URL=https://your-frontend-url.com
```

Or set them in **Supabase Dashboard → Settings → Edge Functions → Secrets**.

### Sandbox vs Production URLs

| Environment | Payment Page | Status API |
|---|---|---|
| **Sandbox** | `https://newwebpay.qa.interswitchng.com/collections/w/pay` | `https://qa.interswitchng.com/collections/api/v1/gettransaction.json` |
| **Production** | `https://newwebpay.interswitchng.com/collections/w/pay` | `https://webpay.interswitchng.com/collections/api/v1/gettransaction.json` |

> ⚠️ The old `sandbox.interswitchng.com` URLs are deprecated and return a cookie-consent HTML page. Always use the `newwebpay.qa` URLs for sandbox testing.

### Sandbox test card
```
Card Number : 5061040000000000094
Expiry      : Any future date
PIN         : 1234
OTP         : 123456
```

---

## Edge Functions

| Function | Trigger | Description |
|---|---|---|
| `create-checkout` | Buyer clicks Pay | Creates Interswitch Webpay session, returns form params |
| `confirm-payment` | After Interswitch redirect | Verifies payment server-side, marks transaction as `funded` |
| `payment-webhook` | Interswitch POST notification | Background payment confirmation fallback |
| `auto-release` | Scheduled / manual | Auto-releases escrow after delivery timeout |
| `raise-dispute` | Buyer/seller action | Creates a dispute record and notifies admin |
| `send-notification` | Internal trigger | Sends SMS/email notifications |
| `update-delivery` | Seller action | Updates shipping/delivery status |
| `verify-kyc` | User onboarding | Verifies BVN/NIN via third-party KYC |

---

## Payment Flow

```
Buyer clicks "Pay"
      ↓
create-checkout (edge function)
  - Validates transaction
  - Calculates amount in kobo (1.5% fee, max ₦5,000)
  - Returns Webpay form params
      ↓
Frontend auto-submits hidden POST form
→ Interswitch Webpay payment page
      ↓
Buyer completes payment
→ Interswitch redirects to /pay/:id?resp=00&txnref=...
      ↓
confirm-payment (edge function)
  - Calls Interswitch status API to verify server-side
  - Checks ResponseCode === "00"
  - Verifies amount matches
  - Updates transaction status to "funded"
      ↓
Funds held in escrow
      ↓
Seller ships → Buyer confirms → Funds released
```

---

## Deployment

### Vercel (Frontend)

1. Push your code to GitHub
2. Connect your repo to [vercel.com](https://vercel.com)
3. Add environment variables in **Vercel → Settings → Environment Variables**:
```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
```
4. Deploy

### Supabase (Backend)
Edge functions are deployed via the Supabase CLI as shown above. Re-deploy any function after making changes:
```bash
supabase functions deploy function-name
```

---

## Support

For issues or questions open a GitHub issue or contact **support@payguard.ng**

---

## License

MIT © PayGuard