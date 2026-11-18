/* Vreymar Hardware, drawn category artwork.
   Flat drawings of the materials themselves, in the store's slate + amber,
   used wherever the old prototype used emoji. Art.cat(catId) -> <svg>. */
(function (global) {
  'use strict';
  const S = '#454D58', D = '#2d333c', A = '#EFB52B', L = '#c9ced6', W = '#ffffff', G = '#8b929c';
  const svg = (body, label) => `<svg class="art" viewBox="0 0 120 120" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

  const ART = {
    // 1 Fasteners, hex bolt and nut
    1: ['Bolt and nut', `<rect x="54" y="30" width="12" height="62" fill="${G}"/>${[0,1,2,3,4,5,6,7].map(i=>`<rect x="52" y="${44+i*6}" width="16" height="2" fill="${S}"/>`).join('')}<polygon points="38,22 82,22 90,32 82,42 38,42 30,32" fill="${S}"/><polygon points="38,22 82,22 86,27 34,27" fill="${D}"/><polygon points="44,78 76,78 82,86 76,94 44,94 38,86" fill="${A}"/><circle cx="60" cy="86" r="5" fill="${D}"/>`],
    // 2 Power tools, drill
    2: ['Power drill', `<rect x="22" y="36" width="58" height="26" fill="${A}"/><rect x="80" y="42" width="14" height="14" fill="${S}"/><rect x="94" y="47" width="18" height="4" fill="${G}"/><polygon points="40,62 58,62 54,98 36,98" fill="${D}"/><rect x="30" y="96" width="34" height="10" fill="${S}"/><rect x="58" y="62" width="8" height="10" fill="${S}"/><rect x="28" y="42" width="16" height="4" fill="${D}"/>`],
    // 3 Hand tools, claw hammer
    3: ['Hammer', `<g transform="rotate(-35 60 60)"><rect x="55" y="38" width="10" height="70" fill="${A}"/><rect x="55" y="88" width="10" height="20" fill="${D}"/><rect x="32" y="24" width="50" height="18" fill="${S}"/><polygon points="82,24 98,18 96,28 82,32" fill="${S}"/><polygon points="82,34 98,40 94,46 82,42" fill="${S}"/><rect x="26" y="26" width="8" height="14" fill="${D}"/></g>`],
    // 4 Electrical, coil of wire with plug
    4: ['Wire coil', `<circle cx="54" cy="58" r="34" fill="${D}"/><circle cx="54" cy="58" r="27" fill="${A}"/><circle cx="54" cy="58" r="20" fill="${D}"/><circle cx="54" cy="58" r="12" fill="${G}"/><circle cx="54" cy="58" r="5" fill="${W}"/><path d="M86 66 C96 72 98 84 92 92" stroke="${A}" stroke-width="5" fill="none"/><rect x="84" y="90" width="18" height="14" fill="${S}"/><rect x="88" y="104" width="3" height="8" fill="${G}"/><rect x="95" y="104" width="3" height="8" fill="${G}"/>`],
    // 5 Plumbing, pipe with elbow and valve
    5: ['Pipe and valve', `<rect x="14" y="62" width="56" height="18" fill="${L}"/><rect x="62" y="22" width="18" height="58" fill="${L}"/><rect x="56" y="58" width="30" height="26" fill="${W}" stroke="${G}" stroke-width="2"/><rect x="58" y="18" width="26" height="8" fill="${G}"/><rect x="10" y="58" width="8" height="26" fill="${G}"/><rect x="28" y="54" width="14" height="34" fill="${A}"/><rect x="24" y="46" width="22" height="6" fill="${D}"/>`],
    // 6 Paint, can with a drip
    6: ['Paint can', `<rect x="28" y="38" width="64" height="62" fill="${S}"/><rect x="28" y="38" width="64" height="12" fill="${D}"/><rect x="34" y="58" width="52" height="28" fill="${A}"/><path d="M28 38 Q60 20 92 38" stroke="${G}" stroke-width="3" fill="none"/><rect x="40" y="32" width="40" height="8" fill="${L}"/><path d="M50 50 v14 a4 4 0 0 0 8 0 v-14 z" fill="${A}"/>`],
    // 7 Safety, hard hat
    7: ['Hard hat', `<path d="M24 76 Q24 34 60 32 Q96 34 96 76 Z" fill="${A}"/><rect x="54" y="30" width="12" height="46" fill="#d38f12"/><rect x="14" y="74" width="92" height="12" fill="${D}"/><rect x="40" y="86" width="40" height="6" fill="${S}"/>`],
    // 8 Lumber & boards, stacked planks
    8: ['Lumber', `<rect x="14" y="78" width="92" height="16" fill="#b8792b"/><rect x="20" y="60" width="86" height="16" fill="${A}"/><rect x="14" y="42" width="80" height="16" fill="#c98a33"/><rect x="26" y="24" width="74" height="16" fill="${A}"/><circle cx="22" cy="86" r="3" fill="${D}"/><circle cx="102" cy="68" r="3" fill="${D}"/><circle cx="20" cy="50" r="3" fill="${D}"/><circle cx="96" cy="32" r="3" fill="${D}"/>`],
    // 9 Masonry & steel, concrete hollow block with rebar
    9: ['Hollow block', `<polygon points="16,58 72,58 104,40 48,40" fill="${L}"/><rect x="16" y="58" width="56" height="34" fill="${G}"/><polygon points="72,58 104,40 104,74 72,92" fill="${S}"/><polygon points="26,55 40,55 50,49 36,49" fill="${D}"/><polygon points="48,55 62,55 72,49 58,49" fill="${D}"/><rect x="84" y="14" width="5" height="90" fill="${A}" transform="rotate(12 86 60)"/>`],
    // 10 Tiles, four floor tiles, one lifted
    10: ['Tiles', `<rect x="18" y="22" width="40" height="40" fill="${L}"/><rect x="62" y="22" width="40" height="40" fill="${W}" stroke="${L}" stroke-width="2"/><rect x="18" y="66" width="40" height="40" fill="${W}" stroke="${L}" stroke-width="2"/><rect x="66" y="62" width="40" height="40" fill="${A}" transform="rotate(-10 86 82)"/>`],
    // 11 Roofing, corrugated sheet
    11: ['Roofing sheet', `<polygon points="10,70 60,30 110,70" fill="${S}"/>${[0,1,2,3,4,5,6,7].map(i=>`<line x1="${22+i*11}" y1="${60-Math.min(i,7-i)*7}" x2="${22+i*11}" y2="${70}" stroke="${L}" stroke-width="3"/>`).join('')}<rect x="22" y="70" width="76" height="34" fill="${W}"/><rect x="50" y="80" width="20" height="24" fill="${A}"/>`],
    // 12 Doors & hardware, door with knob
    12: ['Door', `<rect x="32" y="14" width="56" height="94" fill="${D}"/><rect x="38" y="20" width="44" height="88" fill="${A}"/><rect x="44" y="28" width="32" height="30" fill="#d38f12"/><rect x="44" y="66" width="32" height="34" fill="#d38f12"/><circle cx="74" cy="62" r="4" fill="${D}"/>`]
  };
  const FALLBACK = ['Item', `<rect x="26" y="34" width="68" height="56" fill="${S}"/><rect x="26" y="34" width="68" height="14" fill="${A}"/>`];

  global.Art = {
    cat(catId) { const a = ART[catId] || FALLBACK; return svg(a[1], a[0]); }
  };
})(window);
