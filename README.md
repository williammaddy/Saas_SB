# BizFlow - Simple Business Management SaaS (OS)

> **Bring the important day-to-day work of a small business into one simple place.**

BizFlow is a production-quality, simple Business Management SaaS designed to replace fragmented notebooks, Excel spreadsheets, separate billing apps, and WhatsApp notes for small business owners.

---

## 🌟 Core Features in MVP

1. **Authentication & Multi-Tenancy:**
   - Secure session management with encrypted JWT cookies and bcrypt password hashing.
   - Strict server-side data isolation (`organizationId` on every organization entity).

2. **3-Step Streamlined Onboarding:**
   - Step 1: Business Name, Type (Retail, Salon, Service, Freelancer, Consultant, Repair, etc.), Phone, Email, Address.
   - Step 2: Country, Currency (INR default), Timezone, Date Format.
   - Step 3: GST Registration toggle (GSTIN, State Code, Default Tax Rate).

3. **Customers & Mandatory Walk-in Support:**
   - Generate bills instantly for **Walk-in Customers** with zero database friction.
   - Customer directory with lifetime sales, total settled payments, and live outstanding balances.
   - Full customer transaction statement profile.

4. **Unified Items (Products & Services):**
   - Products: Selling price, purchase price, GST tax rate, unit, stock tracking, and minimum stock threshold.
   - Services: Selling price, GST tax rate, estimated duration (no stock needed).
   - Low-stock alerts triggered when `stock <= minimumStock`.

5. **Sales / 1-Page Lightning-Fast Quick Bill (POS):**
   - Customer selection (default: Walk-in Customer).
   - Searchable product & service catalog with 1-click addition.
   - Automatic decimal tax and discount calculations (eliminating floating-point errors).
   - Payment method toggle: Cash, UPI / QR, Card, Credit (Unpaid).
   - Atomic inventory decrement when products are sold.

6. **Invoicing & Centralized GST Engine:**
   - Intra-state (CGST + SGST) vs Inter-state (IGST) automatic breakdown based on state codes.
   - Clean non-GST bill mode (no confusing tax jargon when GST is off).
   - Printable invoices (`@media print` stylesheet) and PDF-ready documents.
   - Payment status badges: Paid, Partially Paid, Issued, Cancelled (restores stock).

7. **Payments Tracking:**
   - Record partial or full payments against invoices with reference IDs.
   - Real-time balance updating and status transition.

8. **Operational Expenses:**
   - Log daily expenses across Rent, Salary, Electricity, Internet, Transport, Marketing, Maintenance, Other.
   - Category breakdown and monthly spend summaries.

9. **Dashboard Command Center:**
   - Key Metrics: Today's Sales, Pending Collections, Today's Expenses, Total Customers, Low Stock alerts.
   - Prominent Quick Actions (+ New Bill, + Customer, + Item, + Expense).
   - Sales chart period toggle (Today, This Week, This Month).
   - Recent invoices and pending receivable collection shortcuts.

10. **Reports:**
    - Sales report, expense report, payment collections, and top-selling items.
    - Period filters: Today, This Week, This Month, All Time, Custom Range.

---

## 🛠 Tech Stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Styling:** Tailwind CSS, Lucide React
- **Database:** PostgreSQL with Prisma ORM
- **Financial Precision:** `decimal.js` & PostgreSQL `Decimal(12,2)`
- **Validation:** Zod schemas
- **Testing:** Vitest automated test suite

---

## 🚀 Getting Started

### 1. Environment Configuration
Copy `.env.example` to `.env` and configure your PostgreSQL database connection:
```bash
cp .env.example .env
```

### 2. Start PostgreSQL
```bash
npm run db:up
```

### 3. Database Sync & Seed
```bash
# Push Prisma schema to PostgreSQL
npm run prisma:push

# Seed with realistic demo store data
npm run prisma:seed
```

### 4. Demo Credentials
- **Email:** `demo@bizflow.app`
- **Password:** `password123`

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Run Automated Tests
```bash
npm run test
```
All unit tests and end-to-end business workflow integration tests run automatically.

---

## Deploy (Vercel + Neon)

1. Neon is already the production database. Keep `sslmode=require` on `DATABASE_URL`.
2. In [Vercel](https://vercel.com), import the GitHub repo (`williammaddy/Saas_SB`) or run `npx vercel`.
3. Set environment variables for Production (and Preview):

| Name | Value |
|---|---|
| `DATABASE_URL` | Neon connection string (`sslmode=require`) |
| `JWT_SECRET` | Long random secret (32+ characters) |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` (update after first deploy) |

4. Deploy. Prisma Client is generated in `postinstall` / `npm run build`.
5. Sign in with `demo@bizflow.app` / `password123`.

Do not commit `.env`. Rotate the Neon password if it was ever pasted in chat.
