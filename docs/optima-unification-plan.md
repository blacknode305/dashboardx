# Optima unified data — incremental migration plan

Date: 2026-11-08. This is a **design and frontend foundation**, not a live database migration.

## Existing source of truth

PRO OPTIMA currently serves the shared data from the Railway-mounted \`/var/data/database.json\` (and \`/var/data/meta.json\`). DashboardX reads the same data via authenticated PRO OPTIMA endpoints. The existing collection keys are \`products\`, \`suppliers\`, \`supplierCatalog\`, \`offers\`, \`history\`, \`stocks\`, \`dateRequests\`, \`declarations\`, \`branches\` and \`settings\`. The physical root is still legacy PRO OPTIMA; introducing a logical \`dashboardx.optima\` namespace is the **target**, not yet reality.

## What the first DashboardX change does

* Keeps \`optimaOrders\` ("Заявки") in the Optima widget category.
* Adds \`optimaSettings\` to manage connection, in-tab write password, branch PIN controls and read-only JSON backup.
* Adds a **read-only** \`optimaPassport\` that aggregates product, supplier catalog, offers, orders and stock history from the current API.
* Shows supplier-related declaration candidates, explicitly **not** treating a supplier-level match as proof that a particular product is covered.
* Preserves original price units and does **not** compare prices per unit until verified package-to-base-unit conversion is stored.

The new widgets write no existing product, supplier, declaration, order, or stock values when simply opened.

## Data model proposal (additive first)

Logical \`optima\` contains: \`nomenclature\`, \`supplierProducts\`, \`supplierOffers\`, \`priceHistory\`, \`documents\`, \`documentCoverage\`, \`receipts\`, \`stockBalances\`, \`stockLots\`, \`orders\`, \`deliverySchedules\`, \`branchAccess\`. Use stable IDs and join tables, not inferred name equality. Document coverage is verified by the responsible operator using supplier consultation or invoices and manufacturer/product/marking evidence.

## Deployment gates before restructuring the root JSON

1. Export an actual snapshot of Railway \`database.json\`, \`meta.json\`, \`access.json\`, AND binary declaration attachments, and test restoring it.
2. Audit current auth for \`GET /api/db\`, administrative mutations and branch/dispatcher credentials. Current protection is not equivalent to the required Admin Token **plus** administrator password for all protected operations.
3. Introduce versioned \`/api/dashboardx/optima/v1/*\` routes while keeping legacy endpoints functional during migration; add server-side role checks and rate limits.
4. Convert PRO OPTIMA admin/production to new API in stages. Remove the dispatcher UI only when branch production workflows and authorization have been regression-tested.
5. Backfill canonical links from \`supplierCatalog.usedProductId\` and \`products.catalogLinks\`; **do not** automatically validate documents by matching names.
6. Record per-offer packaging count/weight, purchase unit and base unit, then create price history; preserve procurement by boxes where appropriate.
7. Backfill provenance of stock only where invoice/receipt data exists; show unknown supplier for legacy stock without provenance.
8. Run dual-read comparisons, verify revisions, run integration tests and monitor latency; only then switch write paths.

Protected Suppliers widget: no changes to \`client/_optimaSuppliers.html\`, \`client/js/module/Widget/OptimaSuppliers.js\` or supplier-specific styles without separate approval.

## Security debt that must be resolved before production rollout

The server advertises \`X-Optima-Write-Password\` in CORS but currently does not validate it in the main protected API paths; \`GET /api/db\` exposes data without a token. The new frontend controls alone **do not fix those server issues**. Avoid calling the two-step design enforced until the backend is updated and verified. Existing Admin Token is stored by the shared CredentialStore and needs migration to session-only credentials or a server-managed secure session as part of security rollout.
