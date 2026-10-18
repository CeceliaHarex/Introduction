/* ==========================================================================
   站点配置 —— 一般情况下，你只需要改这一个文件。
   改完保存，刷新网页就能看到效果；不需要安装任何东西。
   ========================================================================== */

window.PORTFOLIO_CONFIG = {
  /* 1. 你是谁 ------------------------------------------------------------ */
  identity: {
    name: "Cecelia",              // 主页最大的名字
    nameEn: "Harex",              // 第二行的名字
    fullName: "Cecelia Harex",    // 左上角头像后面的全名
    role: "开发者 / 折腾者",       // 一句话身份
    roleEn: "Developer & Tinkerer",
    taglineLines: [
      "把生活里的小麻烦，",
      "做成能跑起来的小工具。"
    ],
    bio:
      "我在做的东西大多很小：一个能少点几次屏幕的插件，一个把自己的作品讲清楚的网站。" +
      "喜欢从具体的麻烦出发，做到能真正用起来为止。这里放我的作品，也放我在过程中想明白的事。",
    timezone: "Asia/Shanghai",      // 用来显示你所在地的当前时间
    timezoneLabel: "GMT+8",
    since: 2022                     // 哪一年开始用 GitHub（会自动从接口读取并覆盖）
  },

  /* 2. 站点信息 ---------------------------------------------------------- */
  site: {
    title: "Excellence Without End", // 浏览器标签页里的站点名
    description: "Excellence Without End — Cecelia Harex 的个人作品集与文章：作品从 GitHub 自动同步，文章可以在站内直接写。",
    // 部署到 GitHub Pages 后会自动识别仓库；下面这项只在本地预览时兜底。
    repo: {
      owner: "CeceliaHarex",
      name: "CeceliaHarex.github.io",
      branch: "main"
    },
    postsPath: "content/posts.json",
    // 仓库数据的快照。控制台里点「同步作品」会更新它；
    // 这样即使 GitHub 接口临时限流，主页和作品页也仍然有作品可以显示。
    snapshotPath: "content/github-snapshot.json"
  },

  /* 3. 联系方式 ---------------------------------------------------------- */
  contact: {
    // 填上邮箱后，联系页的主按钮会变成「写封邮件」，并出现复制邮箱按钮。
    // 例：email: "hello@example.com",
    email: "",
    github: "CeceliaHarex"
  },

  /* 4. 作品 -------------------------------------------------------------- */
  works: {
    includeForks: false,            // 是否显示 fork 来的仓库
    hidden: [],                     // 不想展示的仓库名，例如 ["old-test"]
    pinned: [],                     // 置顶的仓库名（按顺序），例如 ["zhengfang-apk-NUC"]
    // 不在 GitHub 上的作品，也会显示在作品列表里，排在最前面。
    // 例：
    // extras: [{
    //   title: "某个小工具",
    //   description: "一句话说明它解决了什么问题。",
    //   tags: ["Android", "工具"],
    //   url: "https://example.com",
    //   year: 2026
    // }]
    extras: []
  },

  /* 5. 活动页面 ---------------------------------------------------------- */
  about: {
    statement: "先把东西做出来，",
    statementAccent: "再把它讲清楚。",
    paragraphs: [
      "我习惯从具体的麻烦开始：教务系统难用，就写个插件；想有个地方放作品，就搭这个网站。比起宏大的计划，我更相信能被用上的小东西。",
      "技术上还在往前走。Android 是我最熟悉的地方，Web 是最近花时间最多的方向。这个网站没有框架、没有构建步骤，所有内容都由 GitHub 托管——简单，所以能一直用下去。",
      "如果你也在做类似的事，或者只是想聊聊，欢迎来信。"
    ]
  }
};
