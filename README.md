This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## End-to-end tests (Robot Framework)

This project includes automated E2E and API tests using Robot Framework with the Browser (Playwright) and Requests libraries.

Run locally (requires Python 3.11+):

```bash
# Install Robot dependencies once
python3 -m pip install -r tests/robot/requirements.txt
python3 -m Browser.entry init

# Start Postgres (or ensure DATABASE_URL is reachable)
docker compose up -d postgres

# Run tests end-to-end (builds, seeds, starts app, runs Robot)
npm run test:e2e
```

Environment variables used by tests:

- BASE_URL (default: http://localhost:3000)
- PRISMA_DATABASE_URL (default: postgres://together:together@localhost:5433/together_dev)
- NEXTAUTH_SECRET (default for local test runner: devtestsecret)

CI publishes Robot `report.html`, `log.html`, and `xunit.xml` as workflow artifacts.

## Payments configuration

The platform supports immediate payments via Stripe (and is architected to support other gateways like CMI).

Environment variables required for Stripe:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=dev-cron-secret
```

Environment variables for Payzone:

```
PAYZONE_SECRET_KEY=your_payzone_hmac_secret
PAYZONE_GATEWAY_URL=https://secure.payzone.ma/checkout
```

Admin configuration for Payzone:

- Navigate to `Admin → Settings → Payments` and enable Payzone.
- Set default provider to Payzone if you want to route checkouts there.
- Fill Merchant ID, Site ID, Currency, and optional Gateway URL.
- Secrets are only via environment variables and not stored in the database.

Webhooks for Payzone:

- Configure Payzone IPN/notification to call `/api/webhooks/payzone` with signed parameters.
- Signature verification uses HMAC-SHA256 over sorted parameters (excluding the `signature` field).

Admin configuration:

- Navigate to `Admin → Settings → Payments` to set non-secret options and enable providers.
- Secrets (keys) are not stored in the database; manage them via environment variables.

Webhooks:

- Point the Stripe webhook to `/api/webhooks/stripe` and subscribe to at least:
  - `checkout.session.completed`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`

Expirations:

- Pending bookings auto-expire via `/api/system/expire-bookings` (POST). Protect the route with `X-CRON-KEY: $CRON_SECRET` header using your scheduler.

### Run tests without installing Python (Docker)

If you prefer to keep Python/Robot fully separate from the Node.js environment, use the Docker runner. Start the app locally (e.g. `npm run dev` or `npm run start`) and run:

```bash
# Build and run Robot in Docker; connects to your host app via host.docker.internal
bash tests/robot/docker-run.sh
```

Set `BASE_URL` if your app runs on a different port or host:

```bash
BASE_URL=http://host.docker.internal:4000 bash tests/robot/docker-run.sh
```
