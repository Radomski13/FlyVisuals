/**
 * Sign price calculator for catalog.json.
 *
 *   const price = calcPrice(product, {
 *     size: "4' x 2'",                 // a label from product.sizes, OR
 *     custom: { width: 5, height: 3 }, // in product.customSize.unit
 *     package: "complete",             // complete | graphic_only | hardware_only (stands/displays/flags/tents)
 *     options: { two_sided: "yes_two_side", vin_uv_lam: "lam_oly_yes" },  // option code -> choice code
 *     qty: 3,
 *     markup: 1.0                      // your multiplier on their list price (e.g. 0.9 to undercut 10%)
 *   });
 *   // -> { unit, each, subtotal, qtyDiscountPct, breakdown: [...] }
 *
 * Works in the browser (window.calcPrice) and Node (module.exports).
 */
(function (root) {
  function customPrice(cs, sqft) {
    // price = max(minimum, sqft x rate of the bracket that sqft falls in)
    let rate = cs.brackets.length ? cs.brackets[0].ratePerSqft : 0;
    for (const b of cs.brackets) if (sqft >= b.fromSqft) rate = b.ratePerSqft;
    return Math.max(cs.minimumPrice || 0, sqft * rate);
  }

  function round2(n) { return Math.round(n * 100) / 100; }

  function calcPrice(product, sel) {
    sel = sel || {};
    const markup = sel.markup || 1;
    const qty = Math.max(1, sel.qty || 1);
    const breakdown = [];
    let graphic = 0, hardware = 0, refSize = null;

    if (sel.custom && product.customSize) {
      const cs = product.customSize;
      const w = +sel.custom.width, h = +sel.custom.height;
      if (cs.maxWidth && w > cs.maxWidth) throw new Error(`Max width is ${cs.maxWidth} ${cs.unit}`);
      if (cs.maxHeight && h > cs.maxHeight) throw new Error(`Max height is ${cs.maxHeight} ${cs.unit}`);
      const sqft = w * h / (cs.unit === "in" ? 144 : 1);
      graphic = customPrice(cs, sqft);
      breakdown.push({ item: `Custom ${w} x ${h} ${cs.unit} (${round2(sqft)} sq ft)`, amount: graphic });
    } else {
      refSize = product.sizes.find(s => s.label === sel.size) || product.sizes[0];
      graphic = refSize.graphicPrice != null ? refSize.graphicPrice : refSize.price;
      hardware = refSize.hardwarePrice || 0;
      breakdown.push({ item: `Size ${refSize.label}`, amount: graphic });
    }

    const pkg = sel.package || "complete";
    if (pkg === "hardware_only") { breakdown.length = 0; graphic = 0; }
    if (pkg !== "graphic_only" && hardware) breakdown.push({ item: "Hardware", amount: hardware });
    if (pkg === "graphic_only") hardware = 0;

    let optTotal = 0;
    if (pkg !== "hardware_only") {
      for (const grp of product.options || []) {
        const code = (sel.options || {})[grp.code];
        const ch = grp.choices.find(c => c.code === code) || grp.choices.find(c => c.default) || grp.choices[0];
        if (!ch) continue;
        let add = 0;
        if (ch.priceType === "flat") add = ch.value;
        else if (ch.priceType === "percent") add = graphic * ch.value / 100;
        else if (ch.priceType === "per_size") add = refSize ? (ch.value[refSize.label] || 0) : 0;
        if (add) { optTotal += add; breakdown.push({ item: `${grp.name}: ${ch.label}`, amount: round2(add) }); }
      }
    }

    let unit = (graphic + hardware + optTotal) * markup;
    let qtyDiscountPct = 0;
    for (const t of product.quantityDiscounts || []) if (qty >= t.minQty) qtyDiscountPct = t.percentOff;
    const each = round2(unit * (1 - qtyDiscountPct / 100));
    return { unit: round2(unit), each, qty, qtyDiscountPct, subtotal: round2(each * qty), breakdown };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { calcPrice };
  else root.calcPrice = calcPrice;
})(typeof window !== "undefined" ? window : this);
