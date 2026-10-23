// WoW 摸鱼 —— 置顶网页小窗：顶部工具栏是窗口自己的页面，每个网站一个 WebContentsView 叠在工具栏下面。
const { app, BrowserWindow, WebContentsView, ipcMain, Menu, Tray, nativeImage, screen } = require('electron');
const path = require('path');
const fs = require('fs');

const BAR = 36;                       // 工具栏高度
const COLLAPSED_WIDTH = 240;          // 收起后小条的宽度
const PARTITION = 'persist:overlay';  // 登录状态存这里，和 Chrome 分开
const DEFAULT_BOOKMARKS = [
  { title: '雀魂', url: 'https://game.maj-soul.com/1/' },
  { title: 'PokéBonk', url: 'https://pokebonk.com/' },
  { title: 'NGA', url: 'https://bbs.nga.cn/thread.php?fid=7' },
  { title: 'Wowhead', url: 'https://www.wowhead.com/cn/' },
];

/* ---------- 配置：位置、大小、透明度、书签、静音 ---------- */
const cfgPath = () => path.join(app.getPath('userData'), 'config.json');
let cfg = {};
function loadConfig() {
  try { cfg = JSON.parse(fs.readFileSync(cfgPath(), 'utf8')); } catch { cfg = {}; }
  cfg.opacity = typeof cfg.opacity === 'number' ? cfg.opacity : 0.85;
  cfg.bookmarks = Array.isArray(cfg.bookmarks) ? cfg.bookmarks : DEFAULT_BOOKMARKS.slice();
  cfg.muted = !!cfg.muted;
}
let saveTimer = null;
function saveConfig() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { fs.writeFileSync(cfgPath(), JSON.stringify(cfg, null, 2)); } catch (e) { console.error('保存配置失败', e); }
  }, 300);
}

// 默认放在主屏右上角，占四分之一屏幕；记住的位置跑到屏幕外了也拉回默认
function initialBounds() {
  const wa = screen.getPrimaryDisplay().workArea;
  const def = { width: Math.round(wa.width / 2), height: Math.round(wa.height / 2) };
  def.x = wa.x + wa.width - def.width;
  def.y = wa.y;
  const b = cfg.bounds;
  if (!b) return def;
  const onScreen = screen.getAllDisplays().some(d => {
    const a = d.workArea;
    return b.x < a.x + a.width - 40 && b.x + b.width > a.x + 40 && b.y >= a.y - 10 && b.y < a.y + a.height - 40;
  });
  return onScreen ? b : def;
}

/* ---------- 窗口与标签 ---------- */
let win = null, tray = null;
let tabs = [];          // { id, view, title, url, bookmark }，bookmark 是从哪个书签开的（书签 url）
let activeId = null;
let collapsed = false;
let nextId = 1;

function createWindow() {
  win = new BrowserWindow({
    ...initialBounds(),
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    minWidth: 360,
    minHeight: 200,
    backgroundColor: '#1b1f27',
    title: 'WoW 摸鱼',
    icon: ICON,
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setOpacity(cfg.opacity);
  win.loadFile(path.join(__dirname, 'toolbar.html'));
  win.on('resize', layout);
  const remember = () => { if (!collapsed) { cfg.bounds = win.getBounds(); saveConfig(); } };
  win.on('moved', remember);
  win.on('resized', remember);
  win.on('closed', () => { win = null; });
}

function activeTab() { return tabs.find(t => t.id === activeId); }

// 只有当前标签可见；隐藏的标签由浏览器内核自动暂停刷新，再静音保证不出声
function layout() {
  if (!win) return;
  const [w, h] = win.getContentSize();
  for (const t of tabs) {
    const show = !collapsed && t.id === activeId;
    t.view.setBounds({ x: 0, y: BAR, width: w, height: Math.max(0, h - BAR) });
    t.view.setVisible(show);
    t.view.webContents.setAudioMuted(cfg.muted || !show);
  }
}

function sendState() {
  if (!win) return;
  win.webContents.send('state', {
    tabs: tabs.map(t => ({ id: t.id, title: t.title, url: t.url, bookmark: t.bookmark })),
    activeId, collapsed,
    bookmarks: cfg.bookmarks,
    opacity: cfg.opacity,
    muted: cfg.muted,
  });
}

function openTab(url, bookmark = null) {
  const view = new WebContentsView({ webPreferences: { partition: PARTITION } });
  const tab = { id: nextId++, view, title: bookmark ? titleOf(bookmark) : url, url, bookmark };
  const wc = view.webContents;
  // 网页里新开窗口的链接，改成在小窗里开新标签
  wc.setWindowOpenHandler(({ url: u }) => { openTab(u); return { action: 'deny' }; });
  wc.on('page-title-updated', (_e, title) => { if (!tab.bookmark) { tab.title = title; sendState(); } });
  wc.on('did-navigate', (_e, u) => { tab.url = u; sendState(); });
  wc.on('did-navigate-in-page', (_e, u) => { tab.url = u; });
  win.contentView.addChildView(view);
  wc.loadURL(url);
  tabs.push(tab);
  activate(tab.id);
}

function titleOf(bookmarkUrl) {
  const b = cfg.bookmarks.find(x => x.url === bookmarkUrl);
  return b ? b.title : bookmarkUrl;
}

function activate(id) {
  activeId = id;
  if (collapsed) setCollapsed(false);
  layout();
  sendState();
}

function closeTab(id) {
  const i = tabs.findIndex(t => t.id === id);
  if (i < 0) return;
  const [t] = tabs.splice(i, 1);
  win.contentView.removeChildView(t.view);
  t.view.webContents.close();
  if (activeId === id) activeId = tabs.length ? tabs[Math.min(i, tabs.length - 1)].id : null;
  layout();
  sendState();
}

// 收起：缩成一根小条，右边缘不动；网页全部隐藏，等于暂停
let expandedBounds = null;
function setCollapsed(on) {
  if (!win || collapsed === on) return;
  collapsed = on;
  if (on) {
    expandedBounds = win.getBounds();
    win.setMinimumSize(COLLAPSED_WIDTH, BAR);
    win.setResizable(false);
    win.setBounds({ x: expandedBounds.x + expandedBounds.width - COLLAPSED_WIDTH, y: expandedBounds.y, width: COLLAPSED_WIDTH, height: BAR });
  } else {
    const cur = win.getBounds();
    const b = expandedBounds || cfg.bounds || initialBounds();
    win.setResizable(true);
    win.setMinimumSize(360, 200);
    // 收起时被拖动过的话，展开后跟着小条的右上角走
    win.setBounds({ x: cur.x + cur.width - b.width, y: cur.y, width: b.width, height: b.height });
  }
  layout();
  sendState();
}

/* ---------- 工具栏发来的操作 ---------- */
const looksLikeUrl = s => /^https?:\/\//i.test(s) || /^[\w-]+(\.[\w-]+)+(\/|$)/.test(s);
const actions = {
  openBookmark(url) {
    const t = tabs.find(x => x.bookmark === url);
    if (t) activate(t.id); else openTab(url, url);
  },
  openInput(text) {
    const s = String(text || '').trim();
    if (!s) return;
    if (looksLikeUrl(s)) openTab(/^https?:\/\//i.test(s) ? s : 'https://' + s);
    else openTab('https://cn.bing.com/search?q=' + encodeURIComponent(s));
  },
  activate(id) { activate(id); },
  close(id) { closeTab(id); },
  addBookmark() {
    const t = activeTab();
    if (!t || cfg.bookmarks.some(b => b.url === t.url)) return;
    const title = (t.view.webContents.getTitle() || t.url).slice(0, 12);
    cfg.bookmarks.push({ title, url: t.url });
    t.bookmark = t.url;
    t.title = title;
    saveConfig();
    sendState();
  },
  bookmarkMenu(url) {
    Menu.buildFromTemplate([{
      label: '删除书签',
      click: () => {
        cfg.bookmarks = cfg.bookmarks.filter(b => b.url !== url);
        tabs.forEach(t => { if (t.bookmark === url) t.bookmark = null; });
        saveConfig();
        sendState();
      },
    }]).popup({ window: win });
  },
  opacity(v) {
    cfg.opacity = Math.min(1, Math.max(0.3, Number(v) || 1));
    win.setOpacity(cfg.opacity);
    saveConfig();
  },
  mute() { cfg.muted = !cfg.muted; layout(); saveConfig(); sendState(); },
  collapse() { setCollapsed(!collapsed); },
  back() { const t = activeTab(); if (t && t.view.webContents.navigationHistory.canGoBack()) t.view.webContents.navigationHistory.goBack(); },
  reload() { const t = activeTab(); if (t) t.view.webContents.reload(); },
  quit() { app.quit(); },
};
ipcMain.on('cmd', (e, name, arg) => {
  if (!win || e.sender !== win.webContents || !Object.hasOwn(actions, name)) return;
  actions[name](arg);
});
ipcMain.on('ready', () => sendState());

/* ---------- 托盘 ---------- */
const ICON = path.join(__dirname, '..', 'assets', 'icon.png');
function createTray() {
  tray = new Tray(nativeImage.createFromPath(ICON).resize({ width: 16, height: 16 }));
  tray.setToolTip('WoW 摸鱼');
  const show = () => { if (win) { win.show(); win.setAlwaysOnTop(true, 'screen-saver'); } };
  tray.on('click', show);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示', click: show },
    { label: '收起 / 展开', click: () => setCollapsed(!collapsed) },
    { label: '回到默认位置', click: () => { setCollapsed(false); cfg.bounds = null; win.setBounds(initialBounds()); saveConfig(); } },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]));
}

/* ---------- 启动 ---------- */
// 自测（只在源码运行时有）：npm run selftest，用独立的配置目录跑一遍，报告和截图写进 out/
const selftest = !app.isPackaged && process.argv.includes('--selftest') ? path.join(__dirname, '..', 'out', 'selftest') : null;
if (selftest) {
  fs.rmSync(selftest, { recursive: true, force: true });
  fs.mkdirSync(selftest, { recursive: true });
  app.setPath('userData', path.join(selftest, 'profile'));
}
// 冒烟测试（发布流程用）：WOW_MOYU_SMOKE=<文件>，工具栏加载完、图标读得到就写 ok 并退出
const smoke = process.env.WOW_MOYU_SMOKE;
if (smoke) app.setPath('userData', path.join(app.getPath('temp'), 'wow-moyu-smoke'));

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) { win.show(); setCollapsed(false); } });
  app.whenReady().then(() => {
    loadConfig();
    createWindow();
    createTray();
    if (selftest) require('./selftest')(selftest, { actions, win, tabs: () => tabs, collapsed: () => collapsed, initialBounds });
    if (smoke) win.webContents.once('did-finish-load', () => {
      const iconOk = !nativeImage.createFromPath(ICON).isEmpty();
      fs.writeFileSync(smoke, iconOk ? 'ok' : 'icon missing');
      app.quit();
    });
  });
  app.on('window-all-closed', () => app.quit());
}
