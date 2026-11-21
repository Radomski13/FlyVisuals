(function () {
  function ready(f) { document.readyState !== 'loading' ? f() : document.addEventListener('DOMContentLoaded', f); }
  ready(function () {
    // mobile menu
    var bb = document.querySelector('.fv-burger'), nav = document.querySelector('[data-fv-menu]');
    if (bb && nav) {
      var set = function (open) { nav.style.display = open ? '' : 'none'; bb.setAttribute('aria-expanded', open ? 'true' : 'false'); bb.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); bb.innerHTML = bb.getAttribute(open ? 'data-fv-open-icon' : 'data-fv-closed-icon'); };
      set(false); bb.addEventListener('click', function () { set(nav.style.display === 'none'); });
    }
    // FAQ toggles
    document.querySelectorAll('button[data-fv-faq]').forEach(function (b, i) {
      var ans = b.nextElementSibling; if (!ans) return;
      var icon = b.querySelector('span[aria-hidden="true"]');
      var set = function (open) { ans.style.display = open ? '' : 'none'; b.setAttribute('aria-expanded', open ? 'true' : 'false'); if (icon && /^[+−–-]$/.test(icon.textContent.trim())) icon.textContent = open ? '−' : '+'; };
      set(i === 0); b.addEventListener('click', function () { set(ans.style.display === 'none'); });
    });
    // quote chips
    var hidden = document.querySelector('input[name="services"]');
    if (hidden) {
      var chips = document.querySelectorAll('button[data-fv-chip]');
      var on = hidden.getAttribute('data-on'), off = hidden.getAttribute('data-off');
      chips.forEach(function (c) { c.addEventListener('click', function () {
        var p = c.getAttribute('aria-pressed') !== 'true'; c.setAttribute('aria-pressed', p ? 'true' : 'false'); c.setAttribute('style', p ? on : off);
        hidden.value = [].filter.call(chips, function (x) { return x.getAttribute('aria-pressed') === 'true'; }).map(function (x) { return x.textContent.trim(); }).join(', ');
      }); });
    }
    // product category tabs
    var tabs = document.querySelector('[data-fv-tabs]');
    if (tabs) {
      var tb = tabs.querySelectorAll('button'), onS = '', offS = '';
      tb.forEach(function (b) { if (b.getAttribute('aria-pressed') === 'true') onS = b.getAttribute('style'); else if (!offS) offS = b.getAttribute('style'); });
      tb.forEach(function (b) { b.addEventListener('click', function () {
        var c = b.textContent.trim();
        tb.forEach(function (x) { var on = x === b; x.setAttribute('aria-pressed', on ? 'true' : 'false'); x.setAttribute('style', on ? onS : offS); });
        document.querySelectorAll('[data-cats]').forEach(function (a) { a.style.display = (c === 'All' || (' ' + a.getAttribute('data-cats') + ' ').indexOf(' ' + c + ' ') > -1) ? '' : 'none'; });
      }); });
    }
  });
})();
(function () {
  // prefill the quote form from a shop order (?order=...) and the artwork form (?order=FV-...)
  document.addEventListener('DOMContentLoaded', function () {
    var q = new URLSearchParams(location.search).get('order'); if (!q) return;
    var d = document.querySelector('textarea[name="details"]'); if (d && !d.value) d.value = q;
    var o = document.querySelector('input[name="order"]'); if (o) o.value = q;
  });
})();
