/* ส่วนร้านค้าบนแดชบอร์ด: รอแพ็ก · กำลังแพ็ก · ยอดขาย 7 วัน · สินค้าใกล้หมด (เห็นเมื่อมีสิทธิ์ orders.view) */
(function () {
  'use strict';
  var MH = window.MH; if (!MH || !MH.admin || !MH.admin.allowed) return;
  var host = document.getElementById('dash-extra');
  if (!host || !MH.admin.can('orders.view')) return;
  var h = MH.util.h, S = MH.store;

  if (!document.querySelector('link[href$="shop.css"]')) {
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = MH.base + 'assets/css/shop.css'; document.head.appendChild(l);
  }

  var orders = S.all('orders');
  var waiting = orders.filter(function (o) { return o.status === 'paid'; }).length;
  var packing = orders.filter(function (o) { return o.status === 'packing'; }).length;
  var since = Date.now() - 7 * 864e5;
  /* ยอดขาย 7 วัน: เฉพาะคำสั่งซื้อที่ payment_status = paid (คืนเงิน/ยกเลิกไม่นับ) นับตามเวลาที่ชำระ */
  var week = orders.filter(function (o) { return o.payment_status === 'paid' && o.paid_at && new Date(o.paid_at).getTime() >= since; });
  var sales = week.reduce(function (s, o) { return s + (Number(o.total) || 0); }, 0);
  /* ใกล้หมด: เผยแพร่อยู่ ยังเปิดขาย (ไม่ใช่ส่งมอบแล้ว/ไม่เปิดให้บูชา) และสต็อก ≤ 2 */
  var low = S.all('amulets').filter(function (m) {
    return MH.q.isLive(m) && m.stock_status !== 'sold' && m.stock_status !== 'not_for_sale' && (m.stock_qty || 0) <= 2;
  }).sort(function (a, b) { return (a.stock_qty || 0) - (b.stock_qty || 0) || a.id - b.id; });

  var sec = document.createElement('section');
  sec.className = 'card'; sec.setAttribute('aria-labelledby', 'dash-shop-h');
  sec.innerHTML = '<h2 id="dash-shop-h" class="sh-h">ร้านค้า</h2><p class="sec-note">คำสั่งซื้อที่ต้องทำและยอดขายล่าสุด</p>' +
    '<div class="kpis">' +
      '<a class="kpi' + (waiting ? ' warn' : '') + '" href="orders.html?status=paid"><b>' + waiting + '</b><span>รอแพ็ก (ชำระแล้ว)</span></a>' +
      '<a class="kpi" href="orders.html?status=packing"><b>' + packing + '</b><span>กำลังแพ็ก</span></a>' +
      '<a class="kpi" href="orders.html"><b>' + h(MH.money(sales)) + '</b><span>ยอดขาย 7 วัน (' + week.length + ' คำสั่งซื้อ)</span></a>' +
      '<a class="kpi' + (low.length ? ' warn' : '') + '" href="amulets.html?stock=low"><b>' + low.length + '</b><span>สินค้าใกล้หมด (เหลือ ≤ 2 ชิ้น)</span></a>' +
    '</div>' +
    (low.length ? '<ul class="sh-dash-list" aria-label="สินค้าใกล้หมด">' + low.map(function (m) {
      return '<li><a href="amulet-edit.html?id=' + m.id + '">' + h(m.code + ' ' + m.name) + '</a><span class="sh-low">' + ((m.stock_qty || 0) ? 'เหลือ ' + m.stock_qty + ' ชิ้น' : 'หมด') + '</span></li>';
    }).join('') + '</ul>' : '<p class="muted">ยังไม่มีสินค้าใกล้หมด</p>');
  host.appendChild(sec);
})();
