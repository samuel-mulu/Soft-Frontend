# BG Stock — Brhane GebreCherkos (Next.js frontend)

Responsive cashier-first interface with desktop sidebar, mobile bottom navigation, TanStack React Query, Tailwind CSS v4 and live NestJS REST calls. No mock data.

## Start (Windows PowerShell)

1. Start the B0–B9 NestJS backend on port 4000; run Prisma migrations and seed the owner.
2. Open this frontend folder in VS Code.
3. `npm install`
4. `Copy-Item .env.example .env.local`
5. Verify `NEXT_PUBLIC_API_URL=http://localhost:4000/api` in `.env.local`.
6. `npm run dev`
7. Open `http://localhost:3000` and log in with your seeded owner credentials.

The NestJS backend CORS_ORIGIN should include `http://localhost:3000`. No backend keys or database credentials belong in the frontend .env file. Only a public API base URL is used.

## Features

- Owner and cashier sign-in with backend JWT; role-based navigation.
- Desktop-first cashier ergonomics, mobile-first responsive layouts and touch-friendly controls.
- Sales: customer/guest, multi-item cart, discounts, bottle returns, cash/bank/mobile payments.
- Customer creation, editing, status and history.
- Products and bottle types; supplier list; stock balances, movements and owner adjustments.
- Supplier purchases with multiple items and costs.
- Bottle-only returns and customer bottle ledger.
- Customer payments, expenses and supplier payments.
- Owner reports with date range, credit/bottles and daily CSV export.
- Invoice detail and basic browser printing.

## Important backend constraints

- Backend guest checkout requires full payment and does not track guest bottle liabilities.
- Bottle-only returns require a registered customer.
- Product creation and inventory adjustments are owner-only.
- Reports and user management are owner-only.
- Sale quantity is in individual units; `unitsPerCase` is shown as reference.
- Cashier dashboard uses recently loaded sales, not owner-only reports.
- Backend customer credit/payment and bottle ledgers are independent.
- JWT is stored in sessionStorage for this starter; for hardened production deployment prefer an httpOnly cookie/BFF design, HTTPS and proper session management.
- Printing is basic page printing, not a dedicated thermal receipt layout.
- The backend does not expose a sale cancellation/refund workflow or customer login. This frontend does not invent those features.

## Pages

`/login`, `/dashboard`, `/sell`, `/sales`, `/customers`, `/inventory`, `/products`, `/suppliers`, `/purchases`, `/bottles`, `/payments`, `/finance`, `/reports`, `/settings`.
