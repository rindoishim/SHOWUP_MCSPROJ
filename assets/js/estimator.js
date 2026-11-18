/* ==========================================================================
   Estimate AI, material estimation & cost computation engine
   Turns a plain-language project description + floor area + budget tier
   (+ optional detailed specifications) into a bill of materials priced
   from the live catalog. Quantities follow common Philippine construction
   rules of thumb (CHB per sqm, tiles per sqm, adhesive coverage, etc.).

   This is deterministic and runs in the browser. To plug in an LLM later,
   have it return { type, sqm, budget, includes } and pass that to generate().
   ========================================================================== */
(function (global) {
  'use strict';
  const { Catalog } = VH;
  const q = x => Math.max(1, Math.ceil(x - 1e-9));

  const TYPES = {
    restroom: { title: 'Restroom Build', icon: '', areaLabel: 'Floor area', hint: 'A 2m × 1.5m restroom = 3 sqm' },
    bedroom: { title: 'Room Construction', icon: '', areaLabel: 'Floor area', hint: 'A 3m × 4m room = 12 sqm' },
    kitchen: { title: 'Kitchen Renovation', icon: '', areaLabel: 'Floor area', hint: 'A 2.5m × 3m kitchen = 7.5 sqm' },
    fence: { title: 'Perimeter Fence Wall', icon: '', areaLabel: 'Wall face area', hint: '20m long × 2m high = 40 sqm of wall' },
    roofing: { title: 'Roof Replacement', icon: '', areaLabel: 'Roof area', hint: 'Use the sloped roof surface area' },
    flooring: { title: 'Floor Tiling', icon: '◼️', areaLabel: 'Floor area', hint: 'Area of the floor to be tiled' },
    painting: { title: 'Repainting', icon: '', areaLabel: 'Floor area of the room', hint: 'Walls are computed from the floor area' }
  };

  const INCLUDE_DEFAULTS = {
    restroom: ['plumbing', 'electrical', 'waterproofing', 'door', 'exhaust'],
    bedroom: ['electrical', 'door', 'ceiling', 'paint'],
    kitchen: ['plumbing', 'electrical', 'exhaust', 'paint'],
    fence: ['paint'],
    roofing: [],
    flooring: [],
    painting: ['paint']
  };

  function detectType(prompt, spec) {
    spec = spec || {};
    const room = (spec.roomType || '').toLowerCase();
    const ctype = (spec.constructionType || '').toLowerCase();
    if (ctype.includes('fence')) return 'fence';
    if (ctype.includes('roof')) return 'roofing';
    if (ctype.includes('flooring')) return 'flooring';
    if (room.includes('restroom')) return 'restroom';
    if (room.includes('kitchen')) return 'kitchen';
    const p = (prompt || '').toLowerCase();
    if (/restroom|bathroom|toilet|\bcr\b|comfort room|banyo|shower|lavatory/.test(p)) return 'restroom';
    if (/kitchen|kusina|sink|lababo/.test(p)) return 'kitchen';
    if (/fence|perimeter|bakod|boundary/.test(p)) return 'fence';
    if (/roof|bubong|gutter|yero/.test(p)) return 'roofing';
    if (/repaint|paint|pintura/.test(p)) return 'painting';
    if (/floor|tiling|\btile/.test(p)) return 'flooring';
    if (room) return 'bedroom';
    return 'bedroom';
  }

  /* Pull an explicit area out of the prompt, e.g. "3 sqm", "2m x 1.5m" */
  function areaFromPrompt(prompt) {
    const p = (prompt || '').toLowerCase();
    let m = p.match(/(\d+(?:\.\d+)?)\s*(?:sqm|sq\.?\s?m|square meters?|m2|m²)/);
    if (m) return parseFloat(m[1]);
    m = p.match(/(\d+(?:\.\d+)?)\s*m?\s*[x×by]+\s*(\d+(?:\.\d+)?)\s*m/);
    if (m) return parseFloat(m[1]) * parseFloat(m[2]);
    return null;
  }

  function build(type, A, tier, inc, spec) {
    spec = spec || {};
    const side = Math.sqrt(A), perim = 4 * side;
    const has = k => inc.includes(k);
    const prem = tier === 'pre', eco = tier === 'eco';
    const fx = (spec.fixtureGrade || '').toLowerCase();
    const tf = (spec.tileFloor || '').toLowerCase();
    const floorTile = tf.includes('porcelain') || tf.includes('stone') ? 'TL-003' : tf.includes('ceramic') ? 'TL-001' : (prem ? 'TL-003' : 'TL-001');
    const floorTileQty = sku => sku === 'TL-003' ? q(A * 2.78 * 1.1) : q(A * 11.1 * 1.1);
    const toilet = fx.includes('economy') ? 'PL-007' : fx.includes('premium') ? 'PL-008' : (eco ? 'PL-007' : 'PL-008');
    const light = eco ? 'EL-006' : 'EL-007';
    const C = [];
    const cat = (id, label, items) => { if (items.length) C.push({ id, label, items }); };
    const L = (sku, qty, note) => ({ sku, qty, note: note || '' });

    if (type === 'restroom') {
      const wall = Math.max(0, perim * 2.4 - 1.4);
      if (has('plumbing')) cat('plumbing', 'Plumbing & Fixtures', [
        L(toilet, 1, 'Close-coupled set with fittings'), L('PL-009', 1), L('PL-010', 1),
        L('PL-001', q(2 + A * 0.8), 'Water supply lines'), L('PL-002', q(1 + A * 0.25), 'Toilet & floor drain line'),
        L('PL-004', 1), L('PL-006', 2, 'Main & fixture shut-off'), L('PL-011', 1), L('PL-014', 2)]);
      const tiles = [L(floorTile, floorTileQty(floorTile), 'Includes 10% cutting allowance'), L('TL-002', q(wall * 16.7 * 1.1), 'Full-height wall tiles'),
        L('TL-004', q((A + wall) / 4.5)), L('TL-005', q((A + wall) / 6))];
      if (has('waterproofing')) tiles.push(L('MA-009', q(A * 0.75 + 0.5), '2 coats on floor + 30cm up the walls'));
      cat('tiles', 'Tiles & Waterproofing', tiles);
      if (has('electrical')) {
        const e = [L('EL-002', q(10 + A * 3)), L('EL-004', 1, 'GFCI-ready location near lavatory'), L('EL-005', 1), L(light, 1), L('EL-008', q(2 + A * 0.8))];
        if (has('exhaust')) e.push(L('EL-009', 1));
        cat('electrical', 'Electrical', e);
      }
      cat('masonry', 'Masonry & Structure', [L('MA-002', q(wall * 12.5 * 1.05), '12.5 blocks per sqm + 5%'), L('MA-001', q(wall * 0.45 + A * 0.4), 'Mortar, plaster & floor screed'),
        L('MA-004', q(wall * 0.035 + A * 0.05)), L('MA-006', q(wall * 0.55), 'Vertical & horizontal bars'), L('MA-008', 1)]);
      if (has('door')) cat('door', 'Door & Hardware', [L('DH-001', 1, 'Water-resistant'), L('DH-003', 1)]);
    }

    else if (type === 'bedroom') {
      const wall = Math.max(0, perim * 2.7 - 1.7 - 1.2);
      cat('masonry', 'Masonry & Structure', [L('MA-002', q(wall * 12.5 * 1.05)), L('MA-001', q(wall * 0.45 + A * 0.35)),
        L('MA-004', q(wall * 0.035 + A * 0.04)), L('MA-006', q(wall * 0.55)), L('MA-008', q(wall / 30))]);
      cat('flooring', 'Flooring', [L(floorTile, floorTileQty(floorTile)), L('TL-004', q(A / 4.5)), L('TL-005', q(A / 9))]);
      if (has('ceiling')) cat('ceiling', 'Ceiling', [L('LW-003', q(A / 2.97 * 1.1), '4×8 board = 2.97 sqm'), L('LW-004', q(A * 1.1)), L('HW-003', q(A * 12))]);
      if (has('electrical')) cat('electrical', 'Electrical', [L('EL-002', q(15 + A * 2.5), 'Lighting circuit'), L('EL-003', q(10 + A * 1.5), 'Outlet circuit'),
        L('EL-004', q(A / 6) + 1), L('EL-005', A > 14 ? 2 : 1), L(light, eco ? q(A / 9) : q(A / 4)), L('EL-001', 1), L('EL-008', q(3 + A * 0.6))]);
      if (has('paint')) cat('finish', 'Walls & Paint', [L('PA-005', q(wall * 2 / 12), 'Both faces of new walls'), L('PA-004', q(wall * 2 / 30)), L('PA-001', q(wall * 2 * 2 / 35), '2 coats'), L('HT-006', 1)]);
      if (has('door')) cat('door', 'Door & Hardware', [L('DH-002', 1), L('DH-003', 1), L('DH-004', 2)]);
    }

    else if (type === 'kitchen') {
      const back = perim * 0.5 * 0.6;
      const wall = perim * 2.7;
      if (has('plumbing')) cat('plumbing', 'Plumbing & Fixtures', [L('PL-012', 1), L('PL-013', 1), L('PL-001', q(2 + A * 0.5)), L('PL-002', 1, 'Sink drain'), L('PL-004', 1), L('PL-006', 1), L('PL-014', 2)]);
      cat('tiles', 'Tiles', [L(floorTile, floorTileQty(floorTile)), L('TL-002', q(back * 16.7 * 1.1), 'Backsplash along counters'), L('TL-004', q((A + back) / 4.5)), L('TL-005', q((A + back) / 7))]);
      if (has('electrical')) {
        const e = [L('EL-003', q(15 + A * 2), 'Appliance circuit'), L('EL-002', q(10 + A * 1.5)), L('EL-004', q(A / 3) + 1, 'Counter-top outlets'), L('EL-005', 1), L('EL-007', q(A / 4)), L('EL-001', 2, 'Separate appliance breaker'), L('EL-008', q(3 + A * 0.6))];
        if (has('exhaust')) e.push(L('EL-009', 1));
        cat('electrical', 'Electrical', e);
      }
      if (has('paint')) cat('finish', 'Walls & Paint', [L('PA-004', q(wall * 0.6 / 30)), L('PA-001', q(wall * 0.6 * 2 / 35)), L('HT-006', 1)]);
    }

    else if (type === 'fence') {
      cat('masonry', 'Masonry & Footing', [L('MA-003', q(A * 12.5 * 1.05), '6" CHB, 12.5 per sqm + 5%'), L('MA-001', q(A * 0.75), 'Footing, mortar & plaster'), L('MA-004', q(A * 0.045)), L('MA-005', q(A * 0.02), 'Footing & columns')]);
      cat('steel', 'Reinforcement', [L('MA-006', q(A * 0.9), 'Wall bars @ 60cm'), L('MA-007', q(A * 0.25), 'Columns & footing'), L('MA-008', q(A * 0.05))]);
      if (has('paint')) cat('finish', 'Finishing', [L('PA-004', q(A * 2 / 30)), L('PA-002', q(A * 2 * 2 / 30), 'Both faces, 2 coats'), L('HT-006', 1)]);
      cat('tools', 'Tools & Safety', [L('HT-005', 2), L('SF-002', 2)]);
    }

    else if (type === 'roofing') {
      const sheet = eco ? L('RF-001', q(A / 1.6), 'Effective cover ≈ 1.6 sqm per sheet') : L('RF-002', q(A * 1.1), 'Linear meters at ~1m effective width');
      cat('roofing', 'Roofing', [sheet, L('RF-004', q(A / 5), 'Purlins @ 60cm'), L('RF-003', q(A * 6 / 100)), L('RF-005', q(A / 15))]);
      cat('tools', 'Safety', [L('SF-002', 2), L('SF-001', 2)]);
    }

    else if (type === 'flooring') {
      cat('flooring', 'Flooring', [L(floorTile, floorTileQty(floorTile)), L('TL-004', q(A / 4.5)), L('TL-005', q(A / 9))]);
      cat('masonry', 'Floor Preparation', [L('MA-001', q(A * 0.15), 'Leveling screed'), L('MA-004', q(A * 0.02))]);
    }

    else if (type === 'painting') {
      const wall = perim * 2.7;
      cat('finish', 'Paint & Preparation', [L('PA-005', q(wall / 12), 'Patch & smoothen'), L('PA-004', q(wall / 30)), L('PA-001', q(wall * 2 / 35), '2 coats'), L('HT-006', q(1 + wall / 80))]);
    }

    return C;
  }

  /**
   * generate({prompt, sqm, budget:'eco'|'mid'|'pre', spec, includes})
   */
  function generate(opts) {
    const spec = opts.spec || {};
    const type = opts.type || detectType(opts.prompt, spec);
    const A = Math.max(0.5, parseFloat(opts.sqm) || areaFromPrompt(opts.prompt) || 6);
    const tier = opts.budget || 'mid';
    let inc = opts.includes;
    if (!inc) {
      inc = INCLUDE_DEFAULTS[type].slice();
      if (Array.isArray(spec.includes) && spec.includes.length) inc = spec.includes.slice();
      if (tier === 'eco' && !spec.includes) inc = inc.filter(k => k !== 'exhaust');
    }
    const raw = build(type, A, tier, inc, spec);
    const notes = [];
    let materials = 0, lineCount = 0;
    const categories = raw.map(c => {
      const items = c.items.map(l => {
        const p = Catalog.bySku(l.sku);
        if (!p) return null;
        lineCount++;
        const line = p.price * l.qty; materials += line;
        return { id: p.id, sku: p.sku, name: p.name, brand: p.brand, unit: p.unit, price: p.price, qty: l.qty, line, note: l.note, stock: p.stock, catId: p.catId, short: l.qty > p.stock };
      }).filter(Boolean);
      return { id: c.id, label: c.label, items, total: items.reduce((a, i) => a + i.line, 0) };
    }).filter(c => c.items.length);

    let laborPct = 0.20;
    const fl = (spec.floorLevel || '');
    if (/2nd|3rd|4th/.test(fl)) { laborPct = 0.25; notes.push('Labor raised to 25% for hauling materials above ground floor.'); }
    if (/narrow|limited/i.test(spec.siteAccess || '')) notes.push('Limited site access. Let us know so we can send a smaller truck.');
    if (/soft|filled/i.test(spec.soilCondition || '') && (type === 'fence' || type === 'bedroom')) notes.push('Soft or filled soil may need deeper footings; consult an engineer.');
    if (spec.hasBlueprint) notes.push('Blueprint "' + spec.blueprintName + '" attached. Our staff will review it when you order.');
    if ((spec.includes || []).includes('heater')) notes.push('Water heaters are special-order items; ask our staff for available models.');
    const short = categories.flatMap(c => c.items).filter(i => i.short);
    if (short.length) notes.push(short.length + ' item(s) exceed current stock. We will reserve what is available and restock the rest.');

    const labor = Math.round(materials * laborPct);
    const contingency = Math.round(materials * 0.10);
    return {
      type, title: TYPES[type].title, icon: TYPES[type].icon, sqm: A, budget: tier, includes: inc,
      categories, materials, lineCount, laborPct, labor, contingency, grand: Math.round(materials) + labor + contingency, notes
    };
  }

  global.Estimator = { generate, detectType, areaFromPrompt, TYPES, INCLUDE_DEFAULTS };
})(window);
