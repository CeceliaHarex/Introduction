# 字体说明

这个站点使用两套字体：

| 字体 | 用途 | 文件 |
| --- | --- | --- |
| Cascadia Code | 所有英文、数字、代码 | `CascadiaCode.woff2` |
| PingFang SC | 中文（Regular 正文，Bold 用于指定标题） | `PingFangSC-Regular.woff2`、`PingFangSC-Bold.woff2` |

## Cascadia Code

- 版本：2407.24
- 来源：[microsoft/cascadia-code](https://github.com/microsoft/cascadia-code)
- 许可：SIL Open Font License 1.1，见 `LICENSE-CascadiaCode.txt`
- 使用的是同一个字体包里的 WOFF2 版本，和 `ttf/CascadiaCode.ttf` 字形一致，体积更小
- 可变字重 200–700，标题和正文加粗都用的是同一份字体

## PingFang SC

- 来源：由站点作者提供的 `PingFang Regular_0.ttf` 和 `PingFang Bold_0.ttf`
- 为了让网页加载不至于太慢，使用 fonttools 转了 WOFF2，并做了字符子集：
  - GB2312 一、二级常用汉字（6,763 字）
  - 站点当前用到的全部汉字
  - 常用中文标点、全角符号、基本拉丁字符
- 如果以后文章里出现非常用字（不在子集里），浏览器会自动用系统字体（苹方 / 微软雅黑）补上，不会出现方框

> 注意：苹方是 Apple 的系统字体，版权归 Apple 所有。这里的子集文件是应站点作者要求、根据其本机字体生成的，适合个人使用。如果这个仓库要长期公开、商用或再分发，建议确认授权，或者换成开源字体（例如思源黑体 / Noto Sans SC）。Cascadia Code 可以自由使用。
