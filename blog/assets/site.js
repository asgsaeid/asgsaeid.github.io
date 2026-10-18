/* shared behaviour: share links, copy buttons, terminal typing */
(function () {
  "use strict";
  function ready(f) { if (document.readyState !== "loading") f(); else document.addEventListener("DOMContentLoaded", f); }
  function copy(text, btn, label) {
    function ok() { var o = btn.textContent; btn.textContent = label || "copied"; setTimeout(function () { btn.textContent = o; }, 1500); }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok);
    else { var t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); ok(); } catch (e) {} t.remove(); }
  }
  ready(function () {
    var canon = document.querySelector('link[rel="canonical"]'), url = canon ? canon.href : location.href;
    var h1 = document.querySelector("h1"), title = h1 ? h1.textContent.trim() : document.title;
    var li = document.querySelector("[data-share=linkedin]"); if (li) li.href = "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(url);
    var x = document.querySelector("[data-share=x]"); if (x) x.href = "https://x.com/intent/post?text=" + encodeURIComponent(title) + "&url=" + encodeURIComponent(url);
    var cp = document.querySelector("[data-share=copy]"); if (cp) cp.addEventListener("click", function () { copy(url, cp, "link copied"); });
    var cb = document.querySelector("[data-copy-cite]"); if (cb) cb.addEventListener("click", function () { copy(document.querySelector("details.cite pre").textContent, cb); });

    /* terminal typing: each .cmd types its command when it scrolls into view, then reveals the .out after it */
    var cmds = Array.prototype.slice.call(document.querySelectorAll(".cmd .c[data-text]"));
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!cmds.length || reduce || !("IntersectionObserver" in window)) return;
    document.documentElement.classList.add("js");
    cmds.forEach(function (c) { c.textContent = ""; });
    document.querySelectorAll(".out").forEach(function (o) {
      o.querySelectorAll(".papers li, ul.blog li, ul.posts li").forEach(function (li, i) { li.style.transitionDelay = (0.05 * i) + "s"; });
    });
    function type(c, done) {
      var text = c.getAttribute("data-text"), i = 0, line = c.parentNode;
      var caret = document.createElement("span"); caret.className = "caret"; line.appendChild(caret);
      (function step() {
        c.textContent = text.slice(0, ++i);
        if (i < text.length) setTimeout(step, 34 + Math.random() * 38);
        else setTimeout(function () { caret.remove(); var o = line.nextElementSibling; if (o && o.classList.contains("out")) o.classList.add("shown"); done(); }, 160);
      })();
    }
    var queue = [], busy = false;
    function run() { if (busy || !queue.length) return; busy = true; type(queue.shift(), function () { busy = false; run(); }); }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { io.unobserve(en.target); queue.push(en.target); run(); } });
    }, { rootMargin: "0px 0px -10% 0px" });
    cmds.forEach(function (c) { io.observe(c); });
  });
})();
