/* หลังบ้าน: เพิ่ม/แก้ไขวัตถุมงคล
   เงื่อนไขเผยแพร่ตามสัญญาข้อ 6: มีป้ายประเภท · รูปแกลเลอรี ≥ 1 · ทุกรูปมี alt · ถ้ามีใบรับรองต้องมีผู้ออก เลขที่ และรูปใบรับรอง · ไม่มีคำต้องห้าม
   รูปภาพแก้ในหน่วยความจำของฟอร์มก่อน แล้วค่อยเขียนลง media ตอนกดบันทึก */
(function () {
  'use strict';
  var MH = window.MH; if (!MH.admin.allowed) return;
  var h = MH.util.h, A = MH.admin, S = MH.store;
  function $(id) { return document.getElementById(id); }
  var root = $('edit-root'), headBox = $('edit-head');

  var can = {
    create: MH.auth.can('amulets.create'), edit: MH.auth.can('amulets.edit'), publish: MH.auth.can('amulets.publish'),
    archive: MH.auth.can('amulets.archive'), del: MH.auth.can('amulets.delete')
  };
  var PROV = [
    { k: 'certified', d: 'มีใบรับรองจากผู้ตรวจพิสูจน์ ต้องกรอกผู้ออกและเลขที่ พร้อมรูปใบรับรอง' },
    { k: 'new_edition', d: 'สร้างใหม่โดยวัดหรือผู้สร้างที่ระบุได้ ควรกรอกรุ่นและปีที่สร้าง' },
    { k: 'replica', d: 'ทำจำลองตามแบบเพื่อบูชา ไม่ใช่องค์ต้นแบบหรือของเก่า' },
    { k: 'natural_stone', d: 'หินหรือคริสตัลธรรมชาติ รูปทรงและสีแต่ละชิ้นไม่เหมือนกัน' },
    { k: 'worship_statue', d: 'รูปเคารพสำหรับตั้งบูชา เช่น องค์ท้าวเวสสุวรรณ' }
  ];
  var ART = [['a-somdej', 'พระสมเด็จ'], ['a-coin', 'เหรียญ'], ['a-beads', 'ลูกปัด กำไล'], ['a-statue', 'องค์บูชา'], ['a-pidta', 'พระปิดตา'], ['a-crystal', 'ผลึกหิน'], ['a-scroll', 'ใบรับรอง']];
  var STOCK_KEYS = Object.keys(MH.labels.stock);
  var YEAR_MIN = 2400, YEAR_MAX = new Date().getFullYear() + 543;
  var SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  var rec, imgs, orig, readOnly, form, guard, seq = 0;

  /* ---------- ข้อมูล ---------- */
  function nextCode() {
    var max = 0;
    S.all('amulets', { withTrashed: true }).forEach(function (m) {
      var n = parseInt(String(m.code).replace(/\D/g, ''), 10); if (n > max) max = n;
    });
    return 'MH-' + ('0000' + (max + 1)).slice(-4);
  }
  function blank() {
    return {
      id: null, code: nextCode(), category_id: null, slug: '', name: '', provenance_type: '', temple_name: '', maker: '', edition_name: '',
      edition_year_ce: null, certificate_issuer: '', certificate_no: '', material: '', size_text: '', belief_text: '', description: '',
      price_amount: null, is_price_visible: false, stock_qty: 0, stock_status: 'not_for_sale', status: 'draft', published_at: null,
      is_featured: false, featured_order: null, art: null, tone: 'amber'
    };
  }
  function loadImgs(ownerId) {
    imgs = MH.q.media('amulets', ownerId).map(function (m) {
      return { key: 'i' + (++seq), id: m.id, collection: m.collection, file_name: m.file_name, alt_text: m.alt_text || '', art: m.art || 'a-none', sort_order: m.sort_order };
    });
    orig = JSON.parse(JSON.stringify(imgs));
  }
  function isGallery(i) { return i.collection === 'gallery'; }
  function isCert(i) { return i.collection === 'certificate'; }

  function showEmpty(title, text, actionHtml) {
    headBox.innerHTML = '<div><h1>วัตถุมงคล</h1></div><div class="btn-row"><a class="btn btn--outline" href="amulets.html">กลับรายการ</a></div>';
    root.innerHTML = MH.ui.empty(title, text, actionHtml);
  }

  function init() {
    var idParam = MH.util.param('id');
    if (idParam === null) {
      if (!can.create) { showEmpty('บทบาทนี้เพิ่มวัตถุมงคลใหม่ไม่ได้', 'ดูรายการที่มีอยู่ได้ที่หน้ารายการ ถ้าต้องเพิ่มให้แจ้งผู้ดูแลแค็ตตาล็อก'); return; }
      rec = blank(); imgs = []; orig = []; readOnly = false;
    } else {
      var r = S.find('amulets', idParam);
      if (!r) { showEmpty('ไม่พบวัตถุมงคลนี้', 'ลิงก์อาจผิด หรือรายการถูกลบถาวรไปแล้ว', '<a class="btn btn--primary" href="amulets.html">กลับรายการ</a>'); return; }
      if (r.deleted_at) { showEmpty('วัตถุมงคลนี้อยู่ในถังขยะ', r.code + ' ' + r.name + ' ถูกย้ายไปถังขยะแล้ว ต้องกู้คืนก่อนจึงจะเปิดแก้ไขได้', '<a class="btn btn--primary" href="amulets.html">กลับรายการ</a>'); return; }
      rec = r; loadImgs(r.id); readOnly = !can.edit;
    }
    document.title = (rec.id ? rec.code + ' ' + rec.name : 'เพิ่มวัตถุมงคล') + ' · หลังบ้าน MAHASART';
    render();
  }

  /* ---------- ส่วนหัว ---------- */
  function renderHead() {
    var isNew = !rec.id;
    var meta = isNew
      ? '<span class="pill">ยังไม่บันทึก</span> รหัส ' + h(rec.code) + ' (ระบบกำหนดให้)'
      : A.pill(rec.status) + ' ' + h(rec.code) + ' · แก้ไขล่าสุด ' + h(MH.util.dateTime(rec.updated_at)) + ' โดย ' + h(A.userName(rec.updated_by));
    headBox.innerHTML = '<div><h1>' + h(isNew ? 'เพิ่มวัตถุมงคล' : rec.name) + '</h1><p class="head-meta">' + meta + '</p></div>' +
      '<div class="btn-row"><a class="btn btn--outline" href="amulets.html">กลับรายการ</a>' +
      (isNew ? '' : '<a class="btn btn--outline" href="../amulet.html?code=' + encodeURIComponent(rec.code) + '&amp;preview=1" target="_blank" rel="noopener">ดูตัวอย่าง ↗</a>') + '</div>';
  }

  /* ---------- ฟอร์ม ---------- */
  function render() {
    renderHead();
    var cats = S.all('categories').filter(function (c) { return c.type === 'amulet' && (c.is_active || c.id === rec.category_id); })
      .sort(function (a, b) { return a.sort_order - b.sort_order; });
    var catOpts = '<option value="">เลือกหมวด</option>' + cats.map(function (c) {
      return '<option value="' + c.id + '"' + (c.id === rec.category_id ? ' selected' : '') + '>' + h(c.name + (c.is_active ? '' : ' (ปิดใช้งาน)')) + '</option>';
    }).join('');
    var provHtml = PROV.map(function (p, i) {
      var id = i === 0 ? 'f-prov' : 'f-prov-' + (i + 1);
      return '<label class="prov-opt" for="' + id + '"><input type="radio" name="prov" id="' + id + '" value="' + p.k + '"' + (rec.provenance_type === p.k ? ' checked' : '') + '>' +
        '<span class="prov-body">' + MH.ui.provenanceTag(p.k) + '<span class="prov-d">' + h(p.d) + '</span></span></label>';
    }).join('');
    var stockOpts = STOCK_KEYS.map(function (k) {
      return '<option value="' + k + '"' + (rec.stock_status === k ? ' selected' : '') + '>' + h(MH.labels.stock[k]) + '</option>';
    }).join('');
    var yearBE = rec.edition_year_ce ? rec.edition_year_ce + 543 : '';
    var featured = rec.id && (S.setting('featured_amulets') || []).indexOf(rec.id) >= 0;
    var homeLink = MH.auth.can('homepage.manage') ? '<a href="homepage.html">หน้า “หน้าแรก”</a>' : 'หน้า “หน้าแรก” (บรรณาธิการเป็นผู้จัด)';

    function txt(id, label, v, hint, extra) {
      return '<div class="field' + (extra || '') + '"><label for="' + id + '">' + label + '</label><input class="input" id="' + id + '" value="' + h(v) + '" autocomplete="off">' + (hint ? '<p class="hint">' + hint + '</p>' : '') + '</div>';
    }

    root.innerHTML = '<form id="amulet-form" novalidate' + (readOnly ? ' class="is-ro"' : '') + '>' +
      (readOnly ? '<div class="notice" role="note">' + h(MH.labels.role[A.user.role]) + ' ดูข้อมูลวัตถุมงคลได้อย่างเดียว ถ้าต้องแก้ไขให้แจ้งผู้ดูแลแค็ตตาล็อก</div>' : '') +
      '<div id="ready-box"></div>' +

      '<section class="form-section" aria-labelledby="s-main"><h2 id="s-main">ข้อมูลหลัก</h2>' +
      '<p class="hint">ชื่อ หมวด และป้ายประเภทที่ผู้ซื้อเห็นเป็นอย่างแรก</p>' +
      '<div class="form-grid">' +
        '<div class="field"><label for="f-code">รหัส</label><input class="input" id="f-code" value="' + h(rec.code) + '" readonly><p class="hint">ระบบกำหนดให้ แก้ไม่ได้</p></div>' +
        txt('f-name', 'ชื่อวัตถุมงคล <span class="req" aria-hidden="true">*</span>', rec.name) +
        txt('f-slug', 'slug (ส่วนท้ายของลิงก์) <span class="req" aria-hidden="true">*</span>', rec.slug, 'ใช้ a-z 0-9 และขีดกลาง ห้ามซ้ำกับชิ้นอื่น เช่น somdej-replica') +
        '<div class="field"><label for="f-category">หมวด <span class="req" aria-hidden="true">*</span></label><select class="select" id="f-category">' + catOpts + '</select></div>' +
        '<fieldset class="field full prov"><legend class="label">ป้ายประเภท <span class="tagline">(ต้องเลือกก่อนเผยแพร่)</span></legend>' +
          '<p class="hint">เลือกให้ตรงความจริง ป้ายนี้แสดงบนการ์ดและหน้ารายละเอียดทุกครั้ง</p><div class="prov-list">' + provHtml + '</div></fieldset>' +
        '<div class="field full"><label for="f-belief">ความเชื่อ</label>' +
          '<div class="affix"><span class="affix-pre" aria-hidden="true">ความเชื่อ:</span><input class="input" id="f-belief" value="' + h(rec.belief_text) + '" autocomplete="off"></div>' +
          '<p class="hint">เขียนสรรพคุณตามความเชื่อ ไม่รับประกันผล หน้าเว็บจะขึ้นต้นด้วย “ความเชื่อ:” ให้เอง</p></div>' +
        '<div class="field full"><label for="f-desc">รายละเอียด</label><textarea class="textarea" id="f-desc">' + h(rec.description) + '</textarea>' +
          '<p class="hint">บอกสิ่งที่ผู้ซื้อควรรู้ เช่น เป็นรุ่นจำลองหรือไม่ วัสดุ และข้อจำกัด</p></div>' +
      '</div></section>' +

      '<section class="form-section" aria-labelledby="s-origin"><h2 id="s-origin">ที่มา</h2>' +
      '<p class="hint">กรอกเท่าที่ยืนยันได้ ช่องที่ไม่แน่ใจเว้นว่างไว้ดีกว่าเดา</p>' +
      '<div class="form-grid">' +
        txt('f-temple', 'วัด / สถานที่สร้าง', rec.temple_name) +
        txt('f-maker', 'ผู้สร้าง', rec.maker) +
        txt('f-edition', 'รุ่น', rec.edition_name) +
        txt('f-year', 'ปีที่สร้าง (พ.ศ.)', yearBE, 'กรอกเป็น พ.ศ. ระบบเก็บเป็น ค.ศ. ให้เอง (ลบ 543) ช่วงที่รับ ' + YEAR_MIN + ' ถึง ' + YEAR_MAX) +
        txt('f-material', 'วัสดุ', rec.material) +
        txt('f-size', 'ขนาด', rec.size_text, 'เช่น 2.4 × 3.6 ซม.') +
      '</div></section>' +

      '<section class="form-section" id="sec-cert" aria-labelledby="s-cert"' + (rec.provenance_type === 'certified' ? '' : ' hidden') + '><h2 id="s-cert">ใบรับรอง</h2>' +
      '<p class="hint">แสดงเมื่อเลือกป้าย “มีใบรับรอง” ถ้าเปลี่ยนเป็นป้ายอื่น ข้อมูลส่วนนี้จะถูกล้างตอนบันทึก</p>' +
      '<div class="form-grid">' +
        txt('f-cert-issuer', 'ผู้ออกใบรับรอง', rec.certificate_issuer) +
        txt('f-cert-no', 'เลขที่ใบรับรอง', rec.certificate_no) +
      '</div></section>' +

      '<section class="form-section" aria-labelledby="s-img"><h2 id="s-img">รูปภาพ</h2>' +
      '<p class="hint">ต้องมีรูปแกลเลอรีอย่างน้อย 1 รูป และทุกรูปต้องมีคำบรรยาย (alt) ต้นแบบนี้เลือกภาพประกอบแทนการอัปโหลดไฟล์จริง</p>' +
      '<div id="img-box"></div></section>' +

      '<section class="form-section" aria-labelledby="s-price"><h2 id="s-price">ราคาและสต็อก</h2>' +
      '<p class="hint">ลูกค้าสั่งซื้อออนไลน์ได้เมื่อ เผยแพร่แล้ว · เปิด “แสดงราคาบนเว็บ” · มีสต็อกอย่างน้อย 1 ชิ้น · สถานะการให้บูชาไม่ใช่ “ส่งมอบแล้ว” หรือ “ไม่เปิดให้บูชา” ถ้าปิดแสดงราคา ผู้สนใจสอบถามราคาทาง LINE เหมือนเดิม</p>' +
      '<div class="notice" id="buy-state" role="status"></div>' +
      '<div class="form-grid price-grid">' +
        '<div class="field"><label for="f-price">ราคา (บาท)</label><input class="input" id="f-price" inputmode="decimal" value="' + h(rec.price_amount == null ? '' : rec.price_amount) + '" autocomplete="off">' +
          '<p class="hint">ตัวเลขมากกว่า 0 ทศนิยมไม่เกิน 2 ตำแหน่ง เช่น 590 หรือ 1290.50 เว้นว่างได้ถ้ายังไม่เปิดแสดงราคา</p></div>' +
        '<div class="field"><label for="f-stockqty">จำนวนในสต็อก (ชิ้น) <span class="req" aria-hidden="true">*</span></label><input class="input" id="f-stockqty" inputmode="numeric" value="' + h(rec.stock_qty || 0) + '" autocomplete="off">' +
          '<p class="hint">จำนวนเต็ม 0 ขึ้นไป ไม่มีของให้ใส่ 0 ระบบหักสต็อกให้เมื่อลูกค้ากดไปชำระเงิน และคืนให้เมื่อยกเลิกหรือหมดเวลา</p></div>' +
        '<div class="field full"><span class="label">การแสดงราคา</span><label class="check" for="f-price-vis"><input type="checkbox" id="f-price-vis"' + (rec.is_price_visible ? ' checked' : '') + '> แสดงราคาบนเว็บและเปิดให้สั่งซื้อออนไลน์</label></div>' +
      '</div></section>' +

      '<section class="form-section" aria-labelledby="s-show"><h2 id="s-show">การแสดงผล</h2>' +
      '<div class="form-grid">' +
        '<div class="field"><label for="f-stock">สถานะการให้บูชา</label><select class="select" id="f-stock">' + stockOpts + '</select>' +
          '<p class="hint">บอกผู้ซื้อว่าชิ้นนี้ยังสอบถามได้หรือไม่ ไม่เกี่ยวกับสถานะเผยแพร่</p></div>' +
        '<div class="field"><span class="label">แนะนำที่หน้าแรก</span><p class="feat-state">' + (featured ? 'ใช่ อยู่ในรายการแนะนำ' : 'ไม่ได้แนะนำ') + '</p>' +
          '<p class="hint">เลือกและจัดลำดับที่' + homeLink + '</p></div>' +
      '</div></section>' +

      actionsHtml() +
      '</form>';

    form = $('amulet-form');
    var belief = $('f-belief'), affix = belief.parentNode;
    A.counter(belief, 200);
    affix.after(belief.nextElementSibling);
    renderImages();
    updateReady(); updateBuyState();
    if (readOnly) { disableAll(); return; }
    guard = A.dirtyGuard(form);
    form.addEventListener('submit', function (e) { e.preventDefault(); doSave('save'); });
    form.addEventListener('click', onClick);
    form.addEventListener('input', onInput);
    form.addEventListener('change', onChange);
  }

  function actionsHtml() {
    if (readOnly) return '';
    var st = rec.status || 'draft', isNew = !rec.id, b = [];
    if (st === 'published') {
      b.push('<button type="submit" class="btn btn--primary">บันทึกการแก้ไข</button>');
      if (can.archive) b.push('<button type="button" class="btn btn--outline" data-act="archive">เลิกเผยแพร่ (เก็บ)</button>');
    } else if (st === 'archived') {
      b.push('<button type="submit" class="btn btn--primary">บันทึกการแก้ไข</button>');
      if (can.publish) b.push('<button type="button" class="btn btn--gold" data-act="publish">เผยแพร่อีกครั้ง</button>');
    } else {
      b.push('<button type="submit" class="btn btn--primary">บันทึกฉบับร่าง</button>');
      if (can.publish) b.push('<button type="button" class="btn btn--gold" data-act="publish">เผยแพร่</button>');
    }
    if (!isNew && can.del) b.push('<span class="spacer"></span><button type="button" class="btn btn--danger-o" data-act="trash">ย้ายไปถังขยะ</button>');
    return '<div class="form-actions">' + b.join('') + '</div>';
  }

  function disableAll() {
    form.querySelectorAll('input,select,textarea,button').forEach(function (el) { el.disabled = true; });
  }

  /* ---------- อ่านค่าจากฟอร์ม ---------- */
  function val(id) { var el = $(id); return el ? el.value : ''; }
  function collect() {
    var pr = form.querySelector('input[name="prov"]:checked');
    return {
      name: val('f-name').trim(), slug: val('f-slug').trim(), category_id: val('f-category') ? Number(val('f-category')) : null,
      provenance_type: pr ? pr.value : '', belief_text: val('f-belief').trim(), description: val('f-desc').trim(),
      temple_name: val('f-temple').trim(), maker: val('f-maker').trim(), edition_name: val('f-edition').trim(), year_raw: val('f-year').trim(),
      material: val('f-material').trim(), size_text: val('f-size').trim(),
      certificate_issuer: val('f-cert-issuer').trim(), certificate_no: val('f-cert-no').trim(), stock_status: val('f-stock'),
      price_raw: val('f-price').trim().replace(/,/g, ''), price_visible: !!($('f-price-vis') && $('f-price-vis').checked), stock_raw: val('f-stockqty').trim()
    };
  }

  /* ---------- ตรวจ ---------- */
  function basicErrors(v) {
    var e = [];
    if (!v.name) e.push({ field: 'f-name', msg: 'กรอกชื่อวัตถุมงคล' });
    else if (v.name.length > 120) e.push({ field: 'f-name', msg: 'ชื่อยาวเกิน 120 ตัวอักษร (ตอนนี้ ' + v.name.length + ') ย่อให้สั้นลง' });
    if (!v.slug) e.push({ field: 'f-slug', msg: 'กรอก slug สำหรับลิงก์ ใช้ a-z 0-9 และขีดกลาง เช่น somdej-replica' });
    else if (!SLUG_RE.test(v.slug)) e.push({ field: 'f-slug', msg: 'slug ใช้ได้เฉพาะ a-z 0-9 และขีดกลาง (-) ห้ามเว้นวรรค ห้ามขึ้นต้นหรือลงท้ายด้วยขีดกลาง' });
    else {
      var dup = S.all('amulets', { withTrashed: true }).filter(function (m) { return m.slug === v.slug && m.id !== rec.id; })[0];
      if (dup) e.push({ field: 'f-slug', msg: 'slug นี้ ' + dup.code + ' ใช้อยู่แล้ว ให้เปลี่ยนเป็นค่าอื่น' });
    }
    if (!v.category_id) e.push({ field: 'f-category', msg: 'เลือกหมวดของวัตถุมงคล' });
    if (v.year_raw && (!/^\d{4}$/.test(v.year_raw) || Number(v.year_raw) < YEAR_MIN || Number(v.year_raw) > YEAR_MAX)) {
      e.push({ field: 'f-year', msg: 'ปีที่สร้างต้องเป็น พ.ศ. 4 หลัก ระหว่าง ' + YEAR_MIN + ' ถึง ' + YEAR_MAX + ' (กรอกเป็น พ.ศ. ไม่ใช่ ค.ศ.)' });
    }
    if (v.price_raw !== '') {
      if (!/^\d+(\.\d{1,2})?$/.test(v.price_raw)) e.push({ field: 'f-price', msg: 'ราคาต้องเป็นตัวเลขมากกว่า 0 ทศนิยมไม่เกิน 2 ตำแหน่ง เช่น 590 หรือ 1290.50 (ไม่ต้องใส่หน่วยหรือตัวอักษร)' });
      else if (Number(v.price_raw) <= 0) e.push({ field: 'f-price', msg: 'ราคาต้องมากกว่า 0 บาท ถ้ายังไม่ขายให้เว้นว่างและปิดการแสดงราคา' });
      else if (Number(v.price_raw) > 9999999) e.push({ field: 'f-price', msg: 'ราคาสูงเกินไป ไม่เกิน 9,999,999 บาท' });
    } else if (v.price_visible) {
      e.push({ field: 'f-price', msg: 'เปิดแสดงราคาบนเว็บแล้วต้องกรอกราคา หรือปิดการแสดงราคาก่อน' });
    }
    if (!/^\d+$/.test(v.stock_raw)) e.push({ field: 'f-stockqty', msg: 'จำนวนในสต็อกต้องเป็นจำนวนเต็ม 0 ขึ้นไป (ไม่มีของให้ใส่ 0)' });
    else if (Number(v.stock_raw) > 100000) e.push({ field: 'f-stockqty', msg: 'จำนวนในสต็อกสูงเกินไป ไม่เกิน 100,000 ชิ้น' });
    if (v.belief_text.length > 200) e.push({ field: 'f-belief', msg: 'ความเชื่อยาวเกิน 200 ตัวอักษร (ตอนนี้ ' + v.belief_text.length + ') ตัดให้สั้นลง' });
    imgs.forEach(function (im) {
      if (!im.alt_text.trim()) e.push({ field: 'alt-' + im.key, msg: 'ใส่คำบรรยายรูป ' + im.file_name + ' (alt) ว่าในรูปเห็นอะไร' });
    });
    return e;
  }

  /** เงื่อนไขเผยแพร่ → [{ label, errs:[{field,msg}] }] · ว่าง = ครบ */
  function publishItems(v) {
    var items = [];
    if (!v.provenance_type) items.push({ label: 'ป้ายประเภท', errs: [{ field: 'f-prov', msg: 'เลือกป้ายประเภทก่อนเผยแพร่ ผู้ซื้อต้องรู้ว่าชิ้นนี้เป็นของมีใบรับรอง พระรุ่นใหม่ รุ่นจำลอง หินธรรมชาติ หรือองค์บูชา' }] });
    if (!imgs.some(isGallery)) items.push({ label: 'รูปแกลเลอรี', errs: [{ field: 'img-add', msg: 'เพิ่มรูปแกลเลอรีอย่างน้อย 1 รูปก่อนเผยแพร่' }] });
    var noAlt = imgs.filter(function (i) { return !i.alt_text.trim(); });
    if (noAlt.length) items.push({ label: 'คำบรรยายรูป (alt)', errs: noAlt.map(function (im) { return { field: 'alt-' + im.key, msg: 'ใส่คำบรรยายรูป ' + im.file_name + ' ก่อนเผยแพร่' }; }) });
    if (v.provenance_type === 'certified') {
      if (!v.certificate_issuer) items.push({ label: 'ผู้ออกใบรับรอง', errs: [{ field: 'f-cert-issuer', msg: 'กรอกผู้ออกใบรับรอง ชิ้นที่ติดป้ายมีใบรับรองต้องระบุผู้ออก' }] });
      if (!v.certificate_no) items.push({ label: 'เลขที่ใบรับรอง', errs: [{ field: 'f-cert-no', msg: 'กรอกเลขที่ใบรับรอง' }] });
      if (!imgs.some(isCert)) items.push({ label: 'รูปใบรับรอง', errs: [{ field: 'img-add-cert', msg: 'เพิ่มรูปใบรับรองอย่างน้อย 1 รูป' }] });
    }
    var bad = [];
    [['f-name', 'ชื่อ', v.name], ['f-belief', 'ความเชื่อ', v.belief_text], ['f-desc', 'รายละเอียด', v.description]].forEach(function (p) {
      var found = MH.util.bannedIn(p[2]);
      if (found.length) bad.push({ field: p[0], msg: p[1] + 'มีคำต้องห้าม ' + found.map(function (w) { return '“' + w + '”'; }).join(' ') + ' ให้ตัดหรือเปลี่ยนคำก่อนเผยแพร่' });
    });
    if (bad.length) items.push({ label: 'คำต้องห้าม', errs: bad });
    return items;
  }

  function updateReady() {
    var box = $('ready-box'); if (!box) return;
    var items = publishItems(collect()), live = rec.status === 'published';
    if (!items.length) {
      box.className = 'notice notice--ok';
      box.innerHTML = '<span><b>ครบตามเงื่อนไขเผยแพร่</b> ' + (live ? 'ชิ้นนี้เผยแพร่อยู่' : 'กด “เผยแพร่” ได้เมื่อพร้อม') + '</span>';
    } else {
      box.className = 'notice notice--warn';
      box.innerHTML = '<span><b>' + (live ? 'ชิ้นที่เผยแพร่อยู่ต้องครบเงื่อนไข ขาด ' : 'ยังเผยแพร่ไม่ได้ ขาด ') + items.length + ' อย่าง</b> ' + items.map(function (i) { return h(i.label); }).join(' · ') + '</span>';
    }
  }

  /* บอกว่าตอนนี้ลูกค้าสั่งซื้อออนไลน์ได้ไหม (อัปเดตตามที่กรอก) */
  function updateBuyState() {
    var box = $('buy-state'); if (!box) return;
    var v = collect(), why = [], price = v.price_raw !== '' && /^\d+(\.\d{1,2})?$/.test(v.price_raw) && Number(v.price_raw) > 0;
    if (rec.status !== 'published') why.push('ยังไม่ได้เผยแพร่');
    if (!v.price_visible) why.push('ปิดการแสดงราคา');
    else if (!price) why.push('ราคายังไม่ถูกต้อง');
    var qty = /^\d+$/.test(v.stock_raw) ? Number(v.stock_raw) : 0;
    if (qty <= 0) why.push('สต็อกเป็น 0');
    if (v.stock_status === 'sold' || v.stock_status === 'not_for_sale') why.push('สถานะการให้บูชาคือ “' + MH.labels.stock[v.stock_status] + '”');
    box.className = 'notice' + (why.length ? ' notice--warn' : ' notice--ok');
    box.innerHTML = why.length ? '<span><b>ตอนนี้ลูกค้ายังสั่งซื้อออนไลน์ไม่ได้</b> เพราะ ' + h(why.join(' · ')) + '</span>' : '<span><b>ตอนนี้ลูกค้าสั่งซื้อออนไลน์ได้</b> ราคา ' + h(MH.money(Number(v.price_raw))) + ' · มี ' + qty + ' ชิ้น</span>';
  }

  function sortByDom(errs) {
    return errs.slice().sort(function (a, b) {
      var ea = $(a.field), eb = $(b.field);
      if (!ea || !eb) return 0;
      return ea.compareDocumentPosition(eb) & 4 ? -1 : 1;
    });
  }

  /* ---------- รูปภาพ ---------- */
  function renderImages(focus) {
    var showCert = (form ? currentProv() : rec.provenance_type) === 'certified' || imgs.some(isCert);
    $('img-box').innerHTML = group('gallery', 'รูปแกลเลอรี', 'รูปแรกใช้เป็นรูปปกบนการ์ดวัตถุมงคล', 'img-add') +
      (showCert ? group('certificate', 'รูปใบรับรอง', 'ถ่ายให้เห็นเลขที่และผู้ออกใบรับรองชัดเจน', 'img-add-cert') : '');
    if (readOnly) form.querySelectorAll('#img-box input').forEach(function (el) { el.disabled = true; });
    if (focus) {
      var el = null;
      if (focus.key) {
        el = $('img-box').querySelector('[data-img-act="' + focus.act + '"][data-key="' + focus.key + '"]:not(:disabled)') ||
          $('img-box').querySelector('[data-img-act][data-key="' + focus.key + '"]:not(:disabled)');
      }
      if (!el && focus.add) el = $(focus.add);
      if (!el && focus.alt) el = $(focus.alt);
      if (el) el.focus();
    }
  }
  function currentProv() { var r = form.querySelector('input[name="prov"]:checked'); return r ? r.value : ''; }

  function group(col, title, hint, addId) {
    var list = imgs.filter(function (i) { return i.collection === col; });
    var tone = rec.tone === 'violet' ? ' thumb--violet' : '';
    var rows = list.map(function (im, idx) {
      var k = im.key;
      return '<li class="img-row"><span class="thumb m-thumb img-prev' + tone + '" aria-hidden="true">' + MH.ui.art(im.art) + '</span>' +
        '<div class="img-main"><p class="img-file"><b>' + h(im.file_name) + '</b> <span class="muted">รูปที่ ' + (idx + 1) + ' จาก ' + list.length + '</span></p>' +
        '<div class="field"><label for="alt-' + k + '">คำบรรยายรูป (alt) <span class="req" aria-hidden="true">*</span></label>' +
        '<input class="input" id="alt-' + k + '" data-alt="' + k + '" value="' + h(im.alt_text) + '" autocomplete="off"></div></div>' +
        (readOnly ? '' : '<div class="img-btns">' +
          '<button type="button" class="icon-btn icon-btn--sm rot-up" data-img-act="up" data-key="' + k + '" aria-label="เลื่อนรูป ' + h(im.file_name) + ' ขึ้น"' + (idx === 0 ? ' disabled' : '') + '>' + MH.ui.icon('i-arrow') + '</button>' +
          '<button type="button" class="icon-btn icon-btn--sm rot-down" data-img-act="down" data-key="' + k + '" aria-label="เลื่อนรูป ' + h(im.file_name) + ' ลง"' + (idx === list.length - 1 ? ' disabled' : '') + '>' + MH.ui.icon('i-arrow') + '</button>' +
          '<button type="button" class="icon-btn icon-btn--sm icon-btn--danger" data-img-act="del" data-key="' + k + '" aria-label="ลบรูป ' + h(im.file_name) + '">' + MH.ui.icon('i-close') + '</button></div>') +
        '</li>';
    }).join('');
    return '<div class="img-group" role="group" aria-labelledby="ig-' + col + '"><h3 id="ig-' + col + '">' + title + ' <span class="muted">' + hint + '</span></h3>' +
      (list.length ? '<ul class="img-list">' + rows + '</ul>' : '<p class="muted img-empty">ยังไม่มีรูป</p>') +
      (readOnly ? '' : '<div class="field"><div class="btn-row"><button type="button" class="btn btn--outline btn--sm" id="' + addId + '" data-add="' + col + '">เพิ่มรูป' + (col === 'certificate' ? 'ใบรับรอง' : '') + '</button></div></div>') +
      '</div>';
  }

  function imageAct(act, key) {
    var i = -1;
    imgs.forEach(function (x, n) { if (x.key === key) i = n; });
    if (i < 0) return;
    var im = imgs[i], same = imgs.filter(function (x) { return x.collection === im.collection; }), pos = same.indexOf(im);
    if (act === 'del') {
      imgs.splice(i, 1);
      renderImages({ add: im.collection === 'certificate' ? 'img-add-cert' : 'img-add' });
      MH.ui.toast('เอารูปออกจากรายการแล้ว กด “บันทึก” เพื่อยืนยัน');
    } else {
      var other = same[pos + (act === 'up' ? -1 : 1)]; if (!other) return;
      var j = imgs.indexOf(other);
      imgs[i] = other; imgs[j] = im;
      renderImages({ key: key, act: act });
    }
    markDirty();
  }
  function markDirty() { form.dispatchEvent(new Event('change', { bubbles: true })); }

  function openImageDialog(defCol) {
    return new Promise(function (resolve) {
      var d = document.createElement('dialog'); d.className = 'dialog dialog--wide';
      d.setAttribute('aria-labelledby', 'imd-title');
      var used = {}; imgs.forEach(function (i) { used[i.file_name.toLowerCase()] = 1; });
      var n = imgs.filter(function (i) { return i.collection === defCol; }).length + 1, suggest;
      do {
        suggest = rec.code.toLowerCase() + (defCol === 'certificate' ? '-cert' : '') + '-' + n + '.webp'; n++;
      } while (used[suggest]);
      var defArt = defCol === 'certificate' ? 'a-scroll' : ((imgs.filter(isGallery)[0] || {}).art || rec.art || 'a-somdej');
      if (!ART.some(function (a) { return a[0] === defArt; })) defArt = ART[0][0];
      var tone = rec.tone === 'violet' ? ' thumb--violet' : '';
      d.innerHTML = '<form id="imd-form" novalidate><div class="d-body"><h2 id="imd-title">' + (defCol === 'certificate' ? 'เพิ่มรูปใบรับรอง' : 'เพิ่มรูป') + '</h2>' +
        '<p class="muted">ต้นแบบยังไม่อัปโหลดไฟล์จริง เลือกภาพประกอบแทนรูปถ่าย แล้วกรอกชื่อไฟล์และคำบรรยาย</p>' +
        '<fieldset class="field"><legend class="label">ภาพประกอบ</legend><div class="art-pick">' + ART.map(function (a, i) {
          var id = i === 0 ? 'imd-art' : 'imd-art-' + (i + 1);
          return '<label class="art-opt" for="' + id + '"><input type="radio" name="imd-art" id="' + id + '" value="' + a[0] + '"' + (a[0] === defArt ? ' checked' : '') + '>' +
            '<span class="thumb m-thumb' + tone + '" aria-hidden="true">' + MH.ui.art(a[0]) + '</span><span class="art-name">' + h(a[1]) + '</span></label>';
        }).join('') + '</div></fieldset>' +
        '<div class="field"><label for="imd-file">ชื่อไฟล์</label><input class="input" id="imd-file" value="' + h(suggest) + '" autocomplete="off"><p class="hint">ลงท้ายด้วย .jpg .png หรือ .webp</p></div>' +
        '<div class="field"><label for="imd-alt">คำบรรยายรูป (alt)</label><input class="input" id="imd-alt" autocomplete="off"><p class="hint">บอกว่าในรูปเห็นอะไร สำหรับคนที่มองไม่เห็นรูป และเผื่อรูปโหลดไม่ขึ้น</p></div>' +
        '<div class="field"><label for="imd-col">ที่เก็บรูป</label><select class="select" id="imd-col"><option value="gallery">รูปแกลเลอรี</option><option value="certificate">รูปใบรับรอง</option></select></div>' +
        '</div><div class="d-foot"><button type="button" class="btn btn--outline" data-cancel>ยกเลิก</button><button type="submit" class="btn btn--primary">เพิ่มรูป</button></div></form>';
      document.body.appendChild(d);
      var f = d.querySelector('#imd-form'), done = false;
      d.querySelector('#imd-col').value = defCol;
      function finish(v) { if (done) return; done = true; resolve(v); }
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var file = $('imd-file').value.trim(), alt = $('imd-alt').value.trim(), errs = [];
        if (!file) errs.push({ field: 'imd-file', msg: 'กรอกชื่อไฟล์' });
        else if (!/^[A-Za-z0-9._-]+\.(jpg|jpeg|png|webp)$/i.test(file)) errs.push({ field: 'imd-file', msg: 'ชื่อไฟล์ใช้ได้เฉพาะ a-z 0-9 . _ - และต้องลงท้ายด้วย .jpg .png หรือ .webp' });
        else if (used[file.toLowerCase()]) errs.push({ field: 'imd-file', msg: 'ชื่อไฟล์นี้มีในรายการแล้ว ใช้ชื่ออื่น' });
        if (!alt) errs.push({ field: 'imd-alt', msg: 'กรอกคำบรรยายรูป บอกว่าในรูปเห็นอะไร' });
        else if (alt.length > 200) errs.push({ field: 'imd-alt', msg: 'คำบรรยายยาวเกิน 200 ตัวอักษร' });
        if (!A.showErrors(f, errs)) return;
        finish({ collection: $('imd-col').value, file_name: file, alt_text: alt, art: f.querySelector('input[name="imd-art"]:checked').value });
        d.close();
      });
      d.querySelector('[data-cancel]').addEventListener('click', function () { finish(null); d.close(); });
      d.addEventListener('cancel', function () { finish(null); });
      d.addEventListener('close', function () { finish(null); setTimeout(function () { d.remove(); }, 0); });
      d.showModal();
      $('imd-alt').focus();
    });
  }
  function addImage(col) {
    openImageDialog(col).then(function (res) {
      if (!res) return;
      var key = 'i' + (++seq);
      imgs.push({ key: key, id: null, collection: res.collection, file_name: res.file_name, alt_text: res.alt_text, art: res.art, sort_order: 0 });
      renderImages({ alt: 'alt-' + key });
      markDirty();
      MH.ui.toast('เพิ่มรูปในรายการแล้ว กด “บันทึก” เพื่อเก็บถาวร');
    });
  }

  /* ---------- เหตุการณ์ ---------- */
  function onInput(e) {
    var k = e.target.getAttribute && e.target.getAttribute('data-alt');
    if (k) imgs.forEach(function (im) { if (im.key === k) im.alt_text = e.target.value; });
    updateReady(); updateBuyState();
  }
  function onChange(e) {
    if (e.target.name === 'prov') {
      var cert = e.target.value === 'certified';
      $('sec-cert').hidden = !cert;
      renderImages();
    }
    updateReady(); updateBuyState();
  }
  function onClick(e) {
    var b = e.target.closest('button'); if (!b || b.disabled) return;
    var act = b.getAttribute('data-act');
    if (act === 'publish') return doSave('publish');
    if (act === 'archive') return doArchive();
    if (act === 'trash') return doTrash();
    var ia = b.getAttribute('data-img-act');
    if (ia) return imageAct(ia, b.getAttribute('data-key'));
    var add = b.getAttribute('data-add');
    if (add) addImage(add);
  }

  /* ---------- บันทึก ---------- */
  function persistImages(ownerId) {
    var count = { gallery: 0, certificate: 0 };
    imgs.forEach(function (im) { count[im.collection]++; im.sort_order = count[im.collection]; });
    var before = {}; orig.forEach(function (o) { before[o.id] = o; });
    imgs.forEach(function (im) {
      if (im.id) {
        var o = before[im.id], patch = {};
        ['collection', 'file_name', 'alt_text', 'art', 'sort_order'].forEach(function (k) { if (o[k] !== im[k]) patch[k] = im[k]; });
        if (Object.keys(patch).length) S.update('media', im.id, patch, 'update');
      } else {
        var row = S.insert('media', { owner_type: 'amulets', owner_id: ownerId, collection: im.collection, file_name: im.file_name, alt_text: im.alt_text, art: im.art, sort_order: im.sort_order });
        im.id = row.id;
      }
    });
    orig.forEach(function (o) { if (!imgs.some(function (im) { return im.id === o.id; })) S.remove('media', o.id); });
  }

  function persist(v, mode) {
    var certified = v.provenance_type === 'certified', gal = imgs.filter(isGallery)[0], now = new Date().toISOString();
    var fields = {
      category_id: v.category_id, slug: v.slug, name: v.name, provenance_type: v.provenance_type,
      temple_name: v.temple_name, maker: v.maker, edition_name: v.edition_name,
      edition_year_ce: v.year_raw ? Number(v.year_raw) - 543 : null,
      certificate_issuer: certified ? v.certificate_issuer : '', certificate_no: certified ? v.certificate_no : '',
      material: v.material, size_text: v.size_text, belief_text: v.belief_text, description: v.description,
      stock_status: v.stock_status, art: gal ? gal.art : null,
      price_amount: v.price_raw === '' ? null : Number(v.price_raw), is_price_visible: v.price_visible, stock_qty: /^\d+$/.test(v.stock_raw) ? Number(v.stock_raw) : 0
    };
    var id = rec.id;
    if (!id) {
      id = S.insert('amulets', Object.assign({
        code: nextCode(), price_amount: null, is_price_visible: false, status: 'draft', published_at: null,
        is_featured: false, featured_order: null, tone: 'amber'
      }, fields)).id;
      if (mode === 'publish') S.update('amulets', id, { status: 'published', published_at: now }, 'publish');
    } else if (mode === 'publish') {
      S.update('amulets', id, Object.assign(fields, { status: 'published', published_at: rec.published_at || now }), 'publish');
    } else {
      S.update('amulets', id, fields, 'update');
    }
    persistImages(id);
    return id;
  }

  function doSave(mode) {
    if (readOnly) return;
    if (!rec.id ? !can.create : !can.edit) { MH.ui.toast('บทบาทนี้บันทึกไม่ได้'); return; }
    if (mode === 'publish' && !can.publish) { MH.ui.toast('บทบาทนี้เผยแพร่ไม่ได้'); return; }
    var v = collect(), errs = basicErrors(v);
    if (mode === 'publish' || rec.status === 'published') {
      var seen = {}; errs.forEach(function (e) { seen[e.field] = 1; });
      publishItems(v).forEach(function (it) { it.errs.forEach(function (e) { if (!seen[e.field]) { seen[e.field] = 1; errs.push(e); } }); });
    }
    if (!A.showErrors(form, sortByDom(errs))) return;
    var wasNew = !rec.id, id = persist(v, mode);
    guard.clean();
    if (wasNew) { location.replace('amulet-edit.html?id=' + id + '&done=' + mode); return; }
    MH.ui.toast(mode === 'publish' ? 'เผยแพร่แล้ว' : 'บันทึกแล้ว');
    init();
    window.scrollTo(0, 0);
  }

  function doArchive() {
    var featured = (S.setting('featured_amulets') || []).indexOf(rec.id) >= 0;
    MH.ui.confirm({
      title: 'เลิกเผยแพร่และเก็บ ' + rec.code,
      body: 'หน้าวัตถุมงคลนี้จะหายจากเว็บทันที เผยแพร่กลับมาใหม่ได้ภายหลัง' +
        (featured ? ' ชิ้นนี้อยู่ในรายการแนะนำหน้าแรก จะไม่แสดงจนกว่าจะเผยแพร่ใหม่ (เอาออกได้ที่หน้า “หน้าแรก”)' : '') +
        (guard.isDirty() ? ' การแก้ไขในฟอร์มที่ยังไม่บันทึกจะไม่ถูกเก็บ' : ''),
      okLabel: 'เลิกเผยแพร่และเก็บ', danger: true
    }).then(function (ok) {
      if (!ok) return;
      S.update('amulets', rec.id, { status: 'archived' }, 'archive');
      guard.clean();
      MH.ui.toast('เก็บ ' + rec.code + ' แล้ว');
      init();
      window.scrollTo(0, 0);
    });
  }

  function doTrash() {
    MH.ui.confirm({
      title: 'ย้าย ' + rec.code + ' ไปถังขยะ',
      body: 'วัตถุมงคลนี้จะหายจากรายการและเว็บ กู้คืนได้จากถังขยะ' + (rec.status === 'published' ? ' หน้าที่เผยแพร่อยู่จะเปิดไม่ได้ทันที' : ''),
      okLabel: 'ย้ายไปถังขยะ', danger: true
    }).then(function (ok) {
      if (!ok) return;
      S.remove('amulets', rec.id);
      guard.clean();
      location.href = 'amulets.html?moved=' + encodeURIComponent(rec.code);
    });
  }

  init();
  var done = MH.util.param('done');
  if (done && rec && rec.id) {
    MH.ui.toast(done === 'publish' ? 'เผยแพร่แล้ว' : 'บันทึกฉบับร่างแล้ว');
    try { history.replaceState(null, '', location.pathname + '?id=' + rec.id); } catch (e) { /* ไม่เป็นไร */ }
  }
})();
