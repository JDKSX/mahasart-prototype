/* วาดหน้าบัญชีหลังโหลดโมดูลแท็บทุกตัวแล้ว (ต้องเป็นสคริปต์ตัวสุดท้ายของ account.html) */
(function () {
  'use strict';
  if (window.MH && window.MH.account && typeof window.MH.account.boot === 'function') window.MH.account.boot();
})();
