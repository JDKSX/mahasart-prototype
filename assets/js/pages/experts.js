/* รายการผู้เชี่ยวชาญ: การ์ด + กรองตามความเชี่ยวชาญ (sync กับ URL ?spec=) + ฟอร์มสมัครเป็นผู้เชี่ยวชาญ (ใน dialog) */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h, S = MH.store;
  var SPEC = { 'thai-astrology': 'โหราศาสตร์ไทย', 'auspicious-time': 'ฤกษ์มงคล', 'fengshui': 'ฮวงจุ้ย', 'numerology': 'เลขศาสตร์' };
  function specName(s) { var c = MH.q.categoryBySlug('article', s); return c ? c.name : (SPEC[s] || s); }
  function pad(n) { return ('0' + n).slice(-2); }
  function hm(iso) { var d = new Date(iso); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function dayDiff(iso) { var a = new Date(iso), b = new Date(); a.setHours(0, 0, 0, 0); b.setHours(0, 0, 0, 0); return Math.round((a - b) / 864e5); }
  function nextLabel(iso) {
    var k = dayDiff(iso), d = new Date(iso);
    var day = k === 0 ? 'วันนี้' : k === 1 ? 'พรุ่งนี้' : d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' });
    return day + ' ' + hm(iso) + ' น.';
  }
  function initial(name) { return String(name || '').replace(/^(อาจารย์|ครู|ดร\.|หมอ)\s*/, '').charAt(0) || '✦'; }
  function stars(avg) {
    var n = Math.round(avg), out = '';
    for (var i = 1; i <= 5; i++) out += '<i' + (i <= n ? ' class="on"' : '') + '>★</i>';
    return '<span class="stars" role="img" aria-label="คะแนน ' + avg + ' จาก 5">' + out + '</span>';
  }

  document.querySelectorAll('[data-disclaimer]').forEach(function (el) { el.textContent = S.setting('disclaimer') || ''; });

  var chipsHost = document.getElementById('spec-chips'), listEl = document.getElementById('ex-list'), emptyEl = document.getElementById('ex-empty'), countEl = document.getElementById('ex-count');
  var all = MH.q.experts();
  var state = { spec: MH.util.param('spec') || '' };

  /* ความเชี่ยวชาญที่มีผู้เชี่ยวชาญเปิดรับนัดอยู่จริง */
  var specs = [];
  all.forEach(function (e) { (e.specialties || []).forEach(function (s) { if (specs.indexOf(s) < 0) specs.push(s); }); });
  specs.sort(function (a, b) { var ia = Object.keys(SPEC).indexOf(a), ib = Object.keys(SPEC).indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
  if (state.spec && specs.indexOf(state.spec) < 0) state.spec = '';

  chipsHost.innerHTML = '<button type="button" class="chip" data-spec="" aria-pressed="false">ทั้งหมด</button>' + specs.map(function (s) {
    return '<button type="button" class="chip" data-spec="' + h(s) + '" aria-pressed="false">' + h(specName(s)) + '</button>';
  }).join('');

  var member = MH.member.current(), disc = member ? (MH.member.plan(member).booking_discount || 0) : 0;

  function info(e) {
    var r = MH.q.expertRating(e.id), slots = MH.q.openSlots(e.id);
    var prices = (e.session_types || []).map(function (t) { return t.price; });
    return { r: r, next: slots[0] || null, count: slots.length, min: prices.length ? Math.min.apply(null, prices) : null };
  }

  function card(e, x) {
    var url = 'expert.html?slug=' + encodeURIComponent(e.slug);
    var price = x.min == null ? 'ยังไม่ระบุ' : 'เริ่มต้น ' + MH.money(x.min) + (disc && x.min ? '<br><small class="muted">พรีเมียมเหลือ ' + MH.money(x.min - Math.round(x.min * disc)) + '</small>' : '');
    return '<li class="exp-card">' +
      '<div class="exp-top"><span class="exp-av" aria-hidden="true">' + h(initial(e.display_name)) + '</span><div><h3><a href="' + url + '">' + h(e.display_name) + '</a></h3><p>' + h(e.title) + '</p></div></div>' +
      '<div class="exp-tags">' + (e.specialties || []).map(function (s) { return '<span class="tag">' + h(specName(s)) + '</span>'; }).join('') + '</div>' +
      '<dl class="exp-facts">' +
        '<div><dt>ประสบการณ์</dt><dd>' + Number(e.years_experience || 0) + ' ปี</dd></div>' +
        '<div><dt>คะแนน</dt><dd>' + (x.r.count ? '<span class="rating">' + stars(x.r.avg) + '<b>' + x.r.avg.toFixed(1) + '</b><span class="muted">(' + x.r.count + ' รีวิว)</span></span>' : '<span class="muted">ยังไม่มีรีวิว</span>') + '</dd></div>' +
        '<div><dt>ราคา</dt><dd>' + price + '</dd></div>' +
        '<div><dt>คิวว่างถัดไป</dt><dd>' + (x.next ? h(nextLabel(x.next.start_at)) : '<span class="muted">ยังไม่มีคิวว่าง</span>') + '</dd></div>' +
      '</dl>' +
      '<div class="btn-row"><a class="btn btn--primary" href="' + url + '">ดูโปรไฟล์และเลือกเวลา</a></div>' +
      '</li>';
  }

  function syncURL() {
    var qs = state.spec ? '?spec=' + encodeURIComponent(state.spec) : '';
    try { history.replaceState(null, '', (location.pathname.split('/').pop() || 'experts.html') + qs); } catch (e) {}
  }

  function render() {
    var rows = all.filter(function (e) { return !state.spec || (e.specialties || []).indexOf(state.spec) >= 0; }).map(function (e) { return { e: e, x: info(e) }; });
    /* มีคิวว่างขึ้นก่อน แล้วเรียงตามคะแนน */
    rows.sort(function (a, b) { return (b.x.next ? 1 : 0) - (a.x.next ? 1 : 0) || b.x.r.avg - a.x.r.avg || a.e.id - b.e.id; });
    chipsHost.querySelectorAll('.chip').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-spec') === state.spec)); });
    countEl.innerHTML = 'พบ <b class="num">' + rows.length + '</b> ท่าน';
    if (!rows.length) {
      listEl.hidden = true; listEl.innerHTML = '';
      emptyEl.hidden = false;
      emptyEl.innerHTML = state.spec
        ? MH.ui.empty('ยังไม่มีผู้เชี่ยวชาญด้านนี้ที่เปิดรับนัด', 'ลองดูด้านอื่น หรือสมัครเป็นผู้เชี่ยวชาญด้านนี้ได้ที่ท้ายหน้า', '<button type="button" class="btn btn--primary" data-clear>ดูผู้เชี่ยวชาญทั้งหมด</button>')
        : MH.ui.empty('ยังไม่มีผู้เชี่ยวชาญที่เปิดรับนัด', 'ทีมงานกำลังตรวจคุณสมบัติผู้สมัคร กลับมาดูใหม่อีกครั้งภายหลัง');
    } else {
      emptyEl.hidden = true; emptyEl.innerHTML = '';
      listEl.hidden = false;
      listEl.innerHTML = rows.map(function (r) { return card(r.e, r.x); }).join('');
    }
    syncURL();
  }

  chipsHost.addEventListener('click', function (e) {
    var b = e.target.closest('[data-spec]'); if (!b) return;
    state.spec = b.getAttribute('data-spec'); render();
  });
  emptyEl.addEventListener('click', function (e) { if (e.target.closest('[data-clear]')) { state.spec = ''; render(); } });

  /* ---------- สมัครเป็นผู้เชี่ยวชาญ ---------- */
  function clearErrs(form) {
    form.querySelectorAll('.err').forEach(function (n) { n.remove(); });
    form.querySelectorAll('[aria-invalid]').forEach(function (n) { n.removeAttribute('aria-invalid'); n.removeAttribute('aria-describedby'); });
  }
  function fieldErr(id, msg) {
    var el = document.getElementById(id); if (!el) return;
    el.setAttribute('aria-invalid', 'true');
    var p = document.createElement('p'); p.className = 'err'; p.id = id + '-err'; p.textContent = msg;
    el.setAttribute('aria-describedby', p.id);
    el.closest('.field').appendChild(p);
  }

  document.getElementById('apply-btn').addEventListener('click', function () {
    MH.ui.dialog({
      title: 'สมัครเป็นผู้เชี่ยวชาญ',
      html: '<p class="muted">กรอกสั้น ๆ แค่นี้ ทีมงานจะตรวจคุณสมบัติและติดต่อกลับทางอีเมล</p>' +
        '<form id="ap-form" novalidate>' +
        '<div class="field"><label for="ap-name">ชื่อ-นามสกุล</label><input class="input" id="ap-name" autocomplete="name" maxlength="80"></div>' +
        '<div class="field"><label for="ap-email">อีเมลสำหรับติดต่อกลับ</label><input class="input" id="ap-email" type="email" autocomplete="email" maxlength="120"></div>' +
        '<div class="field"><label for="ap-spec">ความเชี่ยวชาญหลัก</label><select class="select" id="ap-spec"><option value="">เลือกความเชี่ยวชาญ</option>' +
          Object.keys(SPEC).map(function (k) { return '<option value="' + k + '">' + h(SPEC[k]) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label for="ap-years">ประสบการณ์ (ปี)</label><input class="input" id="ap-years" type="number" inputmode="numeric" min="0" max="60" step="1"><span class="hint">ใส่ 0 ถ้าน้อยกว่า 1 ปี</span></div>' +
        '<div class="btn-row"><button type="button" class="btn btn--outline" data-ap-close>ยกเลิก</button><button type="submit" class="btn btn--primary">ส่งใบสมัคร</button></div>' +
        '</form>',
      actions: [],
      onOpen: function (d) {
        var form = d.querySelector('#ap-form');
        d.querySelector('#ap-name').focus();
        d.querySelector('[data-ap-close]').addEventListener('click', function () { d.close(); });
        form.addEventListener('submit', function (ev) {
          ev.preventDefault(); clearErrs(form);
          var name = d.querySelector('#ap-name').value.trim(), email = d.querySelector('#ap-email').value.trim().toLowerCase();
          var spec = d.querySelector('#ap-spec').value, yRaw = d.querySelector('#ap-years').value.trim(), years = Number(yRaw);
          var bad = false;
          if (name.length < 2) { fieldErr('ap-name', 'กรอกชื่อ-นามสกุลอย่างน้อย 2 ตัวอักษร'); bad = true; }
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { fieldErr('ap-email', 'อีเมลไม่ถูกต้อง ตัวอย่าง name@example.com'); bad = true; }
          if (!spec) { fieldErr('ap-spec', 'เลือกความเชี่ยวชาญหลัก'); bad = true; }
          if (yRaw === '' || !/^\d+$/.test(yRaw) || years > 60) { fieldErr('ap-years', 'ใส่ประสบการณ์เป็นจำนวนปี 0–60'); bad = true; }
          if (!bad && S.all('experts', { withTrashed: true }).some(function (x) { return x.status === 'pending' && String(x.contact_email || '').toLowerCase() === email; })) {
            fieldErr('ap-email', 'อีเมลนี้ส่งใบสมัครไว้แล้ว ทีมงานกำลังตรวจและจะติดต่อกลับ'); bad = true;
          }
          if (bad) { var first = form.querySelector('[aria-invalid]'); if (first) first.focus(); return; }
          var nextId = S.all('experts', { withTrashed: true }).reduce(function (m, x) { return Math.max(m, x.id); }, 0) + 1;
          var rate = S.setting('expert_commission'); if (rate == null) rate = 0.2;
          S.insert('experts', { user_id: null, slug: 'applicant-' + nextId, display_name: name, title: '', specialties: [spec], years_experience: years, bio: '',
            session_types: [], status: 'pending', verified_at: null, commission_rate: rate, contact_email: email, applied_at: new Date().toISOString(), source: 'public_form' });
          d.querySelector('.d-body').innerHTML = '<h2 id="dlg-title">ส่งใบสมัครแล้ว</h2><p>ขอบคุณคุณ' + h(name) + ' ทีมงานจะตรวจคุณสมบัติและติดต่อกลับทางอีเมล ' + h(email) + '</p>' +
            '<p class="muted">ระหว่างนี้โปรไฟล์ยังไม่แสดงบนหน้าเว็บ จนกว่าจะผ่านการตรวจ</p><div class="btn-row"><button type="button" class="btn btn--primary" data-ap-done>ปิด</button></div>';
          d.querySelector('[data-ap-done]').addEventListener('click', function () { d.close(); });
          d.querySelector('[data-ap-done]').focus();
        });
      }
    });
  });

  render();
})();
