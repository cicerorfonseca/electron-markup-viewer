const { app, BrowserWindow, dialog, Menu } = require('electron');
const remoteMain = require('@electron/remote/main');
remoteMain.initialize();
const fs = require('fs'); //filesystem

// It could be declared into the aoo.on eventlistener but once that runs
// everything in there will be eligible for garbage collection, which means it could cease
// to exist at anytime
let mainWindow = null;

// Create top bar menu
// Creating a custom one will take off all the existing ones including shortcuts
const menuTemplate = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Open File',
        accelerator: 'CommandOrControl+O',
        click() {
          exports.getFileFromUser();
        },
      },
      {
        label: 'Save File',
        accelerator: 'CommandOrControl+S',
        click() {
          mainWindow.webContents.send('save-markdown');
        },
      },
      {
        label: 'Save HTML',
        accelerator: 'CommandOrControl+Shift+S',
        click() {
          mainWindow.webContents.send('save-html');
        },
      },
      {
        label: 'Copy',
        role: 'copy',
      },
    ],
  },
];

//MacOs only. Add a new item to the beggining of the menu application.
if (process.platform === 'darwin') {
  const applicationName = 'Markdown Viewer';

  menuTemplate.unshift({
    label: applicationName,
    submenu: [
      {
        label: `About ${applicationName}`,
        role: 'about',
      },
      {
        label: `Quit ${applicationName}`,
        role: 'quit',
      },
    ],
  });
}

const applicationMenu = Menu.buildFromTemplate(menuTemplate);

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

  // Initialize menu. Depending on the OS you're on you might see a slightly different version
  Menu.setApplicationMenu(applicationMenu);

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
    .showOpenDialog(mainWindow, {
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

exports.saveMarkdown = (file, content) => {
  // TODO: Fix saving existing file

  if (!file) {
    dialog
      .showSaveDialog(mainWindow, {
        title: 'Save Markdown',
        defaultPath: app.getPath('desktop'),
        filters: [
          { name: 'Markdown Files', extensions: ['md', 'markdown', 'mdown'] },
        ],
      })
      .then((res) => {
        fs.writeFileSync(res.filePath, content);
        openFile(res.filePath);
      });
    // .catch((err) => {
    //   console.log(err);
    //   return;
    // });
  }

  if (!file) return;

  fs.writeFileSync(file, content);
  openFile(file);
};

exports.saveHtml = (content) => {
  dialog
    .showSaveDialog(mainWindow, {
      title: 'Save HTML',
      defaultPath: app.getPath('desktop'),
      filters: [{ name: 'HTML Files', extensions: ['htm', 'html'] }],
    })
    .then((res) => {
      fs.writeFileSync(res.filePath, content);
    });
};

// This sintax allows us to use the function within this main process and also exports it to the renderer
// It will first take the function and assign it to exports.openFile and then assign it to openFile
const openFile = (exports.openFile = (file) => {
  // use readFileSync with caution because it blocks the main process until it reads the file
  // it could be problematic if the file is too big
  // in production try to use a different method with callbacks
  const content = fs.readFileSync(file).toString();

  // Add the doc to the right click recent documents on the icon
  app.addRecentDocument(file);

  // Send it to the listener (renderer) using IPC - Inter Process Communication
  // Just an arbitrary text to identify what kind of messa you're sending to the renderer process
  mainWindow.webContents.send('file-opened', file, content);
});
