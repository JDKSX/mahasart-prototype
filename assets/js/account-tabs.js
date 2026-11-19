/* ทะเบียนแท็บของหน้า account.html
   แต่ละโมดูล (account-orders.js ฯลฯ) เรียก MH.account.register({ key, label, order, render: function (host, member) {} })
   account.js (หน้าบัญชี) วาดแท็บตาม order และเรียก render เมื่อเปิดแท็บ · ?tab=<key> เปิดแท็บนั้นตรง ๆ */
(function () {
  'use strict';
  var MH = window.MH;
  MH.account = {
    tabs: [],
    register: function (t) { MH.account.tabs.push(t); MH.account.tabs.sort(function (a, b) { return (a.order || 99) - (b.order || 99); }); }
  };
})();
