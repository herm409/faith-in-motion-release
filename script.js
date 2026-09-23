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
            form.hidden = true;
            success.hidden = false;
            success.setAttribute("tabindex", "-1");
            success.focus();
          })
          .catch(function () {
            // Fall back to native POST if AJAX path fails
            form.submit();
          })
          .finally(function () {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = "Notify me";
            }
          });
      }
    });
  }
})();
