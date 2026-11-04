// Checks pricing.js + catalog.json against prices BestOfSigns' own calculator returned on Oct 12, 2026.
const { calcPrice } = require("./pricing.js");
const c = require("./catalog.json").products;
const P = s => c.find(p => p.slug === s);
const T = [
  ["vinyl custom 5x3", calcPrice(P("vinyl-banners"), { custom: { width: 5, height: 3 } }).unit, 82.65],
  ["vinyl custom 5x3 double-sided", calcPrice(P("vinyl-banners"), { custom: { width: 5, height: 3 }, options: { two_sided: "yes_two_side" } }).unit, 107.45],
  ["vinyl custom 10x5", calcPrice(P("vinyl-banners"), { custom: { width: 10, height: 5 } }).unit, 155.5],
  ["vinyl custom 20x10", calcPrice(P("vinyl-banners"), { custom: { width: 20, height: 10 } }).unit, 482],
  ["vinyl custom 2x2 (minimum)", calcPrice(P("vinyl-banners"), { custom: { width: 2, height: 2 } }).unit, 35.5],
  ["vinyl 4x2 + pole pockets", calcPrice(P("vinyl-banners"), { size: "4 x 2", options: { Mounting_Options_bos: "Pole_Pockets_bos" } }).unit, 70.07],
  ["fence custom 16x8", calcPrice(P("fence-banners"), { custom: { width: 16, height: 8 } }).unit, 346.88],
  ["retractable 2x5 complete", calcPrice(P("retractable-banner-stands"), { size: "2' x 5'" }).unit, 152.02],
  ["retractable 2x5 graphic only", calcPrice(P("retractable-banner-stands"), { size: "2' x 5'", package: "graphic_only" }).unit, 90.35],
  ["retractable 2x5 + lamination", calcPrice(P("retractable-banner-stands"), { size: "2' x 5'", options: { vin_uv_lam: "lam_oly_yes" } }).unit, 170.09],
  ["feather 2x7.5 + cross base", calcPrice(P("feather-flags"), { size: "2' x 7.5'", options: { base: "cross_base" } }).unit, 255.02],
  ["decal custom 36x48in", calcPrice(P("opaque-window-decals"), { custom: { width: 36, height: 48 } }).unit, 102],
  ["decal custom 96x120in", calcPrice(P("wall-decals"), { custom: { width: 96, height: 120 } }).unit, 466.4],
  ["runner custom 4x8", calcPrice(P("table-runners"), { custom: { width: 4, height: 8 } }).unit, 137.92],
  ["flag custom 40x10", calcPrice(P("personalized-flags"), { custom: { width: 40, height: 10 } }).unit, 644],
  ["mesh custom 60x20", calcPrice(P("mesh-banners"), { custom: { width: 60, height: 20 } }).unit, 4932],
  ["outdoor custom 16x8", calcPrice(P("outdoor-banners"), { custom: { width: 16, height: 8 } }).unit, 381.57],
  ["fabric custom 20x10", calcPrice(P("fabric-banners"), { custom: { width: 20, height: 10 } }).unit, 620],
  ["10x10 tent + back wall", calcPrice(P("custom-canopy-tents"), { size: "10' x 10'", options: { Back_Wall_Options_bos: "FBW-inner_bos" } }).unit, 1198],
  ["vinyl 3x2 qty 11 (12% off)", calcPrice(P("vinyl-banners"), { size: "3 x 2", qty: 11 }).each, 32.74],
];
let bad = 0;
for (const [n, got, exp] of T) { const ok = Math.abs(got - exp) < 0.06; if (!ok) bad++; console.log(ok ? "OK  " : "FAIL", n.padEnd(34), got, "expected", exp); }
console.log(bad ? bad + " failed" : "all " + T.length + " passed");
process.exit(bad ? 1 : 0);
