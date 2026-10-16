const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('realmHopper', {
  platform: process.platform,
  version: '2.0.0'
});
