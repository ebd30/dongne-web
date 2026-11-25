/* 폼 검사 (동네웹공방, 2026-11-25 · company/design/ux/3-forms-flows.md)
 * - 칸을 떠날 때(blur) 검사, 입력 중에는 검사하지 않음(이미 오류가 난 칸은 고치는 즉시 다시 확인)
 * - 오류는 칸 바로 아래 글로, 고치면 바로 사라짐
 * - 제출 때 오류가 있으면 위에 "n곳을 확인해 주세요" 요약 + 첫 오류 칸으로 이동
 * - 입력한 값은 지우지 않음
 * 쓰는 법: <form data-check> 안의 칸에 required, 필요하면 data-check="tel|email", data-msg="문구"
 *         요약 자리: <p class="form-summary" role="alert" hidden></p> (없으면 자동으로 만듦)
 *         성공 시 실행할 일: form 에 'checked-submit' 이벤트가 온다(데모는 안내 문구만 표시)
 */
(function () {
  var RULES = {
    tel: { re: /^0\d{1,2}-?\d{3,4}-?\d{4}$/, msg: '전화번호를 숫자로 적어 주세요(예: 010-1234-5678).' },
    email: { re: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, msg: '이메일 주소 모양을 확인해 주세요(예: name@example.com).' }
  };

  function label(el) {
    var l = el.id && el.form.querySelector('label[for="' + el.id + '"]');
    return l ? l.textContent.replace(/\(.*?\)|\*/g, '').trim() : '이 칸';
  }

  function problem(el) {
    var v = (el.type === 'checkbox') ? el.checked : el.value.trim();
    if (el.required && !v) {
      return el.getAttribute('data-msg') || (el.type === 'checkbox' ? '동의해 주셔야 보낼 수 있어요.' : label(el) + '을(를) 적어 주세요.');
    }
    var kind = el.getAttribute('data-check');
    if (v && kind && RULES[kind] && !RULES[kind].re.test(el.value.replace(/\s/g, ''))) {
      return el.getAttribute('data-msg') || RULES[kind].msg;
    }
    return '';
  }

  function show(el, msg) {
    var id = (el.id || el.name) + '-err';
    var box = document.getElementById(id);
    if (!box) {
      box = document.createElement('p');
      box.id = id; box.className = 'field-err';
      var anchor = el.type === 'checkbox' ? el.closest('label') || el : el;
      anchor.insertAdjacentElement('afterend', box);
    }
    box.textContent = msg;
    box.hidden = !msg;
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    var desc = (el.getAttribute('aria-describedby') || '').split(' ').filter(function (x) { return x && x !== id; });
    if (msg) desc.push(id);
    if (desc.length) el.setAttribute('aria-describedby', desc.join(' ')); else el.removeAttribute('aria-describedby');
    return !msg;
  }

  document.querySelectorAll('form[data-check]').forEach(function (form) {
    form.noValidate = true;
    var fields = Array.prototype.filter.call(form.elements, function (el) {
      return el.required || el.hasAttribute('data-check');
    });
    var summary = form.querySelector('.form-summary');
    if (!summary) {
      summary = document.createElement('p');
      summary.className = 'form-summary'; summary.setAttribute('role', 'alert'); summary.hidden = true;
      form.insertBefore(summary, form.firstChild);
    }
    fields.forEach(function (el) {
      el.addEventListener('blur', function () { show(el, problem(el)); });
      el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', function () {
        if (el.getAttribute('aria-invalid') === 'true') show(el, problem(el));
      });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = fields.filter(function (el) { return !show(el, problem(el)); });
      if (bad.length) {
        summary.textContent = bad.length + '곳을 확인해 주세요.';
        summary.hidden = false;
        bad[0].focus();
        return;
      }
      summary.hidden = true;
      form.dispatchEvent(new CustomEvent('checked-submit'));
    });
  });
})();
