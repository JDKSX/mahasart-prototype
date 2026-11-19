/* แท็บ "คำสั่งซื้อ" ในหน้าบัญชี (account.html?tab=orders): คำสั่งซื้อของสมาชิก ใหม่สุดก่อน + สถานะ + ลิงก์ order.html */
(function () {
  'use strict';
  var MH = window.MH; if (!MH || !MH.account) return;
  var h = MH.util.h, S = MH.store;

  /* หน้าบัญชีเป็นของผู้สร้างอื่น อาจไม่ได้ลิงก์ shop.css ไว้ จึงเติมให้เอง */
  function ensureCss() {
    if (document.querySelector('link[href$="shop.css"]')) return;
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = MH.base + 'assets/css/shop.css'; document.head.appendChild(l);
  }

  MH.account.register({
    key: 'orders', label: 'คำสั่งซื้อ', order: 5,
    render: function (host, member) {
      ensureCss();
      member = member || MH.member.current();
      var orders = S.all('orders').filter(function (o) { return member && o.member_id === member.id; })
        .sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)) || b.id - a.id; });
      if (!orders.length) {
        host.innerHTML = MH.ui.empty('ยังไม่มีคำสั่งซื้อ', 'เมื่อสั่งซื้อวัตถุมงคล คำสั่งซื้อและเลขพัสดุจะมาแสดงที่นี่', '<a class="btn btn--primary" href="' + MH.base + 'amulets.html">ไปหน้าวัตถุมงคล</a>');
        return;
      }
      host.innerHTML = '<h2 class="sh-h" id="ord-h">คำสั่งซื้อของฉัน</h2><p class="sh-note">ใหม่สุดอยู่บนสุด · ทั้งหมด ' + orders.length + ' รายการ</p>' +
        '<ul class="sh-orders" aria-labelledby="ord-h">' + orders.map(function (o) {
          var its = S.all('order_items').filter(function (i) { return i.order_id === o.id; });
          var url = MH.base + 'order.html?no=' + encodeURIComponent(o.order_no);
          var pay = o.status === 'pending_payment' ? MH.pay.forPayable('order', o.id).filter(function (p) { return p.status === 'pending'; })[0] : null;
          return '<li class="sh-order"><div><h3><a href="' + url + '">' + h(o.order_no) + '</a></h3>' +
            '<p>' + h(MH.util.dateShort(o.created_at)) + ' · ' + its.reduce(function (s, i) { return s + i.qty; }, 0) + ' ชิ้น</p>' +
            '<p>' + h(its.map(function (i) { return i.name + (i.qty > 1 ? ' × ' + i.qty : ''); }).join(', ')) + '</p>' +
            (o.tracking_no ? '<p>เลขพัสดุ ' + h(o.tracking_no) + '</p>' : '') + '</div>' +
            '<div class="sh-order-side"><span class="sh-pill sh-pill--o-' + h(o.status) + '">' + h(MH.labels.orderStatus[o.status] || o.status) + '</span>' +
            '<span class="sh-order-total">' + h(MH.money(o.total)) + '</span>' +
            '<div class="btn-row">' + (pay ? '<a class="btn btn--gold btn--sm" href="' + h(MH.pay.url(pay)) + '">ไปชำระเงิน</a>' : '') +
            '<a class="btn btn--outline btn--sm" href="' + url + '" aria-label="ดูรายละเอียดคำสั่งซื้อ ' + h(o.order_no) + '">ดูรายละเอียด</a></div></div></li>';
        }).join('') + '</ul>';
    }
  });
})();
