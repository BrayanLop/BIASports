This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Environment variables

This project requires a Postgres connection string for Prisma.

1) Create a `.env` file in the project root (you can start from `.env.example`).
2) Set at least `DATABASE_URL`.

Then generate Prisma Client:

```bash
npx prisma generate
```

Optional: real matches

- If `SPORTS_API_KEY` is set, `GET /api/matches` will use api-sports.io.
- If `SPORTS_API_KEY` is empty, `GET /api/matches` will use TheSportsDB (free) schedule endpoints.

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

### Prisma Studio (view your DB)

After setting `DATABASE_URL`:

```bash
npx prisma studio
```

## Deploy to Railway (DB + SSO)

High-level checklist:

1) Create a Railway project from your GitHub repo.
2) Add a PostgreSQL service.
3) In your web service variables, set:
	- `DATABASE_URL` (from the Railway Postgres plugin)
	- `AUTH_SECRET`
	- `NEXTAUTH_URL` and `AUTH_URL` (e.g. `https://your-app.up.railway.app` or your custom domain)
	- `AUTH_TRUST_HOST=true`
	- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (if using Google)
	- Optional: `ALLOW_DANGEROUS_EMAIL_ACCOUNT_LINKING=false` to disable auto-linking OAuth by email
4) Google OAuth Console:
	- Authorized JavaScript origin: `https://your-domain`
	- Authorized redirect URI: `https://your-domain/api/auth/callback/google`
5) Prisma migrations run on start via `npm run start` (`prisma migrate deploy`).

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
