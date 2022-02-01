// the require does not exist in the browser
// we can use it here because we have access to all the browser apis and also all the node
const path = require('path');
const marked = require('marked');
const { ipcRenderer, shell } = require('electron');
const remote = require('@electron/remote');
const mainProcess = remote.require('./main.js');

// Get a reference to the current window so we can update its title
const currentWindow = remote.getCurrentWindow();

let filePath = null;
let originalContent = '';

const markdownView = document.querySelector('#markdown');
const htmlView = document.querySelector('#html');
const newFileButton = document.querySelector('#new-file');
const openFileButton = document.querySelector('#open-file');
const saveMarkdownButton = document.querySelector('#save-markdown');
const revertButton = document.querySelector('#revert');
const saveHtmlButton = document.querySelector('#save-html');
const showFileButton = document.querySelector('#show-file');
const openInDefaultButton = document.querySelector('#open-in-default');

const renderMarkdownToHtml = (markdown) => {
  htmlView.innerHTML = marked.parse(markdown);
};

const updateUserInterface = (isEdited) => {
  let title = 'Markdown Viewer';

  if (filePath) {
    title = `${path.basename(filePath)} - ${
      title + (isEdited ? '(Edited)' : '')
    } `;
  }

  // Add the small icon besides the title for MacOS users only
  if (filePath) currentWindow.setRepresentedFilename(filePath);
  // Set the close button with a dot to identify the file has been edited, MacOS users only
  currentWindow.setDocumentEdited(isEdited);

  showFileButton.disabled = !filePath;
  openInDefaultButton.disabled = !filePath;

  // Update title and enable save/revert buttons
  currentWindow.setTitle(title);
  saveMarkdownButton.disabled = !isEdited;
  revertButton.disabled = !isEdited;
  saveHtmlButton.disabled = htmlView.innerHTML.length ? false : true;

  // TODO: Listen to the close window event and open up an alert before closing the window
};

markdownView.addEventListener('keyup', (event) => {
  const currentContent = event.target.value;
  isEdited = currentContent !== originalContent;

  renderMarkdownToHtml(currentContent);
  updateUserInterface(currentContent !== originalContent);
});

// How to trigger the getFileFromUser method from the main process?
// using the "remote" Electron proxy to the main process
// remote = require('electron').remote
// it will read the 'main process' and not the 'main.js' file
openFileButton.addEventListener('click', () => {
  mainProcess.getFileFromUser();
});

// Read the the comment below for more info on why we didn't use an anonymous function similarto the other methods
const saveMarkDown = () => {
  mainProcess.saveMarkdown(filePath, markdownView.value);
};

// We can't use an anonymous function here because we also gonna use it
// in the main process to save the file using the main menu
saveMarkdownButton.addEventListener('click', saveMarkDown);

// When we receive a message from any other process this function will be triggered
ipcRenderer.on('save-markdown', saveMarkDown);

const saveHtml = () => {
  mainProcess.saveHtml(htmlView.innerHTML);
};

saveHtmlButton.addEventListener('click', saveHtml);

ipcRenderer.on('save-html', saveHtml);

showFileButton.addEventListener('click', () => {
  if (!filePath) return alert('Nope!');

  shell.showItemInFolder(filePath);
});

openInDefaultButton.addEventListener('click', () => {
  if (!filePath) return alert('Nope!');

  shell.openPath(filePath).catch((err) => console.log(err));
});

// adding an event listener that will trigger when the 'file-opened' event is sent by the main process
ipcRenderer.on('file-opened', (event, file, content) => {
  filePath = file;
  originalContent = content;

  markdownView.value = content;
  renderMarkdownToHtml(content);

  updateUserInterface();
});

// Drag & Drop feature
document.addEventListener('dragstart', (event) => event.preventDefault());
document.addEventListener('dragover', (event) => event.preventDefault());
document.addEventListener('dragleave', (event) => event.preventDefault());
document.addEventListener('drop', (event) => event.preventDefault());

// Drag & Drop helper functions
const getDraggedFile = (event) => event.dataTransfer.items[0];
const getDroppedFile = (event) => event.dataTransfer.files[0];
const fileTypeIsSupported = (file) => {
  return ['text/plain', 'text/markdown'].includes(file.type);
};

markdownView.addEventListener('dragover', (event) => {
  const file = getDraggedFile(event);

  if (fileTypeIsSupported(file)) {
    markdownView.classList.add('drag-over');
  } else {
    markdownView.classList.add('drag-error');
  }
});

markdownView.addEventListener('dragleave', () => {
  markdownView.classList.remove('drag-over');
  markdownView.classList.remove('drag-error');
});

markdownView.addEventListener('drop', (event) => {
  const file = getDroppedFile(event);

  if (fileTypeIsSupported(file)) {
    mainProcess.openFile(file.path);
  } else {
    alert('That file type is not supported.');
  }

  markdownView.classList.remove('drag-over');
  markdownView.classList.remove('drag-error');
});
