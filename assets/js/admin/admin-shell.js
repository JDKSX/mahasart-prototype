/* MAHASART หลังบ้าน (ต้นแบบ) — โครงหน้า สิทธิ์ และตัวช่วยฟอร์ม
   หน้าแต่ละหน้าต้องมี:
     <body data-admin-page="<key>" data-perm="<permission>" data-base="../">
       <div id="mh-admin"></div>
       <main id="main" class="adm-main"> …เนื้อหาหน้า… </main>
   โหลดลำดับ: ../data/*.js → ../assets/js/store.js → ../assets/js/astro.js → ../assets/js/shell.js → admin-shell.js → <page>.js
   หน้า script ต้องเริ่มด้วย: if (!MH.admin.allowed) return;
   API: MH.admin.user · allowed · can(perm, rec) · pill(status) · userName(id) · showErrors(form, errors) · clearErrors(form) · dirtyGuard(form) · counter(input, max) */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h, body = document.body;
  var pageKey = body.getAttribute('data-admin-page');
  var perm = body.getAttribute('data-perm');

  MH.admin = { user: null, allowed: false };

  /* ---------- ต้องล็อกอิน ---------- */
  var user = MH.auth.user();
  if (pageKey !== 'login' && !user) {
    location.replace('login.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.search));
    return;
  }
  MH.admin.user = user;

  /* group = หัวข้อในเมนูซ้าย · perm เป็นอาร์เรย์ได้ (มีสิทธิ์ข้อใดข้อหนึ่งก็เห็น) */
  var MENU = [
    { group: 'ภาพรวม', key: 'dashboard', href: 'index.html', icon: 'i-home', label: 'แดชบอร์ด', perm: 'dashboard' },
    { group: 'เนื้อหา', key: 'articles', href: 'articles.html', icon: 'i-book', label: 'บทความ', perm: 'articles.view', count: function () { return MH.store.all('articles').filter(function (a) { return a.status === 'in_review'; }).length; } },
    { group: 'เนื้อหา', key: 'horoscopes', href: 'horoscopes.html', icon: 'i-dial', label: 'ดวง 12 ราศี', perm: 'horoscopes.view' },
    { group: 'เนื้อหา', key: 'categories', href: 'categories.html', icon: 'i-menu', label: 'หมวดหมู่', perm: 'categories.manage' },
    { group: 'เนื้อหา', key: 'homepage', href: 'homepage.html', icon: 'i-star', label: 'หน้าแรก', perm: 'homepage.manage' },
    { group: 'เนื้อหา', key: 'pages', href: 'pages.html', icon: 'i-news', label: 'หน้าคงที่', perm: 'pages.manage' },
    { group: 'เนื้อหา', key: 'rulesets', href: 'rulesets.html', icon: 'i-calc', label: 'ตำราและค่าคำนวณ', perm: 'rulesets.view' },
    { group: 'ร้านค้า', key: 'amulets', href: 'amulets.html', icon: 'i-amulet', label: 'วัตถุมงคล', perm: 'amulets.view' },
    { group: 'ร้านค้า', key: 'orders', href: 'orders.html', icon: 'i-cart', label: 'คำสั่งซื้อ', perm: 'orders.view', count: function () { return (MH.store.all('orders') || []).filter(function (o) { return o.status === 'paid'; }).length; } },
    { group: 'ร้านค้า', key: 'shop-settings', href: 'shop-settings.html', icon: 'i-shield', label: 'ตั้งค่าร้านค้า', perm: 'shop.settings' },
    { group: 'บริการ', key: 'members', href: 'members.html', icon: 'i-user', label: 'สมาชิก', perm: 'members.view' },
    { group: 'บริการ', key: 'ai', href: 'ai.html', icon: 'i-ai', label: 'Mahasart AI', perm: 'ai.view' },
    { group: 'บริการ', key: 'experts', href: 'experts.html', icon: 'i-expert', label: 'ผู้เชี่ยวชาญ', perm: 'experts.view', count: function () { return (MH.store.all('experts') || []).filter(function (e) { return e.status === 'pending'; }).length; } },
    { group: 'บริการ', key: 'my-expert', href: 'my-expert.html', icon: 'i-expert', label: 'โปรไฟล์ผู้เชี่ยวชาญของฉัน', perm: 'expert.self', role: 'expert' },
    { group: 'บริการ', key: 'schedule', href: 'schedule.html', icon: 'i-calendar', label: 'ตารางเวลาของฉัน', perm: 'schedule.manage_own', role: 'expert' },
    { group: 'บริการ', key: 'bookings', href: 'bookings.html', icon: 'i-calendar', label: 'การนัดหมาย', perm: ['bookings.view', 'bookings.view_own'] },
    { group: 'บริการ', key: 'courses', href: 'courses.html', icon: 'i-play', label: 'คอร์สเรียน', perm: 'courses.view' },
    { group: 'บริการ', key: 'plans', href: 'plans.html', icon: 'i-star', label: 'แพ็กเกจสมาชิก', perm: 'plans.manage' },
    { group: 'บริการ', key: 'revenue', href: 'revenue.html', icon: 'i-calc', label: 'รายได้', perm: 'revenue.view' },
    { group: 'ระบบ', key: 'users', href: 'users.html', icon: 'i-user', label: 'ผู้ใช้ทีมงาน', perm: 'users.manage' },
    { group: 'ระบบ', key: 'settings', href: 'settings.html', icon: 'i-shield', label: 'ตั้งค่า', perm: 'settings.manage' },
    { group: 'ระบบ', key: 'audit', href: 'audit.html', icon: 'i-scroll', label: 'บันทึกการใช้งาน', perm: 'audit.view' },
    { group: 'ระบบ', key: 'trash', href: 'trash.html', icon: 'i-close', label: 'ถังขยะ', perm: 'trash.view' }
  ];
  MH.admin.MENU = MENU;
  /** p = สิทธิ์เดียว หรืออาร์เรย์ (ข้อใดข้อหนึ่ง) */
  MH.admin.can = function (p, rec) { return [].concat(p).some(function (x) { return MH.auth.can(x, rec); }); };

  /* ---------- layout ---------- */
  var host = document.getElementById('mh-admin');
  var main = document.getElementById('main');
  if (host && main && user) {
    var wrap = document.createElement('div'); wrap.className = 'adm';
    wrap.innerHTML =
      '<aside class="adm-rail" id="adm-rail" aria-label="เมนูหลังบ้าน">' +
        '<a class="brand" href="index.html"><svg aria-hidden="true"><use href="#logo"/></svg><span><b>MAHASART</b><small>หลังบ้าน · ต้นแบบ</small></span></a>' +
        '<nav>' + (function () {
          var out = '', lastGroup = '';
          MENU.filter(function (m) { return MH.admin.can(m.perm) && (!m.role || m.role === user.role); }).forEach(function (m) {
            if (m.group !== lastGroup) { out += (lastGroup ? '</ul>' : '') + '<p class="rail-group">' + h(m.group) + '</p><ul>'; lastGroup = m.group; }
            var c = m.count ? m.count() : 0;
            out += '<li><a href="' + m.href + '"' + (m.key === pageKey ? ' aria-current="page"' : '') + '>' + MH.ui.icon(m.icon) + h(m.label) +
              (c ? '<span class="count" aria-label="รอดำเนินการ ' + c + ' รายการ">' + c + '</span>' : '') + '</a></li>';
          });
          return out + (lastGroup ? '</ul>' : '');
        })() + '</nav>' +
        '<div class="rail-foot">' +
          '<a href="../index.html" target="_blank" rel="noopener">ดูหน้าเว็บ ↗</a>' +
          '<button type="button" id="adm-reset">คืนค่าข้อมูลตัวอย่าง</button>' +
          '<button type="button" id="adm-logout">เปลี่ยนบทบาท / ออกจากระบบ</button>' +
        '</div>' +
      '</aside>' +
      '<div class="adm-body">' +
        '<header class="adm-top">' +
          '<button class="icon-btn adm-menu-btn" id="adm-menu" type="button" aria-label="เปิดเมนู" aria-expanded="false" aria-controls="adm-rail">' + MH.ui.icon('i-menu') + '</button>' +
          '<span class="proto">ต้นแบบ · ข้อมูลเก็บในเบราว์เซอร์นี้เท่านั้น</span>' +
          '<span class="spacer"></span>' +
          '<button class="icon-btn" id="theme-btn" type="button" aria-label="เปลี่ยนธีม">' + MH.ui.icon('i-moon') + '</button>' +
          '<span class="who"><b>' + h(user.name) + '</b><span>' + h(MH.labels.role[user.role]) + '</span></span>' +
        '</header>' +
      '</div>';
    host.replaceWith(wrap);
    wrap.querySelector('.adm-body').appendChild(main);

    var adm = wrap;
    var menuBtn = document.getElementById('adm-menu');
    menuBtn.addEventListener('click', function () {
      var open = adm.classList.toggle('menu-open');
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', function (e) {
      if (adm.classList.contains('menu-open') && !e.target.closest('#adm-rail') && !e.target.closest('#adm-menu')) {
        adm.classList.remove('menu-open'); menuBtn.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') adm.classList.remove('menu-open'); });

    document.getElementById('adm-logout').addEventListener('click', function () { MH.auth.logout(); location.href = 'login.html'; });
    document.getElementById('adm-reset').addEventListener('click', function () {
      MH.ui.confirm({ title: 'คืนค่าข้อมูลตัวอย่าง', body: 'ทุกการแก้ไขในต้นแบบนี้ (บทความ วัตถุมงคล ค่าตั้ง บันทึกการใช้งาน) จะหายและกลับไปเป็นข้อมูลตัวอย่างเดิม', okLabel: 'คืนค่า', danger: true })
        .then(function (ok) { if (!ok) return; MH.store.reset(); MH.ui.toast('คืนค่าข้อมูลตัวอย่างแล้ว'); setTimeout(function () { location.reload(); }, 600); });
    });

    /* theme toggle (ใช้ key เดียวกับฝั่งผู้ใช้) */
    var root = document.documentElement, themeBtn = document.getElementById('theme-btn');
    var eff = function () { var t = root.getAttribute('data-theme'); return t || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); };
    var sync = function () { var d = eff() === 'dark'; themeBtn.querySelector('use').setAttribute('href', d ? '#i-sun' : '#i-moon'); themeBtn.setAttribute('aria-label', d ? 'เปลี่ยนเป็นธีมสว่าง' : 'เปลี่ยนเป็นธีมมืด'); };
    themeBtn.addEventListener('click', function () { var n = eff() === 'dark' ? 'light' : 'dark'; root.setAttribute('data-theme', n); try { localStorage.setItem('mahasart-theme', n); } catch (e) {} sync(); });
    sync();
  }

  /* ---------- สิทธิ์ของหน้า ---------- */
  /* data-perm คั่นหลายสิทธิ์ด้วย | ได้ (มีข้อใดข้อหนึ่งก็เข้าได้) */
  MH.admin.allowed = pageKey === 'login' || !perm || MH.admin.can(perm.split('|'));
  if (!MH.admin.allowed && main) {
    main.innerHTML = '<div class="forbidden card"><h1>บทบาทนี้เปิดหน้านี้ไม่ได้</h1>' +
      '<p class="muted">' + h(MH.labels.role[user.role]) + ' ไม่มีสิทธิ์ "' + h(perm) + '" ถ้าต้องใช้หน้านี้ ให้ผู้ดูแลระบบเปลี่ยนบทบาทให้</p>' +
      '<div class="btn-row" data-center><a class="btn btn--primary" href="index.html">กลับแดชบอร์ด</a></div></div>';
  }

  /* ---------- ตัวช่วย ---------- */
  MH.admin.pill = function (status) {
    var label = MH.labels.articleStatus[status] || status || '-';
    return '<span class="pill pill--' + h(status) + '">' + h(label) + '</span>';
  };
  MH.admin.userName = function (id) { var u = id ? MH.store.find('users', id) : null; return u ? u.name : '-'; };

  /** errors: [{ field: 'input-id', msg: 'ข้อความ' }] · แสดงสรุปบนสุดของฟอร์ม + ข้อความใต้ช่อง */
  MH.admin.showErrors = function (form, errors) {
    MH.admin.clearErrors(form);
    if (!errors.length) return true;
    var box = document.createElement('div');
    box.className = 'err-summary'; box.setAttribute('role', 'alert'); box.tabIndex = -1;
    box.innerHTML = '<h2>ยังบันทึกไม่ได้ แก้ ' + errors.length + ' จุดนี้ก่อน</h2><ul>' +
      errors.map(function (e) { return '<li><a href="#' + h(e.field) + '">' + h(e.msg) + '</a></li>'; }).join('') + '</ul>';
    form.prepend(box);
    var seen = {};
    errors.forEach(function (e) {
      var el = document.getElementById(e.field); if (!el || seen[e.field]) return;
      seen[e.field] = true;
      el.setAttribute('aria-invalid', 'true');
      var msg = document.createElement('p'); msg.className = 'err'; msg.id = e.field + '-err'; msg.textContent = e.msg;
      el.setAttribute('aria-describedby', msg.id);
      (el.closest('.field') || el.parentNode).appendChild(msg);
    });
    box.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function (ev) { ev.preventDefault(); var t = document.getElementById(a.getAttribute('href').slice(1)); if (t) t.focus(); });
    });
    box.focus();
    return false;
  };
  MH.admin.clearErrors = function (form) {
    form.querySelectorAll('.err-summary, .field .err').forEach(function (n) { n.remove(); });
    form.querySelectorAll('[aria-invalid]').forEach(function (n) { n.removeAttribute('aria-invalid'); n.removeAttribute('aria-describedby'); });
  };

  /** เตือนก่อนออกจากหน้าเมื่อยังไม่บันทึก · คืน { clean() } เรียกหลังบันทึกสำเร็จ */
  MH.admin.dirtyGuard = function (form) {
    var dirty = false;
    form.addEventListener('input', function () { dirty = true; });
    form.addEventListener('change', function () { dirty = true; });
    window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
    return { clean: function () { dirty = false; }, isDirty: function () { return dirty; } };
  };

  /** ตัวนับตัวอักษรใต้ช่อง */
  MH.admin.counter = function (input, max) {
    var c = document.createElement('p'); c.className = 'counter'; c.setAttribute('aria-live', 'polite');
    input.after(c);
    var upd = function () { var n = input.value.length; c.textContent = n + ' / ' + max; c.classList.toggle('over', n > max); };
    input.addEventListener('input', upd); upd();
  };
})();
