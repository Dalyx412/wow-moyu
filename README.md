# WoW 摸鱼

打魔兽副本时，盖在游戏画面角落的一个置顶网页小窗。可以用来打雀魂、玩 PokéBonk、查 NGA / Wowhead。

它是一个独立的 Electron 窗口，**不注入、也不读取魔兽进程**，和桌面上开着的其他窗口没有区别。魔兽需要设成「窗口化全屏」，小窗才能盖在上面。

## 功能

- 默认停在主屏右上角，占四分之一屏幕，半透明，始终置顶；位置和大小会记住。
- 书签：雀魂、PokéBonk、NGA 魔兽板块、Wowhead 中文站。点一下打开，已经开着就切过去。☆ 把当前页加进书签，右键书签删除。
- ＋：输入网址，或输入关键词用必应搜索。
- 透明度滑块、静音、后退、刷新。
- ▁ 收起成一根小条，网页全部暂停、静音；再点一下展开。
- 只有当前标签在运行，切走的标签会暂停并静音，尽量不和游戏抢资源。
- 登录状态单独保存，不和你的 Chrome 混用。
- 托盘图标：显示、收起/展开、回到默认位置、退出。

## 使用

### 直接下载

到 [Releases](https://github.com/Dalyx412/wow-moyu/releases/latest) 下载，有两个版本：

- `wow-moyu-*-portable.exe`：便携版，双击就能用，不用安装。
- `wow-moyu-*-setup.exe`：安装版，双击后自动装好，并在桌面和开始菜单建快捷方式。

exe 没有做代码签名，第一次运行时 Windows 可能会拦一下。点「更多信息」→「仍要运行」即可。

### 从源码运行

需要 Node.js 18 或更高版本。

```bash
npm install
npm start                # 从源码直接运行
npm run install-local    # 打包，装到 %LOCALAPPDATA%\Programs\wow-moyu，并在桌面和开始菜单放快捷方式
npm run dist             # 打便携版和安装版，输出到 dist/
```

### 发新版本

把 `package.json` 里的 `version` 改掉，提交后推一个同名标签，比如 `v0.2.0`。GitHub Actions 会在 Windows 上打包，做一次冒烟测试，然后把两个 exe 发到 Release。

`npm run selftest` 会用一份独立的配置自动点一遍主要功能，结果写进 `out/selftest/`。运行时屏幕右上角会弹出窗口，大约持续一分钟。

## 说明

- 只在 Windows 上用过。
- 和暴雪娱乐没有关系。书签里的网站各自归其所有者。
