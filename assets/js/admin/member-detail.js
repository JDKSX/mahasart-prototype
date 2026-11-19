/* หลังบ้าน: รายละเอียดสมาชิก (?id=) — ข้อมูลบัญชี · ความยินยอม PDPA · ข้อมูลเกิด (ปิดบังไว้ เปิดดูต้องยืนยันและถูกบันทึก)
   สรุปคำสั่งซื้อ/นัด/คอร์ส/แพ็กเกจ (อ่านอย่างเดียว) · ระงับ/เปิดใช้งานต้องกรอกเหตุผล · ทีมงานแก้ข้อมูลส่วนตัวแทนสมาชิกไม่ได้ */
(function () {
  'use strict';
  var MH = window.MH; if (!MH.admin.allowed) return;
  var h = MH.util.h, S = MH.store, A = MH.admin, L = MH.labels;
  function $(id) { return document.getElementById(id); }
  L.action.view_pii = L.action.view_pii || 'ดูข้อมูลเกิดสมาชิก';

  var id = MH.util.param('id'), root = $('detail'), revealed = false;
  function load() { return id ? S.find('members', id) : null; }

  function shell(title, inner) { $('d-title').textContent = title; $('d-sub').textContent = ''; root.innerHTML = inner; }
  function dl(pairs) { return '<dl class="mb-dl">' + pairs.map(function (p) { return '<dt>' + h(p[0]) + '</dt><dd>' + p[1] + '</dd>'; }).join('') + '</dl>'; }
  function table(caption, heads, rows) {
    return '<div class="table-wrap"><table class="table table--stack"><caption class="sr-only">' + h(caption) + '</caption><thead><tr>' +
      heads.map(function (x) { return '<th scope="col">' + h(x) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  function none(text) { return '<p class="muted">' + h(text) + '</p>'; }

  /* ---------- dialog กรอกเหตุผล ---------- */
  function reasonDialog(o) {
    return new Promise(function (resolve) {
      var opener = document.activeElement, done = false;
      var d = document.createElement('dialog'); d.className = 'dialog'; d.setAttribute('aria-labelledby', 'rs-title');
      d.innerHTML = '<form novalidate><div class="d-body"><h2 id="rs-title">' + h(o.title) + '</h2><p>' + h(o.body) + '</p>' +
        '<div class="field"><label for="rs-reason">เหตุผล <span class="req" aria-hidden="true">*</span></label>' +
        '<textarea class="textarea textarea--short" id="rs-reason" maxlength="200" aria-describedby="rs-hint"></textarea>' +
        '<p class="hint" id="rs-hint">บันทึกไว้ในบันทึกการใช้งาน ไม่เกิน 200 ตัวอักษร</p></div>' +
        '<p class="mb-err" id="rs-err" role="alert" hidden></p></div>' +
        '<div class="d-foot"><button type="button" class="btn btn--outline" data-cancel>ยกเลิก</button>' +
        '<button type="submit" class="btn ' + (o.danger ? 'btn--danger' : 'btn--primary') + '">' + h(o.okLabel) + '</button></div></form>';
      var err = d.querySelector('#rs-err'), ta = d.querySelector('#rs-reason');
      d.querySelector('[data-cancel]').addEventListener('click', function () { d.close(); });
      d.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault();
        var v = ta.value.trim();
        if (!v) { err.textContent = 'กรอกเหตุผลก่อน ทีมงานคนอื่นจะได้เห็นว่าทำไมเปลี่ยนสถานะ'; err.hidden = false; ta.setAttribute('aria-invalid', 'true'); ta.focus(); return; }
        done = true; resolve(v); d.close();
      });
      d.addEventListener('close', function () {
        if (!done) resolve(null);
        setTimeout(function () { d.remove(); if (opener && opener.focus) opener.focus(); }, 0);
      });
      document.body.appendChild(d); d.showModal(); ta.focus();
    });
  }

  /* ---------- สรุปกิจกรรม (อ่านอย่างเดียวจากตารางโดยตรง) ---------- */
  function activity(m) {
    var orders = S.all('orders').filter(function (r) { return r.member_id === m.id; }).sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); });
    var books = S.all('expert_bookings').filter(function (r) { return r.member_id === m.id; }).sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); });
    var enrolls = S.all('course_enrollments').filter(function (r) { return r.member_id === m.id; });
    var subs = S.all('subscriptions').filter(function (r) { return r.member_id === m.id; }).sort(function (a, b) { return b.id - a.id; });
    var paidSum = orders.filter(function (o) { return ['paid', 'packing', 'shipped', 'delivered'].indexOf(o.status) >= 0; }).reduce(function (s, o) { return s + (o.total || 0); }, 0);
    var plan = MH.member.plan(m);

    var kpis = '<div class="kpis">' +
      '<div class="kpi"><b>' + orders.length + '</b><span>คำสั่งซื้อ</span><span class="note">ยอดที่ชำระแล้ว ' + h(MH.money(paidSum)) + '</span></div>' +
      '<div class="kpi"><b>' + books.length + '</b><span>นัดผู้เชี่ยวชาญ</span></div>' +
      '<div class="kpi"><b>' + enrolls.length + '</b><span>คอร์สที่ลงทะเบียน</span></div>' +
      '<div class="kpi"><b>' + h(plan.name) + '</b><span>แพ็กเกจตอนนี้</span></div></div>';

    var oT = orders.length ? table('คำสั่งซื้อของสมาชิก', ['เลขที่', 'สั่งเมื่อ', 'ยอดรวม', 'สถานะ'], orders.map(function (o) {
      return '<tr><td data-label="" class="nm"><b>' + h(o.order_no) + '</b></td><td data-label="สั่งเมื่อ">' + h(MH.util.dateShort(o.created_at)) + '</td>' +
        '<td data-label="ยอดรวม" class="num">' + h(MH.money(o.total)) + '</td><td data-label="สถานะ">' + h(L.orderStatus[o.status] || o.status) + '</td></tr>';
    }).join('')) : none('ยังไม่มีคำสั่งซื้อ');

    var bT = books.length ? table('นัดผู้เชี่ยวชาญของสมาชิก', ['เลขที่', 'ผู้เชี่ยวชาญ', 'เวลานัด', 'ยอด', 'สถานะ'], books.map(function (b) {
      var e = S.find('experts', b.expert_id);
      return '<tr><td data-label="" class="nm"><b>' + h(b.booking_no) + '</b></td><td data-label="ผู้เชี่ยวชาญ">' + h(e ? e.display_name : '-') + '</td>' +
        '<td data-label="เวลานัด">' + (b.start_at ? h(MH.util.dateTime(b.start_at)) : '-') + '</td><td data-label="ยอด" class="num">' + h(MH.money(b.total)) + '</td>' +
        '<td data-label="สถานะ">' + h(L.bookingStatus[b.status] || b.status) + '</td></tr>';
    }).join('')) : none('ยังไม่มีนัดผู้เชี่ยวชาญ');

    var eT = enrolls.length ? table('คอร์สของสมาชิก', ['คอร์ส', 'ที่มา', 'เรียนแล้ว', 'สถานะ', 'เกียรติบัตร'], enrolls.map(function (en) {
      var c = S.find('courses', en.course_id), total = MH.q.lessons(en.course_id).length;
      return '<tr><td data-label="" class="nm"><b>' + h(c ? c.title : '-') + '</b></td><td data-label="ที่มา">' + (en.source === 'premium' ? 'สิทธิ์พรีเมียม' : 'ซื้อแยก') + '</td>' +
        '<td data-label="เรียนแล้ว" class="num">' + (en.progress || []).length + ' / ' + total + ' บท</td><td data-label="สถานะ">' + h(L.enrollmentStatus[en.status] || en.status) + '</td>' +
        '<td data-label="เกียรติบัตร">' + (en.certificate_no ? h(en.certificate_no) : '-') + '</td></tr>';
    }).join('')) : none('ยังไม่ได้ลงทะเบียนคอร์ส');

    var sT = subs.length ? table('การสมัครแพ็กเกจของสมาชิก', ['แพ็กเกจ', 'สถานะ', 'เริ่ม', 'ครบรอบถัดไป'], subs.map(function (s) {
      var p = MH.q.plan(s.plan_key);
      return '<tr><td data-label="" class="nm"><b>' + h(p ? p.name : s.plan_key) + '</b></td><td data-label="สถานะ">' + h(L.subscriptionStatus[s.status] || s.status) + '</td>' +
        '<td data-label="เริ่ม">' + (s.started_at ? h(MH.util.dateShort(s.started_at)) : '-') + '</td><td data-label="ครบรอบถัดไป">' + (s.renews_at ? h(MH.util.dateShort(s.renews_at)) : '-') + '</td></tr>';
    }).join('')) : none('ยังไม่เคยสมัครแพ็กเกจพรีเมียม');

    return '<section class="form-section" aria-labelledby="s-act"><h2 id="s-act">สรุปการใช้บริการ</h2>' +
      '<p class="hint">อ่านอย่างเดียว ดึงจากคำสั่งซื้อ นัด คอร์ส และแพ็กเกจของสมาชิกคนนี้</p>' + kpis +
      '<h3 class="sub-h">คำสั่งซื้อ</h3>' + oT + '<h3 class="sub-h">นัดผู้เชี่ยวชาญ</h3>' + bT + '<h3 class="sub-h">คอร์สเรียน</h3>' + eT + '<h3 class="sub-h">แพ็กเกจ</h3>' + sT + '</section>';
  }

  /* ---------- ข้อมูลเกิด ---------- */
  function birthSection(m) {
    var has = !!m.consent_birthdata_at && !!(m.birth_date || m.birth_time || m.birthday_key);
    var head = '<section class="form-section" aria-labelledby="s-birth"><h2 id="s-birth">ข้อมูลเกิด</h2>';
    if (!m.consent_birthdata_at) return head + '<p class="hint">ข้อมูลส่วนบุคคล เปิดดูได้เฉพาะสมาชิกที่ยินยอม</p>' + none('สมาชิกยังไม่ได้ยินยอมให้เก็บข้อมูลเกิด ระบบจึงไม่มีวันเกิดของสมาชิกคนนี้') + '</section>';
    if (!has) return head + none('สมาชิกยินยอมแล้ว แต่ยังไม่ได้กรอกวันเกิด') + '</section>';
    var bk = m.birthday_key ? A_BIRTHDAY(m.birthday_key) : '';
    var lastView = m.last_pii_view_at ? '<p class="mb-ro-note">เปิดดูล่าสุด ' + h(MH.util.dateTime(m.last_pii_view_at)) + ' โดย ' + h(A.userName(m.last_pii_view_by)) + ' (ดูประวัติทั้งหมดที่บันทึกการใช้งาน)</p>' : '';
    if (!revealed) {
      return head + '<p class="hint">ปิดบังไว้ เปิดดูต้องยืนยัน และทุกครั้งที่เปิดจะถูกบันทึกในบันทึกการใช้งาน</p>' +
        dl([['วันเกิด', '<span class="mb-mask" aria-label="ปิดบังไว้">••/••/••••</span>'], ['เวลาเกิด', '<span class="mb-mask" aria-label="ปิดบังไว้">••:••</span>'], ['วันเกิดตามทักษา', '<span class="mb-mask" aria-label="ปิดบังไว้">•••••</span>']]) +
        '<div class="btn-row form-btns"><button type="button" class="btn btn--outline" id="reveal">แสดงข้อมูลเกิด</button></div>' + lastView + '</section>';
    }
    return head + '<div class="notice notice--warn" role="status"><span>กำลังแสดงข้อมูลส่วนบุคคล ปิดหน้านี้หรือกด “ซ่อนข้อมูลเกิด” เมื่อใช้เสร็จ</span></div>' +
      dl([['วันเกิด', m.birth_date ? h(MH.util.dateLong(m.birth_date + 'T12:00:00', true)) : '-'], ['เวลาเกิด', m.birth_time ? h(m.birth_time) + ' น.' : 'ไม่ระบุ'], ['วันเกิดตามทักษา', bk || 'ไม่ระบุ']]) +
      '<div class="btn-row form-btns"><button type="button" class="btn btn--outline" id="hide-birth">ซ่อนข้อมูลเกิด</button></div>' + lastView + '</section>';
  }
  function A_BIRTHDAY(key) { var b = MH.astro.birthday(key); return b ? h('วัน' + b.label) : h(key); }

  function render() {
    var m = load();
    if (!m) {
      shell('ไม่พบสมาชิก', '<div class="empty"><b>ไม่พบสมาชิกที่ระบุ</b>ลิงก์อาจผิด หรือสมาชิกคนนี้ไม่อยู่ในระบบแล้ว<div class="btn-row" data-center><a class="btn btn--primary" href="members.html">กลับรายชื่อสมาชิก</a></div></div>');
      return;
    }
    $('d-title').textContent = m.display_name;
    $('d-sub').textContent = 'สมาชิกหมายเลข ' + m.id + ' · สมัครเมื่อ ' + MH.util.dateLong(m.created_at);
    document.title = m.display_name + ' · สมาชิก · หลังบ้าน MAHASART';

    if (m.deleted_at) {
      root.innerHTML = '<div class="notice notice--warn" role="status"><span>สมาชิกคนนี้ลบบัญชีแล้วเมื่อ ' + h(MH.util.dateTime(m.deleted_at)) + ' จึงไม่แสดงข้อมูลส่วนตัวและทำอะไรกับบัญชีไม่ได้ ข้อมูลคำสั่งซื้อที่ต้องเก็บตามกฎหมายยังอยู่ที่หน้าคำสั่งซื้อ</span></div>';
      return;
    }

    var plan = MH.member.plan(m), active = m.status === 'active';
    var acct = '<section class="form-section" aria-labelledby="s-acc"><h2 id="s-acc">ข้อมูลบัญชี</h2>' + dl([
      ['สถานะ', '<span class="pill ' + (active ? 'pill--published' : 'pill--danger') + '">' + h(L.memberStatus[m.status] || m.status) + '</span>'],
      ['ชื่อที่แสดง', h(m.display_name)], ['อีเมล', h(m.email)], ['ช่องทางสมัคร', h(L.provider[m.auth_provider] || m.auth_provider)],
      ['เบอร์โทร', m.phone ? h(m.phone) : '<span class="muted">ไม่ได้ระบุ</span>'],
      ['แพ็กเกจ', plan.key === 'premium' ? '<span class="tag tag--stone">' + h(plan.name) + '</span>' : h(plan.name)],
      ['เข้าล่าสุด', m.last_login_at ? h(MH.util.dateTime(m.last_login_at)) : '<span class="muted">ยังไม่เคยเข้า</span>']
    ]) + '<p class="mb-ro-note">ทีมงานแก้ชื่อ เบอร์โทร หรือข้อมูลเกิดแทนสมาชิกไม่ได้ สมาชิกแก้เองที่หน้าบัญชีของเขา</p></section>';

    var consent = '<section class="form-section" aria-labelledby="s-con"><h2 id="s-con">ความยินยอม (PDPA)</h2>' + dl([
      ['เก็บข้อมูลเกิด', m.consent_birthdata_at ? '<span class="tag tag--cert">ยินยอมแล้ว</span> เมื่อ ' + h(MH.util.dateTime(m.consent_birthdata_at)) : '<span class="tag">ไม่ได้ยินยอม</span>'],
      ['รับข่าวสารทางอีเมล', m.consent_marketing ? '<span class="tag tag--cert">ยินยอมรับ</span>' : '<span class="tag">ไม่รับ</span>'],
      ['ยอมรับเงื่อนไขการใช้งาน', m.terms_accepted_at ? 'เมื่อ ' + h(MH.util.dateTime(m.terms_accepted_at)) : '<span class="muted">ไม่มีบันทึก (สมัครผ่านช่องทางอื่น หรือก่อนมีระบบบันทึก)</span>']
    ]) + '</section>';

    var status = '<section class="form-section" aria-labelledby="s-st"><h2 id="s-st">ระงับ / เปิดใช้งานบัญชี</h2>' +
      (active
        ? '<p class="hint">ระงับแล้วสมาชิกเข้าสู่ระบบไม่ได้ ข้อมูลและประวัติยังอยู่ เปิดใช้งานกลับได้ภายหลัง</p><div class="btn-row"><button type="button" class="btn btn--danger-o" id="suspend">ระงับบัญชีนี้</button></div>'
        : '<div class="notice notice--danger" role="status"><span>ระงับอยู่' + (m.suspend_reason ? ' · เหตุผล: ' + h(m.suspend_reason) : '') + '</span></div>' +
          '<div class="btn-row form-btns"><button type="button" class="btn btn--primary" id="reactivate">เปิดใช้งานบัญชีนี้</button></div>') + '</section>';

    root.innerHTML = '<div class="mb-twocol">' + acct + consent + '</div>' + birthSection(m) + activity(m) + status;

    var rv = $('reveal'); if (rv) rv.addEventListener('click', function () {
      MH.ui.confirm({ title: 'แสดงข้อมูลเกิดของ ' + m.display_name + '?', body: 'วันเกิดและเวลาเกิดเป็นข้อมูลส่วนบุคคล การเปิดดูถูกบันทึกในบันทึกการใช้งานพร้อมชื่อของคุณ เปิดดูเฉพาะเมื่อจำเป็นต้องช่วยเหลือสมาชิก', okLabel: 'แสดงข้อมูลเกิด' }).then(function (ok) {
        if (!ok) return;
        /* บันทึก audit action 'view_pii' ผ่าน store.update เพื่อให้เขียนลง localStorage จริง (MH.store._log เดี่ยว ๆ ไม่เรียก save) */
        S.update('members', m.id, { last_pii_view_at: new Date().toISOString(), last_pii_view_by: A.user.id }, 'view_pii');
        revealed = true; render();
        var hb = $('hide-birth'); if (hb) hb.focus();
      });
    });
    var hb = $('hide-birth'); if (hb) hb.addEventListener('click', function () { revealed = false; render(); var r = $('reveal'); if (r) r.focus(); });

    var sp = $('suspend'); if (sp) sp.addEventListener('click', function () {
      reasonDialog({ title: 'ระงับบัญชี ' + m.display_name, body: 'สมาชิกจะเข้าสู่ระบบไม่ได้ทันที ถ้าเข้าสู่ระบบอยู่จะถูกให้ออกเมื่อเปิดหน้าถัดไป', okLabel: 'ระงับบัญชี', danger: true }).then(function (reason) {
        if (!reason) return;
        S.update('members', m.id, { status: 'suspended', suspend_reason: reason, suspended_at: new Date().toISOString() }, 'suspend');
        MH.ui.toast('ระงับบัญชีของ ' + m.display_name + ' แล้ว'); render(); var b = $('reactivate'); if (b) b.focus();
      });
    });
    var ra = $('reactivate'); if (ra) ra.addEventListener('click', function () {
      reasonDialog({ title: 'เปิดใช้งานบัญชี ' + m.display_name, body: 'สมาชิกจะกลับมาเข้าสู่ระบบได้ทันที', okLabel: 'เปิดใช้งาน' }).then(function (reason) {
        if (!reason) return;
        S.update('members', m.id, { status: 'active', suspend_reason: '', reactivated_note: reason }, 'update');
        MH.ui.toast('เปิดใช้งานบัญชีของ ' + m.display_name + ' แล้ว'); render(); var b = $('suspend'); if (b) b.focus();
      });
    });
  }
  render();
})();
