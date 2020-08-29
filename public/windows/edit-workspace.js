const { BrowserWindow } = require('electron');
const path = require('path');

const { REACT_PATH, isDev } = require('../constants/paths');
const { getPreference } = require('../libs/preferences');

const mainWindow = require('./main');

let win;

const get = () => win;

const create = (id) => {
  const attachToMenubar = getPreference('attachToMenubar');

  global.editWorkspaceId = id;

  win = new BrowserWindow({
    width: 420,
    height: 700,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    autoHideMenuBar: false,
    webPreferences: {
      nodeIntegration: false,
      enableRemoteModule: true,
      webSecurity: !isDev,
      contextIsolation: true,
      preload: path.join(__dirname, '..', 'preload', 'edit-workspace.js'),
    },
    parent: attachToMenubar ? null : mainWindow.get(),
  });
  win.setMenuBarVisibility(false);

  win.loadURL(REACT_PATH);

  win.on('closed', () => {
    win = null;
    global.editWorkspaceId = null;
  });
};

const show = (id) => {
  if (win == null) {
    create(id);
  } else if (id !== global.editWorkspaceId) {
    win.close();
    create(id);
  } else {
    win.show();
  }
};

module.exports = {
  get,
  create,
  show,
};
