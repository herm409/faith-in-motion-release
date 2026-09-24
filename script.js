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

  // Notify form → FormSubmit (AJAX success state; falls back to native POST)
  if (form && success) {
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

      // Prefer fetch so we can show the inline pastoral success message
      if (window.fetch) {
        e.preventDefault();
        var fd = new FormData(form);
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Sending…";
        }
        fetch(form.action, {
          method: "POST",
          body: fd,
          headers: { Accept: "application/json" },
        })
          .then(function (res) {
            if (!res.ok) throw new Error("submit failed");
            window.location.href = "/thanks";
            return;
          })
          .catch(function () {
            // Fall back to native POST if AJAX path fails
            form.submit();
          })
          .finally(function () {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = "Walk with me to launch";
            }
          });
      }
    });
  }


  // Free Introduction sample is gated: scroll to notify form and focus email
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
    "I'm walking with Herman Davis to the October 12 launch of Faith in Motion. " +
    "'Grace does not cancel purpose. Grace launches it.' " +
    "Walk with me: https://faithinmotionbook.com";

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

  document.querySelectorAll("[data-share]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      var kind = el.getAttribute("data-share");
      var bar = el.closest(".share-bar");
      e.preventDefault();

      if (kind === "facebook") {
        // Facebook often drops quote=; copy caption so they can paste into the post
        copyText(SHARE_TEXT).then(function () {
          shareFeedback(bar, "Post text copied — paste into Facebook");
          openShareWindow(facebookShareUrl());
        });
        return;
      }
      if (kind === "x") {
        openShareWindow(xShareUrl());
        return;
      }
      if (kind === "linkedin") {
        copyText(SHARE_TEXT).then(function () {
          shareFeedback(bar, "Post text copied — paste if needed");
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

})();
