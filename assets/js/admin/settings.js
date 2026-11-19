/* หลังบ้าน: ตั้งค่าเว็บ — ชื่อ ช่องทางติดต่อ คำชี้แจง คำต้องห้าม และโหมดปิดปรับปรุง
   โหมดปิดปรับปรุงมีผลทันทีที่สลับสวิตช์ (ไม่รอกดบันทึก) ส่วนที่เหลือบันทึกทีละ key ด้วย MH.store.setSetting */
(function () {
  'use strict';
  var MH = window.MH; if (!MH.admin.allowed) return;
  var h = MH.util.h, A = MH.admin, S = MH.store;
  function $(id) { return document.getElementById(id); }

  var root = $('root'), form, guard, words = [];
  var URL_RE = /^https:\/\/[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(:\d+)?(\/\S*)?$/i;
  var LINE_RE = /^@[A-Za-z0-9._-]{3,}$/;

  function renderBar() {
    var on = !!S.setting('maintenance_mode');
    $('maint-bar').innerHTML = on
      ? '<div class="notice notice--danger maint-bar" role="status"><span><b>เว็บอยู่ในโหมดปิดปรับปรุง</b> ผู้เข้าชมทั่วไปเห็นหน้า “ปิดปรับปรุง” · ทีมงานที่ล็อกอินหลังบ้านอยู่ยังเห็นหน้าเว็บตามปกติ</span>' +
        '<button type="button" class="btn btn--sm btn--outline" id="maint-off">เปิดเว็บกลับมา</button></div>'
      : '';
    var off = $('maint-off');
    if (off) off.addEventListener('click', function () { setMaintenance(false); });
    var sw = $('f-maint'); if (sw) sw.checked = on;
  }
  function setMaintenance(on) {
    S.setSetting('maintenance_mode', on);
    renderBar();
    MH.ui.toast(on ? 'เปิดโหมดปิดปรับปรุงแล้ว' : 'ปิดโหมดปิดปรับปรุงแล้ว เว็บเปิดให้ทุกคนเข้าชม');
  }

  function render() {
    words = (S.setting('banned_words') || []).slice();
    function txt(id, label, key, hint, ph) {
      return '<div class="field"><label for="' + id + '">' + label + '</label><input class="input" id="' + id + '" value="' + h(S.setting(key) || '') + '" autocomplete="off"' + (ph ? ' placeholder="' + ph + '"' : '') + '>' +
        (hint ? '<p class="hint">' + hint + '</p>' : '') + '</div>';
    }
    root.innerHTML = '<form id="set-form" novalidate>' +
      '<section class="form-section" aria-labelledby="s-site"><h2 id="s-site">ข้อมูลเว็บไซต์</h2>' +
      '<p class="hint">ใช้ในส่วนหัว ส่วนท้าย และปุ่มสอบถามทาง LINE ของทุกหน้า</p><div class="form-grid">' +
        txt('f-site-name', 'ชื่อเว็บไซต์', 'site_name', 'แสดงที่มุมซ้ายบนของทุกหน้า') +
        txt('f-site-tagline', 'คำโปรยใต้ชื่อเว็บ', 'site_tagline', 'ประโยคสั้น ๆ บอกว่าเว็บนี้คืออะไร') +
        txt('f-site-url', 'ที่อยู่เว็บไซต์', 'site_url', 'ต้องขึ้นต้นด้วย https:// เช่น https://mahasart.net', 'https://mahasart.net') +
        txt('f-line', 'LINE Official Account', 'line_oa_id', 'ขึ้นต้นด้วย @ เช่น @mahasart ปุ่มสอบถามทุกปุ่มจะชี้มาที่ไอดีนี้', '@mahasart') +
      '</div></section>' +

      '<section class="form-section" aria-labelledby="s-disc"><h2 id="s-disc">คำชี้แจงท้ายหน้า</h2>' +
      '<p class="hint">ข้อความนี้แสดงที่ท้ายหน้าดูดวงและหน้าวัตถุมงคลทุกหน้า เขียนให้ชัดว่าเป็นไปตามความเชื่อ ไม่รับประกันผล</p>' +
      '<div class="field"><label for="f-disc">คำชี้แจง</label><textarea class="textarea textarea--short" id="f-disc">' + h(S.setting('disclaimer') || '') + '</textarea></div></section>' +

      '<section class="form-section" aria-labelledby="s-ban"><h2 id="s-ban">คำต้องห้าม</h2>' +
      '<p class="hint">ใช้ตรวจชื่อ ความเชื่อ รายละเอียดวัตถุมงคล และเนื้อบทความก่อนเผยแพร่ ถ้าพบคำเหล่านี้จะเผยแพร่ไม่ได้จนกว่าจะแก้ ถ้ามีคำว่า “ไม่” นำหน้า เช่น “ไม่รับประกันผล” ระบบจะไม่นับ</p>' +
      '<div class="field"><label for="bw-new">เพิ่มคำต้องห้าม</label><div class="bw-add"><input class="input" id="bw-new" autocomplete="off" placeholder="เช่น รับประกัน">' +
        '<button type="button" class="btn btn--outline" id="bw-add">เพิ่มคำ</button></div></div>' +
      '<ul class="bw-list" id="bw-list" aria-label="คำต้องห้ามทั้งหมด"></ul></section>' +

      '<section class="form-section" aria-labelledby="s-counter"><h2 id="s-counter">ตัวนับการเข้าชม</h2>' +
      '<p class="hint">หลังบ้านเห็นตัวนับที่แดชบอร์ดเสมอ ตัวเลือกนี้กำหนดว่าจะแสดงที่ท้ายหน้าเว็บสาธารณะด้วยหรือไม่</p>' +
      '<label class="check" for="f-counter"><input type="checkbox" id="f-counter"' + (S.setting('show_public_counter') ? ' checked' : '') + '><span>แสดงตัวนับ (ออนไลน์ · วันนี้ · สัปดาห์นี้ · เดือนนี้ · ทั้งหมด) ที่ท้ายหน้าเว็บ</span></label></section>' +

      '<section class="form-section maint" aria-labelledby="s-maint"><h2 id="s-maint">โหมดปิดปรับปรุง</h2>' +
      '<p class="hint">เปิดเมื่อต้องซ่อมหรืออัปเดตเว็บ ผู้เข้าชมทั่วไปจะเห็นหน้า “ปิดปรับปรุง” แทนทุกหน้า</p>' +
      '<div class="notice" role="note">ทีมงานที่ล็อกอินหลังบ้านอยู่ยังเห็นหน้าเว็บตามปกติ จึงตรวจงานระหว่างปิดได้ · สวิตช์นี้มีผลทันที ไม่ต้องกดบันทึก</div>' +
      '<label class="switch-wrap" for="f-maint"><input type="checkbox" role="switch" class="switch" id="f-maint"><span>เปิดโหมดปิดปรับปรุง</span></label></section>' +

      '<div class="form-actions"><button type="submit" class="btn btn--primary">บันทึกการตั้งค่า</button>' +
      '<button type="button" class="btn btn--outline" id="reset-btn">ยกเลิกการแก้ไข</button></div></form>';

    form = $('set-form');
    A.counter($('f-site-name'), 40);
    A.counter($('f-site-tagline'), 80);
    A.counter($('f-disc'), 200);
    drawWords();
    renderBar();
    guard = A.dirtyGuard(form);

    form.addEventListener('submit', function (e) { e.preventDefault(); save(); });
    $('bw-add').addEventListener('click', addWord);
    $('bw-new').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addWord(); } });
    $('bw-list').addEventListener('click', function (e) {
      var b = e.target.closest('[data-bw]'); if (!b) return;
      var i = Number(b.getAttribute('data-bw')), w = words[i];
      words.splice(i, 1); drawWords();
      var next = $('bw-list').querySelectorAll('[data-bw]');
      (next[Math.min(i, next.length - 1)] || $('bw-new')).focus();
      markDirty();
      MH.ui.toast('เอา “' + w + '” ออกแล้ว กด “บันทึก” เพื่อยืนยัน');
    });
    $('f-maint').addEventListener('change', function (e) {
      e.stopPropagation(); /* มีผลทันที ไม่นับเป็น “ยังไม่บันทึก” ของฟอร์ม */
      var sw = e.target;
      if (!sw.checked) { setMaintenance(false); return; }
      MH.ui.confirm({
        title: 'เปิดโหมดปิดปรับปรุง?',
        body: 'ผู้เข้าชมทั่วไปจะเห็นหน้า “ปิดปรับปรุง” ทันที จนกว่าจะปิดโหมดนี้ ทีมงานที่ล็อกอินหลังบ้านอยู่ยังเห็นหน้าเว็บตามปกติ',
        okLabel: 'เปิดโหมดปิดปรับปรุง', danger: true
      }).then(function (ok) { if (ok) setMaintenance(true); else sw.checked = false; });
    });
    $('reset-btn').addEventListener('click', function () {
      if (!guard.isDirty()) { MH.ui.toast('ยังไม่มีอะไรเปลี่ยน'); return; }
      MH.ui.confirm({ title: 'ยกเลิกการแก้ไข', body: 'ค่าที่แก้ไว้แต่ยังไม่บันทึกจะหายไป', okLabel: 'ยกเลิกการแก้ไข', danger: true }).then(function (ok) {
        if (ok) { guard.clean(); render(); }
      });
    });
  }

  function markDirty() { form.dispatchEvent(new Event('change', { bubbles: true })); }
  function drawWords() {
    $('bw-list').innerHTML = words.length ? words.map(function (w, i) {
      return '<li class="bw"><span>' + h(w) + '</span><button type="button" data-bw="' + i + '" aria-label="เอาคำ ' + h(w) + ' ออก">×</button></li>';
    }).join('') : '<li class="muted">ยังไม่มีคำต้องห้าม ระบบจะไม่ตรวจคำใดก่อนเผยแพร่</li>';
  }
  function addWord() {
    var w = $('bw-new').value.trim(), msg = '';
    if (!w) msg = 'พิมพ์คำที่จะเพิ่ม';
    else if (w.length > 30) msg = 'คำยาวเกิน 30 ตัวอักษร ใส่เฉพาะคำหรือวลีสั้น ๆ';
    else if (words.some(function (x) { return x.toLowerCase() === w.toLowerCase(); })) msg = 'มีคำว่า “' + w + '” อยู่แล้ว';
    if (!A.showErrors(form, msg ? [{ field: 'bw-new', msg: msg }] : [])) return;
    words.push(w); drawWords();
    $('bw-new').value = ''; $('bw-new').focus();
    markDirty();
    MH.ui.toast('เพิ่มคำว่า “' + w + '” แล้ว กด “บันทึก” เพื่อยืนยัน');
  }

  function save() {
    var v = {
      site_name: $('f-site-name').value.trim(), site_tagline: $('f-site-tagline').value.trim(),
      site_url: $('f-site-url').value.trim(), line_oa_id: $('f-line').value.trim(), disclaimer: $('f-disc').value.trim()
    }, errs = [];
    if (!v.site_name) errs.push({ field: 'f-site-name', msg: 'กรอกชื่อเว็บไซต์' });
    else if (v.site_name.length > 40) errs.push({ field: 'f-site-name', msg: 'ชื่อเว็บยาวเกิน 40 ตัวอักษร (ตอนนี้ ' + v.site_name.length + ')' });
    if (!v.site_tagline) errs.push({ field: 'f-site-tagline', msg: 'กรอกคำโปรยใต้ชื่อเว็บ' });
    else if (v.site_tagline.length > 80) errs.push({ field: 'f-site-tagline', msg: 'คำโปรยยาวเกิน 80 ตัวอักษร (ตอนนี้ ' + v.site_tagline.length + ')' });
    if (!v.site_url) errs.push({ field: 'f-site-url', msg: 'กรอกที่อยู่เว็บไซต์ เช่น https://mahasart.net' });
    else if (v.site_url.toLowerCase().indexOf('https://') !== 0) errs.push({ field: 'f-site-url', msg: 'ที่อยู่เว็บต้องขึ้นต้นด้วย https:// (เว็บจริงต้องใช้การเข้ารหัส)' });
    else if (!URL_RE.test(v.site_url)) errs.push({ field: 'f-site-url', msg: 'ที่อยู่เว็บไม่ถูกรูปแบบ ตรวจชื่อโดเมน เช่น https://mahasart.net' });
    if (!v.line_oa_id) errs.push({ field: 'f-line', msg: 'กรอกไอดี LINE Official Account เช่น @mahasart' });
    else if (v.line_oa_id.charAt(0) !== '@') errs.push({ field: 'f-line', msg: 'ไอดี LINE ต้องขึ้นต้นด้วย @ เช่น @mahasart' });
    else if (!LINE_RE.test(v.line_oa_id)) errs.push({ field: 'f-line', msg: 'ไอดี LINE ใช้ได้เฉพาะ a-z 0-9 จุด ขีดกลาง ขีดล่าง และยาวอย่างน้อย 3 ตัวหลัง @' });
    if (!v.disclaimer) errs.push({ field: 'f-disc', msg: 'กรอกคำชี้แจงท้ายหน้า' });
    else if (v.disclaimer.length > 200) errs.push({ field: 'f-disc', msg: 'คำชี้แจงยาวเกิน 200 ตัวอักษร (ตอนนี้ ' + v.disclaimer.length + ') ตัดให้สั้นลง' });
    else if (MH.util.bannedIn(v.disclaimer).length) errs.push({ field: 'f-disc', msg: 'คำชี้แจงมีคำต้องห้าม: ' + MH.util.bannedIn(v.disclaimer).join(', ') });
    if (!A.showErrors(form, errs)) return;

    v.site_url = v.site_url.replace(/\/+$/, '');
    var changed = 0;
    ['site_name', 'site_tagline', 'site_url', 'line_oa_id', 'disclaimer'].forEach(function (k) {
      if (S.setting(k) !== v[k]) changed++;
      S.setSetting(k, v[k]);
    });
    var showCounter = $('f-counter').checked;
    if (!!S.setting('show_public_counter') !== showCounter) changed++;
    S.setSetting('show_public_counter', showCounter);
    if (JSON.stringify(S.setting('banned_words') || []) !== JSON.stringify(words)) changed++;
    S.setSetting('banned_words', words.slice());
    guard.clean();
    MH.ui.toast(changed ? 'บันทึกการตั้งค่าแล้ว' : 'ยังไม่มีอะไรเปลี่ยน');
    render();
  }

  render();
})();
