# Vreymar Hardware, Web System

A web-based Point-of-Sale, Inventory Management and Online Ordering system with AI-assisted cost estimation for Vreymar Hardware (Bagumbong, Caloocan City). It's built from the MNTSDEV prototypes and the project documentation, and covers Sprints 1–9: accounts, POS, inventory, reports, deliveries, product browsing, cart/checkout, AI estimation and replacements.

## Run it

```bash
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Then open http://localhost:8080. The site starts at the sign-in page: customers go to the store (`home.html`), staff go to the staff portal. "Browse the store as a guest" skips sign-in until checkout.

## Demo accounts (prototype only, change these before deployment)

| Role | Name | Username | Password | Can open |
|---|---|---|---|---|
| Customer | John Allain Valenton | `customer` | `Customer@123` | Store, cart, checkout, My Account |
| Admin | Vince Zuñiga | `admin` | `Admin@123` | Every staff module |
| Cashier | Mhenald Joseph Para-on | `cashier` | `Cashier@123` | Dashboard, POS, Reports |
| Inventory Staff | Hilario Gonzales | `inventory` | `Inventory@123` | Dashboard, Inventory, Orders & Deliveries, Reports |

## Pages

**Storefront**
- `index.html`: entry point, redirects to sign-in
- `login.html`: sign in, create account, guest browsing, Google/Facebook buttons (placeholders until Supabase Auth)
- `home.html`: home page with the live estimate slip
- `materials.html`: catalog with filters, quick view and live stock
- `estimate.html`: Estimate AI. Describe the project, give the area and budget, and optionally add blueprint and spec details. You get a priced bill of materials that you can edit and add to the cart in one click.
- `cart.html`: cart, delivery or free store pickup, promo codes (`VREYMAR10`, `NEWCUST20`, `FREESHIP`) and checkout. Checkout has a delivery calendar with time slots and fully booked days, plus Cash on Delivery, GCash QR or Maya QR with a proof-of-payment upload. Bulk orders of ₱50k+ have a 7-day lead time.
- `account.html`: order tracking, cancel or reorder, replacement requests (eligibility check, quotation, wait-or-refund choice), profile and password
- `about.html`: store info, Terms & Conditions (including what happens when an item is unavailable) and the Return & Replacement Policy

**Staff portal (`admin/`)**, with access based on role
- `index.html`: dashboard with KPIs, a 7-day sales chart, low stock, and upcoming deliveries
- `pos.html`: point of sale with SKU entry, discounts (including Senior/PWD), cash change, e-wallet reference, hold/recall and printable receipts, plus a transactions log and CSV export
- `inventory.html`: product and category management, stock adjustments with an audit trail, a restock list, and a stock movement history
- `orders.html`: online order workflow (delivery or pickup) (pending → confirmed → preparing → out for delivery → delivered, or cancel with stock restored), a delivery schedule, and replacement handling: approve, stock check, Waiting for Stock, send when restocked, or refund
- `reports.html`: sales and inventory reports covering revenue trend, top products, categories, payment methods and channels, a restocking report, and slow movers
- `users.html`: staff account management (create, edit, reset password, deactivate) and a role permission matrix

## How it fits together

- `assets/js/store.js` is the single data layer. Products, users, orders, POS transactions, replacements and the stock log all live here, so a POS sale or an online order immediately changes the stock seen in the catalog, inventory and reports.
- `assets/js/estimator.js` is the estimation engine. It uses standard Philippine construction ratios (for example 12.5 CHB/sqm, about 11 tiles/sqm at 30×30, adhesive coverage) and prices every line from the live catalog. To swap in an LLM later, have it return the project type, area and includes, then call `Estimator.generate()`.
- Data is kept in browser `localStorage`, which suits a prototype or demo. For production, replace the `read`/`write` functions in `store.js` with calls to your backend API and database. Run `VH.seed(true)` in the browser console to reset the demo data.

## Design system (Nov 2026 redesign)
- Look: "The shelf, catalogued". Every product sits on a tile in the colour of its material (concrete, steel, PVC blue, copper, clay, safety yellow, lumber, moss). Details are in `DESIGN.md`.
- Colour is OKLCH with alpha borders. There are light and dark themes: use the moon/sun button in the nav or the staff top bar. In dark, depth comes from lighter surfaces.
- Type: General Sans (Fontshare). Icons are one line family whose stroke follows the text weight.

## Adding real product photos
Photos are placeholders for now (the drawn artwork on each tile). To add one:
1. Save a photo of the item on a **white background** in `assets/img/products/`.
2. Map it in `assets/js/photos.js`, by SKU or by category:
   `window.VH_PHOTOS = { 'EL-005': 'assets/img/products/el-005.jpg', 'cat-9': 'assets/img/products/hollow-block.jpg' };`

The site blends photos with `mix-blend-mode: multiply`, so the white background takes on the tile colour.
