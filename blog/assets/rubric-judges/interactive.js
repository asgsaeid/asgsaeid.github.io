/* Interactive figures for the two rubric posts:
   "Your judge isn't lenient or strict. Your rubric is." and
   "Self-review erases what you taught your rubric".
   Plain JavaScript + inline SVG, no dependencies. Each figure mounts into a
   <div data-viz="..."> placeholder and leaves a static <noscript> image as fallback. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var C = { hand: '#2a78d6', gen: '#eb6834', none: '#898781', third: '#1baf7a', ink: '#1a1a1a', ink2: '#52514e', grid: '#ebeae4' };

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function h(tag, cls, parent, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, s, attrs) {
    var t = el('text', Object.assign({ x: x, y: y }, attrs || {}), parent);
    t.textContent = s;
    return t;
  }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function animate(dur, fn, done) {
    if (reduceMotion) { fn(1); if (done) done(); return function () {}; }
    var start = null, stopped = false;
    function frame(ts) {
      if (stopped) return;
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      fn(ease(p));
      if (p < 1) requestAnimationFrame(frame); else if (done) done();
    }
    requestAnimationFrame(frame);
    return function () { stopped = true; };
  }
  function onVisible(node, cb) {
    if (!('IntersectionObserver' in window)) { cb(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { io.disconnect(); cb(); } });
    }, { threshold: 0.35 });
    io.observe(node);
  }
  function tabs(parent, labels, onPick, initial) {
    var bar = h('div', 'viz-tabs', parent);
    bar.setAttribute('role', 'tablist');
    var btns = labels.map(function (lab, i) {
      var b = h('button', 'viz-tab', bar, lab);
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.addEventListener('click', function () { select(i); });
      return b;
    });
    function select(i) {
      btns.forEach(function (b, j) { b.setAttribute('aria-selected', j === i ? 'true' : 'false'); });
      onPick(i);
    }
    select(initial || 0);
    return select;
  }
  function tooltip(container) {
    var tip = h('div', 'viz-tip', container);
    return {
      show: function (evt, html) {
        tip.innerHTML = html;
        tip.style.opacity = '1';
        var r = container.getBoundingClientRect();
        var x = evt.clientX - r.left + 14, y = evt.clientY - r.top + 14;
        var w = tip.offsetWidth;
        if (x + w > r.width - 4) x = evt.clientX - r.left - w - 14;
        tip.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      },
      hide: function () { tip.style.opacity = '0'; }
    };
  }
  function legend(parent, items, top) {
    var lg = h('div', 'viz-legend' + (top ? ' viz-legend-top' : ''), parent);
    items.forEach(function (l) {
      var s = h('span', 'viz-key', lg); h('i', 'sw ' + l[0], s); s.appendChild(document.createTextNode(l[1]));
    });
    return lg;
  }
  function f1(v) { return (Math.round(v * 10) / 10).toFixed(Math.abs(v - Math.round(v)) < 0.05 ? 0 : 1); }

  /* ================================================================== */
  /* POST 1                                                              */
  /* ================================================================== */

  /* 1. Operating points: correct passed vs flawed caught, Sonnet judge */
  var PTS = {
    ff:   ['Free-form', 100, 75.0, 'none'],
    s3:   ['Generic scale, pass at 3', 100, 75.0, 'none'],
    s4:   ['Generic scale, pass at 4', 100, 85.4, 'none'],
    s5:   ['Generic scale, pass at 5', 56.2, 100, 'none'],
    h2:   ['Hand, 2 checks', 95.8, 52.1, 'hand'],
    h4:   ['Hand, 4 checks', 95.8, 74.0, 'hand'],
    h6:   ['Hand, 6 checks', 95.8, 100, 'hand'],
    hp:   ['Hand, as a paragraph', 97.9, 100, 'hand'],
    hs:   ['Hand, each scored 1 to 5', 95.8, 100, 'hand'],
    g4:   ['Generated, 4 checks', 20.8, 94.8, 'gen'],
    g8:   ['Generated, 8 checks', 2.1, 100, 'gen'],
    g12:  ['Generated, 12 checks', 4.2, 100, 'gen'],
    gp:   ['Generated, as a paragraph', 4.2, 100, 'gen'],
    gs:   ['Generated, each scored 1 to 5', 8.3, 100, 'gen']
  };
  // jitter for exactly coincident points so every dot stays hoverable
  var JIT = { hs: [-6, 0], h6: [0, 0], hp: [6, 0], g12: [-4, 0], gp: [4, 0], s3: [0, 6], ff: [0, -6] };
  var OP_VIEWS = [
    { name: 'All', on: null, labels: [['g4', 10, 4, 'start'], ['s5', 0, -12, 'middle'], ['h2', -12, 4, 'end'], ['s4', -12, 4, 'end']],
      foot: 'Each dot is one rubric, applied by the same judge (Sonnet) to the same 72 reports, mean of two runs. Pick a view to compare one factor at a time; hover any dot for its numbers.' },
    { name: 'Content', on: ['h6', 'g12', 'ff'], labels: [['h6', -12, 18, 'end'], ['g12', 10, 18, 'start'], ['ff', -12, 4, 'end']],
      foot: 'Hand-written checks and model-generated checks for the same task land in opposite corners. The free-form judge, with no checks at all, is the lenient one.' },
    { name: 'Count', on: ['h2', 'h4', 'h6', 'g4', 'g8', 'g12'], labels: [['h2', -12, 4, 'end'], ['h4', -12, 4, 'end'], ['h6', -12, 18, 'end'], ['g4', 10, 4, 'start'], ['g8', 0, -12, 'start'], ['g12', 10, 18, 'start']],
      foot: 'Nested prefixes of the same ranked list. More hand checks raise catches at no cost; more generated checks cost correct passes, because those checks fail correct reports.' },
    { name: 'Rendering', on: ['h6', 'hp', 'hs', 'g12', 'gp', 'gs'], labels: [['hp', -12, -12, 'end'], ['hs', -12, 18, 'end'], ['gs', 10, 18, 'start'], ['gp', 10, -12, 'start']],
      foot: 'The same propositions as a checklist, as one paragraph read holistically, or each scored 1 to 5 land in the same place. Rendering barely matters; content does.' },
    { name: 'Scale threshold', on: ['s3', 's4', 's5'], labels: [['s3', -12, 18, 'end'], ['s4', -12, 4, 'end'], ['s5', 0, -12, 'middle']],
      foot: 'A generic 1 to 5 scale (groundedness, completeness, actionability). Moving the pass threshold from 3 to 5 slides the same judge from lenient to strict.' }
  ];
  function operatingChart(root) {
    var box = h('div', 'viz-card', root);
    var W = 700, H = 420, L = 58, R = 24, T = 18, B = 48, x0 = 0, x1 = 100, y0 = 45, y1 = 102;
    function X(v) { return L + (v - x0) / (x1 - x0) * (W - L - R); }
    function Y(v) { return T + (y1 - v) / (y1 - y0) * (H - T - B); }
    var foot;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Correct reports passed against flawed reports caught for fourteen rubrics with the same judge: hand-written checks sit top right, generated checks top left, free-form and low scale thresholds bottom right.' });
    var g0 = el('g', null, svg);
    for (var v = 0; v <= 100; v += 20) {
      el('line', { x1: X(v), x2: X(v), y1: T, y2: H - B, class: 'viz-grid' }, g0);
      txt(g0, X(v), H - B + 18, v + '%', { class: 'viz-axis', 'text-anchor': 'middle' });
    }
    for (v = 50; v <= 100; v += 10) {
      el('line', { x1: L, x2: W - R, y1: Y(v), y2: Y(v), class: 'viz-grid' }, g0);
      txt(g0, L - 8, Y(v) + 4, v + '%', { class: 'viz-axis', 'text-anchor': 'end' });
    }
    txt(g0, (L + W - R) / 2, H - 8, 'Correct reports passed', { class: 'viz-axis', 'text-anchor': 'middle' });
    txt(g0, 14, (T + H - B) / 2, 'Flawed reports caught', { class: 'viz-axis', 'text-anchor': 'middle', transform: 'rotate(-90 14 ' + (T + H - B) / 2 + ')' });
    var lg = el('g', null, svg), tip;
    var dots = {};
    Object.keys(PTS).forEach(function (k) {
      var p = PTS[k], j = JIT[k] || [0, 0];
      var c = el('circle', { cx: X(50), cy: Y(75), r: 7, class: 'viz-pt fam-' + p[3] }, svg);
      c.addEventListener('mousemove', function (e) { tip.show(e, '<b>' + p[0] + '</b><br>Correct passed ' + f1(p[1]) + '%<br>Flawed caught ' + f1(p[2]) + '%'); });
      c.addEventListener('mouseleave', function () { tip.hide(); });
      dots[k] = { c: c, x: X(p[1]) + j[0], y: Y(p[2]) + j[1] };
    });
    var view = 0;
    function show(i) {
      view = i;
      var vw = OP_VIEWS[i];
      Object.keys(dots).forEach(function (k) { dots[k].c.classList.toggle('is-dim', !!vw.on && vw.on.indexOf(k) < 0); });
      while (lg.firstChild) lg.removeChild(lg.firstChild);
      vw.labels.forEach(function (l) {
        var d = dots[l[0]];
        txt(lg, d.x + l[1], d.y + l[2], PTS[l[0]][0], { class: 'viz-ptlab', 'text-anchor': l[3] });
      });
      if (foot) foot.textContent = vw.foot;
    }
    legend(box, [['fam-none', 'No rubric content'], ['fam-hand', 'Hand-written checks'], ['fam-gen', 'Model-generated checks']], true);
    tabs(box, OP_VIEWS.map(function (v) { return v.name; }), show);
    box.appendChild(svg);
    tip = tooltip(box);
    foot = h('div', 'viz-foot', box, OP_VIEWS[0].foot);
    show(0);
    lg.style.opacity = '0';
    onVisible(box, function () {
      var keys = Object.keys(dots);
      animate(1100, function (t) {
        keys.forEach(function (k, n) {
          var d = dots[k], tt = Math.max(0, Math.min(1, t * 1.6 - n * 0.045));
          d.c.setAttribute('cx', X(50) + (d.x - X(50)) * tt);
          d.c.setAttribute('cy', Y(75) + (d.y - Y(75)) * tt);
        });
      }, function () {
        keys.forEach(function (k) { dots[k].c.setAttribute('cx', dots[k].x); dots[k].c.setAttribute('cy', dots[k].y); });
        lg.style.transition = 'opacity .5s'; lg.style.opacity = '1';
      });
    });
  }

  /* 2. Judges: grouped bars, two metrics */
  var JUD = [ // [label, haiku, sonnet, opus] for correct passed; then for missed-finding passed
    ['Free-form', [100, 100, 100], [83.3, 100, 75.0]],
    ['Scale, pass at 4', [95.8, 100, 100], [25.0, 58.3, 50.0]],
    ['Scale, pass at 5', [12.5, 56.2, 79.2], [0, 0, 0]],
    ['Hand, 6 checks', [95.8, 95.8, 100], [0, 0, 0]],
    ['Generated, 4 checks', [16.7, 20.8, 16.7], [8.3, 8.3, 8.3]],
    ['Generated, 12 checks', [0, 4.2, 0], [0, 0, 0]],
    ['Generated, paragraph', [4.2, 4.2, 4.2], [0, 0, 0]]
  ];
  var JNAMES = ['Haiku', 'Sonnet', 'Opus'], JCOL = ['fam-third', 'fam-hand', 'fam-gen'];
  function judgesChart(root) {
    var box = h('div', 'viz-card', root);
    var W = 700, H = 330, L = 50, R = 12, T = 14, B = 58;
    var gw = (W - L - R) / JUD.length, bw = gw * 0.24;
    function Y(v) { return T + (100 - v) / 100 * (H - T - B); }
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Haiku, Sonnet and Opus give nearly the same pass rates under each rubric, except a generic scale with a pass threshold of 5.' });
    var g0 = el('g', null, svg);
    for (var v = 0; v <= 100; v += 20) {
      el('line', { x1: L, x2: W - R, y1: Y(v), y2: Y(v), class: v === 0 ? 'viz-zero' : 'viz-grid' }, g0);
      txt(g0, L - 8, Y(v) + 4, v + '%', { class: 'viz-axis', 'text-anchor': 'end' });
    }
    var tip, metric = 0, bars = [];
    JUD.forEach(function (d, i) {
      var cx = L + gw * i + gw / 2;
      var words = d[0].split(', ');
      words.forEach(function (w, k) { txt(g0, cx, H - B + 18 + k * 15, w + (k < words.length - 1 ? ',' : ''), { class: 'viz-axis', 'text-anchor': 'middle' }); });
      [0, 1, 2].forEach(function (j) {
        var x = cx + (j - 1.5) * (bw + 3) + 1.5;
        var r = el('rect', { x: x, width: bw, y: Y(0), height: 0, rx: 3, class: JCOL[j] }, svg);
        r.addEventListener('mousemove', function (e) { tip.show(e, '<b>' + d[0] + '</b><br>' + JNAMES[j] + ': ' + f1(d[1 + metric][j]) + '%'); });
        r.addEventListener('mouseleave', function () { tip.hide(); });
        bars.push({ r: r, i: i, j: j, v: 0 });
      });
    });
    var foot, cancel, FOOT = [
      'Share of the 24 correct reports each judge passed, same rubric, same reports. The judges agree within a few points everywhere except a pass threshold of 5 on a scale, where the threshold measures how readily each model gives a perfect score.',
      'Share of the 12 reports that leave out a real finding that each judge passed. With no rubric content the judges let most of them through; that is the leniency the literature reports.'];
    function draw(m, fromZero) {
      metric = m;
      if (foot) foot.textContent = FOOT[m];
      var from = bars.map(function (b) { return fromZero ? 0 : b.v; });
      if (cancel) cancel();
      cancel = animate(750, function (t) {
        bars.forEach(function (b, n) {
          var target = JUD[b.i][1 + m][b.j];
          b.v = from[n] + (target - from[n]) * t;
          b.r.setAttribute('y', Y(b.v)); b.r.setAttribute('height', Y(0) - Y(b.v));
        });
      });
    }
    legend(box, [['fam-third', 'Haiku'], ['fam-hand', 'Sonnet'], ['fam-gen', 'Opus']], true);
    var started = false;
    tabs(box, ['Correct reports passed', 'Reports missing a finding passed'], function (i) { metric = i; if (foot) foot.textContent = FOOT[i]; if (started) draw(i, false); });
    box.appendChild(svg);
    tip = tooltip(box);
    foot = h('div', 'viz-foot', box, FOOT[0]);
    onVisible(box, function () { started = true; draw(metric, true); });
  }

  /* 3. Prevalence slider */
  var PREV = [
    ['First-draft generated rubric', 5.6, 98.6, C.gen],
    ['Hand-written checklist', 97.2, 83.3, C.hand],
    ['Rubric revised with labels', 80.6, 100, C.third]
  ];
  function prevalenceChart(root) {
    var box = h('div', 'viz-card', root);
    var sl = h('div', 'viz-slider', box);
    h('span', null, sl, 'Share of flawed outputs in the validation set');
    var inp = h('input', null, sl); inp.type = 'range'; inp.min = '5'; inp.max = '95'; inp.step = '1'; inp.value = '67';
    inp.setAttribute('aria-label', 'Share of flawed outputs in the validation set');
    var out = h('b', null, sl, '67%');
    var ro = h('div', 'viz-readout', box), cells = PREV.map(function (p) {
      var d = h('div', null, ro); var i = h('i', null, d); i.style.background = p[3];
      d.appendChild(document.createTextNode(p[0])); var b = h('b', null, d, ''); var s = h('span', null, d, ''); return { b: b, s: s };
    });
    var W = 700, H = 280, L = 50, R = 16, T = 12, B = 40;
    function X(v) { return L + (v - 5) / 90 * (W - L - R); }
    function Y(v) { return T + (100 - v) / 100 * (H - T - B); }
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Accuracy of three rubrics as the share of flawed outputs changes. The rubric that fails almost everything climbs from about 15% to 89% accuracy while its balanced accuracy stays at 52%.' });
    box.appendChild(svg);
    var g0 = el('g', null, svg);
    for (var v = 0; v <= 100; v += 20) {
      el('line', { x1: L, x2: W - R, y1: Y(v), y2: Y(v), class: 'viz-grid' }, g0);
      txt(g0, L - 8, Y(v) + 4, v + '%', { class: 'viz-axis', 'text-anchor': 'end' });
    }
    [10, 33, 50, 67, 90].forEach(function (p) { txt(g0, X(p), H - B + 18, p + '%', { class: 'viz-axis', 'text-anchor': 'middle' }); });
    txt(g0, (L + W - R) / 2, H - 4, 'Share of flawed outputs', { class: 'viz-axis', 'text-anchor': 'middle' });
    var lines = PREV.map(function (p) {
      var d = 'M' + X(5) + ',' + Y(0.05 * p[2] + 0.95 * p[1]) + ' L' + X(95) + ',' + Y(0.95 * p[2] + 0.05 * p[1]);
      var path = el('path', { d: d, class: 'viz-line', stroke: p[3] }, svg);
      var len = path.getTotalLength ? path.getTotalLength() : 800;
      path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
      var dot = el('circle', { r: 6.5, class: 'viz-dot', fill: p[3] }, svg);
      return { path: path, len: len, dot: dot, p: p };
    });
    var cur = el('line', { y1: T, y2: H - B, class: 'viz-cursor' }, svg);
    function set(pv) {
      out.textContent = pv + '%';
      var q = pv / 100;
      cur.setAttribute('x1', X(pv)); cur.setAttribute('x2', X(pv));
      lines.forEach(function (l, i) {
        var acc = q * l.p[2] + (1 - q) * l.p[1];
        l.dot.setAttribute('cx', X(pv)); l.dot.setAttribute('cy', Y(acc));
        cells[i].b.textContent = acc.toFixed(0) + '% accuracy';
        cells[i].s.textContent = 'balanced accuracy ' + ((l.p[1] + l.p[2]) / 2).toFixed(0) + '%, at any mix';
      });
    }
    inp.addEventListener('input', function () { set(+inp.value); });
    set(67);
    h('div', 'viz-foot', box, 'Accuracy is a weighted mix of the two rates, so it depends on how many flawed items the set holds. Balanced accuracy, the mean of correct-passed and flawed-caught, does not. Drag the slider: at 90% flawed the rubric that fails almost everything beats the hand-written one.');
    onVisible(box, function () {
      animate(1200, function (t) { lines.forEach(function (l) { l.path.style.strokeDashoffset = l.len * (1 - t); }); });
    });
  }

  /* 4. Aggregation rule */
  var AGG = [
    ['All checks must pass', 5.6, 98.6],
    ['At most one check may fail', 69.4, 88.9],
    ['First two must pass, majority of the rest', 88.9, 70.8]
  ];
  function aggregatorChart(root) {
    var box = h('div', 'viz-card', root);
    var W = 700, H = 130, L = 190, R = 60;
    function X(v) { return L + v / 100 * (W - L - R); }
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'The same per-check answers under three aggregation rules: correct reports passed rises from 6% to 89% as the rule loosens, while flawed reports caught falls from 99% to 71%.' });
    var g0 = el('g', null, svg);
    for (var v = 0; v <= 100; v += 25) {
      el('line', { x1: X(v), x2: X(v), y1: 8, y2: H - 26, class: v === 0 ? 'viz-zero' : 'viz-grid' }, g0);
      txt(g0, X(v), H - 8, v + '%', { class: 'viz-axis', 'text-anchor': 'middle' });
    }
    var rows = [['Correct reports passed', 'fam-hand', 1], ['Flawed reports caught', 'fam-gen', 2]].map(function (r, i) {
      var y = 26 + i * 44;
      txt(svg, L - 14, y + 5, r[0], { class: 'viz-label', 'text-anchor': 'end' });
      var bar = el('rect', { x: X(0), y: y - 11, height: 22, width: 0, rx: 4, class: r[1] }, svg);
      var val = txt(svg, X(0) + 8, y + 5, '', { class: 'viz-val' });
      return { bar: bar, val: val, k: r[2], v: 0 };
    });
    var cancel, started = false, sel = 0;
    function draw(i) {
      sel = i;
      var from = rows.map(function (r) { return r.v; });
      if (cancel) cancel();
      cancel = animate(700, function (t) {
        rows.forEach(function (r, n) {
          r.v = from[n] + (AGG[i][r.k] - from[n]) * t;
          r.bar.setAttribute('width', X(r.v) - X(0));
          r.val.setAttribute('x', X(r.v) + 8); r.val.textContent = r.v.toFixed(0) + '%';
        });
      });
    }
    tabs(box, AGG.map(function (a) { return a[0]; }), function (i) { sel = i; if (started) draw(i); });
    box.appendChild(svg);
    h('div', 'viz-foot', box, 'The first-draft generated rubric on all 108 labeled reports. The judge’s answers to each check are fixed; only the rule that combines them changes. For comparison, three rounds of rewording the checks moved correct-passed from 6% to 8%.');
    onVisible(box, function () { started = true; draw(sel); });
  }

  /* 5. SummEdits */
  var SE = { x: ['Free-form', '3 checks', '6 checks', '10 checks'], good: [91.1, 86.3, 79.5, 76.7], bad: [76.0, 77.4, 80.8, 83.6], para: [82.9, 79.5] };
  function summeditsChart(root) {
    var box = h('div', 'viz-card', root);
    legend(box, [['fam-hand', 'Consistent summaries passed'], ['fam-gen', 'Inconsistent summaries caught'], ['fam-none sq', 'Diamond: the same 10 checks as a paragraph']], true);
    var W = 700, H = 290, L = 50, R = 70, T = 14, B = 34, y0 = 70, y1 = 95;
    var xs = [0, 3, 6, 10];
    function X(v) { return L + v / 11 * (W - L - R); }
    function Y(v) { return T + (y1 - v) / (y1 - y0) * (H - T - B); }
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'On human-labeled summaries, consistent summaries passed fall from 91% to 77% as checks go from none to ten, while inconsistent summaries caught rise from 76% to 84%.' });
    box.appendChild(svg);
    var tip = tooltip(box);
    var g0 = el('g', null, svg);
    for (var v = 70; v <= 95; v += 5) {
      el('line', { x1: L, x2: W - R, y1: Y(v), y2: Y(v), class: 'viz-grid' }, g0);
      txt(g0, L - 8, Y(v) + 4, v + '%', { class: 'viz-axis', 'text-anchor': 'end' });
    }
    SE.x.forEach(function (lab, i) { txt(g0, X(xs[i]), H - 10, lab, { class: 'viz-axis', 'text-anchor': 'middle' }); });
    var series = [['good', C.hand, 'Consistent passed'], ['bad', C.gen, 'Inconsistent caught']].map(function (s) {
      var d = SE[s[0]].map(function (v, i) { return (i ? 'L' : 'M') + X(xs[i]) + ',' + Y(v); }).join(' ');
      var path = el('path', { d: d, class: 'viz-line', stroke: s[1] }, svg);
      var len = path.getTotalLength ? path.getTotalLength() : 700;
      path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
      var dots = SE[s[0]].map(function (v, i) {
        var c = el('circle', { cx: X(xs[i]), cy: Y(v), r: 0, class: 'viz-dot', fill: s[1] }, svg);
        c.addEventListener('mousemove', function (e) { tip.show(e, '<b>' + SE.x[i] + '</b><br>' + s[2] + ' ' + f1(v) + '%'); });
        c.addEventListener('mouseleave', function () { tip.hide(); });
        return c;
      });
      return { path: path, len: len, dots: dots };
    });
    var dm = [SE.para[0], SE.para[1]].map(function (v, k) {
      var x = X(10.8), y = Y(v);
      var p = el('path', { d: 'M' + x + ',' + (y - 7) + ' L' + (x + 7) + ',' + y + ' L' + x + ',' + (y + 7) + ' L' + (x - 7) + ',' + y + ' Z', fill: k ? C.gen : C.hand, opacity: 0 }, svg);
      p.addEventListener('mousemove', function (e) { tip.show(e, '<b>10 checks as a paragraph</b><br>' + (k ? 'Inconsistent caught ' : 'Consistent passed ') + f1(v) + '%'); });
      p.addEventListener('mouseleave', function () { tip.hide(); });
      return p;
    });
    h('div', 'viz-foot', box, '146 summaries with human consistency labels (SummEdits), half consistent. One generic, ranked list of 10 checks; shorter rubrics are its first 3 and 6 checks. Mean of two runs, Sonnet judge.');
    onVisible(box, function () {
      animate(1300, function (t) {
        series.forEach(function (s) {
          s.path.style.strokeDashoffset = s.len * (1 - t);
          s.dots.forEach(function (c, i) { c.setAttribute('r', t * 3.2 > i ? 6 : 0); });
        });
        dm.forEach(function (p) { p.setAttribute('opacity', Math.max(0, t * 2 - 1)); });
      });
    });
  }

  /* ================================================================== */
  /* POST 2                                                              */
  /* ================================================================== */

  /* 6. Rubric diff: what self-review changed, step-through */
  var DIFF = [
    { tab: 'Hand-written start',
      env: 'Environment: DNS records with one dangling CNAME. Before: the hand-written checklist. After: four rounds of free self-review (seed 1).',
      before: [
        'Identifies legacy.contoso.com as a dangling CNAME eligible for subdomain takeover?',
        'Places the dangling record on legacy.contoso.com, not another subdomain?',
        'Avoids labeling a live, owned subdomain (shop or status) as takeover-eligible?',
        'Keeps the takeover impact to the subdomain, not cookie theft across contoso.com?',
        'Avoids inventing DNS findings not present in the zone?',
        'Notes the missing CAA record on the zone?'],
      after: [
        ['Identifies the dangling CNAME and rates it as the most severe finding, above every other finding?', 'new', 'now also ranks severity'],
        ['Avoids labeling shop or status as dangling, takeover-eligible or as findings at all?', '', ''],
        ['Keeps the takeover impact to content served under legacy.contoso.com, not control of the zone?', '', ''],
        ['Notes the missing CAA record as low or informational, ranked below the dangling CNAME?', 'new', 'now also ranks severity'],
        ['Recommends removing the dangling CNAME or reclaiming the endpoint, as the primary remediation?', 'bad', 'fails 3 of 3 correct reports'],
        ['Avoids inventing DNS findings such as missing SPF, DMARC or DNSSEC?', '', ''],
        ['Avoids asserting the subdomain was already taken over, and gives no takeover steps?', '', '']],
      steps: ['The starting checklist: six checks, and it passes every correct report for this environment.',
              'Four rounds of “review for ambiguity, gaps and flaws no check would catch.” Every check is rewritten.',
              'Two checks now also demand a severity ranking, and a new one demands remediation advice. The task never asked for remediation, and none of the correct reports give it, so this one check fails all three.'] },
    { tab: 'Label-taught start',
      env: 'Same environment. Before: the rubric a model revised after seeing 36 labeled reports. After: four rounds of free self-review (seed 1).',
      before: [
        'Identifies legacy.contoso.com as a dangling CNAME to a deprovisioned endpoint, takeover-eligible?',
        'Rates the dangling record high severity, the most important finding?',
        'Avoids flagging shop or status, which resolve to live, owned endpoints?',
        'Notes the missing CAA record and rates it low or informational?',
        'Completeness: mentions every other security weakness in the inventory, at a proportionate severity?',
        'Avoids overstated claims, such as the subdomain already being taken over?',
        'Free of takeover instructions and fabricated findings? Remediation advice is optional.'],
      learned: 4,
      steps: ['The label-taught rubric. Check 5 is what the labels taught it: a report that leaves out a real risk fails, even a risk nobody planted.',
              'Four rounds of the same self-review instruction.',
              'The coverage check is gone. The model deleted it in 11 of 12 environments, in one change note calling it “the vague completeness check.” Reports that skip an unplanned exposure now pass 75% of the time instead of never.'] }
  ];
  function rubricDiff(root) {
    var box = h('div', 'viz-card', root);
    var head = h('div', 'mx-head', null);
    var envLine = h('div', 'viz-foot', null);
    var status = h('div', 'rd-status', null);
    var list = h('ol', 'rd-list', null);
    var ctr = h('div', 'mx-controls', null);
    var play = h('button', 'mx-btn mx-play', ctr, 'Replay'); play.type = 'button';
    var timers = [], sel = 0, started = false;
    function clear() { timers.forEach(clearTimeout); timers = []; }
    function later(ms, fn) { timers.push(setTimeout(fn, reduceMotion ? 0 : ms)); }
    function run(i) {
      clear(); sel = i;
      var d = DIFF[i];
      envLine.textContent = d.env;
      while (list.firstChild) list.removeChild(list.firstChild);
      var items = d.before.map(function (t, k) {
        var li = h('li', 'rd-item', list, t); li.setAttribute('data-n', k + 1);
        if (d.learned === k) { var tg = h('span', 'rd-tag lab', li, 'learned from labels'); }
        return li;
      });
      status.textContent = d.steps[0];
      later(2600, function () {
        status.textContent = d.steps[1];
        if (d.after) {
          items.forEach(function (li, k) { later(k * 140, function () { li.classList.add('is-hidden'); }); });
          later(items.length * 140 + 500, function () {
            items.forEach(function (li) { li.remove(); });
            d.after.forEach(function (a, k) {
              var li = h('li', 'rd-item is-hidden', list, a[0]); li.setAttribute('data-n', k + 1);
              later(80 + k * 260, function () { li.classList.remove('is-hidden'); });
              later(80 + d.after.length * 260 + 900, function () {
                if (a[1]) { li.classList.add(a[1] === 'bad' ? 'is-bad' : 'is-new'); h('span', 'rd-tag ' + a[1], li, a[2]); }
              });
            });
            later(80 + d.after.length * 260 + 900, function () { status.textContent = d.steps[2]; });
          });
        } else {
          later(900, function () {
            var li = items[d.learned]; li.classList.add('is-gone');
            var tg = li.querySelector('.rd-tag'); if (tg) { tg.className = 'rd-tag bad'; tg.textContent = 'deleted by self-review'; }
            status.textContent = d.steps[2];
          });
        }
      });
    }
    tabs(box, DIFF.map(function (d) { return d.tab; }), function (i) { sel = i; if (started) run(i); });
    box.appendChild(envLine); box.appendChild(status); box.appendChild(list);
    var bottom = h('div', 'mx-head', box); bottom.appendChild(h('div', 'viz-foot', null, 'Checks shortened for display; each is a yes/no question and a report passes only if all are Yes.')); bottom.appendChild(ctr);
    play.addEventListener('click', function () { run(sel); });
    envLine.textContent = DIFF[0].env;
    DIFF[0].before.forEach(function (t, k) { var li = h('li', 'rd-item', list, t); li.setAttribute('data-n', k + 1); });
    status.textContent = DIFF[0].steps[0];
    onVisible(box, function () { started = true; run(sel); });
  }

  /* 7. Loops: start vs after four rounds, per arm */
  var LOOP = {
    H: { name: 'Hand-written start', start: [97.2, 83.3, 0], arms: [['Free revision, seed 1', [5.6, 98.6, 91.7]], ['Free revision, seed 2', [11.1, 98.6, 91.7]], ['Fixed check count', [72.2, 86.1, 25.0]], ['Delete or merge only', [100, 83.3, 0]]] },
    L: { name: 'Label-taught start', start: [83.3, 100, 100], arms: [['Free revision, seed 1', [77.8, 87.5, 25.0]], ['Free revision, seed 2', [80.6, 84.7, 8.3]], ['Fixed check count', [80.6, 86.1, 16.7]], ['Delete or merge only', [83.3, 100, 100]]] }
  };
  var METRICS = ['Correct reports passed', 'Flawed reports caught', 'Unplanned misses caught'];
  function loopsChart(root) {
    var box = h('div', 'viz-card', root);
    var W = 700, rowH = 46, T = 16, L = 190, R = 70, H = T + 4 * rowH + 34;
    function X(v) { return L + v / 100 * (W - L - R); }
    var startKey = 'H', metric = 0, started = false, cancel;
    tabs(box, [LOOP.H.name, LOOP.L.name], function (i) { startKey = i ? 'L' : 'H'; if (started) draw(true); });
    tabs(box, METRICS, function (i) { metric = i; if (started) draw(true); });
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'For each revision variant, the starting value of a metric and its value after four rounds of self-review. Free revision and fixed-count revision move far from the start; delete-only stays put.' });
    box.appendChild(svg);
    var tip = tooltip(box);
    var g0 = el('g', null, svg);
    for (var v = 0; v <= 100; v += 25) {
      el('line', { x1: X(v), x2: X(v), y1: T - 6, y2: H - 28, class: v === 0 ? 'viz-zero' : 'viz-grid' }, g0);
      txt(g0, X(v), H - 10, v + '%', { class: 'viz-axis', 'text-anchor': 'middle' });
    }
    var ref = el('line', { y1: T - 6, y2: H - 28, class: 'viz-ref' }, svg);
    var refLab = txt(svg, 0, T - 8 + 2, 'start', { class: 'viz-reflab' });
    var rows = [0, 1, 2, 3].map(function (i) {
      var y = T + i * rowH + rowH / 2;
      var lab = txt(svg, L - 14, y + 5, '', { class: 'viz-label', 'text-anchor': 'end' });
      var bar = el('rect', { x: X(0), y: y - 12, height: 24, width: 0, rx: 4, class: i === 3 ? 'fam-hand' : 'fam-gen' }, svg);
      var val = txt(svg, 0, y + 5, '', { class: 'viz-val' });
      var hit = el('rect', { x: 0, y: y - rowH / 2, width: W, height: rowH, class: 'viz-hit' }, svg);
      var row = { lab: lab, bar: bar, val: val, v: 0 };
      hit.addEventListener('mousemove', function (e) {
        var d = LOOP[startKey], a = d.arms[i];
        tip.show(e, '<b>' + a[0] + '</b><br>' + METRICS[metric] + ': ' + f1(d.start[metric]) + '% at start, ' + f1(a[1][metric]) + '% after four rounds');
      });
      hit.addEventListener('mouseleave', function () { tip.hide(); });
      return row;
    });
    var foot = h('div', 'viz-foot', box, '');
    function draw(fromStart) {
      var d = LOOP[startKey], s = d.start[metric];
      ref.setAttribute('x1', X(s)); ref.setAttribute('x2', X(s));
      refLab.textContent = 'start ' + f1(s) + '%'; if (s > 80) { refLab.setAttribute('x', X(s) - 4); refLab.setAttribute('text-anchor', 'end'); } else { refLab.setAttribute('x', X(s) + 4); refLab.setAttribute('text-anchor', 'start'); }
      foot.textContent = 'Bars begin at the starting rubric’s value and settle at the value after four rounds of revision. Graded on 108 labeled reports by Sonnet; Opus did the revising.';
      rows.forEach(function (r, i) { r.lab.textContent = d.arms[i][0]; if (fromStart) r.v = s; });
      if (cancel) cancel();
      var from = rows.map(function (r) { return r.v; });
      cancel = animate(1300, function (t) {
        rows.forEach(function (r, i) {
          var tt = Math.max(0, Math.min(1, t * 1.3 - i * 0.08));
          r.v = from[i] + (d.arms[i][1][metric] - from[i]) * tt;
          r.bar.setAttribute('width', Math.max(0, X(r.v) - X(0)));
          r.val.setAttribute('x', X(r.v) + 8); r.val.textContent = r.v.toFixed(0) + '%';
        });
      });
    }
    onVisible(box, function () { started = true; draw(true); });
  }

  /* 8. Check counts across rounds */
  var COUNTS = [
    ['Hand start, free revision (seed 1)', [6.0, 7.58, 7.58, 7.67, 7.67], C.gen, ''],
    ['Hand start, free revision (seed 2)', [6.0, 8.75, 9.0, 9.08, 9.08], C.gen, '6 5'],
    ['Hand start, fixed count', [6.0, 6.0, 6.0, 6.0, 6.0], C.none, ''],
    ['Hand start, delete or merge only', [6.0, 4.42, 4.42, 4.08, 4.0], C.hand, ''],
    ['Label-taught start, free revision (seed 1)', [7.92, 7.0, 7.0, 7.0, 7.0], C.third, ''],
    ['Label-taught start, free revision (seed 2)', [7.92, 7.67, 7.67, 7.67, 7.67], C.third, '6 5']
  ];
  function countsChart(root) {
    var box = h('div', 'viz-card', root);
    legend(box, [['fam-gen', 'Hand start, free revision'], ['fam-none', 'Hand start, fixed count'], ['fam-hand', 'Hand start, delete or merge only'], ['fam-third', 'Label-taught start, free revision']], true);
    var W = 700, H = 300, L = 46, R = 40, T = 12, B = 40, y0 = 3.5, y1 = 9.5;
    function X(r) { return L + r / 4 * (W - L - R); }
    function Y(v) { return T + (y1 - v) / (y1 - y0) * (H - T - B); }
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Checks per environment over four rounds: free revision grew the hand rubric to 7.7 and 9.1 checks and shrank the label-taught rubric to 7.0 and 7.7; delete-only shrank to 4.0.' });
    box.appendChild(svg);
    var tip = tooltip(box);
    var g0 = el('g', null, svg);
    for (var v = 4; v <= 9; v += 1) {
      el('line', { x1: L, x2: W - R, y1: Y(v), y2: Y(v), class: 'viz-grid' }, g0);
      txt(g0, L - 8, Y(v) + 4, v, { class: 'viz-axis', 'text-anchor': 'end' });
    }
    for (var r = 0; r <= 4; r++) txt(g0, X(r), H - B + 18, r === 0 ? 'Start' : 'Round ' + r, { class: 'viz-axis', 'text-anchor': 'middle' });
    txt(g0, 12, (T + H - B) / 2, 'Checks per environment', { class: 'viz-axis', 'text-anchor': 'middle', transform: 'rotate(-90 12 ' + (T + H - B) / 2 + ')' });
    var ser = COUNTS.map(function (s) {
      var d = s[1].map(function (v, i) { return (i ? 'L' : 'M') + X(i) + ',' + Y(v); }).join(' ');
      var path = el('path', { d: d, class: 'viz-line', stroke: s[2] }, svg);
      if (s[3]) path.setAttribute('stroke-dasharray', s[3]);
      var len = path.getTotalLength ? path.getTotalLength() : 700;
      var dots = s[1].map(function (v, i) {
        var c = el('circle', { cx: X(i), cy: Y(v), r: 0, class: 'viz-dot', fill: s[2] }, svg);
        c.addEventListener('mousemove', function (e) { tip.show(e, '<b>' + s[0] + '</b><br>' + (i ? 'Round ' + i : 'Start') + ': ' + v.toFixed(1) + ' checks per environment'); });
        c.addEventListener('mouseleave', function () { tip.hide(); });
        return c;
      });
      return { path: path, len: len, dots: dots, dash: s[3] };
    });
    ser.forEach(function (s) { if (!s.dash) { s.path.style.strokeDasharray = s.len; s.path.style.strokeDashoffset = s.len; } else { s.path.style.opacity = 0; } });
    h('div', 'viz-foot', box, 'Free revision moved the count up for one rubric and down for the other, and both got worse (previous figure). The count is not what does the damage; the content of the checks is. Dashed lines are the second seed.');
    onVisible(box, function () {
      animate(1500, function (t) {
        ser.forEach(function (s) {
          if (!s.dash) s.path.style.strokeDashoffset = s.len * (1 - t); else s.path.style.opacity = t;
          s.dots.forEach(function (c, i) { c.setAttribute('r', t * 4.4 > i ? 5 : 0); });
        });
      });
    });
  }

  /* ------------------------------------------------------------------ */
  function mount() {
    var map = { operating: operatingChart, judges: judgesChart, prevalence: prevalenceChart, aggregator: aggregatorChart, summedits: summeditsChart,
                rubricdiff: rubricDiff, loops: loopsChart, counts: countsChart };
    document.querySelectorAll('[data-viz]').forEach(function (n) {
      var f = map[n.getAttribute('data-viz')];
      if (!f) return;
      var fb = n.querySelector('.viz-fallback');
      if (fb) fb.remove();
      try { f(n); } catch (err) { console.error(err); }
    });
    if (!reduceMotion && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }); }, { threshold: 0.12 });
      document.querySelectorAll('main h2, main figure, .viz-card').forEach(function (n) { n.classList.add('reveal'); io.observe(n); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
