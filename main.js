const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs/promises');

function getDataDir() {
  return path.join(app.getPath('userData'), 'data');
}

function getBackupDir() {
  return path.join(app.getPath('userData'), 'backup');
}

function getDataFile() {
  return path.join(getDataDir(), 'dossiers.json');
}

function getServicesFile() {
  return path.join(getDataDir(), 'services.json');
}

async function ensureDataFile() {
  const DATA_DIR = getDataDir();
  const DATA_FILE = getDataFile();
  const SERVICES_FILE = getServicesFile();
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, '[]', 'utf8');
  }
  try {
    await fs.access(SERVICES_FILE);
  } catch {
    await fs.writeFile(SERVICES_FILE, '[]', 'utf8');
  }
}

async function readDossiers() {
  await ensureDataFile();
  const content = await fs.readFile(getDataFile(), 'utf8');
  try {
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeDossiers(dossiers) {
  await ensureDataFile();
  await fs.writeFile(getDataFile(), JSON.stringify(dossiers, null, 2), 'utf8');
}

async function readServices() {
  await ensureDataFile();
  const content = await fs.readFile(getServicesFile(), 'utf8');
  try {
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeServices(services) {
  await ensureDataFile();
  await fs.writeFile(getServicesFile(), JSON.stringify(services, null, 2), 'utf8');
}

async function createBackup() {
  const BACKUP_DIR = getBackupDir();
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  const now = new Date();
  const stamp = now.toISOString().slice(0, 10);
  const backupFile = path.join(BACKUP_DIR, `dossiers_${stamp}.json`);
  const dossiers = await readDossiers();
  await fs.writeFile(backupFile, JSON.stringify(dossiers, null, 2), 'utf8');
  return backupFile;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#f6f7fb',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(async () => {
  await ensureDataFile();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('dossiers:list', readDossiers);

ipcMain.handle('dossiers:save', async (_event, dossiers) => {
  await writeDossiers(dossiers);
  return readDossiers();
});

ipcMain.handle('services:list', readServices);

ipcMain.handle('services:save', async (_event, services) => {
  await writeServices(services);
  return readServices();
});

ipcMain.handle('dossiers:backup', async () => {
  const file = await createBackup();
  await dialog.showMessageBox({
    type: 'info',
    title: 'Sauvegarde',
    message: 'Sauvegarde créée avec succès.',
    detail: file
  });
  return file;
});
