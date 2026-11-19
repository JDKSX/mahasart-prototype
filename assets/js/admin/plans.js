/* แพ็กเกจสมาชิกหลังบ้าน: แก้ชื่อ ราคา โควตา AI จำนวนบันทึก ส่วนลดนัด สิทธิประโยชน์ · รายชื่อ subscription
   เปลี่ยนราคามีผลกับรอบบิลถัดไปของสมาชิกเดิม (ถามยืนยันก่อนบันทึกพร้อมบอกจำนวนคนที่กระทบ) */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h;
  if (!MH.admin.allowed) return;
  var host = document.getElementById('plans-host');

  /* ---------- ฟอร์มแพ็กเกจ ---------- */
  function activeCount(key) { return MH.store.all('subscriptions').filter(function (s) { return s.plan_key === key && s.status === 'active'; }).length; }

  function formHtml(p) {
    var k = p.key, free = !p.price_month && k === 'free';
    return '<form class="form-section crs-plan-form" data-key="' + h(k) + '" novalidate aria-labelledby="pl-h-' + h(k) + '">' +
      '<h2 id="pl-h-' + h(k) + '">' + h(p.name) + ' <span class="tag">' + h(k) + '</span></h2>' +
      '<p class="hint">' + (free ? 'แพ็กเกจฟรี ราคาแก้ไม่ได้' : 'ผู้สมัครตอนนี้ ' + activeCount(k) + ' คน (สถานะใช้งานอยู่)') + '</p>' +
      '<div class="form-grid">' +
        '<div class="field"><label for="pl-' + k + '-name">ชื่อแพ็กเกจ</label><input class="input" id="pl-' + k + '-name" type="text" maxlength="60" autocomplete="off" value="' + h(p.name) + '"></div>' +
        '<div class="field"><label for="pl-' + k + '-price">ราคาต่อเดือน (บาท)</label><input class="input" id="pl-' + k + '-price" type="number" min="0" step="1" inputmode="numeric" value="' + h(p.price_month) + '"' + (free ? ' disabled' : '') + '></div>' +
        '<div class="field"><label for="pl-' + k + '-ai">โควตาถาม Mahasart AI (คำถามต่อวัน)</label><input class="input" id="pl-' + k + '-ai" type="number" min="0" step="1" inputmode="numeric" value="' + h(p.ai_daily_quota) + '"></div>' +
        '<div class="field"><label for="pl-' + k + '-save">จำนวนผลดูดวงที่บันทึกได้</label><input class="input" id="pl-' + k + '-save" type="number" min="1" step="1" inputmode="numeric" value="' + h(p.save_limit == null ? '' : p.save_limit) + '" placeholder="เว้นว่าง = ไม่จำกัด"><p class="hint">เว้นว่างไว้ = ไม่จำกัด</p></div>' +
        '<div class="field"><label for="pl-' + k + '-disc">ส่วนลดเมื่อจองผู้เชี่ยวชาญ (%)</label><input class="input" id="pl-' + k + '-disc" type="number" min="0" max="100" step="1" inputmode="numeric" value="' + h(Math.round((p.booking_discount || 0) * 100)) + '"></div>' +
        '<div class="field"><label for="pl-' + k + '-course">สิทธิ์เรียนคอร์ส (ข้อความในตารางเปรียบเทียบ)</label><input class="input" id="pl-' + k + '-course" type="text" maxlength="120" autocomplete="off" value="' + h(p.course_access || '') + '"></div>' +
        '<div class="field full"><label for="pl-' + k + '-feats">รายการสิทธิประโยชน์ (หนึ่งบรรทัดต่อหนึ่งข้อ)</label><textarea class="textarea" id="pl-' + k + '-feats" rows="6" aria-describedby="pl-' + k + '-feats-h">' + h((p.features || []).join('\n')) + '</textarea><p class="hint" id="pl-' + k + '-feats-h">ข้อความอิสระที่ขึ้นบนการ์ดแพ็กเกจ ถ้าแก้โควตา AI หรือส่วนลดด้านบน ให้แก้ตัวเลขในข้อความนี้ให้ตรงกันด้วย (ตารางเปรียบเทียบดึงตัวเลขจากช่องด้านบนอัตโนมัติ)</p></div>' +
      '</div><div class="form-actions"><button type="submit" class="btn btn--primary">บันทึกแพ็กเกจ' + (free ? '' : ' (มีผลรอบบิลถัดไปของสมาชิกเดิม)') + '</button></div></form>';
  }

  function renderPlans() {
    var plans = MH.store.all('plans').sort(function (a, b) { return a.price_month - b.price_month; });
    host.innerHTML = plans.length ? plans.map(formHtml).join('') : MH.ui.empty('ยังไม่มีแพ็กเกจ', 'ไม่พบข้อมูลแพ็กเกจในระบบ');
  }

  function isInt(s) { return /^\d+$/.test(String(s).trim()); }

  host.addEventListener('submit', function (e) {
    var form = e.target.closest('form[data-key]'); if (!form) return;
    e.preventDefault();
    var k = form.getAttribute('data-key'), p = MH.q.plan(k);
    var $ = function (s) { return document.getElementById('pl-' + k + '-' + s); };
    var errs = [];
    var name = $('name').value.trim(), price = $('price').value.trim(), ai = $('ai').value.trim(), save = $('save').value.trim(), disc = $('disc').value.trim();
    var feats = $('feats').value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean), courseAcc = $('course').value.trim();
    if (!name) errs.push({ field: 'pl-' + k + '-name', msg: 'ใส่ชื่อแพ็กเกจ' });
    if (!$('price').disabled && !isInt(price)) errs.push({ field: 'pl-' + k + '-price', msg: 'ราคาต้องเป็นจำนวนเต็มบาท 0 ขึ้นไป' });
    if (!$('price').disabled && isInt(price) && Number(price) < 1) errs.push({ field: 'pl-' + k + '-price', msg: 'แพ็กเกจที่เก็บเงินต้องตั้งราคาตั้งแต่ 1 บาท' });
    if (!isInt(ai)) errs.push({ field: 'pl-' + k + '-ai', msg: 'โควตา AI ต้องเป็นจำนวนเต็ม 0 ขึ้นไป' });
    if (save && (!isInt(save) || Number(save) < 1)) errs.push({ field: 'pl-' + k + '-save', msg: 'จำนวนที่บันทึกได้ต้องเป็นจำนวนเต็มตั้งแต่ 1 หรือเว้นว่างเพื่อไม่จำกัด' });
    if (!isInt(disc) || Number(disc) > 100) errs.push({ field: 'pl-' + k + '-disc', msg: 'ส่วนลดต้องเป็นจำนวนเต็ม 0–100 (เปอร์เซ็นต์)' });
    if (!feats.length) errs.push({ field: 'pl-' + k + '-feats', msg: 'ใส่สิทธิประโยชน์อย่างน้อย 1 ข้อ' });
    var banned = MH.util.bannedIn([name, courseAcc].concat(feats).join('\n'));
    if (banned.length) errs.push({ field: 'pl-' + k + '-feats', msg: 'มีคำต้องห้าม ' + banned.map(function (w) { return '“' + w + '”'; }).join(' ') + ' ลบหรือเปลี่ยนคำนี้ก่อน' });
    if (!MH.admin.showErrors(form, errs)) return;

    var patch = { name: name, ai_daily_quota: Number(ai), save_limit: save ? Number(save) : null, booking_discount: Number(disc) / 100, course_access: courseAcc, features: feats };
    if (!$('price').disabled) patch.price_month = Number(price);
    var priceChanged = patch.price_month != null && patch.price_month !== p.price_month, affected = activeCount(k);

    function commit() {
      MH.store.update('plans', p.id, patch, 'update');
      MH.ui.toast(priceChanged && affected ? 'บันทึกแล้ว ราคาใหม่มีผลรอบบิลถัดไปของสมาชิก ' + affected + ' คน' : 'บันทึกแพ็กเกจแล้ว');
      renderPlans();
    }
    if (priceChanged) {
      MH.ui.confirm({
        title: 'เปลี่ยนราคาแพ็กเกจ',
        body: 'ราคาจาก ' + MH.money(p.price_month) + ' เป็น ' + MH.money(patch.price_month) + ' ต่อเดือน' +
          (affected ? ' · สมาชิกที่ใช้อยู่ ' + affected + ' คนจะถูกเรียกเก็บราคาใหม่ในรอบบิลถัดไป (รอบที่จ่ายแล้วไม่เปลี่ยน)' : ' · ตอนนี้ยังไม่มีสมาชิกใช้งานแพ็กเกจนี้') + ' ต้องการบันทึกหรือไม่',
        okLabel: 'บันทึกราคาใหม่'
      }).then(function (ok) { if (ok) commit(); });
    } else commit();
  });

  /* ---------- รายชื่อ subscription ---------- */
  var SUB_ST = [['all', 'ทั้งหมด'], ['active', 'ใช้งานอยู่'], ['cancelled', 'ยกเลิกต่ออายุ'], ['pending_payment', 'รอชำระ'], ['expired', 'หมดอายุ']];
  var PILL = { active: 'published', cancelled: 'scheduled', pending_payment: 'in_review', expired: 'archived' };
  var sst = MH.util.param('status');
  var sub = { status: SUB_ST.some(function (s) { return s[0] === sst; }) ? sst : 'all', q: '' };
  var chipsEl = document.getElementById('sub-chips'), qEl = document.getElementById('sub-q'), listEl = document.getElementById('sub-list'), metaEl = document.getElementById('sub-meta');
  chipsEl.innerHTML = SUB_ST.map(function (s) { return '<button type="button" class="chip" data-st="' + s[0] + '" aria-pressed="false">' + h(s[1]) + ' <span class="n">0</span></button>'; }).join('');

  function renderSubs() {
    var members = {}; MH.store.all('members', { withTrashed: true }).forEach(function (m) { members[m.id] = m; });
    var all = MH.store.all('subscriptions').filter(function (s) {
      if (!sub.q) return true;
      var m = members[s.member_id], t = sub.q.toLowerCase();
      return !!m && (String(m.display_name).toLowerCase().indexOf(t) >= 0 || String(m.email).toLowerCase().indexOf(t) >= 0);
    });
    var cnt = { all: all.length }; all.forEach(function (s) { cnt[s.status] = (cnt[s.status] || 0) + 1; });
    chipsEl.querySelectorAll('.chip').forEach(function (b) {
      var s = b.getAttribute('data-st'); b.setAttribute('aria-pressed', String(s === sub.status)); b.querySelector('.n').textContent = cnt[s] || 0;
    });
    var rows = all.filter(function (s) { return sub.status === 'all' || s.status === sub.status; }).sort(function (a, b) { return b.id - a.id; });
    if (!rows.length) {
      listEl.innerHTML = MH.ui.empty(sub.status === 'all' && !sub.q ? 'ยังไม่มีผู้สมัครแพ็กเกจ' : 'ไม่พบรายการตามตัวกรองนี้', sub.status === 'all' && !sub.q ? 'เมื่อสมาชิกสมัครพรีเมียม รายการจะขึ้นที่นี่' : 'ลองเลือกสถานะอื่นหรือล้างคำค้น');
      metaEl.textContent = all.length ? 'แสดง 0 จาก ' + all.length + ' รายการ' : ''; return;
    }
    metaEl.textContent = 'แสดง ' + rows.length + ' จาก ' + all.length + ' รายการ';
    listEl.innerHTML = '<div class="table-wrap"><table class="table table--stack"><caption class="sr-only">รายชื่อผู้สมัครแพ็กเกจ</caption><thead><tr>' +
      '<th scope="col">สมาชิก</th><th scope="col">แพ็กเกจ</th><th scope="col">สถานะ</th><th scope="col">เริ่ม</th><th scope="col">ต่ออายุ / ใช้ได้ถึง</th></tr></thead><tbody>' +
      rows.map(function (s) {
        var m = members[s.member_id], pl = MH.q.plan(s.plan_key);
        var until = s.renews_at ? h(MH.util.dateShort(s.renews_at)) + (s.status === 'cancelled' ? '<span class="cell-sub">ยกเลิกเมื่อ ' + h(MH.util.dateShort(s.cancelled_at)) + ' · ใช้ได้ถึงวันนี้</span>' : '') : '<span class="muted">-</span>';
        return '<tr><td class="cell-title"><b>' + (m ? h(m.display_name) : 'สมาชิก #' + s.member_id) + '</b><span class="cell-sub">' + (m ? h(m.email) : '') + '</span></td>' +
          '<td data-label="แพ็กเกจ">' + h(pl ? pl.name : s.plan_key) + '</td>' +
          '<td data-label="สถานะ"><span class="pill pill--' + (PILL[s.status] || 'draft') + '">' + h(MH.labels.subscriptionStatus[s.status] || s.status) + '</span></td>' +
          '<td data-label="เริ่ม">' + (s.started_at ? h(MH.util.dateShort(s.started_at)) : '<span class="muted">ยังไม่เริ่ม</span>') + '</td>' +
          '<td data-label="ต่ออายุ">' + until + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  chipsEl.addEventListener('click', function (e) { var b = e.target.closest('[data-st]'); if (!b) return; sub.status = b.getAttribute('data-st'); renderSubs(); });
  qEl.addEventListener('input', function () { sub.q = qEl.value.trim(); renderSubs(); });

  renderPlans();
  renderSubs();
})();
