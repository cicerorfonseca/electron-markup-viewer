// the require does not exist in the browser
// we can use it here because we have access to all the browser apis and also all the node
const marked = require('marked');
const remote = require('@electron/remote');
const { ipcRenderer } = require('electron');
const mainProcess = remote.require('./main.js');

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

markdownView.addEventListener('keyup', (event) => {
  const currentContent = event.target.value;
  renderMarkdownToHtml(currentContent);
});

// How to trigger the getFileFromUser method from the main process?
// using the "remote" Electron proxy to the main process
// remote = require('electron').remote
// it will read the 'main process' and not the 'main.js' file
openFileButton.addEventListener('click', () => {
  mainProcess.getFileFromUser();
});

// adding an event listener that will trigger when the 'file-opened' event is sent by the main process
ipcRenderer.on('file-opened', (event, file, content) => {
  markdownView.value = content;
  renderMarkdownToHtml(content);
});
