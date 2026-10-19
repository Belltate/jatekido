// Electron főfolyamat: egyetlen ablak, ami a web/ mappában lévő programot tölti be.
// Ugyanez a web/ mappa a telefonos app is, ezért itt nincs semmi programlogika.
const { app, BrowserWindow } = require('electron');
const path = require('node:path');

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 680,
    minWidth: 380,
    minHeight: 520,
    backgroundColor: '#101418',
    title: 'Játékidő Elosztó',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // játék közben az ablak a háttérben van: így is pontosan kell váltania és sípolnia
      backgroundThrottling: false,
      autoplayPolicy: 'no-user-gesture-required',
      spellcheck: false,
    },
  });
  win.setMenu(null);
  win.once('ready-to-show', () => win.show());
  void win.loadFile(path.join(__dirname, '..', 'web', 'index.html'));
}

app.setAppUserModelId('hu.eleke.jatekido');
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
