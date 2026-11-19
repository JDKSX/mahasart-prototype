/* หน้าบัญชีสมาชิก: โครงหน้า (หัวบัญชี + แท็บ ARIA) และแท็บของระบบสมาชิก 4 แท็บ
   overview (ภาพรวม) · profile (ข้อมูลส่วนตัว PDPA) · saved (ผลดูดวงที่บันทึก) · favorites (รายการโปรด)
   แท็บของผู้สร้างอื่น (orders ai bookings courses plan) ลงทะเบียนเองผ่าน MH.account.register ในไฟล์ของตัวเอง
   ลำดับสคริปต์: account-tabs.js → login.js (ตัวช่วย MH.memberAuth) → account.js → โมดูลแท็บอื่น → account-boot.js (เรียก MH.account.boot) */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h, S = MH.store, A = MH.astro, AU = MH.memberAuth, ACC = MH.account;
  function $(id) { return document.getElementById(id); }
  function mine(table, m) { return S.all(table).filter(function (r) { return r.member_id === m.id; }); }
  function newest(a, b) { return String(b.created_at).localeCompare(String(a.created_at)) || b.id - a.id; }
  function hasTab(key) { return ACC.tabs.some(function (t) { return t.key === key && typeof t.render === 'function'; }); }
  function gotoLink(key, label, cls) { return hasTab(key) ? '<a class="' + cls + '" href="account.html?tab=' + key + '" data-goto-tab="' + key + '">' + label + '</a>' : ''; }
  /* ผูก event ที่ host โดยไม่ซ้อนทับของเดิมเมื่อวาดแท็บซ้ำ */
  function on(host, type, fn) { var k = '_mb_' + type; if (host[k]) host.removeEventListener(type, host[k]); host[k] = fn; host.addEventListener(type, fn); }
  function fresh(m) { return S.find('members', m.id) || m; }

  /* ================= ภาพรวม ================= */
  function statCard(title, big, note, link) {
    return '<section class="card mb-stat"><h3>' + h(title) + '</h3><p class="mb-big">' + big + '</p>' + (note ? '<p class="muted">' + note + '</p>' : '') + (link || '') + '</section>';
  }
  ACC.register({ key: 'overview', label: 'ภาพรวม', order: 1, render: function (host, m) {
    var plan = MH.member.plan(m), sub = MH.q.activeSubscription(m.id), prem = plan.key === 'premium';
    var saved = mine('member_saved_readings', m).length, favs = mine('member_favorites', m).length, q = MH.q.aiQuota(m);
    var planNote = prem && sub
      ? (sub.status === 'cancelled' ? 'ยกเลิกต่ออายุแล้ว ใช้สิทธิ์พรีเมียมได้ถึง ' + h(MH.util.dateLong(sub.renews_at)) : 'ต่ออายุรอบถัดไป ' + h(MH.util.dateLong(sub.renews_at)))
      : (prem ? 'สิทธิ์พรีเมียมใช้งานอยู่' : 'ใช้งานฟรี ไม่มีค่าใช้จ่าย');
    var shortcuts = [
      ['taksa.html', 'i-dial', 'ทักษาตามวันเกิด'], ['rasi.html', 'i-moon', 'ราศีจากวันเกิด'], ['numerology.html', 'i-calc', 'เลขศาสตร์ชื่อ'], ['daily.html', 'i-sun', 'ดวงรายวัน'],
      ['ai.html', 'i-ai', 'ถาม Mahasart AI'], ['experts.html', 'i-expert', 'จองผู้เชี่ยวชาญ'], ['courses.html', 'i-screen', 'คอร์สเรียน'], ['articles.html', 'i-book', 'คลังความรู้']
    ];
    host.innerHTML =
      '<div class="mb-grid">' +
        statCard('แพ็กเกจปัจจุบัน', h(plan.name), planNote,
          '<a class="mb-more" href="pricing.html">ดูแพ็กเกจทั้งหมด</a>') +
        statCard('ผลดูดวงที่บันทึก', saved + (plan.save_limit ? ' / ' + plan.save_limit : ''), plan.save_limit ? 'สมาชิกทั่วไปบันทึกได้ ' + plan.save_limit + ' รายการ' : 'บันทึกได้ไม่จำกัด',
          gotoLink('saved', 'ดูผลที่บันทึก', 'mb-more')) +
        statCard('รายการโปรด', String(favs), 'บทความ วัตถุมงคล ผู้เชี่ยวชาญ และคอร์สที่เก็บไว้', gotoLink('favorites', 'ดูรายการโปรด', 'mb-more')) +
        statCard('คำถาม AI วันนี้', q.limit ? q.left + ' / ' + q.limit : 'ถามไม่ได้', q.limit ? 'เหลือ ' + q.left + ' คำถามจากโควตาวันนี้' : 'แพ็กเกจนี้ยังไม่มีโควตาถาม AI', '<a class="mb-more" href="ai.html">ไปถาม Mahasart AI</a>') +
      '</div>' +
      '<section class="mb-block" aria-labelledby="ov-short-h"><h3 id="ov-short-h">ทางลัด</h3><ul class="mb-shortcuts">' +
        shortcuts.map(function (s) { return '<li><a href="' + s[0] + '">' + MH.ui.icon(s[1]) + h(s[2]) + '</a></li>'; }).join('') + '</ul></section>' +
      '<section class="mb-block" aria-labelledby="ov-priv-h"><h3 id="ov-priv-h">ข้อมูลส่วนตัวและความยินยอม</h3><ul class="mb-status-list">' +
        '<li>ข้อมูลวันเกิด: ' + (m.consent_birthdata_at ? '<span class="tag tag--cert">ยินยอมให้เก็บแล้ว</span> เมื่อ ' + h(MH.util.dateShort(m.consent_birthdata_at)) : '<span class="tag">ไม่ได้เก็บ</span> ระบบไม่มีวันเกิดของคุณ') + '</li>' +
        '<li>รับข่าวสารทางอีเมล: ' + (m.consent_marketing ? '<span class="tag tag--cert">รับ</span>' : '<span class="tag">ไม่รับ</span>') + '</li>' +
        '</ul><p class="mb-fine">' + gotoLink('profile', 'แก้ข้อมูลส่วนตัว ถอนความยินยอม ดาวน์โหลดหรือลบข้อมูล', '') + '</p></section>';
  } });

  /* ================= ข้อมูลส่วนตัว ================= */
  function tableNames() {
    var names = {};
    Object.keys(window.MAHASART_DATA || {}).forEach(function (k) { names[k] = 1; });
    try { var st = JSON.parse(localStorage.getItem('mahasart-proto-v1')); if (st && st.tables) Object.keys(st.tables).forEach(function (k) { names[k] = 1; }); } catch (e) {}
    return Object.keys(names);
  }
  /** ข้อมูลของสมาชิกคนนี้จากทุกตารางที่ member_id ตรง + ตารางลูกที่ผูกผ่านรายการของเขา */
  function collectMyData(m) {
    var out = {};
    tableNames().forEach(function (t) {
      if (t === 'audit_logs' || t === 'settings') return;
      var rows;
      try { rows = S.all(t, { withTrashed: true }); } catch (e) { return; }
      if (!Array.isArray(rows)) return;
      rows = rows.filter(function (r) { return t === 'members' ? r.id === m.id : r.member_id === m.id; });
      if (rows.length) out[t] = rows;
    });
    [['order_items', 'order_id', 'orders'], ['ai_messages', 'conversation_id', 'ai_conversations'], ['expert_messages', 'booking_id', 'expert_bookings']].forEach(function (c) {
      var ids = (out[c[2]] || []).map(function (r) { return r.id; });
      var rows = S.all(c[0], { withTrashed: true }).filter(function (r) { return ids.indexOf(r[c[1]]) >= 0; });
      if (rows.length) out[c[0]] = rows;
    });
    return out;
  }
  function downloadMyData(m) {
    var payload = { exported_at: new Date().toISOString(), member_id: m.id, note: 'ข้อมูลของคุณที่ MAHASART เก็บไว้ ทุกตารางที่ผูกกับบัญชีนี้ (ต้นแบบ: ข้อมูลอยู่ในเบราว์เซอร์นี้)', data: collectMyData(m) };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'mahasart-my-data-member' + m.id + '-' + MH.util.todayISO().replace(/-/g, '') + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    return Object.keys(payload.data).length;
  }
  function deleteAccount(m) {
    return AU.formDialog({
      title: 'ลบบัญชีของฉัน', okLabel: 'ลบบัญชีของฉัน', okCls: 'btn--danger',
      html: '<p class="notice notice--danger"><span>ลบแล้วเข้าสู่ระบบด้วยบัญชีนี้ไม่ได้อีก ผลดูดวงที่บันทึกและรายการโปรดจะถูกลบทิ้ง ย้อนกลับไม่ได้ ดาวน์โหลดข้อมูลของคุณเก็บไว้ก่อนได้</span></p>' +
        '<p class="mb-fine">คำสั่งซื้อและการชำระเงินที่เกิดขึ้นแล้วต้องเก็บไว้ตามกฎหมายบัญชี แต่จะไม่ผูกกับบัญชีที่ใช้งานได้อีก' + (MH.q.activeSubscription(m.id) ? ' แพ็กเกจพรีเมียมที่ใช้อยู่จะถูกยกเลิก' : '') + '</p>' +
        '<div class="field"><label for="del-confirm">พิมพ์คำว่า <b>ลบบัญชี</b> เพื่อยืนยัน</label><input class="input" id="del-confirm" autocomplete="off" spellcheck="false"></div>',
      onOpen: function (d) { d.querySelector('#del-confirm').focus(); },
      onSubmit: function (d) {
        var v = d.querySelector('#del-confirm').value.trim().normalize('NFC');
        return v === 'ลบบัญชี' ? { value: true } : { error: 'พิมพ์คำว่า ลบบัญชี ให้ตรงตามนี้เพื่อยืนยัน (ตอนนี้ยังไม่ตรง)' };
      }
    }).then(function (ok) {
      if (!ok) return;
      var sub = MH.q.activeSubscription(m.id); if (sub && sub.status === 'active') MH.commerce.cancelSubscription(sub.id);
      mine('member_saved_readings', m).forEach(function (r) { S.purge('member_saved_readings', r.id); });
      mine('member_favorites', m).forEach(function (r) { S.purge('member_favorites', r.id); });
      S.remove('members', m.id);
      MH.member.logout();
      location.href = 'index.html';
    });
  }

  function renderProfile(host, m) {
    var consented = !!m.consent_birthdata_at;
    var keyOpts = '<option value="">ยังไม่ระบุ</option>' + A.BIRTHDAYS.map(function (b) {
      return '<option value="' + h(b.key) + '"' + (m.birthday_key === b.key ? ' selected' : '') + '>วัน' + h(b.label) + '</option>';
    }).join('');
    host.innerHTML =
      '<form id="pf-form" novalidate>' +
      '<section class="mb-section" aria-labelledby="pf-acc-h"><h3 id="pf-acc-h">ข้อมูลบัญชี</h3>' +
        '<p class="hint">ชื่อที่แสดงใช้ทักทายบนหัวเว็บและในคำสั่งซื้อ</p>' +
        '<div class="form-grid">' +
          '<div class="field"><label for="pf-name">ชื่อที่แสดง</label><input class="input" id="pf-name" maxlength="60" autocomplete="nickname" value="' + h(m.display_name) + '"></div>' +
          '<div class="field"><label for="pf-phone">เบอร์โทร (ไม่บังคับ)</label><input class="input" id="pf-phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="081-234-5678" value="' + h(m.phone || '') + '"></div>' +
          '<div class="field full"><label for="pf-email">อีเมล</label><input class="input" id="pf-email" type="email" value="' + h(m.email) + '" readonly aria-describedby="pf-email-hint">' +
            '<p class="hint" id="pf-email-hint">เข้าสู่ระบบด้วย ' + h(MH.labels.provider[m.auth_provider] || m.auth_provider) + ' · อีเมลใช้ยืนยันตัวตน เปลี่ยนไม่ได้ในต้นแบบ (ระบบจริงต้องยืนยันอีเมลใหม่ก่อน)</p></div>' +
        '</div></section>' +
      '<section class="mb-section" aria-labelledby="pf-birth-h"><h3 id="pf-birth-h">ข้อมูลเกิด</h3>' +
        '<p class="hint">ไม่บังคับ เก็บเพื่อกรอกวันเกิดให้อัตโนมัติเวลาดูดวง ใช้เพื่อการดูดวงของคุณเท่านั้น ถอนความยินยอมได้ทุกเมื่อ ข้อมูลจะถูกลบทันที</p>' +
        '<label class="check" for="pf-consent"><input type="checkbox" id="pf-consent"' + (consented ? ' checked' : '') + ' aria-controls="pf-birth"><span>ยินยอมให้เก็บวันเกิดเพื่อใช้ดูดวง</span></label>' +
        '<div class="mb-birth" id="pf-birth"' + (consented ? '' : ' hidden') + '>' +
          '<div class="form-grid">' +
            '<div class="field"><label for="pf-birth-date">วันเกิด</label><input class="input" id="pf-birth-date" type="date" min="1900-01-01" max="' + h(MH.util.todayISO()) + '" value="' + h(m.birth_date || '') + '" aria-describedby="pf-date-th"><p class="hint" id="pf-date-th" aria-live="polite"></p></div>' +
            '<div class="field"><label for="pf-birth-time">เวลาเกิด (ไม่บังคับ)</label><input class="input" id="pf-birth-time" type="time" value="' + h(m.birth_time || '') + '" aria-describedby="pf-time-hint"><p class="hint" id="pf-time-hint">ไม่ทราบเวลาเกิดเว้นว่างได้</p></div>' +
            '<div class="field full"><label for="pf-birth-key">วันเกิดตามทักษา</label><select class="select" id="pf-birth-key" aria-describedby="pf-key-hint">' + keyOpts + '</select>' +
              '<p class="hint" id="pf-key-hint">เลือกให้อัตโนมัติจากวันและเวลาเกิด (เกิดก่อน 06:00 นับเป็นวันก่อนหน้า พุธ 18:00–05:59 นับเป็นพุธกลางคืน) ถ้าไม่ทราบเวลาเกิดระบบถือว่าเกิดตอนกลางวัน แก้เองได้</p></div>' +
          '</div></div></section>' +
      '<div class="btn-row"><button class="btn btn--primary" type="submit">บันทึกข้อมูล</button></div>' +
      '</form>' +
      '<section class="mb-section mb-block" aria-labelledby="pf-mk-h"><h3 id="pf-mk-h">การรับข่าวสาร</h3>' +
        '<p class="hint">แยกจากความยินยอมเรื่องวันเกิด เลือกแล้วบันทึกทันที</p>' +
        '<label class="check" for="pf-marketing"><input type="checkbox" id="pf-marketing"' + (m.consent_marketing ? ' checked' : '') + '><span>ยินยอมรับข่าวสารและโปรโมชันทางอีเมล</span></label></section>' +
      '<section class="mb-section" aria-labelledby="pf-data-h"><h3 id="pf-data-h">ข้อมูลของฉัน</h3>' +
        '<p class="hint">คุณขอดูข้อมูลทั้งหมดที่เราเก็บ หรือลบบัญชีได้ด้วยตัวเอง</p>' +
        '<div class="btn-row"><button type="button" class="btn btn--outline" id="pf-export">ดาวน์โหลดข้อมูลของฉัน (JSON)</button>' +
        '<button type="button" class="btn btn--outline mb-del" id="pf-delete">ลบบัญชี</button></div>' +
        '<p class="mb-fine">ไฟล์ดาวน์โหลดรวมข้อมูลบัญชี ผลดูดวงที่บันทึก รายการโปรด คำสั่งซื้อ นัดผู้เชี่ยวชาญ คอร์ส และแพ็กเกจของคุณ</p></section>';

    var form = $('pf-form'), consent = $('pf-consent'), birth = $('pf-birth');
    function dateHint() {
      var v = $('pf-birth-date').value;
      $('pf-date-th').textContent = v ? 'ตรงกับ ' + MH.util.dateLong(v + 'T12:00:00', true) : '';
    }
    function suggest() {
      var dv = $('pf-birth-date').value; dateHint(); if (!dv) return;
      var p = dv.split('-'), t = ($('pf-birth-time').value || '12:00').split(':');
      var b = A.birthdayOfPlanet(A.birthPlanet(new Date(+p[0], +p[1] - 1, +p[2], +t[0], +t[1])));
      if (b) $('pf-birth-key').value = b.key;
    }
    dateHint();
    $('pf-birth-date').addEventListener('change', suggest); $('pf-birth-date').addEventListener('input', suggest);
    $('pf-birth-time').addEventListener('change', suggest);

    consent.addEventListener('change', function () {
      var cur = fresh(m);
      if (consent.checked) { birth.hidden = false; $('pf-birth-date').focus(); return; }
      if (!cur.consent_birthdata_at) { birth.hidden = true; return; }
      MH.ui.confirm({ title: 'ถอนความยินยอมเก็บวันเกิด?', body: 'ระบบจะลบวันเกิด เวลาเกิด และวันเกิดตามทักษาที่เก็บไว้ทันที ย้อนกลับไม่ได้ (ผลดูดวงที่คุณบันทึกไว้ไม่ถูกลบ)', okLabel: 'ถอนความยินยอมและลบข้อมูลเกิด', danger: true }).then(function (ok) {
        if (!ok) { consent.checked = true; birth.hidden = false; return; }
        S.update('members', cur.id, { birth_date: null, birth_time: null, birthday_key: null, consent_birthdata_at: null });
        MH.ui.toast('ถอนความยินยอมแล้ว ลบข้อมูลเกิดของคุณเรียบร้อย');
        renderProfile(host, fresh(cur));
        $('pf-consent').focus();
      });
    });

    $('pf-marketing').addEventListener('change', function () {
      var cur = fresh(m), on = this.checked;
      S.update('members', cur.id, { consent_marketing: on });
      MH.ui.toast(on ? 'บันทึกแล้ว: คุณยินยอมรับข่าวสารทางอีเมล' : 'บันทึกแล้ว: ยกเลิกการรับข่าวสาร');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var cur = fresh(m), name = $('pf-name').value.trim(), phone = $('pf-phone').value.trim(), on = consent.checked, bd = $('pf-birth-date').value, errs = [];
      if (!name) errs.push({ field: 'pf-name', msg: 'กรอกชื่อที่แสดง' });
      else if (name.length > 60) errs.push({ field: 'pf-name', msg: 'ชื่อยาวเกิน 60 ตัวอักษร (ตอนนี้ ' + name.length + ')' });
      if (phone && (!/^[\d\s-]+$/.test(phone) || !/^0\d{8,9}$/.test(phone.replace(/[\s-]/g, '')))) errs.push({ field: 'pf-phone', msg: 'เบอร์โทรไม่ถูกรูปแบบ ใช้เลข 9–10 หลักขึ้นต้นด้วย 0 เช่น 081-234-5678 หรือเว้นว่างไว้' });
      if (on) {
        if (!bd) errs.push({ field: 'pf-birth-date', msg: 'กรอกวันเกิด หรือเอาเครื่องหมายยินยอมออกถ้าไม่ต้องการให้เก็บ' });
        else if (bd > MH.util.todayISO()) errs.push({ field: 'pf-birth-date', msg: 'วันเกิดอยู่ในอนาคต ตรวจวันที่อีกครั้ง' });
        else if (bd < '1900-01-01') errs.push({ field: 'pf-birth-date', msg: 'วันเกิดเก่าเกินไป ตรวจปีเกิดอีกครั้ง' });
      }
      if (!AU.showErrors(form, errs)) return;
      var patch = { display_name: name, phone: phone };
      if (on) Object.assign(patch, { birth_date: bd, birth_time: $('pf-birth-time').value || null, birthday_key: $('pf-birth-key').value || null, consent_birthdata_at: cur.consent_birthdata_at || new Date().toISOString() });
      else Object.assign(patch, { birth_date: null, birth_time: null, birthday_key: null, consent_birthdata_at: null });
      S.update('members', cur.id, patch);
      MH.ui.toast(on && !cur.consent_birthdata_at ? 'บันทึกแล้ว และเก็บข้อมูลเกิดตามที่คุณยินยอม' : 'บันทึกข้อมูลแล้ว');
      if (ACC.refreshHead) ACC.refreshHead();
    });

    $('pf-export').addEventListener('click', function () {
      var n = downloadMyData(fresh(m));
      MH.ui.toast('ดาวน์โหลดแล้ว: ข้อมูลของคุณจาก ' + n + ' ตาราง');
    });
    $('pf-delete').addEventListener('click', function () { deleteAccount(fresh(m)); });
  }
  ACC.register({ key: 'profile', label: 'ข้อมูลส่วนตัว', order: 2, render: renderProfile });

  /* ================= ผลดูดวงที่บันทึก ================= */
  function readingHref(r) {
    var i = r.input || {};
    if (r.tool === 'taksa') return i.day ? 'taksa.html?day=' + encodeURIComponent(i.day) : 'taksa.html';
    if (r.tool === 'rasi') return 'rasi.html';
    if (r.tool === 'numerology') return 'numerology.html';
    if (r.tool === 'ai') return 'ai.html';
    return '';
  }
  function renderSaved(host, m) {
    var list = mine('member_saved_readings', m).sort(newest), limit = MH.member.plan(m).save_limit;
    var full = limit && list.length >= limit;
    host.innerHTML =
      '<h2 class="mb-sub-h" tabindex="-1" data-focus>ผลดูดวงที่บันทึกไว้</h2>' +
      '<div class="mb-quota"><span>บันทึกแล้ว <b>' + list.length + '</b> ' + (limit ? 'จาก ' + limit + ' รายการ' : 'รายการ (ไม่จำกัด)') + '</span>' +
        (full ? '<div class="notice notice--warn" role="status"><span>บันทึกครบโควตาแล้ว ลบรายการเก่าที่ไม่ใช้ หรือ <a href="pricing.html">สมัครพรีเมียม</a> เพื่อบันทึกไม่จำกัด</span></div>' : '') + '</div>' +
      (list.length
        ? '<ul class="mb-list">' + list.map(function (r) {
            var href = readingHref(r);
            return '<li class="mb-item"><div class="mb-item-main"><span class="mb-item-title"><span class="tag">' + h(MH.labels.tool[r.tool] || r.tool) + '</span>' + h(r.title) + '</span>' +
              '<p>' + h(r.summary) + '</p><p>บันทึกเมื่อ ' + h(MH.util.dateShort(r.created_at)) + '</p></div>' +
              '<div class="mb-acts">' + (href ? '<a class="btn btn--outline btn--sm" href="' + h(href) + '">เปิดดูอีกครั้ง</a>' : '') +
              '<button type="button" class="btn btn--outline btn--sm mb-del" data-del-saved="' + r.id + '" aria-label="ลบ ' + h(r.title) + '">ลบ</button></div></li>';
          }).join('') + '</ul>'
        : MH.ui.empty('ยังไม่มีผลที่บันทึก', 'กดปุ่ม “บันทึกผลนี้” ใต้ผลทักษา ราศี หรือเลขศาสตร์ ผลจะมารวมที่นี่',
            '<a class="btn btn--primary" href="taksa.html">ดูทักษา</a><a class="btn btn--outline" href="rasi.html">ดูราศี</a><a class="btn btn--outline" href="numerology.html">เลขศาสตร์ชื่อ</a>'));
    on(host, 'click', function (e) {
      var b = e.target.closest('[data-del-saved]'); if (!b) return;
      var r = S.find('member_saved_readings', b.getAttribute('data-del-saved')); if (!r || r.member_id !== m.id) return;
      MH.ui.confirm({ title: 'ลบผลที่บันทึกนี้?', body: r.title + ' จะถูกลบถาวร ย้อนกลับไม่ได้', okLabel: 'ลบ', danger: true }).then(function (ok) {
        if (!ok) return;
        S.purge('member_saved_readings', r.id);
        MH.ui.toast('ลบผลที่บันทึกแล้ว');
        renderSaved(host, m);
        var f = host.querySelector('[data-focus]'); if (f) f.focus();
      });
    });
  }
  ACC.register({ key: 'saved', label: 'ผลดูดวงที่บันทึก', order: 3, render: renderSaved });

  /* ================= รายการโปรด ================= */
  var FAV_TYPES = [['article', 'บทความ'], ['amulet', 'วัตถุมงคล'], ['expert', 'ผู้เชี่ยวชาญ'], ['course', 'คอร์สเรียน']];
  /** คืน { name, href, meta } ถ้ายังเปิดอยู่ หรือ null ถ้ารายการนั้นไม่เปิดแล้ว */
  function resolveFav(f) {
    var r;
    if (f.type === 'article') {
      r = S.find('articles', f.ref_id); if (!r || !MH.q.isLive(r)) return null;
      var c = MH.q.category(r.category_id);
      return { name: r.title, href: 'article.html?slug=' + encodeURIComponent(r.slug), meta: c ? c.name : '' };
    }
    if (f.type === 'amulet') {
      r = S.find('amulets', f.ref_id); if (!r || !MH.q.isLive(r)) return null;
      return { name: r.name, href: 'amulet.html?code=' + encodeURIComponent(r.code), meta: (MH.labels.provenance[r.provenance_type] || {}).label || '' };
    }
    if (f.type === 'expert') {
      r = S.find('experts', f.ref_id); if (!r || r.deleted_at || r.status !== 'active') return null;
      return { name: r.display_name, href: 'expert.html?slug=' + encodeURIComponent(r.slug), meta: r.title || '' };
    }
    if (f.type === 'course') {
      r = S.find('courses', f.ref_id); if (!r || r.deleted_at || r.status !== 'published') return null;
      return { name: r.title, href: 'course.html?slug=' + encodeURIComponent(r.slug), meta: r.level || '' };
    }
    return null;
  }
  function renderFavorites(host, m) {
    var favs = mine('member_favorites', m).sort(newest);
    var body = FAV_TYPES.map(function (t) {
      var items = favs.filter(function (f) { return f.type === t[0]; });
      if (!items.length) return '';
      return '<section class="mb-group" aria-labelledby="fv-' + t[0] + '"><h3 id="fv-' + t[0] + '">' + h(t[1]) + ' <span class="tag">' + items.length + '</span></h3><ul class="mb-list">' +
        items.map(function (f) {
          var r = resolveFav(f);
          return '<li class="mb-item"><div class="mb-item-main">' +
            (r ? '<a class="mb-item-title" href="' + h(r.href) + '">' + h(r.name) + '</a>' + (r.meta ? '<p>' + h(r.meta) + '</p>' : '')
               : '<span class="mb-item-title">รายการนี้ไม่เปิดให้ดูแล้ว</span><p>ทีมงานเก็บหรือยกเลิกรายการนี้แล้ว เอาออกจากรายการโปรดได้</p>') +
            '<p>เก็บเมื่อ ' + h(MH.util.dateShort(f.created_at)) + '</p></div>' +
            '<div class="mb-acts"><button type="button" class="btn btn--outline btn--sm" data-unfav="' + f.id + '" aria-label="เอาออกจากรายการโปรด ' + h(r ? r.name : t[1]) + '">เอาออก</button></div></li>';
        }).join('') + '</ul></section>';
    }).join('');
    host.innerHTML = '<h2 class="mb-sub-h" tabindex="-1" data-focus>รายการโปรดของฉัน</h2>' +
      (body || MH.ui.empty('ยังไม่มีรายการโปรด', 'กดปุ่ม “เก็บเป็นรายการโปรด” ที่บทความ วัตถุมงคล ผู้เชี่ยวชาญ หรือคอร์ส แล้วจะมารวมที่นี่',
        '<a class="btn btn--primary" href="articles.html">ไปคลังความรู้</a><a class="btn btn--outline" href="amulets.html">ดูวัตถุมงคล</a>'));
    on(host, 'click', function (e) {
      var b = e.target.closest('[data-unfav]'); if (!b) return;
      var f = S.find('member_favorites', b.getAttribute('data-unfav')); if (!f || f.member_id !== m.id) return;
      S.purge('member_favorites', f.id);
      MH.ui.toast('เอาออกจากรายการโปรดแล้ว');
      renderFavorites(host, m);
      var t = host.querySelector('[data-focus]'); if (t) t.focus();
    });
  }
  ACC.register({ key: 'favorites', label: 'รายการโปรด', order: 4, render: renderFavorites });

  /* ================= โครงหน้า ================= */
  function headHtml(m) {
    var plan = MH.member.plan(m), prem = plan.key === 'premium';
    return '<section class="card mb-head" aria-labelledby="acc-name">' +
      '<span class="mb-avatar" aria-hidden="true">' + h(Array.from(String(m.display_name).trim())[0] || '✦') + '</span>' +
      '<div class="mb-head-main"><h2 id="acc-name">' + h(m.display_name) + '</h2>' +
      '<p class="muted">เข้าสู่ระบบด้วย ' + h(MH.labels.provider[m.auth_provider] || m.auth_provider) + ' · ' + h(m.email) + '</p>' +
      '<p>แพ็กเกจ ' + (prem ? '<span class="tag tag--stone">' + h(plan.name) + '</span>' : '<b>' + h(plan.name) + '</b>') + '</p></div>' +
      '<button type="button" class="btn btn--outline" id="acc-logout">ออกจากระบบ</button></section>';
  }
  ACC.refreshHead = function () {
    var m = MH.member.current(), el = $('acc-head'); if (!m || !el) return;
    el.innerHTML = headHtml(m);
  };

  function signedOutHtml() {
    var here = location.pathname.split('/').pop() + location.search;
    return '<div class="state"><p class="big" aria-hidden="true">✦</p><h2>เข้าสู่ระบบก่อน</h2>' +
      '<p>หน้านี้สำหรับสมาชิก เข้าสู่ระบบด้วย LINE, Google หรืออีเมล แล้วจะกลับมาที่หน้านี้ให้เอง</p>' +
      '<div class="btn-row"><a class="btn btn--primary" href="' + h(MH.member.loginUrl()) + '">เข้าสู่ระบบ</a>' +
      '<a class="btn btn--outline" href="register.html?next=' + encodeURIComponent(here) + '">สมัครสมาชิกฟรี</a></div></div>';
  }

  ACC.boot = function () {
    var root = $('account-root'); if (!root) return;
    var m = MH.member.current();
    if (!m) { root.innerHTML = signedOutHtml(); return; }
    var tabs = ACC.tabs.filter(function (t) { return typeof t.render === 'function'; });
    var wanted = MH.util.param('tab');
    var first = tabs.some(function (t) { return t.key === wanted; }) ? wanted : tabs[0].key;

    root.innerHTML = '<div id="acc-head">' + headHtml(m) + '</div>' +
      '<div class="mb-tabs" role="tablist" aria-label="หมวดของบัญชี">' + tabs.map(function (t) {
        return '<button type="button" role="tab" class="mb-tab" id="tab-' + h(t.key) + '" aria-selected="false" aria-controls="panel-' + h(t.key) + '" tabindex="-1">' + h(t.label) + '</button>';
      }).join('') + '</div>' +
      tabs.map(function (t) { return '<div role="tabpanel" class="mb-panel" id="panel-' + h(t.key) + '" aria-labelledby="tab-' + h(t.key) + '" tabindex="0" hidden></div>'; }).join('');

    function select(key, focusTab) {
      var cur = MH.member.current(); if (!cur) { location.reload(); return; }
      tabs.forEach(function (t) {
        var on = t.key === key;
        $('tab-' + t.key).setAttribute('aria-selected', String(on)); $('tab-' + t.key).tabIndex = on ? 0 : -1;
        $('panel-' + t.key).hidden = !on;
      });
      var t = tabs.filter(function (x) { return x.key === key; })[0], panel = $('panel-' + key);
      try { t.render(panel, cur); }
      catch (err) {
        panel.innerHTML = '<div class="notice notice--danger" role="alert"><span>แท็บนี้โหลดไม่สำเร็จ ลองรีเฟรชหน้านี้อีกครั้ง</span></div>';
        if (window.console) console.warn('account tab "' + key + '" failed:', err);
      }
      try { history.replaceState(null, '', '?tab=' + encodeURIComponent(key)); } catch (e) {}
      if (focusTab) $('tab-' + key).focus();
    }

    var list = root.querySelector('[role="tablist"]');
    list.addEventListener('click', function (e) { var b = e.target.closest('[role="tab"]'); if (b) select(b.id.slice(4), false); });
    list.addEventListener('keydown', function (e) {
      var keys = tabs.map(function (t) { return t.key; }), cur = document.activeElement && document.activeElement.id ? document.activeElement.id.slice(4) : '';
      var i = keys.indexOf(cur); if (i < 0) return;
      var n = e.key === 'ArrowRight' ? (i + 1) % keys.length : e.key === 'ArrowLeft' ? (i - 1 + keys.length) % keys.length : e.key === 'Home' ? 0 : e.key === 'End' ? keys.length - 1 : -1;
      if (n < 0) return;
      e.preventDefault(); select(keys[n], true);
    });
    root.addEventListener('click', function (e) {
      var g = e.target.closest('[data-goto-tab]');
      if (g) { e.preventDefault(); select(g.getAttribute('data-goto-tab'), false); window.scrollTo(0, 0); return; }
      if (e.target.closest('#acc-logout')) { MH.member.logout(); location.href = 'index.html'; }
    });
    select(first, false);
  };
})();
