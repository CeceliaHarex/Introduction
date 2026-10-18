/* ==========================================================================
   Studio: connect with a GitHub token, write posts, upload images, publish.
   The token lives only in this browser (localStorage or sessionStorage).
   ========================================================================== */
(function () {
  "use strict";

  var PF = window.PF;
  var GH = PF.github;
  var CFG = PF.config;

  var state = {
    connected: false,
    repo: null,
    token: "",
    posts: [],
    sha: "",
    editingSlug: null,
    dirty: false,
    busy: false,
    slugTouched: false,
    pendingDelete: null
  };

  var el = {};
  var pendingDraft = null;
  var previewTimer = null;
  var draftTimer = null;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    if (!PF || !GH) return;
    cacheElements();
    if (!el.setup || !el.studio) return;

    fillRepoDefaults();
    bindConnect();
    bindEditor();
    bindManage();
    bindSidebar();
    bindDialog();

    setToday();
    loadDraftBanner();
    restoreSession();

    window.addEventListener("beforeunload", function (event) {
      if (!state.dirty) return;
      event.preventDefault();
      event.returnValue = "";
    });
  }

  function cacheElements() {
    el.setup = PF.$("[data-setup]");
    el.studio = PF.$("[data-studio]");
    el.owner = PF.$("[data-owner]");
    el.name = PF.$("[data-name]");
    el.branch = PF.$("[data-branch]");
    el.token = PF.$("[data-token]");
    el.remember = PF.$("#rememberToken");
    el.connectBtn = PF.$("[data-connect]");
    el.connectError = PF.$("[data-connect-error]");
    el.connPill = PF.$("[data-conn-pill]");
    el.connLabel = PF.$("[data-conn-label]");
    el.connRepo = PF.$("[data-conn-repo]");
    el.connBranch = PF.$("[data-conn-branch]");
    el.connPath = PF.$("[data-conn-path]");

    el.title = PF.$("#postTitle");
    el.slug = PF.$("#postSlug");
    el.date = PF.$("#postDate");
    el.tags = PF.$("#postTags");
    el.excerpt = PF.$("#postExcerpt");
    el.body = PF.$("#postBody");
    el.editorShell = PF.$("[data-editor-shell]");
    el.preview = PF.$("#previewPane");
    el.editorMode = PF.$("[data-editor-mode]");
    el.editorCount = PF.$("[data-editor-count]");
    el.saveState = PF.$("[data-save-state]");
    el.uploadStatus = PF.$("[data-upload-status]");
    el.publishBtn = PF.$("[data-publish]");
    el.draftBtn = PF.$("[data-save-draft]");
    el.newBtn = PF.$("[data-new-post]");
    el.publishHint = PF.$("[data-publish-hint]");
    el.syncBtn = PF.$("[data-sync-works]");
    el.syncStatus = PF.$("[data-sync-status]");
    el.configLink = PF.$("[data-config-link]");
    el.manageList = PF.$("[data-manage-list]");
    el.manageCount = PF.$("[data-manage-count]");
    el.draftBanner = PF.$("[data-draft-banner]");
    el.draftTime = PF.$("[data-draft-time]");
    el.dialog = PF.$("#confirmDialog");
    el.dialogText = PF.$("#dialogText");
    el.imageInput = PF.$("#imageInput");
    el.refreshButtons = PF.$$("[data-refresh-posts]");
  }

  function fillRepoDefaults() {
    var detected = GH.detectRepo();
    if (el.owner) el.owner.value = detected.owner || GH.ownerFromConfig() || "";
    if (el.name) el.name.value = detected.name || "";
    if (el.branch) el.branch.value = detected.branch || "main";
    try {
      var persistent = localStorage.getItem("pf:token");
      var transient = sessionStorage.getItem("pf:token");
      if (persistent) {
        el.token.value = persistent;
        el.remember.checked = true;
      } else if (transient) {
        el.token.value = transient;
        el.remember.checked = false;
      }
    } catch (e) {}
  }

  function restoreSession() {
    var repo = PF.readStorage("pf:repo", null);
    if (repo && repo.owner && repo.name) {
      el.owner.value = repo.owner;
      el.name.value = repo.name;
      el.branch.value = repo.branch || el.branch.value || "main";
    }
    var token = readToken();
    if (token) {
      el.token.value = token;
      connect({ auto: true });
    }
  }

  function bindConnect() {
    if (el.connectBtn) {
      el.connectBtn.addEventListener("click", function () {
        connect({});
      });
    }
    [el.owner, el.name, el.branch, el.token].forEach(function (input) {
      if (!input) return;
      input.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          event.preventDefault();
          connect({});
        }
      });
    });
  }

  async function connect(options) {
    options = options || {};
    if (state.busy) return;

    var token = el.token.value.trim();
    var owner = el.owner.value.trim().replace(/^@/, "");
    var name = el.name.value.trim();
    var branch = el.branch.value.trim() || "main";

    hideConnectError();

    if (!owner || !name) {
      showConnectError("仓库所有者和仓库名都要填。");
      return;
    }
    if (!token) {
      showConnectError("还需要填访问令牌。生成方法见右边「三步拿到令牌」。");
      return;
    }
    if (token.length < 20) {
      showConnectError("令牌看起来不完整。它应该以 github_pat_ 开头，是较长的一串。");
      return;
    }

    setConnectBusy(true);
    try {
      var repoInfo = await GH.getRepo({ owner: owner, name: name, branch: branch }, token);
      branch = repoInfo.default_branch || branch;
      var repo = { owner: owner, name: name, branch: branch };

      var posts = [];
      var sha = "";
      try {
        var file = await GH.getContent(repo, postsPath(), token);
        posts = parsePosts(file.text);
        sha = file.sha;
      } catch (error) {
        if (error.status !== 404) throw error;
      }

      state.connected = true;
      state.repo = repo;
      state.token = token;
      state.posts = posts;
      state.sha = sha;
      state.dirty = false;
      state.editingSlug = null;

      PF.writeStorage("pf:repo", repo);
      writeToken(token, el.remember.checked);
      showStudio();
      renderManage();
      resetEditor();
      if (options.auto) PF.toast("已连接到 " + owner + "/" + name);
    } catch (error) {
      showConnectError(friendlyConnectError(error));
      showSetup();
    } finally {
      setConnectBusy(false);
    }
  }

  function friendlyConnectError(error) {
    if (!error) return "连接失败，再试一次。";
    if (error.code === "auth") return "令牌无效或已过期。重新生成一个，再粘贴进来。";
    if (error.code === "not-found") {
      return "找不到这个仓库。检查仓库名是否正确，以及令牌是否授权给了这个仓库。";
    }
    if (error.code === "forbidden") {
      return "令牌没有写权限。把 Repository permissions 里的 Contents 改成 Read and write。";
    }
    if (error.code === "rate-limit") return error.message;
    return error.message || "连接失败，再试一次。";
  }

  function setConnectBusy(busy) {
    if (!el.connectBtn) return;
    el.connectBtn.disabled = busy;
    el.connectBtn.textContent = busy ? "验证中…" : "验证并连接";
  }

  function showConnectError(message) {
    if (!el.connectError) return;
    el.connectError.textContent = message;
    el.connectError.classList.add("is-visible");
  }

  function hideConnectError() {
    if (!el.connectError) return;
    el.connectError.classList.remove("is-visible");
    el.connectError.textContent = "";
  }

  function showSetup() {
    el.setup.hidden = false;
    el.studio.hidden = true;
    if (el.connPill) el.connPill.classList.remove("is-live");
    if (el.connLabel) el.connLabel.textContent = "未连接";
  }

  function showStudio() {
    el.setup.hidden = true;
    el.studio.hidden = false;
    if (el.connPill) el.connPill.classList.add("is-live");
    if (el.connLabel) el.connLabel.textContent = "已连接";
    el.connRepo.textContent = state.repo.owner + "/" + state.repo.name;
    el.connBranch.textContent = state.repo.branch;
    el.connPath.textContent = postsPath();
    el.configLink.href =
      "https://github.com/" +
      encodeURIComponent(state.repo.owner) +
      "/" +
      encodeURIComponent(state.repo.name) +
      "/edit/" +
      state.repo.branch +
      "/assets/js/config.js";
  }

  function postsPath() {
    return PF.get("site.postsPath", "content/posts.json");
  }

  function snapshotPath() {
    return PF.get("site.snapshotPath", "content/github-snapshot.json");
  }

  function parsePosts(text) {
    var data;
    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new Error("content/posts.json 不是合法的 JSON，先修好它再发布。");
    }
    var list = Array.isArray(data) ? data : data && data.posts;
    if (!Array.isArray(list)) {
      throw new Error("content/posts.json 里没有 posts 数组。");
    }
    return list
      .map(function (item) {
        if (item && !item.slug && item.title) {
          item.slug = PF.slugify(item.title) || "post-" + Date.now();
        }
        return PF.normalizePost(item);
      })
      .filter(Boolean);
  }

  function serializePosts(posts) {
    return JSON.stringify({ updated: new Date().toISOString(), posts: posts }, null, 2) + "\n";
  }

  /* ----------------------------------------------------------------- editor */
  function bindEditor() {
    PF.$$("[data-editor-view]").forEach(function (button) {
      button.addEventListener("click", function () {
        setEditorView(button.dataset.editorView);
      });
    });

    PF.$$("[data-md]").forEach(function (button) {
      button.addEventListener("click", function () {
        command(button.dataset.md);
      });
    });

    [el.title, el.slug, el.date, el.tags, el.excerpt, el.body].forEach(function (input) {
      if (!input) return;
      input.addEventListener("input", function (event) {
        onInput(event);
      });
    });

    if (el.body) {
      el.body.addEventListener("dragover", function (event) {
        event.preventDefault();
      });
      el.body.addEventListener("drop", function (event) {
        event.preventDefault();
        var file = event.dataTransfer && event.dataTransfer.files[0];
        if (file) uploadImage(file);
      });
      el.body.addEventListener("paste", function (event) {
        var items = event.clipboardData && event.clipboardData.items;
        if (!items) return;
        for (var i = 0; i < items.length; i++) {
          if (items[i].type && items[i].type.indexOf("image/") === 0) {
            event.preventDefault();
            uploadImage(items[i].getAsFile());
            break;
          }
        }
      });
    }

    if (el.imageInput) {
      el.imageInput.addEventListener("change", function () {
        var file = el.imageInput.files[0];
        if (file) uploadImage(file).then(function () {
          el.imageInput.value = "";
        });
      });
    }

    if (el.publishBtn) el.publishBtn.addEventListener("click", function () { publish("publish"); });
    if (el.draftBtn) el.draftBtn.addEventListener("click", function () { publish("draft"); });
    if (el.newBtn) {
      el.newBtn.addEventListener("click", function () {
        resetEditor();
        if (el.draftBanner) el.draftBanner.hidden = true;
      });
    }

    document.addEventListener("keydown", function (event) {
      if (!state.connected) return;
      var mod = event.metaKey || event.ctrlKey;
      if (!mod) return;
      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        publish("draft");
      } else if (event.key === "Enter") {
        event.preventDefault();
        publish("publish");
      }
    });

    if (el.draftBanner) {
      var restore = PF.$("[data-restore-draft]");
      var discard = PF.$("[data-discard-draft]");
      if (restore) restore.addEventListener("click", restoreDraft);
      if (discard) {
        discard.addEventListener("click", function () {
          clearDraft();
          pendingDraft = null;
          if (el.draftBanner) el.draftBanner.hidden = true;
          PF.toast("草稿已丢弃");
        });
      }
    }
  }

  function onInput(event) {
    var target = event.target;
    if (target === el.slug) state.slugTouched = true;
    if (target === el.title) {
      if (!state.slugTouched) el.slug.value = PF.slugify(el.title.value);
    }
    if (target === el.body) updateCount();
    var field = target.closest ? target.closest(".field") : null;
    if (field) field.classList.remove("is-invalid");

    state.dirty = true;
    setSaveState("未保存的修改");
    schedulePreview();
    scheduleDraftSave();
  }

  function updateCount() {
    if (!el.editorCount || !el.body) return;
    var count = el.body.value.replace(/\s/g, "").length;
    el.editorCount.textContent = count.toLocaleString("zh-CN") + " 字";
  }

  function setSaveState(text) {
    if (el.saveState) el.saveState.textContent = text;
  }

  function setEditorView(view) {
    if (!el.editorShell) return;
    el.editorShell.dataset.view = view;
    PF.$$("[data-editor-view]").forEach(function (button) {
      var active = button.dataset.editorView === view;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    if (view !== "write") renderPreview();
  }

  function schedulePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(renderPreview, 140);
  }

  function renderPreview() {
    if (!el.preview || !el.body) return;
    var body = el.body.value.trim();
    if (!body) {
      el.preview.innerHTML = '<p class="help">开始写，这里会显示排版后的样子。</p>';
      return;
    }
    el.preview.innerHTML = '<div class="prose">' + PF.markdown.render(el.body.value) + "</div>";
    PF.enhanceCode(el.preview);
  }

  function command(name) {
    if (!el.body) return;
    el.body.focus();

    if (name === "image") {
      if (el.imageInput) el.imageInput.click();
      return;
    }
    if (name === "h2") return prefixLine("## ");
    if (name === "quote") return prefixLine("> ");
    if (name === "list") return prefixLine("- ");
    if (name === "bold") return wrapSelection("**", "**", "加粗文字");
    if (name === "italic") return wrapSelection("*", "*", "斜体文字");
    if (name === "code") return wrapSelection("`", "`", "代码");
    if (name === "link") return wrapSelection("[", "](https://)", "链接文字");
  }

  function wrapSelection(before, after, placeholder) {
    var area = el.body;
    var start = area.selectionStart;
    var end = area.selectionEnd;
    var selected = area.value.slice(start, end);
    var text = selected || placeholder;
    area.setRangeText(before + text + after, start, end, "end");
    area.focus();
    area.setSelectionRange(start + before.length, start + before.length + text.length);
    afterEdit();
  }

  function prefixLine(prefix) {
    var area = el.body;
    var start = area.selectionStart;
    var lineStart = area.value.lastIndexOf("\n", start - 1) + 1;
    area.setRangeText(prefix, lineStart, lineStart, "end");
    area.focus();
    afterEdit();
  }

  function afterEdit() {
    state.dirty = true;
    updateCount();
    schedulePreview();
    scheduleDraftSave();
    setSaveState("未保存的修改");
  }

  function insertAtCursor(text) {
    var area = el.body;
    var start = area.selectionStart;
    area.setRangeText(text, start, area.selectionEnd, "end");
    area.focus();
    area.selectionStart = area.selectionEnd = start + text.length;
    afterEdit();
  }

  function scheduleDraftSave() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(saveDraftLocal, 900);
  }

  function collectRaw() {
    return {
      editingSlug: state.editingSlug,
      title: el.title.value,
      slug: el.slug.value,
      date: el.date.value,
      tags: el.tags.value,
      excerpt: el.excerpt.value,
      body: el.body.value,
      savedAt: Date.now()
    };
  }

  function saveDraftLocal() {
    var draft = collectRaw();
    if (!draft.title.trim() && !draft.body.trim()) return;
    PF.writeStorage("pf:draft", draft);
    var time = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    setSaveState("草稿已自动保存在本机 " + time);
  }

  function clearDraft() {
    try {
      localStorage.removeItem("pf:draft");
    } catch (e) {}
    clearTimeout(draftTimer);
  }

  function loadDraftBanner() {
    var draft = PF.readStorage("pf:draft", null);
    if (!draft || (!draft.title && !draft.body)) return;
    pendingDraft = draft;
    if (el.draftBanner) {
      el.draftBanner.hidden = false;
      if (el.draftTime) {
        el.draftTime.textContent =
          "最后修改 " + PF.relative(draft.savedAt) + " · " + (draft.title || "未命名");
      }
    }
  }

  function restoreDraft() {
    if (!pendingDraft) return;
    el.title.value = pendingDraft.title || "";
    el.slug.value = pendingDraft.slug || "";
    el.date.value = pendingDraft.date || todayISO();
    el.tags.value = pendingDraft.tags || "";
    el.excerpt.value = pendingDraft.excerpt || "";
    el.body.value = pendingDraft.body || "";
    state.editingSlug = pendingDraft.editingSlug || null;
    state.slugTouched = true;
    state.dirty = true;
    if (el.editorMode) {
      el.editorMode.textContent = state.editingSlug ? "编辑中" : "新文章";
    }
    updateCount();
    renderPreview();
    setSaveState("已恢复本机草稿");
    if (el.draftBanner) el.draftBanner.hidden = true;
    PF.toast("草稿已恢复");
  }

  function resetEditor() {
    state.editingSlug = null;
    state.slugTouched = false;
    state.dirty = false;
    if (el.title) el.title.value = "";
    if (el.slug) el.slug.value = "";
    if (el.tags) el.tags.value = "";
    if (el.excerpt) el.excerpt.value = "";
    if (el.body) el.body.value = "";
    if (el.date) el.date.value = todayISO();
    if (el.editorMode) el.editorMode.textContent = "新文章";
    if (el.publishHint) el.publishHint.innerHTML = "";
    PF.$$(".field.is-invalid").forEach(function (field) {
      field.classList.remove("is-invalid");
    });
    updateCount();
    renderPreview();
    setSaveState("新文章 · 尚未保存");
  }

  function openPost(post) {
    state.editingSlug = post.slug;
    state.slugTouched = true;
    state.dirty = false;
    el.title.value = post.title;
    el.slug.value = post.slug;
    el.date.value = post.date || todayISO();
    el.tags.value = post.tags.join(", ");
    el.excerpt.value = post.excerpt;
    el.body.value = post.body;
    if (el.editorMode) el.editorMode.textContent = "编辑中";
    if (el.publishHint) el.publishHint.innerHTML = "";
    updateCount();
    renderPreview();
    setSaveState("正在编辑已有文章");
    if (window.innerWidth < 980 && el.title) {
      el.title.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    if (el.title) el.title.focus();
  }

  /* ---------------------------------------------------------------- publish */
  function collectPost(mode) {
    var title = el.title.value.trim();
    var slug = PF.slugify(el.slug.value) || PF.slugify(title) || "post-" + Date.now();
    var date = el.date.value || todayISO();
    var tags = el.tags.value
      .split(/[,，]/)
      .map(function (tag) {
        return tag.trim();
      })
      .filter(Boolean);
    return {
      slug: slug,
      title: title,
      date: date,
      tags: tags,
      excerpt: el.excerpt.value.trim(),
      cover: "",
      body: el.body.value,
      draft: mode === "draft"
    };
  }

  function validate(post, mode) {
    var valid = true;
    if (!post.title) {
      setFieldError("title");
      valid = false;
    }
    if (mode === "publish" && !post.body.trim()) {
      setFieldError("body");
      valid = false;
    }
    if (!post.date) {
      post.date = todayISO();
      el.date.value = post.date;
    }
    if (!valid) {
      var invalid = PF.$(".field.is-invalid input, .field.is-invalid textarea");
      if (invalid) invalid.focus();
    }
    return valid;
  }

  function setFieldError(name) {
    var field = PF.$('[data-field="' + name + '"]');
    if (field) field.classList.add("is-invalid");
  }

  async function publish(mode) {
    if (!state.connected || state.busy) return;
    var post = collectPost(mode);
    if (!validate(post, mode)) return;

    setBusy(true);
    setSaveState(mode === "draft" ? "正在保存草稿…" : "正在发布…");
    try {
      var remote = await loadRemote(true);
      var list = remote.posts.slice();
      var original = state.editingSlug;
      var index = original
        ? list.findIndex(function (item) {
            return item.slug === original;
          })
        : -1;

      var others = list.filter(function (_, i) {
        return i !== index;
      });
      var unique = post.slug;
      var counter = 2;
      while (
        others.some(function (item) {
          return item.slug === unique;
        })
      ) {
        unique = post.slug + "-" + counter;
        counter++;
      }
      post.slug = unique;
      el.slug.value = unique;

      if (index >= 0) list[index] = post;
      else list.unshift(post);

      list.sort(function (a, b) {
        return (
          String(b.date).localeCompare(String(a.date)) || String(a.slug).localeCompare(String(b.slug))
        );
      });

      var message =
        (original ? "blog: 更新《" : "blog: 发布《") + post.title + "》";
      var response = await GH.saveContent(state.repo, postsPath(), serializePosts(list), {
        token: state.token,
        sha: remote.sha,
        message: message
      });

      state.posts = list;
      state.sha = response && response.content ? response.content.sha : remote.sha;
      state.editingSlug = post.slug;
      state.dirty = false;
      clearDraft();
      if (el.draftBanner) el.draftBanner.hidden = true;
      if (el.editorMode) el.editorMode.textContent = mode === "draft" ? "草稿已保存" : "已发布";
      renderManage();
      setSaveState(mode === "draft" ? "草稿已提交到 GitHub" : "已发布，等待 GitHub Pages 部署");
      PF.toast(mode === "draft" ? "草稿已保存到 GitHub" : "发布成功，约 1 分钟后上线");

      var url = PF.postUrl(post) + (mode === "draft" ? "&preview=1" : "");
      if (el.publishHint) {
        el.publishHint.innerHTML =
          "刚刚提交：<a href='" +
          PF.escape(url) +
          "' target='_blank' rel='noopener'>打开这篇文章</a>。GitHub Pages 重新部署后才能看到线上版本。";
      }
    } catch (error) {
      setSaveState("保存失败，内容仍在本机草稿里");
      PF.toast(error.message || "保存失败，再试一次。", "error");
    } finally {
      setBusy(false);
    }
  }

  async function loadRemote(force) {
    try {
      var file = await GH.getContent(state.repo, postsPath(), state.token);
      var posts = parsePosts(file.text);
      state.sha = file.sha;
      if (!force) state.posts = posts;
      return { posts: posts, sha: file.sha };
    } catch (error) {
      if (error.status === 404) return { posts: [], sha: "" };
      throw error;
    }
  }

  function setBusy(busy) {
    state.busy = busy;
    if (el.publishBtn) {
      el.publishBtn.disabled = busy;
      el.publishBtn.textContent = busy ? "提交中…" : "发布";
    }
    if (el.draftBtn) el.draftBtn.disabled = busy;
    if (el.newBtn) el.newBtn.disabled = busy;
    el.refreshButtons.forEach(function (button) {
      button.disabled = busy;
    });
  }

  /* --------------------------------------------------------------- documents */
  function bindManage() {
    if (!el.manageList) return;
    el.manageList.addEventListener("click", function (event) {
      var edit = event.target.closest("[data-edit]");
      if (edit) {
        var post = state.posts.find(function (item) {
          return item.slug === edit.dataset.edit;
        });
        if (post) openPost(post);
        return;
      }
      var remove = event.target.closest("[data-delete]");
      if (remove) askDelete(remove.dataset.delete);
    });

    el.refreshButtons.forEach(function (button) {
      button.addEventListener("click", refreshPosts);
    });
  }

  function renderManage() {
    if (!el.manageList) return;
    var posts = state.posts.slice().sort(function (a, b) {
      return String(b.date).localeCompare(String(a.date));
    });
    if (el.manageCount) el.manageCount.textContent = posts.length ? posts.length + " 篇" : "";

    if (!posts.length) {
      el.manageList.innerHTML =
        '<p class="help">还没有文章。左边写一篇，点「发布」就会出现在这里。</p>';
      return;
    }

    el.manageList.innerHTML = posts
      .map(function (post) {
        var meta =
          (post.draft ? '<span class="badge is-draft">草稿</span>' : "") +
          "<span>" +
          PF.formatDate(post.date) +
          "</span>" +
          post.tags
            .slice(0, 2)
            .map(function (tag) {
              return "<span>" + PF.escape(tag) + "</span>";
            })
            .join("");
        return (
          '<div class="manage-item">' +
          "<div><h4>" +
          PF.escape(post.title) +
          '</h4><div class="manage-meta">' +
          meta +
          "</div></div>" +
          '<div class="manage-actions">' +
          '<a class="manage-btn" data-preview href="' +
          PF.escape(PF.postUrl(post)) +
          '&preview=1" target="_blank" rel="noopener" title="预览" aria-label="预览">' +
          PF.icon("eye") +
          "</a>" +
          '<button class="manage-btn" type="button" data-edit="' +
          PF.escape(post.slug) +
          '" title="编辑" aria-label="编辑">' +
          PF.icon("edit") +
          "</button>" +
          '<button class="manage-btn" type="button" data-delete="' +
          PF.escape(post.slug) +
          '" title="删除" aria-label="删除">' +
          PF.icon("trash") +
          "</button>" +
          "</div></div>"
        );
      })
      .join("");
  }

  async function refreshPosts() {
    if (!state.connected || state.busy) return;
    try {
      var result = await loadRemote(true);
      state.posts = result.posts;
      renderManage();
      PF.toast("已刷新，共 " + result.posts.length + " 篇文章");
    } catch (error) {
      PF.toast(error.message, "error");
    }
  }

  function askDelete(slug) {
    var post = state.posts.find(function (item) {
      return item.slug === slug;
    });
    state.pendingDelete = slug;
    if (!el.dialog) return;
    if (el.dialogText) {
      el.dialogText.textContent =
        "《" + (post ? post.title : slug) + "》会从 content/posts.json 里移除，并提交到 GitHub。";
    }
    if (typeof el.dialog.showModal === "function") {
      if (!el.dialog.open) el.dialog.showModal();
    } else if (window.confirm("确定删除这篇文章？")) {
      deletePost(slug);
    }
  }

  function bindDialog() {
    if (!el.dialog) return;
    var cancel = PF.$("[data-dialog-cancel]");
    var confirm = PF.$("[data-dialog-confirm]");
    if (cancel) {
      cancel.addEventListener("click", function () {
        el.dialog.close();
      });
    }
    if (confirm) {
      confirm.addEventListener("click", function () {
        var slug = state.pendingDelete;
        state.pendingDelete = null;
        el.dialog.close();
        if (slug) deletePost(slug);
      });
    }
  }

  async function deletePost(slug) {
    if (!state.connected || state.busy) return;
    var post = state.posts.find(function (item) {
      return item.slug === slug;
    });
    setBusy(true);
    try {
      var remote = await loadRemote(true);
      var list = remote.posts.filter(function (item) {
        return item.slug !== slug;
      });
      if (list.length === remote.posts.length) {
        throw new Error("这篇文章已经不在文件里了，刷新一下再试。");
      }
      var response = await GH.saveContent(state.repo, postsPath(), serializePosts(list), {
        token: state.token,
        sha: remote.sha,
        message: "blog: 删除《" + (post ? post.title : slug) + "》"
      });
      state.posts = list;
      state.sha = response && response.content ? response.content.sha : remote.sha;
      if (state.editingSlug === slug) resetEditor();
      renderManage();
      PF.toast("文章已删除");
    } catch (error) {
      PF.toast(error.message || "删除失败，再试一次。", "error");
    } finally {
      setBusy(false);
    }
  }

  /* ----------------------------------------------------------------- sidebar */
  function bindSidebar() {
    if (el.syncBtn) el.syncBtn.addEventListener("click", syncWorks);
    var disconnect = PF.$("[data-disconnect]");
    if (disconnect) disconnect.addEventListener("click", disconnectRepo);
  }

  async function syncWorks() {
    if (!state.connected || state.busy) return;
    if (el.syncBtn) el.syncBtn.disabled = true;
    if (el.syncStatus) el.syncStatus.textContent = "正在读取 GitHub 仓库…";
    try {
      var login = PF.get("contact.github", state.repo.owner) || state.repo.owner;
      var reposResult = await GH.getRepos(login, { force: true, token: state.token });
      var userResult = null;
      try {
        userResult = await GH.getUser(login, { force: true, token: state.token });
      } catch (error) {
        userResult = null;
      }

      var eventsResult = null;
      try {
        eventsResult = await GH.getEvents(login, { force: true, token: state.token });
      } catch (error) {
        eventsResult = null;
      }

      var payload = {
        updated: new Date().toISOString(),
        user: userResult
          ? {
              login: userResult.data.login,
              created_at: userResult.data.created_at,
              public_repos: userResult.data.public_repos
            }
          : { login: login, created_at: null, public_repos: reposResult.data.length },
        repos: (reposResult.data || []).map(pickRepo),
        events: []
      };

      var sha = "";
      var existing = null;
      try {
        var file = await GH.getContent(state.repo, snapshotPath(), state.token);
        sha = file.sha;
        try {
          existing = JSON.parse(file.text);
        } catch (error) {
          existing = null;
        }
      } catch (error) {
        if (error.status !== 404) throw error;
      }

      if (eventsResult) {
        payload.events = await pickEvents(eventsResult.data, state.token);
      } else if (existing && Array.isArray(existing.events)) {
        payload.events = existing.events;
      }

      await GH.saveContent(state.repo, snapshotPath(), JSON.stringify(payload, null, 2) + "\n", {
        token: state.token,
        sha: sha,
        message: "chore: sync GitHub works"
      });

      GH.clearCache();
      if (el.syncStatus) {
        el.syncStatus.textContent =
          "已同步 " +
          payload.repos.length +
          " 个仓库、" +
          payload.events.length +
          " 条动态 · " +
          PF.formatDate(new Date()) +
          "。约 1 分钟后首页生效。";
      }
      PF.toast("作品已同步到仓库");
    } catch (error) {
      if (el.syncStatus) el.syncStatus.textContent = "同步失败：" + error.message;
      PF.toast(error.message || "同步失败", "error");
    } finally {
      if (el.syncBtn) el.syncBtn.disabled = false;
    }
  }

  function pickRepo(repo) {
    return {
      name: repo.name,
      description: repo.description || "",
      html_url: repo.html_url,
      language: repo.language || null,
      stargazers_count: repo.stargazers_count || 0,
      topics: repo.topics || [],
      fork: repo.fork === true,
      pushed_at: repo.pushed_at || null,
      updated_at: repo.updated_at || null
    };
  }

  async function pickEvents(events, token) {
    var pushes = (events || [])
      .filter(function (event) {
        return event && event.type === "PushEvent" && event.repo && event.repo.name && event.payload;
      })
      .sort(function (a, b) {
        return (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0);
      })
      .slice(0, 3);

    var result = [];
    for (var i = 0; i < pushes.length; i++) {
      var event = pushes[i];
      var commits = Array.isArray(event.payload.commits) ? event.payload.commits : [];
      var message = commits.length ? String(commits[commits.length - 1].message || "") : "";

      if (!message && event.payload.head) {
        try {
          var commit = await GH.getCommit(event.repo.name, event.payload.head, { token: token });
          message =
            commit.data && commit.data.commit ? String(commit.data.commit.message || "") : "";
        } catch (error) {
          message = "";
        }
      }

      result.push({
        type: "PushEvent",
        repo: { name: event.repo.name },
        payload: {
          ref: event.payload.ref || "",
          head: event.payload.head || "",
          commits: message
            ? [{ sha: event.payload.head || "", message: message }]
            : []
        },
        created_at: event.created_at
      });
    }

    return result;
  }

  function disconnectRepo() {
    state.connected = false;
    state.token = "";
    state.repo = null;
    state.posts = [];
    state.sha = "";
    state.editingSlug = null;
    state.dirty = false;
    writeToken("", true);
    if (el.token) el.token.value = "";
    if (el.studio) el.studio.hidden = true;
    if (el.setup) el.setup.hidden = false;
    hideConnectError();
    PF.toast("已断开，令牌从这台设备移除了");
  }

  /* ------------------------------------------------------------------ helpers */
  function todayISO() {
    var date = new Date();
    return (
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(date.getDate()).padStart(2, "0")
    );
  }

  function setToday() {
    if (el.date && !el.date.value) el.date.value = todayISO();
  }

  function readToken() {
    try {
      return sessionStorage.getItem("pf:token") || localStorage.getItem("pf:token") || "";
    } catch (e) {
      return "";
    }
  }

  function writeToken(token, remember) {
    try {
      localStorage.removeItem("pf:token");
      sessionStorage.removeItem("pf:token");
      if (!token) return;
      if (remember) localStorage.setItem("pf:token", token);
      else sessionStorage.setItem("pf:token", token);
    } catch (e) {}
  }

  async function uploadImage(file) {
    if (!state.connected) {
      PF.toast("先连接仓库，才能上传图片", "error");
      return;
    }
    if (!file || !file.type || file.type.indexOf("image/") !== 0) {
      PF.toast("只能上传图片文件", "error");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      PF.toast("图片不要超过 4MB，可以先压缩一下", "error");
      return;
    }

    if (el.uploadStatus) el.uploadStatus.textContent = "正在上传图片…";

    try {
      var dataUrl = await readFileAsDataUrl(file);
      var base64 = String(dataUrl).split(",")[1];
      var ext = (file.name.match(/\.[A-Za-z0-9]+$/) || [""])[0].toLowerCase() || mimeExtension(file.type);
      var baseName = PF.slugify(file.name.replace(/\.[^.]+$/, "")) || "image";
      var stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
      var filename = stamp + "-" + baseName.slice(0, 40) + ext;
      var path = "assets/uploads/" + filename;

      var response = await GH.saveRaw(state.repo, path, base64, {
        token: state.token,
        message: "assets: add " + filename
      });

      var url =
        response && response.content && response.content.download_url
          ? response.content.download_url
          : rawUrl(path);
      insertAtCursor("\n![" + baseName + "](" + url + ")\n");
      if (el.uploadStatus) el.uploadStatus.textContent = "图片已上传";
      PF.toast("图片已上传并插入正文");
      window.setTimeout(function () {
        if (el.uploadStatus) el.uploadStatus.textContent = "";
      }, 3000);
    } catch (error) {
      if (el.uploadStatus) el.uploadStatus.textContent = "图片上传失败";
      PF.toast(error.message || "图片上传失败", "error");
    }
  }

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve(reader.result);
      };
      reader.onerror = function () {
        reject(new Error("读取图片失败"));
      };
      reader.readAsDataURL(file);
    });
  }

  function mimeExtension(type) {
    if (type === "image/jpeg") return ".jpg";
    if (type === "image/svg+xml") return ".svg";
    if (type === "image/gif") return ".gif";
    if (type === "image/webp") return ".webp";
    return ".png";
  }

  function rawUrl(path) {
    return (
      "https://raw.githubusercontent.com/" +
      state.repo.owner +
      "/" +
      state.repo.name +
      "/" +
      state.repo.branch +
      "/" +
      path
    );
  }
})();
