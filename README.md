# Qiaopi Archive Intelligence

侨批智档是一个面向侨批数字保护的公益展示网站。页面使用全站统一背景视频、滚动驱动的影像进度、轻量粒子场、液态玻璃界面、3D 卡片与可信 RAG 演示面板，呈现侨批智能建档、OCR/HTR、语义抽取、可信问答和公益建档服务。

## 部署

这是一个纯静态站点，可直接部署到 Cloudflare Pages：

- 构建命令：留空
- 输出目录：项目根目录
- 入口文件：`index.html`

背景视频位于 `background_video/`，页面当前使用 `background_video/bc691effed63d5eac137d9edaa2dace34dac41e7dcb6a64b6dba5be21d9af13f.mp4`。

## 本地预览

```bash
python3 -m http.server 4173
```

然后打开 `http://localhost:4173/`。
