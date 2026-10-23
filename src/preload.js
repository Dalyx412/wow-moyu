// 工具栏页面和主进程之间只开两条口子：发操作、收状态
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overlay', {
  cmd: (name, arg) => ipcRenderer.send('cmd', name, arg),
  onState: cb => {
    ipcRenderer.on('state', (_e, s) => cb(s));
    ipcRenderer.send('ready');
  },
});
