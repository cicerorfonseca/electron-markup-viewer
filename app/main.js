const { app, BrowserWindow, dialog } = require('electron');
const remoteMain = require('@electron/remote/main');
remoteMain.initialize();
const fs = require('fs'); //filesystem

// It could be declared into the aoo.on eventlistener but once that runs
// everything in there will be eligible for garbage collection, which means it could cease
// to exist at anytime
let mainWindow = null;

app.on('ready', () => {
  // It has been declares globally to avoid the window from garbage collection
  // show: false to avoid the white flash before loading the html
  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    show: false,
  });

  remoteMain.enable(mainWindow.webContents);

  mainWindow.loadFile(`${__dirname}/index.html`);

  // .once will run only once and no more
  // 'ready-to-show is the event in the main window, like "once the html has been read and parsed"
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
});

// we have changed this from const = getFileFromUser to exports.getFileFromUser
// in order to export it as a method to the main process object
// it will allow us to use this method in a renderer process through the `remote` proxy
exports.getFileFromUser = () => {
  dialog
    // https://www.electronjs.org/docs/latest/api/dialog#dialogshowopendialogbrowserwindow-options
    .showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Markdown Files', extensions: ['md', 'mdown', 'markdown'] },
        { name: 'Text Files', extensions: ['txt', 'text'] },
      ],
    })
    .then((res) => {
      if (res.canceled) return;

      const file = res.filePaths[0];

      openFile(file);
    })
    .catch((err) => {
      console.log(err);
    });
};

const openFile = (file) => {
  // use readFileSync with caution because it blocks the main process until it reads the file
  // it could be problematic if the file is too big
  // in production try to use a different method with callbacks
  const content = fs.readFileSync(file).toString();

  // Send it to the listener (renderer) using IPC - Inter Process Communication
  // Just an arbitrary text to identify what kind of messa you're sending to the renderer process
  mainWindow.webContents.send('file-opened', file, content);
};
