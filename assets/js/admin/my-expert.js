/* หลังบ้าน: โปรไฟล์ผู้เชี่ยวชาญของฉัน (experts.user_id = ผู้ใช้ที่ล็อกอิน)
   แก้ชื่อที่แสดง คำโปรย ประวัติ ช่องทาง+ราคา+นาที · ดูสถานะการตรวจ · สรุปรายได้ของฉัน (นัดที่จบแล้ว: ยอดที่ลูกค้าจ่าย × (1 − commission_rate)) */
(function () {
  'use strict';
  var MH = window.MH; if (!MH.admin.allowed) return;
  var h = MH.util.h, S = MH.store, me = MH.admin.user;
  var root = document.getElementById('me-root');
  var TYPES = ['chat', 'video', 'phone'];
  var SPEC = { 'thai-astrology': 'โหราศาสตร์ไทย', 'auspicious-time': 'ฤกษ์มงคล', 'fengshui': 'ฮวงจุ้ย', 'numerology': 'เลขศาสตร์' };
  function specName(s) { var c = MH.q.categoryBySlug('article', s); return c ? c.name : (SPEC[s] || s); }

  var ex = S.all('experts').filter(function (e) { return e.user_id === me.id; })[0] || null;
  if (!ex) {
    root.innerHTML = MH.ui.empty('บัญชีนี้ยังไม่มีโปรไฟล์ผู้เชี่ยวชาญ', 'โปรไฟล์ผู้เชี่ยวชาญถูกผูกกับบัญชีโดยผู้ดูแลระบบ หลังตรวจคุณสมบัติผู้สมัคร ถ้าคุณสมัครไว้แล้ว รอทีมงานติดต่อกลับ',
      MH.admin.can('experts.view') ? '<a class="btn btn--primary" href="experts.html">ไปที่รายการผู้เชี่ยวชาญ</a>' : '<a class="btn btn--primary" href="index.html">กลับแดชบอร์ด</a>');
    return;
  }
  var types = (ex.session_types || []).map(function (t) { return { type: t.type, minutes: t.minutes, price: t.price }; });
  var guard = null;

  function revenue() {
    var rate = ex.commission_rate != null ? ex.commission_rate : (S.setting('expert_commission') || 0.2);
    var done = S.all('expert_bookings').filter(function (b) { return b.expert_id === ex.id && b.status === 'completed'; })
      .sort(function (a, b) { return String(b.completed_at || b.start_at).localeCompare(String(a.completed_at || a.start_at)); });
    var rows = done.map(function (b) { var net = Math.round((b.total || 0) * (1 - rate)); return { b: b, net: net, share: (b.total || 0) - net }; });
    var now = new Date(), ym = now.getFullYear() * 12 + now.getMonth();
    var month = rows.filter(function (r) { var d = new Date(r.b.completed_at || r.b.start_at); return d.getFullYear() * 12 + d.getMonth() === ym; });
    var pending = S.all('expert_bookings').filter(function (b) { return b.expert_id === ex.id && b.status === 'confirmed'; });
    function sum(list, k) { return list.reduce(function (s, r) { return s + r[k]; }, 0); }
    return { rate: rate, rows: rows, count: rows.length, gross: rows.reduce(function (s, r) { return s + (r.b.total || 0); }, 0), share: sum(rows, 'share'), net: sum(rows, 'net'),
      monthNet: sum(month, 'net'), pendingCount: pending.length, pendingNet: pending.reduce(function (s, b) { return s + Math.round((b.total || 0) * (1 - rate)); }, 0) };
  }

  function chRows() {
    return types.map(function (t, i) {
      return '<li class="ch-row"><div class="field"><label for="me-ch-' + i + '-type">ช่องทาง</label><select class="select" id="me-ch-' + i + '-type" data-i="' + i + '" data-k="type">' +
        TYPES.map(function (k) { return '<option value="' + k + '"' + (t.type === k ? ' selected' : '') + '>' + h(MH.labels.sessionType[k]) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label for="me-ch-' + i + '-min">ความยาว (นาที)</label><input class="input" id="me-ch-' + i + '-min" type="number" inputmode="numeric" min="10" max="180" step="5" value="' + h(t.minutes) + '" data-i="' + i + '" data-k="minutes"></div>' +
        '<div class="field"><label for="me-ch-' + i + '-price">ราคา (บาท)</label><input class="input" id="me-ch-' + i + '-price" type="number" inputmode="numeric" min="50" max="50000" step="10" value="' + h(t.price) + '" data-i="' + i + '" data-k="price"></div>' +
        '<button type="button" class="btn btn--outline btn--sm" data-rm="' + i + '" aria-label="ลบช่องทาง ' + h(MH.labels.sessionType[t.type] || t.type) + ' ลำดับที่ ' + (i + 1) + '">ลบ</button></li>';
    }).join('');
  }

  function statusBox() {
    var s = ex.status;
    var msg = s === 'pending' ? 'ทีมงานกำลังตรวจคุณสมบัติ โปรไฟล์ยังไม่แสดงบนหน้าเว็บและสมาชิกยังจองไม่ได้ ระหว่างนี้แก้ข้อมูลและจัดตารางเวลาไว้ล่วงหน้าได้'
      : s === 'active' ? 'ผ่านการตรวจคุณสมบัติ' + (ex.verified_at ? 'เมื่อ ' + MH.util.dateShort(ex.verified_at) : '') + ' โปรไฟล์แสดงบนหน้าเว็บและสมาชิกจองได้'
      : 'โปรไฟล์ถูก' + (ex.review_decision === 'rejected' ? 'ปฏิเสธการสมัคร' : 'ระงับ') + ' ไม่แสดงบนหน้าเว็บและสมาชิกจองไม่ได้';
    return '<section class="form-section" aria-labelledby="me-st-h"><h2 id="me-st-h">สถานะการตรวจ</h2><p><span class="st ' + ({ pending: 'st--warn', active: 'st--ok', suspended: 'st--bad' }[s] || '') + '">' + h(MH.labels.expertStatus[s] || s) + '</span></p><p>' + h(msg) + '</p>' +
      (s === 'suspended' && ex.review_note ? '<div class="notice notice--danger" role="note"><span><b>เหตุผลจากทีมงาน:</b> ' + h(ex.review_note) + '</span></div>' : '') +
      '<dl class="dl"><dt>ความเชี่ยวชาญ</dt><dd>' + ((ex.specialties || []).map(function (x) { return h(specName(x)); }).join(' · ') || '-') + '</dd><dt>ประสบการณ์</dt><dd>' + Number(ex.years_experience || 0) + ' ปี</dd>' +
      '<dt>ส่วนแบ่งแพลตฟอร์ม</dt><dd>' + Math.round(revenue().rate * 1000) / 10 + '%</dd></dl>' +
      '<p class="mini-note">ความเชี่ยวชาญ ประสบการณ์ และส่วนแบ่งแก้ได้โดยทีมงานเท่านั้น ถ้าต้องแก้ ติดต่อผู้ดูแลระบบ</p></section>';
  }

  function incomeBox() {
    var r = revenue();
    return '<section class="form-section" aria-labelledby="me-inc-h"><h2 id="me-inc-h">สรุปรายได้ของฉัน</h2><p class="hint">นับเฉพาะนัดที่ปรึกษาเสร็จแล้ว = ยอดที่ลูกค้าจ่าย × (1 − ส่วนแบ่งแพลตฟอร์ม ' + Math.round(r.rate * 1000) / 10 + '%)</p>' +
      '<div class="kpis"><div class="kpi"><b>' + r.count + '</b><span>นัดที่จบแล้ว</span></div><div class="kpi"><b>' + MH.money(r.net) + '</b><span>รายได้สุทธิทั้งหมดของฉัน</span></div>' +
      '<div class="kpi"><b>' + MH.money(r.monthNet) + '</b><span>รายได้เดือนนี้</span></div><div class="kpi"><b>' + MH.money(r.share) + '</b><span>ส่วนแบ่งแพลตฟอร์ม (จากยอด ' + MH.money(r.gross) + ')</span></div></div>' +
      (r.pendingCount ? '<p class="mini-note">นัดที่ยืนยันแล้วและรอให้คำปรึกษา ' + r.pendingCount + ' นัด จะเป็นรายได้ประมาณ ' + MH.money(r.pendingNet) + ' เมื่อกดจบการปรึกษา</p>' : '') +
      (r.rows.length ? '<div class="table-wrap"><table class="table table--stack"><caption class="sr-only">นัดที่จบแล้ว</caption><thead><tr><th scope="col">นัด</th><th scope="col">เสร็จเมื่อ</th><th scope="col">ลูกค้าจ่าย</th><th scope="col">ส่วนแบ่งแพลตฟอร์ม</th><th scope="col">ฉันได้รับ</th></tr></thead><tbody>' +
        r.rows.slice(0, 10).map(function (x) {
          return '<tr><td class="cell-title"><b>' + h(x.b.booking_no) + '</b><span class="cell-sub">' + h(MH.labels.sessionType[x.b.session_type] || x.b.session_type) + ' ' + x.b.minutes + ' นาที</span></td>' +
            '<td data-label="เสร็จเมื่อ" class="nowrap">' + h(MH.util.dateTime(x.b.completed_at || x.b.start_at)) + '</td><td data-label="ลูกค้าจ่าย" class="num">' + MH.money(x.b.total) + '</td>' +
            '<td data-label="ส่วนแบ่งแพลตฟอร์ม" class="num">' + MH.money(x.share) + '</td><td data-label="ฉันได้รับ" class="num"><b>' + MH.money(x.net) + '</b></td></tr>';
        }).join('') + '</tbody></table></div>' : MH.ui.empty('ยังไม่มีนัดที่จบแล้ว', 'เมื่อกดจบการปรึกษาในห้อง นัดจะนับเป็นรายได้ที่นี่')) + '</section>';
  }

  function render() {
    document.getElementById('head-acts').innerHTML = ex.status === 'active' ? '<a class="btn btn--outline" href="../expert.html?slug=' + encodeURIComponent(ex.slug) + '" target="_blank" rel="noopener">ดูหน้าที่สมาชิกเห็น ↗</a>' : '';
    root.innerHTML = statusBox() +
      '<form id="me-form" novalidate>' +
        '<section class="form-section" aria-labelledby="me-info-h"><h2 id="me-info-h">ข้อมูลที่สมาชิกเห็น</h2><p class="hint">เขียนให้เข้าใจง่ายและไม่ให้คำสัญญา ห้ามใช้คำอย่าง "รับประกัน" "100%" ระบบจะไม่ให้บันทึก</p>' +
          '<div class="field"><label for="me-name">ชื่อที่แสดง</label><input class="input" id="me-name" maxlength="60" value="' + h(ex.display_name) + '"></div>' +
          '<div class="field"><label for="me-title">คำโปรย (บรรทัดใต้ชื่อ)</label><input class="input" id="me-title" maxlength="80" value="' + h(ex.title) + '" placeholder="เช่น โหราศาสตร์ไทย · ทักษา · ฤกษ์มงคล"></div>' +
          '<div class="field"><label for="me-bio">ประวัติและแนวทางให้คำปรึกษา</label><textarea class="textarea" id="me-bio" rows="6" maxlength="800">' + h(ex.bio) + '</textarea></div></section>' +
        '<section class="form-section" aria-labelledby="me-ch-h"><h2 id="me-ch-h">ช่องทาง ราคา และเวลา</h2><p class="hint">ต้องมีอย่างน้อย 1 ช่องทาง เลือกช่องทางละครั้ง ราคาที่เปลี่ยนมีผลกับนัดใหม่เท่านั้น นัดที่จองไว้แล้วใช้ราคาเดิม</p>' +
          '<ul class="ch-edit" id="me-ch">' + chRows() + '</ul><button type="button" class="btn btn--outline btn--sm" id="me-add-ch">เพิ่มช่องทาง</button></section>' +
        '<div class="form-actions"><button type="submit" class="btn btn--primary">บันทึกโปรไฟล์</button><span class="muted" id="me-saved" role="status"></span></div>' +
      '</form>' + incomeBox();
    var form = document.getElementById('me-form');
    guard = MH.admin.dirtyGuard(form);
    MH.admin.counter(document.getElementById('me-bio'), 800);
  }

  function validate() {
    var errs = [], name = document.getElementById('me-name').value.trim(), title = document.getElementById('me-title').value.trim(), bio = document.getElementById('me-bio').value.trim();
    if (name.length < 3 || name.length > 60) errs.push({ field: 'me-name', msg: 'ชื่อที่แสดงยาว 3–60 ตัวอักษร (ตอนนี้ ' + name.length + ')' });
    if (title.length < 5 || title.length > 80) errs.push({ field: 'me-title', msg: 'คำโปรย 5–80 ตัวอักษร (ตอนนี้ ' + title.length + ')' });
    if (bio.length < 30 || bio.length > 800) errs.push({ field: 'me-bio', msg: 'ประวัติและแนวทางให้คำปรึกษา 30–800 ตัวอักษร (ตอนนี้ ' + bio.length + ')' });
    [['me-name', name, 'ชื่อที่แสดง'], ['me-title', title, 'คำโปรย'], ['me-bio', bio, 'ประวัติ']].forEach(function (x) {
      var bad = MH.util.bannedIn(x[1]);
      if (bad.length) errs.push({ field: x[0], msg: x[2] + 'มีคำต้องห้าม: ' + bad.join(', ') + ' ให้เขียนให้ไม่เป็นการสัญญาผล' });
    });
    if (!types.length) errs.push({ field: 'me-add-ch', msg: 'ต้องมีช่องทางอย่างน้อย 1 ช่องทาง' });
    var seen = {};
    types.forEach(function (t, i) {
      if (seen[t.type]) errs.push({ field: 'me-ch-' + i + '-type', msg: 'ช่องทาง' + (MH.labels.sessionType[t.type] || t.type) + 'ซ้ำกัน เลือกช่องทางละครั้ง' });
      seen[t.type] = true;
      var m = Number(t.minutes), p = Number(t.price);
      if (!/^\d+$/.test(String(t.minutes)) || m < 10 || m > 180) errs.push({ field: 'me-ch-' + i + '-min', msg: 'ช่องทางที่ ' + (i + 1) + ': ความยาวต้องเป็นจำนวนเต็ม 10–180 นาที' });
      if (!/^\d+$/.test(String(t.price)) || p < 50 || p > 50000) errs.push({ field: 'me-ch-' + i + '-price', msg: 'ช่องทางที่ ' + (i + 1) + ': ราคาต้องเป็นจำนวนเต็ม 50–50,000 บาท' });
    });
    return { errs: errs, name: name, title: title, bio: bio };
  }

  root.addEventListener('input', function (e) {
    var el = e.target; if (!el.getAttribute || el.getAttribute('data-i') == null) return;
    types[Number(el.getAttribute('data-i'))][el.getAttribute('data-k')] = el.value;
  });
  root.addEventListener('change', function (e) {
    var el = e.target; if (!el.getAttribute || el.getAttribute('data-i') == null) return;
    types[Number(el.getAttribute('data-i'))][el.getAttribute('data-k')] = el.value;
  });
  root.addEventListener('click', function (e) {
    if (e.target.closest('#me-add-ch')) {
      var free = TYPES.filter(function (k) { return !types.some(function (t) { return t.type === k; }); })[0];
      if (!free) { MH.ui.toast('มีครบทั้ง 3 ช่องทางแล้ว'); return; }
      types.push({ type: free, minutes: 30, price: 500 });
      document.getElementById('me-ch').innerHTML = chRows();
      var last = document.getElementById('me-ch-' + (types.length - 1) + '-price'); if (last) last.focus();
      return;
    }
    var rm = e.target.closest('[data-rm]');
    if (rm) {
      if (types.length <= 1) { MH.ui.toast('ต้องมีอย่างน้อย 1 ช่องทาง เปลี่ยนค่าแทนการลบได้'); return; }
      types.splice(Number(rm.getAttribute('data-rm')), 1);
      document.getElementById('me-ch').innerHTML = chRows();
      var add = document.getElementById('me-add-ch'); if (add) add.focus();
    }
  });
  root.addEventListener('submit', function (e) {
    if (e.target.id !== 'me-form') return;
    e.preventDefault();
    var form = e.target, v = validate();
    if (!MH.admin.showErrors(form, v.errs)) return;
    var norm = types.map(function (t) { return { type: t.type, minutes: Number(t.minutes), price: Number(t.price) }; });
    ex = S.update('experts', ex.id, { display_name: v.name, title: v.title, bio: v.bio, session_types: norm }, 'update');
    guard.clean();
    types = (ex.session_types || []).map(function (t) { return { type: t.type, minutes: t.minutes, price: t.price }; });
    MH.ui.toast('บันทึกโปรไฟล์แล้ว');
    render();
    var saved = document.getElementById('me-saved'); if (saved) saved.textContent = 'บันทึกล่าสุด ' + MH.util.dateTime(new Date().toISOString());
  });

  render();
})();
