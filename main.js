const { app, BrowserWindow, Menu } = require('electron')
const { dialog } = require('electron');
const os = require('os');

function createWindow () {
  let height = ( os.platform() == "darwin" ) ? 600 : 660;

  let win = new BrowserWindow({
    width: 800,
    minWidth:800,
    maxWidth:800,
    height: height,
    minHeight:height,
    maxHeight:height,
    webPreferences: {
      nodeIntegration: true,
      devTools:false
    },
    fullscreenable:false,
    fullscreen: false,
  })

  const template = [
    {
      role:"about",
      submenu: [
        {
          label:"About",
          click: function() {
            dialog.showMessageBoxSync(win,{
              "title":"About",
              "message":"This is an app that allows users to control their Roku from their computer. Developed by Nate P."
            });
          }
        }
      ]
    },
  //   {
  //     label: 'View',
  //     submenu: [
  //       { role: 'reload' },
  //       { role: 'forcereload' },
  //       { role: 'toggledevtools' },
  //       { type: 'separator' },
  //       { role: 'resetzoom' },
  //       { role: 'zoomin' },
  //       { role: 'zoomout' },
  //       { type: 'separator' },
  //       { role: 'togglefullscreen' }
  //     ],
  //   },{
  //   label: 'Edit',
  //   submenu: [
  //     { role: 'copy' },
  //     { role: 'paste' },
  //     { role: 'cut' }
  //   ]
  // }
  ];
  
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  win.loadFile('index.html')
}

app.whenReady().then(createWindow)