/* หลังบ้าน: ตรวจผู้เชี่ยวชาญ ?id=
   ดูได้ทุกคนที่มี experts.view · แก้ได้เฉพาะ experts.manage (ผู้ดูแลระบบ)
   อนุมัติ → active + verified_at (action verify) · ปฏิเสธ/ระงับ ต้องมีเหตุผล · แก้ส่วนแบ่ง 0–50% (commission_rate 0–0.5) · ซ่อน/แสดงรีวิว */
(function () {
  'use strict';
  var MH = window.MH; if (!MH.admin.allowed) return;
  var h = MH.util.h, S = MH.store, me = MH.admin.user;
  var root = document.getElementById('ee-root');
  var canManage = MH.admin.can('experts.manage');
  var SPEC = { 'thai-astrology': 'โหราศาสตร์ไทย', 'auspicious-time': 'ฤกษ์มงคล', 'fengshui': 'ฮวงจุ้ย', 'numerology': 'เลขศาสตร์' };
  function specName(s) { var c = MH.q.categoryBySlug('article', s); return c ? c.name : (SPEC[s] || s); }
  var STCLS = { pending: 'st--warn', active: 'st--ok', suspended: 'st--bad' };
  var BKCLS = { pending_payment: 'st--warn', confirmed: 'st--info', completed: 'st--ok', cancelled: 'st--bad', no_show: 'st--bad' };
  function stars(n) { var o = ''; for (var i = 1; i <= 5; i++) o += '<i' + (i <= n ? ' class="on"' : '') + '>★</i>'; return '<span class="stars" role="img" aria-label="' + n + ' ดาวจาก 5">' + o + '</span>'; }

  var id = MH.util.param('id'), first = id ? S.find('experts', id) : null;
  if (!first || first.deleted_at) {
    root.innerHTML = '<div class="adm-head"><div><a class="crumb-back" href="experts.html">' + MH.ui.icon('i-back') + 'กลับไปรายการผู้เชี่ยวชาญ</a><h1>ไม่พบผู้เชี่ยวชาญ</h1><p>ลิงก์อาจพิมพ์ผิด หรือรายการนี้ถูกลบแล้ว</p></div></div>' +
      MH.ui.empty('ไม่พบผู้เชี่ยวชาญรหัสนี้', 'เลือกจากรายการผู้เชี่ยวชาญอีกครั้ง', '<a class="btn btn--primary" href="experts.html">ไปที่รายการผู้เชี่ยวชาญ</a>');
    return;
  }
  id = first.id;

  /* ---------- คำนวณ ---------- */
  function rateOf(e) { return e.commission_rate != null ? e.commission_rate : (S.setting('expert_commission') || 0.2); }
  function bookingsOf(e) { return S.all('expert_bookings').filter(function (b) { return b.expert_id === e.id; }); }
  function revenue(e) {
    var rate = rateOf(e), done = bookingsOf(e).filter(function (b) { return b.status === 'completed'; });
    var gross = done.reduce(function (s, b) { return s + (b.total || 0); }, 0);
    var net = done.reduce(function (s, b) { return s + Math.round((b.total || 0) * (1 - rate)); }, 0);
    return { count: done.length, gross: gross, net: net, platform: gross - net, rate: rate };
  }
  function checks(e) {
    var u = e.user_id ? S.find('users', e.user_id) : null, banned = [], types = e.session_types || [];
    [e.display_name, e.title, e.bio].forEach(function (t) { MH.util.bannedIn(t).forEach(function (w) { if (banned.indexOf(w) < 0) banned.push(w); }); });
    return [
      { ok: !!(String(e.display_name || '').trim() && (e.specialties || []).length), text: 'มีชื่อที่แสดงและความเชี่ยวชาญ' },
      { ok: String(e.bio || '').trim().length >= 20, text: 'มีประวัติและแนวทางให้คำปรึกษา (bio) อย่างน้อย 20 ตัวอักษร' },
      { ok: types.length > 0 && types.every(function (t) { return t.price > 0 && t.minutes > 0; }), text: 'ตั้งช่องทาง ราคา และเวลาอย่างน้อย 1 ช่องทาง' },
      { ok: !banned.length, text: banned.length ? 'มีคำต้องห้ามในโปรไฟล์: ' + banned.join(', ') : 'ไม่มีคำต้องห้ามในชื่อ คำโปรย และประวัติ' },
      { ok: !!(u && u.is_active && !u.deleted_at && u.role === 'expert'), text: u ? 'ผูกกับบัญชีทีมงาน ' + u.name + ' (บทบาทผู้เชี่ยวชาญ) แล้ว' : 'ผูกกับบัญชีทีมงานบทบาทผู้เชี่ยวชาญ (ใช้เข้าจัดตารางและดูนัด)' }
    ];
  }

  /* ---------- กล่องถามเหตุผล ---------- */
  function askReason(o) {
    return new Promise(function (resolve) {
      MH.ui.dialog({
        title: o.title,
        html: '<p>' + h(o.body) + '</p><form id="rs-form" novalidate><div class="field"><label for="rs-text">' + h(o.label) + '</label><textarea class="textarea" id="rs-text" rows="3" maxlength="300"></textarea></div>' +
          '<div class="btn-row"><button type="button" class="btn btn--outline" data-rs-x>ยกเลิก</button><button type="submit" class="btn ' + (o.danger ? 'btn--danger' : 'btn--primary') + '">' + h(o.okLabel) + '</button></div></form>',
        actions: [],
        onOpen: function (d) {
          var form = d.querySelector('#rs-form'), ta = d.querySelector('#rs-text');
          ta.focus();
          d.querySelector('[data-rs-x]').addEventListener('click', function () { d.close(); resolve(null); });
          d.addEventListener('cancel', function () { resolve(null); });
          form.addEventListener('submit', function (ev) {
            ev.preventDefault();
            form.querySelectorAll('.err').forEach(function (n) { n.remove(); });
            var v = ta.value.trim();
            if (v.length < 5) {
              ta.setAttribute('aria-invalid', 'true');
              var p = document.createElement('p'); p.className = 'err'; p.setAttribute('role', 'alert'); p.textContent = 'ระบุเหตุผลอย่างน้อย 5 ตัวอักษร';
              ta.closest('.field').appendChild(p); ta.focus(); return;
            }
            d.close(); resolve(v);
          });
        }
      });
    });
  }

  /* ---------- วาดหน้า ---------- */
  function render(focusHead) {
    var e = S.find('experts', id), rev = revenue(e), rt = MH.q.expertRating(e.id), checkList = checks(e), allOk = checkList.every(function (c) { return c.ok; });
    var u = e.user_id ? S.find('users', e.user_id) : null;
    var reviewer = e.reviewed_by ? MH.admin.userName(e.reviewed_by) : '';
    var allReviews = S.all('expert_reviews').filter(function (r) { return r.expert_id === e.id; }).sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); });
    var bks = bookingsOf(e).sort(function (a, b) { return String(b.start_at || b.created_at).localeCompare(String(a.start_at || a.created_at)); });
    var futureConfirmed = bks.filter(function (b) { return b.status === 'confirmed' && b.start_at && new Date(b.start_at) > new Date(); }).length;
    document.title = 'ตรวจ ' + e.display_name + ' · หลังบ้าน MAHASART';

    var linkable = S.all('users').filter(function (x) {
      if (x.role !== 'expert' || !x.is_active) return false;
      return !S.all('experts').some(function (o) { return o.user_id === x.id && o.id !== e.id; });
    });
    var decideBtns = e.status === 'pending'
      ? '<button type="button" class="btn btn--primary" data-dc="approve">อนุมัติให้เปิดรับนัด</button><button type="button" class="btn btn--danger" data-dc="reject">ปฏิเสธใบสมัคร</button>'
      : e.status === 'active' ? '<button type="button" class="btn btn--danger" data-dc="suspend">ระงับการเปิดรับนัด</button>'
      : '<button type="button" class="btn btn--primary" data-dc="approve">อนุมัติให้เปิดรับนัดอีกครั้ง</button>';

    var decision = e.review_decision ? '<p class="mini-note">ผลการตรวจล่าสุด: <b>' + h({ approved: 'อนุมัติ', rejected: 'ปฏิเสธใบสมัคร', suspended: 'ระงับ' }[e.review_decision] || e.review_decision) + '</b>' +
      (reviewer ? ' โดย ' + h(reviewer) : '') + (e.reviewed_at ? ' เมื่อ ' + h(MH.util.dateTime(e.reviewed_at)) : '') + (e.review_note ? '<br>หมายเหตุ: ' + h(e.review_note) : '') + '</p>' : '';

    root.innerHTML =
      '<div class="adm-head"><div><a class="crumb-back" href="experts.html">' + MH.ui.icon('i-back') + 'กลับไปรายการผู้เชี่ยวชาญ</a><h1 id="ee-h" tabindex="-1">' + h(e.display_name) + '</h1><p>' + h(e.title || 'ยังไม่ได้ตั้งคำโปรย') + '</p></div>' +
        '<div class="btn-row"><span class="st ' + (STCLS[e.status] || '') + '">' + h(MH.labels.expertStatus[e.status] || e.status) + '</span>' +
        (e.status === 'active' ? '<a class="btn btn--outline btn--sm" href="../expert.html?slug=' + encodeURIComponent(e.slug) + '" target="_blank" rel="noopener">ดูหน้าที่สมาชิกเห็น ↗</a>' : '') + '</div></div>' +
      (canManage ? '' : '<div class="notice-stack"><div class="notice" role="note">' + h(MH.labels.role[me.role]) + ' ดูข้อมูลได้อย่างเดียว การอนุมัติ ระงับ ปรับส่วนแบ่ง และซ่อนรีวิวทำได้เฉพาะผู้ดูแลระบบ</div></div>') +
      '<div class="ex-adm"><div>' +
        '<section class="form-section" aria-labelledby="s-prof"><h2 id="s-prof">ข้อมูลที่ผู้เชี่ยวชาญกรอก</h2><dl class="dl">' +
          '<dt>ความเชี่ยวชาญ</dt><dd>' + ((e.specialties || []).map(function (s) { return h(specName(s)); }).join(' · ') || '-') + '</dd>' +
          '<dt>ประสบการณ์</dt><dd>' + Number(e.years_experience || 0) + ' ปี</dd>' +
          '<dt>ประวัติ (bio)</dt><dd>' + (e.bio ? h(e.bio) : '<span class="muted">ยังไม่ได้กรอก</span>') + '</dd>' +
          '<dt>ช่องทางและราคา</dt><dd>' + ((e.session_types || []).length ? e.session_types.map(function (t) { return h(MH.labels.sessionType[t.type] || t.type) + ' ' + t.minutes + ' นาที ' + MH.money(t.price); }).join('<br>') : '<span class="muted">ยังไม่ได้ตั้ง</span>') + '</dd>' +
          '<dt>บัญชีทีมงาน</dt><dd>' + (u ? h(u.name) + ' · ' + h(u.email) : '<span class="muted">ยังไม่ผูกบัญชี</span>') + '</dd>' +
          (e.contact_email ? '<dt>อีเมลติดต่อ</dt><dd>' + h(e.contact_email) + '</dd>' : '') +
          '<dt>สมัคร/สร้างเมื่อ</dt><dd>' + h(MH.util.dateTime(e.applied_at || e.created_at)) + '</dd>' +
          '<dt>ยืนยันคุณสมบัติเมื่อ</dt><dd>' + (e.verified_at ? h(MH.util.dateTime(e.verified_at)) : '<span class="muted">ยังไม่ผ่านการยืนยัน</span>') + '</dd></dl></section>' +

        '<section class="form-section" aria-labelledby="s-ver"><h2 id="s-ver">ตรวจคุณสมบัติ</h2><p class="hint">ต้องผ่านทุกข้อจึงอนุมัติให้เปิดรับนัดได้</p>' +
          '<ul class="chk">' + checkList.map(function (c) { return '<li><span class="' + (c.ok ? 'yes' : 'no') + '" aria-hidden="true">' + (c.ok ? '✓' : '✕') + '</span><span><span class="sr-only">' + (c.ok ? 'ผ่าน: ' : 'ยังไม่ผ่าน: ') + '</span>' + h(c.text) + '</span></li>'; }).join('') + '</ul>' + decision +
          (canManage
            ? ((e.status !== 'active') ? '<form id="lk-form" novalidate><div class="field"><label for="dc-user">ผูกกับบัญชีทีมงาน (บทบาทผู้เชี่ยวชาญ)</label><div class="row"><select class="select" id="dc-user"><option value="">ยังไม่ผูกบัญชี</option>' +
                linkable.map(function (x) { return '<option value="' + x.id + '"' + (e.user_id === x.id ? ' selected' : '') + '>' + h(x.name + ' · ' + x.email) + '</option>'; }).join('') + '</select><button type="submit" class="btn btn--outline">บันทึกการผูกบัญชี</button></div>' +
                '<span class="hint">สร้างบัญชีบทบาทผู้เชี่ยวชาญได้ที่หน้าผู้ใช้ทีมงาน</span></div></form>' : '') +
              '<form id="dc-form" novalidate><div class="field"><label for="dc-reason">เหตุผล / หมายเหตุ</label><textarea class="textarea" id="dc-reason" rows="3" maxlength="300"></textarea>' +
              '<span class="hint">ต้องกรอกเมื่อปฏิเสธหรือระงับ (ผู้เชี่ยวชาญจะเห็นเหตุผลในหน้าโปรไฟล์ของตัวเอง) · การอนุมัติกรอกหรือไม่ก็ได้</span></div>' +
              '<div id="dc-block"></div><div class="btn-row">' + decideBtns + '</div></form>'
            : '') + '</section>' +

        '<section class="form-section" aria-labelledby="s-com"><h2 id="s-com">ส่วนแบ่งแพลตฟอร์ม</h2><p class="hint">หักจากยอดที่ลูกค้าจ่ายของนัดที่ปรึกษาเสร็จแล้ว ใช้กับการคำนวณรายได้ของผู้เชี่ยวชาญท่านนี้ทุกนัด</p>' +
          (canManage ? '<form id="cm-form" novalidate><div class="rate-row"><div class="field"><label for="cm-rate">ส่วนแบ่งแพลตฟอร์ม (%)</label><input class="input" id="cm-rate" type="number" inputmode="decimal" min="0" max="50" step="0.5" value="' + Math.round(rateOf(e) * 10000) / 100 + '"><span class="hint">0–50% (ค่าตั้งต้น ' + Math.round((S.setting('expert_commission') || 0.2) * 100) + '%)</span></div><button type="submit" class="btn btn--primary">บันทึกส่วนแบ่ง</button></div></form>'
            : '<p>อัตราปัจจุบัน <b>' + Math.round(rateOf(e) * 1000) / 10 + '%</b></p>') + '</section>' +

        '<section class="form-section" aria-labelledby="s-rev"><h2 id="s-rev">รีวิว (' + allReviews.length + ')</h2><p class="hint">รีวิวที่ซ่อนจะไม่แสดงบนหน้าสาธารณะและไม่นับในคะแนนเฉลี่ย (ตอนนี้ ' + (rt.count ? rt.avg.toFixed(1) + ' จาก ' + rt.count + ' รีวิว' : 'ยังไม่มีรีวิวที่แสดง') + ')</p>' +
          (allReviews.length ? '<ul class="rev-adm">' + allReviews.map(function (r) {
            var m = S.find('members', r.member_id);
            return '<li' + (r.status === 'hidden' ? ' class="is-hidden"' : '') + '><div class="row">' + stars(r.rating) + '<b>' + h(m ? m.display_name : 'สมาชิก') + '</b><span class="muted">' + h(MH.util.dateShort(r.created_at)) + '</span>' +
              '<span class="st ' + (r.status === 'hidden' ? 'st--warn' : 'st--ok') + '">' + (r.status === 'hidden' ? 'ซ่อนอยู่' : 'แสดงอยู่') + '</span></div>' +
              '<p>' + (r.comment ? h(r.comment) : '<span class="muted">ให้คะแนนอย่างเดียว</span>') + '</p>' +
              (r.status === 'hidden' && r.hidden_reason ? '<p class="mini-note">เหตุผลที่ซ่อน: ' + h(r.hidden_reason) + (r.hidden_by ? ' · โดย ' + h(MH.admin.userName(r.hidden_by)) : '') + '</p>' : '') +
              (canManage ? '<div class="btn-row">' + (r.status === 'hidden'
                ? '<button type="button" class="btn btn--outline btn--sm" data-rv-show="' + r.id + '">แสดงรีวิวอีกครั้ง</button>'
                : '<button type="button" class="btn btn--outline btn--sm" data-rv-hide="' + r.id + '">ซ่อนรีวิว</button>') + '</div>' : '') + '</li>';
          }).join('') + '</ul>' : MH.ui.empty('ยังไม่มีรีวิว', 'รีวิวเขียนได้หลังนัดจบเท่านั้น')) + '</section>' +
      '</div><aside>' +
        '<section class="form-section" aria-labelledby="s-inc"><h2 id="s-inc">สรุปรายได้</h2><dl class="dl">' +
          '<dt>นัดที่จบแล้ว</dt><dd class="num">' + rev.count + ' นัด</dd><dt>ยอดที่ลูกค้าจ่าย</dt><dd class="num">' + MH.money(rev.gross) + '</dd>' +
          '<dt>ส่วนแบ่งแพลตฟอร์ม (' + Math.round(rev.rate * 1000) / 10 + '%)</dt><dd class="num">' + MH.money(rev.platform) + '</dd><dt>ผู้เชี่ยวชาญได้รับ</dt><dd class="num"><b>' + MH.money(rev.net) + '</b></dd></dl></section>' +
        '<section class="form-section" aria-labelledby="s-bk"><h2 id="s-bk">นัดล่าสุด</h2>' + (bks.length ? '<ul class="rev-adm">' + bks.slice(0, 5).map(function (b) {
          var m = S.find('members', b.member_id);
          return '<li><div class="row"><b>' + h(b.booking_no) + '</b><span class="st ' + (BKCLS[b.status] || '') + '">' + h(MH.labels.bookingStatus[b.status] || b.status) + '</span></div>' +
            '<p class="mini-note">' + h(m ? m.display_name : 'สมาชิก') + ' · ' + (b.start_at ? h(MH.util.dateTime(b.start_at)) : '-') + ' · ' + MH.money(b.total) + '</p></li>';
        }).join('') + '</ul>' : '<p class="muted">ยังไม่มีนัด</p>') +
          (futureConfirmed ? '<p class="mini-note">นัดที่ยืนยันแล้วและยังไม่ถึงเวลา ' + futureConfirmed + ' นัด</p>' : '') +
          (MH.admin.can(['bookings.view', 'bookings.view_own']) ? '<p><a href="bookings.html' + (e.id ? '?expert=' + e.id : '') + '">ดูนัดทั้งหมดของท่านนี้</a></p>' : '') + '</section>' +
      '</aside></div>';
    if (focusHead) { var hd = document.getElementById('ee-h'); if (hd) hd.focus(); }
    root.__allOk = allOk;
  }

  /* ---------- ตัดสินผลการตรวจ ---------- */
  function decide(kind) {
    var form = document.getElementById('dc-form'), e = S.find('experts', id);
    MH.admin.clearErrors(form);
    document.getElementById('dc-block').innerHTML = '';
    var reason = form.querySelector('#dc-reason').value.trim();
    if (kind !== 'approve' && reason.length < 5) {
      MH.admin.showErrors(form, [{ field: 'dc-reason', msg: 'ระบุเหตุผลอย่างน้อย 5 ตัวอักษรก่อน' + (kind === 'reject' ? 'ปฏิเสธใบสมัคร' : 'ระงับ') }]);
      return;
    }
    if (kind === 'approve') {
      var bad = checks(e).filter(function (c) { return !c.ok; });
      if (bad.length) {
        document.getElementById('dc-block').innerHTML = '<div class="notice notice--danger" role="alert" tabindex="-1"><div><b>ยังอนุมัติไม่ได้ ข้อต่อไปนี้ยังไม่ผ่าน</b><ul>' + bad.map(function (c) { return '<li>' + h(c.text) + '</li>'; }).join('') + '</ul></div></div>';
        document.querySelector('#dc-block .notice').focus();
        return;
      }
    }
    var future = bookingsOf(e).filter(function (b) { return b.status === 'confirmed' && b.start_at && new Date(b.start_at) > new Date(); }).length;
    var cfg = {
      approve: { title: 'อนุมัติ ' + e.display_name + '?', body: 'โปรไฟล์จะแสดงบนหน้าผู้เชี่ยวชาญและสมาชิกจองนัดได้ทันที', okLabel: 'อนุมัติ', danger: false },
      reject: { title: 'ปฏิเสธใบสมัครของ ' + e.display_name + '?', body: 'โปรไฟล์จะไม่แสดงบนหน้าเว็บ ผู้สมัครจะเห็นเหตุผลที่ระบุ', okLabel: 'ปฏิเสธใบสมัคร', danger: true },
      suspend: { title: 'ระงับ ' + e.display_name + '?', body: 'โปรไฟล์จะหายจากหน้าเว็บและจองเพิ่มไม่ได้' + (future ? ' นัดที่ยืนยันแล้ว ' + future + ' นัดยังอยู่ ต้องให้ผู้เชี่ยวชาญหรือทีมงานยกเลิกที่หน้าการนัดหมาย' : ''), okLabel: 'ระงับ', danger: true }
    }[kind];
    MH.ui.confirm(cfg).then(function (ok) {
      if (!ok) return;
      var now = new Date().toISOString(), base = { reviewed_by: me.id, reviewed_at: now, review_note: reason };
      if (kind === 'approve') S.update('experts', e.id, Object.assign(base, { status: 'active', verified_at: now, verified_by: me.id, review_decision: 'approved' }), 'verify');
      else if (kind === 'reject') S.update('experts', e.id, Object.assign(base, { status: 'suspended', review_decision: 'rejected' }), 'return');
      else S.update('experts', e.id, Object.assign(base, { status: 'suspended', review_decision: 'suspended' }), 'suspend');
      MH.ui.toast(kind === 'approve' ? 'อนุมัติแล้ว ' + e.display_name + ' ขึ้นหน้าผู้เชี่ยวชาญแล้ว' : kind === 'reject' ? 'ปฏิเสธใบสมัครแล้ว' : 'ระงับแล้ว');
      render(true);
    });
  }

  root.addEventListener('click', function (ev) {
    var d = ev.target.closest('[data-dc]');
    if (d && canManage) { decide(d.getAttribute('data-dc')); return; }
    var hide = ev.target.closest('[data-rv-hide]'), show = ev.target.closest('[data-rv-show]');
    if (hide && canManage) {
      var rid = Number(hide.getAttribute('data-rv-hide'));
      askReason({ title: 'ซ่อนรีวิวนี้?', body: 'รีวิวจะไม่แสดงบนหน้าผู้เชี่ยวชาญและไม่นับในคะแนนเฉลี่ย แสดงกลับได้ภายหลัง', label: 'เหตุผลที่ซ่อน (บังคับ)', okLabel: 'ซ่อนรีวิว', danger: true }).then(function (why) {
        if (!why) return;
        S.update('expert_reviews', rid, { status: 'hidden', hidden_reason: why, hidden_by: me.id, hidden_at: new Date().toISOString() }, 'update');
        MH.ui.toast('ซ่อนรีวิวแล้ว'); render(false);
      });
    }
    if (show && canManage) {
      var sid = Number(show.getAttribute('data-rv-show'));
      MH.ui.confirm({ title: 'แสดงรีวิวนี้อีกครั้ง?', body: 'รีวิวจะกลับไปแสดงบนหน้าผู้เชี่ยวชาญและนับในคะแนนเฉลี่ย', okLabel: 'แสดงรีวิว' }).then(function (ok) {
        if (!ok) return;
        S.update('expert_reviews', sid, { status: 'published', hidden_reason: '', hidden_by: null, hidden_at: null }, 'update');
        MH.ui.toast('แสดงรีวิวแล้ว'); render(false);
      });
    }
  });

  root.addEventListener('submit', function (ev) {
    var f = ev.target;
    if (!canManage) return;
    if (f.id === 'dc-form') { ev.preventDefault(); return; }
    if (f.id === 'lk-form') {
      ev.preventDefault();
      var v = f.querySelector('#dc-user').value;
      S.update('experts', id, { user_id: v ? Number(v) : null }, 'update');
      MH.ui.toast(v ? 'ผูกบัญชีทีมงานแล้ว' : 'ยกเลิกการผูกบัญชีแล้ว'); render(false);
    }
    if (f.id === 'cm-form') {
      ev.preventDefault();
      var raw = f.querySelector('#cm-rate').value.trim(), pct = Number(raw);
      if (raw === '' || !isFinite(pct) || pct < 0 || pct > 50 || Math.abs(pct * 100 - Math.round(pct * 100)) > 1e-6) {
        MH.admin.showErrors(f, [{ field: 'cm-rate', msg: 'ส่วนแบ่งต้องเป็นตัวเลข 0–50% (ทศนิยมไม่เกิน 2 ตำแหน่ง)' }]); return;
      }
      MH.admin.clearErrors(f);
      S.update('experts', id, { commission_rate: Math.round(pct * 100) / 10000 }, 'update');
      MH.ui.toast('บันทึกส่วนแบ่ง ' + pct + '% แล้ว'); render(false);
    }
  });

  render(false);
})();
