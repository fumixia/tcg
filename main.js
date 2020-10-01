const { performance } = require('perf_hooks');
var md5 = require('md5');
const fs = require('fs');
const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fetch = require("node-fetch");
puppeteer.use(StealthPlugin());
const bodyParser = require('body-parser');
const { Server } = require('ws');
var createError = require('http-errors');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var app = express();
const redis = require("redis");
const client = redis.createClient();

client.on("error", function(error) {
  console.error(error);
});

var supreme = require('./routes/supreme');

var cookiejar = {};
var app = express();
var browser_pages = {};
var browsers = {};
var ipmap = {};
var filelist = [];

app.set('port', process.env.PORT || 443);
app.use(logger('dev'));
app.use(express.json({limit: '80mb', extended: true}));
app.use(cookieParser())
app.use(bodyParser.urlencoded({
    limit: '80mb',
    extended: true,
    parameterLimit: 1000000
}));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.enable('trust proxy');


app.listen(80,'92.119.16.42', () => {
  console.log(`dedicatedapp listening at http://92.119.16.42:7000`)
})

app.get('/iplogger', async function(req, res){
    ip = req.ip.split(':').pop();
    console.log(ip);
    res.send(ip);
    res.end();
})

app.get(/^\/ticket\/(.*)/, async function(req, res){
        filename = req.url.split('/').pop();
        res.sendFile(process.cwd()+`/ticketfiles/${filename}`);
    });

app.post('/ticketupload', async function(req, res){
        var goal = '';
        try{
            goal = Number(req.get('origin-ip').split(':').pop().replace(/\./g,''));
        }catch(e){
            goal = Number(req.ip.split(':').pop().replace(/\./g,''));
        };
        if(req.body.ticketfile == undefined){
            res.send('no file sent');
            res.end();
            return
        }
        var fileval = req.body.ticketfile.toString();

        if(!fileval.includes('set')){
            res.send('invalid ticket, still ok');
            res.end();
            return
        };
        var inpname = md5(fileval);
        res.send('success');
        res.end();
        var fname = '';
        for(file of filelist){
            if(file.includes(inpname)){
                fname = file;
                break;
            }else{
            }
        };
        if(fname.length > 0){
            try{
                if(!ipmap[fname.split('_')[0]].includes(goal)){
                    ipmap[fname.split('_')[0]].push(goal);
                    fetch('http://92.119.16.42:7000/map', {
                      method: 'POST', // *GET, POST, PUT, DELETE, etc.
                      headers: {
                        'fileversion':inpname,
                        'origin-ip': goal
                      },
                    });
                }
            }catch{
                ipmap[fname.split('_')[0]] = [];
                ipmap[fname.split('_')[0]].push(goal);
                fetch('http://92.119.16.42:7000/map', {
                  method: 'POST', // *GET, POST, PUT, DELETE, etc.
                  headers: {
                    'fileversion':inpname,
                    'origin-ip': goal
                  },
                });
            }
        }else{
            Object.keys(ipmap).forEach(key => {
                if(ipmap[key].includes(goal)){
                    ipmap[key].splice(ipmap[key].indexOf(goal),1);
                    if (ipmap[key].length == 0){
                        try{browsers[inpname].close()}catch(e){browsers[inpname].close()};
                    }
                };
            });
            fileval = fileval.replace(/(setTimeout\(.*?,)(.*?\)}\))/, "$1 0)})").toString();
            fileval = fileval.replace(/(\w\[0\]\[0\]=\w\[\d*?\]\[\d*?\]\[\S*?\].?\w\[\d*?\]\[\d*?\],)(\w\[\d\])\)/,'if($2.label == 4){while(true){$1 {"label":4,"trys":[],"ops":[]})}}; $1$2)').toString();
            fs.writeFile(process.cwd()+`/ticketfiles/${inpname}_ticket.js`, fileval, (err)=>{
                if(err){
                    res.send(err);
                    res.end()
                }
            });
        ipmap[inpname] = [];
        ipmap[inpname].push(goal);
        filelist.push(`${inpname}_ticket.js`)
        launchBrowser(inpname);
        fetch('http://92.119.16.42:7000/map', {
                  method: 'POST', // *GET, POST, PUT, DELETE, etc.
                  headers: {
                    'fileversion':inpname,
                    'origin-ip': goal
                  },
                });
        }
})

app.use('/supreme', supreme);

async function launchBrowser(file){
    browsers[file] = await puppeteer.launch({headless: true});
    browser_pages[file] = await browsers[file].newPage();
    await browser_pages[file].goto('http://92.119.16.42:80/supreme?version='+file+'_ticket.js', {waitUntil: 'load', timeout: 0});
    await browser_pages[file].evaluate((fileversion)=>{
        var ws = new WebSocket('ws://92.119.16.42:8082/');
        ws.onopen = (err)=>{
            var cookieDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') || Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'cookie');
            if (cookieDesc && cookieDesc.configurable) {
                Object.defineProperty(document, 'cookie', {
                    get: function () {
                        return cookieDesc.get.call(document);
                    },
                    set: function (val) {
                        ws.send(JSON.stringify({version: fileversion, vvv: cookieDesc.get.call(document).split("vvv=")[1].split(";")[0], ntbcc: val.split("ntbcc=")[1].split(";")[0]}))
                        cookieDesc.set.call(document, val)
                    },
                    configurable: true,
                });
            }
        }
    }, file);
}

const WSS_PORT = 8082;

(async () => {
  const wss = new Server({ port: WSS_PORT });

  wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(msg) {
      let {version, vvv, ntbcc } = JSON.parse(msg);
      client.set(version, JSON.stringify({'ntbcc': ntbcc, 'vvv': vvv}));
    });
  });

  client.on('error', (e) => console.error(e));
  wss.on('error', (e) => console.error(e));
})();

fs.readdir(process.cwd()+'/ticketfiles', function (error, list) {
    if (error) {
        return;
    }
    for(file of list){
        launchBrowser(file.split('_')[0]);
    }
});

filelist = fs.readdirSync(process.cwd()+'/ticketfiles');