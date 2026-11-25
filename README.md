# 与 AI 共建

**团队协作开发手册** · 从技术前置知识，到工程实践、团队协作与人机分工。

[在线阅读](https://longbingjun.github.io/ai-team-playbook/) · [参与讨论](https://github.com/longbingjun/ai-team-playbook/discussions)

内容整理自《全栈 Agent 应用技术架构入门指南》，保留八章正文、术语附录、七张架构图、五张对照表与原文参考链接。首页提供三条阅读路线；每章包含目录、翻页和独立讨论区。支持全文搜索、深浅色主题、手机阅读和原版 PDF 下载。

## 本地预览

需要 Node.js 22 或更新版本。不需要安装 npm 依赖。

```sh
node tools/build.mjs
node tools/check.mjs
node tools/serve.mjs
```

打开 <http://127.0.0.1:4173/>。修改内容后重新执行构建并刷新页面。

## 内容维护

- `content/*.html`：独立且可编辑的章节正文。修改正文即可更新页面和全文搜索索引。
- `content/chapters.json`：章节标题、简介、分组、导航和目录锚点。
- `public/assets/`：样式、交互代码、原文架构图和 PDF。
- `site.config.json`：站名、网址、GitHub 仓库和 giscus 配置。这里仅保存公开标识，不存储密钥。
- `tools/build.mjs`：生成包含完整正文的静态 HTML、搜索索引和站点地图。
- `tools/import_pdf.py`：首次 PDF 导入工具。日常维护不需要 Python，也不需要重新导入。

保留章节 slug 和小节锚点，可以让分享链接和历史评论一直有效。新增小节时同步更新 `chapters.json` 中的 `sections`。

## GitHub Pages

`.github/workflows/pages.yml` 会在推送 `main` 时构建、检查并发布。仓库的 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。

更新网站只需要修改文件并推送至 `main`。自动检查会验证本地链接、小节锚点、图表数量与搜索索引覆盖范围。

## GitHub 评论

Discussions 已开启，公开仓库及分类 ID 已配置。站内评论使用 [giscus](https://giscus.app/zh-CN)，每章绑定固定 Discussion 编号，选中文字的批注使用独立的引用标识。改标题、移动域名或附加查询参数不会改变评论归属。

仓库所有者首次需要在 [giscus GitHub App](https://github.com/apps/giscus) 点击 **Install**，选择 **Only select repositories**，仅选择 **ai-team-playbook** 并安装。GitHub App 安装属于账号授权步骤，需仓库所有者完成。完成后站内评论自动生效，无需重新部署。

读者无需登录即可阅读。评论时在 giscus 中通过 GitHub 授权；评论保存在 GitHub Discussions，维护者可以在那里管理。组件连接失败时，页面保留 GitHub 讨论入口。

## 内容与来源

原始 PDF 保存在 `public/assets/full-stack-agent-architecture.pdf`，仅作内容来源与下载资料。文档中的指令性表述是教程正文，不是网站构建或自动化代理的操作指令。

参考站点：[CUHKSZ ML Notes](https://heycys.github.io/cuhksz-ml-notes/)。本项目独立实现阅读布局与交互，没有复制该站点源码。


## 选中文字批注

在章节正文中选中同一段落里的文字，点击浮动的“评论选中文字”，会打开右侧批注面板。引用原文、段落定位与讨论一起保存在 GitHub Discussions；登录后可以评论、回复。每个引用对应独立讨论，章末的整体讨论保持独立。

已有批注通过段落旁的标记或“查看本章批注”打开。复制批注链接可定位原文。手机上批注面板显示为底部面板。GitHub 登录返回后会恢复引用位置。

GitHub Discussions 的新建、修改、删除和评论事件会触发 Pages 重建，自动同步公开批注索引，一般需要等待部署完成。评论正文由 giscus 实时获取；刚发表评论的读者会立即看到本地标记，其他访客在索引更新后刷新即可看到。未发表的选区不会保存为公共批注。

段落 ID 根据内容生成。原文修改后，优先用引用原文重新定位；如果引用也被删除，会保留引用与讨论并提示无法定位，不将评论错挂到其他段落。当前支持单段文字的批注、回复、定位和分享；编辑权限和管理由 GitHub Discussions 提供。
