window.clientFinder = null;
window.curClient = null;
window.keys = null;
window.wifiChecker = null;
window.autoDiscover = true;
window.keyRegister = true;
window.initDate = null;
window.dialogOpen = false;
window.demo = true;

const fs = require('fs');

// setting up custom dialog library
let vex = require('vex-js');
vex.registerPlugin(require('vex-dialog'));
vex.defaultOptions.className = 'vex-theme-os';

_LOG = function(data) {
    console.log(`[${new Date().toLocaleDateString()} - at ${new Date().toLocaleTimeString()}] : ${data}`);
}

let alertDemoExpired = () => {
    if( document.querySelector('.vex') == null ) {
        vex.dialog.alert({
            message: `YYour demo of Roku Controller has expired. If you'd like to use the full version of this app check out our site on aux1apps.com`
        });
    }
}

let alertSelectClient = () => {
    if( document.querySelector('.vex') == null ) {
        vex.dialog.alert({
            message: `You must first click and select a device in the column titled "My Devices"  before sending any commands.`
        });
    }
}

let alertInstructions = () => {
    vex.dialog.alert({
        message: `How to use the Roku Controller:`,
        input: `
        <span style="color:yellow;text-decoration:underline;">1)</span> Make sure you are connected to the same Wi-fi network your Roku(s) are connected to
        <br><span style="color:yellow;text-decoration:underline;">2)</span> Select the Roku device you want to control in the "My Devices" section (double-click to delete)
        <br><span style="color:yellow;text-decoration:underline;">3)</span> Click to buttons in the "Remote Control" section to send commands to your Roku
        <br><span style="color:red;text-decoration:underline;">TIP:</span> If you can't connect to your Roku try re-booting it or checking its connection in its network settings
        <br><span style="color:cyan;text-decoration:underline;">KEYS:</span>
        <br>
        <ul>
            <li>Arrow Keys: Up,Down,Left,Right</li>
            <li>ESC Key: Back</li>
            <li>ENTER Key: OK button</li>
            <li>Input dialogs in apps will receive all keys for text entry</li>
        </ul> `
    });
}

let alertEroor = (errorMessage) => {
    if( document.querySelector('.vex') == null ) {
        vex.dialog.alert({
            message: errorMessage
        });
    }
}

let createClient = (ipAddress) => {
    const { Client } = require('roku-client');
    return new Client(`http://${ipAddress}`);
}

let alertAddDevice = () => {
    window.dialogOpen = true;
    vex.dialog.confirm({
        message: `Add a roku by ip address (example: 192.168.1.24)`,
        input: `<input type="text" name="ipInput" required  pattern="^([0-9]{1,3}\.){3}[0-9]{1,3}$" />`,
        callback: function (data) {
            if( data.ipInput) {
                let ipAddress = data.ipInput;
                let client = createClient(ipAddress);
                addClient(client,true);
            }
            window.dialogOpen = false; 
        }
    });
}

let alertAppsSelector = () => {
    if( window.curClient !== null ) {
        function createRow() {
            let rows = document.createElement('div');
            rows.classList.add("rows");
            return rows;
        }

        function createSquare() {
            let square = document.createElement('div');
            square.classList.add("square");
            return square;
        }

        window.curClient.apps()
        .then(value => {
            window.dialogOpen = true;
            vex.dialog.alert({
                message:"Apps:",
                input:`<span style='font-size:0.5em;'>*Click to open</span><div id='appslist'><p>Loading apps from device host ${window.curClient.ip.split("http://")[1]}</p></div>`,
                callback:function(){
                    window.dialogOpen = false;
                }
            });
    
            // append apps items to vex dialog
            let applist = document.getElementById("appslist");
            applist.innerHTML = "";
           
            let containur = document.createElement('div');
            containur.classList.add("containur");
            applist.appendChild(containur);

           let rows = createRow();
           let apps = value;
           
           let c = 0;
           while(c < apps.length) {
               let curApp = apps[c];

               let square = createSquare();
               square.textContent = curApp.name;
               square.setAttribute('appid',curApp.id);
               square.style.backgroundImage = `url(${window.curClient.ip}/query/icon/${curApp.id})`;
               square.addEventListener("click",function(){
                   let appid = this.attributes["appid"].value;
                    window.curClient.launch(appid)
                    .then(function(){
                        _LOG(`Turning on app (${this.textContent}) on roku at ${window.curClient.ip}`);
                    })
                    .catch(function(error) {
                        _LOG(`Failed to turn on  app (${this.textContent}) on roku at ${window.curClient.ip} due to error`,error);
                    });
               });

               if(rows.querySelectorAll('.square').length >= 3 ) {
                    applist.querySelector('.containur').appendChild(rows);
                    applist.querySelector('.containur').appendChild(document.createElement('br'));
                    
                    rows = createRow();
                }

               rows.appendChild(square);

               if( c + 1 > apps.length ) {
                    applist.querySelector('.containur').appendChild(rows);
                    applist.querySelector('.containur').appendChild(document.createElement('br'));
               }
               c++;
            }
        })
        .catch( err => {
            let errMessage = `Failed to obtain apps list from roku at ${window.curClient.ip} due to error: ${err}`;
            _LOG(errMessage);
            alertEroor(errMessage);
        });
    }
    else {
        alertSelectClient();
    }
}

// where the roku clients will reside
let clients = new Array();

let addClient = function (newClient, manual = false) {
    let foundClient = clients.find( c => c && c.ip == newClient.ip )
    if( foundClient == undefined && clients.length < 5) {
        clients.push(newClient);
        _LOG(`new roku device found at ${newClient.ip}, adding to list`);

        let templateStatus =  document.querySelector('.list-group .template');
       templateStatus.textContent = `Connected Devices: ${clients.length}/5`;

        let $template =templateStatus.cloneNode();
        $template.textContent = `Roku @ ${newClient.ip.split("http://")[1]}`;
        $template.setAttribute('ip',newClient.ip);

        $template.addEventListener('click',(e) => {
            e.target.parentElement.querySelectorAll('li[ip]').forEach(item => {
                item.style.border = "";
            });
            e.target.style.border = "2px solid red";

            let ip = e.target.attributes.ip.value;
            window.curClient = clients.find(c => c && c.ip == ip);
        });

        $template.addEventListener("dblclick", (e) => {
            window.curClient = null;
            e.target.remove();
            clients = clients.filter(c =>  c.ip !== e.target.attributes.ip.value);
            if(clients.length >= 1) {
               templateStatus.textContent = `Connected Devices: ${clients.length}/5`;
            }
            else {
               templateStatus.textContent = "No Devices found.";
            }
        });

        document.querySelector('.list-group').appendChild($template); 
    }
    else {
        let logMessage = `Found roku device at ${newClient.ip.split("http://")[1]}, it already exists. Not adding to list.`;
        _LOG(logMessage);

        if( manual === true ) {
            alertEroor(logMessage);
        }
    }
};

let initRokuClientDiscoverer = function () {
    const { Client, keys } = require('roku-client');
    window.keys = keys;

    window.clientFinder = setInterval(() => {
        if( window.autoDiscover === true ) {
            Client.discoverAll(5000)
            .then((clients) => {
                clients && clients.forEach(client => {
                    addClient(client);
                });
            })
            .catch(err => {
                _LOG(`Client connection error: ${err}`);
            });        
        }
    }, 5000);
};

function initWifiChecker () {
    let wifiName = require('wifi-name');
    
    let statusText = document.querySelector('p[name="connection-status-text"]');
    let rippleAnim = document.querySelector(".lds-ripple");

    window.wifiChecker =  setInterval(() => {
        wifiName()
        .then(name => {
            _LOG(`Connected to wifi-network:  ${name}`);
            statusText.innerHTML = `Wifi-network: <span style="color:yellow;font-weight:bold;"> ${name}</span>`;
            rippleAnim.style.display = "block";
        })
        .catch(error => {
            _LOG(`Currently not connected to wi-fi network.`);
            statusText.innerHTML = `Your are not connected to internet`;
            rippleAnim.style.display = "none";
        });
    }, 5000);
}

let sendKeyPress = function(key) {
    window.curClient.keypress(key)
    .then(() => {
        _LOG(`Sent command "${key.command}" to ${window.curClient.ip}`);
    } )
    .catch((err) => {
        let errMessage = `Failed to send command due to error: ${err}`;
        _LOG(errMessage);

        // we only want to alert the error message if the current client is selected
        let errHost = err.stack.split("http://")[1].split("/")[0];
        if( window.curClient !== null && window.curClient.ip.split("http://")[1] == errHost ) {
            alertEroor(errMessage);
        }
    });
}

let checkBeforePress = function(key) {
    if( window.curClient !== null ) {
        sendKeyPress(key);
    }
    else {
        alertSelectClient();
    }
}

let buttonEventListener = function(e) {

    let value = e.target.attributes["name"].value;
    switch(value) {
        case "up":
            checkBeforePress(window.keys.UP);
            break;
        case "down":
            checkBeforePress(window.keys.DOWN);
            break;
        case "left":
            checkBeforePress(window.keys.LEFT);
            break;
        case "right":
            checkBeforePress(window.keys.RIGHT);
            break;
        case "ok":
            checkBeforePress(window.keys.SELECT);
            break;
        case "back":
            checkBeforePress(window.keys.BACK);
            break;
        case "power":
            checkBeforePress(window.keys.POWER);
            break;
        case "home":
            checkBeforePress(window.keys.HOME);
            break;
        case "pause/play":
            checkBeforePress(window.keys.PLAY);
            break;
        case "fastforward":
            checkBeforePress(window.keys.FORWARD);
            break;
        case "rewind":
            checkBeforePress(window.keys.REVERSE);
            break;
        case "options":
            checkBeforePress(window.keys.INFO);
            break;
        case "jumpback":
            checkBeforePress(window.keys.INSTANT_REPLAY);
            break;
        case "volup":
            checkBeforePress(window.keys.VOLUME_UP);
            break;
        case "voldown":
            checkBeforePress(window.keys.VOLUME_DOWN);
            break;
        case "mute":
            checkBeforePress(window.keys.VOLUME_MUTE);
            break;
        case "help":
            if( document.querySelector('.vex') == null ) {
                alertInstructions();
            }
            break;
        case "apps":
            if( document.querySelector('.vex') == null ) {
                alertAppsSelector();
            }
            break;
        case "add":
            if( document.querySelector('.vex') == null ) {
                alertAddDevice();
            }
            break;
        default:
            alert(value);
            break;
    }

}

let initClickEvents = function () {
    // applying click event listener to all buttons that do something
    document.querySelectorAll('div[name]').forEach(button => {
        button.addEventListener("click",buttonEventListener);
    });
};


let initAutoDiscover = function () {
    let autoDiscCheckBox = document.querySelector('input[name=autodiscover]');
    autoDiscCheckBox.addEventListener("change",function() {
        window.autoDiscover = this.checked;

        clearInterval(window.clientFinder);
        window.clientFinder = null;

        if ( window.autoDiscover === true ) {
            initRokuClientDiscoverer();
        }

        writeSettings();
    });

   autoDiscCheckBox.checked = window.autoDiscover;
}

let animateKeyRegLabel = function () {
    let keyRegLabel = document.querySelector('label[for="keyregister"]');
    keyRegLabel.style.color = "#f0f";
    setTimeout(() => {
        keyRegLabel.style.color = "#fff";
    }, 250);
}

let initKeyListeners = function () {
    window.addEventListener("keydown", (e) => {
        if( window.keyRegister == true  && window.dialogOpen == false ) {
            _LOG(`Key down -  keyCode:${e.keyCode}, keyChar:${e.key}`);
            
            animateKeyRegLabel();

            switch(e.keyCode) {
                case 37: // LEFT
                    if( window.keys !== null ) {
                        checkBeforePress(window.keys.LEFT);
                    }
                    break;
                case 38: // UP
                    if( window.keys !== null ) {
                        checkBeforePress(window.keys.UP);
                    }
                    break;
                case 39: // RIGHT
                    if( window.keys !== null ) {
                        checkBeforePress(window.keys.RIGHT);
                    }
                    break;
                case 40: // DOWN
                    if( window.keys !== null ) {
                        checkBeforePress(window.keys.DOWN);
                    }
                    break;
                case 8: //BACKSPACE
                    if( window.keys !== null ) {
                        checkBeforePress(window.keys.BACKSPACE);
                    }
                    break;
                case 27: // GOBACK
                    if( window.keys !== null ) {
                        checkBeforePress(window.keys.BACK);
                    }
                    break;
                case 13: // ENTER
                    if( window.keys !== null ) {
                        checkBeforePress(window.keys.SELECT);
                    }
                    break;
                case 91: // COMMAND BUTTON DO NOTHING
                    break;
                default: // OTHER KEYS
                    if( window.curClient !== null ) {
                        window.curClient.text(`${String.fromCharCode(e.keyCode)}`)
                            .then(() => {
                                _LOG(`Sent keycode ${e.keyCode} to roku at ${window.curClient.ip}`);
                            })
                            .catch(err => {
                                _LOG(`Failed to send keycode ${e.keyCode} to roku at ${window.curClient.ip} due to error ${err}`);
                            });
                    }
                    break;
            } 
        }
    });
}

let initKeyRegister = function () {
    let keyRegCheckBox = document.querySelector('input[name=keyregister]');
    keyRegCheckBox.addEventListener("change",function() {
        window.keyRegister = this.checked;
        writeSettings();
    });

    keyRegCheckBox.checked = window.keyRegister;

    initKeyListeners();
}

let generateSettings = function () {
    let settingsString = `
        { 
            "autoDiscover":"${ window.autoDiscover}",
            "keyRegister":"${window.keyRegister}" ,
            "initDate":"${Date()}"
        }`;
    return settingsString;
}

let writeSettings = function (settingsString = null) {
    if( settingsString == null ) {
        settingsString = generateSettings();
    }

    fs.writeFile(`${require('os').tmpdir()}/settings.json`, settingsString,'utf-8',function(error,data) {
        if( error ) {
            _LOG(`Failed to write settings file ${error}`);
        }
        else {
            _LOG("Settings file written successfully");
        }
    });
}

let loadSettings = function (settingsObj) {
    window.autoDiscover = ( settingsObj.autoDiscover == "true" );
    window.keyRegister = ( settingsObj.keyRegister == "true" );
    window.initDate = settingsObj.initDate;
}

let initSettings = function (_callback) {
    fs.readFile(`${require('os').tmpdir()}/settings.json`, (error, data) => {
        if (error){
            _LOG(error);
            _LOG("Failed to parse settings, generating settings file");
            let settings = generateSettings();
            writeSettings(settings);
        }
        else {
            _LOG('Settings exist parsing now.');
           let settings = JSON.parse(data);
           loadSettings(settings);
        }
        _callback();
    });
}


let treatAsUTC = function (date) {
    var result = new Date(date);
    result.setMinutes(result.getMinutes() - result.getTimezoneOffset());
    return result;
}

let daysBetween = function (startDate, endDate) {
    var millisecondsPerDay = 24 * 60 * 60 * 1000;
    return (treatAsUTC(endDate) - treatAsUTC(startDate)) / millisecondsPerDay;
}
let demoCheck = function () {
    if( window.demo == true ) {
        _LOG("This is the demo version, disabling non-demo features.");

        // disable key register and auto discover
        window.autoDiscover = false;
        window.keyRegister = false;

        // disable the checkboxes
        let names = ['keyregister','autodiscover'];
        names.forEach(name => {
            document.querySelector(`input[name="${name}"]`).disabled = true;
        });

        // disable apps button
        let appsButton =  document.querySelector('div[name=apps]');
        appsButton.classList.add('item-disabled');

        // if amount of days in demo expire we lock the app
        if( daysBetween(window.initDate, new Date()) >= 12 ) {
            alertDemoExpired();
            // disable click events
            let items = ['body','.vex'];
            items.forEach(item => {
                document.querySelector(item).style["pointer-events"] = "none";
            });
        }
    }
}

let onLoad = function () {
    initSettings(() => {
        initClickEvents();
        initAutoDiscover();
        initRokuClientDiscoverer();
        initKeyRegister();
        initWifiChecker();
        demoCheck();
    });
}

window.addEventListener("load", onLoad);