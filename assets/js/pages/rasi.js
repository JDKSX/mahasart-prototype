/* ราศีจากวันเกิด: ฟอร์มวัน/เดือน · ตรวจวันที่ไม่มีจริง · แสดงผลและเตือนรอยต่อ (ไม่บันทึก ไม่ใส่ URL) */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h, A = MH.astro;
  var MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  var SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var MAXD = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; // 29 ก.พ. ยอมรับ (ไม่ใช้ปี)

  var rs = A.ruleset();
  document.querySelectorAll('[data-ruleset]').forEach(function (el) { el.textContent = rs ? rs.name : 'ยังไม่ได้เลือกตำรา'; });
  document.querySelectorAll('[data-disclaimer]').forEach(function (el) { el.textContent = MH.store.setting('disclaimer') || ''; });
  if (!MH.q.isLive(MH.q.article('thai-vs-western-rasi'))) document.getElementById('vs-link').hidden = true;

  var form = document.getElementById('rasi-form'), daySel = document.getElementById('r-day'), monthSel = document.getElementById('r-month');
  var out = document.getElementById('rasi-result');
  var HINT = '<div class="result-hint">เลือกวันและเดือนเกิด แล้วกด “ดูราศี” ผลจะขึ้นตรงนี้</div>';
  /* ข้อความใต้ฟอร์มต้องตรงกับปุ่มบันทึกผล: ไม่เก็บเอง แต่ถ้าสมาชิกกดบันทึกจะเก็บเฉพาะวันและเดือนเกิด */
  var formNote = form.querySelector('.fine-print');
  if (formNote) formNote.textContent = 'คำนวณในเบราว์เซอร์ของคุณ ไม่ส่งข้อมูลออกไปไหน และไม่บันทึกวันเกิดเอง ถ้าสมาชิกกด “บันทึกผลนี้” หลังดูผล ระบบจะบันทึกเฉพาะวันและเดือนเกิด';

  for (var d = 1; d <= 31; d++) daySel.insertAdjacentHTML('beforeend', '<option value="' + d + '">' + d + '</option>');
  MONTHS.forEach(function (m, i) { monthSel.insertAdjacentHTML('beforeend', '<option value="' + (i + 1) + '">' + m + '</option>'); });

  function setErr(input, msg) {
    var err = document.getElementById(input.id + '-err');
    if (msg) { input.setAttribute('aria-invalid', 'true'); err.textContent = msg; err.hidden = false; }
    else { input.removeAttribute('aria-invalid'); err.textContent = ''; err.hidden = true; }
  }
  daySel.addEventListener('change', function () { setErr(daySel, ''); });
  monthSel.addEventListener('change', function () { setErr(monthSel, ''); setErr(daySel, ''); });

  function span(r) { return r.start_day + ' ' + SHORT[r.start_month - 1] + ' – ' + r.end_day + ' ' + SHORT[r.end_month - 1]; }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var day = Number(daySel.value), month = Number(monthSel.value), bad = null;
    setErr(daySel, ''); setErr(monthSel, '');

    if (!month) { setErr(monthSel, 'ยังไม่ได้เลือกเดือนเกิด เลือกเดือนจากรายการ'); bad = monthSel; }
    if (!day) { setErr(daySel, 'ยังไม่ได้เลือกวันที่เกิด เลือกวันที่ 1–31 จากรายการ'); bad = daySel; }
    else if (month && day > MAXD[month - 1]) {
      setErr(daySel, month === 2
        ? 'เดือนกุมภาพันธ์มีแค่ 28 หรือ 29 วัน ไม่มีวันที่ ' + day + ' เลือกวันที่ใหม่'
        : 'เดือน' + MONTHS[month - 1] + 'มีแค่ ' + MAXD[month - 1] + ' วัน ไม่มีวันที่ ' + day + ' เลือกวันที่ใหม่');
      bad = daySel;
    }
    if (bad) {
      out.innerHTML = HINT;
      bad.focus();
      return;
    }

    var r = A.rasiOf(month, day);
    if (!r) {
      out.innerHTML = '<div class="notice notice--danger" role="alert"><span>ตำราที่ใช้งานอยู่ยังไม่มีช่วงวันของราศีนี้ ให้แจ้งทีมงานตรวจตำราในหลังบ้าน</span></div>';
      return;
    }
    out.innerHTML =
      '<div class="card result">' +
        '<p class="muted">เกิดวันที่ ' + day + ' ' + h(MONTHS[month - 1]) + ' คือ</p>' +
        '<h2 class="big-name" id="rasi-h" tabindex="-1">ราศี' + h(r.name) + '</h2>' +
        '<p>ช่วงวันที่ของราศี' + h(r.name) + ' (แบบไทย) <b class="nowrap">' + h(span(r.range)) + '</b></p>' +
        (r.nearBoundary && r.neighbor
          ? '<div class="notice notice--warn" role="status"><span><b>เกิดใกล้รอยต่อ</b> อาจเป็นราศี' + h(r.neighbor.name) + ' ให้โหรคำนวณจากปีเกิดจริง</span></div>'
          : '') +
        '<div class="btn-row"><a class="btn btn--primary" href="daily.html#rasi-' + h(r.rasi) + '">อ่านดวงราศีนี้' + MH.ui.icon('i-arrow') + '</a>' +
        '<a class="btn btn--outline" href="taksa.html">ดูทักษาตามวันเกิด</a></div>' +
        MH.ui.resultActions({
          tool: 'rasi', title: 'ราศีจากวันเกิด ' + day + ' ' + SHORT[month - 1], input: { month: month, day: day },
          summary: 'ราศี' + r.name, explain: 'explain=rasi&month=' + month + '&day=' + day
        }) +
        '<p class="fine-print">คำนวณในเบราว์เซอร์ ไม่ได้บันทึกวันเกิดของคุณ ถ้ากด “บันทึกผลนี้” ระบบจะบันทึกเฉพาะวันและเดือนเกิด (ไม่มีปีเกิด) ไว้ในบัญชีสมาชิกของคุณ · ตำรา “' + h(rs ? rs.name : '-') + '”</p>' +
      '</div>';
    document.getElementById('rasi-h').focus();
  });
})();
