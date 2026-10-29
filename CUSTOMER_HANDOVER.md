# BizManager customer handover checklist

## 1. Before deployment

- Use separate production Supabase and Resend projects.
- Configure both the Supabase transaction-pooler `DATABASE_URL` for the app and the Supabase direct `DIRECT_URL` (port 5432) for Prisma migrations.
- Keep `backend/.env` and `frontend/.env` outside version control.
- Generate a unique random `JWT_SECRET` of at least 16 characters.
- In Vercel, set the Production environment variable `VITE_API_URL` to `https://<your-render-service>.onrender.com/api`, replacing the placeholder with the actual Render service hostname. Do not include quotes or a trailing slash; redeploy after changing it.
- In Render, set `FRONTEND_URL` to the exact production Vercel origin, such as `https://your-app.vercel.app` (scheme and hostname only, no path or trailing slash). Add any additional custom or preview frontend origins to `ALLOWED_ORIGINS` as a comma-separated list of exact origins.
- Use a verified Resend sender domain in `EMAIL_FROM`.
- Keep `EMAIL_VERIFICATION_REQUIRED=true` to preserve verification for existing pending accounts.
- Set strong, temporary seed credentials only if initial seeding is required, then rotate or remove them.

## 2. Database safety

Run these commands only against the intended Supabase project:

```powershell
npm run prisma:generate
npx prisma migrate deploy --schema backend/prisma/schema.prisma
```

Never use `prisma migrate reset`, `TRUNCATE`, `DROP TABLE`, or a forced database reset on customer data.

Confirm the API can reach PostgreSQL:

```powershell
Invoke-WebRequest http://localhost:4000/health
```

The response must include `"database":"ok"`.

## 3. Start the application

From the project root:

```powershell
npm install
npm run build
npm run dev
```

If port 4000 is already in use, inspect the process before stopping it:

```powershell
Get-NetTCPConnection -LocalPort 4000 -State Listen |
  Select-Object LocalPort,OwningProcess
Get-Process -Id <PID>
```

## 4. First administrator setup

1. Create or provision the first Admin account securely.
2. Verify its email address.
3. Confirm Admin access to Employees, Products, Reports, and Settings.
4. Create employee accounts from Employees, then securely give each employee their temporary password.
5. Never grant Admin by editing browser storage or frontend code.

The one-time provisioner refuses to run if an Admin or the requested email already exists. Run `npm run provision:admin --workspace backend` only in a trusted environment configured for the intended production database, with `ADMIN_EMAIL` and `ADMIN_PASSWORD` supplied through protected environment variables (use a unique password of at least 12 characters). The check and account creation run in a serializable transaction. Do not put credentials in command-line arguments, logs, source control, or chat; remove temporary environment variables after use.

To inspect an existing Admin without changing it, set `ADMIN_RESET_EMAIL` to its expected email and run `npm run reset:admin --workspace backend` without `ADMIN_RESET_CONFIRM=YES`; this preview does not require or print a password. For an intentional reset, first verify the script's database connection points to the production Supabase project, then set `ADMIN_RESET_PASSWORD` securely and `ADMIN_RESET_CONFIRM=YES`. The reset applies only when exactly one Admin exists and its email matches `ADMIN_RESET_EMAIL`; it will not create or rename an account. Clear temporary variables when finished.

## 5. Smoke test

- Create a test employee from Employees and securely record the temporary password.
- Log in as that employee, change the temporary password when prompted, and refresh the browser to test session restoration.
- Create an invoice with a manual line item.
- Create an invoice using a catalog product and confirm stock decreases.
- Open the saved invoice and verify its generated transaction number.
- Search invoices and apply date filters.
- Open Reports and confirm totals are based on saved transactions.
- As Admin, edit Settings and refresh to confirm persistence.
- As Employee, confirm Admin-only actions are unavailable and rejected by the API.

## 6. Email delivery

Resend testing senders may only deliver to the Resend account email. For a real customer, verify the sending domain and use an approved `EMAIL_FROM` address. Existing accounts that are still pending verification can use Login → Resend verification after correcting Resend configuration.

## 7. Backup and rollback

- Take a Supabase backup before production migration or release.
- Keep the previous application build available.
- Roll back application code first if needed.
- Do not roll back by deleting database rows or reverting migrations destructively.
- Investigate failed migrations with Prisma status and Supabase migration history.

## 8. Invoice persistence status

The invoice form persists customer contact, discount, tax, payment status, and payment method fields on `Transaction`. Migration `20261015010000_add_transaction_invoice_fields` has been applied, and Prisma reports that the database schema is up to date.
