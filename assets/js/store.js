/* MAHASART prototype — ชั้นข้อมูล (แทนฐานข้อมูลจริง)
   อ่านข้อมูลตั้งต้นจาก window.MAHASART_DATA (data/*.js) แล้วเก็บการแก้ไขทับไว้ใน localStorage
   ทุกหน้าโหลดไฟล์นี้หลัง data/*.js และก่อน astro.js / shell.js
   API หลัก: MH.store · MH.auth · MH.q · MH.util · MH.labels */
(function () {
  'use strict';
  var MH = window.MH = window.MH || {};
  var BASE = window.MAHASART_DATA || {};
  var KEY = 'mahasart-proto-v1';

  /* ---------- persistence ---------- */
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.tables) return s; } catch (e) {}
    return { tables: {}, session: null };
  }
  var state = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function clone(x) { return x == null ? x : JSON.parse(JSON.stringify(x)); }
  function raw(name) { return state.tables[name] || BASE[name] || []; }
  function writable(name) {
    if (!state.tables[name]) state.tables[name] = clone(BASE[name] || []);
    return state.tables[name];
  }
  function nowISO() { return new Date().toISOString(); }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  /* FNV-1a 32-bit — พอสำหรับสาธิต hash chain ในต้นแบบ */
  function fnv(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }

  function currentUserId() { return state.session ? state.session.user_id : null; }

  /* ไม่ลง audit: ข้อมูลที่สมาชิกพิมพ์เอง (แชต) และตัวนับที่เปลี่ยนบ่อย */
  var NO_AUDIT = ['audit_logs', 'amulet_daily_stats', 'ai_messages', 'ai_usage_daily', 'expert_messages'];
  /* ลง audit แค่ชื่อฟิลด์ ไม่เก็บค่า: ข้อมูลส่วนบุคคลของสมาชิก */
  var REDACT = ['members', 'ai_conversations', 'member_saved_readings', 'orders'];
  function log(action, subjectType, subjectId, changes) {
    if (NO_AUDIT.indexOf(subjectType) >= 0) return;
    if (REDACT.indexOf(subjectType) >= 0 && changes) {
      var red = {}; Object.keys(changes).forEach(function (k) { red[k] = '(ไม่บันทึกค่า)'; }); changes = red;
    }
    var t = writable('audit_logs');
    var prev = t.length ? t[t.length - 1].hash : '0';
    var entry = {
      id: t.reduce(function (m, r) { return Math.max(m, r.id); }, 0) + 1,
      user_id: currentUserId(), action: action, subject_type: subjectType, subject_id: subjectId,
      changes: changes || {}, created_at: nowISO(), prev_hash: prev
    };
    entry.hash = fnv(prev + JSON.stringify(entry));
    t.push(entry);
  }

  MH.store = {
    /** แถวที่ยังไม่ถูกลบ · opts.withTrashed รวมที่ลบแล้ว · opts.onlyTrashed เฉพาะที่ลบแล้ว */
    all: function (name, opts) {
      opts = opts || {};
      return raw(name).filter(function (r) {
        if (opts.onlyTrashed) return !!r.deleted_at;
        return opts.withTrashed || !r.deleted_at;
      }).map(clone);
    },
    find: function (name, id) {
      var r = raw(name).find(function (x) { return String(x.id) === String(id); });
      return clone(r || null);
    },
    where: function (name, fn, opts) { return this.all(name, opts).filter(fn); },
    insert: function (name, row) {
      var t = writable(name), uid = currentUserId(), now = nowISO();
      var rec = Object.assign({ id: t.reduce(function (m, r) { return Math.max(m, r.id || 0); }, 0) + 1 }, row);
      if (!('created_at' in rec)) rec.created_at = now;
      rec.updated_at = now;
      if (!('deleted_at' in rec)) rec.deleted_at = null;
      if (!('created_by' in rec) && uid) rec.created_by = uid;
      if (uid) rec.updated_by = uid;
      t.push(rec);
      log('create', name, rec.id, row);
      save();
      return clone(rec);
    },
    /** action = ชื่อเหตุการณ์ใน audit (update, submit, publish, return, archive ...) */
    update: function (name, id, patch, action) {
      var t = writable(name);
      var r = t.find(function (x) { return String(x.id) === String(id); });
      if (!r) return null;
      var changes = {};
      Object.keys(patch).forEach(function (k) { if (!same(r[k], patch[k])) changes[k] = [r[k], patch[k]]; });
      if (!Object.keys(changes).length) return clone(r);
      Object.assign(r, patch);
      r.updated_at = nowISO();
      if (currentUserId()) r.updated_by = currentUserId();
      log(action || 'update', name, r.id, changes);
      save();
      return clone(r);
    },
    remove: function (name, id) { return this.update(name, id, { deleted_at: nowISO() }, 'delete'); },
    restore: function (name, id) { return this.update(name, id, { deleted_at: null }, 'restore'); },
    purge: function (name, id) {
      var t = writable(name);
      var i = t.findIndex(function (x) { return String(x.id) === String(id); });
      if (i < 0) return false;
      t.splice(i, 1);
      log('purge', name, Number(id), {});
      save();
      return true;
    },
    /** ล้างทุกการแก้ไข กลับไปใช้ข้อมูลตัวอย่าง (ยังล็อกอินอยู่) */
    reset: function () { state = { tables: {}, session: state.session }; save(); },
    isModified: function () { return Object.keys(state.tables).some(function (k) { return k !== 'amulet_daily_stats'; }); },
    /** ตรวจ hash chain ของ audit_logs · คืน id แถวแรกที่ไม่ต่อกัน หรือ null ถ้าครบ */
    verifyAudit: function () {
      var t = raw('audit_logs'), prev = t.length ? t[0].prev_hash : '0';
      for (var i = 0; i < t.length; i++) {
        if (t[i].prev_hash !== prev) return t[i].id;
        prev = t[i].hash;
      }
      return null;
    },
    setting: function (key) {
      var r = raw('settings').find(function (x) { return x.key === key; });
      return r ? clone(r.value) : null;
    },
    setSetting: function (key, value) {
      var r = raw('settings').find(function (x) { return x.key === key; });
      if (r) return this.update('settings', r.id, { value: value });
      return this.insert('settings', { key: key, value: value });
    },
    /** นับสถิติ (views | line_clicks) ของวันนี้ ไม่ลง audit */
    track: function (amuletId, field) {
      var t = writable('amulet_daily_stats'), d = MH.util.todayISO();
      var r = t.find(function (x) { return x.amulet_id === Number(amuletId) && x.stat_date === d; });
      if (!r) { r = { id: t.reduce(function (m, x) { return Math.max(m, x.id); }, 0) + 1, amulet_id: Number(amuletId), stat_date: d, views: 0, line_clicks: 0 }; t.push(r); }
      r[field] = (r[field] || 0) + 1;
      save();
    },
    /** บันทึก audit อย่างเดียว (ไม่มีการแก้ข้อมูล) เช่น เปิดดูข้อมูลส่วนบุคคล */
    _log: function () { log.apply(null, arguments); save(); }
  };

  /* ---------- auth (จำลอง ไม่มีรหัสผ่าน) ---------- */
  var PERMS = {
    admin: ['*'],
    editor: ['dashboard', 'articles.view', 'articles.create', 'articles.edit_any', 'articles.submit', 'articles.review', 'articles.publish', 'articles.archive',
      'horoscopes.view', 'horoscopes.create', 'horoscopes.edit_any', 'horoscopes.publish',
      'categories.manage', 'homepage.manage', 'pages.manage', 'amulets.view', 'trash.view'],
    writer: ['dashboard', 'articles.view', 'articles.create', 'articles.edit_own', 'articles.submit',
      'horoscopes.view', 'horoscopes.create', 'horoscopes.edit_own'],
    catalog: ['dashboard', 'amulets.view', 'amulets.create', 'amulets.edit', 'amulets.publish', 'amulets.archive', 'amulets.delete', 'stats.view', 'trash.view'],
    astrologer: ['dashboard', 'rulesets.view', 'rulesets.edit', 'rulesets.approve', 'articles.view', 'articles.review_astrology',
      'horoscopes.view', 'horoscopes.create', 'horoscopes.edit_own']
  };
  MH.auth = {
    user: function () { var id = currentUserId(); if (!id) return null; var u = MH.store.find('users', id); return u && u.is_active && !u.deleted_at ? u : null; },
    login: function (userId) {
      state.session = { user_id: Number(userId), at: nowISO() };
      var t = writable('users'), u = t.find(function (x) { return x.id === Number(userId); });
      if (u) u.last_login_at = nowISO();
      log('login', 'users', Number(userId), {});
      save();
    },
    logout: function () { if (state.session) log('logout', 'users', state.session.user_id, {}); state.session = null; save(); },
    /** can('articles.publish') · can('articles.edit', article) ตรวจ own/any ให้ */
    can: function (perm, record) {
      var u = this.user(); if (!u) return false;
      var list = PERMS[u.role] || [];
      if (list.indexOf('*') >= 0) return true;
      if (list.indexOf(perm) >= 0) return true;
      var m = /^(articles|horoscopes)\.edit$/.exec(perm);
      if (m) {
        if (list.indexOf(m[1] + '.edit_any') >= 0) return true;
        if (list.indexOf(m[1] + '.edit_own') >= 0 && record && record.author_id === u.id) return true;
      }
      return false;
    },
    perms: PERMS
  };

  /* ---------- labels ---------- */
  MH.labels = {
    role: { admin: 'ผู้ดูแลระบบ', editor: 'บรรณาธิการ', writer: 'ผู้เขียน', catalog: 'ผู้ดูแลแค็ตตาล็อก', astrologer: 'โหรที่ปรึกษา' },
    articleStatus: { draft: 'ฉบับร่าง', in_review: 'รอตรวจ', scheduled: 'ตั้งเวลาแล้ว', published: 'เผยแพร่แล้ว', archived: 'เก็บแล้ว' },
    provenance: {
      certified: { label: 'มีใบรับรอง', cls: 'tag--cert' },
      new_edition: { label: 'พระรุ่นใหม่', cls: 'tag--new' },
      replica: { label: 'รุ่นจำลองเพื่อบูชา', cls: 'tag--replica' },
      natural_stone: { label: 'หินธรรมชาติ', cls: 'tag--stone' },
      worship_statue: { label: 'องค์บูชา', cls: '' }
    },
    stock: { available: 'พร้อมให้สอบถาม', reserved: 'มีผู้จองแล้ว', sold: 'ส่งมอบแล้ว', not_for_sale: 'ไม่เปิดให้บูชา' },
    periodType: { day: 'รายวัน', week: 'รายสัปดาห์' },
    action: { create: 'สร้าง', update: 'แก้ไข', delete: 'ย้ายไปถังขยะ', restore: 'กู้คืน', purge: 'ลบถาวร', submit: 'ส่งตรวจ', publish: 'เผยแพร่',
      schedule: 'ตั้งเวลาเผยแพร่', return: 'ตีกลับ', archive: 'เก็บ', approve: 'อนุมัติ', unschedule: 'ยกเลิกตั้งเวลา', unarchive: 'นำกลับเป็นฉบับร่าง', login: 'เข้าสู่ระบบ', logout: 'ออกจากระบบ', reset: 'คืนค่าข้อมูลตัวอย่าง' },
    table: { articles: 'บทความ', amulets: 'วัตถุมงคล', categories: 'หมวดหมู่', daily_horoscopes: 'ดวง 12 ราศี', pages: 'หน้าคงที่', settings: 'ค่าตั้ง',
      users: 'ผู้ใช้ทีมงาน', rulesets: 'ตำรา', day_colors: 'สีประจำวัน', rasi_ranges: 'ช่วงราศี', numerology_letter_values: 'ค่าตัวอักษร',
      numerology_meanings: 'ความหมายเลข', media: 'รูปภาพ', article_sources: 'แหล่งอ้างอิง' }
  };

  /* ---------- utilities ---------- */
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  MH.util = {
    /** escape ทุกข้อความก่อนใส่ innerHTML */
    h: function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); },
    param: function (name) { return new URLSearchParams(location.search).get(name); },
    todayISO: function () { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); },
    /** 24 ต.ค. 2569 */
    dateShort: function (iso) { if (!iso) return ''; return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }); },
    /** วันจันทร์ที่ 26 ตุลาคม พ.ศ. 2569 */
    dateLong: function (iso, withWeekday) {
      if (!iso) return '';
      var o = { day: 'numeric', month: 'long', year: 'numeric' }; if (withWeekday) o.weekday = 'long';
      return new Date(iso).toLocaleDateString('th-TH', o);
    },
    dateTime: function (iso) { if (!iso) return ''; return new Date(iso).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); },
    /** ข้อความเนื้อหา → HTML ปลอดภัย: บรรทัดว่างคั่นย่อหน้า · "## " หัวข้อ · "- " รายการ */
    renderBody: function (text) {
      var h = MH.util.h;
      return String(text || '').split(/\n{2,}/).map(function (block) {
        block = block.trim(); if (!block) return '';
        if (block.indexOf('## ') === 0) return '<h2>' + h(block.slice(3)) + '</h2>';
        var lines = block.split('\n');
        if (lines.every(function (l) { return l.indexOf('- ') === 0; })) {
          return '<ul>' + lines.map(function (l) { return '<li>' + h(l.slice(2)) + '</li>'; }).join('') + '</ul>';
        }
        return '<p>' + lines.map(h).join('<br>') + '</p>';
      }).join('');
    },
    /** คำต้องห้ามที่พบในข้อความ (จาก settings.banned_words) · ไม่นับเมื่อมี "ไม่" นำหน้า เช่น "ไม่รับประกันผล" */
    bannedIn: function (text) {
      var words = MH.store.setting('banned_words') || [], t = String(text || '');
      return words.filter(function (w) {
        if (!w) return false;
        for (var i = t.indexOf(w); i >= 0; i = t.indexOf(w, i + 1)) {
          if (t.slice(Math.max(0, i - 3), i) !== 'ไม่') return true;
        }
        return false;
      });
    },
    slugify: function (s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  };

  /* ---------- public queries (เฉพาะของที่เผยแพร่) ---------- */
  function isLive(r) {
    if (!r || r.deleted_at) return false;
    if (r.status === 'published') return true;
    return r.status === 'scheduled' && r.published_at && new Date(r.published_at) <= new Date();
  }
  function byPublishedDesc(a, b) { return String(b.published_at).localeCompare(String(a.published_at)); }
  function includesQ(fields, q) { return fields.some(function (f) { return String(f || '').toLowerCase().indexOf(q) >= 0; }); }

  MH.q = {
    isLive: isLive,
    category: function (id) { return MH.store.find('categories', id); },
    categoryBySlug: function (type, slug) { return MH.store.all('categories').find(function (c) { return c.type === type && c.slug === slug; }) || null; },
    categories: function (type) { return MH.store.all('categories').filter(function (c) { return c.type === type && c.is_active; }).sort(function (a, b) { return a.sort_order - b.sort_order; }); },
    /** opts: { categoryId, featured, limit } */
    articles: function (opts) {
      opts = opts || {};
      var list = MH.store.all('articles').filter(isLive).filter(function (a) {
        return (!opts.categoryId || a.category_id === Number(opts.categoryId)) && (!opts.featured || a.is_featured);
      }).sort(byPublishedDesc);
      return opts.limit ? list.slice(0, opts.limit) : list;
    },
    article: function (slug) { var a = MH.store.all('articles').find(function (x) { return x.slug === slug; }); return a || null; },
    sources: function (articleId) { return MH.store.all('article_sources').filter(function (s) { return s.article_id === Number(articleId); }).sort(function (a, b) { return a.sort_order - b.sort_order; }); },
    author: function (id) { return id ? MH.store.find('users', id) : null; },
    /** opts: { categoryId, provenance, q } */
    amulets: function (opts) {
      opts = opts || {};
      var q = (opts.q || '').trim().toLowerCase();
      return MH.store.all('amulets').filter(isLive).filter(function (m) {
        return (!opts.categoryId || m.category_id === Number(opts.categoryId)) &&
          (!opts.provenance || m.provenance_type === opts.provenance) &&
          (!q || includesQ([m.name, m.code, m.belief_text, m.temple_name, m.description], q));
      }).sort(function (a, b) {
        var fa = a.featured_order || 999, fb = b.featured_order || 999;
        return fa - fb || byPublishedDesc(a, b);
      });
    },
    amulet: function (code) { return MH.store.all('amulets').find(function (m) { return m.code === code; }) || null; },
    featuredAmulets: function () {
      var ids = MH.store.setting('featured_amulets') || [];
      return ids.map(function (id) { return MH.store.find('amulets', id); }).filter(isLive);
    },
    media: function (ownerType, ownerId, collection) {
      return MH.store.all('media').filter(function (m) {
        return m.owner_type === ownerType && m.owner_id === Number(ownerId) && (!collection || m.collection === collection);
      }).sort(function (a, b) { return a.sort_order - b.sort_order; });
    },
    /** ดวง 12 ราศีที่เผยแพร่ของช่วงที่ใกล้วันนี้ที่สุด (ไม่เกินวันนี้) */
    currentHoroscopes: function () {
      var today = MH.util.todayISO();
      var live = MH.store.all('daily_horoscopes').filter(function (h) { return isLive(h) && h.period_start <= today; });
      if (!live.length) return { period_start: null, period_type: null, items: [] };
      var latest = live.map(function (h) { return h.period_start; }).sort().pop();
      var items = live.filter(function (h) { return h.period_start === latest; });
      return { period_start: latest, period_type: items[0].period_type, items: items };
    },
    page: function (slug) { return MH.store.all('pages').find(function (p) { return p.slug === slug; }) || null; },
    search: function (q) {
      q = String(q || '').trim().toLowerCase();
      if (!q) return { articles: [], amulets: [] };
      return {
        articles: MH.q.articles().filter(function (a) { return includesQ([a.title, a.excerpt, a.body], q); }),
        amulets: MH.q.amulets({ q: q })
      };
    }
  };
  /* ---------- ตัวนับการเข้าชม ----------
     ฐาน = site_visit_daily (ข้อมูลตัวอย่างถึงเมื่อวาน) + การเปิดหน้าเว็บจริงในเบราว์เซอร์นี้ (เก็บแยกใน localStorage)
     ระบบจริง: นับฝั่งเซิร์ฟเวอร์แบบไม่ใช้คุกกี้ · ผู้เข้าชมไม่ซ้ำ = hash(IP + User-Agent + เกลือรายวัน) · ออนไลน์ = ผู้ที่เปิดหน้าใน 5 นาทีล่าสุด */
  var VKEY = 'mahasart-visits-local';
  function vload() { try { return JSON.parse(localStorage.getItem(VKEY)) || {}; } catch (e) { return {}; } }
  function vsave(v) { try { localStorage.setItem(VKEY, JSON.stringify(v)); } catch (e) {} }
  function vnoise(s) { var x = 2166136261; for (var i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619) >>> 0; } return (x % 1000) / 1000; }
  /* สัดส่วนผู้เข้าชมตามชั่วโมง (คนไทยดูดวงช่วงเช้าและค่ำมาก) */
  var HOUR_W = [2, 1, 1, 1, 1, 2, 4, 7, 8, 7, 6, 6, 7, 6, 5, 5, 6, 7, 8, 9, 10, 9, 7, 4];
  var HOUR_SUM = HOUR_W.reduce(function (a, b) { return a + b; }, 0);

  MH.visits = {
    /** เรียกทุกครั้งที่เปิดหน้าเว็บฝั่งผู้ใช้ */
    track: function () {
      try { var c = JSON.parse(localStorage.getItem('mh_consent')); if (c && c.analytics === false) return; } catch (e) {}
      var v = vload(), d = MH.util.todayISO();
      if (!v.days) v.days = {};
      var row = v.days[d] || (v.days[d] = { visitors: 0, page_views: 0 });
      row.page_views++;
      if (v.lastDay !== d) { row.visitors++; v.lastDay = d; }
      v.lastSeen = Date.now();
      vsave(v);
    },
    /** { online, today, week, month, total } แต่ละตัว = { visitors, page_views } · total.since = วันแรกที่มีข้อมูล */
    stats: function (now) {
      now = now || new Date();
      var today = MH.util.todayISO();
      var base = (window.MAHASART_DATA.site_visit_daily || []).filter(function (r) { return r.stat_date < today; });
      var local = vload().days || {};
      var byDate = {};
      base.forEach(function (r) { byDate[r.stat_date] = { visitors: r.visitors, page_views: r.page_views }; });
      /* วันนี้: จำลองยอดสะสมถึงเวลาปัจจุบัน จากค่าเฉลี่ย 7 วันก่อน */
      var last7 = base.slice(-7), avgV = last7.length ? last7.reduce(function (s, r) { return s + r.visitors; }, 0) / last7.length : 0;
      var ratio = last7.length ? last7.reduce(function (s, r) { return s + r.page_views / r.visitors; }, 0) / last7.length : 2.5;
      var h = now.getHours(), m = now.getMinutes(), done = 0;
      for (var i = 0; i < h; i++) done += HOUR_W[i];
      done += HOUR_W[h] * m / 60;
      var tv = Math.round(avgV * done / HOUR_SUM * (0.9 + vnoise(today) * 0.2));
      byDate[today] = { visitors: tv, page_views: Math.round(tv * ratio) };
      Object.keys(local).forEach(function (d) {
        var b = byDate[d] || (byDate[d] = { visitors: 0, page_views: 0 });
        b.visitors += local[d].visitors; b.page_views += local[d].page_views;
      });

      function sum(from) {
        return Object.keys(byDate).filter(function (d) { return d >= from && d <= today; }).reduce(function (s, d) {
          s.visitors += byDate[d].visitors; s.page_views += byDate[d].page_views; return s;
        }, { visitors: 0, page_views: 0 });
      }
      function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
      var monday = new Date(now.getTime()); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      var first = new Date(now.getFullYear(), now.getMonth(), 1);
      var dates = Object.keys(byDate).sort();

      /* ออนไลน์: ผู้เข้าชมต่อชั่วโมงตอนนี้ × เวลาอยู่หน้าเว็บเฉลี่ย 6 นาที + เบราว์เซอร์นี้ถ้าเปิดหน้าเว็บใน 5 นาทีล่าสุด */
      var perHour = avgV * HOUR_W[h] / HOUR_SUM;
      var slot = today + '-' + h + '-' + Math.floor(m / 5);
      var online = Math.max(1, Math.round(perHour * 6 / 60 * (0.7 + vnoise(slot) * 0.6)));
      var lastSeen = vload().lastSeen || 0;
      if (Date.now() - lastSeen < 5 * 60 * 1000) online += 1;

      var total = sum(dates[0] || today); total.since = dates[0] || today;
      return { online: online, today: sum(today), week: sum(iso(monday)), month: sum(iso(first)), total: total, weekStart: iso(monday), monthStart: iso(first) };
    }
  };
})();
