# Design: "The shelf, catalogued"

Each item Vreymar sells is shown the way a field guide shows a specimen: alone on a flat tile of its own material colour, at the same scale, named plainly underneath. The tile colours come from the materials themselves (concrete, galvanised steel, PVC blue, copper wire, clay tile, lumber, safety yellow, moss-green paint).

## Tokens (assets/css/site.css)
- All colour in OKLCH. Gradients interpolate `in oklch` so they stay vivid through the middle.
- Light: ground `oklch(97.4% .004 85)`, panel `oklch(100% 0 0)`, ink `oklch(22% .012 255)`. Action colour is safety yellow `oklch(84% .165 88)` with dark text.
- Dark: depth comes from lighter surfaces, not shadows. The page sits at 17%, panels at 21.5%, raised surfaces (menus, modals) at 26%.
- Borders are alpha (`oklch(... / .1)`) so they blend into whatever sits behind them.
- Radii: 28 / 20 / 14 / 10 / 6 and pill. A nested corner is always the outer radius minus the padding (for example `.p-card` 22 − 8 = `.p-img` 14).
- Type: General Sans (Fontshare), one family. Headings 600 with tight tracking; body 400. Tabular numbers on every price.
- Icons: one line family. Stroke width follows the weight of the text beside it (`--stroke`).
- Heights use `dvh` with a `vh` fallback.

## Images
- Product and category photos are placeholders: the drawn artwork from art.js on the tile.
- To add a real photo, set `img` on a product (store.js seed) or add it to `assets/js/photos.js`. Photos sit on the tile with `mix-blend-mode: multiply`, so white studio backgrounds disappear.

## Textures (faint, one per surface, never under long text)
All are inline SVG noise or CSS gradients (tokens in site.css / admin.css); there are no image files.
- **Grain** (`--tex-grain`) is built into `--accent-grad`, so every yellow gradient (buttons, totals, closing section) gets a fine printed grain instead of banding.
- **Paper** (`--tex-paper`) is on the things that get printed or handed over: the estimate slip, the cart summary, the checkout summary and the POS receipt. In dark mode it becomes light fibres.
- **Speckle** (`--tex-speck`) is on concrete tiles, so they read as concrete. The light version (`--tex-speck-light`) is on the dark fields: footer, slip section and the replacement card.
- **Blueprint grid** (16px minor, 80px major lines) is on the Estimate AI panel and results header, masked so it fades out before the text. The plan upload box is plain drafting paper.
