/* RM換算・MAX計算機: 画面の処理（フォーム・描画・保存・共有） */
(function () {
  'use strict';
  const RM = window.RM;

  const STORAGE_KEY = 'rmcalc:v1';

  const form = document.getElementById('calc-form');
  const errorBox = document.getElementById('form-error');
  const resultSection = document.getElementById('result');
  const bigRange = document.getElementById('big-range');
  const maxNote = document.getElementById('max-note');
  const rmBody = document.querySelector('#rm-table tbody');
  const pctBody = document.querySelector('#pct-table tbody');
  const formulaCard = document.getElementById('formula-card');
  const formulaBox = document.getElementById('formula-box');
  const benchLink = document.getElementById('bench-link');
  const squatLink = document.getElementById('squat-link');
  const shareBtn = document.getElementById('share-btn');
  const shareBox = document.getElementById('share-box');
  const shareInput = document.getElementById('share-url');
  const shareStatus = document.getElementById('share-status');

  let current = null;

  // ---- 小さな DOM ヘルパー（文字列は必ず textContent として入れる） ----
  function h(tag, props, ...children) {
    const node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(k => {
        const v = props[k];
        if (v == null || v === false) return;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else node.setAttribute(k, v === true ? '' : String(v));
      });
    }
    children.flat(Infinity).forEach(c => {
      if (c == null || c === false) return;
      node.append(c instanceof Node ? c : document.createTextNode(String(c)));
    });
    return node;
  }

  const kg = x => (Math.round(x * 10) / 10).toString();
  const cite = (n, text) => h('a', { class: 'cite-chip', href: '#ref-' + n, text: text || '根拠' });

  function readForm() {
    const e = form.elements;
    return { weight: e.weight.value, reps: e.reps.value };
  }

  // ---- 保存（使えないブラウザでも動くように try/catch で囲む） ----
  function save(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) { /* 保存できなくても続行 */ }
  }
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  // ---- URL での共有 ----
  function toParams(n) {
    const p = new URLSearchParams();
    p.set('w', kg(n.weight));
    p.set('r', String(n.reps));
    return p;
  }
  function fromParams(search) {
    const p = new URLSearchParams(search);
    if (!p.has('w') || !p.has('r')) return null;
    return { weight: p.get('w'), reps: p.get('r') };
  }
  const baseUrl = () => location.href.split(/[?#]/)[0];
  function updateUrl(n) {
    try { history.replaceState(null, '', '?' + toParams(n).toString()); } catch (e) { /* file:// などで失敗しても続行 */ }
  }

  // ---- 描画 ----
  function renderMax(n, e) {
    bigRange.replaceChildren(
      h('span', { class: 'big-label', text: kg(n.weight) + 'kg × ' + n.reps + 'rep から計算したMAX' }),
      h('span', { class: 'big-num', text: kg(e.main) + 'kg' }),
      e.used > 1 ? h('span', { class: 'big-gain', text: '4つの式では ' + kg(e.min) + '〜' + kg(e.max) + 'kg' }) : null
    );
    let note;
    if (e.used === 1) note = ['1回挙げた重さを、そのままMAXとしています。'];
    else if (e.capped) note = ['10回を超えると、どの式も誤差が大きくなるため、10回として計算しています。MAXは実際より低く出ることがあります。', cite(3)];
    else note = ['Brzycki の式で計算しています。', cite(1)];
    maxNote.replaceChildren(...note);
  }

  function renderRmTable(n, e) {
    rmBody.replaceChildren(...RM.rmTable(e.main).map(r => h('tr', { class: r.reps === Math.min(n.reps, RM.MAX_REPS) ? 'is-main' : null },
      h('th', { scope: 'row', text: r.reps === 1 ? '1回（MAX）' : r.reps + '回' }),
      h('td', { class: 'cell-num', text: kg(r.weight) + 'kg' }),
      h('td', { class: 'cell-num', text: Math.round(r.pct) + '%' })
    )));
  }

  function renderPctTable(e) {
    pctBody.replaceChildren(...RM.pctTable(e.main).map(r => h('tr', null,
      h('th', { scope: 'row', text: r.pct + '%' }),
      h('td', { class: 'cell-num', text: kg(r.weight) + 'kg' }),
      h('td', { class: 'cell-num', text: r.mean.toFixed(1) + 'rep（' + r.lo + '〜' + r.hi + '）' })
    )));
  }

  function renderFormulas(e) {
    formulaCard.hidden = e.used === 1;
    if (e.used === 1) return;
    formulaBox.replaceChildren(
      h('p', null, kg(e.weight) + 'kgを' + e.reps + '回挙げたときのMAXは、式によって' + kg(e.min) + '〜' + kg(e.max) + 'kgです。どの式も、10回以下のときに正確です。', cite(1)),
      h('div', { class: 'table-wrap' },
        h('table', { class: 'data-table' },
          h('thead', null, h('tr', null, h('th', { scope: 'col', text: '式' }), h('th', { scope: 'col', text: 'MAX' }), h('th', { scope: 'col', text: '特徴' }))),
          h('tbody', null, e.list.map(f => h('tr', { class: f.main ? 'is-main' : null },
            h('th', { scope: 'row', text: f.name + (f.main ? '（使う式）' : '') }),
            h('td', { class: 'cell-num', text: kg(f.value) + 'kg' }),
            h('td', { text: f.note })
          )))
        )
      )
    );
  }

  function updateLinks(e) {
    const q = '?m=' + encodeURIComponent(kg(e.main));
    benchLink.href = '/bench-program/' + q;
    squatLink.href = '/squat-program/' + q;
  }

  // ---- 計算 ----
  function calculate(scroll) {
    const s = readForm();
    const n = RM.normalizeInput(s);
    const errors = RM.validate(n);
    if (errors.length) {
      errorBox.replaceChildren(...errors.map(t => h('span', { class: 'error-line', text: t })));
      errorBox.hidden = false;
      return false;
    }
    errorBox.hidden = true;
    const e = RM.estimate(n.weight, n.reps);
    current = n;
    renderMax(n, e);
    renderRmTable(n, e);
    renderPctTable(e);
    renderFormulas(e);
    updateLinks(e);
    resultSection.hidden = false;
    shareBox.hidden = true;
    save(s);
    updateUrl(n);
    if (scroll) resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  }

  form.addEventListener('submit', ev => {
    ev.preventDefault();
    calculate(true);
  });

  shareBtn.addEventListener('click', async () => {
    if (!current) return;
    const url = baseUrl() + '?' + toParams(current).toString();
    shareInput.value = url;
    shareBox.hidden = false;
    try {
      await navigator.clipboard.writeText(url);
      shareStatus.textContent = 'リンクをコピーしました。開くと同じ結果が表示されます。';
    } catch (err) {
      shareInput.focus();
      shareInput.select();
      shareStatus.textContent = 'リンクを選択しました。コピーして共有してください。';
    }
  });

  // ---- 起動時: URL のパラメータ → 前回の入力 の順で復元 ----
  const initial = fromParams(location.search) || load();
  if (initial && typeof initial === 'object') {
    if (initial.weight != null) form.elements.weight.value = initial.weight;
    if (initial.reps != null) form.elements.reps.value = initial.reps;
    if (initial.weight && initial.reps) calculate(false);
  }
})();
