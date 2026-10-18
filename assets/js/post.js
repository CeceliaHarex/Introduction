/* ==========================================================================
   Single post: markdown rendering, reading progress, adjacent posts.
   ========================================================================== */
(function () {
  "use strict";

  var PF = window.PF;
  var view = null;
  var progress = null;
  var currentPost = null;

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    view = PF.$("[data-post-view]");
    progress = PF.$("[data-progress]");
    initProgress();

    var params = new URLSearchParams(window.location.search);
    var slug = params.get("slug");
    var preview = params.get("preview") === "1";

    if (!slug) {
      window.location.replace("blog.html");
      return;
    }

    try {
      var posts = await PF.loadPosts();
      var post = posts.find(function (item) {
        return item.slug === slug;
      });

      if (!post || (post.draft && !preview)) {
        renderMissing();
        return;
      }

      currentPost = post;
      renderPost(post, posts);
    } catch (error) {
      renderError(error.message);
    }
  }

  function renderPost(post, allPosts) {
    var published = allPosts.filter(function (item) {
      return !item.draft;
    });
    var index = published.findIndex(function (item) {
      return item.slug === post.slug;
    });
    var newer = index > 0 ? published[index - 1] : null;
    var older = index > -1 && index < published.length - 1 ? published[index + 1] : null;

    var tags = post.tags
      .map(function (tag) {
        return (
          '<a class="tag" href="blog.html?tag=' +
          encodeURIComponent(tag) +
          '">' +
          PF.escape(tag) +
          "</a>"
        );
      })
      .join("");
    if (post.draft && post.body) {
      tags = '<span class="tag is-pinned">草稿预览</span>' + tags;
    }

    var words = countWords(post.body);
    var meta = [
      PF.formatDate(post.date, "long") || "未标日期",
      PF.readingTime(post.body) + " 分钟阅读",
      "约 " + words.toLocaleString("zh-CN") + " 字"
    ]
      .map(function (item) {
        return "<span>" + PF.escape(item) + "</span>";
      })
      .join('<span class="dot" aria-hidden="true"></span>');

    var article =
      '<article class="post-article">' +
      '<header class="post-head">' +
      (tags ? '<div class="post-tags">' + tags + "</div>" : "") +
      '<h1 class="post-title-lg">' +
      PF.escape(post.title) +
      "</h1>" +
      '<div class="post-meta">' +
      meta +
      "</div>" +
      "</header>" +
      '<div class="post-divider" aria-hidden="true">' +
      PF.icon("star") +
      "</div>" +
      '<div class="post-body"><div class="prose" data-prose>' +
      PF.markdown.render(post.body) +
      "</div></div>" +
      '<footer class="post-footer">' +
      '<div class="post-foot-tags">' +
      (post.tags.length
        ? post.tags
            .map(function (tag) {
              return '<span class="tag">' + PF.escape(tag) + "</span>";
            })
            .join("")
        : '<span class="mono muted">THE END / 完</span>') +
      '<button class="btn btn-ghost btn-sm post-share" type="button" data-share>' +
      PF.icon("link") +
      "复制链接</button>" +
      "</div>" +
      renderNav(newer, older) +
      "</footer></article>";

    view.innerHTML = article;
    PF.enhanceCode(view);

    var prose = view.querySelector("[data-prose]");
    if (prose) {
      prose.querySelectorAll("a[href^='http']").forEach(function (link) {
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      });
    }

    var share = view.querySelector("[data-share]");
    if (share) {
      share.addEventListener("click", function () {
        PF.copy(window.location.href).then(function () {
          PF.toast("链接已复制");
        });
      });
    }

    PF.setTitle(post.title);
    var description = PF.excerpt(post, 150);
    var metaTag = document.querySelector('meta[name="description"]');
    if (metaTag) metaTag.setAttribute("content", description);
    var ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", post.title);
    var ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) ogDescription.setAttribute("content", description);

    PF.updateProgress();
  }

  function renderNav(newer, older) {
    if (!newer && !older) return "";
    var count = (newer ? 1 : 0) + (older ? 1 : 0);
    var html = '<nav class="post-nav' + (count === 1 ? " is-single" : "") + '" aria-label="上下篇">';
    if (newer) {
      html +=
        '<a class="is-newer" href="' +
        PF.postUrl(newer) +
        '"><span class="mono">上一篇</span><strong>' +
        PF.escape(newer.title) +
        "</strong></a>";
    }
    if (older) {
      html +=
        '<a class="is-older" href="' +
        PF.postUrl(older) +
        '"><span class="mono">下一篇</span><strong>' +
        PF.escape(older.title) +
        "</strong></a>";
    }
    html += "</nav>";
    return html;
  }

  function renderMissing() {
    PF.setTitle("文章不存在");
    view.innerHTML =
      '<div class="post-missing">' +
      '<p class="mono">404 / Not found</p>' +
      "<h1>这篇文章不在这里。</h1>" +
      "<p>可能是链接过期了，也可能文章还没发布。去文章列表看看别的。</p>" +
      '<a class="btn btn-solid" href="blog.html">回到文章列表' +
      PF.icon("arrow-right") +
      "</a>" +
      "</div>";
  }

  function renderError(message) {
    view.innerHTML =
      '<div class="post-missing">' +
      '<p class="mono">Error / 加载失败</p>' +
      "<h1>文章没有加载出来。</h1>" +
      "<p>" +
      PF.escape(message) +
      "</p>" +
      '<button class="btn btn-solid" type="button" data-reload>再试一次</button>' +
      "</div>";
    var button = view.querySelector("[data-reload]");
    if (button) {
      button.addEventListener("click", function () {
        window.location.reload();
      });
    }
  }

  function countWords(text) {
    var cjk = (String(text || "").match(/[\u3400-\u9fff]/g) || []).length;
    var words = (String(text || "").replace(/[\u3400-\u9fff]/g, " ").match(/[A-Za-z0-9_]+/g) || [])
      .length;
    return cjk + words;
  }

  function initProgress() {
    if (!progress) return;
    var ticking = false;

    function update() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      progress.style.transform = "scaleX(" + ratio + ")";
      ticking = false;
    }

    PF.updateProgress = update;

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
    window.addEventListener("resize", update);
    update();
  }
})();
