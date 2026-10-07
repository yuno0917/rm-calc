/* RM換算・MAX計算機: 計算（DOM に触れない純粋な関数） */
(function (root) {
  'use strict';
  const RM = root.RM = root.RM || {};

  const MAX_REPS = 10;   // これを超える回数は、どの式も誤差が大きいため10回として計算する
  const STEP = 2.5;      // 表の重さはバーにつけられる2.5kg刻みに丸める
  const r2 = x => Math.round(x * 100) / 100;
  const roundTo = (x, step) => Math.round(x / step) * step;

  // 重さ（w）と限界まで挙げた回数（r）から MAX を出す式
  const FORMULAS = [
    { id: 'brzycki', name: 'Brzycki', main: true, note: '10回以下で最も正確だった（男性220人のベンチプレス）', calc: (w, r) => w / (1.0278 - 0.0278 * r) },
    { id: 'epley', name: 'Epley', note: 'よく使われる式。10回未満では Brzycki より少し高く出る', calc: (w, r) => w * (1 + r / 30) },
    { id: 'mayhew', name: 'Mayhew', note: 'ベンチプレスのデータから作られた式', calc: (w, r) => 100 * w / (52.2 + 41.9 * Math.exp(-0.055 * r)) },
    { id: 'lombardi', name: 'Lombardi', note: '回数が多いときの差が小さい式', calc: (w, r) => w * Math.pow(r, 0.1) }
  ];

  // すべての式で MAX を出す。1回ならその重さ。10回を超える回数は10回として計算する。
  function estimate(weight, reps) {
    const w = Number(weight);
    const raw = Math.round(Number(reps));
    if (!(w > 0) || !(raw >= 1)) return null;
    const r = Math.min(raw, MAX_REPS);
    const list = FORMULAS.map(f => ({ id: f.id, name: f.name, main: !!f.main, note: f.note, value: r === 1 ? w : r2(f.calc(w, r)) }));
    const values = list.map(x => x.value);
    return {
      weight: w, reps: raw, used: r, capped: raw > MAX_REPS, list,
      min: Math.min(...values), max: Math.max(...values),
      main: list.find(x => x.main).value
    };
  }

  // Brzycki の式を逆に使い、MAX から r 回が限界になる重さの割合を出す（1回で100%、10回で約75%）
  const pctForReps = r => (1.0278 - 0.0278 * r) * 100;

  // MAX から 1〜10回の重さ（RM換算表）
  function rmTable(max) {
    const out = [];
    for (let r = 1; r <= MAX_REPS; r++) {
      const pct = pctForReps(r);
      out.push({ reps: r, pct, exact: max * pct / 100, weight: roundTo(max * pct / 100, STEP) });
    }
    return out;
  }

  // MAX の何%で何回できるか（ベンチプレス、Nuzzo 2024 の269の研究のメタ回帰）
  const PCT_REPS = [
    { pct: 95, mean: 2.59, sd: 1.25 },
    { pct: 90, mean: 4.11, sd: 1.46 },
    { pct: 85, mean: 6.23, sd: 1.71 },
    { pct: 80, mean: 8.82, sd: 1.99 },
    { pct: 75, mean: 11.51, sd: 2.33 },
    { pct: 70, mean: 14.08, sd: 2.72 },
    { pct: 65, mean: 16.59, sd: 3.17 },
    { pct: 60, mean: 19.34, sd: 3.70 }
  ];

  function pctTable(max) {
    return PCT_REPS.map(row => ({
      pct: row.pct,
      weight: roundTo(max * row.pct / 100, STEP),
      mean: row.mean,
      lo: Math.max(1, Math.round(row.mean - row.sd)),
      hi: Math.round(row.mean + row.sd)
    }));
  }

  function normalizeInput(input) {
    const i = input || {};
    const num = v => (v === '' || v == null ? NaN : Number(v));
    return { weight: num(i.weight), reps: Math.round(num(i.reps)) };
  }

  function validate(n) {
    const errors = [];
    if (!(n.weight >= 1 && n.weight <= 500)) errors.push('挙げた重さを1〜500kgの範囲で入れてください。');
    if (!(n.reps >= 1 && n.reps <= 30)) errors.push('回数を1〜30回の範囲で入れてください。');
    return errors;
  }

  Object.assign(RM, { MAX_REPS, STEP, FORMULAS, PCT_REPS, estimate, pctForReps, rmTable, pctTable, normalizeInput, validate });
})(typeof window !== 'undefined' ? window : globalThis);
