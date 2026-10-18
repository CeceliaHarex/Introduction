/* ==========================================================================
   Blog index: search, tag filtering, year grouping.
   ========================================================================== */
(function () {
  "use strict";

  var PF = window.PF;
  var all = [];
  var activeTag = "all";
  var query = "";

  var listEl = null;
  var tagEl = null;
  var countEl = null;
  var searchEl = null;

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    listEl = PF.$("[data-post-list]");
    tagEl = PF.$("[data-tags]");
    countEl = PF.$("[data-post-count]");
    searchEl = PF.$("[data-search]");

    try {
      activeTag = new URLSearchParams(window.location.search).get("tag") || "all";
    } catch (e) {
      activeTag = "all";
    }

    if (searchEl) {
      searchEl.addEventListener(
        "input",
        debounce(function () {
          query = searchEl.value.trim().toLowerCase();
          render();
        }, 120)
      );
    }

    if (tagEl) {
      tagEl.addEventListener("click", function (event) {
        var button = event.target.closest("[data-tag]");
        if (!button) return;
        activeTag = button.dataset.tag;
        render();
      });
    }

    if (listEl) {
      listEl.addEventListener("click", function (event) {
        if (!event.target.closest("[data-clear]")) return;
        activeTag = "all";
        query = "";
        if (searchEl) searchEl.value = "";
        render();
      });
    }

    try {
      all = (await PF.loadPosts()).filter(function (post) {
        return !post.draft;
      });
      PF.$$("[data-post-total]").forEach(function (node) {
        node.textContent = String(all.length);
      });
      PF.$$("[data-blog-updated]").forEach(function (node) {
        node.textContent = all.length ? PF.formatDate(all[0].date) : "—";
      });
      renderTags();
      render();
    } catch (error) {
      if (!listEl) return;
      listEl.innerHTML =
        '<div class="list-empty">' +
        "<h3>文章没有加载出来</h3>" +
        "<p>" +
        PF.escape(error.message) +
        "</p>" +
        '<button class="btn btn-sm btn-ghost" type="button" data-retry>' +
        PF.icon("refresh") +
        "再试一次</button>" +
        "</div>";
      listEl.querySelector("[data-retry]").addEventListener("click", function () {
        init();
      });
      if (countEl) countEl.textContent = "—";
    }
  }

  function renderTags() {
    if (!tagEl) return;
    var counts = {};
    all.forEach(function (post) {
      post.tags.forEach(function (tag) {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    var tags = Object.keys(counts).sort(function (a, b) {
      return counts[b] - counts[a] || a.localeCompare(b);
    });
    if (!tags.length) {
      tagEl.hidden = true;
      return;
    }
    if (activeTag !== "all" && tags.indexOf(activeTag) === -1) activeTag = "all";
    tagEl.hidden = false;
    tagEl.innerHTML =
      '<button class="tag-btn' +
      (activeTag === "all" ? " is-active" : "") +
      '" type="button" data-tag="all">全部</button>' +
      tags
        .map(function (tag) {
          return (
            '<button class="tag-btn' +
            (activeTag === tag ? " is-active" : "") +
            '" type="button" data-tag="' +
            PF.escape(tag) +
            '">' +
            PF.escape(tag) +
            "</button>"
          );
        })
        .join("");
  }

  function syncTagButtons() {
    if (!tagEl) return;
    PF.$$("[data-tag]", tagEl).forEach(function (button) {
      var isActive = button.dataset.tag === activeTag;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function matches(post) {
    if (activeTag !== "all" && post.tags.indexOf(activeTag) === -1) return false;
    if (!query) return true;
    var haystack = [
      post.title,
      post.excerpt,
      post.tags.join(" "),
      post.body
    ]
      .join(" ")
      .toLowerCase();
    return haystack.indexOf(query) !== -1;
  }

  function render() {
    if (!listEl) return;
    syncTagButtons();
    var filtered = all.filter(matches);

    if (countEl) {
      countEl.textContent = filtered.length + " / " + all.length + " 篇";
    }

    if (!all.length) {
      listEl.innerHTML =
        '<div class="list-empty">' +
        "<h3>还没有文章</h3>" +
        "<p>去控制台写下第一篇，发布后就会出现在这里。</p>" +
        '<a class="btn btn-sm btn-ghost" href="admin.html" style="margin-top: 20px">' +
        PF.icon("edit") +
        "去写第一篇</a>" +
        "</div>";
      return;
    }

    if (!filtered.length) {
      listEl.innerHTML =
        '<div class="list-empty">' +
        "<h3>没有找到对应的文章</h3>" +
        "<p>换个关键词，或者清空筛选条件。</p>" +
        '<button class="btn btn-sm btn-ghost" type="button" data-clear style="margin-top: 20px">' +
        PF.icon("close") +
        "清空筛选</button>" +
        "</div>";
      return;
    }

    var groups = {};
    var order = [];
    filtered.forEach(function (post) {
      var year = String(post.date || "").slice(0, 4) || "未标日期";
      if (!groups[year]) {
        groups[year] = [];
        order.push(year);
      }
      groups[year].push(post);
    });

    listEl.innerHTML = order
      .map(function (year) {
        return (
          '<div class="year-block">' +
          '<div class="year-label"><strong>' +
          PF.escape(year) +
          "</strong><span>" +
          groups[year].length +
          " 篇</span></div>" +
          '<div class="post-rows">' +
          groups[year].map(rowHtml).join("") +
          "</div></div>"
        );
      })
      .join("");

    PF.reveal(listEl);
  }

  function rowHtml(post) {
    var full = PF.formatDate(post.date);
    var short = full ? full.slice(5) : "";
    var tags = post.tags
      .slice(0, 2)
      .map(function (tag) {
        return '<span class="tag">' + PF.escape(tag) + "</span>";
      })
      .join("");

    return (
      '<a class="post-row" href="' +
      PF.postUrl(post) +
      '" data-reveal>' +
      '<div class="post-row-main">' +
      '<div class="post-row-date">' +
      (short || "未标日期") +
      " · " +
      PF.readingTime(post.body) +
      " 分钟阅读</div>" +
      '<h3 class="post-row-title">' +
      PF.escape(post.title) +
      "</h3>" +
      (tags ? '<div class="post-row-tags">' + tags + "</div>" : "") +
      "</div>" +
      '<span class="post-row-arrow" aria-hidden="true">' +
      PF.icon("arrow-right") +
      "</span></a>"
    );
  }

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(fn, wait);
    };
  }
})();
