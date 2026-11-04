/**
 * price-display.js
 *
 * Thin wrapper around pricing.js's calcPrice. pricing.js itself is kept
 * byte-for-byte as supplied (test_pricing.js checks its raw output
 * against real BestOfSigns figures with no markup/rounding applied —
 * editing it would break that baseline). Markup and the .99/.49
 * psychological rounding Brian asked for are applied HERE, on top of
 * calcPrice's result, never inside pricing.js.
 *
 *   const display = calcDisplayPrice(product, { size, qty, options, package, custom });
 *   // -> { unit, each, qty, qtyDiscountPct, subtotal, breakdown }
 *   //    unit/each/subtotal are markup-applied and rounded to .49/.99.
 *
 * Works in the browser (window.calcDisplayPrice) and Node (module.exports).
 */
(function (root) {
  var calcPrice = (typeof module !== 'undefined' && module.exports)
    ? require('./pricing.js').calcPrice
    : root.calcPrice;

  function round2(n) { return Math.round(n * 100) / 100; }

  // Nearest ending-in-.49-or-.99 price to n (e.g. 82.65 -> 82.49, 107.45 -> 107.49).
  function roundPsych(n) {
    if (!(n > 0)) return 0;
    return Math.round((n + 0.01) * 2) / 2 - 0.01;
  }

  function calcDisplayPrice(product, sel) {
    sel = sel || {};
    var markup = product.markup != null ? product.markup : (sel.markup != null ? sel.markup : 1);
    var raw = calcPrice(product, Object.assign({}, sel, { markup: markup }));
    var unit = roundPsych(raw.unit);
    var each = round2(unit * (1 - (raw.qtyDiscountPct || 0) / 100));
    var subtotal = round2(each * raw.qty);
    var breakdown = raw.breakdown.map(function (b) {
      return { item: b.item, amount: round2(b.amount * markup) };
    });
    return { unit: unit, each: each, qty: raw.qty, qtyDiscountPct: raw.qtyDiscountPct, subtotal: subtotal, breakdown: breakdown, rawUnit: raw.unit };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { calcDisplayPrice: calcDisplayPrice, roundPsych: roundPsych };
  else root.calcDisplayPrice = calcDisplayPrice;
})(typeof window !== 'undefined' ? window : this);
