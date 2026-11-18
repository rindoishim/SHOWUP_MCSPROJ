/* ==========================================================================
   Vreymar Hardware, shared data layer
   All modules (storefront, POS, inventory, deliveries, reports, users) read
   and write the same records, so a sale in the POS or an online order
   updates the stock that the inventory and catalog show.
   Persistence: browser localStorage (prototype). Swap these functions for
   API calls when the backend/database is ready.
   ========================================================================== */
(function (global) {
  'use strict';

  const SEED_VERSION = 5;
  const K = {
    version: 'vh_seed_version',
    categories: 'vh_categories',
    products: 'vh_products',
    users: 'vh_users',
    session: 'vh_session',
    cart: 'vh_cart',
    orders: 'vh_orders',
    tx: 'vh_transactions',
    reps: 'vh_replacements',
    stocklog: 'vh_stocklog',
    held: 'vh_held_orders'
  };

  /* ---------- storage helpers ---------- */
  function read(key, def) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; }
    catch (e) { return def; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { console.warn('Storage full or blocked', e); return false; }
  }

  /* ---------- formatting ---------- */
  const peso = n => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pesoShort = n => '₱' + Math.round(Number(n || 0)).toLocaleString('en-PH');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDate = d => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  const fmtDateTime = d => new Date(d).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  const fmtLongDate = d => new Date(d).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const daysAgo = (n, h = 10, m = 0) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, m, 0, 0); return d.toISOString(); };

  /* ---------- business rules ---------- */
  const RULES = {
    VAT: 0.12,
    DELIVERY_FEE: 149,
    FREE_DELIVERY_MIN: 5000,
    BULK_MIN: 50000,          // bulk orders must be reserved one week ahead
    BULK_LEAD_DAYS: 7,
    RETURN_DAYS: 7,           // replacement requests must be filed within 7 days of delivery/pickup
    STOCK_WAIT_DAYS: 14,      // after 14 days waiting for stock, the customer is refunded
    REFUND_DAYS: '3–7 business days',
    STORE: {
      name: 'Vreymar Hardware',
      address: 'Blk 8 Lot 1-A, Tierra Nova Main Subdivision, Caloocan, 1421 Metro Manila',
      /* What the About page map searches on Google Maps. Leave empty to use the address above.
         For an exact pin, put the store's full street address, its business name as listed on
         Google Maps (e.g. 'Vreymar Hardware, Bagumbong, Caloocan'), or coordinates ('14.7491,121.0306'). */
      mapsQuery: 'Vreymar Mini Hardware, Blk 8 Lot 1-A, Tierra Nova Main Subdivision, Caloocan, 1421 Metro Manila',
      phone: '(02) 8-123-4567',
      mobile: '0917-000-0000',
      email: 'hello@vreymarhardware.ph',
      hours: 'Mon–Sat, 8:00 AM – 6:00 PM'
    }
  };

  const PROMOS = {
    VREYMAR10: { pct: 10, label: '10% off your order' },
    NEWCUST20: { pct: 20, label: '20% off for new customers' },
    FREESHIP: { pct: 0, freeShip: true, label: 'Free delivery' }
  };

  const ROLES = {
    CUSTOMER: 'Customer',
    ADMIN: 'Admin',
    CASHIER: 'Cashier',
    INVENTORY_STAFF: 'Inventory Staff'
  };

  /* Which staff modules each role can open */
  const ACCESS = {
    ADMIN: ['dashboard', 'pos', 'inventory', 'orders', 'reports', 'users'],
    CASHIER: ['dashboard', 'pos', 'reports'],
    INVENTORY_STAFF: ['dashboard', 'inventory', 'orders', 'reports'],
    CUSTOMER: []
  };

  /* ---------- seed data ---------- */
  const SEED_CATEGORIES = [
    { id: 1, name: 'Fasteners', icon: '', color: 'yellow', desc: 'Bolts, nuts, screws, nails & anchors' },
    { id: 2, name: 'Power Tools', icon: '', color: 'blue', desc: 'Drills, grinders, saws' },
    { id: 3, name: 'Hand Tools', icon: '', color: 'green', desc: 'Hammers, wrenches, trowels' },
    { id: 4, name: 'Electrical', icon: '', color: 'red', desc: 'Wires, breakers, outlets, lighting' },
    { id: 5, name: 'Plumbing', icon: '', color: 'blue', desc: 'Pipes, fittings, valves, fixtures' },
    { id: 6, name: 'Paint & Finish', icon: '', color: 'purple', desc: 'Paint, primer, skim coat, varnish' },
    { id: 7, name: 'Safety', icon: '', color: 'yellow', desc: 'Helmets, gloves, goggles' },
    { id: 8, name: 'Lumber & Boards', icon: '', color: 'gray', desc: 'Plywood, lumber, gypsum, furring' },
    { id: 9, name: 'Masonry & Steel', icon: '', color: 'red', desc: 'Cement, hollow blocks, aggregates, rebar' },
    { id: 10, name: 'Tiles & Flooring', icon: '', color: 'green', desc: 'Floor & wall tiles, adhesive, grout' },
    { id: 11, name: 'Roofing', icon: '', color: 'gray', desc: 'Roof sheets, purlins, screws, sealant' },
    { id: 12, name: 'Doors & Hardware', icon: '', color: 'purple', desc: 'Doors, knobs, hinges' }
  ];

  // [id, sku, name, catId, price, cost, stock, threshold, unit, brand, rating, badge, orig, desc]
  const P = [
    [1, 'HW-001', 'Hex Bolt M12 × 50mm', 1, 8.5, 4, 250, 30, 'pcs', 'FastenPro', 4.8, 'hot', null, 'Zinc-plated, high-tensile hex bolt for structural connections.'],
    [2, 'HW-002', 'Steel Nut M12', 1, 3, 1.5, 300, 50, 'pcs', 'FastenPro', 4.5, null, null, 'Zinc-plated steel nut for M12 bolts.'],
    [3, 'HW-003', 'Flathead Wood Screw 3"', 1, 2.5, 1, 18, 20, 'pcs', 'BuildRight', 4.2, null, null, 'Self-tapping bugle-head screw for wood.'],
    [4, 'HW-004', 'Anchor Bolt 3/4" × 6"', 1, 45, 28, 120, 20, 'pcs', 'FastenPro', 4.6, 'sale', 55, 'Expansion anchor for concrete and masonry.'],
    [5, 'HW-005', 'Common Wire Nails 2" (1kg)', 1, 48, 30, 200, 30, 'kg', 'Generic', 4.4, 'hot', null, 'Bright common wire nails for general carpentry.'],
    [6, 'HW-006', 'Concrete Nails 2" (1kg)', 1, 75, 45, 90, 20, 'kg', 'Generic', 4.3, null, null, 'Hardened concrete nails for masonry fastening.'],
    [7, 'PT-001', 'Angle Grinder 4"', 2, 1850, 1200, 12, 5, 'pcs', 'PowerMax', 4.9, 'hot', 2100, '750W, 11,000 RPM, includes 2 grinding discs.'],
    [8, 'PT-002', 'Electric Drill 13mm', 2, 2200, 1500, 8, 5, 'pcs', 'PowerMax', 4.7, 'new', null, '500W reversible variable-speed drill, keyless chuck.'],
    [9, 'PT-003', 'Jigsaw 500W', 2, 3200, 2200, 5, 4, 'pcs', 'CutPro', 4.6, 'sale', 3800, 'Pendulum jigsaw with 4 orbital settings.'],
    [10, 'PT-004', 'Circular Saw 7-1/4"', 2, 4500, 3100, 6, 3, 'pcs', 'CutPro', 4.8, null, null, '1400W, 5,800 RPM, 0–45° bevel cut.'],
    [11, 'HT-001', 'Claw Hammer 16oz', 3, 185, 100, 35, 10, 'pcs', 'ToolKing', 4.5, null, null, 'Fiberglass handle with anti-vibration grip.'],
    [12, 'HT-002', 'Adjustable Wrench 12"', 3, 320, 175, 22, 8, 'pcs', 'ToolKing', 4.7, null, null, 'Chrome-vanadium steel, 0–35mm jaw.'],
    [13, 'HT-003', 'Tape Measure 5m', 3, 95, 50, 3, 10, 'pcs', 'MeasurePro', 4.4, 'sale', 120, 'Auto-lock blade with nylon coating.'],
    [14, 'HT-004', 'Spirit Level 24"', 3, 280, 160, 18, 5, 'pcs', 'LevelPro', 4.6, 'new', null, 'Aluminum body, 3 vials, ±0.5mm/m accuracy.'],
    [15, 'HT-005', 'Masonry Trowel 7"', 3, 120, 65, 40, 10, 'pcs', 'ToolKing', 4.3, null, null, 'Forged steel trowel with wood handle.'],
    [16, 'HT-006', 'Paint Roller Set 9"', 3, 165, 90, 30, 8, 'set', 'ColorMaster', 4.4, null, null, 'Roller frame, 2 covers and tray.'],
    [17, 'EL-001', 'Circuit Breaker 20A', 4, 650, 380, 40, 15, 'pcs', 'ElecSafe', 4.9, 'sale', 820, 'Single-pole plug-in breaker, PEC compliant.'],
    [18, 'EL-002', 'THHN Wire 2.0mm² (per meter)', 4, 12, 7, 600, 100, 'm', 'Pacific Supreme', 4.7, null, null, 'Copper THHN, heat and moisture resistant. For lighting circuits.'],
    [19, 'EL-003', 'THHN Wire 3.5mm² (per meter)', 4, 19, 11, 400, 80, 'm', 'Pacific Supreme', 4.6, null, null, 'Copper THHN for outlet and appliance circuits.'],
    [20, 'EL-004', 'Duplex Outlet 3-Pin with Plate', 4, 185, 100, 60, 15, 'pcs', 'Panasonic', 4.4, null, null, '15A 250V universal outlet with grounding.'],
    [21, 'EL-005', '1-Way Switch with Plate', 4, 120, 65, 70, 15, 'pcs', 'Panasonic', 4.5, null, null, '10A 250V rocker switch for lighting.'],
    [22, 'EL-006', 'LED Bulb 9W Daylight', 4, 145, 80, 80, 20, 'pcs', 'Philips', 4.8, null, null, '806 lumens, E27 base, 15,000-hour life.'],
    [23, 'EL-007', 'LED Downlight 10W', 4, 220, 130, 55, 10, 'pcs', 'BrightPH', 4.8, 'sale', 280, 'Slim recessed panel, 3000K warm white.'],
    [24, 'EL-008', 'PVC Conduit 1/2" × 3m', 4, 85, 45, 120, 30, 'pcs', 'Western Tube', 4.4, null, null, 'Rigid PVC conduit for concealed wiring.'],
    [25, 'EL-009', 'Exhaust Fan 8"', 4, 950, 600, 14, 4, 'pcs', 'Panasonic', 4.6, null, null, 'Ceiling/wall exhaust fan for bathrooms and kitchens.'],
    [26, 'PL-001', 'PVC Pipe 1/2" S40 × 10ft', 5, 58, 30, 150, 30, 'pcs', 'Neltex', 4.5, null, null, 'Schedule 40 pressure pipe for potable water.'],
    [27, 'PL-002', 'PVC Sanitary Pipe 4" × 10ft', 5, 320, 190, 45, 10, 'pcs', 'Neltex', 4.5, null, null, 'For toilet drains and sewer lines.'],
    [28, 'PL-003', 'PVC Elbow 90° 1/2"', 5, 18, 8, 300, 50, 'pcs', 'Neltex', 4.3, 'new', null, '90-degree Schedule 40 elbow fitting.'],
    [29, 'PL-004', 'PVC Fittings Set', 5, 480, 280, 20, 5, 'set', 'Neltex', 4.5, null, null, 'Elbows, tees, couplings and unions, 1/2" and 3/4".'],
    [30, 'PL-005', 'Ball Valve 3/4" Brass', 5, 220, 120, 0, 10, 'pcs', 'ValveKing', 4.6, null, null, 'Full-port brass ball valve, chrome handle.'],
    [31, 'PL-006', 'Gate Valve 1/2" Brass', 5, 380, 220, 25, 8, 'pcs', 'Kitz', 4.7, 'sale', 450, 'Full-bore gate valve, PN16 rated.'],
    [32, 'PL-007', 'Toilet Bowl Set (Economy)', 5, 3200, 2200, 10, 3, 'set', 'HCG', 4.3, null, null, 'Close-coupled toilet, single flush, with fittings.'],
    [33, 'PL-008', 'Toilet Bowl Dual Flush', 5, 5800, 4100, 6, 2, 'set', 'American Standard', 4.8, null, null, 'Close-coupled, 3L/6L dual flush, vitreous china.'],
    [34, 'PL-009', 'Shower Head Set with Arm', 5, 1200, 700, 15, 4, 'set', 'Peerless', 4.5, null, null, '5 spray settings, 300mm stainless arm.'],
    [35, 'PL-010', 'Lavatory Sink with Drain', 5, 2200, 1400, 9, 3, 'set', 'Natividad', 4.4, null, null, 'Ceramic lavatory 500×400mm with drain assembly.'],
    [36, 'PL-011', 'Floor Drain 4" Stainless', 5, 260, 140, 30, 8, 'pcs', 'Generic', 4.2, null, null, 'Stainless strainer with trap.'],
    [37, 'PL-012', 'Kitchen Sink Stainless Single Bowl', 5, 2650, 1800, 7, 2, 'set', 'Primus', 4.6, null, null, 'Stainless sink with strainer, 80×50cm.'],
    [38, 'PL-013', 'Kitchen Faucet Gooseneck', 5, 980, 600, 12, 3, 'pcs', 'Primus', 4.5, null, null, 'Swivel gooseneck faucet, chrome finish.'],
    [39, 'PL-014', 'Teflon Tape', 5, 25, 10, 200, 40, 'roll', 'Generic', 4.2, null, null, 'PTFE thread seal tape.'],
    [40, 'PA-001', 'Latex Paint White 4L', 6, 580, 380, 25, 8, 'gal', 'Boysen', 4.8, null, null, 'Interior/exterior latex, washable, mildew resistant. ~35 sqm per coat.'],
    [41, 'PA-002', 'Masonry Paint Gray 4L', 6, 620, 400, 18, 6, 'gal', 'Boysen', 4.6, 'sale', 750, 'Alkali-resistant water-based masonry paint.'],
    [42, 'PA-003', 'Wood Varnish Clear 1L', 6, 185, 110, 30, 8, 'can', 'WoodCare', 4.5, 'new', null, 'Polyurethane varnish, UV resistant.'],
    [43, 'PA-004', 'Concrete Primer 4L', 6, 520, 330, 20, 6, 'gal', 'Boysen', 4.5, null, null, 'Neutralizing primer for new concrete.'],
    [44, 'PA-005', 'Skim Coat 20kg', 6, 420, 270, 25, 8, 'bag', 'Bostik', 4.4, null, null, 'Fine plaster finish for smooth walls.'],
    [45, 'SF-001', 'Safety Helmet ANSI', 7, 280, 150, 15, 5, 'pcs', 'SafeGuard', 4.9, null, null, 'ANSI Z89.1 Type I, 6-point suspension.'],
    [46, 'SF-002', 'Safety Gloves (Pair)', 7, 85, 40, 40, 10, 'pair', 'SafeGuard', 4.4, 'sale', 100, 'Cut-resistant, EN388 certified.'],
    [47, 'SF-003', 'Safety Goggles', 7, 120, 60, 30, 8, 'pcs', 'SafeGuard', 4.5, null, null, 'Anti-fog, impact resistant lens.'],
    [48, 'LW-001', 'Marine Plywood 3/4" 4×8', 8, 1100, 800, 30, 10, 'sheet', 'WoodCraft', 4.8, 'hot', null, 'Phenolic marine plywood, 18mm.'],
    [49, 'LW-002', '2×4 Lumber 8ft Kiln-Dried', 8, 185, 120, 80, 20, 'pcs', 'WoodCraft', 4.5, null, null, 'KD framing lumber, S4S.'],
    [50, 'LW-003', 'Gypsum Board 1/2" 4×8', 8, 450, 300, 40, 10, 'sheet', 'Gyproc', 4.6, null, null, 'For ceilings and drywall partitions.'],
    [51, 'LW-004', 'Metal Furring Channel 5m', 8, 95, 60, 120, 30, 'pcs', 'Generic', 4.3, null, null, 'Galvanized furring for ceiling framing.'],
    [52, 'MA-001', 'Portland Cement Type 1 (40kg)', 9, 285, 230, 300, 60, 'bag', 'Eagle Cement', 4.9, 'hot', null, 'For mortar, plaster, and concrete.'],
    [53, 'MA-002', 'Concrete Hollow Block 4"', 9, 14, 9, 2000, 300, 'pcs', 'Generic CHB', 4.4, null, null, '400×200×100mm, for partitions.'],
    [54, 'MA-003', 'Concrete Hollow Block 6"', 9, 22, 15, 1200, 200, 'pcs', 'Generic CHB', 4.5, null, null, '400×200×150mm, for exterior and load walls.'],
    [55, 'MA-004', 'Washed Sand', 9, 1200, 850, 40, 8, 'cu.m', 'Local supplier', 4.3, null, null, 'Fine to medium washed river sand.'],
    [56, 'MA-005', 'Gravel 3/4"', 9, 1400, 1000, 30, 6, 'cu.m', 'Local supplier', 4.3, null, null, 'Crushed gravel for concrete.'],
    [57, 'MA-006', 'Deformed Bar 10mm × 6m', 9, 195, 150, 400, 80, 'pcs', 'Pag-asa Steel', 4.8, 'hot', null, 'ASTM A615 Grade 40.'],
    [58, 'MA-007', 'Deformed Bar 12mm × 6m', 9, 285, 220, 250, 50, 'pcs', 'Pag-asa Steel', 4.7, null, null, 'ASTM A615 Grade 40.'],
    [59, 'MA-008', 'Tie Wire #16 (1kg)', 9, 85, 55, 100, 20, 'kg', 'Generic', 4.2, null, null, 'Annealed wire for tying rebar.'],
    [60, 'MA-009', 'Waterproofing Slurry 4kg', 9, 850, 560, 20, 5, 'pail', 'Sika', 4.6, null, null, 'Cementitious waterproofing, 2 coats.'],
    [61, 'TL-001', 'Ceramic Floor Tile 30×30 Anti-slip', 10, 55, 35, 800, 150, 'pcs', 'Mariwasa', 4.5, null, null, 'Matte anti-slip tile for wet areas. ~11 pcs per sqm.'],
    [62, 'TL-002', 'Ceramic Wall Tile 20×30 Glossy', 10, 42, 26, 1200, 200, 'pcs', 'Mariwasa', 4.4, null, null, 'Glossy white wall tile. ~17 pcs per sqm.'],
    [63, 'TL-003', 'Porcelain Floor Tile 60×60', 10, 185, 120, 500, 100, 'pcs', 'Mariwasa', 4.7, 'new', null, 'Polished porcelain. ~2.8 pcs per sqm.'],
    [64, 'TL-004', 'Tile Adhesive 25kg', 10, 420, 280, 60, 15, 'bag', 'Mapei', 4.6, null, null, 'Polymer-modified; covers 4–5 sqm per bag.'],
    [65, 'TL-005', 'Tile Grout 2kg White', 10, 220, 130, 50, 10, 'pack', 'Mapei', 4.5, null, null, 'Stain-proof, mold-resistant grout.'],
    [66, 'RF-001', 'GI Corrugated Sheet 8ft Ga.26', 11, 420, 300, 200, 40, 'sheet', 'Generic', 4.4, 'sale', 490, 'Galvanized iron roofing sheet.'],
    [67, 'RF-002', 'Long-Span Pre-painted Roofing', 11, 380, 260, 300, 60, 'm', 'Union Galvasteel', 4.7, null, null, 'Pre-painted rib-type roofing, cut to length.'],
    [68, 'RF-003', 'Roofing Tek Screw (box of 100)', 11, 350, 220, 40, 10, 'box', 'Generic', 4.4, null, null, 'Self-drilling screws with washers.'],
    [69, 'RF-004', 'C-Purlins 2"×3" × 6m', 11, 780, 560, 60, 15, 'pcs', 'Generic', 4.5, null, null, 'Galvanized steel purlins.'],
    [70, 'RF-005', 'Roof Sealant Tube', 11, 180, 100, 50, 10, 'tube', 'Sika', 4.5, null, null, 'Polyurethane sealant for laps and flashing.'],
    [71, 'DH-001', 'PVC Door with Frame 70×200', 12, 4500, 3200, 8, 3, 'set', 'Philux', 4.5, null, null, 'Water-resistant PVC door, ideal for bathrooms.'],
    [72, 'DH-002', 'Flush Door Panel 80×210', 12, 3200, 2200, 10, 3, 'pcs', 'WoodCraft', 4.4, null, null, 'Hollow-core flush door for bedrooms.'],
    [73, 'DH-003', 'Door Knob with Privacy Lock', 12, 650, 380, 25, 6, 'set', 'KAHA', 4.6, null, null, 'Stainless lever with privacy lock.'],
    [74, 'DH-004', 'Door Hinges 4" (pair)', 12, 120, 60, 60, 15, 'pair', 'Generic', 4.3, null, null, 'Stainless butt hinges.']
  ];
  const SEED_PRODUCTS = P.map(r => ({
    id: r[0], sku: r[1], name: r[2], catId: r[3], price: r[4], cost: r[5], stock: r[6], threshold: r[7],
    unit: r[8], brand: r[9], rating: r[10], badge: r[11], orig: r[12], desc: r[13],
    location: 'Aisle ' + (((r[3] - 1) % 8) + 1) + '-' + 'ABCD'[r[0] % 4], img: ''
  }));

  // Demo accounts (prototype test values, change before deployment)
  const SEED_USERS = [
    { id: 1, first: 'John Allain', last: 'Valenton', email: 'customer@vreymar.com', username: 'customer', password: 'Customer@123', contact: '09171234567', address: '123 Rizal St., Bagumbong', city: 'Caloocan City', province: 'Metro Manila', role: 'CUSTOMER', status: 'ACTIVE', createdAt: daysAgo(70) },
    { id: 2, first: 'Vince', last: 'Zuñiga', email: 'admin@vreymar.com', username: 'admin', password: 'Admin@123', contact: '09170000001', role: 'ADMIN', status: 'ACTIVE', createdAt: daysAgo(90) },
    { id: 3, first: 'Mhenald Joseph', last: 'Para-on', email: 'cashier@vreymar.com', username: 'cashier', password: 'Cashier@123', contact: '09170000002', role: 'CASHIER', status: 'ACTIVE', createdAt: daysAgo(90) },
    { id: 4, first: 'Hilario', last: 'Gonzales', email: 'inventory@vreymar.com', username: 'inventory', password: 'Inventory@123', contact: '09170000003', role: 'INVENTORY_STAFF', status: 'ACTIVE', createdAt: daysAgo(90) }
  ];

  function seedOrders(products) {
    const item = (sku, qty) => { const p = products.find(x => x.sku === sku); return { id: p.id, sku: p.sku, name: p.name, unit: p.unit, price: p.price, qty }; };
    const mk = (ref, ago, status, items, pay, slotDaysAfter, slot) => {
      const sub = items.reduce((a, i) => a + i.price * i.qty, 0);
      const fee = sub >= RULES.FREE_DELIVERY_MIN ? 0 : RULES.DELIVERY_FEE;
      const vat = sub * RULES.VAT;
      const placed = daysAgo(ago, 14, 15);
      const sched = new Date(placed); sched.setDate(sched.getDate() + slotDaysAfter);
      const flow = ['pending', 'confirmed', 'preparing', 'out', 'delivered'];
      const upto = flow.indexOf(status);
      const history = flow.slice(0, upto + 1).map((s, i) => { const t = new Date(placed); t.setHours(t.getHours() + i * 6); return { status: s, at: t.toISOString() }; });
      return {
        ref, userId: 1, method: 'delivery', customer: 'John Allain Valenton', phone: '09171234567', email: 'customer@vreymar.com',
        address: '123 Rizal St., Bagumbong, Caloocan City, Metro Manila', notes: '',
        placedAt: placed, items, subtotal: sub, promo: null, discount: 0, fee, vat, total: sub + vat + fee,
        pay, proof: pay === 'cod' ? null : { name: 'payment-proof.jpg', data: null },
        schedule: { date: sched.toISOString().slice(0, 10), slot }, status, history
      };
    };
    return [
      mk('VH-10038', 40, 'delivered', [item('PA-001', 3), item('TL-004', 2)], 'gcash', 2, '2:00 – 4:00 PM'),
      mk('VH-10042', 26, 'delivered', [item('MA-001', 4), item('MA-006', 6), item('MA-002', 80)], 'cod', 1, '10:00 – 12:00 PM'),
      mk('VH-10051', 3, 'delivered', [item('PT-002', 1), item('SF-001', 2), item('PL-005', 2)], 'maya', 1, '8:00 – 10:00 AM'),
      mk('VH-10055', 1, 'pending', [item('PL-001', 10), item('PL-006', 2), item('PL-004', 1)], 'cod', 3, '10:00 – 12:00 PM')
    ];
  }

  function seedTransactions(products) {
    // Deterministic pseudo-random walk-in sales for the last 14 days
    let s = 7; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const tx = []; let n = 1000;
    const pool = products.filter(p => p.stock > 0 && p.price < 3500);
    const methods = ['cash', 'cash', 'cash', 'gcash', 'maya'];
    for (let d = 13; d >= 0; d--) {
      const count = 2 + Math.floor(rnd() * 4);
      for (let k = 0; k < count; k++) {
        const lines = 1 + Math.floor(rnd() * 3); const items = [];
        for (let j = 0; j < lines; j++) {
          const p = pool[Math.floor(rnd() * pool.length)];
          if (items.find(i => i.id === p.id)) continue;
          const qty = p.price < 50 ? 5 + Math.floor(rnd() * 20) : 1 + Math.floor(rnd() * 3);
          items.push({ id: p.id, sku: p.sku, name: p.name, unit: p.unit, price: p.price, qty, line: p.price * qty });
        }
        const sub = items.reduce((a, i) => a + i.line, 0);
        const vat = sub * RULES.VAT; const total = sub + vat;
        const pay = methods[Math.floor(rnd() * methods.length)];
        tx.push({
          ref: 'TXN-' + (++n), at: daysAgo(d, 8 + Math.floor(rnd() * 9), Math.floor(rnd() * 60)),
          customer: 'Walk-in', items, subtotal: sub, discPct: 0, discount: 0, vat, total, payMethod: pay,
          tendered: pay === 'cash' ? Math.ceil(total / 100) * 100 : total, payRef: pay === 'cash' ? '' : String(1000000000 + Math.floor(rnd() * 8999999999)),
          cashier: 'Mhenald Joseph Para-on'
        });
      }
    }
    return tx;
  }

  function seed(force) {
    if (!force && read(K.version, 0) === SEED_VERSION) return;
    const products = JSON.parse(JSON.stringify(SEED_PRODUCTS));
    write(K.categories, SEED_CATEGORIES);
    write(K.products, products);
    write(K.users, SEED_USERS);
    write(K.orders, seedOrders(products));
    write(K.tx, seedTransactions(products));
    // One demo request already approved and waiting for stock (Ball Valve is out of stock)
    write(K.reps, [{
      ticket: 'REP-10001', userId: 1, customer: 'John Allain Valenton', phone: '09171234567', orderRef: 'VH-10051',
      itemId: 30, itemName: 'Ball Valve 3/4" Brass', sku: 'PL-005', qty: 1, unitPrice: 220, quote: 246.4,
      reason: 'Defective item', resolution: 'Replacement', ifUnavailable: 'wait', desc: 'Handle is loose and the valve leaks when closed.',
      status: 'waiting', filedAt: daysAgo(1, 9, 30),
      notes: [{ at: daysAgo(1, 15, 0), status: 'waiting', note: 'Approved. The replacement item is out of stock; we will send it once restocked.', by: 'Vince Zuñiga' }]
    }]);
    write(K.stocklog, []);
    write(K.held, []);
    write(K.version, SEED_VERSION);
  }

  /* ---------- catalog ---------- */
  const Catalog = {
    categories: () => read(K.categories, []),
    saveCategories: c => write(K.categories, c),
    products: () => read(K.products, []),
    saveProducts: p => write(K.products, p),
    product: id => Catalog.products().find(p => p.id === Number(id)),
    bySku: sku => Catalog.products().find(p => p.sku === sku),
    category: id => Catalog.categories().find(c => c.id === Number(id)) || { id: 0, name: 'Uncategorized', icon: '', color: 'gray' },
    stockStatus(p) {
      if (p.stock <= 0) return { key: 'out', label: 'Out of Stock' };
      if (p.stock <= p.threshold) return { key: 'low', label: 'Low Stock' };
      return { key: 'in', label: 'In Stock' };
    },
    /* Change stock and keep an audit trail (who, why, delta) */
    adjustStock(id, delta, reason, by) {
      const list = Catalog.products();
      const p = list.find(x => x.id === Number(id));
      if (!p) return null;
      const before = p.stock;
      p.stock = Math.max(0, before + delta);
      Catalog.saveProducts(list);
      const log = read(K.stocklog, []);
      log.unshift({ at: new Date().toISOString(), id: p.id, sku: p.sku, name: p.name, before, after: p.stock, delta: p.stock - before, reason: reason || '', by: by || 'System' });
      write(K.stocklog, log.slice(0, 500));
      return p;
    },
    stockLog: () => read(K.stocklog, [])
  };

  const CAT_COLORS = { yellow: '#E8A020', blue: '#3B82F6', green: '#22A55E', red: '#EF4444', purple: '#8B5CF6', gray: '#6B7280' };

  /* ---------- auth ---------- */
  const Auth = {
    users: () => read(K.users, []),
    saveUsers: u => write(K.users, u),
    current() {
      const id = Number(sessionStorage.getItem(K.session) || localStorage.getItem(K.session));
      const u = Auth.users().find(x => x.id === id);
      return u && u.status === 'ACTIVE' ? u : null;
    },
    login(identifier, password, remember) {
      const idf = String(identifier || '').trim().toLowerCase();
      const u = Auth.users().find(x => x.email.toLowerCase() === idf || (x.username || '').toLowerCase() === idf);
      if (!u || u.password !== password) return { ok: false, msg: 'Incorrect email/username or password.' };
      if (u.status !== 'ACTIVE') return { ok: false, msg: 'This account is deactivated. Please contact the store.' };
      sessionStorage.setItem(K.session, u.id);
      if (remember) localStorage.setItem(K.session, u.id); else localStorage.removeItem(K.session);
      return { ok: true, user: u };
    },
    logout() { sessionStorage.removeItem(K.session); localStorage.removeItem(K.session); },
    register(data) {
      const users = Auth.users();
      const email = data.email.trim().toLowerCase();
      if (users.some(u => u.email.toLowerCase() === email)) return { ok: false, msg: 'An account with this email already exists.' };
      let base = (data.first + data.last).replace(/[^a-z0-9]/gi, '').toLowerCase() || email.split('@')[0];
      let username = base, i = 1;
      while (users.some(u => u.username === username)) username = base + (i++);
      const u = { id: Math.max(0, ...users.map(x => x.id)) + 1, first: data.first.trim(), last: data.last.trim(), email, username, password: data.password, contact: data.contact.trim(), address: '', city: '', province: '', role: data.role || 'CUSTOMER', status: data.status || 'ACTIVE', createdAt: new Date().toISOString() };
      users.push(u); Auth.saveUsers(users);
      return { ok: true, user: u };
    },
    update(id, patch) {
      const users = Auth.users(); const u = users.find(x => x.id === Number(id));
      if (!u) return null; Object.assign(u, patch); Auth.saveUsers(users); return u;
    },
    can(user, module) { return !!user && (ACCESS[user.role] || []).includes(module); },
    isStaff: u => !!u && u.role !== 'CUSTOMER',
    fullName: u => u ? (u.first + ' ' + u.last).trim() : '',
    initials: u => u ? ((u.first || '?')[0] + (u.last || '?')[0]).toUpperCase() : '?'
  };

  /* ---------- cart (customer storefront) ---------- */
  const Cart = {
    items: () => read(K.cart, []),
    save: c => { write(K.cart, c); document.dispatchEvent(new CustomEvent('vh:cart')); },
    count: () => Cart.items().reduce((a, c) => a + c.qty, 0),
    add(id, qty = 1) {
      const p = Catalog.product(id); if (!p) return { ok: false, msg: 'Product not found.' };
      if (p.stock <= 0) return { ok: false, msg: p.name + ' is out of stock.' };
      const c = Cart.items(); const ex = c.find(x => x.id === p.id);
      const want = (ex ? ex.qty : 0) + qty;
      const finalQty = Math.min(want, p.stock);
      if (ex) ex.qty = finalQty; else c.push({ id: p.id, qty: finalQty });
      Cart.save(c);
      return { ok: true, capped: finalQty < want, product: p, qty: finalQty };
    },
    set(id, qty) {
      const p = Catalog.product(id); let c = Cart.items();
      if (qty <= 0) c = c.filter(x => x.id !== Number(id));
      else { const ex = c.find(x => x.id === Number(id)); if (ex) ex.qty = Math.min(qty, p ? p.stock : qty); }
      Cart.save(c);
    },
    remove: id => Cart.save(Cart.items().filter(x => x.id !== Number(id))),
    clear: () => Cart.save([]),
    /* Resolve cart lines against the live catalog */
    lines() {
      return Cart.items().map(c => { const p = Catalog.product(c.id); return p ? { ...p, qty: c.qty, line: p.price * c.qty } : null; }).filter(Boolean);
    },
    totals(promoCode, method) {
      const lines = Cart.lines();
      const subtotal = lines.reduce((a, l) => a + l.line, 0);
      const promo = promoCode && PROMOS[promoCode] ? PROMOS[promoCode] : null;
      const discount = promo ? subtotal * promo.pct / 100 : 0;
      const after = subtotal - discount;
      const fee = !lines.length || method === 'pickup' || (promo && promo.freeShip) || subtotal >= RULES.FREE_DELIVERY_MIN ? 0 : RULES.DELIVERY_FEE;
      const vat = after * RULES.VAT;
      return { lines, subtotal, discount, after, fee, vat, total: after + vat + fee, promo };
    }
  };

  /* ---------- online orders & deliveries ---------- */
  const ORDER_FLOW = ['pending', 'confirmed', 'preparing', 'out', 'delivered'];
  const ORDER_LABEL = { pending: 'Pending Confirmation', confirmed: 'Confirmed', preparing: 'Preparing Items', out: 'Out for Delivery', delivered: 'Delivered', cancelled: 'Cancelled' };
  const PAY_LABEL = { cod: 'Cash on Delivery', gcash: 'GCash', maya: 'Maya', cash: 'Cash', cop: 'Pay at Pickup' };
  const PICKUP_LABEL = { out: 'Ready for Pickup', delivered: 'Picked Up' };
  /* Status label that respects the order's method (delivery vs store pickup) */
  const statusLabel = (o, s) => { s = s || o.status; return (o && o.method === 'pickup' && PICKUP_LABEL[s]) || ORDER_LABEL[s]; };
  const TIME_SLOTS = ['8:00 – 10:00 AM', '10:00 – 12:00 PM', '12:00 – 2:00 PM', '2:00 – 4:00 PM', '4:00 – 6:00 PM'];
  const MAX_PER_SLOT = 2;

  const Orders = {
    all: () => read(K.orders, []),
    save: o => write(K.orders, o),
    byUser: uid => Orders.all().filter(o => o.userId === Number(uid)),
    get: ref => Orders.all().find(o => o.ref === ref),
    nextRef() { const nums = Orders.all().map(o => +o.ref.split('-')[1] || 0); return 'VH-' + (Math.max(10000, ...nums) + 1); },
    /* Delivery capacity: count active orders per date/slot */
    slotLoad(date) {
      const load = {}; Orders.all().filter(o => o.status !== 'cancelled' && o.schedule && o.schedule.date === date).forEach(o => { load[o.schedule.slot] = (load[o.schedule.slot] || 0) + 1; });
      return load;
    },
    isDateFull(date) {
      // Demo: some dates are marked fully booked deterministically, plus real capacity
      const d = new Date(date + 'T00:00:00');
      const seedFull = (d.getDate() * 7 + d.getMonth() * 3) % 11 === 0;
      const load = Orders.slotLoad(date);
      return seedFull || TIME_SLOTS.every(s => (load[s] || 0) >= MAX_PER_SLOT);
    },
    isSlotFull(date, slot) {
      const d = new Date(date + 'T00:00:00');
      const idx = TIME_SLOTS.indexOf(slot);
      const seedFull = (d.getDate() + idx * 3) % 7 === 0;
      return seedFull || (Orders.slotLoad(date)[slot] || 0) >= MAX_PER_SLOT;
    },
    place(data) {
      const user = Auth.current();
      const method = data.method === 'pickup' ? 'pickup' : 'delivery';
      const t = Cart.totals(data.promoCode, method);
      if (!t.lines.length) return { ok: false, msg: 'Your cart is empty.' };
      for (const l of t.lines) { if (l.qty > l.stock) return { ok: false, msg: `Only ${l.stock} ${l.unit} of ${l.name} left in stock.` }; }
      const now = new Date().toISOString();
      const order = {
        ref: Orders.nextRef(), userId: user ? user.id : null, customer: data.name, phone: data.phone, email: data.email,
        method, address: method === 'pickup' ? 'Store pickup: ' + RULES.STORE.address : data.address, notes: data.notes || '', placedAt: now,
        items: t.lines.map(l => ({ id: l.id, sku: l.sku, name: l.name, unit: l.unit, price: l.price, qty: l.qty })),
        subtotal: t.subtotal, promo: t.promo ? data.promoCode : null, discount: t.discount, fee: t.fee, vat: t.vat, total: t.total,
        pay: data.pay, proof: data.proof || null, schedule: data.schedule, status: 'pending', history: [{ status: 'pending', at: now }]
      };
      const all = Orders.all(); all.unshift(order);
      if (!Orders.save(all)) { // proof image too large for storage, keep the filename only
        order.proof = order.proof ? { name: order.proof.name, data: null } : null;
        all[0] = order; Orders.save(all);
      }
      t.lines.forEach(l => Catalog.adjustStock(l.id, -l.qty, 'Online order ' + order.ref, order.customer));
      Cart.clear();
      return { ok: true, order };
    },
    setStatus(ref, status, by) {
      const all = Orders.all(); const o = all.find(x => x.ref === ref); if (!o) return null;
      if (o.status === status) return o;
      if (status === 'cancelled' && o.status !== 'delivered') {
        o.items.forEach(i => Catalog.adjustStock(i.id, i.qty, 'Cancelled order ' + o.ref, by));
      }
      o.status = status; o.history.push({ status, at: new Date().toISOString(), by: by || '' });
      Orders.save(all); return o;
    },
    nextStatus(s) { const i = ORDER_FLOW.indexOf(s); return i >= 0 && i < ORDER_FLOW.length - 1 ? ORDER_FLOW[i + 1] : null; }
  };

  /* ---------- POS transactions ---------- */
  const Sales = {
    all: () => read(K.tx, []),
    save: t => write(K.tx, t),
    nextRef() { const nums = Sales.all().map(t => +t.ref.split('-')[1] || 0); return 'TXN-' + (Math.max(1000, ...nums) + 1); },
    record(tx) {
      const all = Sales.all(); tx.ref = Sales.nextRef(); tx.at = new Date().toISOString();
      all.push(tx); Sales.save(all);
      tx.items.forEach(i => Catalog.adjustStock(i.id, -i.qty, 'POS sale ' + tx.ref, tx.cashier));
      return tx;
    },
    held: () => read(K.held, []),
    saveHeld: h => write(K.held, h)
  };

  /* ---------- replacements / returns ----------
     Flow (Final Defense, Fig. 7.5 / Table 22–23):
       customer submits -> system checks eligibility (ineligible requests are not filed)
       -> pending -> admin reviews -> rejected | approved
       approved replacement -> stock check -> processing (stock reserved) | waiting (Waiting for Stock)
       waiting -> customer may switch to refund at any time; after STOCK_WAIT_DAYS the store refunds
       approved refund -> refunding -> completed */
  const REP_LABEL = { pending: 'Pending Review', rejected: 'Rejected', waiting: 'Waiting for Stock', processing: 'Replacement Being Prepared', refunding: 'Refund Processing', completed: 'Completed' };
  const Replacements = {
    all: () => read(K.reps, []),
    save: r => write(K.reps, r),
    byUser: uid => Replacements.all().filter(r => r.userId === Number(uid)),
    label: s => REP_LABEL[s] || s,
    /* Units of an order line that can still be claimed, and whether the window is open */
    eligibility(order, itemId) {
      if (!order || order.status !== 'delivered') return { ok: false, msg: 'Only delivered or picked-up orders can be claimed.' };
      const done = order.history.find(h => h.status === 'delivered');
      const days = done ? (Date.now() - new Date(done.at)) / 86400000 : 0;
      if (days > RULES.RETURN_DAYS) return { ok: false, msg: `The ${RULES.RETURN_DAYS}-day replacement window for this order closed on ${fmtDate(new Date(new Date(done.at).getTime() + RULES.RETURN_DAYS * 86400000))}.` };
      const item = order.items.find(i => i.id === Number(itemId));
      if (!item) return { ok: false, msg: 'Item not found in this order.' };
      const claimed = Replacements.all().filter(r => r.orderRef === order.ref && r.itemId === item.id && r.status !== 'rejected').reduce((a, r) => a + r.qty, 0);
      const left = item.qty - claimed;
      if (left <= 0) return { ok: false, msg: 'All units of this item already have a request.' };
      return { ok: true, left, item, daysLeft: Math.max(0, Math.ceil(RULES.RETURN_DAYS - days)) };
    },
    /* Quotation: what the customer gets back if refunded (item price incl. VAT) */
    quote: (unitPrice, qty) => Math.round(unitPrice * qty * (1 + RULES.VAT) * 100) / 100,
    file(data) {
      const all = Replacements.all();
      const ticket = 'REP-' + String(10001 + all.length);
      const rec = { ticket, ...data, quote: Replacements.quote(data.unitPrice, data.qty), status: 'pending', filedAt: new Date().toISOString(), notes: [] };
      all.unshift(rec); Replacements.save(all); return rec;
    },
    setStatus(ticket, status, note, by) {
      const all = Replacements.all(); const r = all.find(x => x.ticket === ticket); if (!r) return null;
      r.status = status; r.notes.push({ at: new Date().toISOString(), status, note: note || '', by: by || '' });
      Replacements.save(all); return r;
    },
    /* Admin approves: refunds go straight to refunding; replacements check stock */
    approve(ticket, note, by) {
      const r = Replacements.all().find(x => x.ticket === ticket); if (!r) return null;
      if (r.resolution === 'Refund') return Replacements.setStatus(ticket, 'refunding', note, by);
      const p = Catalog.product(r.itemId);
      if (p && p.stock >= r.qty) {
        Catalog.adjustStock(r.itemId, -r.qty, 'Replacement ' + ticket, by);
        return Replacements.setStatus(ticket, 'processing', note, by);
      }
      if (r.ifUnavailable === 'refund') return Replacements.setStatus(ticket, 'refunding', (note ? note + ' ' : '') + 'Replacement out of stock. Refunding as you requested.', by);
      return Replacements.setStatus(ticket, 'waiting', (note ? note + ' ' : '') + 'Approved. The replacement item is out of stock; we will send it once restocked.', by);
    },
    /* Stock arrived for a waiting request */
    fulfil(ticket, by) {
      const r = Replacements.all().find(x => x.ticket === ticket); const p = Catalog.product(r.itemId);
      if (!p || p.stock < r.qty) return { ok: false, msg: `Only ${p ? p.stock : 0} in stock. Still waiting.` };
      Catalog.adjustStock(r.itemId, -r.qty, 'Replacement ' + ticket, by);
      Replacements.setStatus(ticket, 'processing', 'Stock arrived. Your replacement is being prepared.', by);
      return { ok: true };
    },
    switchToRefund(ticket, by) {
      const all = Replacements.all(); const r = all.find(x => x.ticket === ticket);
      if (!r || r.status !== 'waiting') return null;
      r.resolution = 'Refund'; Replacements.save(all);
      return Replacements.setStatus(ticket, 'refunding', 'Customer chose a refund instead of waiting for stock.', by);
    },
    waitingDays: r => { const n = [...r.notes].reverse().find(x => x.status === 'waiting'); return n ? Math.floor((Date.now() - new Date(n.at)) / 86400000) : 0; }
  };

  /* ---------- reports helpers ---------- */
  const Reports = {
    /* Unified sale records: POS transactions + non-cancelled online orders */
    sales() {
      const pos = Sales.all().map(t => ({ ref: t.ref, at: t.at, channel: 'In-store', customer: t.customer, items: t.items, subtotal: t.subtotal - (t.discount || 0), total: t.total, pay: t.payMethod }));
      const online = Orders.all().filter(o => o.status !== 'cancelled').map(o => ({ ref: o.ref, at: o.placedAt, channel: 'Online', customer: o.customer, items: o.items, subtotal: o.subtotal - (o.discount || 0), total: o.total, pay: o.pay, status: o.status }));
      return pos.concat(online).sort((a, b) => new Date(b.at) - new Date(a.at));
    }
  };

  /* ---------- CSV export ---------- */
  function downloadCSV(filename, rows) {
    const csv = rows.map(r => r.map(v => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  }

  seed(false);

  global.VH = {
    K, RULES, PROMOS, ROLES, ACCESS, CAT_COLORS, ORDER_FLOW, ORDER_LABEL, PAY_LABEL, TIME_SLOTS, statusLabel,
    read, write, seed, peso, pesoShort, esc, fmtDate, fmtDateTime, fmtLongDate, daysAgo, downloadCSV,
    Catalog, Auth, Cart, Orders, Sales, Replacements, Reports
  };
})(window);
