/* หน้า "เร็ว ๆ นี้": ?f=courses|experts|ai|account — บอกว่าจะทำอะไรได้ เฟสไหน และมีอะไรใช้ได้ตอนนี้ */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h;
  var root = document.getElementById('soon-root');

  var FEATURES = {
    courses: {
      icon: 'i-screen', name: 'คอร์สเรียน', phase: 'เฟส 3',
      lede: 'เรียนโหราศาสตร์ไทย เลขศาสตร์ และฮวงจุ้ยกับผู้รู้ ผ่านบทเรียนออนไลน์ที่เรียนตามจังหวะของคุณเอง',
      items: ['บทเรียนเรียงเป็นขั้น จากพื้นฐานไปถึงการอ่านดวงจริง', 'ผู้สอนเป็นผู้รู้และโหรที่ปรึกษาของ MAHASART', 'ใช้ตำราเดียวกับเครื่องมือดูดวงบนเว็บ เรียนแล้วลองคำนวณเองได้ทันที'],
      now: [['articles.html', 'อ่านคลังความรู้'], ['horoscope.html', 'ลองเครื่องมือดูดวง']]
    },
    experts: {
      icon: 'i-expert', name: 'ผู้เชี่ยวชาญ', phase: 'เฟส 3',
      lede: 'ปรึกษาโหรและผู้รู้ที่ทีมงานคัดกรองแล้ว โดยดูแนวทางของแต่ละท่านก่อนเลือกได้',
      items: ['ดูประวัติและสาขาที่ถนัดของผู้เชี่ยวชาญแต่ละท่าน', 'นัดเวลาปรึกษาผ่านเว็บ', 'เรื่องสุขภาพ การเงิน และกฎหมาย จะแนะนำให้ปรึกษาผู้เชี่ยวชาญด้านนั้นโดยตรงเสมอ'],
      now: [['articles.html?cat=thai-astrology', 'อ่านบทความโหราศาสตร์ไทย'], ['page.html?slug=about', 'รู้จัก MAHASART']]
    },
    ai: {
      icon: 'i-ai', name: 'Mahasart AI', phase: 'เฟส 2',
      lede: 'ผู้ช่วยตอบคำถามเรื่องโหราศาสตร์ เลขศาสตร์ และฮวงจุ้ย โดยอ้างอิงจากบทความในคลังความรู้ของเรา',
      items: ['ถามเป็นภาษาไทยได้ตรง ๆ', 'ตอบพร้อมบอกว่าอ้างอิงบทความหรือตำราเล่มไหน', 'ไม่ให้คำแนะนำเรื่องสุขภาพ การเงิน หรือกฎหมาย แต่จะชี้ทางให้ไปปรึกษาผู้เชี่ยวชาญ'],
      now: [['search.html', 'ค้นหาในคลังความรู้'], ['articles.html', 'อ่านบทความ']]
    },
    account: {
      icon: 'i-user', name: 'บัญชีสมาชิก', phase: 'เฟส 2',
      lede: 'สมัครสมาชิกเพื่อใช้บริการที่ต้องยืนยันตัวตน ส่วนดูดวงพื้นฐานยังดูได้โดยไม่ต้องสมัครเหมือนเดิม',
      items: ['บันทึกวันเกิดไว้ใช้ซ้ำ เฉพาะเมื่อคุณยินยอมเท่านั้น', 'ติดตามคอร์สและการนัดปรึกษาของคุณ', 'ลบบัญชีและข้อมูลของคุณได้เองทุกเมื่อ'],
      now: [['horoscope.html', 'ดูดวงโดยไม่ต้องสมัคร'], ['daily.html', 'ดวงรายวัน']]
    }
  };
  var GENERIC = {
    icon: 'i-star', name: 'บริการนี้', phase: '',
    lede: 'บริการนี้ยังไม่เปิดให้ใช้ในต้นแบบเฟสแรก ระหว่างนี้ลองใช้สิ่งที่เปิดแล้วด้านล่างได้เลย',
    items: [],
    now: [['index.html', 'กลับหน้าแรก'], ['horoscope.html', 'พยากรณ์ออนไลน์'], ['articles.html', 'คลังความรู้']]
  };

  var key = MH.util.param('f');
  var f = FEATURES.hasOwnProperty(key) ? FEATURES[key] : GENERIC;
  var oa = MH.store.setting('line_oa_id') || '@mahasart';
  var title = f === GENERIC ? 'ยังไม่เปิดให้ใช้' : f.name + ' กำลังมาเร็ว ๆ นี้';
  document.title = (f === GENERIC ? 'ยังไม่เปิดให้ใช้' : f.name + ' · เร็ว ๆ นี้') + ' · MAHASART';

  root.innerHTML =
    '<div class="soon-card">' +
      '<span class="soon-ico">' + MH.ui.icon(f.icon) + '</span>' +
      (f.phase ? '<span class="soon">เร็ว ๆ นี้ · ' + h(f.phase) + '</span>' : '') +
      '<h1>' + h(title) + '</h1>' +
      '<p class="lede">' + h(f.lede) + '</p>' +
      (f.items.length ? '<ul>' + f.items.map(function (t) { return '<li>' + h(t) + '</li>'; }).join('') + '</ul>' : '') +
      '<p class="fine-print">' + (f.items.length ? 'นี่คือแผนที่วางไว้ รายละเอียดอาจปรับตามความเห็นที่ได้จากต้นแบบ · ' : '') + 'ติดตามความคืบหน้าและส่งความเห็นได้ทาง LINE OA ' + h(oa) + '</p>' +
      '<div class="soon-now"><h2>ที่ใช้ได้ตอนนี้</h2><div class="btn-row">' +
        f.now.map(function (n, i) { return '<a class="btn ' + (i === 0 ? 'btn--primary' : 'btn--outline') + '" href="' + n[0] + '">' + h(n[1]) + '</a>'; }).join('') +
      '</div></div>' +
    '</div>';
})();
