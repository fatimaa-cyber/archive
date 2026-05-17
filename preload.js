const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('archiveApi', {
  listDossiers: () => ipcRenderer.invoke('dossiers:list'),
  saveDossiers: (dossiers) => ipcRenderer.invoke('dossiers:save', dossiers),
  listServices: () => ipcRenderer.invoke('services:list'),
  saveServices: (services) => ipcRenderer.invoke('services:save', services),
  createBackup: () => ipcRenderer.invoke('dossiers:backup')
});
