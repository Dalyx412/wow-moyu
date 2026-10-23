# wow-moyu（WoW 摸鱼）

打本时盖在魔兽（正式服·国服）画面上的置顶网页小窗，用来玩雀魂、PokéBonk、查资料。公开仓库：https://github.com/Dalyx412/wow-moyu。计划和已定事项见「wow-moyu 计划」：https://claude.ai/artifact/K2fpoxPpSXgy9zY3wMeSML（源文件 `docs/计划.html`）。

## 已定
- 路线 A：独立的 Electron 置顶窗口，不注入魔兽进程，不用 Overwolf。魔兽要开窗口化全屏。
- 不做热键，也不做鼠标穿透。窗口默认占主屏右上四分之一，操作全靠顶部工具栏：书签/标签、☆、＋（网址或必应搜索）、透明度、静音、收起成小条、退出。
- 只有当前标签可见；其他标签和收起时，网页都会被隐藏（浏览器内核会暂停刷新）并静音。

## 结构
- `src/main.js`：窗口、标签（WebContentsView）、配置（userData/config.json）、托盘。
- `src/toolbar.html` + `src/toolbar.js`：工具栏页面，通过 `src/preload.js` 发 `cmd`、收 `state`。
- `src/selftest.js`：`npm run selftest`，只在源码运行时可用，用 `out/selftest/profile` 作独立配置，结果写 `out/selftest/report.json` 和截图。**会在屏幕右上角弹窗约一分钟，用户开着游戏时别跑。**
- `assets/icon.png`：图标（256px，exe 图标、托盘图标都用它）。

## 打包与启动
- 用 electron-builder，配置写在 `package.json` 的 `build` 字段。exe 名是 `wow-moyu.exe`，显示名是「WoW 摸鱼」。
- `npm run install-local`：先打包 `dist/win-unpacked`，再由 `scripts/install-local.ps1` 复制到 `%LOCALAPPDATA%\Programs\wow-moyu`，并建桌面和开始菜单快捷方式。程序在运行时脚本会拒绝覆盖。脚本必须保存成带 BOM 的 UTF-8，否则 Windows PowerShell 5 会把中文读乱。
- `npm run dist`：打便携版单文件 exe。
- 登录状态存在 `persist:overlay` 分区里，和 Chrome 分开。
