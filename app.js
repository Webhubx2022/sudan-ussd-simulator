/**
 * ═══════════════════════════════════════════════════════════
 *  © 2026 webhubx. All rights reserved.
 *  Sudan Pay - USSD Financial Service Simulator
 *  Licensed under the MIT License. See LICENSE file.
 * ═══════════════════════════════════════════════════════════
 *  سودان باي – محاكي USSD حقيقي (Samsung style)
 *  يعمل على صفحة simulator.html المستقلة
 *  المستخدم يكتب رقم ويضغط "إرسال" — تماماً كالهاتف الحقيقي
 * ═══════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // ── عناصر DOM ────────────────────────────────────
  const $text      = document.getElementById('ussdText');
  const $field     = document.getElementById('ussdField');
  const $sendBtn   = document.getElementById('btnSend');
  const $cancelBtn = document.getElementById('btnCancel');
  const $histBtn   = document.getElementById('btnHistory');
  const $clock     = document.getElementById('clock');

  // ── الحالة ──────────────────────────────────────
  let screen   = 'dial';
  let sendData = {};
  const STORE  = 'sudanpay_tx';

  // ── ساعة ────────────────────────────────────────
  function tick() {
    const n = new Date();
    $clock.textContent =
      String(n.getHours()).padStart(2, '0') + ':' +
      String(n.getMinutes()).padStart(2, '0');
  }
  tick(); setInterval(tick, 20000);

  // ── مساعدات ─────────────────────────────────────

  function txList() {
    try { return JSON.parse(localStorage.getItem(STORE)) || []; }
    catch { return []; }
  }

  function saveTx(tx) {
    const l = txList(); l.unshift(tx);
    localStorage.setItem(STORE, JSON.stringify(l));
    if ($histBtn) $histBtn.style.display = '';
  }

  function fDate(iso) {
    const d = new Date(iso), p = n => String(n).padStart(2, '0');
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  // ── التحقق من المدخلات ──────────────────────────

  /** التحقق من رقم الهاتف السوداني */
  function isValidPhone(v) {
  const cleaned = v.replace(/\D/g, '');
  return /^(0(11|12|90|91|92|93|94|96|99)\d{7})$/.test(cleaned) ||
         /^(249(11|12|90|91|92|93|94|96|99)\d{7})$/.test(cleaned);
  }
  function isValidPhone0(v) {
    // يقبل أرقام سودانية ببادئات معتمدة:
    // Zain: 012, 090, 091, 096
    // MTN: 092, 099
    // Sudani: 011, 093, 094
    const cleaned = v.replace(/[\s\-]/g, '');
    // Regex: 0 + (90,91,92,93,94,96,99 أو 11,12) + 7 أرقام
    // أو كود الدولة +249 + (90,91,92,93,94,96,99 أو 11,12) + 7 أرقام
    return /^(0(9[0123469]|1[12])\d{7}|(\+?249)(9[0123469]|1[12])\d{7})$/.test(cleaned);
  }

  /** التحقق من مطابقة الرقم للمشغل المختصر في شراء الرصيد */
  function isOperatorMatch(v, operator) {
    const cleaned = v.replace(/[\s\-]/g, '');
    const prefix = cleaned.startsWith('0') ? cleaned.substring(1, 3) : cleaned.substring(cleaned.length - 9, cleaned.length - 7);
    
    if (operator === 'زين') return ['12', '90', '91', '96'].includes(prefix);
    if (operator === 'ام تي ان MTN') return ['92', '99'].includes(prefix);
    if (operator === 'سوداني') return ['11', '93', '94'].includes(prefix);
    return true; // احتياطياً
  }

  /** التحقق من المبلغ */
  function isValidAmount(v) {
    const n = Number(v);
    return !isNaN(n) && n > 0 && n <= 500000;
  }

  /** التحقق من الرقم السري (4-6 أرقام) */
  function isValidPin(v) {
    return /^\d{4,6}$/.test(v);
  }

  /** التحقق من رقم الحساب (4 أرقام أو أكثر) */
  function isValidAccount(v) {
    return v.length >= 4 && /^\d+$/.test(v);
  }

  /** عرض رسالة خطأ مؤقتة */
  function showError(msg) {
    const currentText = $text.textContent;
    $text.textContent = '⚠ ' + msg;
    $text.style.color = '#ff6b6b';
    setTimeout(() => {
      $text.textContent = currentText;
      $text.style.color = '';
    }, 1800);
  }

  /** عرض شاشة USSD */
  function show(msg, placeholder, type) {
    $text.textContent = msg;
    $text.style.color = '';
    $field.value = '';
    $field.type = type || 'text';
    $field.placeholder = placeholder || '';
    $field.style.display = placeholder !== false ? '' : 'none';
    $sendBtn.style.display = '';
    setTimeout(() => { if ($field.style.display !== 'none') $field.focus(); }, 100);
  }

  // ══════════════════════════════════════════════════
  //  الشاشات
  // ══════════════════════════════════════════════════

  function goDial() {
    screen = 'dial'; sendData = {};
    show(
      'سودان باي\n\nاطلب *123# للوصول للخدمة\n\nاضغط إرسال للبدء',
      ''
    );
  }

  function goMenu() {
    screen = 'menu'; sendData = {};
    show(
      'سودان باي\n\n' +
      '1.إرسال أموال\n' +
      '2.دفع فواتير\n' +
      '3.الاستعلام عن الرصيد\n' +
      '4.سجل المعاملات\n' +
      '5.مساعدة',
      ''
    );
  }

  // ── إرسال أموال ─────────────────────────────────

  function goSendPhone() {
    screen = 'sPhone';
    show('إرسال أموال\n\nأدخل رقم هاتف المستلم:', '09XXXXXXXX', 'tel');
  }

  function goSendAmount() {
    screen = 'sAmount';
    show(
      'إرسال أموال\n\nالمستلم: ' + sendData.phone + '\n\nأدخل المبلغ (ج.س):',
      'المبلغ', 'number'
    );
  }

  function goSendPin() {
    screen = 'sPin';
    show(
      'إرسال أموال\n\n' +
      'المستلم: ' + sendData.phone + '\n' +
      'المبلغ: ' + Number(sendData.amount).toLocaleString() + ' ج.س\n\n' +
      'أدخل الرقم السري:',
      '••••', 'password'
    );
  }

  function goSendProcessing() {
    screen = 'wait';
    show('جاري معالجة المعاملة...', false);
    $sendBtn.style.display = 'none';

    setTimeout(() => {
      const tx = {
        id: Date.now(), type: 'send',
        phone: sendData.phone, amount: sendData.amount,
        date: new Date().toISOString(),
      };
      saveTx(tx);
      screen = 'sDone';
      $sendBtn.style.display = '';
      show(
        'تمت المعاملة بنجاح ✓\n\n' +
        'المستلم: ' + tx.phone + '\n' +
        'المبلغ: ' + Number(tx.amount).toLocaleString() + ' ج.س\n' +
        'التاريخ: ' + fDate(tx.date) + '\n' +
        'المرجع: #' + tx.id,
        false
      );
    }, 1500);
  }

  // ── دفع فواتير ──────────────────────────────────

  function goPayMenu() {
    screen = 'payMenu';
    show(
      'دفع فواتير\n\n' +
      '1.كهرباء\n' +
      '2.مياه\n' +
      '3.إنترنت\n' +
      '4.اشتراك تلفزيون\n' +
      '5.شراء رصيد\n\n' +
      '0.رجوع',
      ''
    );
  }

  function goPayAccount() {
    screen = 'payAcc';
    show('دفع فواتير – ' + sendData.service + '\n\nأدخل رقم الحساب:', 'رقم الحساب');
  }

  function goPayAmount() {
    screen = 'payAmt';
    show(
      'دفع فواتير – ' + sendData.service + '\n' +
      'الحساب: ' + sendData.account + '\n\nأدخل المبلغ (ج.س):',
      'المبلغ', 'number'
    );
  }

  function goPayProcessing() {
    screen = 'wait';
    show('جاري معالجة الدفع...', false);
    $sendBtn.style.display = 'none';

    setTimeout(() => {
      const tx = {
        id: Date.now(), type: 'bill',
        phone: sendData.service + ' – ' + sendData.account,
        amount: sendData.amount, date: new Date().toISOString(),
      };
      saveTx(tx);
      screen = 'payDone';
      $sendBtn.style.display = '';
      show(
        'تم الدفع بنجاح ✓\n\n' +
        'الخدمة: ' + sendData.service + '\n' +
        'الحساب: ' + sendData.account + '\n' +
        'المبلغ: ' + Number(sendData.amount).toLocaleString() + ' ج.س\n' +
        'المرجع: #' + tx.id,
        false
      );
    }, 1500);
  }

  // ── شراء رصيد ───────────────────────────────────

  function goAirtimeMenu() {
    screen = 'airMenu';
    show(
      'شراء رصيد\n\nاختر شبكة الاتصال:\n\n' +
      '1.زين\n' +
      '2.سوداني\n' +
      '3.ام تي ان MTN\n\n' +
      '0.رجوع',
      ''
    );
  }

  function goAirtimePhone() {
    screen = 'airPhone';
    show(
      'شراء رصيد – ' + sendData.operator + '\n\nأدخل رقم الهاتف للشحن:',
      '09XXXXXXXX', 'tel'
    );
  }

  function goAirtimeAmount() {
    screen = 'airAmount';
    show(
      'شراء رصيد – ' + sendData.operator + '\n' +
      'الرقم: ' + sendData.phone + '\n\n' +
      'أدخل مبلغ الشحن (ج.س):',
      'المبلغ', 'number'
    );
  }

  function goAirtimePin() {
    screen = 'airPin';
    show(
      'شراء رصيد – ' + sendData.operator + '\n\n' +
      'الرقم: ' + sendData.phone + '\n' +
      'المبلغ: ' + Number(sendData.amount).toLocaleString() + ' ج.س\n\n' +
      'أدخل الرقم السري للتأكيد:',
      '••••', 'password'
    );
  }

  function goAirtimeProcessing() {
    screen = 'wait';
    show('جاري شحن الرصيد...', false);
    $sendBtn.style.display = 'none';

    setTimeout(() => {
      const tx = {
        id: Date.now(), type: 'airtime',
        phone: sendData.operator + ' – ' + sendData.phone,
        amount: sendData.amount, date: new Date().toISOString(),
      };
      saveTx(tx);
      screen = 'airDone';
      $sendBtn.style.display = '';
      show(
        'تم شحن الرصيد بنجاح ✓\n\n' +
        'الشبكة: ' + sendData.operator + '\n' +
        'الرقم: ' + sendData.phone + '\n' +
        'المبلغ: ' + Number(sendData.amount).toLocaleString() + ' ج.س\n' +
        'التاريخ: ' + fDate(tx.date) + '\n' +
        'المرجع: #' + tx.id,
        false
      );
    }, 1500);
  }

  // ── الرصيد ──────────────────────────────────────

  function goBalance() {
    screen = 'bal';
    const b = (Math.random() * 50000 + 10000).toFixed(2);
    show(
      'الرصيد المتاح\n\n' +
      Number(b).toLocaleString() + ' ج.س\n\n' +
      'بتاريخ ' + fDate(new Date().toISOString()),
      false
    );
  }

  // ── سجل المعاملات ──────────────────────────────

  function goHistory() {
    screen = 'hist';
    const txs = txList();
    let t = 'سجل المعاملات\n\n';
    if (!txs.length) { t += 'لا توجد معاملات بعد.'; }
    else {
      txs.slice(0, 6).forEach((tx, i) => {
        const icon = tx.type === 'send' ? '💸' : tx.type === 'airtime' ? '📱' : '📄';
        t += icon + ' ' + tx.phone + '\n';
        t += '   ' + Number(tx.amount).toLocaleString() + ' ج.س\n';
        t += '   ' + fDate(tx.date) + '\n\n';
      });
    }
    show(t, false);
  }

  // ── مساعدة ──────────────────────────────────────

  function goHelp() {
    screen = 'help';
    show(
      'مساعدة\n\n' +
      'USSD هي تقنية تتيح الخدمات المالية\n' +
      'بدون إنترنت باستخدام أكواد طلب\n' +
      'بسيطة مثل *123#.\n\n' +
      '• يعمل على أي هاتف\n' +
      '• لا يحتاج إنترنت\n' +
      '• معالجة فورية\n' +
      '• محمي بالرقم السري',
      false
    );
  }

  // ══════════════════════════════════════════════════
  //  معالجة "إرسال" مع التحقق
  // ══════════════════════════════════════════════════
function onSend() {
  const v = $field.value.trim();

  const billSvc = {
    '1': 'كهرباء',
    '2': 'مياه',
    '3': 'إنترنت',
    '4': 'اشتراك تلفزيون'
  };

  const operators = {
    '1': 'زين',
    '2': 'سوداني',
    '3': 'ام تي ان MTN'
  };

  // ── helper functions ─────────────────────

  const requireValue = (msg) => {
    if (!v) {
      showError(msg);
      return false;
    }
    return true;
  };

  const vibrate = () => {
    if (navigator.vibrate) navigator.vibrate(40);
  };

  const menuActions = {
    '1': goSendPhone,
    '2': goPayMenu,
    '3': goBalance,
    '4': goHistory,
    '5': goHelp
  };

  // ── state machine ────────────────────────

  switch (screen) {

    // ── Dial ───────────────────────────────
    case 'dial':
      if (v === '*123#' || v === '') {
        goMenu();
      } else {
        showError('اكتب *123# للوصول للخدمة');
      }
      break;

    // ── Main Menu ──────────────────────────
    case 'menu':
      if (menuActions[v]) {
        menuActions[v]();
      } else {
        showError('أدخل رقم من 1 إلى 5');
      }
      break;

    // ── Send Money ─────────────────────────
    case 'sPhone':
      if (!requireValue('الرجاء إدخال رقم الهاتف')) break;
      if (!isValidPhone(v)) {
        showError('رقم هاتف غير صحيح\nالصيغة: 09XXXXXXXX');
        break;
      }
      sendData.phone = v;
      goSendAmount();
      break;

    case 'sAmount':
      if (v === '0') { goMenu(); break; }
      if (!requireValue('الرجاء إدخال المبلغ')) break;
      if (!isValidAmount(v)) {
        showError('مبلغ غير صحيح\n(1 – 500,000 ج.س)');
        break;
      }
      sendData.amount = v;
      goSendPin();
      break;

    case 'sPin':
      if (v === '0') { goMenu(); break; }
      if (!requireValue('الرجاء إدخال الرقم السري')) break;
      if (!isValidPin(v)) {
        showError('الرقم السري يجب أن يكون\n4 إلى 6 أرقام');
        break;
      }
      sendData.pin = v;
      goSendProcessing();
      delete sendData.pin;
      break;

    case 'sDone':
      goMenu();
      break;

    // ── Bills ──────────────────────────────
    case 'payMenu':
      if (v === '0') { goMenu(); break; }
      if (v === '5') { goAirtimeMenu(); break; }

      if (billSvc[v]) {
        sendData = { service: billSvc[v] };
        goPayAccount();
      } else {
        showError('أدخل رقم من 1 إلى 5 أو 0 للرجوع');
      }
      break;

    case 'payAcc':
      if (v === '0') { goPayMenu(); break; }
      if (!requireValue('الرجاء إدخال رقم الحساب')) break;

      if (!isValidAccount(v)) {
        showError('رقم حساب غير صحيح\n(4 أرقام على الأقل)');
        break;
      }

      sendData.account = v;
      goPayAmount();
      break;

    case 'payAmt':
      if (v === '0') { goPayMenu(); break; }
      if (!requireValue('الرجاء إدخال المبلغ')) break;

      if (!isValidAmount(v)) {
        showError('مبلغ غير صحيح\n(1 – 500,000 ج.س)');
        break;
      }

      sendData.amount = v;
      goPayProcessing();
      break;

    case 'payDone':
      goMenu();
      break;

    // ── Airtime ────────────────────────────
    case 'airMenu':
      if (v === '0') { goPayMenu(); break; }

      if (operators[v]) {
        sendData = { operator: operators[v] };
        goAirtimePhone();
      } else {
        showError('أدخل رقم من 1 إلى 3 أو 0 للرجوع');
      }
      break;

    case 'airPhone':
      if (v === '0') { goAirtimeMenu(); break; }
      if (!requireValue('الرجاء إدخال رقم الهاتف')) break;

      if (!isValidPhone(v)) {
        showError('رقم هاتف غير صحيح\nالصيغة: 09XXXXXXXX');
        break;
      }

      if (!isOperatorMatch(v, sendData.operator)) {
        showError('الرقم لا يتبع لشبكة ' + sendData.operator);
        break;
      }

      sendData.phone = v;
      goAirtimeAmount();
      break;

    case 'airAmount':
      if (v === '0') { goAirtimeMenu(); break; }
      if (!requireValue('الرجاء إدخال المبلغ')) break;

      if (!isValidAmount(v)) {
        showError('مبلغ غير صحيح\n(1 – 500,000 ج.س)');
        break;
      }

      sendData.amount = v;
      goAirtimePin();
      break;

    case 'airPin':
      if (v === '0') { goAirtimeMenu(); break; }
      if (!requireValue('الرجاء إدخال الرقم السري')) break;

      if (!isValidPin(v)) {
        showError('الرقم السري يجب أن يكون\n4 إلى 6 أرقام');
        break;
      }

      sendData.pin = v;
      goAirtimeProcessing();
      delete sendData.pin;
      break;

    case 'airDone':
      goMenu();
      break;

    // ── Static screens ─────────────────────
    case 'bal':
    case 'hist':
    case 'help':
      goMenu();
      break;
  }

  vibrate();
}


  function onSend0() {
    const v = $field.value.trim();

    const billSvc = { '1': 'كهرباء', '2': 'مياه', '3': 'إنترنت', '4': 'اشتراك تلفزيون' };
    const operators = { '1': 'زين', '2': 'سوداني', '3': 'ام تي ان MTN' };

    switch (screen) {

      case 'dial':
        goMenu();
        break;

      case 'menu':
        if (v === '1') goSendPhone();
        else if (v === '2') goPayMenu();
        else if (v === '3') goBalance();
        else if (v === '4') goHistory();
        else if (v === '5') goHelp();
        else showError('أدخل رقم من 1 إلى 5');
        break;

      // ── إرسال أموال ──
      case 'sPhone':
        if (!v) { showError('الرجاء إدخال رقم الهاتف'); break; }
        if (!isValidPhone(v)) { showError('رقم هاتف غير صحيح\nالصيغة: 09XXXXXXXX'); break; }
        sendData.phone = v; goSendAmount();
        break;
      case 'sAmount':
        if (!v) { showError('الرجاء إدخال المبلغ'); break; }
        if (!isValidAmount(v)) { showError('مبلغ غير صحيح\n(1 – 500,000 ج.س)'); break; }
        sendData.amount = v; goSendPin();
        break;
      case 'sPin':
        if (!v) { showError('الرجاء إدخال الرقم السري'); break; }
        if (!isValidPin(v)) { showError('الرقم السري يجب أن يكون\n4 إلى 6 أرقام'); break; }
        sendData.pin = v; goSendProcessing();
        break;
      case 'sDone':
        goMenu();
        break;

      // ── دفع فواتير ──
      case 'payMenu':
        if (v === '0') { goMenu(); break; }
        if (v === '5') { goAirtimeMenu(); break; }
        if (billSvc[v]) { sendData = { service: billSvc[v] }; goPayAccount(); }
        else showError('أدخل رقم من 1 إلى 5 أو 0 للرجوع');
        break;
      case 'payAcc':
        if (!v) { showError('الرجاء إدخال رقم الحساب'); break; }
        if (!isValidAccount(v)) { showError('رقم حساب غير صحيح\n(4 أرقام على الأقل)'); break; }
        sendData.account = v; goPayAmount();
        break;
      case 'payAmt':
        if (!v) { showError('الرجاء إدخال المبلغ'); break; }
        if (!isValidAmount(v)) { showError('مبلغ غير صحيح\n(1 – 500,000 ج.س)'); break; }
        sendData.amount = v; goPayProcessing();
        break;
      case 'payDone':
        goMenu();
        break;

      // ── شراء رصيد ──
      case 'airMenu':
        if (v === '0') { goPayMenu(); break; }
        if (operators[v]) { sendData = { operator: operators[v] }; goAirtimePhone(); }
        else showError('أدخل رقم من 1 إلى 3 أو 0 للرجوع');
        break;
      case 'airPhone':
        if (!v) { showError('الرجاء إدخال رقم الهاتف'); break; }
        if (!isValidPhone(v)) { showError('رقم هاتف غير صحيح\nالصيغة: 09XXXXXXXX'); break; }
        if (!isOperatorMatch(v, sendData.operator)) {
          showError('الرقم لا يتبع لشبكة ' + sendData.operator);
          break;
        }
        sendData.phone = v; goAirtimeAmount();
        break;
      case 'airAmount':
        if (!v) { showError('الرجاء إدخال المبلغ'); break; }
        if (!isValidAmount(v)) { showError('مبلغ غير صحيح\n(1 – 500,000 ج.س)'); break; }
        sendData.amount = v; goAirtimePin();
        break;
      case 'airPin':
        if (!v) { showError('الرجاء إدخال الرقم السري'); break; }
        if (!isValidPin(v)) { showError('الرقم السري يجب أن يكون\n4 إلى 6 أرقام'); break; }
        sendData.pin = v; goAirtimeProcessing();
        break;
      case 'airDone':
        goMenu();
        break;

      // ── شاشات بدون إدخال ──
      case 'bal': case 'hist': case 'help':
        goMenu();
        break;
    }

    if (navigator.vibrate) {
      navigator.vibrate(40);
    }

  }

  function onCancel() {
    if (screen === 'menu' || screen === 'dial') {
      window.location.href = 'index.html';
    } else {
      goMenu();
    }
  }

  // ── أحداث ───────────────────────────────────────

  $sendBtn.addEventListener('click', onSend);
  $cancelBtn.addEventListener('click', onCancel);
  $field.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); onSend(); } });

  if ($histBtn) {
    $histBtn.addEventListener('click', goHistory);
    if (txList().length) $histBtn.style.display = '';
  }

  // ── بدء ─────────────────────────────────────────
  goDial();
})();
