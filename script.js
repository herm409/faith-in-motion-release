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

  // Notify form → Netlify Forms (primary, awaited with ~6s timeout) +
  // FormSubmit AJAX (background backup, never awaited). Visitor always lands
  // on /thanks. Without JS, the form falls back to a native POST to FormSubmit
  // (which redirects to /thanks via _next).
  var SUBMIT_LABEL = submitBtn ? submitBtn.textContent : "Send me the devotionals";
  var FORMSUBMIT_AJAX = "https://formsubmit.co/ajax/herman@freedombychoice.com";
  var NETLIFY_TIMEOUT_MS = 6000;
  var HARD_REDIRECT_MS = 8000;

  function resetSubmitBtn() {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = SUBMIT_LABEL;
    }
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

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending…";
      }

      var done = false;
      function goThanks() {
        if (done) return;
        done = true;
        submitting = false;
        window.location.href = "/thanks";
      }
      // Absolute safety net: the button can never hang
      window.setTimeout(goThanks, HARD_REDIRECT_MS);

      // Background backup: FormSubmit AJAX (not awaited; keepalive survives navigation)
      try {
        var fsData = new FormData();
        fsData.append("_subject", "Faith in Motion — notify me");
        fsData.append("name", nameVal);
        fsData.append("email", emailVal);
        fsData.append("_captcha", "false");
        fsData.append("_honey", honeyVal);
        fetch(FORMSUBMIT_AJAX, {
          method: "POST",
          body: fsData,
          headers: { Accept: "application/json" },
          keepalive: true,
        }).catch(function () {});
      } catch (err) {}

      // Primary: Netlify Forms
      var body = new URLSearchParams();
      body.append("form-name", "notify");
      body.append("name", nameVal);
      body.append("email", emailVal);
      body.append("_honey", honeyVal);

      var controller = window.AbortController ? new AbortController() : null;
      var abortTimer = window.setTimeout(function () {
        if (controller) controller.abort();
        goThanks();
      }, NETLIFY_TIMEOUT_MS);

      var opts = {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      };
      if (controller) opts.signal = controller.signal;

      fetch("/", opts)
        .then(function () {}, function () {})
        .then(function () {
          window.clearTimeout(abortTimer);
          goThanks();
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

})();
