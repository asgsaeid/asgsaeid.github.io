/* Shared blog behaviour: section anchors, share links, copy buttons. */
(function () {
  "use strict";
  function ready(fn) { if (document.readyState !== "loading") fn(); else document.addEventListener("DOMContentLoaded", fn); }

  function copyText(text, btn, doneLabel) {
    function ok() {
      if (!btn) return;
      var old = btn.textContent; btn.textContent = doneLabel || "Copied"; btn.classList.add("done");
      setTimeout(function () { btn.textContent = old; btn.classList.remove("done"); }, 1600);
    }
    function fallback() {
      var t = document.createElement("textarea"); t.value = text; t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); ok(); } catch (e) { /* ignore */ }
      document.body.removeChild(t);
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, fallback);
    else fallback();
  }

  ready(function () {
    document.querySelectorAll("main > h2[id]").forEach(function (h) {
      var a = document.createElement("a"); a.className = "anchor"; a.href = "#" + h.id; a.textContent = "§";
      a.setAttribute("aria-label", "Link to this section"); h.insertBefore(a, h.firstChild);
    });

    var canon = document.querySelector('link[rel="canonical"]');
    var url = canon ? canon.href : location.href;
    var title = ((document.querySelector("h1") || {}).textContent || document.title).trim();
    var li = document.querySelector("[data-share='linkedin']");
    if (li) li.href = "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(url);
    var x = document.querySelector("[data-share='x']");
    if (x) x.href = "https://x.com/intent/post?text=" + encodeURIComponent(title) + "&url=" + encodeURIComponent(url);
    var cp = document.querySelector("[data-share='copy']");
    if (cp) cp.addEventListener("click", function () { copyText(url, cp, "link copied"); });

    var cb = document.querySelector("[data-copy-cite]");
    if (cb) cb.addEventListener("click", function () {
      var pre = document.querySelector("details.cite pre"); if (pre) copyText(pre.textContent, cb);
    });
  });
})();
