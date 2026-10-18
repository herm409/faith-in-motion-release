(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  var sticky = document.getElementById("sticky-buy");
  var notify = document.getElementById("notify");
  var yearEl = document.getElementById("y");
  var form = document.getElementById("notify-form");
  var success = document.getElementById("notify-success");
  var errorEl = document.getElementById("notify-error");
  var submitBtn = document.getElementById("notify-submit");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    if (header) {
      header.classList.toggle("is-scrolled", y > 12);
    }
    if (!sticky || !notify) return;

    var notifyTop = notify.getBoundingClientRect().top + y;
    var pastHero = y > Math.min(window.innerHeight * 0.55, 480);
    var nearNotify = y + window.innerHeight > notifyTop - 40;
    var show = pastHero && !nearNotify;

    if (show) {
      sticky.hidden = false;
      void sticky.offsetWidth;
      sticky.classList.add("is-visible");
      document.body.classList.add("has-sticky-buy");
    } else {
      sticky.classList.remove("is-visible");
      document.body.classList.remove("has-sticky-buy");
      if (!reduceMotion) {
        window.setTimeout(function () {
          if (!sticky.classList.contains("is-visible")) sticky.hidden = true;
        }, 360);
      } else {
        sticky.hidden = true;
      }
    }
  }

  var ticking = false;
  window.addEventListener(
    "scroll",
    function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        onScroll();
        ticking = false;
      });
    },
    { passive: true }
  );

  onScroll();

  // Notify form → Netlify Forms (primary, awaited with ~6s timeout), then a
  // FormSubmit AJAX backup email to Herman.
  //  - Netlify OK (2xx): backup fires in the background (not awaited), go to /thanks.
  //  - Netlify fails (non-2xx, network error or timeout): the backup is awaited and
  //    flagged "NETLIFY FAILED, add manually" with the reason. If the backup
  //    succeeds, go to /thanks; if it fails too, stay on the page, keep what they
  //    typed and show an inline error.
  //  - Honeypot filled: nothing is sent, go to /thanks (bots see success).
  // Without JS, the form falls back to a native POST to FormSubmit
  // (which redirects to /thanks via _next).
  var SUBMIT_LABEL = submitBtn ? submitBtn.textContent : "Send me the devotionals";
  var FORMSUBMIT_AJAX = "https://formsubmit.co/ajax/herman@freedombychoice.com";
  var BACKUP_SUBJECT = "Faith in Motion — notify me";
  var FLAGGED_SUBJECT = "NETLIFY FAILED, add manually: Faith in Motion notify me";
  var NETLIFY_TIMEOUT_MS = 6000;
  var BACKUP_TIMEOUT_MS = 8000;
  var HELP_EMAIL = "herman@freedombychoice.com";

  function resetSubmitBtn() {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = SUBMIT_LABEL;
    }
  }

  function showSendError() {
    if (!errorEl) return;
    errorEl.textContent = "";
    errorEl.appendChild(document.createTextNode("Something went wrong. Please try again, or email "));
    var a = document.createElement("a");
    a.href = "mailto:" + HELP_EMAIL;
    a.textContent = HELP_EMAIL;
    errorEl.appendChild(a);
    errorEl.appendChild(document.createTextNode("."));
    errorEl.hidden = false;
  }

  // fetch with a timeout; resolves to a Response or rejects (network error, abort, timeout)
  function fetchWithTimeout(url, opts, ms) {
    return new Promise(function (resolve, reject) {
      var controller = window.AbortController ? new AbortController() : null;
      if (controller) opts.signal = controller.signal;
      var timer = window.setTimeout(function () {
        if (controller) controller.abort();
        reject(new Error("timed out after " + Math.round(ms / 1000) + "s"));
      }, ms);
      fetch(url, opts).then(
        function (res) { window.clearTimeout(timer); resolve(res); },
        function (err) { window.clearTimeout(timer); reject(err); }
      );
    });
  }

  // If the visitor comes back via the back button (bfcache), never show a stuck button
  window.addEventListener("pageshow", function () {
    resetSubmitBtn();
  });

  if (form && success) {
    var submitting = false;
    form.addEventListener("submit", function (e) {
      var email = form.querySelector("#notify-email");
      if (errorEl) {
        errorEl.hidden = true;
        errorEl.textContent = "";
      }
      if (!email || !email.value.trim()) {
        e.preventDefault();
        if (errorEl) {
          errorEl.textContent = "Please enter your email.";
          errorEl.hidden = false;
        }
        if (email) email.focus();
        return;
      }
      if (typeof email.checkValidity === "function" && !email.checkValidity()) {
        e.preventDefault();
        if (errorEl) {
          errorEl.textContent = "Please enter a valid email.";
          errorEl.hidden = false;
        }
        email.focus();
        return;
      }

      if (!window.fetch) return; // native POST fallback

      e.preventDefault();
      if (submitting) return;
      submitting = true;

      var nameEl = form.querySelector("#notify-name");
      var honeyEl = form.querySelector('input[name="_honey"]');
      var nameVal = nameEl ? nameEl.value.trim() : "";
      var emailVal = email.value.trim();
      var honeyVal = honeyEl ? honeyEl.value : "";

      function goThanks() {
        window.location.href = "/thanks";
      }

      // Honeypot filled: a bot. Send nothing and show the normal thank-you.
      if (honeyVal) {
        goThanks();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending…";
      }

      function sendBackup(netlifyProblem) {
        var fsData = new FormData();
        fsData.append("_subject", netlifyProblem ? FLAGGED_SUBJECT : BACKUP_SUBJECT);
        if (netlifyProblem) fsData.append("netlify_status", "FAILED (" + netlifyProblem + "). Add this person to the list manually.");
        fsData.append("name", nameVal);
        fsData.append("email", emailVal);
        fsData.append("_captcha", "false");
        fsData.append("_honey", honeyVal);
        var opts = {
          method: "POST",
          body: fsData,
          headers: { Accept: "application/json" },
          keepalive: true,
        };
        if (!netlifyProblem) {
          // Netlify has it: background copy only, never awaited
          try { fetch(FORMSUBMIT_AJAX, opts).catch(function () {}); } catch (err) {}
          return Promise.resolve(true);
        }
        return fetchWithTimeout(FORMSUBMIT_AJAX, opts, BACKUP_TIMEOUT_MS)
          .then(function (res) {
            if (!res.ok) return false;
            return res.json().then(
              function (j) { return !(j && (j.success === false || j.success === "false")); },
              function () { return true; }
            );
          })
          .catch(function () { return false; });
      }

      // Primary: Netlify Forms
      var body = new URLSearchParams();
      body.append("form-name", "notify");
      body.append("name", nameVal);
      body.append("email", emailVal);
      body.append("_honey", honeyVal);

      fetchWithTimeout("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      }, NETLIFY_TIMEOUT_MS)
        .then(
          function (res) { return res.ok ? "" : "HTTP " + res.status; },
          function (err) { return (err && err.message) || "network error"; }
        )
        .then(function (netlifyProblem) {
          return sendBackup(netlifyProblem).then(function (backupOk) {
            if (!netlifyProblem || backupOk) {
              goThanks();
              return;
            }
            // Both failed: stay here, keep their answers, let them try again
            submitting = false;
            resetSubmitBtn();
            showSendError();
          });
        });
    });
  }


  // "Get the free Midday Steps devotional" buttons: scroll to the mailing-list form and focus email
  function focusNotifyEmail() {
    var email = document.getElementById("notify-email");
    var section = document.getElementById("notify");
    var unlockNote = document.getElementById("sample-unlock-note");
    var unlockHint = document.querySelector(".form-unlock-hint");
    if (section) {
      section.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    }
    function flashUnlock() {
      [unlockNote, unlockHint].forEach(function (el) {
        if (!el) return;
        el.classList.add("is-emphasized");
        window.setTimeout(function () {
          el.classList.remove("is-emphasized");
        }, 2400);
      });
    }
    window.setTimeout(function () {
      flashUnlock();
      if (email) {
        email.focus({ preventScroll: true });
      }
    }, reduceMotion ? 0 : 450);
  }

  document.querySelectorAll(".js-sample-gate").forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      focusNotifyEmail();
      if (history.replaceState) {
        history.replaceState(null, "", "#notify");
      } else {
        location.hash = "notify";
      }
    });
  });

  // Share — prewritten post text for Facebook / X / LinkedIn
  var SHARE_URL = "https://faithinmotionbook.com/";
  var SHARE_TEXT =
    "I'm reading Faith in Motion by Herman Davis. " +
    "'Grace does not cancel purpose. Grace launches it.' " +
    "Get Herman's free devotionals: https://faithinmotionbook.com";

  function shareFeedback(bar, message) {
    if (!bar) return;
    var feedback = bar.querySelector("[data-share-copied]");
    if (!feedback) return;
    var prev = feedback.textContent;
    feedback.textContent = message;
    feedback.hidden = false;
    window.setTimeout(function () {
      feedback.hidden = true;
      feedback.textContent = prev;
    }, 3200);
  }

  function copyText(value) {
    return new Promise(function (resolve) {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        navigator.clipboard.writeText(value).then(function () {
          resolve(true);
        }).catch(function () {
          resolve(fallbackCopy(value));
        });
      } else {
        resolve(fallbackCopy(value));
      }
    });
  }

  function fallbackCopy(value) {
    var ta = document.createElement("textarea");
    ta.value = value;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (err) {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }

  function openShareWindow(url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function facebookShareUrl() {
    return (
      "https://www.facebook.com/sharer/sharer.php?u=" +
      encodeURIComponent(SHARE_URL) +
      "&quote=" +
      encodeURIComponent(SHARE_TEXT)
    );
  }

  function xShareUrl() {
    return "https://twitter.com/intent/tweet?text=" + encodeURIComponent(SHARE_TEXT);
  }

  function linkedInShareUrl() {
    // Opens LinkedIn composer with prefilled text (works better than share-offsite for captions)
    return (
      "https://www.linkedin.com/feed/?shareActive=true&text=" +
      encodeURIComponent(SHARE_TEXT)
    );
  }


  function openFacebookPasteCoach() {
    var existing = document.getElementById("share-paste-coach");
    if (existing) existing.remove();

    var overlay = document.createElement("div");
    overlay.id = "share-paste-coach";
    overlay.className = "share-paste-coach";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "share-paste-title");

    overlay.innerHTML =
      '<div class="share-paste-card">' +
        '<p class="share-paste-kicker">Almost there</p>' +
        '<h2 id="share-paste-title" class="share-paste-title">Paste this into your Facebook post</h2>' +
        '<p class="share-paste-lead">The text below is already copied. After Facebook opens, click the post box and paste (<kbd>Ctrl</kbd>+<kbd>V</kbd> or <kbd>⌘</kbd>+<kbd>V</kbd>).</p>' +
        '<pre class="share-paste-preview" tabindex="0"></pre>' +
        '<div class="share-paste-actions">' +
          '<button type="button" class="share-paste-primary" data-share-open-fb>Open Facebook</button>' +
          '<button type="button" class="share-paste-secondary" data-share-recopy>Copy text again</button>' +
          '<button type="button" class="share-paste-ghost" data-share-cancel>Cancel</button>' +
        '</div>' +
      '</div>';

    var preview = overlay.querySelector(".share-paste-preview");
    preview.textContent = SHARE_TEXT;

    function close() {
      document.removeEventListener("keydown", onKey);
      overlay.remove();
    }

    function onKey(e) {
      if (e.key === "Escape") close();
    }

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });

    overlay.querySelector("[data-share-cancel]").addEventListener("click", close);
    overlay.querySelector("[data-share-recopy]").addEventListener("click", function () {
      copyText(SHARE_TEXT).then(function (ok) {
        var btn = overlay.querySelector("[data-share-recopy]");
        if (!btn) return;
        var prev = btn.textContent;
        btn.textContent = ok ? "Copied" : "Copy failed";
        window.setTimeout(function () {
          btn.textContent = prev;
        }, 1600);
      });
    });
    overlay.querySelector("[data-share-open-fb]").addEventListener("click", function () {
      copyText(SHARE_TEXT).then(function () {
        openShareWindow(facebookShareUrl());
        close();
      });
    });

    document.body.appendChild(overlay);
    document.addEventListener("keydown", onKey);
    overlay.querySelector("[data-share-open-fb]").focus();
  }


  document.querySelectorAll("[data-share]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      var kind = el.getAttribute("data-share");
      var bar = el.closest(".share-bar");
      e.preventDefault();

      if (kind === "facebook") {
        // Facebook often drops quote=; coach paste, then open on confirm
        copyText(SHARE_TEXT).then(function () {
          shareFeedback(bar, "Post text copied");
          openFacebookPasteCoach();
        });
        return;
      }
      if (kind === "x") {
        openShareWindow(xShareUrl());
        return;
      }
      if (kind === "linkedin") {
        copyText(SHARE_TEXT).then(function () {
          shareFeedback(bar, "Post text copied, paste if needed");
          openShareWindow(linkedInShareUrl());
        });
        return;
      }
    });
  });

  document.querySelectorAll("[data-share-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var bar = btn.closest(".share-bar");
      // Copy full ad caption (link included), not bare URL only
      copyText(SHARE_TEXT).then(function (ok) {
        if (ok) shareFeedback(bar, "Post text copied");
      });
    });
  });


  // ---------------------------------------------------------------------
  // Landing motion package (2026-10-17): hero film, reveals, Route, bands.
  // ---------------------------------------------------------------------
  var motionOk = !reduceMotion;
  var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  var saveData = !!(conn && conn.saveData);

  // Hero film: poster paints first; the film loads after first paint, plays once, holds its last frame.
  var video = document.querySelector(".hero-video");
  function startHeroFilm() {
    if (!video || !motionOk || saveData || typeof video.play !== "function") return;
    var mobile = window.matchMedia("(max-width: 767px)").matches;
    var kind = mobile ? "mobile" : "desktop";
    [["webm", "video/webm"], ["mp4", "video/mp4"]].forEach(function (t) {
      var src = video.getAttribute("data-src-" + kind + "-" + t[0]);
      if (!src) return;
      var el = document.createElement("source");
      el.src = src;
      el.type = t[1];
      video.appendChild(el);
    });
    video.muted = true;
    video.loop = false;
    video.preload = "auto";
    video.addEventListener("playing", function () { video.classList.add("is-playing"); }, { once: true });
    video.load();
    var p = video.play();
    if (p && typeof p.catch === "function") p.catch(function () { /* autoplay refused: the poster stays */ });
  }
  function afterFirstPaint(fn) {
    var run = function () { window.requestAnimationFrame(function () { window.setTimeout(fn, 0); }); };
    if (document.readyState === "complete") run();
    else window.addEventListener("load", run, { once: true });
  }
  afterFirstPaint(function () {
    if ("requestIdleCallback" in window) window.requestIdleCallback(startHeroFilm, { timeout: 1500 });
    else window.setTimeout(startHeroFilm, 200);
  });

  // Reveals, photo bands and the 3D book: mark .is-in once, on first sight.
  var revealTargets = document.querySelectorAll(".reveal, .photo-band, .book-in");
  if (!motionOk || !("IntersectionObserver" in window)) {
    revealTargets.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    revealTargets.forEach(function (el) { io.observe(el); });
  }

  // Route: a winding dotted path through every chapter marker, drawn as you scroll.
  var toc = document.querySelector(".has-route .map-toc");
  if (toc) {
    var svg = toc.querySelector(".route-line");
    var trail = svg && svg.querySelector(".route-trail");
    var walked = svg && svg.querySelector(".route-walked");
    var items = Array.prototype.slice.call(toc.querySelectorAll(".map-list li"));
    var pts = [];
    var totalLen = 0;
    var stops = [];
    function layoutRoute() {
      if (!svg || !items.length) return;
      var box = toc.getBoundingClientRect();
      var h = Math.max(1, Math.round(box.height));
      svg.setAttribute("viewBox", "0 0 52 " + h);
      svg.setAttribute("height", String(h));
      pts = items.map(function (li, i) {
        var r = li.getBoundingClientRect();
        var x = i % 2 ? 34 : 18;
        li.style.setProperty("--dot-x", x + "px");
        return [x, r.top - box.top + r.height / 2];
      });
      var d = "M" + pts[0][0] + "," + pts[0][1].toFixed(1);
      for (var i = 1; i < pts.length; i++) {
        var my = ((pts[i - 1][1] + pts[i][1]) / 2).toFixed(1);
        d += " C" + pts[i - 1][0] + "," + my + " " + pts[i][0] + "," + my + " " + pts[i][0] + "," + pts[i][1].toFixed(1);
      }
      trail.setAttribute("d", d);
      walked.setAttribute("d", d);
      totalLen = walked.getTotalLength ? walked.getTotalLength() : 0;
      // path length at each marker, so a marker lights when the line reaches it
      stops = pts.map(function (p, i) {
        if (!i || !totalLen) return 0;
        var lo = 0, hi = totalLen;
        for (var k = 0; k < 18; k++) {
          var mid = (lo + hi) / 2;
          if (walked.getPointAtLength(mid).y < p[1]) lo = mid; else hi = mid;
        }
        return hi;
      });
      walked.style.strokeDasharray = totalLen + " " + totalLen;
      drawRoute();
    }
    function drawRoute() {
      if (!totalLen) return;
      if (!motionOk) {
        walked.style.strokeDashoffset = "0";
        items.forEach(function (li) { li.classList.add("is-lit"); });
        return;
      }
      var box = toc.getBoundingClientRect();
      var line = window.innerHeight * 0.62;
      var progress = Math.min(1, Math.max(0, (line - box.top) / box.height));
      var len = totalLen * progress;
      walked.style.strokeDashoffset = String(totalLen - len);
      items.forEach(function (li, i) { li.classList.toggle("is-lit", len >= stops[i] - 1 && progress > 0); });
    }
    var routeTick = false;
    window.addEventListener("scroll", function () {
      if (routeTick) return;
      routeTick = true;
      window.requestAnimationFrame(function () { drawRoute(); routeTick = false; });
    }, { passive: true });
    var resizeTimer;
    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(layoutRoute, 150);
    });
    layoutRoute();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutRoute);
    window.addEventListener("load", layoutRoute, { once: true });
  }


  /* Phone menu (approved by Herman 2026-10-17 7:51 PM CT): accessible sheet, focus trap, Esc and backdrop close. */
  (function () {
    var btn = document.querySelector(".menu-btn");
    var sheet = document.getElementById("site-menu");
    var backdrop = document.querySelector(".menu-backdrop");
    if (!btn || !sheet || !backdrop) return;
    var root = document.documentElement;
    var lastFocus = null;
    var closeTimer = null;
    function focusables() {
      return Array.prototype.slice.call(sheet.querySelectorAll("a[href], button:not([disabled])"));
    }
    function open() {
      clearTimeout(closeTimer);
      lastFocus = document.activeElement;
      backdrop.hidden = false;
      sheet.hidden = false;
      void sheet.offsetWidth;
      root.classList.add("menu-open", "menu-locked");
      btn.setAttribute("aria-expanded", "true");
      btn.setAttribute("aria-label", "Close menu");
      var f = focusables();
      if (f.length) f[0].focus();
      document.addEventListener("keydown", onKey, true);
    }
    function close(restore) {
      if (sheet.hidden) return;
      root.classList.remove("menu-open", "menu-locked");
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-label", "Open menu");
      document.removeEventListener("keydown", onKey, true);
      var done = function () { sheet.hidden = true; backdrop.hidden = true; };
      if (reduceMotion) done(); else closeTimer = setTimeout(done, 260);
      if (restore !== false && lastFocus && lastFocus.focus) lastFocus.focus();
    }
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "Tab") return;
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || !sheet.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !sheet.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
    }
    btn.addEventListener("click", function () { if (sheet.hidden) open(); else close(); });
    Array.prototype.forEach.call(document.querySelectorAll("[data-menu-close]"), function (el) {
      el.addEventListener("click", function () { close(); });
    });
    Array.prototype.forEach.call(sheet.querySelectorAll(".menu-rows a"), function (a) {
      a.addEventListener("click", function () { close(false); });
    });
    window.addEventListener("resize", function () { if (window.innerWidth > 640) close(false); });
  })();

  /* Announcement bar (preview 2026-10-18): close stays closed via localStorage. */
  (function () {
    var bar = document.getElementById("announce-bar");
    var close = bar && bar.querySelector(".announce-close");
    if (!close) return;
    close.addEventListener("click", function () {
      try { localStorage.setItem("fim-announce-dismissed", "steps-app-1"); } catch (e) {}
      document.documentElement.classList.add("announce-off");
      var mark = document.querySelector(".wordmark");
      if (mark && mark.focus) mark.focus();
    });
  })();

  /* Promo links to the app section (preview 2026-10-18): on this page, keep ?src= in the URL and scroll smoothly
     (instant with reduced motion). The phone menu's own click handler closes the menu first. */
  (function () {
    var target = document.getElementById("steps-app");
    if (!target) return;
    var here = location.pathname.replace(/index\.html$/, "");
    Array.prototype.forEach.call(document.querySelectorAll('a[href*="#steps-app"]'), function (a) {
      a.addEventListener("click", function (e) {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        var u;
        try { u = new URL(a.getAttribute("href"), location.href); } catch (err) { return; }
        if (u.origin !== location.origin || u.pathname.replace(/index\.html$/, "") !== here) return;
        e.preventDefault();
        try { history.pushState(null, "", u.pathname + u.search + u.hash); } catch (err) {}
        window.requestAnimationFrame(function () {
          target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
          var title = document.getElementById("steps-app-title");
          if (title && title.focus) title.focus({ preventScroll: true });
        });
      });
    });
  })();
  /* Sticky "Get the book" bar (fix 2026-10-18): the whole bar is a link to #get-the-book (paperback + Kindle).
     Works without JS as a plain anchor; with JS it scrolls smoothly, centers the options and focuses the paperback button. */
  (function () {
    var link = document.querySelector("#sticky-buy .sticky-link");
    var target = document.getElementById("get-the-book");
    if (!link || !target) return;
    link.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      try { history.pushState(null, "", location.pathname + location.search + "#get-the-book"); } catch (err) {}
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      var first = target.querySelector("a.btn");
      if (first && first.focus) first.focus({ preventScroll: true });
    });
  })();
})();
