# Play Store Release Readiness

This document records what is already configured, what must be verified or fixed before a public Google Play release, and the database options for the billing app. It is based on the repository and local checks on 2026-11-26. Hosting status, Play Console settings, and account ownership can change; confirm them with the project owner before release.

## Executive summary

- **Do not submit a production release yet.** The app's production EAS profile points to `https://billing-re5k.onrender.com`, but a health request to that host timed out during the check. Confirm the production API and its database are live before building a release.
- **MongoDB Atlas is the lowest-risk database choice for the current version.** The backend uses Mongoose throughout. Moving to Neon means replacing the backend's data layer and migrating existing data; it is not a hosting-only change.
- A production EAS build profile and Android package ID already exist, but the Play listing, owner access, signing/submission setup, server operations, and release tests still need confirmation.
- Dependency installation reported audit findings in both apps. Review and resolve applicable findings before release; do not apply broad automatic upgrades without testing.

## What is already in the repository

| Area | Current state | Release implication |
|---|---|---|
| Android build | `mobile/eas.json` has development, preview, and production profiles. Production enables `autoIncrement`. | EAS Build is configured in principle; verify the Expo account/project and credentials. |
| API URL | All EAS profiles set `EXPO_PUBLIC_API_BASE_URL` to `https://billing-re5k.onrender.com`. | A production build will use that host. The address must be confirmed as the friend's intended, maintained API. |
| Expo project | `mobile/app.json` contains an EAS project ID and an EAS Update URL. | The friend must confirm the project belongs to the right Expo account and that the release operator has access. |
| Android identity | `mobile/app.json` sets package ID `com.dhruv2010.mobile`, version `1.0.0`, and adaptive icons. | Confirm the owner wants this permanent Play application ID and version/name. |
| App display name | The Expo name and slug are `mobile`. | Replace/confirm the user-facing name before production branding and store listing. |
| Backend | `server/server.js` serves `/api/auth`, `/api/products`, `/api/customers`, and `/api/invoices` on `PORT` or `5000`. | It needs a persistent production host and a stable HTTPS URL. |
| Database | The backend uses Mongoose models for users, products, customers, and invoices. | Current production-compatible route is MongoDB (preferably managed MongoDB Atlas), not Neon without a migration. |
| Offline support | The app stores products, customers, invoices, and queued changes in local SQLite; `syncService` sends/receives changes through the API. | Test offline work, reconnect/sync, duplicate retries, and multi-device behavior before launch. |
| Local development server | A local test server was started with MongoDB at `127.0.0.1`. | This is only for local testing. It is not a production server and depends on this computer staying on. |
| Hosted API check | A request to the configured Render URL timed out during this check. | Re-test from a browser/network and hosting dashboard; a timeout alone does not prove the service is permanently down. |
| Dependencies | Installation reported 25 audit findings for mobile (including one critical) and 4 for server (including two critical). | Inspect the actual advisories and affected dependency paths, update safely, and re-test. These counts are not a substitute for triage. |

## Release blockers and required fixes

### P0 — Confirm the real production backend

1. Ask the repository owner whether `billing-re5k.onrender.com` is the intended production service and who controls its Render account.
2. Verify the service is deployed from the intended commit and remains available after inactivity/restarts. Test its root health response and the real mobile flows:
   - Register a test account.
   - Log in and fetch the account profile.
   - Create, edit, and delete a product and customer.
   - Create an invoice; confirm stock changes correctly.
   - Sync changes after disconnecting and reconnecting.
3. Configure the backend's environment variables in the hosting provider's secret settings, never in source control:
   - `MONGO_URI`: production MongoDB connection string.
   - `JWT_SECRET`: long, random, private signing secret.
   - `PORT`: use the provider's assigned port; the server already reads `process.env.PORT`.
4. Use a managed production database, not the developer's local MongoDB. Configure authentication, TLS, restricted network access where supported, backups, and a tested restore procedure.
5. Add/verify a readiness health check that reports whether the API can serve requests and the database is connected. In `server/server.js`, the database connection is initiated before `app.listen`, but it is not awaited; change startup so the service does not report ready before MongoDB connects, and exits visibly on a startup failure.
6. Confirm the mobile production build contains only the public API URL. Never put MongoDB credentials, JWT signing secrets, or other server secrets in EAS `EXPO_PUBLIC_*` variables or the app bundle.

### P0 — Validate authentication, tenant isolation, and data integrity

Before real customer data is used, the owner/developer should test and, where needed, fix:

- Every product, customer, and invoice query/update/delete must be scoped to the authenticated user. Existing controllers generally filter by `req.user.id`; keep that invariant for every new route and for any database migration.
- Validate request bodies and limits on all write endpoints. Return clear 4xx responses for invalid input instead of exposing internal/database errors as 500 responses.
- Apply sensible rate limits to registration and login; keep password hashing and JWT secrets server-side. Confirm password hashes are never returned by API responses.
- Validate that referenced customer and product IDs belong to the requesting user. Invoice creation currently creates the invoice using the signed-in user and applies stock updates only to that user's products; explicitly reject foreign/invalid references rather than accepting inconsistent invoice references.
- Test repeated sync submissions and retries. The mobile app uses a local sync queue; a retry after a timeout must not create duplicate invoices or decrement stock twice. Add an idempotency strategy (for example a unique per-user client-generated invoice ID) and transactionally apply invoice creation plus stock changes.
- Preserve invoice/customer/product consistency when deleting data. Decide how invoices behave if a customer or product is deleted, and test that behavior.
- Ensure financial calculations use a consistent precision/rounding strategy. Do not rely on binary floating-point behavior for persisted monetary totals without defined rounding and reconciliation tests.
- Confirm production logging does not include passwords, authorization tokens, full database connection strings, or unnecessary customer data.

### P0 — Confirm application identity and account ownership

Get the owner's written confirmation before creating the first public release:

- Final Play Store app name (currently the Expo name is `mobile`).
- Package/application ID (`com.dhruv2010.mobile`). Play treats the application ID as the app's permanent identity; do not change it casually after first publication.
- App icon, screenshots, short and full descriptions, support contact, and developer/publisher name.
- Which person or organization owns the Google Play Console, Expo/EAS project, source repository, Render service, and database. Invite collaborators with the least access needed; do not exchange account passwords.
- Whether this is an existing Play app (reuse its existing package/signing configuration) or a genuinely new listing.

### P1 — Complete the Play Console and signing setup

- Build a **production Android App Bundle (`.aab`)** using the EAS `production` profile. A development server/Expo Go session is not a Play release build.
- Confirm EAS Build credentials and Android app-signing configuration are controlled by the app owner. Keep keystores and credentials in EAS/Play's protected credential systems, with owner-approved recovery access; never commit them.
- Configure Google Play Console submission access and a production submit profile in `mobile/eas.json` or submit the signed AAB through Play Console. The existing `submit.production` object is empty, so submission credentials/access are not demonstrated by the repository.
- Upload first to an internal testing track. Install that exact AAB on physical Android devices and test upgrades, login, offline mode, syncing, invoices/PDF sharing/printing, permissions, and backend failure behavior.
- Complete the store listing, content rating, target audience, app access instructions for reviewers, ads declaration (if applicable), privacy policy URL, and Data safety form accurately.
- Review the current Play Console requirements for target API level, account verification, testing tracks, declarations, and submission deadlines. Those requirements can change; follow the requirements shown for this developer account at release time.
- Request only permissions that are actually used and explain them clearly in-app/store materials. Verify camera/photo access and notification behavior in a real EAS build, not only Expo Go.
- If offering an account, provide a user-accessible way to request account/data deletion and implement the associated server-side deletion/retention process as required by the applicable Play policies and laws. Document what happens to invoices and legally required records.

### P1 — Resolve dependency and production quality findings

Run in each project and review the full advisories:

```powershell
cd mobile
npm audit
npx expo install --check

cd ..\server
npm audit
```

- Fix critical/high-impact production dependency issues using compatible, reviewed upgrades. Avoid `npm audit fix --force` as an unreviewed shortcut.
- Run the app's available tests/build checks after dependency changes. Add targeted tests for authentication, tenant isolation, sync retries, invoice totals, and stock updates if those behaviors are not already covered.
- Check that required packages are not relying on unsupported Expo Go behavior. The device previously logged an Expo Go notification warning; validate the actual local/remote notification feature set in a development or preview build and document any feature limitation.
- Decide on a supported Node.js version for the backend host and pin/document it (for example with the host runtime setting or an `engines` field), then test deploys on that runtime.
- Add operational alerts/log review, database backup monitoring, and an incident/contact owner before onboarding real shops.

## Database choice: MongoDB Atlas vs Neon (PostgreSQL)

### Recommendation for the first Play release: keep MongoDB

The current backend is not database-agnostic: `server/config/db.js` calls `mongoose.connect`, and its controllers/models use Mongoose documents, MongoDB ObjectIds, Mongo query operators, and embedded invoice items. Switching to Neon would require a backend data-layer migration and API/sync validation. It will not make the current server work simply by changing a connection URL.

For the fastest, least risky launch, deploy the existing API with **MongoDB Atlas** (or another managed MongoDB provider), set a production `MONGO_URI`, secure network/database access, and test backups and restore. This aligns with the code already written. The mobile app should continue to communicate only with the HTTPS API; it should never connect directly to Atlas or Neon.

### When Neon/PostgreSQL could be a good choice

Neon is a managed PostgreSQL service. PostgreSQL can be a strong fit for billing data because relational constraints and transactions can help enforce invoice/customer/product relationships and make invoice creation plus stock updates atomic. Choose it if the owner has a clear reason—SQL/reporting needs, a team standard, existing Postgres expertise, or a deliberate long-term architecture decision—and has time to fund and test the migration.

Neon hosts the database, **not this Express API**. The Node.js backend still needs a separate public host. The mobile app must call that API over HTTPS, and only the backend should receive the Neon connection string.

### Expected Neon migration scope

1. **Choose and implement a PostgreSQL data layer.** Replace Mongoose models and calls with a maintained PostgreSQL driver or ORM (choose one, such as `pg` or Prisma). Add schema migrations and a repeatable deployment process.
2. **Design relational tables and constraints.** A likely starting point:
   - `users`: UUID primary key, unique normalized email, password hash, owner/shop fields, timestamps.
   - `products`: UUID primary key, `user_id` foreign key, product fields, numeric price/tax/discount columns, `other_details` as `JSONB` if its flexible structure is still needed.
   - `customers`: UUID primary key, `user_id` foreign key, contact fields and balance.
   - `invoices`: UUID primary key, `user_id` foreign key, customer reference plus customer name/phone snapshots, totals, tax/payment fields, timestamps.
   - `invoice_items`: invoice foreign key, optional product reference plus name/price snapshots, quantity, line total.
   - Index each tenant-owned table on `user_id` and common query/sync fields; add unique constraints such as normalized user email and an agreed per-user invoice identifier.
3. **Preserve tenant isolation.** Every query and write must include the authenticated user's ID. Add foreign keys/check constraints where appropriate; evaluate Postgres row-level security only if the team can operate and test it correctly.
4. **Use transactions.** Create the invoice, invoice items, and stock changes in one transaction. Define retry/idempotency behavior so offline sync cannot duplicate a sale.
5. **Keep the API contract stable where possible.** Continue returning JSON IDs as strings, but replace Mongo-specific `_id`/ObjectId assumptions consistently. The mobile sync code currently recognizes 24-hex Mongo IDs when resolving local product/customer references; that logic must be changed for UUID IDs. Test all create, update, pull, delete, and queued sync flows.
6. **Plan ID and data migration.** Export existing users/products/customers/invoices, map Mongo ObjectIds to UUIDs (or deliberately retain IDs as text), convert embedded invoice `items` into `invoice_items`, preserve timestamps and password hashes, validate row counts/totals/relationships, and retain a rollback backup.
7. **Deploy to staging first.** Run migrations, integration tests, multi-user isolation tests, offline sync tests, and invoice/stock reconciliation against a staging Neon database before production cutover.
8. **Cut over with a rollback plan.** Pause writes or use a carefully engineered migration window, take a final MongoDB backup, migrate final changes, switch the backend secret, verify the release, and keep the original database read-only until reconciliation and rollback windows expire. Do not attempt dual-write without explicit conflict/reconciliation design.
9. **Operate the service securely.** Use the provider's TLS-enabled connection string and appropriate pooled connection option for the chosen hosting topology; keep credentials in backend secret settings, restrict database roles, and verify backups/restore, connection limits, and cost/usage limits for the selected plans.

### Decision guide

| Situation | Suggested choice |
|---|---|
| Need to publish soon; current MongoDB API is the working design | MongoDB Atlas; fix and test the existing backend first. |
| Need SQL reports/relational guarantees and can budget engineering time for a migration | Neon/PostgreSQL; treat it as a separate backend project with staging and rollback. |
| The friend already owns a working Atlas database with production data | Keep it for this release; avoid a last-minute database migration. |
| The friend's hosting/Expo/Play accounts or production data ownership are unclear | Pause deployment and get ownership/access agreements resolved first. |

## Recommended execution order

1. Confirm ownership and intended production package/name with the friend.
2. Verify the hosted API and its managed production database; configure/validate secrets and readiness behavior.
3. Review authentication/data isolation, input validation, invoice idempotency/transactions, and backup/restore.
4. Triage dependency audit results and run the Expo compatibility check; add/fix tests for release-critical flows.
5. Choose MongoDB Atlas for the first release unless there is an explicit, funded Neon migration decision.
6. Configure/verify EAS access, app signing, Play Console access, and the production AAB.
7. Test on Play internal testing with realistic accounts and offline/sync scenarios; complete policy/listing declarations.
8. Roll out gradually and monitor API errors, database health, and user reports.

## Questions for the repository owner

- Is `billing-re5k.onrender.com` the intended production backend, and who maintains the Render service?
- Is the existing MongoDB development data disposable, or is there already production/customer data to preserve?
- Who owns the Expo project, Play Console, and Android signing credentials?
- Is `com.dhruv2010.mobile` the final application ID, and what should the Play Store display name be?
- Is a Neon migration a firm requirement or only a suggestion? What business/reporting requirement justifies the cost and migration risk?
- Who will own privacy policy, support contact, data deletion requests, database backups, and post-release incident response?

## References for the release operator

- Expo EAS Build: <https://docs.expo.dev/build/introduction/>
- Expo app submission: <https://docs.expo.dev/submit/introduction/>
- Expo app configuration: <https://docs.expo.dev/workflow/configuration/>
- Google Play Console Help: <https://support.google.com/googleplay/android-developer/>
- Neon documentation: <https://neon.tech/docs/>
- MongoDB Atlas documentation: <https://www.mongodb.com/docs/atlas/>
