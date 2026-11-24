/* 사장님이 구글 시트에서 고치면 홈페이지에 바로 반영되는 작은 도구 (동네웹공방, 2026-11-24)
 *
 * 쓰는 법(HTML)
 *   <script src="js/sheet-content.js" data-sheet="구글 시트 '웹에 게시' CSV 주소" defer></script>
 *   - 공지 띠:   <div data-sheet-key="공지">기본 문구</div>
 *   - 가격 한 칸: <span data-sheet-key="온기 라떼">5,800원</span>
 *   - 목록 전체: <ul data-sheet-list="메뉴" data-sheet-template="<li><b>{이름}</b> {가격}</li>"></ul>
 *
 * 시트 모양(첫 줄은 머리글): 구분 | 이름 | 값 | 보이기
 *   공지 | 공지 | 29일(토) 오후 1시에 엽니다 | Y
 *   메뉴 | 온기 라떼 | 5,800원 | Y
 *
 * 원칙
 *   - 시트를 못 읽어도(인터넷 끊김, 주소 오류) HTML에 적어 둔 기본 문구가 그대로 보인다. 검색엔진도 기본 문구를 읽는다.
 *   - 시트 글자는 textContent로만 넣는다(HTML로 넣지 않음) → 시트에 이상한 코드를 적어도 실행되지 않는다.
 *   - 5분 동안 같은 결과를 브라우저에 보관해 시트 서버에 부담을 주지 않는다.
 */
(function () {
  var me = document.currentScript;
  var url = me && me.getAttribute('data-sheet');
  if (!url) return;
  var KEY = 'sheet-content:' + url, TTL = 5 * 60 * 1000;

  function parseCSV(text) {
    var rows = [], row = [], cell = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') q = false;
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return x.trim(); }); });
  }

  function toRecords(rows) {
    var head = rows[0].map(function (h) { return h.trim(); });
    return rows.slice(1).map(function (r) {
      var o = {};
      head.forEach(function (h, i) { o[h] = (r[i] || '').trim(); });
      return o;
    }).filter(function (o) { return (o['보이기'] || 'Y').toUpperCase() !== 'N'; });
  }

  function fill(recs) {
    var byName = {};
    recs.forEach(function (r) { if (r['이름']) byName[r['이름']] = r['값']; });
    document.querySelectorAll('[data-sheet-key]').forEach(function (el) {
      var v = byName[el.getAttribute('data-sheet-key')];
      if (v) el.textContent = v;
    });
    document.querySelectorAll('[data-sheet-list]').forEach(function (el) {
      var group = el.getAttribute('data-sheet-list');
      var tpl = el.getAttribute('data-sheet-template') || '<li>{이름} {값}</li>';
      var items = recs.filter(function (r) { return r['구분'] === group; });
      if (!items.length) return;
      el.textContent = '';
      items.forEach(function (r) {
        // 틀의 태그만 만들고, 시트 값은 글자로만 끼운다
        var holder = document.createElement('template');
        holder.innerHTML = tpl.replace(/\{([^}]+)\}/g, '<span data-f="$1"></span>');
        holder.content.querySelectorAll('[data-f]').forEach(function (s) {
          var f = s.getAttribute('data-f'); var k = f === '가격' ? '값' : f;
          s.replaceWith(document.createTextNode(r[k] || ''));
        });
        el.appendChild(holder.content);
      });
    });
  }

  try {
    var cached = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (cached && Date.now() - cached.t < TTL) { fill(cached.recs); return; }
  } catch (e) { /* 저장소를 못 쓰는 브라우저면 그냥 새로 읽는다 */ }

  fetch(url, { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(function (t) {
      var recs = toRecords(parseCSV(t));
      fill(recs);
      try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), recs: recs })); } catch (e) {}
    })
    .catch(function () { /* 실패하면 HTML 기본 문구 유지 */ });
})();
