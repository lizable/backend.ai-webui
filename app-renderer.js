
const TabGroup = require("electron-tabs");
const { remote, ipcRenderer } = require('electron');
const url = require('url');
const path = require('path');
if (remote.process.env.serveMode === 'dev') {
  mainIndex = 'build/electron-app/app/index.html';
} else { // Production
  mainIndex = 'app/index.html';
}

if (remote.process.env.siteDescription !== '') {
  document.querySelector('#description').innerHTML = remote.process.env.siteDescription;
}

mainURL = url.format({
  pathname: path.join(mainIndex),
  protocol: 'file',
  slashes: true
});

let tabGroup = new TabGroup();
let openPageURL = '';
let defaultWebPreferences = "allowRunningInsecureContent=true,isBrowserView=false,javascript=true,nativeWindowOpen=true,webviewTag=true";

let mainAppTab = tabGroup.addTab({
    title: "Backend.AI",
    src: mainURL,
    visible: false,
    closable: false,
    active: true,
    webviewAttributes: {
      //nodeintegration: false,
      allowpopups: 'on',
      autosize: true,
      blinkfeatures: '',
      webpreferences: defaultWebPreferences
    }
});
mainAppTab.webview.addEventListener('page-title-updated', () => {
  const newTitle = mainAppTab.webview.getTitle();
  mainAppTab.setTitle(newTitle);
});

mainAppTab.on("webview-ready", (tab) =>{
  tab.show();
});

let mainView = mainAppTab.webview;
mainView.addEventListener('dom-ready', (e) =>{
  mainView.executeJavaScript('window.__local_proxy="'+window.__local_proxy+'";');
  mainView.openDevTools();
  let mainViewContents = mainView.getWebContents();
  mainView.addEventListener('will-navigate', ({url}) => {
    console.log('navigate to', url);
  });

  mainViewContents.on('new-window', (event, url, frameName, disposition, options) => {
    event.preventDefault();
    newTabWindow(event, url, frameName, disposition, options);
  });
});

function newTabWindow(event, url, frameName, disposition, options) {
  console.log('requested URL:', url);
  openPageURL = url;
  Object.assign(options, {
    title: "Loading...",
    frame: true,
    visible: false,
    backgroundColor: '#EFEFEF',
    closable: true,
    src: url,
    webviewAttributes: {
      //nodeintegration: false,
      allowpopups: true,
      autosize: true,
      //webviewTag: true,
      webpreferences: defaultWebPreferences
    },
    ready: loadURLonTab
  });
  if (frameName === 'modal') {
    options.modal = true;
  }
  let newTab = tabGroup.addTab(options);
  newTab.webview.addEventListener('page-title-updated', (e) => {
    const newTitle = e.target.getTitle();
    newTab.setTitle(newTitle);
  });
  newTab.on("webview-ready", (tab) =>{
    tab.show(true);
    console.log('webview ready', tab);
  });
  newTab.webview.addEventListener('dom-ready', (e) => {
    console.log("new tab", e);
    e.target.openDevTools();
    if (openPageURL !== '') {
      let newTabContents = e.target.getWebContents();
      //let newURL = openPageURL;
      //openPageURL = '';
      //e.target.loadURL(newURL);
      newTabContents.on('new-window', (event, url, frameName, disposition, options) => {
        event.preventDefault();
        newTabWindow(event, url, frameName, disposition, options);
      });
    }
  });
  return true;
}

function loadURLonTab(tab) {
  //console.log("tab opened:", tab);
}
function showSplash() {
  mainView.executeJavaScript('let event = new CustomEvent("backend-ai-show-splash", {"detail": ""});' +
   '    document.dispatchEvent(event);');
}
window.showSplash = showSplash;