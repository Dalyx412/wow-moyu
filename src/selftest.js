// 自测：按真实用法点一遍工具栏的操作，检查窗口、标签、暂停、收起，写 report.json 和几张截图
const { app, desktopCapturer, screen } = require('electron');
const fs = require('fs');
const path = require('path');

const wait = ms => new Promise(r => setTimeout(r, ms));

module.exports = async function run(dir, o) {
  const report = { checks: [], shots: [] };
  const check = (name, ok, detail) => { report.checks.push({ name, ok: !!ok, detail }); };
  const save = () => fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 2));

  // 截整块屏幕（包括叠在工具栏下面的网页），再截窗口所在的那块
  async function shot(name) {
    const d = screen.getPrimaryDisplay();
    const sf = d.scaleFactor;
    const [src] = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: d.size.width * sf, height: d.size.height * sf } });
    const b = o.win.getBounds();
    const img = src.thumbnail.crop({ x: Math.round(b.x * sf), y: Math.round(b.y * sf), width: Math.round(b.width * sf), height: Math.round(b.height * sf) });
    const f = path.join(dir, name + '.png');
    fs.writeFileSync(f, img.toPNG());
    report.shots.push(f);
  }
  // 等到页面能看了就算（广告多的站整页一直在加载，等 did-stop-loading 会超时）
  const loaded = (tab, ms = 30000) => new Promise(res => {
    const wc = tab.view.webContents;
    const t = setTimeout(() => res(false), ms);
    wc.once('dom-ready', () => { clearTimeout(t); res(true); });
  });
  const vis = tab => tab.view.webContents.executeJavaScript('document.visibilityState');

  try {
    await new Promise(r => o.win.webContents.once('did-finish-load', r));
    await wait(500);
    const b0 = o.win.getBounds(), def = o.initialBounds();
    check('默认四分之一屏、右上角', b0.width === def.width && b0.height === def.height && b0.x === def.x && b0.y === def.y, { b0, def });
    check('置顶', o.win.isAlwaysOnTop());

    o.actions.openBookmark('https://pokebonk.com/');
    const poke = o.tabs()[0];
    check('PokéBonk 加载完成', await loaded(poke), poke.url);
    await wait(4000);
    await shot('1-pokebonk');

    o.actions.openBookmark('https://www.wowhead.com/cn/');
    const wh = o.tabs()[1];
    check('Wowhead 加载完成', await loaded(wh), wh.url);
    await wait(1500);
    check('后台标签被暂停（不可见）', (await vis(poke)) === 'hidden', await vis(poke));
    check('当前标签可见', (await vis(wh)) === 'visible', await vis(wh));
    check('后台标签静音', poke.view.webContents.isAudioMuted());
    await shot('2-wowhead');

    o.actions.openBookmark('https://pokebonk.com/');
    await wait(500);
    check('再点书签切回已开标签，不重复开', o.tabs().length === 2 && (await vis(poke)) === 'visible');

    o.actions.collapse();
    await wait(800);
    const bc = o.win.getBounds();
    check('收起成小条', o.collapsed() && bc.height === 36 && bc.width === 240, bc);
    check('收起时网页全部暂停', (await vis(poke)) === 'hidden' && (await vis(wh)) === 'hidden');
    await shot('3-collapsed');

    o.actions.collapse();
    await wait(800);
    const be = o.win.getBounds();
    check('展开回原大小', be.width === b0.width && be.height === b0.height && be.x === b0.x && be.y === b0.y, be);

    o.actions.openInput('奥杜尔 攻略');
    const bing = o.tabs()[2];
    check('输入关键词走搜索', bing && bing.url.startsWith('https://cn.bing.com/search?q='), bing && bing.url);
    o.actions.close(bing.id);
    check('关闭标签', o.tabs().length === 2);

    o.actions.opacity(0.5);
    check('透明度生效', Math.abs(o.win.getOpacity() - 0.5) < 0.02, o.win.getOpacity());
  } catch (e) {
    check('自测没有异常', false, String(e && e.stack || e));
  }
  report.passed = report.checks.every(c => c.ok);
  save();
  app.quit();
};
