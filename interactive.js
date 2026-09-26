/* Interactive figures for "Letting agents design their own judges".
   Plain JavaScript + inline SVG, no dependencies. Each figure mounts into a
   <div data-viz="..."> placeholder and leaves a static <noscript> image as fallback. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  /* ------------------------------------------------------------------ */
  /* 1. Method explorer: step-through animated diagram                   */
  /* ------------------------------------------------------------------ */
  function methodExplorer(root) {
    var W = 760, H = 440;
    var wrap = h('div', 'mx', root);
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'SelfSuite: the agent designs and freezes its own evaluation suite once per world, then uses it on every task to gate one retry and to label memory.' }, wrap);
    var defs = el('defs', null, svg);
    ['ink', 'suite', 'mem', 'design'].forEach(function (k) {
      var m = el('marker', { id: 'mx-arrow-' + k, viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' }, defs);
      el('path', { d: 'M0,0 L10,5 L0,10 z', class: 'mx-ah mx-ah-' + k }, m);
    });

    // panels
    el('rect', { x: 8, y: 8, width: 212, height: 424, rx: 12, class: 'mx-panel mx-panel-design' }, svg);
    el('rect', { x: 234, y: 8, width: 518, height: 424, rx: 12, class: 'mx-panel mx-panel-deploy' }, svg);
    txt(svg, 24, 34, 'Once per world', { class: 'mx-ptitle' });
    txt(svg, 24, 50, 'offline, no labels needed', { class: 'mx-psub' });
    txt(svg, 250, 34, 'Every task', { class: 'mx-ptitle' });
    txt(svg, 346, 34, 'online, no ground truth', { class: 'mx-psub' });

    var nodes = {};
    function node(id, x, y, w, hgt, title, sub, kind) {
      var g = el('g', { class: 'mx-node mx-' + kind, 'data-id': id, tabindex: '0' }, svg);
      el('rect', { x: x, y: y, width: w, height: hgt, rx: 8 }, g);
      txt(g, x + w / 2, y + (sub ? hgt / 2 - 3 : hgt / 2 + 4), title, { class: 'mx-t', 'text-anchor': 'middle' });
      if (sub) txt(g, x + w / 2, y + hgt / 2 + 13, sub, { class: 'mx-s', 'text-anchor': 'middle' });
      nodes[id] = { g: g, x: x, y: y, w: w, h: hgt, cx: x + w / 2, cy: y + hgt / 2 };
      return g;
    }
    node('world', 26, 66, 176, 50, 'World materials', 'summary, policy, tools', 'design');
    node('arch', 26, 142, 176, 50, 'Architect', "the agent's own model", 'design');
    node('spec', 26, 218, 176, 50, 'Suite specification', 'judges, brief, threshold', 'design');
    node('cal', 26, 294, 176, 50, 'Expert calibration', 'optional: ten labels', 'design mx-dashed');
    node('frozen', 26, 370, 176, 44, 'Frozen suite', '', 'design mx-solid');

    node('task', 252, 80, 86, 44, 'Task', '', 'deploy');
    node('att', 384, 72, 148, 60, 'Agent attempt', 'guided by lessons', 'deploy');
    node('mem', 600, 72, 134, 60, 'Memory', 'typed lessons + ledger', 'mem');
    // suite group
    var sg = el('g', { class: 'mx-group', 'data-id': 'suite' }, svg);
    el('rect', { x: 262, y: 178, width: 472, height: 104, rx: 10 }, sg);
    txt(sg, 276, 197, 'Frozen suite (evaluator)', { class: 'mx-gtitle' });
    nodes.suite = { g: sg, x: 262, y: 178, w: 472, h: 104, cx: 498, cy: 230 };
    node('brief', 276, 210, 138, 56, 'TaskBrief', 'criteria, grounded', 'suite');
    node('state', 429, 210, 138, 56, 'State read-back', 'query the world', 'suite');
    node('judges', 582, 210, 138, 56, 'Judges', 'veto or soft, vs τ', 'suite');
    node('keep', 330, 330, 164, 56, 'Keep-best', 'replace only if better by m', 'deploy');
    node('extract', 542, 330, 164, 56, 'Extract lessons', 'credit or debit the ledger', 'mem');

    // edges: id -> path d
    var edges = {
      e_world_arch: ['M114,116 L114,142', 'design'],
      e_arch_spec: ['M114,192 L114,218', 'design'],
      e_spec_cal: ['M114,268 L114,294', 'design'],
      e_cal_frozen: ['M114,344 L114,370', 'design'],
      e_frozen_suite: ['M202,392 L228,392 L228,258 L262,258', 'design dashed'],
      e_task_att: ['M338,102 L384,102', 'ink'],
      e_mem_att: ['M600,102 L532,102', 'mem'],
      e_att_suite: ['M458,132 L458,178', 'ink'],
      e_suite_retry: ['M262,204 L244,204 L244,60 L440,60 L440,72', 'suite'],
      e_suite_keep: ['M412,282 L412,330', 'ink'],
      e_keep_extract: ['M494,358 L542,358', 'ink'],
      e_extract_mem: ['M706,358 L744,358 L744,102 L734,102', 'mem']
    };
    var paths = {};
    Object.keys(edges).forEach(function (k) {
      var kind = edges[k][1].split(' ')[0];
      paths[k] = el('path', { d: edges[k][0], class: 'mx-edge mx-edge-' + edges[k][1].replace(' ', ' mx-edge-'), 'marker-end': 'url(#mx-arrow-' + kind + ')' }, svg);
    });
    // edge labels
    var elabels = [
      ['top-5 lessons', 566, 92, 'e_mem_att'],
      ['trajectory + state', 466, 160, 'e_att_suite'],
      ['fail, budget left: one retry with distilled feedback', 400, 53, 'e_suite_retry'],
      ['verdict, score', 420, 312, 'e_suite_keep'],
      ['freeze, deploy', 222, 340, 'e_frozen_suite']
    ];
    var labs = elabels.map(function (l) {
      var t = txt(svg, l[1], l[2], l[0], { class: 'mx-elabel', 'text-anchor': l[3] === 'e_mem_att' || l[3] === 'e_suite_retry' ? 'middle' : 'start' });
      if (l[3] === 'e_frozen_suite') t.setAttribute('transform', 'rotate(-90 ' + l[1] + ' ' + l[2] + ')');
      t.setAttribute('data-edge', l[3]);
      return t;
    });

    // token + badge
    var token = el('circle', { r: 6, class: 'mx-token', cx: -20, cy: -20 }, svg);
    var badge = el('g', { class: 'mx-badge', opacity: 0 }, svg);
    var badgeRect = el('rect', { rx: 6, height: 24 }, badge);
    var badgeText = txt(badge, 0, 0, '', { class: 'mx-badge-t' });

    var steps = [
      { title: 'The whole loop', on: Object.keys(nodes), edges: Object.keys(edges),
        text: 'SelfSuite has two phases. Once per world, the agent\'s own model designs an evaluation suite and freezes it. Then, on every task, that frozen suite decides whether to retry and labels what goes into memory. Press play, or step through.' },
      { title: '1. Read what an engineer would read', on: ['world', 'arch'], edges: ['e_world_arch'], run: ['e_world_arch'],
        text: 'The architect is the agent\'s own base model. It gets the world summary, the policy document, the tool signatures and three unlabelled example tasks. No answers, no benchmark reward.' },
      { title: '2. Write the suite', on: ['arch', 'spec'], edges: ['e_arch_spec'], run: ['e_arch_spec'],
        text: 'It writes one specification: a few weighted judges (each a single criterion, folded as a hard veto or a soft score), a TaskBrief policy that turns each instruction into grounded success criteria, an aggregation rule with a pass threshold τ, and a retry policy.' },
      { title: '3. Optional: ten expert labels, then freeze', on: ['spec', 'cal', 'frozen'], edges: ['e_spec_cal', 'e_cal_frozen'], run: ['e_spec_cal', 'e_cal_frozen'],
        text: 'If a subject-matter expert grades ten onboarding tasks, six labels propose a better folding, aggregation and threshold for the judges the model already wrote, and four act as a strict gate. Either way the suite is then frozen for the whole deployment.' },
      { title: '4. A task arrives', on: ['task', 'att', 'mem', 'frozen'], edges: ['e_task_att', 'e_mem_att', 'e_frozen_suite'], run: ['e_frozen_suite', 'e_task_att', 'e_mem_att'],
        text: 'The five most relevant lessons are retrieved from memory and the agent attempts the task with them in its prompt.' },
      { title: '5. The suite judges the world, not the transcript', on: ['att', 'suite', 'brief', 'state', 'judges'], edges: ['e_att_suite'], run: ['e_att_suite'], badge: ['judges', 'Attempt 1: veto fails', 'fail'],
        text: 'The brief lists what "done" means for this task. A read-only query reads back the records the agent touched. Each judge scores the attempt against the brief and the state; a failed veto fails the attempt. Here the first attempt fails (an illustrative example).' },
      { title: '6. One retry, with feedback', on: ['judges', 'att', 'suite'], edges: ['e_suite_retry'], run: ['e_suite_retry'],
        text: 'Because the attempt failed and the budget allows two attempts, the failing judges\' reasons are distilled into one instruction about what the world evidence showed, and the agent tries again.' },
      { title: '7. Keep-best picks what to submit', on: ['att', 'suite', 'judges', 'keep'], edges: ['e_att_suite', 'e_suite_keep'], run: ['e_att_suite', 'e_suite_keep'], badge: ['keep', 'Attempt 2 kept', 'pass', 'below'],
        text: 'A later attempt replaces the first only if the suite scores it higher by a margin m. A noisy retry cannot displace the first attempt unless the suite clearly prefers it, which keeps the retry low-risk.' },
      { title: '8. Learn, and keep score', on: ['keep', 'extract', 'mem'], edges: ['e_keep_extract', 'e_extract_mem'], run: ['e_keep_extract', 'e_extract_mem'],
        text: 'Lessons are extracted and stored as typed "do" or "avoid" entries. Every lesson that was used gets credited or debited by the suite\'s verdict, so lessons that keep preceding failures are evicted.' }
    ];

    // controls
    var panel = h('div', 'mx-panel-text', wrap);
    var head = h('div', 'mx-head', panel);
    var title = h('div', 'mx-title', head);
    var ctr = h('div', 'mx-controls', head);
    var prev = h('button', 'mx-btn', ctr, '‹');
    prev.type = 'button'; prev.setAttribute('aria-label', 'Previous step');
    var play = h('button', 'mx-btn mx-play', ctr, 'Play');
    play.type = 'button';
    var next = h('button', 'mx-btn', ctr, '›');
    next.type = 'button'; next.setAttribute('aria-label', 'Next step');
    var body = h('p', 'mx-body', panel);
    var dots = h('div', 'mx-dots', panel);
    var dotEls = steps.map(function (s, i) {
      var d = h('button', 'mx-dot', dots);
      d.type = 'button';
      d.setAttribute('aria-label', s.title);
      d.addEventListener('click', function () { stopPlay(); go(i); });
      return d;
    });

    var cur = 0, playing = false, timer = null, cancelRun = null;
    function setActive(s) {
      Object.keys(nodes).forEach(function (k) {
        nodes[k].g.classList.toggle('is-dim', s.on.indexOf(k) < 0);
        nodes[k].g.classList.toggle('is-on', s.on.indexOf(k) >= 0 && steps.indexOf(s) > 0);
      });
      Object.keys(paths).forEach(function (k) { paths[k].classList.toggle('is-dim', s.edges.indexOf(k) < 0); });
      labs.forEach(function (t) { t.classList.toggle('is-dim', s.edges.indexOf(t.getAttribute('data-edge')) < 0); });
    }
    function showBadge(b) {
      if (!b) { badge.setAttribute('opacity', 0); return; }
      var n = nodes[b[0]];
      badgeText.textContent = b[1];
      badge.setAttribute('class', 'mx-badge mx-badge-' + b[2]);
      var tw = b[1].length * 6.6 + 18;
      var bx = Math.min(W - tw - 8, n.cx - tw / 2), by = b[3] === 'below' ? n.y + n.h + 8 : n.y - 30;
      badgeRect.setAttribute('x', bx); badgeRect.setAttribute('y', by); badgeRect.setAttribute('width', tw);
      badgeText.setAttribute('x', bx + tw / 2); badgeText.setAttribute('y', by + 16); badgeText.setAttribute('text-anchor', 'middle');
      badge.setAttribute('opacity', 1);
    }
    function runEdges(list, done) {
      if (!list || !list.length) { token.setAttribute('cx', -20); if (done) done(); return; }
      var i = 0;
      function one() {
        if (i >= list.length) { if (done) done(); return; }
        var p = paths[list[i]], L = p.getTotalLength();
        token.setAttribute('class', 'mx-token mx-token-' + (edges[list[i]][1].split(' ')[0]));
        cancelRun = animate(Math.max(500, L * 4.2), function (t) {
          var pt = p.getPointAtLength(t * L);
          token.setAttribute('cx', pt.x); token.setAttribute('cy', pt.y);
        }, function () { i++; one(); });
      }
      one();
    }
    function go(i) {
      if (cancelRun) cancelRun();
      cur = (i + steps.length) % steps.length;
      var s = steps[cur];
      setActive(s);
      showBadge(null);
      title.textContent = s.title;
      body.textContent = s.text;
      dotEls.forEach(function (d, j) { d.classList.toggle('is-cur', j === cur); });
      runEdges(s.run, function () { showBadge(s.badge); if (playing) timer = setTimeout(function () { go(cur + 1 >= steps.length ? 1 : cur + 1); }, reduceMotion ? 4000 : 2600); });
    }
    function stopPlay() { playing = false; play.textContent = 'Play'; clearTimeout(timer); }
    play.addEventListener('click', function () {
      if (playing) { stopPlay(); return; }
      playing = true; play.textContent = 'Pause';
      go(cur === 0 || cur >= steps.length - 1 ? 1 : cur + 1);
    });
    prev.addEventListener('click', function () { stopPlay(); go(cur - 1); });
    next.addEventListener('click', function () { stopPlay(); go(cur + 1); });
    // clicking a node jumps to the first step that features it
    Object.keys(nodes).forEach(function (k) {
      nodes[k].g.addEventListener('click', function () {
        stopPlay();
        for (var i = 1; i < steps.length; i++) { if (steps[i].on.indexOf(k) >= 0) { go(i); return; } }
      });
      nodes[k].g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nodes[k].g.dispatchEvent(new Event('click')); } });
    });
    go(0);
    onVisible(wrap, function () { if (!reduceMotion) { playing = true; play.textContent = 'Pause'; go(1); } });
  }

  /* ------------------------------------------------------------------ */
  /* 2. Main results: dots + 95% CI, switchable benchmark                */
  /* ------------------------------------------------------------------ */
  var RESULTS = [
    { name: 'Plain agent', fam: 'agent', overall: [76.4, 6.2, 68.7, 84.1], tau2: [74.4, 5.4, 67.7, 81.1], appworld: [78.4, 9.6, 66.4, 90.4] },
    { name: 'ACE, cold', fam: 'ace-light', overall: [81.2, 3.6, 76.7, 85.7], tau2: [71.2, 8.7, 60.4, 82.0], appworld: [91.2, 3.4, 87.0, 95.4] },
    { name: 'ACE + warm playbook', fam: 'ace', note: 'ten expert labels', overall: [84.0, 3.2, 80.1, 87.9], tau2: [77.6, 6.1, 70.1, 85.1], appworld: [90.4, 3.6, 86.0, 94.8] },
    { name: 'SelfSuite, no labels', fam: 'ss-light', overall: [82.4, 3.9, 77.6, 87.2], tau2: [78.4, 7.8, 68.7, 88.1], appworld: [86.4, 2.2, 83.7, 89.1] },
    { name: 'SelfSuite + expert calibration', fam: 'ss', note: 'ten expert labels', overall: [84.4, 4.6, 78.7, 90.1], tau2: [79.2, 5.9, 71.8, 86.6], appworld: [89.6, 3.6, 85.2, 94.0] }
  ];
  function resultsChart(root) {
    var groups = [['overall', 'Overall'], ['tau2', 'Tau2 (policy-heavy)'], ['appworld', 'AppWorld (code execution)']];
    var box = h('div', 'viz-card', root);
    var W = 700, rowH = 46, top = 16, left = 214, right = 60, H = top + RESULTS.length * rowH + 40;
    var x0 = 55, x1 = 100;
    function X(v) { return left + (v - x0) / (x1 - x0) * (W - left - right); }
    var tip;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Success rate with 95% confidence intervals for five methods, five matched repeats.' });
    var sel;
    // tabs above
    var g0 = el('g', null, svg);
    for (var v = 60; v <= 100; v += 10) {
      el('line', { x1: X(v), x2: X(v), y1: top - 6, y2: H - 34, class: 'viz-grid' }, g0);
      txt(g0, X(v), H - 16, v + '%', { class: 'viz-axis', 'text-anchor': 'middle' });
    }
    var ref = el('line', { y1: top - 6, y2: H - 34, class: 'viz-ref' }, g0);
    var refLab = txt(g0, 0, H - 38, 'plain agent', { class: 'viz-reflab', 'text-anchor': 'start' });
    var rows = RESULTS.map(function (r, i) {
      var y = top + i * rowH + rowH / 2;
      var g = el('g', { class: 'viz-row' }, svg);
      txt(g, left - 14, y - 1, r.name, { class: 'viz-label', 'text-anchor': 'end' });
      if (r.note) txt(g, left - 14, y + 13, r.note, { class: 'viz-note', 'text-anchor': 'end' });
      var ci = el('line', { y1: y, y2: y, class: 'viz-ci fam-' + r.fam }, g);
      var dot = el('circle', { cy: y, r: 7, class: 'viz-dot fam-' + r.fam }, g);
      var val = txt(g, 0, y + 4, '', { class: 'viz-val' });
      var hit = el('rect', { x: 0, y: y - rowH / 2, width: W, height: rowH, class: 'viz-hit' }, g);
      var state = { mean: 60, lo: 60, hi: 60 };
      hit.addEventListener('mousemove', function (e) {
        var d = r[sel];
        tip.show(e, '<b>' + r.name + '</b><br>' + d[0].toFixed(1) + '% mean, SD ' + d[1].toFixed(1) + '<br>95% CI ' + d[2].toFixed(1) + ' to ' + d[3].toFixed(1));
      });
      hit.addEventListener('mouseleave', function () { tip.hide(); });
      return { r: r, ci: ci, dot: dot, val: val, state: state };
    });
    var cancel = null;
    function draw(key, instant) {
      sel = key;
      var target = RESULTS.map(function (r) { return { mean: r[key][0], lo: r[key][2], hi: r[key][3] }; });
      var from = rows.map(function (rw) { return Object.assign({}, rw.state); });
      var refFrom = +ref.getAttribute('data-v') || RESULTS[0][key][0], refTo = RESULTS[0][key][0];
      if (cancel) cancel();
      function paint(t) {
        rows.forEach(function (rw, i) {
          var s = rw.state, a = from[i], b = target[i];
          s.mean = a.mean + (b.mean - a.mean) * t; s.lo = a.lo + (b.lo - a.lo) * t; s.hi = a.hi + (b.hi - a.hi) * t;
          rw.ci.setAttribute('x1', X(s.lo)); rw.ci.setAttribute('x2', X(s.hi));
          rw.dot.setAttribute('cx', X(s.mean));
          rw.val.setAttribute('x', X(s.hi) + 8);
          rw.val.textContent = s.mean.toFixed(1);
        });
        var rv = refFrom + (refTo - refFrom) * t;
        ref.setAttribute('x1', X(rv)); ref.setAttribute('x2', X(rv)); ref.setAttribute('data-v', rv);
        refLab.setAttribute('x', X(rv) + 4);
      }
      if (instant) paint(1); else cancel = animate(750, paint);
    }
    var pick = tabs(box, groups.map(function (g) { return g[1]; }), function (i) { if (rows) draw(groups[i][0], false); });
    box.appendChild(svg);
    tip = tooltip(box);
    var legend = h('div', 'viz-legend', box);
    [['agent', 'Plain agent'], ['ace', 'ACE (Agentic Context Engineering)'], ['ss', 'SelfSuite']].forEach(function (l) {
      var s = h('span', 'viz-key', legend); h('i', 'sw fam-' + l[0], s); s.appendChild(document.createTextNode(l[1]));
    });
    h('div', 'viz-foot', box, 'Mean of five matched repeats of 50 tasks (GPT-5.5); bars are 95% confidence intervals. Lighter shade: no expert labels.');
    rows.forEach(function (rw) { rw.state = { mean: 55, lo: 55, hi: 55 }; });
    draw('overall', true);
    onVisible(box, function () { rows.forEach(function (rw) { rw.state = { mean: 55, lo: 55, hi: 55 }; }); draw(sel, false); });
  }

  /* ------------------------------------------------------------------ */
  /* 3. Ablations: paired deltas, switchable slice                        */
  /* ------------------------------------------------------------------ */
  var ABL = [
    ['Plain agent', [-7.8, 5.8], [-8.5, 4.7], [-0.1, 5.7], [-14.0, 16.9]],
    ['ACE, no labels', [-4.6, 2.3], [-11.6, 4.3], [1.5, 3.4], [0.1, 5.7]],
    ['One attempt (no retry)', [-7.8, 3.5], [-14.9, 5.7], [-3.2, 4.4], [-1.4, 6.7]],
    ['No memory', [-6.4, 9.2], [-8.5, 12.7], [-3.3, 4.6], [-5.9, 14.1]],
    ['Positive-only memory', [-3.2, 5.2], [-5.3, 9.8], [-3.3, 7.1], [0.1, 5.7]],
    ['Negative-only memory', [-2.8, 5.0], [-5.3, 3.7], [-0.1, 5.7], [-1.3, 10.3]],
    ['Default (full) memory', [-2.7, 1.9], [-2.1, 2.9], [-3.2, 4.4], [-3.1, 7.2]],
    ['One monolithic critic', [-1.8, 4.1], [-3.2, 6.0], [-3.2, 4.4], [1.9, 10.6]],
    ['No TaskBrief', [-0.9, 5.3], [-1.0, 4.5], [-1.8, 6.7], [0.4, 12.7]]
  ];
  function ablationChart(root) {
    var box = h('div', 'viz-card', root);
    var slices = ['Overall', 'Tau2', 'AppWorld normal', 'AppWorld challenge'];
    var W = 700, rowH = 34, top = 30, gap = 34, left = 214, right = 30, H = top + ABL.length * rowH + gap + 38;
    var x0 = -32, x1 = 18;
    function Y(i) { return top + i * rowH + (i >= 2 ? gap : 0) + rowH / 2; }
    function X(v) { return left + (v - x0) / (x1 - x0) * (W - left - right); }
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Paired difference from SelfSuite for two label-free baselines and for SelfSuite with one component removed, over five matched repeats.' });
    var g0 = el('g', null, svg);
    for (var v = -30; v <= 15; v += 10) {
      el('line', { x1: X(v), x2: X(v), y1: top - 4, y2: H - 30, class: v === 0 ? 'viz-zero' : 'viz-grid' }, g0);
      txt(g0, X(v), H - 12, (v > 0 ? '+' : '') + v, { class: 'viz-axis', 'text-anchor': 'middle' });
    }
    txt(g0, 14, top - 12, 'Label-free baselines on the same tasks', { class: 'viz-model' });
    txt(g0, 14, top + 2 * rowH + gap - 12, 'SelfSuite with one component removed', { class: 'viz-model' });
    var tip, sel = 1;
    var rows = ABL.map(function (a, i) {
      var y = Y(i);
      var g = el('g', { class: 'viz-row' }, svg);
      txt(g, left - 14, y + 4, a[0], { class: 'viz-label' + (i === 2 ? ' is-key' : ''), 'text-anchor': 'end' });
      var bar = el('rect', { y: y - 9, height: 18, rx: 4, class: 'viz-bar' + (i === 2 ? ' is-key' : i === 0 ? ' is-agent' : i === 1 ? ' is-ace' : '') }, g);
      var wh = el('line', { y1: y, y2: y, class: 'viz-whisk' }, g);
      var val = txt(g, 0, y + 4, '', { class: 'viz-val' });
      var hit = el('rect', { x: 0, y: y - rowH / 2, width: W, height: rowH, class: 'viz-hit' }, g);
      var st = { m: 0, sd: 0 };
      hit.addEventListener('mousemove', function (e) {
        var d = a[sel];
        tip.show(e, '<b>' + a[0] + '</b><br>' + slices[sel - 1] + ': ' + (d[0] > 0 ? '+' : '') + d[0].toFixed(1) + ' pp<br>SD of the five paired differences ' + d[1].toFixed(1));
      });
      hit.addEventListener('mouseleave', function () { tip.hide(); });
      return { a: a, bar: bar, wh: wh, val: val, st: st };
    });
    var cancel;
    function draw(ix, from0) {
      sel = ix;
      var from = rows.map(function (r) { return from0 ? { m: 0, sd: 0 } : Object.assign({}, r.st); });
      if (cancel) cancel();
      cancel = animate(700, function (t) {
        rows.forEach(function (r, i) {
          var b = r.a[ix], s = r.st;
          s.m = from[i].m + (b[0] - from[i].m) * t; s.sd = from[i].sd + (b[1] - from[i].sd) * t;
          var xa = X(Math.min(0, s.m)), xb = X(Math.max(0, s.m));
          r.bar.setAttribute('x', xa); r.bar.setAttribute('width', Math.max(0.5, xb - xa));
          r.wh.setAttribute('x1', X(s.m - s.sd)); r.wh.setAttribute('x2', X(s.m + s.sd));
          r.val.textContent = (s.m > 0 ? '+' : '') + s.m.toFixed(1);
          r.val.setAttribute('x', X(Math.max(s.m + s.sd, 0)) + 8);
        });
      });
    }
    tabs(box, slices, function (i) { draw(i + 1, false); });
    box.appendChild(svg);
    tip = tooltip(box);
    h('div', 'viz-foot', box, 'Paired difference from SelfSuite in percentage points, five matched repeats of 43 or 44 tasks (GPT-5.5): bar is the mean, whisker ±1 SD. Negative means worse than SelfSuite.');
    rows.forEach(function (r) { r.st = { m: 0, sd: 0 }; });
    onVisible(box, function () { draw(sel, true); });
  }

  /* ------------------------------------------------------------------ */
  /* 4. Headroom: deployed -> best-attempt oracle                         */
  /* ------------------------------------------------------------------ */
  var HEAD = [
    ['GPT-5.5', 'AppWorld normal', 91.67, 92.26, 90.48, 87.50],
    ['GPT-5.5', 'AppWorld challenge', 77.70, 84.41, 71.22, 64.51],
    ['GPT-5.5', 'Airline', 66.00, 74.00, 70.0, 64.0],
    ['GPT-5.5', 'Retail', 83.33, 92.11, 83.33, 83.33],
    ['GPT-5.5', 'Telecom', 75.44, 84.21, 69.30, 70.18],
    ['Opus-4.8', 'AppWorld normal', 92.26, 94.05, 86.90, 70.83],
    ['Opus-4.8', 'Airline', 66.00, 72.00, 70.0, 68.0],
    ['Opus-4.8', 'Retail', 85.09, 92.98, 85.09, 82.46],
    ['Opus-4.8', 'Telecom', 73.68, 92.11, 69.30, 62.28]
  ];
  function headroomChart(root) {
    var box = h('div', 'viz-card', root);
    var legend = h('div', 'viz-legend viz-legend-top', box);
    [['dot-ss', 'SelfSuite, deployed'], ['ring-ss', 'Best attempt it produced (oracle)'], ['tick-ace', 'ACE'], ['tick-agent', 'Plain agent']].forEach(function (l) {
      var s = h('span', 'viz-key', legend); h('i', 'sw ' + l[0], s); s.appendChild(document.createTextNode(l[1]));
    });
    var W = 700, rowH = 34, top = 10, left = 214, right = 56, H = top + HEAD.length * rowH + 36;
    var x0 = 60, x1 = 100;
    function X(v) { return left + (v - x0) / (x1 - x0) * (W - left - right); }
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'For each model and world, the deployed SelfSuite success rate and the best-attempt oracle; the oracle is 7.4 points higher on average.' });
    box.appendChild(svg);
    var tip = tooltip(box);
    var g0 = el('g', null, svg);
    for (var v = 60; v <= 100; v += 10) {
      el('line', { x1: X(v), x2: X(v), y1: top - 4, y2: H - 28, class: 'viz-grid' }, g0);
      txt(g0, X(v), H - 10, v + '%', { class: 'viz-axis', 'text-anchor': 'middle' });
    }
    var rows = HEAD.map(function (d, i) {
      var y = top + i * rowH + rowH / 2;
      var g = el('g', { class: 'viz-row' }, svg);
      if (i === 0 || HEAD[i - 1][0] !== d[0]) txt(g, 14, y + 4, d[0], { class: 'viz-model' });
      txt(g, left - 14, y + 4, d[1], { class: 'viz-label', 'text-anchor': 'end' });
      if (i > 0 && HEAD[i - 1][0] !== d[0]) el('line', { x1: 10, x2: W - 10, y1: y - rowH / 2, y2: y - rowH / 2, class: 'viz-sep' }, g);
      el('line', { x1: X(d[5]), x2: X(d[5]), y1: y - 9, y2: y + 9, class: 'viz-tick tick-agent' }, g);
      el('line', { x1: X(d[4]), x2: X(d[4]), y1: y - 9, y2: y + 9, class: 'viz-tick tick-ace' }, g);
      var span = el('line', { x1: X(d[2]), x2: X(d[2]), y1: y, y2: y, class: 'viz-span' }, g);
      var dep = el('circle', { cx: X(d[2]), cy: y, r: 6.5, class: 'viz-dot fam-ss' }, g);
      var orc = el('circle', { cx: X(d[2]), cy: y, r: 6, class: 'viz-ring' }, g);
      var lab = txt(g, X(d[3]) + 12, y + 4, '', { class: 'viz-val' });
      var hit = el('rect', { x: 0, y: y - rowH / 2, width: W, height: rowH, class: 'viz-hit' }, g);
      hit.addEventListener('mousemove', function (e) {
        tip.show(e, '<b>' + d[0] + ', ' + d[1] + '</b><br>SelfSuite deployed ' + d[2].toFixed(1) + '%<br>Best attempt ' + d[3].toFixed(1) + '% (+' + (d[3] - d[2]).toFixed(1) + ')<br>ACE ' + d[4].toFixed(1) + '%, plain agent ' + d[5].toFixed(1) + '%');
      });
      hit.addEventListener('mouseleave', function () { tip.hide(); });
      return { d: d, span: span, orc: orc, lab: lab };
    });
    h('div', 'viz-foot', box, 'Single runs on the full task sets. The gap between the dot and the ring is correct work the agent already did but its own judges did not pick: 7.4 points on average, 18.4 on Opus-4.8 telecom.');
    onVisible(box, function () {
      animate(1100, function (t) {
        rows.forEach(function (r) {
          var xo = X(r.d[2] + (r.d[3] - r.d[2]) * t);
          r.span.setAttribute('x2', xo); r.orc.setAttribute('cx', xo);
          r.lab.textContent = '+' + ((r.d[3] - r.d[2]) * t).toFixed(1);
        });
      });
    });
  }

  /* ------------------------------------------------------------------ */
  function mount() {
    var map = { method: methodExplorer, results: resultsChart, ablation: ablationChart, headroom: headroomChart };
    document.querySelectorAll('[data-viz]').forEach(function (n) {
      var f = map[n.getAttribute('data-viz')];
      if (!f) return;
      var fb = n.querySelector('.viz-fallback');
      if (fb) fb.remove();
      try { f(n); } catch (err) { console.error(err); }
    });
    // gentle reveal for figures and headings
    if (!reduceMotion && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }); }, { threshold: 0.12 });
      document.querySelectorAll('main h2, main figure, .viz-card, .mx').forEach(function (n) { n.classList.add('reveal'); io.observe(n); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
