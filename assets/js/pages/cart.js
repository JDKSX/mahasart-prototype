/* ตะกร้าสินค้า: รายการจาก MH.cart · ปรับจำนวนไม่เกินสต็อก · ลบ · สรุปยอดและส่งฟรี · ไปสั่งซื้อ
   ใช้ได้โดยไม่ล็อกอิน (ตะกร้าเก็บในเบราว์เซอร์) */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h, root = document.getElementById('cart-root');
  document.querySelectorAll('[data-disclaimer]').forEach(function (el) { el.textContent = MH.store.setting('disclaimer') || ''; });

  /* id สินค้าตามลำดับในตะกร้า (ใช้ลบรายการที่สินค้าถูกลบออกจากระบบไปแล้ว) */
  function rawIds() {
    try { return (JSON.parse(localStorage.getItem('mahasart-cart')) || { items: [] }).items.map(function (x) { return x.amulet_id; }); } catch (e) { return []; }
  }

  function lineHtml(it, idx, ids) {
    var a = it.amulet, id = a ? a.id : ids[idx];
    if (!a) {
      return '<li class="sh-line"><div class="thumb" aria-hidden="true">' + MH.ui.art('a-none') + '</div>' +
        '<div class="sh-line-main"><h3>สินค้านี้ไม่มีในระบบแล้ว</h3></div>' +
        '<div class="sh-line-side"><button type="button" class="sh-link-btn" data-remove="' + id + '">นำออกจากตะกร้า</button></div>' +
        '<div class="notice notice--warn" role="note">' + h(it.problem) + '</div></li>';
    }
    var url = 'amulet.html?code=' + encodeURIComponent(a.code), stock = a.stock_qty || 0;
    var tone = a.tone === 'violet' ? ' thumb--violet' : '';
    var canInc = it.qty < stock;
    return '<li class="sh-line" data-line="' + a.id + '">' +
      '<a class="thumb' + tone + '" href="' + url + '" tabindex="-1" aria-hidden="true">' + MH.ui.art(a.art) + '</a>' +
      '<div class="sh-line-main"><h3><a href="' + url + '">' + h(a.name) + '</a></h3>' +
        '<p class="sh-line-meta">รหัส ' + h(a.code) + (a.price_amount != null ? ' · ' + MH.money(a.price_amount) + ' ต่อชิ้น' : '') + '</p>' +
        (!it.problem ? '<p class="sh-line-meta">' + (stock <= 3 ? 'เหลือ ' + stock + ' ชิ้น' : 'มีของพร้อมส่ง') + '</p>' : '') + '</div>' +
      '<div class="sh-line-side">' +
        '<div class="sh-qty" role="group" aria-label="จำนวน ' + h(a.name) + '">' +
          '<button type="button" data-dec="' + a.id + '" aria-label="ลดจำนวน ' + h(a.name) + '"' + (it.qty <= 1 ? ' disabled' : '') + '>−</button>' +
          '<input type="number" inputmode="numeric" min="1" max="' + Math.max(stock, 1) + '" value="' + it.qty + '" data-qty="' + a.id + '" aria-label="จำนวน ' + h(a.name) + '">' +
          '<button type="button" data-inc="' + a.id + '" aria-label="เพิ่มจำนวน ' + h(a.name) + '"' + (canInc ? '' : ' disabled') + '>+</button></div>' +
        (it.problem ? '' : '<span class="sh-line-total">' + MH.money(it.line_total) + '</span>') +
        '<button type="button" class="sh-link-btn" data-remove="' + a.id + '" aria-label="นำ ' + h(a.name) + ' ออกจากตะกร้า">นำออก</button></div>' +
      (it.problem ? '<div class="notice notice--warn" role="note"><span><b>' + h(it.problem) + '</b> รายการนี้ยังไม่นับในยอดรวม ' + (stock > 0 ? 'ลดจำนวนให้ไม่เกินที่มี' : 'นำออกจากตะกร้า') + 'จึงจะสั่งซื้อได้</span></div>' : '') +
      '</li>';
  }

  function summaryHtml(items) {
    var ok = items.filter(function (x) { return !x.problem; }), t = MH.cart.totals(items);
    var n = ok.reduce(function (s, x) { return s + x.qty; }, 0), blocked = items.some(function (x) { return x.problem; });
    var free = '';
    if (t.subtotal > 0 && t.free_shipping_min) {
      if (t.missing_for_free > 0) {
        var pct = Math.min(100, Math.round(t.subtotal / t.free_shipping_min * 100));
        free = '<div class="sh-free"><p>ซื้อเพิ่มอีก <b>' + MH.money(t.missing_for_free) + '</b> ส่งฟรี (ครบ ' + MH.money(t.free_shipping_min) + ')</p>' +
          '<div class="sh-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="ความคืบหน้าสู่ส่งฟรี"><i data-w="' + pct + '"></i></div></div>';
      } else {
        free = '<p class="sh-free"><b>ได้ส่งฟรีแล้ว</b> ยอดสินค้าครบ ' + MH.money(t.free_shipping_min) + '</p>';
      }
    }
    var member = MH.member.current();
    return '<aside class="sh-card sh-aside" aria-labelledby="sum-h"><h2 id="sum-h">สรุปคำสั่งซื้อ</h2>' +
      '<div class="sh-row"><span>สินค้า ' + n + ' ชิ้น</span><b>' + MH.money(t.subtotal) + '</b></div>' +
      '<div class="sh-row"><span>ค่าส่ง (EMS)</span><b>' + (t.subtotal === 0 ? '-' : (t.shipping_fee === 0 ? 'ส่งฟรี' : MH.money(t.shipping_fee))) + '</b></div>' +
      '<div class="sh-row sh-row--total"><span>ยอดรวม</span><b>' + MH.money(t.total) + '</b></div>' + free +
      '<div class="sh-cta">' +
        (blocked || n === 0
          ? '<button type="button" class="btn btn--primary" disabled aria-describedby="cart-block">สั่งซื้อ</button><p class="sh-note" id="cart-block">' + (blocked ? 'แก้รายการที่มีป้ายเตือนก่อน (ลดจำนวนหรือนำออก) จึงจะสั่งซื้อได้' : 'ยังไม่มีสินค้าที่สั่งซื้อได้ในตะกร้า') + '</p>'
          : '<a class="btn btn--primary" href="checkout.html">สั่งซื้อ (' + n + ' ชิ้น)' + MH.ui.icon('i-arrow') + '</a>') +
        '<a class="btn btn--outline" href="amulets.html">เลือกซื้อต่อ</a></div>' +
      (!member ? '<p class="sh-note">การสั่งซื้อต้องเข้าสู่ระบบสมาชิก ตะกร้านี้จะยังอยู่ให้หลังเข้าสู่ระบบ</p>' : '') +
      '<p class="sh-note">สินค้าจะถูกจองให้เมื่อกดไปชำระเงิน และต้องชำระภายใน ' + (MH.store.setting('payment_timeout_min') || 30) + ' นาที</p></aside>';
  }

  function render(focusSel) {
    var items = MH.cart.items(), ids = rawIds();
    if (!items.length) {
      root.innerHTML = MH.ui.empty('ตะกร้ายังว่าง', 'เลือกวัตถุมงคลที่สนใจแล้วกด “ใส่ตะกร้า” ราคาและจำนวนที่เหลือดูได้ในหน้าสินค้า', '<a class="btn btn--primary" href="amulets.html">ไปหน้าวัตถุมงคล</a>');
      return;
    }
    root.innerHTML = '<div class="sh-grid"><section class="sh-card" aria-labelledby="items-h"><h2 id="items-h">รายการสินค้า</h2><ul class="sh-lines">' +
      items.map(function (it, i) { return lineHtml(it, i, ids); }).join('') + '</ul></section>' + summaryHtml(items) + '</div>';
    root.querySelectorAll('[data-w]').forEach(function (el) { el.style.width = el.getAttribute('data-w') + '%'; });
    if (focusSel) {
      var el = root.querySelector(focusSel + ':not(:disabled)') || root.querySelector('[data-qty="' + (focusSel.match(/"(\d+)"/) || [])[1] + '"]');
      if (el) el.focus();
    }
  }

  function qtyOf(id) {
    var f = MH.cart.items().filter(function (x) { return x.amulet && x.amulet.id === Number(id); })[0];
    return f ? f.qty : 0;
  }
  function setQty(id, want, focusSel) {
    var it = MH.cart.items().filter(function (x) { return x.amulet && x.amulet.id === Number(id); })[0];
    if (!it) return;
    var stock = it.amulet.stock_qty || 0;
    want = Math.floor(Number(want));
    if (!isFinite(want) || want < 1) want = 1;
    if (want > stock && stock > 0) { want = stock; MH.ui.toast('ชิ้นนี้เหลือเพียง ' + stock + ' ชิ้น'); }
    MH.cart.setQty(id, want);
    render(focusSel);
  }

  root.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || b.disabled) return;
    var id;
    if ((id = b.getAttribute('data-dec'))) setQty(id, qtyOf(id) - 1, '[data-dec="' + id + '"]');
    else if ((id = b.getAttribute('data-inc'))) setQty(id, qtyOf(id) + 1, '[data-inc="' + id + '"]');
    else if ((id = b.getAttribute('data-remove'))) {
      MH.cart.remove(id);
      MH.ui.toast('นำออกจากตะกร้าแล้ว');
      render();
      var hd = document.getElementById('page-h'); if (hd) hd.focus();
    }
  });
  root.addEventListener('change', function (e) {
    var inp = e.target.closest('[data-qty]'); if (!inp) return;
    var id = inp.getAttribute('data-qty');
    setQty(id, inp.value, '[data-qty="' + id + '"]');
  });
  document.addEventListener('mh:cart', function () { /* header อัปเดตเอง */ });

  render();
})();
