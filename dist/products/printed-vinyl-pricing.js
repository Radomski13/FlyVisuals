/**
 * printed-vinyl-pricing.js — price for the Printed Vinyl order page (/logan/).
 *
 * Brian's rule (2026-11-17): $6 per sq ft, always billed at the full 52" roll
 * width x the length the customer needs. The customer's width is still asked
 * for (it must fit on the roll); the unused part of the 52" width is waste and
 * is charged too.
 *
 *   price per piece = 52 x length (inches) / 144 x $6
 *   total           = price per piece x quantity
 *
 * Used by the page (browser: window.printedVinylPrice) and by
 * netlify/functions/create-checkout.js (Node: require), so both always agree.
 * Change the numbers here only; generate-print-page.js copies this file to
 * dist/products/ on every build.
 */
(function (root) {
  var PV = {
    ROLL_WIDTH_IN: 52,   // billed width, inches
    RATE_PER_SQFT: 6,    // dollars
    MAX_LENGTH_IN: 1800, // 150 ft
  };

  function r2(n) { return Math.round(n * 100) / 100; }

  // width/length in inches. Returns { err } or { billedSqft, each, qty, subtotal, wasteSqft }.
  function printedVinylPrice(width, length, qty) {
    width = Number(width); length = Number(length);
    qty = Math.max(1, Math.min(1000, parseInt(qty, 10) || 1));
    if (!(width > 0 && length > 0)) return { err: 'Please enter your width and length.' };
    if (width > PV.ROLL_WIDTH_IN) {
      return { err: 'Max width is ' + PV.ROLL_WIDTH_IN + '". If your print is wider than ' + PV.ROLL_WIDTH_IN + '" but shorter than ' + PV.ROLL_WIDTH_IN + '" the other way, swap the width and length.' };
    }
    if (length > PV.MAX_LENGTH_IN) return { err: 'Max length is ' + PV.MAX_LENGTH_IN + '" (' + PV.MAX_LENGTH_IN / 12 + ' ft). Call us for longer runs.' };
    var billedSqft = PV.ROLL_WIDTH_IN * length / 144;
    var each = r2(billedSqft * PV.RATE_PER_SQFT);
    return {
      billedSqft: r2(billedSqft),
      printSqft: r2(width * length / 144),
      wasteSqft: r2((PV.ROLL_WIDTH_IN - width) * length / 144),
      each: each,
      qty: qty,
      subtotal: r2(each * qty),
    };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { printedVinylPrice: printedVinylPrice, PV: PV };
  else { root.printedVinylPrice = printedVinylPrice; root.PV = PV; }
})(typeof window !== 'undefined' ? window : this);
