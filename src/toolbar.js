// 工具栏：书签和已开标签合成一条；所有操作都发给主进程，界面只按主进程发回的状态重画
const $ = id => document.getElementById(id);
const strip = $('strip'), url = $('url'), opacity = $('opacity');
let state = null;

function itemEl({ label, open, active, onOpen, onClose, onMenu, tip }) {
  const b = document.createElement('button');
  b.className = 'item' + (open ? ' open' : '') + (active ? ' active' : '');
  b.title = tip || label;
  const s = document.createElement('span'); s.textContent = label;
  const x = document.createElement('span'); x.className = 'x'; x.textContent = '×'; x.title = '关闭';
  b.append(s, x);
  b.addEventListener('click', e => { if (e.target === x) onClose(); else onOpen(); });
  b.addEventListener('auxclick', e => { if (e.button === 1 && open) onClose(); });   // 中键关闭
  if (onMenu) b.addEventListener('contextmenu', e => { e.preventDefault(); onMenu(); });
  return b;
}

function render() {
  const s = state;
  document.body.classList.toggle('collapsed', s.collapsed);
  $('collapse').textContent = s.collapsed ? '▢' : '▁';
  $('collapse').title = s.collapsed ? '展开' : '收起';
  $('mute').textContent = s.muted ? '🔇' : '🔊';
  $('mute').classList.toggle('on', s.muted);
  if (document.activeElement !== opacity) opacity.value = Math.round(s.opacity * 100);
  $('empty').hidden = s.tabs.length > 0;

  const items = [];
  for (const b of s.bookmarks) {
    const t = s.tabs.find(x => x.bookmark === b.url);
    items.push(itemEl({
      label: b.title, tip: b.url, open: !!t, active: t && t.id === s.activeId,
      onOpen: () => overlay.cmd('openBookmark', b.url),
      onClose: () => t && overlay.cmd('close', t.id),
      onMenu: () => overlay.cmd('bookmarkMenu', b.url),
    }));
  }
  const extra = s.tabs.filter(t => !t.bookmark || !s.bookmarks.some(b => b.url === t.bookmark));
  if (extra.length && s.bookmarks.length) { const d = document.createElement('span'); d.className = 'sep'; items.push(d); }
  for (const t of extra) {
    items.push(itemEl({
      label: t.title || t.url, tip: t.url, open: true, active: t.id === s.activeId,
      onOpen: () => overlay.cmd('activate', t.id),
      onClose: () => overlay.cmd('close', t.id),
    }));
  }
  strip.replaceChildren(...items);
  const act = strip.querySelector('.active');
  if (act) act.scrollIntoView({ inline: 'nearest', block: 'nearest' });
}

overlay.onState(s => { state = s; render(); });

$('plus').addEventListener('click', () => {
  const on = !document.body.classList.contains('typing');
  document.body.classList.toggle('typing', on);
  if (on) { url.value = ''; url.focus(); }
});
url.addEventListener('keydown', e => {
  if (e.key === 'Enter') { overlay.cmd('openInput', url.value); document.body.classList.remove('typing'); }
  if (e.key === 'Escape') document.body.classList.remove('typing');
});
url.addEventListener('blur', () => document.body.classList.remove('typing'));
opacity.addEventListener('input', () => overlay.cmd('opacity', opacity.value / 100));
$('back').addEventListener('click', () => overlay.cmd('back'));
$('reload').addEventListener('click', () => overlay.cmd('reload'));
$('star').addEventListener('click', () => overlay.cmd('addBookmark'));
$('mute').addEventListener('click', () => overlay.cmd('mute'));
$('collapse').addEventListener('click', () => overlay.cmd('collapse'));
$('quit').addEventListener('click', () => overlay.cmd('quit'));
