/* MAHASART prototype — Mahasart AI ตัวตอบจำลอง (เฟส 2)
   ไม่เรียกโมเดลจริง ไม่เรียก API ไม่แตะ DOM · ให้ผลเดิมทุกครั้งเมื่อคำถามและข้อมูลเท่ากัน
   ระบบจริงจะเปลี่ยนเฉพาะ "ตัวตอบ" เป็นโมเดลภาษา: หน้าจอ ขั้นตอน โควตา และ guardrail ต้องเหมือนเดิม
   โหลดหลัง store.js · commerce.js · astro.js (ต้องมี MH.store · MH.q · MH.astro)

   API
   MH.ai.answer({ text, mode: 'ask'|'explain', explain, history }) → { content, guard, sources: [articleId], followups: [ข้อความ] }
       guard = null | 'crisis' | 'purchase' | 'health' | 'finance' | 'legal'
       explain = { type: 'taksa', day } | { type: 'rasi', month, day } | { type: 'numerology', total }  (ได้จาก parseExplain)
       history = [{ role, content, guard, sources }] ใช้กับคำสั่งต่อเนื่อง เช่น "อธิบายเพิ่ม"
   MH.ai.detect(text) → { guard, cautions: [], lottery }   ตรวจ guardrail อย่างเดียว
   MH.ai.parseExplain(queryString) → null | { type, ... } | { type, error }
   MH.ai.explainTitle(e) · MH.ai.explainQuestion(e) · MH.ai.suggestions()
   MH.ai.GUARDS · MH.ai.MAX_LEN · MH.ai.FINE_PRINT

   ลำดับ guardrail (ตรวจก่อนตอบทุกครั้ง): crisis → purchase → health/finance/legal (ตอบเฉพาะมุมความเชื่อ) → ตอบปกติ
   เนื้อหาในคำตอบมาจาก 3 แหล่งเท่านั้น: (1) MH.astro คำนวณจริง (2) บทความที่ live ในคลังความรู้ (3) ข้อความ guardrail ที่เจ้าของงานกำหนด */
(function () {
  'use strict';
  var MH = window.MH = window.MH || {};
  var MAX_LEN = 500;
  var FINE_PRINT = 'คำตอบจาก AI เป็นไปตามความเชื่อ อาจผิดพลาด ไม่ใช่คำแนะนำทางการแพทย์ การเงิน หรือกฎหมาย';

  /* ---------- ข้อความตัวอักษร ---------- */
  /* ภาษาไทยไม่มีช่องว่างระหว่างคำ → เทียบข้อความโดยตัดช่องว่างทิ้ง แล้วใช้ substring */
  function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/[\s​-‍⁠﻿]+/g, ''); }
  function arr(v) { return Array.isArray(v) ? v.filter(function (x) { return typeof x === 'string' && x.trim(); }) : []; }
  function found(nt, words) {
    return arr(words).map(norm).filter(function (w) { return w && nt.indexOf(w) >= 0; });
  }
  function has(nt, words) { return found(nt, words).length > 0; }
  function countOcc(str, sub) {
    var n = 0, i = str.indexOf(sub);
    while (sub && i >= 0) { n++; i = str.indexOf(sub, i + sub.length); }
    return n;
  }
  function uniq(list) { return list.filter(function (v, i, a) { return a.indexOf(v) === i; }); }
  function setting(key) { return MH.store.setting(key); }

  /* ---------- guardrail: คำ ---------- */
  var DEFAULT_CRISIS = ['ฆ่าตัวตาย', 'อยากตาย', 'ไม่อยากมีชีวิต', 'ทำร้ายตัวเอง', 'จบชีวิต'];
  /* คำวิกฤตเพิ่มเติมที่ระบบมีให้เสมอ (นอกเหนือจากที่ตั้งในหลังบ้าน) — ปลอดภัยไว้ก่อน */
  var CRISIS_EXTRA = ['คิดสั้น', 'ฆ่าตัวเอง', 'ไม่อยากอยู่แล้ว', 'ไม่อยากอยู่ต่อ', 'อยากหายไปจากโลก'];
  var DEFAULT_CAUTION = {
    health: ['ป่วย', 'โรค', 'ยา', 'รักษา', 'มะเร็ง', 'ผ่าตัด'],
    finance: ['หวย', 'ลงทุน', 'หุ้น', 'คริปโต', 'กู้', 'หนี้'],
    legal: ['ฟ้อง', 'คดี', 'ทนาย', 'ศาล']
  };
  /* เลขเด็ด/สลาก — ไม่อยู่ในรายการของหลังบ้าน แต่ต้องกันเสมอ */
  var LOTTERY = ['หวย', 'เลขเด็ด', 'เลขเด่น', 'เลขดัง', 'งวดนี้', 'งวดหน้า', 'งวดที่แล้ว', 'สลาก', 'ลอตเตอรี', 'เลขท้าย', 'เลขสองตัว', 'เลขสามตัว', '2ตัว', '3ตัว', 'เลขวิ่ง', 'ถูกรางวัล', 'ใบ้หวย', 'เลขมงคลงวด', 'ตัวเลขรางวัล'];
  var BUILTIN_CAUTION = {
    health: ['อาการ', 'พบแพทย์', 'โรงพยาบาล', 'เบาหวาน', 'ความดัน', 'ซึมเศร้า', 'ตั้งครรภ์', 'โควิด'],
    finance: LOTTERY.concat(['ราคาหุ้น', 'ราคาทอง', 'ทองคำ', 'บิตคอยน์', 'เทรด', 'ดอกเบี้ย', 'พนัน', 'แทงบอล', 'ซื้อขายหุ้น', 'ปั่นหุ้น', 'ทำนายราคา', 'เงินกู้', 'สินเชื่อ']),
    legal: ['กฎหมาย', 'ฟ้องร้อง', 'ถูกจับ', 'ติดคุก', 'โทษจำคุก', 'พินัยกรรม']
  };
  var CAUTION_ORDER = ['health', 'finance', 'legal'];
  /* คำที่มี "ยา" "ศาล" "รักษา" อยู่ข้างในแต่ไม่ได้หมายถึงเรื่องสุขภาพ/กฎหมาย (เช่น อยาก พยากรณ์ ศาลเจ้า) ตัดออกก่อนตรวจหมวดเตือน */
  var NOISE = ['อยาก', 'ยาก', 'พยากรณ์', 'พยายาม', 'ยาม', 'ยาว', 'ยาย', 'ยาน', 'นิยาม', 'ภรรยา', 'วิทยา', 'อยุธยา', 'พระยา', 'จริยา', 'มารยา',
    'ศาลเจ้า', 'ศาลพระภูมิ', 'ศาลา', 'ศาลปู่ตา', 'ศาลตายาย', 'วิศาล', 'พิศาล', 'รักษาศีล'];

  /* ---------- guardrail: ขอให้แนะนำ/ซื้อวัตถุมงคล ---------- */
  var PRODUCT = ['วัตถุมงคล', 'พระเครื่อง', 'เครื่องราง', 'ของขลัง', 'ของมงคล', 'เหรียญ', 'ตะกรุด', 'หินมงคล', 'หินนำโชค', 'กำไล', 'องค์บูชา', 'รูปบูชา',
    'ท้าวเวสสุวรรณ', 'พระปิดตา', 'สมเด็จ', 'อเมทิสต์', 'พระ'];
  var INTENT = ['แนะนำ', 'ซื้อ', 'เช่า', 'สั่ง', 'ขาย', 'ราคา', 'ควรบูชา', 'ควรเช่า', 'ควรใส่', 'ควรพก', 'ควรห้อย', 'ควรมี', 'ควรเลือก', 'ช่วยเลือก', 'เลือกให้',
    'อะไรดี', 'องค์ไหน', 'อันไหนดี', 'ตัวไหนดี', 'รุ่นไหนดี', 'ชิ้นไหน', 'เสริมดวง', 'เสริมโชค', 'เสริมเงิน', 'เสริมงาน', 'เสริมบารมี', 'เรียกทรัพย์', 'เรียกโชค', 'แก้กาลกิณี'];
  var GENERIC_PURCHASE = ['ใส่อะไรดี', 'ห้อยอะไรดี', 'พกอะไรดี', 'บูชาอะไรดี', 'เช่าอะไรดี', 'ซื้ออะไรดี', 'ใช้อะไรเสริม', 'ใส่อะไรเสริม', 'ใส่อะไรเรียก', 'ของมงคลอะไร', 'เสริมดวงด้วยอะไร'];
  var NOT_PURCHASE = ['วิธีไหว้', 'วิธีบูชา', 'ไหว้พระ', 'สวดมนต์', 'บทสวด'];

  function stripPlanetsFromPra(nt) { return nt.replace(/พระ(อาทิตย์|จันทร์|อังคาร|พุธ|พฤหัส|ศุกร์|เสาร์|ราหู|เกตุ)/g, '·'); }
  function isPurchase(nt) {
    var t = stripPlanetsFromPra(nt);
    if (has(t, NOT_PURCHASE)) return false;
    if (has(t, GENERIC_PURCHASE)) return true;
    return has(t, PRODUCT) && has(t, INTENT);
  }
  function stripNoise(nt) { NOISE.forEach(function (n) { nt = nt.split(n).join('·'); }); return nt; }

  function crisisWords() {
    var w = arr(setting('ai_crisis_words'));
    return (w.length ? w : DEFAULT_CRISIS).concat(CRISIS_EXTRA);
  }
  function cautionWords(cat) {
    var s = setting('ai_caution_words');
    var base = s && typeof s === 'object' ? arr(s[cat]) : DEFAULT_CAUTION[cat];
    return base.concat(BUILTIN_CAUTION[cat]);
  }

  /** ตรวจ guardrail ทั้งหมด (ไม่สร้างคำตอบ) */
  function detect(text) {
    var nt = norm(text);
    if (has(nt, crisisWords())) return { guard: 'crisis', cautions: [], lottery: false };
    if (isPurchase(nt)) return { guard: 'purchase', cautions: [], lottery: false };
    var clean = stripNoise(nt);
    var cats = CAUTION_ORDER.filter(function (c) { return has(clean, cautionWords(c)); });
    return { guard: cats[0] || null, cautions: cats, lottery: has(clean, LOTTERY) };
  }

  var GUARDS = {
    crisis: { label: 'ห่วงใยคุณ: ขอพักเรื่องดวงก่อน', short: 'ห่วงใย', cls: 'tag--guard-crisis' },
    purchase: { label: 'AI ไม่แนะนำให้ซื้อวัตถุมงคล', short: 'ไม่แนะนำสินค้า', cls: 'tag--guard-purchase' },
    health: { label: 'เรื่องสุขภาพ: ตอบเฉพาะมุมความเชื่อ', short: 'สุขภาพ', cls: 'tag--guard-caution' },
    finance: { label: 'เรื่องการเงิน: ตอบเฉพาะมุมความเชื่อ', short: 'การเงิน', cls: 'tag--guard-caution' },
    legal: { label: 'เรื่องกฎหมาย: ตอบเฉพาะมุมความเชื่อ', short: 'กฎหมาย', cls: 'tag--guard-caution' }
  };

  /* ---------- ข้อมูลจากระบบ ---------- */
  var MONTHS = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  var MONTHS_SHORT = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  function liveBySlug(slug) { var a = MH.q.article(slug); return a && MH.q.isLive(a) ? a : null; }
  function srcIds(slugs) { return slugs.map(liveBySlug).filter(Boolean).map(function (a) { return a.id; }); }
  function planetName(row) { return row.planet === 'rahu' ? 'ราหู' : 'ดาว' + row.day_name; }
  function rulesetNote() {
    var rs = MH.astro.ruleset();
    if (!rs) return 'ยังไม่ได้เลือกตำราที่ใช้คำนวณ';
    return 'ตำราที่ใช้คำนวณ: “' + rs.name + '”' + (rs.approved_at ? '' : ' (ยังรอโหรที่ปรึกษายืนยัน)');
  }
  function validDate(m, d) {
    if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31)) return false;
    var t = new Date(2000, m - 1, d);
    return t.getMonth() === m - 1 && t.getDate() === d;
  }

  /* ---------- โหมดอธิบายผล: คำนวณด้วย MH.astro จริง ---------- */
  function parseExplain(query) {
    var q = String(query || '');
    var p = new URLSearchParams(q.charAt(0) === '?' ? q : '?' + q);
    var type = p.get('explain');
    if (!type) return null;
    if (type === 'taksa') {
      var day = p.get('day');
      return MH.astro.birthday(day) ? { type: 'taksa', day: day } : { type: 'taksa', error: 'ไม่รู้จักวันเกิด “' + (day || '') + '”' };
    }
    if (type === 'rasi') {
      var m = Number(p.get('month')), d = Number(p.get('day'));
      return validDate(m, d) ? { type: 'rasi', month: m, day: d } : { type: 'rasi', error: 'วันที่เกิดไม่ถูกต้อง' };
    }
    if (type === 'numerology') {
      var t = Number(p.get('total'));
      return t >= 1 && t <= 99999 && Math.floor(t) === t ? { type: 'numerology', total: t } : { type: 'numerology', error: 'ผลรวมเลขศาสตร์ไม่ถูกต้อง' };
    }
    return { type: type, error: 'ยังไม่มีการอธิบายผลของเครื่องมือ “' + type + '”' };
  }
  function explainTitle(e) {
    if (!e || e.error) return 'อธิบายผลดูดวง';
    if (e.type === 'taksa') { var b = MH.astro.birthday(e.day); return 'ทักษาของคนเกิดวัน' + (b ? b.label : e.day); }
    if (e.type === 'rasi') return 'ราศีจากวันเกิด ' + e.day + ' ' + MONTHS_SHORT[e.month];
    if (e.type === 'numerology') return 'เลขศาสตร์ ผลรวม ' + e.total;
    return 'อธิบายผลดูดวง';
  }
  function explainQuestion(e) {
    if (!e || e.error) return 'ช่วยอธิบายผลดูดวงให้หน่อย';
    if (e.type === 'taksa') return 'ช่วยอธิบายทักษาของคนเกิดวัน' + MH.astro.birthday(e.day).label + 'ให้หน่อย';
    if (e.type === 'rasi') return 'ช่วยอธิบายราศีของคนเกิดวันที่ ' + e.day + ' ' + MONTHS[e.month] + ' ให้หน่อย';
    return 'ช่วยอธิบายผลรวมเลขศาสตร์ ' + e.total + ' ให้หน่อย';
  }

  function explainTaksa(key) {
    var b = MH.astro.birthday(key);
    var rows = MH.astro.taksa(b.planet);
    var by = {}; rows.forEach(function (r) { by[r.role] = r; });
    var sri = by.sri, kala = by.kalakini, first = rows[0];
    var cycle = MH.astro.CYCLE.map(function (p) { var i = MH.astro.planetInfo(p); return p === 'rahu' ? 'ราหู' : i.day_name; }).join(' → ');
    var lines = [
      'ผลทักษาของคนเกิดวัน' + b.label,
      'คนเกิดวันนี้นับ' + planetName(first) + 'เป็นดาวประจำวันเกิด (ตำแหน่งบริวาร) แล้วนับต่อไปตามวงทักษาจนครบ 8 ตำแหน่ง ระบบคำนวณผลนี้ให้แล้วด้วยสูตรเดียวกับหน้าเครื่องมือทักษา ด้านล่างเป็นการเล่าให้เป็นภาษาคน ไม่ได้คำนวณใหม่',
      '## สิ่งที่คนส่วนใหญ่อยากรู้\n\n' +
        '- ศรี (' + sri.meaning + '): ' + planetName(sri) + ' สี' + sri.color_name + ' ตามความเชื่อเป็นสีที่เสริมโชคลาภ\n' +
        '- กาลกิณี (' + kala.meaning + '): ' + planetName(kala) + ' สี' + kala.color_name + ' ตามความเชื่อเป็นสีที่ควรเลี่ยง',
      '## ครบทั้ง 8 ตำแหน่ง\n\n' + rows.map(function (r) { return '- ' + r.name + ' (' + r.meaning + '): ' + planetName(r) + ' สี' + r.color_name; }).join('\n'),
      'วงทักษาเรียงวนเป็นวงเสมอ: ' + cycle,
      'ทั้งหมดนี้เป็นไปตามความเชื่อ ใช้เป็นแนวทางประกอบ เช่น เลือกสีเสื้อหรือเลือกวันทำสิ่งสำคัญ ไม่ใช่ตัวตัดสินใจหลัก และไม่รับประกันผล · ' + rulesetNote()
    ];
    return { content: lines.join('\n\n'), sources: srcIds(['what-is-taksa']) };
  }

  function explainRasi(month, day) {
    var r = MH.astro.rasiOf(month, day);
    if (!r) return { content: 'หาราศีของวันที่ ' + day + ' ' + MONTHS[month] + ' ไม่พบในตำราที่ใช้อยู่ ลองตรวจวันเกิดอีกครั้ง', sources: [] };
    var rg = r.range;
    function span(x) { return x.start_day + ' ' + MONTHS[x.start_month] + ' – ' + x.end_day + ' ' + MONTHS[x.end_month]; }
    var lines = [
      'วันเกิด ' + day + ' ' + MONTHS[month] + ' ตรงกับราศี' + r.name,
      'ระบบคำนวณจากช่วงวันของตำราที่ใช้อยู่แล้ว (ไม่ดูปีเกิด) ผลคือราศี' + r.name + ' ซึ่งครอบคลุมช่วง ' + span(rg) + ' ของทุกปี',
      r.nearBoundary
        ? '## ระวังรอยต่อ\n\nวันเกิดนี้อยู่ใกล้รอยต่อกับราศี' + r.neighbor.name + ' (ห่างไม่เกิน 1 วัน) วันเปลี่ยนราศีขยับได้ราวหนึ่งวันในแต่ละปี ถ้าเกิดใกล้รอยต่อ ควรให้โหรคำนวณจากปีเกิดจริงอีกครั้ง'
        : 'วันเกิดนี้ไม่ได้อยู่ติดรอยต่อกับราศีข้างเคียง ผลจึงค่อนข้างนิ่ง'
    ];
    var art = liveBySlug('thai-vs-western-rasi');
    if (art) lines.push('## ทำไมไม่ตรงกับเว็บต่างประเทศ\n\nโหราศาสตร์ไทยนับราศีตามตำแหน่งดาวฤกษ์จริง (สุริยยาตร์) ราศีเมษเริ่มราววันที่ 13–14 เมษายน ส่วนแบบตะวันตกส่วนใหญ่ยึดฤดูกาล ราศีเมษเริ่มราววันที่ 21 มีนาคม วันเปลี่ยนราศีจึงห่างกันราว 3–4 สัปดาห์');
    lines.push('ทั้งหมดนี้เป็นไปตามความเชื่อ ไม่รับประกันผล · ' + rulesetNote());
    return { content: lines.join('\n\n'), sources: srcIds(['thai-vs-western-rasi']) };
  }

  function explainNumerology(total) {
    var rs = MH.astro.ruleset();
    var chain = [], n = total;
    while (n > 9) {
      var ds = String(n).split('');
      var next = ds.reduce(function (s, d) { return s + Number(d); }, 0);
      chain.push(n + ' → ' + ds.join(' + ') + ' = ' + next);
      n = next;
    }
    var meaning = rs ? MH.store.all('numerology_meanings').filter(function (m) { return m.ruleset_id === rs.id && m.total === n; })[0] : null;
    var lines = [
      'ผลรวมเลขศาสตร์ ' + total + ' ได้เลขหลักเดียวคือ ' + n,
      'ระบบรวมค่าตัวอักษรของชื่อได้ ' + total + ' แล้ว' + (chain.length ? 'บวกเลขในแต่ละหลักต่อกันจนเหลือหลักเดียว: ' + chain.join(' ; ') : 'ผลรวมเป็นเลขหลักเดียวอยู่แล้ว ไม่ต้องบวกต่อ') + ' · AI เห็นเฉพาะตัวเลขผลรวม ไม่เห็นชื่อที่พิมพ์ในเครื่องมือ'
    ];
    if (meaning) lines.push('## เลข ' + n + ' “' + meaning.title + '”\n\n' + meaning.meaning);
    else lines.push('ตำราที่ใช้อยู่ยังไม่มีความหมายของเลข ' + n);
    lines.push('ค่าตัวอักษรของแต่ละสำนักต่างกันเล็กน้อย ผลรวมจึงอาจไม่ตรงกับเว็บอื่น ทั้งหมดนี้เป็นไปตามความเชื่อ ไม่รับประกันผล · ' + rulesetNote());
    return { content: lines.join('\n\n'), sources: srcIds(['name-numerology-basics']) };
  }

  function explainReply(e) {
    var r;
    if (!e || e.error) {
      r = { content: 'ลิงก์อธิบายผลนี้ข้อมูลไม่ครบหรือไม่ถูกต้อง' + (e && e.error ? ' (' + e.error + ')' : '') + ' ลองกลับไปที่เครื่องมือแล้วกด “ให้ AI อธิบายผลนี้” อีกครั้ง หรือพิมพ์ถามได้เลย', sources: [] };
    } else if (e.type === 'taksa') r = explainTaksa(e.day);
    else if (e.type === 'rasi') r = explainRasi(e.month, e.day);
    else r = explainNumerology(e.total);
    r.guard = null;
    r.followups = kbFollowups(r.sources, ['what-is-taksa', 'thai-vs-western-rasi', 'know-the-source-before-worship']);
    return r;
  }

  /* ---------- คลังความรู้: ค้นบทความที่ live ---------- */
  var VOCAB = ['ทักษาปกรณ์', 'ทักษา', 'โหราศาสตร์ไทย', 'โหราศาสตร์', 'สุริยยาตร์', 'ราศี', 'ฮวงจุ้ย', 'เลขศาสตร์ชื่อ', 'เลขศาสตร์', 'ผลรวม', 'ค่าตัวอักษร', 'เลข7ตัว', '7ตัว', '9ฐาน', 'ฐาน',
    'สีประจำวัน', 'สีเสริมโชค', 'สีเสื้อ', 'กาลกิณี', 'ศรี', 'บริวาร', 'มูละ', 'อุตสาหะ', 'มนตรี', 'เดช', 'วงทักษา', 'ดาวประจำวัน', 'ดาวฤกษ์', 'ราหู', 'สงกรานต์', 'ตะวันตก',
    'สากล', 'วันเกิด', 'วัตถุมงคล', 'พระเครื่อง', 'เครื่องราง', 'พระจำลอง', 'พระรุ่นใหม่', 'พระมีใบรับรอง', 'ใบรับรอง', 'รุ่นจำลอง', 'รุ่นใหม่', 'หินธรรมชาติ', 'องค์บูชา',
    'ที่มา', 'ป้ายประเภท', 'ป้าย', 'บูชา', 'เตียง', 'ห้องนอน', 'หัวเตียง', 'หัวนอน', 'กระจก', 'โต๊ะ', 'ตั้งชื่อ', 'ชื่อ', 'นามสกุล', 'ต้นแบบ', 'คลังความรู้', 'เครื่องมือ',
    'ผู้ออกใบรับรอง', 'พระ', 'รอยต่อ', 'ความเชื่อ', 'นอนหลับ', 'หลับสบาย'];
  var STOP = ['คืออะไรบ้าง', 'คืออะไร', 'หมายถึงอะไร', 'อะไรบ้าง', 'อะไร', 'อย่างไร', 'ยังไง', 'ทำไม', 'ได้ไหม', 'หรือไม่', 'ไหม', 'หน่อย', 'ช่วย', 'บอก', 'อธิบาย', 'เล่า', 'ให้ฟัง',
    'ครับ', 'ค่ะ', 'คะ', 'นะ', 'เกี่ยวกับ', 'เรื่อง', 'ต่างกัน', 'แตกต่าง', 'อยากรู้', 'ขอ', 'ความ', 'เป็น', 'หรือ', 'ไม่', 'วันนี้', 'เปล่า', 'หรือเปล่า', 'ที่ควร', 'ควร', 'ที่', 'ของ', 'และ', 'กับ', 'ใน', 'จะ', 'ได้', 'มี', 'ไป', 'มา'];
  var DEFINITION = ['คืออะไร', 'หมายถึง', 'คือ', 'ความหมาย'];

  var MIN_SCORE = 3;
  function termWeight(t) { return t.length >= 4 ? 3 : 1.5; }
  function queryTerms(nt) {
    var hit = uniq(VOCAB.map(norm)).filter(function (t) { return nt.indexOf(t) >= 0; });
    return hit.filter(function (t) { return !hit.some(function (o) { return o !== t && o.length > t.length && o.indexOf(t) >= 0; }); });
  }
  /* ตัดวรรณยุกต์/สระบน-ล่าง ก่อนเทียบ substring เพื่อให้ 5 ตัวอักษรหมายถึง "ราว 5 พยัญชนะ" จริง ๆ */
  function base(s) { return s.replace(/[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/g, ''); }
  function ngrams(nt) {
    var r = nt;
    STOP.forEach(function (s) { r = r.split(norm(s)).join('·'); });
    var out = [];
    r.split('·').forEach(function (seg) { seg = base(seg); for (var i = 0; i + 5 <= seg.length; i++) out.push(seg.substr(i, 5)); });
    return uniq(out);
  }
  function unitsOf(a) {
    var out = [], section = '', pending = '';
    String(a.body || '').split(/\n{2,}/).forEach(function (raw) {
      var b = raw.trim(); if (!b) return;
      if (b.indexOf('## ') === 0) { section = b.slice(3).trim(); pending = section; return; }
      out.push({ heading: pending, section: section, text: b, list: b.split('\n').every(function (l) { return l.indexOf('- ') === 0; }) });
      pending = '';
    });
    return out;
  }
  function clip(text, n) {
    if (text.length <= n) return text;
    var cut = text.lastIndexOf(' ', n);
    return text.slice(0, cut > n * 0.5 ? cut : n).replace(/[\s,;]+$/, '') + '…';
  }
  function unitText(u, withHeading) {
    var body = u.list ? u.text.split('\n').slice(0, 8).join('\n') : clip(u.text, 340);
    return (withHeading && u.heading ? '## ' + u.heading + '\n\n' : '') + body;
  }
  function isNews(a) { var c = MH.q.category(a.category_id); return !!c && c.slug === 'news'; }

  function search(text) {
    var qn = norm(text);
    var docs = MH.q.articles().map(function (a) {
      return { a: a, title: norm(a.title), excerpt: norm(a.excerpt), body: norm(a.body), units: unitsOf(a), score: 0 };
    });
    var terms = queryTerms(qn), grams = [];
    docs.forEach(function (d) {
      if (qn.indexOf(d.title) >= 0 && d.title) d.score += 100;
      terms.forEach(function (t) {
        var w = termWeight(t);
        if (d.title.indexOf(t) >= 0) d.score += w * 5;
        if (d.excerpt.indexOf(t) >= 0) d.score += w * 3;
        d.score += w * Math.min(countOcc(d.body, t), 3);
      });
    });
    if (!terms.length) {
      /* ไม่มีคำศัพท์ตรง → ลอง substring 5 ตัวอักษร (ต้องตรงอย่างน้อย 3 ช่วงที่ต่างกันจึงนับ เพื่อกันตรงมั่วจากคำเชื่อม) */
      grams = ngrams(qn);
      docs.forEach(function (d) {
        var all = base(d.title + d.excerpt + d.body), hit = grams.filter(function (g) { return all.indexOf(g) >= 0; }).length;
        d.score = hit >= 3 ? hit * 1.5 : 0;
      });
    }
    docs = docs.filter(function (d) { return d.score >= MIN_SCORE; }).sort(function (x, y) { return y.score - x.score || y.a.id - x.a.id; });
    if (!docs.length) return { found: false };
    var top = docs[0], keys = terms.length ? terms : grams;
    var defn = has(qn, DEFINITION);
    var best = null, bestScore = -1;
    top.units.forEach(function (u, i) {
      var t = norm(u.heading + u.section + u.text), s = 0;
      keys.forEach(function (k) { s += (terms.length ? termWeight(k) : 1) * Math.min(countOcc(t, k), 3); });
      if (defn && i === 0) s += 4;
      if (s > bestScore) { bestScore = s; best = u; }
    });
    var others = docs.slice(1, 3).filter(function (d) { return d.score >= top.score * 0.4 || d.score >= 100; });
    /* คำศัพท์ในคำถามที่บทความอันดับหนึ่งไม่ได้พูดถึงเลย → แจ้งผู้ใช้ว่าเป็นเรื่องใกล้เคียง ไม่ใช่คำตอบตรง ๆ */
    var all = top.title + top.excerpt + top.body;
    var missing = terms.filter(function (t) { return all.indexOf(t) < 0; }).slice(0, 2);
    return { found: true, top: top.a, unit: best || top.units[0], missing: missing, others: others.map(function (d) { return d.a; }), all: docs.map(function (d) { return d.a; }) };
  }

  function titleQuote(a) { return '“' + a.title + '”'; }
  function kbFollowups(excludeIds, preferSlugs, max) {
    max = max || 3;
    var live = MH.q.articles().filter(function (a) { return (excludeIds || []).indexOf(a.id) < 0 && !isNews(a); });
    var pref = (preferSlugs || []).map(function (s) { return live.filter(function (a) { return a.slug === s; })[0]; }).filter(Boolean);
    var rest = live.filter(function (a) { return pref.indexOf(a) < 0; });
    return pref.concat(rest).slice(0, max).map(function (a) { return a.title; });
  }
  function suggestions() {
    var cand = [['what-is-taksa', 'ทักษาคืออะไร ใช้ดูอะไรได้บ้าง'], ['thai-vs-western-rasi', 'ราศีแบบไทยกับแบบสากลต่างกันอย่างไร'],
      ['know-the-source-before-worship', 'ก่อนบูชาวัตถุมงคล ควรรู้ที่มาอย่างไร'], ['bedroom-fengshui', 'ฮวงจุ้ยห้องนอนควรวางเตียงอย่างไร'],
      ['lek-7-tua-9-than', 'เลข 7 ตัว 9 ฐานคืออะไร'], ['replica-new-certified', 'ป้ายมีใบรับรอง พระรุ่นใหม่ รุ่นจำลอง ต่างกันอย่างไร']];
    return cand.filter(function (c) { return liveBySlug(c[0]); }).map(function (c) { return c[1]; }).slice(0, 4);
  }

  function askBody(res, withTail) {
    var lines = ['จากบทความ ' + titleQuote(res.top) + ' ในคลังความรู้:', unitText(res.unit, true)];
    if (res.missing && res.missing.length) lines.push('หมายเหตุ: คลังความรู้ยังไม่มีบทความที่พูดถึง ' + res.missing.map(function (t) { return '“' + t + '”'; }).join(' และ ') + ' โดยตรง จึงแสดงเรื่องที่ใกล้เคียงที่สุดให้แทน');
    if (res.others.length) lines.push('บทความที่เกี่ยวข้องอีก ' + res.others.length + ' เรื่อง: ' + res.others.map(titleQuote).join(' · '));
    if (withTail && !isNews(res.top)) lines.push('เนื้อหานี้เป็นไปตามความเชื่อ ใช้เป็นแนวทางประกอบเท่านั้น ไม่รับประกันผล');
    return lines.join('\n\n');
  }
  function askReply(text, history) {
    var nt = norm(text);
    /* คำสั่งต่อเนื่อง: ขอรายละเอียดเพิ่มของบทความที่ตอบไปแล้ว */
    var last = (history || []).slice().reverse().filter(function (m) { return m.role === 'assistant' && m.sources && m.sources.length; })[0];
    if (last && /^(อธิบายเพิ่ม|เพิ่มเติม|ขอเพิ่ม|ต่อเลย|ต่อ|ขอรายละเอียด|ละเอียดกว่านี้|มีอะไรอีก|ขยายความ)/.test(nt)) {
      var art = MH.store.find('articles', last.sources[0]);
      if (art && MH.q.isLive(art)) {
        var us = unitsOf(art), more = us.filter(function (u) { return u.heading; }).slice(0, 3);
        if (!more.length) more = us.slice(1, 3);
        return {
          content: more.length ? 'ส่วนอื่นของบทความ ' + titleQuote(art) + ':\n\n' + more.map(function (u) { return unitText(u, true); }).join('\n\n') + '\n\nอ่านฉบับเต็มได้ที่ลิงก์แหล่งอ้างอิงด้านล่าง'
            : 'บทความ ' + titleQuote(art) + ' มีเนื้อหาสั้น สรุปไปครบแล้ว อ่านฉบับเต็มได้ที่ลิงก์แหล่งอ้างอิงด้านล่าง',
          guard: null, sources: [art.id], followups: kbFollowups([art.id], [])
        };
      }
    }
    /* ทักทาย/ขอบคุณ/ถามว่า AI ทำอะไรได้ */
    if (/^(สวัสดี|หวัดดี|ดีครับ|ดีค่ะ|ดีจ้า|hello|hi)(?![a-z])/.test(nt)) {
      return { content: 'สวัสดี ยินดีที่ได้คุยด้วย ถามเรื่องที่อยู่ในคลังความรู้ได้เลย เช่น ทักษา ราศี ฮวงจุ้ย หรือวิธีดูที่มาของวัตถุมงคล หรือกดปุ่ม “ให้ AI อธิบายผลนี้” จากหน้าเครื่องมือดูดวงเพื่อให้ช่วยอธิบายผลที่คำนวณแล้ว', guard: null, sources: [], followups: suggestions().slice(0, 3) };
    }
    if (/^(ขอบคุณ|ขอบใจ|thanks)/.test(nt)) {
      return { content: 'ยินดีที่ได้ช่วย ถ้ามีเรื่องที่อยากรู้เพิ่มจากคลังความรู้ ถามต่อได้เลย', guard: null, sources: [], followups: suggestions().slice(0, 3) };
    }
    if (has(nt, ['ทำอะไรได้', 'ช่วยอะไรได้', 'คุณคือใคร', 'เป็นใคร', 'ใช้ยังไง', 'ใช้อย่างไร'])) {
      return {
        content: 'Mahasart AI ช่วยได้สองอย่าง\n\n- อธิบายผลดูดวงที่ระบบคำนวณแล้ว (ทักษา ราศี เลขศาสตร์) เป็นภาษาคน\n- ตอบคำถามโดยอ้างบทความในคลังความรู้ พร้อมลิงก์แหล่งอ้างอิง\n\nสิ่งที่ AI จะไม่ทำ: ไม่แนะนำหรือขายวัตถุมงคล ไม่ทำนายเลขหวยหรือราคาหุ้น ไม่ให้คำแนะนำทางการแพทย์ การเงิน หรือกฎหมาย และถ้าไม่มีข้อมูลในคลังความรู้ จะบอกตรง ๆ ว่าไม่มี',
        guard: null, sources: [], followups: suggestions().slice(0, 3)
      };
    }
    /* ถามทักษาของวันเกิดใดวันเกิดหนึ่ง → ใช้ผลคำนวณจริงเหมือนโหมดอธิบาย */
    if (has(nt, ['ทักษา', 'กาลกิณี', 'สีเสริมโชค', 'สีที่ควรเลี่ยง']) || /ศรี/.test(nt)) {
      var days = [];
      if (/พุธ\(?กลางคืน/.test(nt)) days.push('wednesday-night');
      else if (/วันพุธ/.test(nt)) days.push('wednesday');
      [['วันอาทิตย์', 'sunday'], ['วันจันทร์', 'monday'], ['วันอังคาร', 'tuesday'], ['วันพฤหัส', 'thursday'], ['วันศุกร์', 'friday'], ['วันเสาร์', 'saturday']].forEach(function (p) { if (nt.indexOf(p[0]) >= 0) days.push(p[1]); });
      if (days.length === 1) return explainReply({ type: 'taksa', day: days[0] });
    }
    var res = search(text);
    if (!res.found) {
      var tips = kbFollowups([], ['what-is-taksa', 'thai-vs-western-rasi', 'know-the-source-before-worship', 'bedroom-fengshui'], 4);
      return {
        content: 'ตอนนี้ยังไม่มีข้อมูลเรื่องนี้ในคลังความรู้ของ MAHASART จึงขอไม่เดาคำตอบ เพราะอาจทำให้ข้อมูลคลาดเคลื่อน' +
          (tips.length ? '\n\nเรื่องที่ตอบได้ตอนนี้มาจากบทความที่เผยแพร่แล้ว เช่น\n\n' + tips.map(function (t) { return '- ' + t; }).join('\n') + '\n\nลองถามด้วยคำเฉพาะ เช่น ทักษา ราศี ฮวงจุ้ย หรือชื่อหัวข้อข้างต้น' : ''),
        guard: null, sources: [], followups: tips
      };
    }
    var ids = [res.top.id].concat(res.others.map(function (a) { return a.id; }));
    return { content: askBody(res, true), guard: null, sources: ids, followups: kbFollowups(ids, res.others.map(function (a) { return a.slug; })) };
  }

  /* ---------- คำตอบของแต่ละ guard ---------- */
  function crisisReply() {
    return {
      content: 'ขอบคุณที่บอกความรู้สึกนี้ออกมา AI อยากให้คุณรู้ว่าคุณไม่ได้อยู่คนเดียว และมีคนพร้อมรับฟังอยู่ตอนนี้\n\n' +
        'ขอพักเรื่องดวงไว้ก่อน เพราะตอนนี้สิ่งสำคัญที่สุดคือตัวคุณ\n\n' +
        '- โทร 1323 สายด่วนสุขภาพจิต โทรได้ตลอด 24 ชั่วโมง\n' +
        '- ถ้าตอนนี้คุณหรือใครอยู่ในอันตรายทันที โทร 1669 (การแพทย์ฉุกเฉิน)\n' +
        '- ถ้าไว้ใจใครได้ ลองบอกคนใกล้ตัวตอนนี้ และอยู่ใกล้ ๆ กันสักพัก\n\n' +
        'ข้อความนี้ไม่นับเป็นโควตาคำถามของวันนี้ ถ้าพร้อมจะเล่าว่าเกิดอะไรขึ้น พิมพ์ต่อได้เลย',
      guard: 'crisis', sources: [], followups: []
    };
  }
  function purchaseReply() {
    var art = liveBySlug('know-the-source-before-worship');
    var list = art ? unitsOf(art).filter(function (u) { return u.list; })[0] : null;
    var lines = ['ขออภัย AI ของ MAHASART ไม่แนะนำให้ซื้อ เช่า หรือบูชาวัตถุมงคลชิ้นใดทั้งสิ้น และไม่เลือกให้ว่าอะไรเหมาะกับใคร เพราะการบูชาควรเป็นการตัดสินใจของคุณเอง หลังรู้ที่มาของชิ้นนั้นจริง ๆ'];
    if (art) {
      lines.push('สิ่งที่ AI ช่วยได้คือเรื่องวิธีดูที่มา อ่านได้ที่บทความ ' + titleQuote(art) + (list ? ' ซึ่งแนะนำให้ถามสามข้อก่อนตัดสินใจ:\n\n' + unitText(list, false) : ''));
    } else {
      lines.push('สิ่งที่ควรทำก่อนตัดสินใจคือถามผู้ขายให้ชัดว่าใครสร้าง สร้างเมื่อไร และมีหลักฐานอะไรยืนยัน');
    }
    lines.push('ผลดูดวงและคำตอบจาก AI ไม่ผูกกับการขายสินค้าใด ๆ');
    return { content: lines.join('\n\n'), guard: 'purchase', sources: art ? [art.id] : [], followups: kbFollowups(art ? [art.id] : [], ['replica-new-certified', 'what-is-taksa'], 2) };
  }

  var CAUTION_INTRO = {
    health: 'ข้อควรระวังเรื่องสุขภาพ: AI ไม่ใช่แพทย์ จึงวินิจฉัยโรค แนะนำยา หรือบอกวิธีรักษาไม่ได้ ถ้ามีอาการหรือกังวลเรื่องสุขภาพ ควรปรึกษาแพทย์หรือบุคลากรทางการแพทย์ คำตอบด้านล่างเป็นเพียงมุมความเชื่อตามโหราศาสตร์ไทย ไม่ใช่คำแนะนำทางการแพทย์',
    finance: 'ข้อควรระวังเรื่องการเงิน: AI ไม่ใช่ที่ปรึกษาการเงิน จึงไม่ทำนายเลขหวย ราคาหุ้น คริปโต หรือผลการลงทุนใด ๆ และไม่แนะนำให้ซื้อขาย ลงทุน หรือกู้ยืม เรื่องเงินควรปรึกษาผู้เชี่ยวชาญด้านการเงินที่ได้รับอนุญาต คำตอบด้านล่างเป็นเพียงมุมความเชื่อ',
    legal: 'ข้อควรระวังเรื่องกฎหมาย: AI ไม่ใช่ทนายความ จึงให้คำปรึกษาคดีหรือทำนายผลคดีไม่ได้ ถ้ามีเรื่องทางกฎหมาย ควรปรึกษาทนายความหรือหน่วยงานที่เกี่ยวข้อง คำตอบด้านล่างเป็นเพียงมุมความเชื่อ'
  };
  function roleOf(key) { return MH.astro.ROLES.filter(function (r) { return r.key === key; })[0]; }
  function beliefDefault(cat, lottery) {
    var taksa = srcIds(['what-is-taksa']);
    if (cat === 'finance' && lottery) {
      return { text: 'AI จึงขอไม่ให้เลขเด็ด เลขนำโชค หรือเดาตัวเลขรางวัลของงวดใด ๆ เพราะไม่มีศาสตร์ใดยืนยันผลสลากได้ และการให้ตัวเลขอาจทำให้เกิดความหวังที่ไม่ควรมี ถ้าสนใจมุมความเชื่อเรื่องโชคลาภ ถามเรื่องตำแหน่งศรีในทักษาได้', sources: taksa };
    }
    if (cat === 'finance') {
      var sri = roleOf('sri'), mula = roleOf('mula');
      return { text: 'ตามความเชื่อในทักษา ตำแหน่ง “' + sri.name + '” หมายถึง' + sri.meaning + ' และตำแหน่ง “' + mula.name + '” หมายถึง' + mula.meaning + ' เป็นเพียงแนวทางเชิงกำลังใจ ไม่ใช่สัญญาณให้ซื้อ ขาย ลงทุน หรือกู้ยืม', sources: taksa };
    }
    if (cat === 'health') {
      var ayu = roleOf('ayu');
      return { text: 'ตามความเชื่อในทักษา ตำแหน่ง “' + ayu.name + '” (' + ayu.meaning + ') เป็นหนึ่งใน 8 ตำแหน่งที่นับจากดาวประจำวันเกิด ใช้เป็นแนวทางประกอบเท่านั้น ไม่ใช่เครื่องบอกว่าจะป่วยหรือหายจากโรคใด ๆ ถ้าอยากรู้ดาวของตัวเอง ใช้เครื่องมือทักษาตามวันเกิดได้', sources: taksa };
    }
    var det = roleOf('det');
    return { text: 'โหราศาสตร์ไทยไม่ใช่เครื่องตัดสินผลคดีหรือข้อพิพาทใด ๆ ในทักษา ตำแหน่ง “' + det.name + '” หมายถึง' + det.meaning + ' บางคนใช้เป็นแนวทางเลือกวันเพื่อให้ใจนิ่งขึ้นเท่านั้น ไม่มีผลต่อกระบวนการทางกฎหมาย', sources: taksa };
  }
  function cautionReply(det, text) {
    var cats = det.cautions, cat = cats[0];
    var intro = cats.length > 1 ? cats.map(function (c) { return CAUTION_INTRO[c]; }).join('\n\n') : CAUTION_INTRO[cat];
    var body, sources, followups;
    var res = det.lottery ? { found: false } : search(text);
    if (res.found) {
      body = askBody(res, false);
      sources = [res.top.id].concat(res.others.map(function (a) { return a.id; }));
    } else {
      var d = beliefDefault(cat, det.lottery);
      body = d.text; sources = d.sources;
    }
    followups = kbFollowups(sources, ['what-is-taksa', 'thai-vs-western-rasi', 'bedroom-fengshui'], 3);
    return { content: intro + '\n\n' + body, guard: cat, sources: sources, followups: followups };
  }

  /* ---------- จุดเข้าหลัก ---------- */
  function answer(opts) {
    opts = opts || {};
    var text = String(opts.text || '').trim().slice(0, MAX_LEN);
    var det = detect(text);
    if (det.guard === 'crisis') return crisisReply();
    if (det.guard === 'purchase') return purchaseReply();
    if (det.cautions.length) return cautionReply(det, text);
    if (opts.mode === 'explain' && opts.explain) return explainReply(opts.explain);
    var r = askReply(text, opts.history);
    return { content: r.content, guard: r.guard || null, sources: r.sources || [], followups: r.followups || [] };
  }

  MH.ai = {
    MAX_LEN: MAX_LEN, FINE_PRINT: FINE_PRINT, GUARDS: GUARDS,
    answer: answer, detect: detect, parseExplain: parseExplain, explainTitle: explainTitle, explainQuestion: explainQuestion, suggestions: suggestions,
    MONTHS: MONTHS, MONTHS_SHORT: MONTHS_SHORT
  };
})();
