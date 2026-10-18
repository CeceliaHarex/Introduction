/* ==========================================================================
   GitHub API client: live repositories, caching, and file writes for Studio.
   Public reads work without a token (60 requests / hour / IP).
   Writes need a fine-grained token with "Contents: Read and write".
   ========================================================================== */
(function () {
  "use strict";

  var PF = (window.PF = window.PF || {});
  var CFG = window.PORTFOLIO_CONFIG || {};
  var API = "https://api.github.com";
  var TTL = 30 * 60 * 1000;
  var memory = {};

  function fail(code, message, extra) {
    var error = new Error(message);
    error.code = code;
    if (extra) {
      Object.keys(extra).forEach(function (key) {
        error[key] = extra[key];
      });
    }
    return error;
  }

  function readStorage(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* storage full or disabled — cache is optional */
    }
  }

  function getCached(key) {
    if (memory[key]) return memory[key];
    var value = readStorage(key, null);
    if (value && typeof value.ts === "number") {
      memory[key] = value;
      return value;
    }
    return null;
  }

  function setCached(key, value) {
    memory[key] = value;
    writeStorage(key, value);
  }

  function minutesUntil(epochSeconds) {
    var diff = Number(epochSeconds) * 1000 - Date.now();
    return Math.max(1, Math.ceil(diff / 60000));
  }

  async function request(path, options) {
    options = options || {};
    var headers = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
    if (options.token) headers.Authorization = "Bearer " + options.token;
    if (options.body) headers["Content-Type"] = "application/json";

    var controller = new AbortController();
    var timer = setTimeout(function () {
      controller.abort();
    }, options.timeout || 18000);

    var response;
    try {
      response = await fetch(API + path, {
        method: options.method || "GET",
        headers: headers,
        body: options.body,
        cache: "no-store",
        signal: controller.signal
      });
    } catch (error) {
      if (error && error.name === "AbortError") {
        throw fail("timeout", "请求 GitHub 超时了，检查一下网络再试。");
      }
      throw fail("network", "连不上 GitHub。可能是网络问题，稍后再试一次。");
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      var detail = "";
      try {
        var payload = await response.json();
        detail = payload && payload.message ? payload.message : "";
      } catch (e) {}

      var remaining = response.headers.get("x-ratelimit-remaining");
      if (response.status === 401) {
        throw fail("auth", "GitHub 令牌无效或已过期，请重新生成一个。", { status: 401 });
      }
      if (response.status === 403 && remaining === "0") {
        throw fail(
          "rate-limit",
          "GitHub 公共接口的额度用完了，大约 " +
            minutesUntil(response.headers.get("x-ratelimit-reset")) +
            " 分钟后恢复。",
          { status: 403 }
        );
      }
      if (response.status === 403) {
        throw fail("forbidden", "这个操作没有权限。检查令牌是否有 Contents 读写权限。", {
          status: 403
        });
      }
      if (response.status === 404) {
        throw fail("not-found", "没有找到。检查仓库名、分支和文件路径是否正确。", {
          status: 404
        });
      }
      if (response.status === 409) {
        throw fail("conflict", "文件刚在别处被改过，刷新一下再试。", { status: 409 });
      }
      if (response.status === 422) {
        throw fail("invalid", "GitHub 拒绝了这次提交（422）。" + (detail ? " " + detail : ""), {
          status: 422
        });
      }
      throw fail("http", "GitHub 返回了 " + response.status + "。" + (detail ? " " + detail : ""), {
        status: response.status
      });
    }

    if (response.status === 204) return null;
    return response.json();
  }

  function encodePath(path) {
    return String(path)
      .split("/")
      .map(function (segment) {
        return encodeURIComponent(segment);
      })
      .join("/");
  }

  function encodeBase64(text) {
    var bytes = new TextEncoder().encode(String(text));
    var binary = "";
    var chunk = 0x8000;
    for (var i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function decodeBase64(base64) {
    var binary = atob(String(base64 || "").replace(/\s/g, ""));
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }

  function ownerFromConfig() {
    if (CFG.contact && CFG.contact.github) return String(CFG.contact.github).replace(/^@/, "");
    if (CFG.site && CFG.site.repo && CFG.site.repo.owner) return CFG.site.repo.owner;
    return "";
  }

  var GH = (PF.github = {});

  GH.ownerFromConfig = ownerFromConfig;

  GH.detectRepo = function () {
    var detected = { owner: "", name: "", branch: "main" };
    try {
      var host = window.location.hostname || "";
      if (/\.github\.io$/i.test(host)) {
        detected.owner = host.replace(/\.github\.io$/i, "");
        var first = window.location.pathname.split("/").filter(Boolean)[0] || "";
        try {
          first = decodeURIComponent(first);
        } catch (e) {}
        detected.name = first || detected.owner + ".github.io";
      }
    } catch (e) {}

    var saved = readStorage("pf:repo", null);
    var configured = (CFG.site && CFG.site.repo) || {};

    if (detected.owner) {
      detected.branch = (saved && saved.branch) || configured.branch || "main";
      return detected;
    }
    if (saved && saved.owner && saved.name) {
      return {
        owner: saved.owner,
        name: saved.name,
        branch: saved.branch || configured.branch || "main"
      };
    }
    return {
      owner: configured.owner || ownerFromConfig(),
      name: configured.name || "",
      branch: configured.branch || "main"
    };
  };

  GH.owner = function () {
    return GH.detectRepo().owner;
  };

  GH.profileUrl = function (login) {
    return "https://github.com/" + (login || ownerFromConfig());
  };

  GH.getUser = async function (login, options) {
    options = options || {};
    var key = "pf:cache:user:" + String(login).toLowerCase();
    var cached = getCached(key);
    if (!options.force && cached && Date.now() - cached.ts < TTL) {
      return { data: cached.data, ts: cached.ts, stale: false, cached: true };
    }
    try {
      var data = await request("/users/" + encodeURIComponent(login), { token: options.token });
      var ts = Date.now();
      setCached(key, { ts: ts, data: data });
      return { data: data, ts: ts, stale: false, cached: false };
    } catch (error) {
      if (cached) {
        return { data: cached.data, ts: cached.ts, stale: true, cached: true, error: error };
      }
      throw error;
    }
  };

  GH.getRepos = async function (login, options) {
    options = options || {};
    var key = "pf:cache:repos:" + String(login).toLowerCase();
    var cached = getCached(key);
    if (!options.force && cached && Date.now() - cached.ts < TTL) {
      return { data: cached.data, ts: cached.ts, stale: false, cached: true };
    }
    try {
      var all = [];
      for (var page = 1; page <= 3; page++) {
        var batch = await request(
          "/users/" +
            encodeURIComponent(login) +
            "/repos?per_page=100&sort=pushed&direction=desc&page=" +
            page,
          { token: options.token }
        );
        if (!Array.isArray(batch)) break;
        all = all.concat(batch);
        if (batch.length < 100) break;
      }
      var ts = Date.now();
      setCached(key, { ts: ts, data: all });
      return { data: all, ts: ts, stale: false, cached: false };
    } catch (error) {
      if (cached) {
        return { data: cached.data, ts: cached.ts, stale: true, cached: true, error: error };
      }
      throw error;
    }
  };

  GH.getEvents = async function (login, options) {
    options = options || {};
    var key = "pf:cache:events:" + String(login).toLowerCase();
    var cached = getCached(key);
    var ttl = 10 * 60 * 1000;
    if (!options.force && cached && Date.now() - cached.ts < ttl) {
      return { data: cached.data, ts: cached.ts, stale: false, cached: true };
    }
    try {
      var data = await request(
        "/users/" +
          encodeURIComponent(login) +
          "/events/public?per_page=30",
        { token: options.token }
      );
      var list = Array.isArray(data) ? data : [];
      var ts = Date.now();
      setCached(key, { ts: ts, data: list });
      return { data: list, ts: ts, stale: false, cached: false };
    } catch (error) {
      if (cached) {
        return { data: cached.data, ts: cached.ts, stale: true, cached: true, error: error };
      }
      throw error;
    }
  };

  GH.getCommit = async function (repoFull, sha, options) {
    options = options || {};
    var key = "pf:cache:commit:" + String(repoFull).toLowerCase() + ":" + sha;
    var cached = getCached(key);
    if (cached) return { data: cached.data, ts: cached.ts, stale: false, cached: true };
    try {
      var data = await request(
        "/repos/" +
          String(repoFull)
            .split("/")
            .map(function (part) {
              return encodeURIComponent(part);
            })
            .join("/") +
          "/commits/" +
          encodeURIComponent(sha),
        { token: options.token }
      );
      var ts = Date.now();
      setCached(key, { ts: ts, data: data });
      return { data: data, ts: ts, stale: false, cached: false };
    } catch (error) {
      throw error;
    }
  };

  GH.getSnapshot = async function () {
    var path = (CFG.site && CFG.site.snapshotPath) || "content/github-snapshot.json";
    var url;
    try {
      url = new URL(path, window.location.href).toString();
    } catch (e) {
      url = path;
    }
    var response = await fetch(url + (url.indexOf("?") === -1 ? "?" : "&") + "v=" + Date.now(), {
      cache: "no-store"
    });
    if (!response.ok) throw fail("snapshot", "没有找到作品快照文件。");
    var data = await response.json();
    return {
      data: Array.isArray(data.repos) ? data.repos : [],
      events: Array.isArray(data.events) ? data.events : [],
      user: data.user || null,
      ts: Date.parse(data.updated || "") || 0
    };
  };

  GH.clearCache = function () {
    Object.keys(memory).forEach(function (key) {
      delete memory[key];
    });
    try {
      Object.keys(localStorage)
        .filter(function (key) {
          return key.indexOf("pf:cache:") === 0;
        })
        .forEach(function (key) {
          localStorage.removeItem(key);
        });
    } catch (e) {}
  };

  GH.getRepo = function (repo, token) {
    return request(
      "/repos/" + encodeURIComponent(repo.owner) + "/" + encodeURIComponent(repo.name),
      { token: token }
    );
  };

  GH.getContent = async function (repo, path, token) {
    var data = await request(
      "/repos/" +
        encodeURIComponent(repo.owner) +
        "/" +
        encodeURIComponent(repo.name) +
        "/contents/" +
        encodePath(path) +
        "?ref=" +
        encodeURIComponent(repo.branch || "main"),
      { token: token }
    );
    if (!data || typeof data.content === "undefined") {
      throw fail("empty", "读取到的文件内容是空的。");
    }
    return { text: decodeBase64(data.content), sha: data.sha, size: data.size };
  };

  GH.saveRaw = function (repo, path, base64, options) {
    options = options || {};
    var body = {
      message: options.message || "chore: update content",
      content: base64,
      branch: repo.branch || "main"
    };
    if (options.sha) body.sha = options.sha;
    return request(
      "/repos/" +
        encodeURIComponent(repo.owner) +
        "/" +
        encodeURIComponent(repo.name) +
        "/contents/" +
        encodePath(path),
      {
        method: "PUT",
        token: options.token,
        body: JSON.stringify(body)
      }
    );
  };

  GH.saveContent = function (repo, path, text, options) {
    options = options || {};
    return GH.saveRaw(repo, path, encodeBase64(text), options);
  };

  GH.encodeBase64 = encodeBase64;
  GH.decodeBase64 = decodeBase64;
  GH.request = request;

  PF.fail = fail;
  PF.readStorage = readStorage;
  PF.writeStorage = writeStorage;
})();
