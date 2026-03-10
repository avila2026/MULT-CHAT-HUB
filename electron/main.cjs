const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let backendProcess;
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true
  });

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    // In dev mode, Vite handles the frontend on 3001
    mainWindow.loadURL('http://localhost:3001');
    mainWindow.webContents.openDevTools();
  } else {
    // In prod mode, Electron serves the React build directly
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  const isDev = process.env.NODE_ENV === 'development';

  if (!isDev) {
    // Start Express backend in production using compiled JS
    const serverPath = path.join(__dirname, '../server-dist/index.js');
    
    backendProcess = spawn('node', [serverPath], { 
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, PORT: '3000' }
    });

    backendProcess.stdout.on('data', (data) => console.log(`[Express]: ${data.toString()}`));
    backendProcess.stderr.on('data', (data) => console.error(`[Express Error]: ${data.toString()}`));
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
    console.log("Encerrando Express Server...");
    backendProcess.kill();
  }
});
