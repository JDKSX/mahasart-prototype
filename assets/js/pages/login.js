/* เข้าสู่ระบบสมาชิก (LINE · Google · อีเมล) — จำลองทั้ง 3 ทาง ไม่เชื่อมผู้ให้บริการจริง และไม่เก็บรหัสผ่านของใคร
   ไฟล์นี้ยังเป็นตัวช่วยกลางของ register.html และ account.html ด้วย: MH.memberAuth
   (safeNext · goAfter · showErrors · clearErrors · formDialog · social) — ส่วนของหน้า login ทำงานเฉพาะ data-page="login" */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h, S = MH.store;
  function $(id) { return document.getElementById(id); }
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* ?next= รับเฉพาะชื่อไฟล์ .html ในโฟลเดอร์เดียวกัน (ไม่มี / \ หรือโดเมน) กัน open redirect */
  function safeNext(v) {
    v = String(v || '');
    if (!/^[A-Za-z0-9_-]+\.html(\?[A-Za-z0-9_%=&.,+~-]*)?(#[A-Za-z0-9_-]*)?$/.test(v)) return '';
    var file = v.split(/[?#]/)[0];
    return file === 'login.html' || file === 'register.html' ? '' : v;
  }
  function nextParam() { return safeNext(MH.util.param('next')); }
  function goAfter() { location.href = nextParam() || 'account.html'; }

  /* ---------- error ใต้ช่อง + สรุปบนฟอร์ม ---------- */
  function clearErrors(form) {
    form.querySelectorAll('.mb-err-summary, .field .err').forEach(function (n) { n.remove(); });
    form.querySelectorAll('[aria-invalid]').forEach(function (n) {
      n.removeAttribute('aria-invalid');
      if (n.hasAttribute('data-d0')) { var d = n.getAttribute('data-d0'); if (d) n.setAttribute('aria-describedby', d); else n.removeAttribute('aria-describedby'); }
    });
  }
  /** errs = [{ field: 'id ของ input', msg }] · คืน true ถ้าไม่มี error */
  function showErrors(form, errs) {
    clearErrors(form);
    if (!errs.length) return true;
    var box = document.createElement('div');
    box.className = 'mb-err-summary'; box.setAttribute('role', 'alert'); box.tabIndex = -1;
    box.innerHTML = '<h2>ยังไปต่อไม่ได้ แก้ ' + errs.length + ' จุดนี้ก่อน</h2><ul>' +
      errs.map(function (e) { return '<li><a href="#' + h(e.field) + '">' + h(e.msg) + '</a></li>'; }).join('') + '</ul>';
    form.insertBefore(box, form.firstChild);
    var seen = {};
    errs.forEach(function (e) {
      var el = document.getElementById(e.field); if (!el || seen[e.field]) return;
      seen[e.field] = true;
      var p = document.createElement('p'); p.className = 'err'; p.id = e.field + '-err'; p.textContent = e.msg;
      if (!el.hasAttribute('data-d0')) el.setAttribute('data-d0', el.getAttribute('aria-describedby') || '');
      el.setAttribute('aria-invalid', 'true');
      el.setAttribute('aria-describedby', (el.getAttribute('data-d0') + ' ' + p.id).trim());
      (el.closest('.field') || el.parentNode).appendChild(p);
    });
    box.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function (ev) { ev.preventDefault(); var t = document.getElementById(a.getAttribute('href').slice(1)); if (t) t.focus(); });
    });
    box.focus();
    return false;
  }

  /* ---------- dialog ที่มีฟอร์มและตรวจก่อนปิดได้ ----------
     o = { title, html, okLabel, okCls, cancelLabel, cls, onOpen(d), onSubmit(d) → { error } | { value } }
     คืน Promise<value|null> (null = ยกเลิก/กด Esc) */
  function formDialog(o) {
    return new Promise(function (resolve) {
      var opener = document.activeElement, done = false;
      var d = document.createElement('dialog'); d.className = 'dialog ' + (o.cls || ''); d.setAttribute('aria-labelledby', 'mb-dlg-title');
      d.innerHTML = '<form novalidate><div class="d-body"><h2 id="mb-dlg-title">' + h(o.title) + '</h2>' + (o.html || '') +
        '<p class="mb-err" id="mb-dlg-err" role="alert" hidden></p></div>' +
        '<div class="d-foot"><button type="button" class="btn btn--outline" data-cancel>' + h(o.cancelLabel || 'ยกเลิก') + '</button>' +
        '<button type="submit" class="btn ' + (o.okCls || 'btn--primary') + '">' + h(o.okLabel || 'ตกลง') + '</button></div></form>';
      var err = d.querySelector('#mb-dlg-err');
      d.querySelector('[data-cancel]').addEventListener('click', function () { d.close(); });
      d.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault(); err.hidden = true;
        var r = o.onSubmit(d); if (!r) return;
        if (r.error) { err.textContent = r.error; err.hidden = false; return; }
        done = true; resolve(r.value); d.close();
      });
      d.addEventListener('close', function () {
        if (!done) resolve(null);
        setTimeout(function () { d.remove(); if (opener && opener.focus) opener.focus(); }, 0);
      });
      document.body.appendChild(d);
      d.showModal();
      if (o.onOpen) o.onOpen(d);
    });
  }

  /* ---------- dialog จำลองหน้ายินยอมของ LINE / Google ---------- */
  function consentDialog(provider) {
    var P = MH.labels.provider[provider];
    var accts = S.all('members').filter(function (m) { return m.auth_provider === provider; });
    var radios = accts.map(function (m, i) {
      return '<label class="mb-acct" for="mb-acct-' + m.id + '"><input type="radio" name="mb-acct" id="mb-acct-' + m.id + '" value="' + m.id + '"' + (i === 0 ? ' checked' : '') + '>' +
        '<span><b>' + h(m.display_name) + '</b><small>' + h(m.email) + (m.status !== 'active' ? ' · ระงับการใช้งาน' : '') + '</small></span></label>';
    }).join('');
    return formDialog({
      title: 'เข้าสู่ระบบด้วย ' + P, cls: 'mb-consent', okLabel: 'อนุญาตและเข้าสู่ระบบ',
      html: '<p class="notice">' + h(P) + ' จะแชร์ชื่อที่แสดงและอีเมลให้ MAHASART</p>' +
        '<p class="mb-fine">นี่คือหน้าจำลองของผู้ให้บริการ ต้นแบบไม่ได้เชื่อมกับ ' + h(P) + ' จริง และ MAHASART ไม่ได้รับรหัสผ่านหรือรายชื่อเพื่อนของคุณ</p>' +
        '<fieldset class="mb-fs"><legend>เลือกบัญชี ' + h(P) + ' ตัวอย่าง</legend>' + radios +
        '<label class="mb-acct" for="mb-acct-new"><input type="radio" name="mb-acct" id="mb-acct-new" value="new"' + (accts.length ? '' : ' checked') + '>' +
        '<span><b>ใช้บัญชี ' + h(P) + ' อื่น</b><small>กรอกชื่อและอีเมลใหม่ ระบบสมัครสมาชิกให้อัตโนมัติ ถ้าอีเมลนี้มีบัญชีอยู่แล้วจะเข้าบัญชีเดิม</small></span></label></fieldset>' +
        '<div class="mb-new" id="mb-new" hidden>' +
        '<div class="field"><label for="mb-new-name">ชื่อที่แสดง</label><input class="input" id="mb-new-name" maxlength="60" autocomplete="off"></div>' +
        '<div class="field"><label for="mb-new-email">อีเมล</label><input class="input" id="mb-new-email" type="email" inputmode="email" autocomplete="off" placeholder="name@example.com"></div></div>',
      onOpen: function (d) {
        var box = d.querySelector('#mb-new');
        function sync(focus) {
          var isNew = d.querySelector('input[name="mb-acct"]:checked').value === 'new';
          box.hidden = !isNew;
          if (isNew && focus) d.querySelector('#mb-new-name').focus();
        }
        d.querySelectorAll('input[name="mb-acct"]').forEach(function (r) { r.addEventListener('change', function () { sync(true); }); });
        sync(false);
      },
      onSubmit: function (d) {
        var sel = d.querySelector('input[name="mb-acct"]:checked').value, profile;
        if (sel === 'new') {
          var name = d.querySelector('#mb-new-name').value.trim(), email = d.querySelector('#mb-new-email').value.trim();
          if (!name) return { error: 'กรอกชื่อที่แสดง' };
          if (name.length > 60) return { error: 'ชื่อยาวเกิน 60 ตัวอักษร (ตอนนี้ ' + name.length + ')' };
          if (!EMAIL_RE.test(email)) return { error: 'อีเมลไม่ถูกรูปแบบ ต้องมี @ และโดเมน เช่น name@example.com' };
          profile = { display_name: name, email: email };
        } else {
          var m = accts.find(function (x) { return String(x.id) === sel; });
          profile = { display_name: m.display_name, email: m.email };
        }
        var before = S.all('members', { withTrashed: true }).length;
        var r = MH.member.login(provider, profile);
        if (r.error) return { error: r.error };
        return { value: { member: r.member, created: S.all('members', { withTrashed: true }).length > before } };
      }
    });
  }
  /** ปุ่ม "ด้วย LINE/Google" ทั้งหน้า login และ register */
  function social(provider) {
    return consentDialog(provider).then(function (res) {
      if (!res) return;
      MH.ui.toast((res.created ? 'สมัครสมาชิกด้วย ' : 'เข้าสู่ระบบด้วย ') + MH.labels.provider[provider] + ' แล้ว ยินดีต้อนรับคุณ ' + res.member.display_name);
      setTimeout(goAfter, 500);
    });
  }

  MH.memberAuth = { EMAIL_RE: EMAIL_RE, safeNext: safeNext, nextParam: nextParam, goAfter: goAfter, showErrors: showErrors, clearErrors: clearErrors, formDialog: formDialog, social: social };

  /* ================= ส่วนของหน้า login.html ================= */
  if (document.body.getAttribute('data-page') !== 'login') return;

  var nx = nextParam();
  if (nx) $('to-register').href = 'register.html?next=' + encodeURIComponent(nx);

  document.querySelectorAll('[data-provider]').forEach(function (b) {
    b.addEventListener('click', function () { social(b.getAttribute('data-provider')); });
  });

  /* สมาชิกตัวอย่างให้ลองเข้าด้วยอีเมล */
  $('sample-list').innerHTML = S.all('members').map(function (m) {
    return '<li><code>' + h(m.email) + '</code><span class="tag">' + h(MH.labels.provider[m.auth_provider]) + '</span>' +
      (MH.member.isPremium(m) ? '<span class="tag tag--stone">พรีเมียม</span>' : '') +
      (m.status !== 'active' ? '<span class="tag">ระงับการใช้งาน</span>' : '') + '</li>';
  }).join('');

  function paint() {
    var cur = MH.member.current();
    $('login-in').hidden = !cur; $('login-out').hidden = !!cur;
    if (!cur) return;
    $('who-name').textContent = cur.display_name;
    $('who-sub').textContent = 'เข้าสู่ระบบด้วย ' + MH.labels.provider[cur.auth_provider] + ' · ' + cur.email;
    $('who-back').hidden = !nx;
    if (nx) $('who-back').href = nx;
  }
  paint();
  $('who-logout').addEventListener('click', function () {
    MH.member.logout(); paint(); MH.ui.toast('ออกจากระบบแล้ว'); $('lg-email').focus();
  });

  $('forgot').addEventListener('click', function () {
    MH.ui.dialog({
      title: 'ลืมรหัสผ่าน',
      html: '<p>ในระบบจริง เมื่อกรอกอีเมลที่สมัครไว้ ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปทางอีเมล ลิงก์ใช้ได้ครั้งเดียวและหมดอายุภายใน 30 นาที</p>' +
        '<p class="muted">ต้นแบบนี้ไม่ส่งอีเมลจริงและไม่เก็บรหัสผ่านของใครไว้ จึงไม่มีอะไรให้ตั้งใหม่ ใช้อีเมลของสมาชิกตัวอย่างแล้วพิมพ์รหัสผ่านอะไรก็ได้ที่ยาว 8 ตัวอักษรขึ้นไป</p>',
      actions: [{ label: 'เข้าใจแล้ว', cls: 'btn--primary', value: null }]
    });
  });

  var form = $('login-form');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = $('lg-email').value.trim(), pass = $('lg-pass').value, errs = [];
    if (!email) errs.push({ field: 'lg-email', msg: 'กรอกอีเมลที่ใช้สมัครสมาชิก' });
    else if (!EMAIL_RE.test(email)) errs.push({ field: 'lg-email', msg: 'อีเมลไม่ถูกรูปแบบ ต้องมี @ และโดเมน เช่น name@example.com' });
    if (!pass) errs.push({ field: 'lg-pass', msg: 'กรอกรหัสผ่าน' });
    else if (pass.length < 8) errs.push({ field: 'lg-pass', msg: 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร (ตอนนี้ ' + pass.length + ' ตัว)' });
    if (!showErrors(form, errs)) return;
    var r = MH.member.login('email', { email: email });
    if (r.error) { showErrors(form, [{ field: 'lg-email', msg: r.error }]); return; }
    MH.ui.toast('เข้าสู่ระบบแล้ว ยินดีต้อนรับคุณ ' + r.member.display_name);
    setTimeout(goAfter, 500);
  });
})();
