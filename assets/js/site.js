/* ==========================================================================
   Shared UI: bindings, theme, navigation, clock, toast, data helpers.
   Exposed as window.PF for the page scripts.
   ========================================================================== */
(function () {
  "use strict";

  var PF = (window.PF = window.PF || {});
  var CFG = (PF.config = window.PORTFOLIO_CONFIG || {});
  var hasDom = typeof document !== "undefined";

  PF.$ = function (selector, root) {
    return (root || document).querySelector(selector);
  };

  PF.$$ = function (selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  };

  PF.get = function (path, fallback) {
    if (!path) return fallback;
    var current = CFG;
    var parts = String(path).split(".");
    for (var i = 0; i < parts.length; i++) {
      if (current == null) return fallback;
      current = current[parts[i]];
    }
    return typeof current === "undefined" || current === null ? fallback : current;
  };

  PF.escape = function (value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  var ICONS = {
    "arrow-right": '<path d="M5 12h14M13 5l7 7-7 7"/>',
    "arrow-left": '<path d="M19 12H5M11 19l-7-7 7-7"/>',
    "arrow-up-right": '<path d="M7 17 17 7M8 7h9v9"/>',
    "arrow-down": '<path d="M12 5v14M5 12l7 7 7-7"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z"/>',
    github:
      '<path fill="currentColor" stroke="none" d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.9 10.9c.6.1.8-.2.8-.5v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 1.7 2.6 1.2 3.2.9.1-.7.4-1.2.7-1.5-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.2-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11 11 0 0 1 6 0C17.3 4 18.3 4.3 18.3 4.3c.6 1.6.2 2.8.1 3.1.7.9 1.2 1.9 1.2 3.2 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.6.8.5A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    sync:
      '<path d="M20 11a8 8 0 0 0-13.7-5.3L3 9M4 13a8 8 0 0 0 13.7 5.3L21 15"/><path d="M3 4v5h5M21 20v-5h-5"/>',
    external:
      '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m21 16-5-5L5 20"/>',
    bold: '<path d="M7 5h6a4 4 0 0 1 0 8H7zM7 13h7a4 4 0 0 1 0 8H7z"/>',
    italic: '<path d="M19 4h-9M14 20H5M15 4 9 20"/>',
    link: '<path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/>',
    code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
    heading: '<path d="M6 4v16M18 4v16M6 12h12"/>',
    quote:
      '<path d="M9 7H5v6h4c0 3-1 4-4 5M19 7h-4v6h4c0 3-1 4-4 5"/>',
    list:
      '<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
    upload: '<path d="M12 16V4M6 10l6-6 6 6"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    alert: '<path d="M12 3 2 21h20L12 3Z"/><path d="M12 10v5M12 18h.01"/>',
    file: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8Z"/><path d="M14 3v5h5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    settings:
      '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
    refresh:
      '<path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5"/>'
  };

  PF.icon = function (name, extraClass) {
    var path = ICONS[name] || ICONS["external"];
    return (
      '<svg class="icon ' +
      (extraClass || "") +
      '" data-icon="' +
      name +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      path +
      "</svg>"
    );
  };

  PF.applyBindings = function (root) {
    PF.$$("[data-bind]", root || document).forEach(function (node) {
      var value = PF.get(node.dataset.bind, null);
      if (value === null || typeof value === "object") return;
      node.textContent = String(value);
    });
    PF.$$("[data-year]", root || document).forEach(function (node) {
      node.textContent = String(new Date().getFullYear());
    });
  };

  function currentTheme() {
    return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  }

  function paintTheme(theme) {
    document.documentElement.dataset.theme = theme;
    PF.$$("[data-theme-toggle]").forEach(function (button) {
      button.setAttribute("aria-label", theme === "dark" ? "切换到浅色主题" : "切换到深色主题");
    });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0a1222" : "#f3efe6");
  }

  function initTheme() {
    paintTheme(currentTheme());
    PF.$$("[data-theme-toggle]").forEach(function (button) {
      button.addEventListener("click", function () {
        var next = currentTheme() === "dark" ? "light" : "dark";
        try {
          localStorage.setItem("pf:theme", next);
        } catch (e) {}
        paintTheme(next);
      });
    });
  }

  function tickClock() {
    var timeZone = PF.get("identity.timezone", "Asia/Shanghai");
    var text;
    try {
      text = new Intl.DateTimeFormat("zh-CN", {
        timeZone: timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }).format(new Date());
    } catch (e) {
      text = new Date().toTimeString().slice(0, 5);
    }
    PF.$$("[data-clock]").forEach(function (node) {
      node.textContent = text;
    });
  }

  function initClock() {
    tickClock();
    setInterval(tickClock, 30000);
  }

  function initContact() {
    var email = PF.get("contact.email", "");
    var github = PF.get("contact.github", PF.github ? PF.github.ownerFromConfig() : "");
    var primary = PF.$("[data-contact-primary]");

    if (primary) {
      if (email) {
        primary.href = "mailto:" + email;
        primary.removeAttribute("target");
        primary.removeAttribute("rel");
        primary.innerHTML = "写封邮件" + PF.icon("arrow-up-right");
      } else if (github) {
        primary.href = "https://github.com/" + github;
        primary.target = "_blank";
        primary.rel = "noopener";
        primary.innerHTML = "在 GitHub 找我" + PF.icon("arrow-up-right");
      }
    }

    var copyButton = PF.$("[data-copy-email]");
    if (copyButton) {
      if (email) {
        copyButton.hidden = false;
        copyButton.addEventListener("click", function () {
          PF.copy(email).then(function () {
            PF.toast("邮箱已复制");
          });
        });
      } else {
        copyButton.hidden = true;
      }
    }

    PF.$$("[data-bind='contact.github']").forEach(function (node) {
      if (github) node.textContent = github;
    });
  }

  function initHeader() {
    var header = PF.$(".site-header");
    if (!header) return;
    var ticking = false;

    function update() {
      header.classList.toggle("is-stuck", window.scrollY > 10);
      ticking = false;
    }

    update();
    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
  }

  function initMobileMenu() {
    var menu = PF.$("#mobileMenu");
    if (!menu) return;
    var openButton = PF.$("[data-menu-toggle]");
    var closeButton = PF.$("[data-menu-close]");
    var lastFocus = null;

    function open() {
      lastFocus = document.activeElement;
      menu.classList.add("is-open");
      menu.setAttribute("aria-hidden", "false");
      document.body.classList.add("menu-open");
      if (openButton) openButton.setAttribute("aria-expanded", "true");
      var firstLink = menu.querySelector("a, button");
      if (firstLink) firstLink.focus();
    }

    function close() {
      menu.classList.remove("is-open");
      menu.setAttribute("aria-hidden", "true");
      document.body.classList.remove("menu-open");
      if (openButton) openButton.setAttribute("aria-expanded", "false");
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    if (openButton) openButton.addEventListener("click", open);
    if (closeButton) closeButton.addEventListener("click", close);
    PF.$$("a", menu).forEach(function (link) {
      if (!link.querySelector(".menu-arrow")) {
        link.insertAdjacentHTML("beforeend", PF.icon("arrow-up-right", "menu-arrow"));
      }
      link.addEventListener("click", close);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && menu.classList.contains("is-open")) close();
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 980 && menu.classList.contains("is-open")) close();
    });
  }

  var revealObserver = null;

  function ensureRevealObserver() {
    if (!("IntersectionObserver" in window)) return null;
    if (revealObserver) return revealObserver;
    revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -5% 0px", threshold: 0.06 }
    );
    return revealObserver;
  }

  PF.reveal = function (root) {
    var nodes = PF.$$("[data-reveal]:not(.is-visible)", root || document);
    var observer = ensureRevealObserver();
    nodes.forEach(function (node, index) {
      if (!node.style.getPropertyValue("--reveal-delay")) {
        node.style.setProperty("--reveal-delay", index * 55 + "ms");
      }
      if (observer) observer.observe(node);
      else node.classList.add("is-visible");
    });
  };

  PF.formatDate = function (value, style) {
    if (!value) return "";
    var date;
    var match = String(value).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
      date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    } else {
      date = new Date(value);
    }
    if (!date || isNaN(date.getTime())) return "";
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    if (style === "long") {
      return year + " 年 " + (date.getMonth() + 1) + " 月 " + date.getDate() + " 日";
    }
    return year + "." + month + "." + day;
  };

  PF.relative = function (timestamp) {
    if (!timestamp) return "—";
    var diff = Date.now() - Number(timestamp);
    if (diff < 60000) return "刚刚";
    if (diff < 3600000) return Math.round(diff / 60000) + " 分钟前";
    if (diff < 86400000) return Math.round(diff / 3600000) + " 小时前";
    if (diff < 86400000 * 7) return Math.round(diff / 86400000) + " 天前";
    return PF.formatDate(new Date(Number(timestamp)));
  };

  PF.readingTime = function (text) {
    var source = String(text || "");
    var cjk = (source.match(/[\u3400-\u9fff\u3040-\u30ff]/g) || []).length;
    var words = (source.replace(/[\u3400-\u9fff\u3040-\u30ff]/g, " ").match(/[A-Za-z0-9_]+/g) || [])
      .length;
    return Math.max(1, Math.ceil(cjk / 320 + words / 210));
  };

  PF.postsUrl = function () {
    var path = PF.get("site.postsPath", "content/posts.json");
    try {
      return new URL(path, window.location.href).toString();
    } catch (e) {
      return path;
    }
  };

  PF.normalizePost = function (post) {
    if (!post || !post.slug) return null;
    var tags = post.tags;
    if (typeof tags === "string") {
      tags = tags
        .split(/[,，]/)
        .map(function (tag) {
          return tag.trim();
        })
        .filter(Boolean);
    }
    if (!Array.isArray(tags)) tags = [];
    return {
      slug: String(post.slug),
      title: String(post.title || "无标题"),
      date: String(post.date || ""),
      tags: tags,
      excerpt: String(post.excerpt || ""),
      cover: String(post.cover || ""),
      body: String(post.body || ""),
      draft: post.draft === true
    };
  };

  PF.loadPosts = async function () {
    if (window.location.protocol === "file:") {
      throw new Error("请通过网址打开这个页面，直接双击 HTML 文件无法读取文章数据。");
    }
    var url = PF.postsUrl();
    var response;
    try {
      response = await fetch(url + (url.indexOf("?") === -1 ? "?" : "&") + "v=" + Date.now(), {
        cache: "no-store"
      });
    } catch (e) {
      throw new Error("文章数据没有加载出来，检查一下网络，或稍后刷新页面。");
    }
    if (!response.ok) {
      throw new Error("找不到文章数据（" + response.status + "）。检查 content/posts.json 是否已经上传。");
    }
    var data = await response.json();
    var list = Array.isArray(data) ? data : data && Array.isArray(data.posts) ? data.posts : [];
    return list
      .map(PF.normalizePost)
      .filter(Boolean)
      .sort(function (a, b) {
        return String(b.date).localeCompare(String(a.date));
      });
  };

  PF.excerpt = function (post, length) {
    if (post && post.excerpt) return post.excerpt;
    var text = String((post && post.body) || "")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[#>*_`~|-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    var max = length || 88;
    return text.length > max ? text.slice(0, max) + "…" : text;
  };

  PF.postUrl = function (post) {
    return "post.html?slug=" + encodeURIComponent(post.slug || "");
  };

  PF.slugify = function (value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/['"’“”]/g, "")
      .replace(/[^\p{L}\p{N}\s_-]/gu, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);
  };

  PF.copy = function (text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        document.body.removeChild(area);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  };

  var toastNode = null;
  var toastTimer = null;

  PF.toast = function (message, type) {
    if (!hasDom) return;
    if (!toastNode) {
      toastNode = document.createElement("div");
      toastNode.className = "toast";
      toastNode.setAttribute("role", "status");
      toastNode.setAttribute("aria-live", "polite");
      document.body.appendChild(toastNode);
    }
    toastNode.textContent = message;
    toastNode.classList.toggle("is-error", type === "error");
    requestAnimationFrame(function () {
      toastNode.classList.add("is-visible");
    });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastNode.classList.remove("is-visible");
    }, 3600);
  };

  PF.enhanceCode = function (root) {
    PF.$$("pre", root || document).forEach(function (pre) {
      if (pre.parentElement && pre.parentElement.classList.contains("code-block")) return;
      var lang = pre.getAttribute("data-lang") || "";
      var wrapper = document.createElement("div");
      wrapper.className = "code-block";
      var head = document.createElement("div");
      head.className = "code-head";
      head.innerHTML = "<span>" + PF.escape(lang || "code") + "</span>";
      var button = document.createElement("button");
      button.type = "button";
      button.className = "code-copy";
      button.innerHTML = PF.icon("copy") + "<span>复制</span>";
      button.addEventListener("click", function () {
        PF.copy(pre.textContent || "").then(function () {
          button.innerHTML = PF.icon("check") + "<span>已复制</span>";
          setTimeout(function () {
            button.innerHTML = PF.icon("copy") + "<span>复制</span>";
          }, 1600);
        });
      });
      head.appendChild(button);
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(head);
      wrapper.appendChild(pre);
    });
  };

  PF.setTitle = function (pageTitle) {
    if (!pageTitle) return;
    var site = PF.get("site.title", "");
    document.title = site ? site + " — " + pageTitle : pageTitle;
  };

  PF.ready = function (fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  };

  function initShell() {
    PF.applyBindings(document);
    initTheme();
    initClock();
    initContact();
    initHeader();
    initMobileMenu();
    PF.reveal();
    var pageTitle = document.body.getAttribute("data-title");
    if (pageTitle) PF.setTitle(pageTitle);
    var description = PF.get("site.description", "");
    var metaDescription = document.querySelector('meta[name="description"]');
    if (description && metaDescription) metaDescription.setAttribute("content", description);
  }

  if (hasDom) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initShell, { once: true });
    } else {
      initShell();
    }
  }
})();
