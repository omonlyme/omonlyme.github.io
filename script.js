/* =========================================================
   OM NAVADIYA — onlyme
   script.js
   ========================================================= */

(function () {
  "use strict";

  var root = document.documentElement;
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------
     1. THEME — persisted choice + animated circular-wipe swap
     --------------------------------------------------------- */
  var THEME_KEY = "onlyme-theme";
  var toggleBtn = document.getElementById("theme-toggle");
  var veil = document.getElementById("theme-veil");
  var toast = document.getElementById("theme-toast");

  var THEME_COLORS = { dark: "#070b09", light: "#f3f7f2" };

  function getStoredTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }
  function storeTheme(value) {
    try { localStorage.setItem(THEME_KEY, value); } catch (e) { /* ignore (private mode etc.) */ }
  }

  function initTheme() {
    var stored = getStoredTheme();
    var theme = stored || "dark"; // cyber theme defaults to dark ("night_shift")
    root.setAttribute("data-theme", theme);
    toggleBtn.setAttribute("aria-checked", theme === "dark" ? "true" : "false");
  }
  initTheme();

  function showToast(message) {
    toast.textContent = message;
    toast.classList.remove("show");
    // force reflow so animation restarts
    void toast.offsetWidth;
    toast.classList.add("show");
  }

  function switchTheme(event) {
    var current = root.getAttribute("data-theme");
    var target = current === "dark" ? "light" : "dark";

    var rect = toggleBtn.getBoundingClientRect();
    var x = rect.left + rect.width / 2;
    var y = rect.top + rect.height / 2;
    veil.style.setProperty("--x", x + "px");
    veil.style.setProperty("--y", y + "px");
    veil.style.background = THEME_COLORS[target];

    if (prefersReducedMotion) {
      root.setAttribute("data-theme", target);
      toggleBtn.setAttribute("aria-checked", target === "dark" ? "true" : "false");
      storeTheme(target);
      showToast("> theme_shift --target=" + target + " [OK]");
      return;
    }

    veil.classList.add("animate");
    // trigger expand on next frame
    requestAnimationFrame(function () {
      veil.classList.add("expand");
    });
    document.body.classList.add("flicker");

    window.setTimeout(function () {
      // swap real theme once the veil fully covers the screen
      root.setAttribute("data-theme", target);
      toggleBtn.setAttribute("aria-checked", target === "dark" ? "true" : "false");
      storeTheme(target);
      showToast("> theme_shift --target=" + target + " [OK]");
    }, 620);

    window.setTimeout(function () {
      // retract veil (it's now the same color as the new bg, so this is invisible)
      veil.classList.remove("expand");
    }, 640);

    window.setTimeout(function () {
      veil.classList.remove("animate");
      document.body.classList.remove("flicker");
    }, 1400);
  }

  toggleBtn.addEventListener("click", switchTheme);

  /* ---------------------------------------------------------
     2. LIVE IST CLOCK (footer)
     --------------------------------------------------------- */
  var clockEl = document.getElementById("ist-clock");
  var istFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  function tickClock() {
    try {
      clockEl.textContent = istFormatter.format(new Date()) + " IST";
    } catch (e) {
      clockEl.textContent = "IST unavailable";
    }
  }
  tickClock();
  window.setInterval(tickClock, 1000);

  /* footer year */
  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------------------------------------------------------
     3. SCROLL REVEAL
     --------------------------------------------------------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !prefersReducedMotion) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in-view"); });
  }

  /* ---------------------------------------------------------
     4. MATRIX RAIN (subtle hero background)
     --------------------------------------------------------- */
  var canvas = document.getElementById("matrix-rain");
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext("2d");
    var hero = canvas.closest(".hero");
    var columns, drops;
    var chars = "01アカサタナハマヤラワｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｷｸｹｺ";
    var fontSize = 15;
    var running = !prefersReducedMotion;
    var intensity = 1;

    function resize() {
      canvas.width = hero.offsetWidth;
      canvas.height = hero.offsetHeight;
      columns = Math.floor(canvas.width / fontSize);
      drops = new Array(columns).fill(1);
    }
    resize();
    window.addEventListener("resize", resize);

    function draw() {
      if (!running) return;
      var isLight = root.getAttribute("data-theme") === "light";
      ctx.fillStyle = isLight ? "rgba(243,247,242,0.18)" : "rgba(7,11,9,0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = isLight ? "rgba(12,138,75," + (0.5 * intensity) + ")" : "rgba(61,220,132," + (0.55 * intensity) + ")";
      ctx.font = fontSize + "px monospace";

      for (var i = 0; i < drops.length; i++) {
        var text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    }

    var rainInterval = window.setInterval(draw, 60);

    document.addEventListener("visibilitychange", function () {
      running = !document.hidden && !prefersReducedMotion;
    });

    // exposed for the mini-terminal "matrix" easter egg
    window.__intensifyMatrix = function () {
      intensity = 2.6;
      window.setTimeout(function () { intensity = 1; }, 2500);
    };
  }

  /* ---------------------------------------------------------
     5. MINI INTERACTIVE TERMINAL (easter egg)
     --------------------------------------------------------- */
  var mtInput = document.getElementById("mini-term-input");
  var mtOutput = document.getElementById("mini-term-output");

  function mtPrint(html, dim) {
    var p = document.createElement("p");
    p.className = "mt-line" + (dim ? " mt-dim" : "");
    p.innerHTML = html;
    mtOutput.appendChild(p);
    mtOutput.scrollTop = mtOutput.scrollHeight;
  }

  function mtScrollTo(id) {
    var el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
  }

  var COMMANDS = {
    help: function () {
      mtPrint('Available: <span class="mt-accent">whoami</span>, <span class="mt-accent">about</span>, <span class="mt-accent">skills</span>, <span class="mt-accent">projects</span>, <span class="mt-accent">certs</span>, <span class="mt-accent">contact</span>, <span class="mt-accent">sudo hire me</span>, <span class="mt-accent">matrix</span>, <span class="mt-accent">clear</span>');
    },
    whoami: function () {
      mtPrint("Om Navadiya — CS undergrad, cybersecurity enthusiast, full-stack tinkerer.");
    },
    about: function () { mtScrollTo("about"); },
    skills: function () { mtScrollTo("skills"); },
    projects: function () { mtScrollTo("projects"); },
    certs: function () { mtScrollTo("certs"); },
    contact: function () { mtScrollTo("contact"); },
    clear: function () { mtOutput.innerHTML = ""; },
    matrix: function () {
      mtPrint("Wake up, Neo...", true);
      if (window.__intensifyMatrix) window.__intensifyMatrix();
    },
    ls: function () { mtPrint("about  skills  projects  certs  contact"); },
    date: function () {
      mtPrint(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "medium" }).format(new Date()));
    }
  };

  function handleCommand(raw) {
    var cmd = raw.trim().toLowerCase();
    if (!cmd) return;
    mtPrint('<span class="mt-accent">om@navadiya:~$</span> ' + escapeHtml(raw));

    if (cmd === "sudo hire me" || cmd === "sudo hire-me") {
      mtPrint("[sudo] password for recruiter: ********", true);
      window.setTimeout(function () {
        mtPrint("Access granted. Redirecting to contact...");
        mtScrollTo("contact");
      }, 500);
      return;
    }

    if (COMMANDS[cmd]) {
      COMMANDS[cmd]();
    } else if (cmd.indexOf("echo ") === 0) {
      mtPrint(escapeHtml(raw.slice(5)));
    } else {
      mtPrint("command not found: " + escapeHtml(cmd) + " — try <span class=\"mt-accent\">help</span>", true);
    }
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  if (mtInput) {
    mtInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        handleCommand(mtInput.value);
        mtInput.value = "";
      }
    });
  }

  /* ---------------------------------------------------------
     6. BLOG TAG FILTER (no-op on pages without #tag-filter)
     --------------------------------------------------------- */
  var filterBar = document.getElementById("tag-filter");
  if (filterBar) {
    var filterBtns = filterBar.querySelectorAll(".filter-btn");
    var posts = document.querySelectorAll(".post");
    var emptyMsg = document.getElementById("post-empty");

    filterBar.addEventListener("click", function (e) {
      var btn = e.target.closest(".filter-btn");
      if (!btn) return;

      filterBtns.forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");

      var filter = btn.getAttribute("data-filter");
      var visibleCount = 0;

      posts.forEach(function (post) {
        var tags = (post.getAttribute("data-tags") || "").split(" ");
        var matches = filter === "all" || tags.indexOf(filter) !== -1;
        post.hidden = !matches;
        if (matches) visibleCount++;
      });

      if (emptyMsg) emptyMsg.hidden = visibleCount !== 0;
    });
  }
})();
