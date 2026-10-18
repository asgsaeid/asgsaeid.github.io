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

    /* terminal: prompts appear one at a time. A command types itself when it is on screen,
       its output appears, and only then does the next prompt show up. */
    var seq = Array.prototype.slice.call(document.querySelectorAll(".page .cmd, .page .out, .page .body"));
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!seq.length || reduce || !("IntersectionObserver" in window)) return;
    document.documentElement.classList.add("js");
    seq.forEach(function (el) {
      el.classList.add("wait");
      var t = el.classList.contains("cmd") && el.querySelector(".c[data-text]"); if (t) t.textContent = "";
    });
    document.querySelectorAll(".out").forEach(function (o) {
      o.querySelectorAll(".papers li, ul.blog li, ul.posts li").forEach(function (li, i) { li.style.transitionDelay = (0.04 * i) + "s"; });
    });
    function type(line, done) {
      var c = line.querySelector(".c[data-text]"), text = c.getAttribute("data-text"), i = 0;
      var caret = document.createElement("span"); caret.className = "caret"; line.appendChild(caret);
      (function step() {
        c.textContent = text.slice(0, ++i);
        if (i < text.length) setTimeout(step, 30 + Math.random() * 35);
        else setTimeout(function () { caret.remove(); done(); }, 150);
      })();
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { io.unobserve(en.target); en.target._go(); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    function activate(i) {
      var line = seq[i]; line.classList.remove("wait");
      if (!line.querySelector(".c[data-text]")) return;            /* the final blinking prompt */
      line._go = function () {
        type(line, function () {
          var j = i + 1;
          for (; j < seq.length && !seq[j].classList.contains("cmd"); j++) { seq[j].classList.remove("wait"); seq[j].classList.add("shown"); }
          if (j < seq.length) setTimeout(function () { activate(j); }, 380);
        });
      };
      io.observe(line);
    }
    var first = 0; while (first < seq.length && !seq[first].classList.contains("cmd")) { seq[first].classList.remove("wait"); first++; }
    if (first < seq.length) activate(first);
  });
})();
