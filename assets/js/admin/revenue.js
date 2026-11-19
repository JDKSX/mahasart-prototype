/* รายได้หลังบ้าน: ยอดรับจริงจาก payments (status paid) แยกช่องทาง + ยอดคืนเงิน · ยอดที่ต้องโอนให้ผู้เชี่ยวชาญ · ส่งออก CSV
   ส่วนแบ่งผู้เชี่ยวชาญ = นัดที่ completed × (1 − commission_rate ของคน) + คอร์สที่ขายได้ (payments enrollment ที่ paid) × (1 − course_commission)
   ทำเครื่องหมายว่าโอนแล้ว → expert_payouts { expert_id, amount, period, paid_at, item_keys } · item_keys กันโอนซ้ำข้ามช่วงเวลาที่ทับกัน */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h;
  if (!MH.admin.allowed) return;
  var S = MH.store;

  var RANGES = [['month', 'เดือนนี้'], ['d30', '30 วันล่าสุด'], ['all', 'ทั้งหมด']];
  var TYPES = [['order', 'ขายสินค้า'], ['booking', 'นัดผู้เชี่ยวชาญ'], ['enrollment', 'คอร์สเรียน'], ['subscription', 'แพ็กเกจพรีเมียม']];
  var r = MH.util.param('range');
  var state = { range: RANGES.some(function (x) { return x[0] === r; }) ? r : 'month' };

  var chipsEl = document.getElementById('range-chips');
  chipsEl.innerHTML = RANGES.map(function (x) { return '<button type="button" class="chip" data-range="' + x[0] + '" aria-pressed="false">' + h(x[1]) + '</button>'; }).join('');

  function round2(n) { return Math.round(n * 100) / 100; }
  function money(n) { n = round2(n); return '฿' + n.toLocaleString('th-TH', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
  function pad(n) { return ('0' + n).slice(-2); }

  function rangeInfo() {
    var now = new Date(), from = null, label;
    if (state.range === 'month') { from = new Date(now.getFullYear(), now.getMonth(), 1); label = 'เดือนนี้ (' + now.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' }) + ')'; }
    else if (state.range === 'd30') { from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29); label = '30 วันล่าสุด (ตั้งแต่ ' + MH.util.dateShort(from.toISOString()) + ')'; }
    else label = 'ทั้งหมด (ตั้งแต่เริ่มมีรายการ)';
    var key = state.range === 'month' ? now.getFullYear() + '-' + pad(now.getMonth() + 1) : state.range + ':' + MH.util.todayISO();
    return { from: from, label: label, key: key };
  }
  function inRange(iso, info) {
    if (!iso) return false;
    var d = new Date(iso); if (isNaN(d.getTime())) return false;
    return !info.from || d >= info.from;
  }

  /* ---------- ยอดรับ ---------- */
  function payData(info) {
    var rows = S.all('payments').map(function (p) { return { p: p, at: p.paid_at || p.created_at }; }).filter(function (x) { return inRange(x.at, info); });
    var by = {}; TYPES.forEach(function (t) { by[t[0]] = { n: 0, paid: 0, refunded: 0, refundN: 0 }; });
    rows.forEach(function (x) {
      var b = by[x.p.payable_type] || (by[x.p.payable_type] = { n: 0, paid: 0, refunded: 0, refundN: 0 });
      if (x.p.status === 'paid') { b.n++; b.paid += Number(x.p.amount) || 0; }
      if (x.p.status === 'refunded') { b.refundN++; b.refunded += Number(x.p.amount) || 0; }
    });
    return { rows: rows, by: by };
  }

  /* ---------- ส่วนแบ่งผู้เชี่ยวชาญ ---------- */
  function shareItems() {
    var items = [];
    var experts = {}; S.all('experts', { withTrashed: true }).forEach(function (e) { experts[e.id] = e; });
    var defRate = S.setting('expert_commission'); if (defRate == null) defRate = 0.2;
    var courseRate = S.setting('course_commission'); if (courseRate == null) courseRate = 0.3;
    S.all('expert_bookings').filter(function (b) { return b.status === 'completed'; }).forEach(function (b) {
      var paid = MH.pay.forPayable('booking', b.id).filter(function (p) { return p.status === 'paid'; })[0];
      var e = experts[b.expert_id]; if (!paid || !e) return;
      var rate = e.commission_rate != null ? e.commission_rate : defRate;
      items.push({ key: 'b' + b.id, expert_id: e.id, kind: 'booking', ref: b.booking_no, at: b.completed_at || b.start_at, base: Number(b.total) || 0, rate: rate, share: round2((Number(b.total) || 0) * (1 - rate)) });
    });
    S.all('payments').filter(function (p) { return p.payable_type === 'enrollment' && p.status === 'paid'; }).forEach(function (p) {
      var en = S.find('course_enrollments', p.payable_id), c = en ? S.find('courses', en.course_id) : null, e = c ? experts[c.expert_id] : null;
      if (!e) return;
      items.push({ key: 'e' + p.id, expert_id: e.id, kind: 'course', ref: p.ref + ' · ' + c.title, at: p.paid_at || p.created_at, base: Number(p.amount) || 0, rate: courseRate, share: round2((Number(p.amount) || 0) * (1 - courseRate)) });
    });
    return { items: items, experts: experts };
  }
  function payoutData(info) {
    var sd = shareItems(), payouts = S.all('expert_payouts');
    var covered = {}; payouts.forEach(function (po) { (po.item_keys || []).forEach(function (k) { covered[k] = po; }); });
    var per = {};
    sd.items.filter(function (it) { return inRange(it.at, info); }).forEach(function (it) {
      var o = per[it.expert_id] || (per[it.expert_id] = { expert: sd.experts[it.expert_id], bN: 0, bSum: 0, cN: 0, cSum: 0, paidSum: 0, dueSum: 0, dueKeys: [], items: [] });
      if (it.kind === 'booking') { o.bN++; o.bSum += it.share; } else { o.cN++; o.cSum += it.share; }
      if (covered[it.key]) o.paidSum += it.share; else { o.dueSum += it.share; o.dueKeys.push(it.key); }
      o.items.push(it);
    });
    var list = Object.keys(per).map(function (k) { return per[k]; }).sort(function (a, b) { return b.dueSum - a.dueSum; });
    return { list: list, payouts: payouts, covered: covered };
  }

  /* ---------- วาด ---------- */
  function render() {
    var info = rangeInfo(), pd = payData(info), po = payoutData(info);
    chipsEl.querySelectorAll('.chip').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-range') === state.range)); });
    document.getElementById('range-note').textContent = info.label;
    try { history.replaceState(null, '', 'revenue.html?range=' + state.range); } catch (e) { /* เปิดจากไฟล์บางกรณีเปลี่ยน URL ไม่ได้ */ }

    var totalPaid = 0, totalN = 0, totalRef = 0;
    Object.keys(pd.by).forEach(function (k) { totalPaid += pd.by[k].paid; totalN += pd.by[k].n; totalRef += pd.by[k].refunded; });
    var due = po.list.reduce(function (s, x) { return s + x.dueSum; }, 0);
    var shareAll = po.list.reduce(function (s, x) { return s + x.bSum + x.cSum; }, 0);
    document.getElementById('kpis').innerHTML =
      '<div class="kpi"><b>' + h(money(totalPaid)) + '</b><span>ยอดรับจริง</span><span class="note">' + totalN + ' รายการที่ชำระแล้ว</span></div>' +
      '<div class="kpi' + (totalRef ? ' warn' : '') + '"><b>' + h(money(totalRef)) + '</b><span>คืนเงินแล้ว</span><span class="note">แยกจากยอดรับ</span></div>' +
      '<div class="kpi' + (due ? ' warn' : ' ok') + '"><b>' + h(money(due)) + '</b><span>ที่ต้องโอนให้ผู้เชี่ยวชาญ</span><span class="note">ยังไม่ได้ทำเครื่องหมายว่าโอน</span></div>' +
      '<div class="kpi"><b>' + h(money(shareAll)) + '</b><span>ส่วนแบ่งผู้เชี่ยวชาญรวมช่วงนี้</span><span class="note">นัดที่เสร็จ + คอร์สที่ขายได้</span></div>';

    /* ตารางช่องทาง */
    var maxPaid = Math.max.apply(null, TYPES.map(function (t) { return pd.by[t[0]].paid; }).concat([1]));
    document.getElementById('types').innerHTML = '<div class="table-wrap"><table class="table table--stack"><caption class="sr-only">ยอดรับจริงแยกตามช่องทาง ' + h(info.label) + '</caption><thead><tr>' +
      '<th scope="col">ช่องทาง</th><th scope="col" class="crs-money">รายการ</th><th scope="col" class="crs-money">ยอดรับจริง</th><th scope="col" class="crs-money">คืนเงิน</th><th scope="col">สัดส่วน</th></tr></thead><tbody>' +
      TYPES.map(function (t) {
        var b = pd.by[t[0]];
        return '<tr><td class="cell-title">' + h(t[1]) + '</td><td data-label="รายการ" class="crs-money">' + b.n + '</td><td data-label="ยอดรับจริง" class="crs-money">' + h(money(b.paid)) + '</td>' +
          '<td data-label="คืนเงิน" class="crs-money">' + (b.refunded ? h(money(b.refunded)) + ' <span class="muted">(' + b.refundN + ')</span>' : '-') + '</td>' +
          '<td data-label="สัดส่วน"><div class="crs-rev-bar" aria-hidden="true"><i data-w="' + Math.round(b.paid / maxPaid * 100) + '"></i></div><span class="sr-only">' + (totalPaid ? Math.round(b.paid / totalPaid * 100) : 0) + ' เปอร์เซ็นต์ของยอดรับ</span></td></tr>';
      }).join('') +
      '<tr class="crs-total"><td>รวมทั้งหมด</td><td data-label="รายการ" class="crs-money">' + totalN + '</td><td data-label="ยอดรับจริง" class="crs-money" id="total-paid">' + h(money(totalPaid)) + '</td><td data-label="คืนเงิน" class="crs-money">' + (totalRef ? h(money(totalRef)) : '-') + '</td><td></td></tr>' +
      '</tbody></table></div>' + (totalN ? '' : '<p class="crs-note">ช่วงนี้ยังไม่มีรายการที่ชำระแล้ว ลองเลือกช่วง “ทั้งหมด”</p>');

    /* ผู้เชี่ยวชาญ */
    document.getElementById('pay-hint').textContent = 'นัดที่ปรึกษาเสร็จแล้ว × (1 − ส่วนแบ่งแพลตฟอร์มของผู้เชี่ยวชาญ) + คอร์สที่ขายได้ × (1 − ' + Math.round((S.setting('course_commission') || 0) * 100) + '% ค่าคอร์ส) · นับตามวันที่นัดเสร็จหรือวันที่ชำระค่าคอร์ส · ช่วง: ' + info.label;
    document.getElementById('payouts').innerHTML = po.list.length
      ? '<div class="table-wrap"><table class="table table--stack"><caption class="sr-only">ยอดที่ต้องโอนให้ผู้เชี่ยวชาญ</caption><thead><tr>' +
        '<th scope="col">ผู้เชี่ยวชาญ</th><th scope="col" class="crs-money">นัดที่เสร็จ</th><th scope="col" class="crs-money">คอร์สที่ขาย</th><th scope="col" class="crs-money">ส่วนแบ่งรวม</th><th scope="col" class="crs-money">โอนแล้ว</th><th scope="col" class="crs-money">ต้องโอน</th><th scope="col">การกระทำ</th></tr></thead><tbody>' +
        po.list.map(function (x) {
          return '<tr><td class="cell-title">' + h(x.expert ? x.expert.display_name : '-') + '</td>' +
            '<td data-label="นัดที่เสร็จ" class="crs-money">' + x.bN + ' ครั้ง · ' + h(money(x.bSum)) + '</td>' +
            '<td data-label="คอร์สที่ขาย" class="crs-money">' + x.cN + ' ครั้ง · ' + h(money(x.cSum)) + '</td>' +
            '<td data-label="ส่วนแบ่งรวม" class="crs-money">' + h(money(x.bSum + x.cSum)) + '</td>' +
            '<td data-label="โอนแล้ว" class="crs-money">' + h(money(x.paidSum)) + '</td>' +
            '<td data-label="ต้องโอน" class="crs-money"><b>' + h(money(x.dueSum)) + '</b></td>' +
            '<td class="act-cell">' + (x.dueSum > 0
              ? '<button type="button" class="btn btn--primary btn--sm" data-pay="' + x.expert.id + '">ทำเครื่องหมายว่าโอนแล้ว</button>'
              : '<span class="pill pill--published">โอนครบแล้ว</span>') + '</td></tr>';
        }).join('') + '</tbody></table></div>'
      : MH.ui.empty('ช่วงนี้ยังไม่มียอดที่ต้องโอน', 'เมื่อผู้เชี่ยวชาญปรึกษาเสร็จ หรือมีคนซื้อคอร์ส ส่วนแบ่งจะขึ้นที่นี่');

    /* ประวัติโอน */
    var hist = po.payouts.slice().sort(function (a, b) { return String(b.paid_at).localeCompare(String(a.paid_at)); });
    document.getElementById('history').innerHTML = hist.length
      ? '<div class="table-wrap"><table class="table table--stack"><caption class="sr-only">ประวัติการทำเครื่องหมายว่าโอนแล้ว</caption><thead><tr><th scope="col">วันที่</th><th scope="col">ผู้เชี่ยวชาญ</th><th scope="col" class="crs-money">ยอด</th><th scope="col">ช่วงที่เลือกตอนบันทึก</th><th scope="col">ผู้บันทึก</th></tr></thead><tbody>' +
        hist.map(function (x) {
          var e = S.find('experts', x.expert_id);
          return '<tr><td class="cell-title">' + h(MH.util.dateTime(x.paid_at)) + '</td><td data-label="ผู้เชี่ยวชาญ">' + h(e ? e.display_name : '-') + '</td><td data-label="ยอด" class="crs-money">' + h(money(x.amount)) + '</td>' +
            '<td data-label="ช่วง">' + h(x.period) + ' · ' + (x.item_keys || []).length + ' รายการ</td><td data-label="ผู้บันทึก">' + h(MH.admin.userName(x.created_by)) + '</td></tr>';
        }).join('') + '</tbody></table></div>'
      : MH.ui.empty('ยังไม่เคยทำเครื่องหมายว่าโอน', 'เมื่อกด “ทำเครื่องหมายว่าโอนแล้ว” รายการจะขึ้นที่นี่');

    document.querySelectorAll('[data-w]').forEach(function (el) { el.style.width = el.getAttribute('data-w') + '%'; });
  }

  chipsEl.addEventListener('click', function (e) { var b = e.target.closest('[data-range]'); if (!b) return; state.range = b.getAttribute('data-range'); render(); });

  /* ทำเครื่องหมายว่าโอนแล้ว */
  document.getElementById('payouts').addEventListener('click', function (e) {
    var b = e.target.closest('[data-pay]'); if (!b) return;
    var info = rangeInfo(), po = payoutData(info), id = Number(b.getAttribute('data-pay'));
    var row = po.list.filter(function (x) { return x.expert && x.expert.id === id; })[0];
    if (!row || row.dueSum <= 0) { MH.ui.toast('ไม่มียอดค้างโอนของผู้เชี่ยวชาญคนนี้ในช่วงนี้'); render(); return; }
    MH.ui.confirm({
      title: 'ทำเครื่องหมายว่าโอนแล้ว',
      body: 'บันทึกว่าโอน ' + money(row.dueSum) + ' ให้ ' + row.expert.display_name + ' สำหรับ ' + row.dueKeys.length + ' รายการในช่วง ' + info.label + ' ต้นแบบบันทึกไว้เท่านั้น ไม่ได้โอนเงินจริง',
      okLabel: 'บันทึกว่าโอนแล้ว'
    }).then(function (ok) {
      if (!ok) return;
      S.insert('expert_payouts', { expert_id: row.expert.id, amount: round2(row.dueSum), period: info.key, paid_at: new Date().toISOString(), item_keys: row.dueKeys });
      MH.ui.toast('บันทึกแล้ว: โอน ' + money(row.dueSum) + ' ให้ ' + row.expert.display_name);
      render();
    });
  });

  /* ---------- CSV (Blob + a[download]) ---------- */
  function cell(v) {
    var s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;          /* กัน formula injection ใน Excel */
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function download(name, rows) {
    var csv = '﻿' + rows.map(function (r) { return r.map(cell).join(','); }).join('\r\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' }), url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 0);
    MH.ui.toast('ส่งออกไฟล์ ' + name + ' แล้ว');
  }
  document.getElementById('btn-csv-pay').addEventListener('click', function () {
    var info = rangeInfo(), pd = payData(info);
    var rows = [['เลขอ้างอิง', 'ประเภท', 'รหัสสมาชิก', 'จำนวนเงิน (บาท)', 'สถานะ', 'วันที่ชำระ', 'ช่องทาง']];
    pd.rows.sort(function (a, b) { return String(a.at).localeCompare(String(b.at)); }).forEach(function (x) {
      rows.push([x.p.ref, MH.labels.payableType[x.p.payable_type] || x.p.payable_type, x.p.member_id, x.p.amount, MH.labels.paymentStatus[x.p.status] || x.p.status, x.at, x.p.method]);
    });
    download('mahasart-payments-' + state.range + '-' + MH.util.todayISO() + '.csv', rows);
  });
  document.getElementById('btn-csv-exp').addEventListener('click', function () {
    var info = rangeInfo(), po = payoutData(info);
    var rows = [['ผู้เชี่ยวชาญ', 'ประเภท', 'อ้างอิง', 'วันที่', 'ฐานเงิน (บาท)', 'ส่วนแบ่งแพลตฟอร์ม', 'ส่วนแบ่งผู้เชี่ยวชาญ (บาท)', 'สถานะโอน']];
    po.list.forEach(function (x) {
      x.items.sort(function (a, b) { return String(a.at).localeCompare(String(b.at)); }).forEach(function (it) {
        rows.push([x.expert ? x.expert.display_name : '', it.kind === 'booking' ? 'นัดผู้เชี่ยวชาญ' : 'คอร์สเรียน', it.ref, it.at, it.base, it.rate, it.share, po.covered[it.key] ? 'โอนแล้ว' : 'ค้างโอน']);
      });
    });
    download('mahasart-expert-payouts-' + state.range + '-' + MH.util.todayISO() + '.csv', rows);
  });

  render();
})();
