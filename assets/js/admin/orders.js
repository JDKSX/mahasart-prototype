/* หลังบ้าน: รายการคำสั่งซื้อ — chips สถานะพร้อมจำนวน (sync ?status=) · ค้นหาเลขที่/ชื่อ · ตาราง */
(function () {
  'use strict';
  var MH = window.MH; if (!MH.admin.allowed) return;
  var h = MH.util.h, S = MH.store;
  function $(id) { return document.getElementById(id); }

  var STATUS = [{ k: '', t: 'ทั้งหมด' }].concat(['pending_payment', 'paid', 'packing', 'shipped', 'delivered', 'cancelled', 'refunded'].map(function (k) { return { k: k, t: MH.labels.orderStatus[k] }; }));
  var f = { q: MH.util.param('q') || '', status: MH.util.param('status') || '' };
  if (!STATUS.some(function (s) { return s.k === f.status; })) f.status = '';
  if (MH.admin.can('shop.settings')) $('settings-link').hidden = false;
  $('f-q').value = f.q;

  function load() {
    var members = {}; S.all('members', { withTrashed: true }).forEach(function (m) { members[m.id] = m; });
    return S.all('orders').sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)) || b.id - a.id; }).map(function (o) {
      var m = members[o.member_id];
      return { o: o, who: (o.shipping && o.shipping.name) || (m ? m.display_name : '-'), email: m ? m.email : '' };
    });
  }
  function matchQ(it) {
    var q = f.q.trim().toLowerCase();
    return !q || [it.o.order_no, it.who, it.email].join(' ').toLowerCase().indexOf(q) >= 0;
  }
  function syncUrl() {
    var p = new URLSearchParams();
    if (f.q) p.set('q', f.q);
    if (f.status) p.set('status', f.status);
    var qs = p.toString();
    try { history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '')); } catch (e) { /* เปิดจากไฟล์บางเบราว์เซอร์ไม่ให้แก้ URL */ }
  }

  function row(it) {
    var o = it.o, url = 'order-detail.html?id=' + o.id;
    return '<tr>' +
      '<td data-label="" class="nm"><a class="m-title" href="' + url + '"><b class="num">' + h(o.order_no) + '</b></a></td>' +
      '<td data-label="วันที่">' + h(MH.util.dateTime(o.created_at)) + '</td>' +
      '<td data-label="ลูกค้า">' + h(it.who) + '</td>' +
      '<td data-label="ยอด" class="num">' + h(MH.money(o.total)) + '</td>' +
      '<td data-label="สถานะ"><span class="sh-pill sh-pill--o-' + h(o.status) + '">' + h(MH.labels.orderStatus[o.status] || o.status) + '</span></td>' +
      '<td data-label="ชำระ"><span class="sh-pill sh-pill--p-' + h(o.payment_status) + '">' + h(MH.labels.paymentStatus[o.payment_status] || o.payment_status) + '</span></td>' +
      '<td data-label="" class="acts"><a class="btn btn--outline btn--sm" href="' + url + '" aria-label="ดูรายละเอียดคำสั่งซื้อ ' + h(o.order_no) + '">ดูรายละเอียด</a></td></tr>';
  }

  function render() {
    var items = load(), base = items.filter(matchQ);
    var shown = base.filter(function (it) { return !f.status || it.o.status === f.status; });
    $('status-chips').innerHTML = STATUS.map(function (s) {
      var n = base.filter(function (it) { return !s.k || it.o.status === s.k; }).length;
      return '<button type="button" class="chip" data-status="' + s.k + '" aria-pressed="' + (f.status === s.k) + '">' + h(s.t) + ' <span class="chip-n">' + n + '</span></button>';
    }).join('');
    $('result-count').textContent = 'แสดง ' + shown.length + ' จาก ' + items.length + ' รายการ';
    var host = $('list');
    if (!items.length) { host.innerHTML = MH.ui.empty('ยังไม่มีคำสั่งซื้อ', 'เมื่อลูกค้าสั่งซื้อจากหน้าร้าน คำสั่งซื้อจะมาแสดงที่นี่'); return; }
    if (!shown.length) { host.innerHTML = MH.ui.empty('ไม่พบคำสั่งซื้อที่ตรงกับตัวกรอง', 'ลองเปลี่ยนคำค้นหรือเลือกสถานะอื่น', '<button type="button" class="btn btn--outline" id="clear-f">ล้างตัวกรอง</button>'); return; }
    host.innerHTML = '<div class="table-wrap"><table class="table table--stack"><caption class="sr-only">รายการคำสั่งซื้อ</caption>' +
      '<thead><tr><th scope="col">เลขที่</th><th scope="col">วันที่</th><th scope="col">ลูกค้า</th><th scope="col">ยอด</th><th scope="col">สถานะ</th><th scope="col">ชำระ</th><th scope="col"><span class="sr-only">การกระทำ</span></th></tr></thead>' +
      '<tbody>' + shown.map(row).join('') + '</tbody></table></div>';
  }

  $('f-q').addEventListener('input', function () { f.q = this.value; syncUrl(); render(); });
  $('status-chips').addEventListener('click', function (e) {
    var b = e.target.closest('[data-status]'); if (!b) return;
    f.status = b.getAttribute('data-status'); syncUrl(); render();
    var again = $('status-chips').querySelector('[data-status="' + f.status + '"]'); if (again) again.focus();
  });
  $('list').addEventListener('click', function (e) {
    if (!e.target.closest('#clear-f')) return;
    f = { q: '', status: '' }; $('f-q').value = ''; syncUrl(); render(); $('f-q').focus();
  });

  render();
})();
