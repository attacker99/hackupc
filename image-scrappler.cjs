const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    transparent: true,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.setAlwaysOnTop(true, 'floating');
  mainWindow.setVisibleOnAllWorkspaces(true);
  mainWindow.setFullScreenable(false);
}

app.whenReady().then(() => {
  createWindow();

  // Listen for image found event
  ipcMain.on('image-found', (event, imageUrl) => {
    if (imageUrl) {
      console.log('Found image URL:', imageUrl);
    } else {
      console.log('No image found with the given description');
    }
    app.quit();
  });

  // Start scraping
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('start-scraping', {
      url: 'https://zara.com/es/en/-P15013530.html?v1=420872847',
      description: 'STRIPED BAREFOOT PLIMSOLLS'
    });
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
