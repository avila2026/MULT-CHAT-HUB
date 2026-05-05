const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let backendProcess;
let mainWindow;

function getServerPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app.asar.unpacked', 'server-dist', 'index.js');
  }
  return path.join(__dirname, '..', 'server-dist', 'index.js');
}

function startBackend() {
  const serverPath = getServerPath();

  if (!fs.existsSync(serverPath)) {
    console.error(`[Electron] server-dist nao encontrado em ${serverPath}. Rode 'npm run build:server' antes de empacotar.`);
    return;
  }

  const logDir = path.join(app.getPath('userData'), 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  const logStream = fs.createWriteStream(path.join(logDir, 'backend.log'), { flags: 'a' });

  backendProcess = spawn(process.execPath, [serverPath], {
    cwd: path.dirname(serverPath),
    env: { ...process.env, PORT: '3000', ELECTRON_RUN_AS_NODE: '1' }
  });

  backendProcess.stdout.on('data', (data) => {
    const text = data.toString();
    console.log(`[Express]: ${text}`);
    logStream.write(`[stdout ${new Date().toISOString()}] ${text}`);
  });
  backendProcess.stderr.on('data', (data) => {
    const text = data.toString();
    console.error(`[Express Error]: ${text}`);
    logStream.write(`[stderr ${new Date().toISOString()}] ${text}`);
  });
  backendProcess.on('exit', (code) => {
    logStream.write(`[exit ${new Date().toISOString()}] code=${code}\n`);
    logStream.end();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true,
    icon: app.isPackaged ? undefined : path.join(__dirname, '..', 'build', 'icon.ico')
  });

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:3001');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  const isDev = process.env.NODE_ENV === 'development';

  if (!isDev) {
    startBackend();
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('quit', () => {
  if (backendProcess) {
    console.log('Encerrando Express Server...');
    backendProcess.kill();
  }
});
