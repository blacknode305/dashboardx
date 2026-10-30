# DashboardX — approved OPTIMA Suppliers widget (protected baseline)

Approved by project owner: 2026-10-30.

## Protected scope

Widget: `client/_optimaSuppliers.html`, `client/js/module/Widget/OptimaSuppliers.js`, supplier-specific rules in `client/css/style.css`; also relevant supporting code, including APIs, translations, global widget styling and imports, insofar as they affect the supplier widget.

The current supplier widget layout, filters, inline '+' before search, adding/editing suppliers, day toggles, per-order-day delivery timing options (default/same/next/two), and data handling are APPROVED. Preserve their behavior and visual appearance.

**Do not modify the protected widget, its styles, logic, data schema, dependencies or its visible behavior without first explaining the proposed specific change and obtaining explicit approval from the user.** This includes changes made indirectly when implementing another OPTIMA widget. Avoid generic or incidental refactors impacting the protected widget. If urgent security work requires a change, first present the issue and request permission before changing it.

Continue improving other OPTIMA widgets sequentially without changing this one. A later explicit approval may supersede this rule for a precisely described change; do not infer blanket permission from approval for unrelated work.

Data source: the widget reads `GET /api/admin/db` from PRO OPTIMA Railway and updates via revision-guarded `PATCH /api/admin/db`. Database values are not embedded here.

Implementation notes: supplier data comprises stable `id`, `name`, `contact`, `phone`, optional other fields, and `schedules` per branch, with `order`, `delivery`, `note`, and optional `deliveryTimingByDay` entries (`same`, `next`, `two`; absent => default). Preserve unknown schema fields.
