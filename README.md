# Excellence Without End

一个纯静态的个人作品集与文章站：**作品从 GitHub 自动同步，文章在网页里直接写**。

不需要服务器、不需要数据库、不需要安装 Node.js，也不需要记住任何构建命令。把文件放进 GitHub 仓库，打开 GitHub Pages，它就能一直跑下去。

- **01 主页**：头像、个人介绍、首屏插画、底部滚动字幕
- **02 作品**：读取公开仓库，支持置顶、隐藏、按语言筛选、一键刷新
- **03 活动**：GitHub 最近推送的仓库、分支、提交信息
- **04 文章**：文章列表、搜索、标签筛选、文章页、上一篇 / 下一篇
- **05 联系**：GitHub 与邮箱入口
- 五个页面都是真实页面，浏览器前进 / 后退正常，不是在一页里滚动切换
- 导航上的「作品」「活动」带闪烁绿点，提示这两个页面读取实时数据
- 控制台：在浏览器里写文章、拖入图片、发布 / 存草稿 / 删除
- 视觉：蓝白配色、保留原来的纸色底、全局高斯模糊与玻璃质感、Cascadia Code + 苹方字体、深浅色主题、手机适配
- 兜底：GitHub 接口限流时自动使用本地快照

---

## 目录

1. [3 分钟上线](#一3-分钟上线)
2. [写第一篇文章](#二写第一篇文章)
3. [作品和最近提交](#三作品和最近提交)
4. [改成你自己的样子](#四改成你自己的样子)
5. [文件都是干什么的](#五文件都是干什么的)
6. [常见问题](#六常见问题)
7. [它是怎么工作的](#七它是怎么工作的)
8. [上线自检](#八上线自检)

---

## 一、3 分钟上线

### 你需要准备

- 一个 GitHub 账号（没有就在 [github.com](https://github.com) 注册，免费）
- 这个文件夹里的全部文件
- 下面的步骤以账号 `CeceliaHarex` 为例。网站默认已经按这个账号配置好了。

### 第 1 步：新建仓库

1. 打开 [github.com/new](https://github.com/new)
2. **Repository name** 填：`CeceliaHarex.github.io`
3. 选择 **Public**
4. 不要勾选 “Add a README file”、`.gitignore`、license，保持空仓库
5. 点 **Create repository**

> 仓库名必须精确等于 `你的用户名.github.io`，网站地址才会是干净的 `https://你的用户名.github.io`。
> 如果用了别的仓库名（比如 `portfolio`），网站也能正常运行，地址会变成 `https://你的用户名.github.io/portfolio/`。

### 第 2 步：上传文件

1. 在新仓库页面点 **Add file** → **Upload files**
2. 把下面这些**文件和文件夹**一起拖进去：

   - `index.html`、`works.html`、`activity.html`、`blog.html`、`contact.html`、`post.html`、`admin.html`、`404.html`
   - `assets/` 整个文件夹
   - `content/` 整个文件夹
   - `README.md`（可选，只是给 GitHub 看的说明）

3. 点 **Commit changes**

### 第 3 步：补一个隐藏文件 `.nojekyll`

GitHub Pages 默认会用 Jekyll 处理网站，可能把以 `_` 开头的文件忽略掉。补一个空文件就能关掉它：

1. 回到仓库首页，点 **Add file** → **Create new file**
2. 文件名填：`.nojekyll`
3. 内容留空
4. 点 **Commit changes**

### 第 4 步：打开 GitHub Pages

1. 进入仓库的 **Settings** → 左侧 **Pages**
2. **Build and deployment** 的 Source 选 **Deploy from a branch**
3. Branch 选 **main**，目录选 **/(root)**
4. 点 **Save**
5. 等 1 到 2 分钟，刷新页面，顶部会出现网站地址

打开 `https://CeceliaHarex.github.io`，看到主页就成功了。

### 第 5 步：之后修改文件

以后改文章、改配置，直接在 GitHub 网页里点文件右上角的铅笔图标编辑，提交后等 1 分钟刷新即可。

---

## 二、写第一篇文章

文章不是直接改 HTML，而是在网站的「控制台」里写。控制台通过 GitHub 的接口，把文章提交到 `content/posts.json`。

打开：

```
https://CeceliaHarex.github.io/admin.html
```

### 1. 生成一把只对这个仓库有效的令牌

1. 打开 GitHub 的 [Fine-grained tokens](https://github.com/settings/tokens?type=beta) 页面
2. 点右上角的 **Generate new token**
3. **Token name** 随便写，比如 `portfolio-admin`
4. **Expiration** 选 90 days（到期再生成新的）
5. **Repository access** 选 **Only select repositories**，只勾选 `CeceliaHarex.github.io`
6. 点开 **Repository permissions**，把 **Contents** 改成 **Read and write**
7. 点 **Generate token**，复制以 `github_pat_` 开头的那一串

> 令牌就像密码，不要发给任何人，也不要写进代码里。它只保存在你自己的浏览器里，不会上传到任何地方。
> 如果怀疑泄露，回到同一个页面点 **Delete**，再生成新的。

### 2. 回到控制台连接

1. 打开 `admin.html`
2. 仓库所有者填 `CeceliaHarex`，仓库名填 `CeceliaHarex.github.io`，分支填 `main`
3. 粘贴令牌
4. 点「验证并连接」

看到绿色的已连接状态，说明成功了。勾选「在这台设备记住令牌」后，下次打开不用再填；在公用电脑上不要勾选。

### 3. 写，然后发布

- 标题、正文、标签，填多少算多少
- 正文用 Markdown：`##` 是二级标题，`**加粗**`，`-` 是列表
- 想放图片，直接把图片拖进编辑框，会自动上传到仓库
- 点「发布」，等大约一分钟，GitHub Pages 重新生成页面，文章就上线了
- 也可以先「存草稿」，之后在右侧「已发布的文章」里继续编辑

文章列表只显示标题、日期和标签，不显示副标题 / 摘要；摘要仍然保存在数据里，用于搜索和页面描述。

---

## 三、作品和最近提交

### 自动读取

打开「作品」页或「活动」页时，浏览器会先读 `content/github-snapshot.json` 里的快照，再向 GitHub 拉最新数据：

- 成功：页面自动换成最新仓库和最近提交
- 失败（比如接口限流）：继续显示快照，不会空白

GitHub 公共接口对每个 IP 每小时限制 60 次。正常访问一般够用；如果遇到限流，等一小时，或更新快照。

### 手动同步

- **只想自己马上看到**：进入「作品」页，点右上角的「同步」。它只刷新当前浏览器，不写文件。
- **想让所有访客都看到最新**：打开控制台并连接 → 右侧「作品同步」→「同步作品到仓库」。它会把仓库列表和最近 3 条推送写进 `content/github-snapshot.json` 并提交。

### 调整作品顺序和显示

打开 `assets/js/config.js`，找到 `works`：

```js
works: {
  includeForks: false,          // 是否显示 fork 来的仓库
  hidden: ["old-test"],         // 不想展示的仓库
  pinned: ["zhengfang-apk-NUC"],// 置顶，按数组顺序排
  extras: []                    // 不在 GitHub 上的作品
}
```

`extras` 可以放课程作业、设计稿、比赛作品等，排在列表最前面：

```js
extras: [
  {
    title: "某个小工具",
    description: "一句话说明它解决了什么问题。",
    tags: ["Android", "工具"],
    url: "https://example.com",
    year: 2026
  }
]
```

---

## 四、改成你自己的样子

### 个人信息：只改一个文件

打开 `assets/js/config.js`，点右上角铅笔图标直接改。常用的字段：

| 字段 | 作用 |
| --- | --- |
| `identity.name` | 主页最大的名字 |
| `identity.nameEn` | 第二行的名字 |
| `identity.fullName` | 左上角头像后面的全名 |
| `identity.role` / `roleEn` | 身份，一行中文一行英文 |
| `identity.taglineLines` | 名字下面那两行短句 |
| `identity.bio` | 一段自我介绍 |
| `identity.timezone` / `timezoneLabel` | 主页插画上的当地时间 |
| `contact.email` | 填上邮箱后，联系页的主按钮会变成「写封邮件」 |
| `contact.github` | 你的 GitHub 用户名 |
| `about.statement` / `statementAccent` | 活动页的大标题，两行 |
| `about.paragraphs` | 活动页的三段话 |
| `site.title` / `site.description` | 浏览器标题和搜索摘要 |
| `site.repo.owner` / `name` / `branch` | 你的仓库信息 |

保存并提交后，等 1 分钟刷新。

### 换成别的 GitHub 账号

当前默认是 `CeceliaHarex`。线上 GitHub Pages 会根据域名自动识别账号，所以**只改 `config.js` 不够**：

1. 把整个网站部署到新账号的 `<新用户名>.github.io` 仓库，并开启 Pages
2. 改 `assets/js/config.js`：
   - `contact.github` 改成新用户名
   - `site.repo.owner` / `name` 改成新用户名 / 新仓库名
3. 改 `404.html` 里的 `var repo = "新用户名.github.io";`
4. 重新在控制台生成并填写新账号的令牌（要有这个仓库的 Contents 写权限）

`contact.github` 同时用于联系入口和控制台同步快照时的数据源；线上作品 / 活动实际读取的是 Pages 域名对应的账号。最稳的做法是让 **Pages 账号 = `contact.github` = `site.repo.owner`**，不要只改其中一个。

### 换头像和插画

- 左上角头像：替换 `assets/img/avatar-128.jpg`（建议 128×128）
- 主页右侧插画：替换 `assets/img/hero.jpg`（竖图效果最好）
- 浏览器标签页图标：替换 `assets/favicon.png`

保持文件名不变，提交后就能看到新图。

### 换颜色和模糊

打开 `assets/css/main.css`，最上面有一组变量：

```css
:root {
  --paper: #f3efe6;   /* 纸色底，保持不动 */
  --ink: #0e1a2f;     /* 主文字 */
  --accent: #2357c9;  /* 蓝色强调色 */
  --dark: #0a1730;    /* 活动页的深海军蓝 */
}
```

`[data-theme="dark"]` 里是对应的深色模式。全局高斯模糊在 `body::before` 的几组径向渐变上，卡片和页头另有 `backdrop-filter`；不想要模糊效果，删掉 `body::before` 和对应的 `backdrop-filter` 即可。

### 换字体

字体文件在 `assets/fonts/`：

- `CascadiaCode.woff2`：所有英文、数字、代码
- `PingFangSC-Regular.woff2`：中文正文
- `PingFangSC-Bold.woff2`：指定的几个中文大标题

替换同名文件，或者修改 `main.css` 顶部的 `@font-face` 和 `:root` 里的 `--serif`、`--sans`、`--mono`。PingFang 是从提供的 TTF 转成的网页子集，体积比原文件小很多；换字体时注意版权。

### 换文案和页面

- 主页：`index.html`
- 作品页：`works.html`
- 活动页：`activity.html`
- 文章页标题：`blog.html`
- 联系页：`contact.html`
- 控制台提示：`admin.html`

顶部导航在每一页的 `<nav class="nav">` 里，改成你自己的页面时记得同时改桌面导航、手机菜单和页脚。HTML 里的中文都可以直接改，改完提交即可。

主页底部的滚动字幕在 `index.html` 里搜 `Open Source`，有上下两段，**两段要改成一样**，滚动才无缝；速度在 `main.css` 的 `.home-marquee .marquee-track` 里调 `animation-duration`。文章列表不显示摘要/副标题，标题和标签来自 `content/posts.json`。

---

## 五、文件都是干什么的

```
.
├── index.html                  主页（首屏 hero + 底部滚动字幕）
├── works.html                  作品页（完整仓库列表、筛选、同步）
├── activity.html               活动页（个人介绍 + GitHub 最近提交）
├── blog.html                   文章列表
├── contact.html                联系页
├── post.html                   文章详情（?slug=xxx）
├── admin.html                  控制台
├── 404.html                    找不到页面时显示
├── .nojekyll                   告诉 GitHub Pages 不要用 Jekyll 处理
├── assets/
│   ├── css/main.css            所有样式（含蓝色主题、模糊、深浅色、手机适配）
│   ├── js/config.js            ★ 你的个人信息、作品设置
│   ├── js/site.js              导航、主题、时间、公共工具
│   ├── js/landing.js           主页：首屏统计
│   ├── js/home.js              作品/活动：作品同步、最近提交
│   ├── js/blog.js              文章列表：搜索、标签、按年分组
│   ├── js/post.js              文章页：Markdown 渲染、阅读进度
│   ├── js/admin.js             控制台：连接、发布、图片、同步
│   ├── js/github.js            GitHub 接口与缓存
│   ├── js/markdown.js          一个很小的 Markdown 渲染器
│   ├── img/                    头像 avatar-128.jpg、右侧插画 hero.jpg
│   ├── fonts/                  Cascadia Code + 苹方子集
│   └── favicon.png             网站图标
├── content/
│   ├── posts.json              ★ 所有文章（控制台会写它）
│   └── github-snapshot.json    ★ 作品与最近提交的快照（控制台会写它）
└── README.md
```

带 ★ 的是你最常打交道的三个文件。文章和快照都可以手改，但用控制台更省事。

---

## 六、常见问题

**打开是 404**

- 仓库必须是 Public
- Settings → Pages 的分支必须是 `main`，目录必须是 `/(root)`
- 刚开启 Pages 要等 1 到 2 分钟
- 如果仓库名不是 `用户名.github.io`，地址要带仓库名：`https://用户名.github.io/仓库名/`

**页面没有样式、字体很丑**

`assets/` 没有上传完整，或者文件名大小写被改了。GitHub Pages 区分大小写，`main.css` 不能写成 `Main.css`。

**作品页显示「作品没能加载出来」**

- GitHub 公共接口限流：等一小时，或打开控制台「同步作品到仓库」更新快照
- 仓库不是 Public：作品页只能读取公开仓库
- 刚建仓库：GitHub 接口有几分钟缓存，等一会再刷新

**点了「同步」没有变化**

浏览器会缓存 30 分钟。可以强制刷新（Ctrl/Cmd + Shift + R），或在控制台点「同步作品到仓库」后等一分钟。

**控制台连接失败**

- 令牌是否以 `github_pat_` 开头
- Repository access 是否勾选了正确的仓库
- Repository permissions → Contents 是否是 **Read and write**
- 令牌是否过期

**发布文章时报错**

- 令牌没有 Contents 写权限
- 仓库名或分支填错
- 网络问题：刷新页面，重新连接后再试

**文章里的图片上传失败**

图片会提交到 `assets/uploads/`，需要 Contents 写权限。单张图片建议控制在 2MB 以内。

**直接双击 `index.html` 为什么打不开**

这是纯静态站点，浏览器会拦截本地文件的接口请求。用本地服务器预览：

```bash
cd 这个文件夹
python -m http.server 8099
```

然后打开 `http://127.0.0.1:8099`。没有 Python 的话，用 VS Code 的 Live Server 插件也可以。

**怎么改导航顺序或名字**

改每一页的 `<nav class="nav">` 和 `<nav class="mobile-nav">`，以及页脚 `<nav class="footer-nav">`。当前是：

```
01 主页 → index.html
02 作品 → works.html
03 活动 → activity.html
04 文章 → blog.html
05 联系 → contact.html
```

**深色模式在哪里切换**

右上角的太阳 / 月亮按钮。选择会存在当前浏览器里，不会影响别人。

**PingFang 字体可以直接商用吗**

PingFang 是 Apple 的字体。仓库里是从提供的 TTF 转成的网页子集，个人使用没问题；如果要长期公开商用，请先确认授权。Cascadia Code 的许可证在 `assets/fonts/LICENSE-CascadiaCode.txt`。

---

## 七、它是怎么工作的

- **页面**：`index.html`、`works.html`、`activity.html`、`blog.html`、`contact.html` 是真正独立的 HTML 页面。导航是普通链接，所以浏览器前进 / 后退正常。
- **作品**：`github.js` 调用 GitHub 公共接口读取公开仓库；`home.js` 在作品页渲染全部，活动页加载最近提交；`landing.js` 只更新主页首屏统计。
- **最近提交**：读取 `/users/{login}/events/public`，筛出 PushEvent，再用 commits 接口补上提交信息；失败时使用 `github-snapshot.json` 里的 `events`。
- **文章**：`content/posts.json` 存标题、日期、标签、正文；`blog.js` 渲染列表，`post.js` 渲染详情。
- **控制台**：用 GitHub Contents API 读写 `content/posts.json` 和 `content/github-snapshot.json`；令牌只存在浏览器里。
- **缓存**：仓库 30 分钟、动态 10 分钟、提交信息长期缓存；接口失败时回退到快照。
- **没有构建步骤**：没有 npm、没有打包、没有服务端。GitHub Pages 直接托管这些文件。

---

## 八、上线自检

部署完成后，按这个清单走一遍：

- [ ] 打开 `https://CeceliaHarex.github.io`，主页正常
- [ ] 顶部 5 个导航都能点，地址分别是 `works.html`、`activity.html`、`blog.html`、`contact.html`
- [ ] 浏览器后退能回到上一页
- [ ] 作品页能看到仓库；点「同步」不报错
- [ ] 活动页能看到最近提交，或至少显示快照
- [ ] 文章页能看到文章，列表没有副标题
- [ ] 点进一篇文章，正文、上一篇 / 下一篇正常
- [ ] 手机上打开主页和文章页，排版正常
- [ ] 控制台能连接、发布一篇测试文章
- [ ] 深色模式切换正常

全部通过，就可以把链接发给别人了。
