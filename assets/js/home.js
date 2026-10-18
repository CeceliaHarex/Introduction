/* ==========================================================================
   Home page: live GitHub works, filters, stats and the latest notes.
   ========================================================================== */
(function () {
  "use strict";

  var PF = window.PF;
  var CFG = PF.config;

  var LANG_COLORS = {
    JavaScript: "#d9b600",
    TypeScript: "#3178c6",
    Java: "#b07219",
    Kotlin: "#a97bff",
    Python: "#3572a5",
    HTML: "#e34c26",
    CSS: "#563d7c",
    SCSS: "#c6538c",
    Vue: "#41b883",
    Go: "#00add8",
    Rust: "#dea584",
    Swift: "#f05138",
    Dart: "#00b4ab",
    "C++": "#f34b7d",
    C: "#6a6a6a",
    "C#": "#178600",
    Shell: "#89e051",
    Ruby: "#701516",
    PHP: "#4f5d95",
    Lua: "#000080",
    Makefile: "#427819",
    Dockerfile: "#384d54"
  };

  var state = {
    works: [],
    languages: [],
    filter: "all",
    owner: "",
    loading: false,
    snapshotEvents: []
  };

  var list = null;
  var filters = null;

  document.addEventListener("DOMContentLoaded", function () {
    list = PF.$("[data-work-list]");
    filters = PF.$("[data-filters]");

    initMarquee();
    initSync();
    initRetry();
    loadWorks(false).then(function () {
      loadActivity();
    });
    loadNotes();
  });

  function initMarquee() {
    var track = PF.$("[data-marquee]");
    if (!track) return;
    var skills = PF.get("skills", []);
    if (!Array.isArray(skills) || !skills.length) return;
    var group = skills
      .map(function (skill) {
        return (
          '<span class="marquee-item">' +
          PF.escape(skill) +
          PF.icon("star") +
          "</span>"
        );
      })
      .join("");
    track.innerHTML = group + group + group + group;
  }

  function initSync() {
    var button = PF.$("[data-sync]");
    if (!button) return;
    button.addEventListener("click", function () {
      loadWorks(true).then(function () {
        loadActivity(true);
      });
    });
  }

  function initRetry() {
    if (!list) return;
    list.addEventListener("click", function (event) {
      if (event.target.closest("[data-retry]")) loadWorks(true);
    });
    if (filters) {
      filters.addEventListener("click", function (event) {
        var button = event.target.closest("[data-lang]");
        if (!button) return;
        state.filter = button.dataset.lang;
        PF.$$("[data-lang]", filters).forEach(function (node) {
          node.classList.toggle("is-active", node === button);
        });
        renderWorks();
      });
    }
  }

  function setBusy(busy) {
    state.loading = busy;
    var button = PF.$("[data-sync]");
    if (!button) return;
    button.disabled = busy;
    var icon = button.querySelector("svg");
    if (icon) icon.classList.toggle("spin", busy);
    if (list) list.setAttribute("aria-busy", busy ? "true" : "false");
  }

  async function loadWorks(force) {
    if (state.loading || !list) return;
    var owner = PF.github.owner();
    state.owner = owner;

    if (!owner) {
      renderError(
        "还没有配置 GitHub 用户名。打开 assets/js/config.js，把 contact.github 改成你的用户名。"
      );
      return;
    }

    setBusy(true);
    var snapshotShown = false;

    if (!force) {
      try {
        var snapshot = await PF.github.getSnapshot();
        state.snapshotEvents = snapshot.events || [];
        if (snapshot.data.length) {
          buildWorks(snapshot.data);
          renderWorks();
          updateStats(snapshot.data, snapshot.user, snapshot.ts);
          snapshotShown = true;
        }
      } catch (snapshotError) {
        /* snapshot is optional */
      }
    }

    try {
      var repoResult = await PF.github.getRepos(owner, { force: force });
      var userResult = null;
      try {
        userResult = await PF.github.getUser(owner, { force: force });
      } catch (error) {
        userResult = null;
      }

      var repos = repoResult.data || [];
      buildWorks(repos);
      renderWorks();
      updateStats(repos, userResult && userResult.data, repoResult.ts);

      if (repoResult.stale && repoResult.error) {
        PF.toast(repoResult.error.message + " 先显示上次同步的数据。", "error");
      } else if (force) {
        PF.toast("已同步 · " + state.works.length + " 个作品");
      }
    } catch (error) {
      if (!snapshotShown) {
        renderError((error && error.message) || "读取 GitHub 仓库时出错了。");
      } else if (force) {
        PF.toast((error && error.message) || "实时同步失败，先显示快照里的作品。", "error");
      }
    } finally {
      setBusy(false);
    }
  }

  function buildWorks(repos) {
    var worksConfig = CFG.works || {};
    var pinned = (worksConfig.pinned || []).map(function (name) {
      return String(name).toLowerCase();
    });
    var hidden = (worksConfig.hidden || []).map(function (name) {
      return String(name).toLowerCase();
    });
    var includeForks = worksConfig.includeForks === true;

    var extras = (worksConfig.extras || []).map(function (item) {
      return {
        type: "extra",
        title: item.title || "未命名作品",
        description: item.description || "",
        tags: (item.tags || []).slice(0, 2),
        language: "",
        color: "#b8421d",
        stars: null,
        pushed: null,
        year: item.year || "",
        url: item.url || "#",
        pinned: false
      };
    });

    var items = (repos || []).filter(function (repo) {
      if (!repo || !repo.name) return false;
      if (repo.fork && !includeForks) return false;
      if (hidden.indexOf(String(repo.name).toLowerCase()) !== -1) return false;
      return true;
    });

    items.sort(function (a, b) {
      var rankA = pinned.indexOf(String(a.name).toLowerCase());
      var rankB = pinned.indexOf(String(b.name).toLowerCase());
      if (rankA === -1) rankA = 999;
      if (rankB === -1) rankB = 999;
      if (rankA !== rankB) return rankA - rankB;
      return new Date(b.pushed_at || b.updated_at || 0) - new Date(a.pushed_at || a.updated_at || 0);
    });

    state.works = extras.concat(
      items.map(function (repo) {
        var topics = (repo.topics || []).slice(0, 2).map(function (topic) {
          return String(topic).replace(/-/g, " ");
        });
        if (!topics.length) topics = ["仓库"];
        return {
          type: "repo",
          title: repo.name,
          description: repo.description || "还没有写仓库简介。",
          tags: topics,
          language: repo.language || "",
          color: LANG_COLORS[repo.language] || "#8f8977",
          stars: Number(repo.stargazers_count || 0),
          pushed: repo.pushed_at || repo.updated_at || "",
          year: repo.pushed_at ? new Date(repo.pushed_at).getFullYear() : "",
          url: repo.html_url,
          pinned: pinned.indexOf(String(repo.name).toLowerCase()) !== -1
        };
      })
    );

    var seen = {};
    state.languages = [];
    items.forEach(function (repo) {
      if (repo.language && !seen[repo.language]) {
        seen[repo.language] = true;
        state.languages.push(repo.language);
      }
    });
    if (state.filter !== "all" && state.languages.indexOf(state.filter) === -1) {
      state.filter = "all";
    }
  }

  function renderFilters() {
    if (!filters) return;
    if (state.languages.length < 2) {
      filters.hidden = true;
      return;
    }
    filters.hidden = false;
    var html =
      '<button class="filter' +
      (state.filter === "all" ? " is-active" : "") +
      '" type="button" data-lang="all">全部</button>';
    state.languages.forEach(function (language) {
      html +=
        '<button class="filter' +
        (state.filter === language ? " is-active" : "") +
        '" type="button" data-lang="' +
        PF.escape(language) +
        '">' +
        PF.escape(language) +
        "</button>";
    });
    filters.innerHTML = html;
  }

  function renderWorks() {
    if (!list) return;
    renderFilters();

    var visible = state.works.filter(function (work) {
      return state.filter === "all" || (work.type === "repo" && work.language === state.filter);
    });

    var limit = parseInt(list.getAttribute("data-limit") || "0", 10);
    if (limit > 0) visible = visible.slice(0, limit);

    if (!visible.length) {
      list.innerHTML =
        '<div class="work-empty">' +
        '<div class="work-empty-copy">' +
        '<p class="work-empty-title">这里还空着</p>' +
        "<p>GitHub 上还没有可展示的公开仓库，或者它们被隐藏了。新建仓库后回来点一下「同步」。</p>" +
        "</div>" +
        '<a class="btn btn-sm btn-ghost" href="https://github.com/' +
        PF.escape(state.owner || "") +
        '?tab=repositories" target="_blank" rel="noopener">' +
        PF.icon("github") +
        "去 GitHub 看看</a>" +
        "</div>";
      return;
    }

    list.innerHTML = visible
      .map(function (work, index) {
        return workRow(work, index);
      })
      .join("");
    PF.reveal(list);
  }

  function workRow(work, index) {
    var tags = work.tags
      .map(function (tag) {
        return '<span class="tag">' + PF.escape(tag) + "</span>";
      })
      .join("");
    if (work.type === "extra") {
      tags = '<span class="tag">独立作品</span>' + tags;
    }
    if (work.type === "repo" && work.pinned) {
      tags = '<span class="tag is-pinned">置顶</span>' + tags;
    }

    var meta =
      work.type === "repo"
        ? (work.language
            ? '<span class="lang"><i class="lang-dot" style="background:' +
              work.color +
              '"></i>' +
              PF.escape(work.language) +
              "</span>"
            : "") +
          (work.stars
            ? "<span>" + PF.icon("star") + " " + work.stars + "</span>"
            : "") +
          "<span>" + PF.formatDate(work.pushed).slice(0, 7) + "</span>"
        : "<span>" + PF.escape(work.year || "独立作品") + "</span>";

    var mobileMeta =
      work.type === "repo"
        ? (work.language
            ? '<span class="lang"><i class="lang-dot" style="background:' +
              work.color +
              '"></i>' +
              PF.escape(work.language) +
              "</span>"
            : "") +
          (work.stars ? "<span>" + work.stars + " stars</span>" : "") +
          "<span>更新 " + PF.formatDate(work.pushed).slice(0, 7) + "</span>"
        : "<span>" + PF.escape(work.year || "独立作品") + "</span>";

    return (
      '<a class="work-row" href="' +
      PF.escape(work.url) +
      '" target="_blank" rel="noopener" data-reveal style="--reveal-delay:' +
      index * 55 +
      'ms">' +
      '<span class="work-num">' +
      String(index + 1).padStart(2, "0") +
      "</span>" +
      '<div class="work-main">' +
      '<h3 class="work-name">' +
      PF.escape(work.title) +
      tags +
      "</h3>" +
      '<p class="work-desc">' +
      PF.escape(work.description) +
      "</p>" +
      '<div class="work-meta-mobile">' +
      mobileMeta +
      "</div>" +
      "</div>" +
      '<div class="work-meta">' +
      meta +
      "</div>" +
      '<span class="work-arrow" aria-hidden="true">' +
      PF.icon("arrow-up-right") +
      "</span>" +
      "</a>"
    );
  }

  function updateStats(repos, user, timestamp) {
    var count = (repos || []).length;
    var since =
      user && user.created_at
        ? new Date(user.created_at).getFullYear()
        : PF.get("identity.since", "");

    setText("[data-stat='repos']", String(count).padStart(2, "0"));
    setText("[data-stat='since']", String(since || "—"));
    setText("[data-stat='synced']", PF.relative(timestamp));
    setText("[data-sync-time]", PF.relative(timestamp));

    PF.$$("[data-sync-time]").forEach(function (node) {
      if (timestamp) node.title = new Date(timestamp).toLocaleString("zh-CN");
    });
  }

  function setText(selector, text) {
    PF.$$(selector).forEach(function (node) {
      node.textContent = text;
    });
  }

  async function loadActivity(force) {
    var root = PF.$("[data-activity-list]");
    if (!root) return;

    var owner = state.owner || PF.github.owner();
    var link = PF.$("[data-github-link]");
    if (link && owner) link.href = "https://github.com/" + owner;

    if (!owner) {
      root.innerHTML = '<p class="activity-empty">还没配置 GitHub 用户名。</p>';
      return;
    }

    var usingSnapshot = false;
    if (!force && !state.snapshotEvents.length) {
      try {
        var snapshot = await PF.github.getSnapshot();
        state.snapshotEvents = snapshot.events || [];
      } catch (error) {
        state.snapshotEvents = [];
      }
    }

    if (!force && state.snapshotEvents.length) {
      await renderActivityEvents(state.snapshotEvents, root);
      usingSnapshot = true;
    } else if (!root.dataset.loaded) {
      root.innerHTML = '<p class="activity-empty">正在读取最近的提交…</p>';
    }

    try {
      var result = await PF.github.getEvents(owner, { force: !!force });
      await renderActivityEvents(result.data || [], root);
    } catch (error) {
      if (!usingSnapshot) {
        if (state.snapshotEvents.length) {
          await renderActivityEvents(state.snapshotEvents, root);
        } else {
          root.innerHTML =
            '<p class="activity-empty">暂时没读到 GitHub 动态。<a href="https://github.com/' +
            encodeURIComponent(owner) +
            '" target="_blank" rel="noopener">去 GitHub 看看</a></p>';
        }
      }
      if (force) PF.toast(error.message || "读取 GitHub 动态失败", "error");
    }
  }

  async function renderActivityEvents(events, root) {
    var owner = state.owner || PF.github.owner();
    var pushes = (events || [])
      .filter(function (event) {
        return event && event.type === "PushEvent" && event.repo && event.repo.name && event.payload;
      })
      .sort(function (a, b) {
        return (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0);
      })
      .slice(0, 3);

    if (!pushes.length) {
      root.innerHTML =
        '<p class="activity-empty">最近 90 天没有公开的提交记录。<a href="https://github.com/' +
        encodeURIComponent(owner) +
        '" target="_blank" rel="noopener">去 GitHub 看看</a></p>';
      root.dataset.loaded = "1";
      return;
    }

    var rows = await Promise.all(
      pushes.map(async function (event) {
        var commits = Array.isArray(event.payload.commits) ? event.payload.commits : [];
        var message = "";

        if (commits.length) {
          message = commits[commits.length - 1].message || "";
        } else if (event.payload.head) {
          try {
            var commit = await PF.github.getCommit(event.repo.name, event.payload.head);
            message =
              commit.data && commit.data.commit ? String(commit.data.commit.message || "") : "";
          } catch (error) {
            message = "";
          }
        }

        return commitRow(event, message);
      })
    );

    root.innerHTML = rows.join("");
    root.dataset.loaded = "1";
  }

  function commitRow(event, message) {
    var fullRepo = String(event.repo.name);
    var repoName = fullRepo.split("/").pop();
    var commits = Array.isArray(event.payload.commits) ? event.payload.commits : [];
    var branch = String(event.payload.ref || "")
      .replace(/^refs\/heads\//, "")
      .replace(/^refs\/tags\//, "tag: ");
    var sha = event.payload.head || (commits.length ? commits[commits.length - 1].sha : "");
    var url = "https://github.com/" + fullRepo + (sha ? "/commit/" + sha : "");
    var timestamp = Date.parse(event.created_at);
    var time = isNaN(timestamp) ? "" : PF.relative(timestamp);
    var count = commits.length;
    var firstLine = String(message || "").split("\n")[0];

    return (
      '<a class="commit" href="' +
      PF.escape(url) +
      '" target="_blank" rel="noopener">' +
      '<div class="commit-top">' +
      '<span class="commit-repo">' +
      PF.escape(repoName) +
      "</span>" +
      '<span class="commit-branch">' +
      PF.escape(branch || "main") +
      "</span>" +
      (count > 1 ? '<span class="commit-count">' + count + " commits</span>" : "") +
      '<span class="commit-time">' +
      PF.escape(time) +
      "</span>" +
      "</div>" +
      '<p class="commit-msg">' +
      PF.escape(firstLine || "推送了新的提交") +
      "</p></a>"
    );
  }

  function renderError(message) {
    if (!list) return;
    list.setAttribute("aria-busy", "false");
    list.innerHTML =
      '<div class="work-error">' +
      '<div class="work-error-copy">' +
      '<p class="work-error-title">作品没能加载出来</p>' +
      "<p>" +
      PF.escape(message) +
      "</p>" +
      "</div>" +
      '<button class="btn btn-sm btn-ghost" type="button" data-retry>' +
      PF.icon("refresh") +
      "再试一次</button>" +
      "</div>";
  }

  async function loadNotes() {
    var grid = PF.$("[data-notes]");
    if (!grid) return;
    try {
      var posts = (await PF.loadPosts()).filter(function (post) {
        return !post.draft;
      });

      if (!posts.length) {
        grid.className = "notes-grid is-single";
        grid.innerHTML =
          '<div class="notes-empty">' +
          '<div><p class="work-empty-title">还没有文章</p>' +
          '<p class="section-note">去控制台写下第一篇，发布后会出现在这里。</p></div>' +
          '<a class="btn btn-sm btn-ghost" href="admin.html">' +
          PF.icon("edit") +
          "去写第一篇</a>" +
          "</div>";
        return;
      }

      var feature = posts[0];
      var rest = posts.slice(1, 3);
      grid.className = "notes-grid" + (rest.length ? "" : " is-single");

      var featureHtml =
        '<a class="note-feature" href="' +
        PF.postUrl(feature) +
        '">' +
        '<span class="note-meta">' +
        PF.formatDate(feature.date) +
        " · " +
        PF.readingTime(feature.body) +
        " 分钟阅读</span>" +
        '<h3 class="note-title">' +
        PF.escape(feature.title) +
        "</h3>" +
        '<span class="note-more">阅读全文' +
        PF.icon("arrow-right") +
        "</span></a>";

      var restHtml = rest.length
        ? '<div class="note-list">' +
          rest
            .map(function (post) {
              return (
                '<a class="note-item" href="' +
                PF.postUrl(post) +
                '">' +
                '<span class="note-date">' +
                PF.formatDate(post.date) +
                (post.tags.length ? " · " + PF.escape(post.tags[0]) : "") +
                "</span>" +
                "<h3>" +
                PF.escape(post.title) +
                "</h3></a>"
              );
            })
            .join("") +
          "</div>"
        : "";

      grid.innerHTML = featureHtml + restHtml;
      PF.reveal(grid);
    } catch (error) {
      grid.className = "notes-grid is-single";
      grid.innerHTML =
        '<div class="notes-empty">' +
        '<div><p class="work-empty-title">文章没有加载出来</p>' +
        '<p class="section-note">' +
        PF.escape(error.message) +
        "</p></div>" +
        '<button class="btn btn-sm btn-ghost" type="button" data-notes-retry>' +
        PF.icon("refresh") +
        "重试</button>" +
        "</div>";
      var retry = grid.querySelector("[data-notes-retry]");
      if (retry) retry.addEventListener("click", loadNotes);
    }
  }
})();
