var tessel = require('tessel');
var climateLib = require('climate-si7005');
var wifi = require('wifi-cc3000');
var http = require('http');

// Config
var CLIMATE_PORT = 'A';
var TEMP_UNIT = 'F';
var FREQUENCY = 5 * 60 * 1000;
var MAX_STORAGE = 2048;

// In-memory storage (array of arrays with 0=time, 1=temp, 2=humidity)
var storage = [];


// Climate module

var climate = climateLib.use(tessel.port[CLIMATE_PORT]);

climate.on('ready', function () {
  console.log('Connected to climate module');

  // Loop forever
  setImmediate(function loop () {
    climate.readTemperature(TEMP_UNIT.toLowerCase(), function (err, temperature) {
      climate.readHumidity(function (err, humidity) {
        var currentTime = Date.now()

        storage.push([currentTime, temperature, humidity]);
        if (storage.length > MAX_STORAGE) {
          storage.shift();
        }

        console.log('Temperature:', temperature.toFixed(4) + TEMP_UNIT.toUpperCase(), 'Humidity:', humidity.toFixed(4) + '%RH');

        setTimeout(loop, FREQUENCY);
      });
    });
  });
});

climate.on('error', function(err) {
  console.log('Error connecting to climate module', err);
});


// Web server

function setupServer() {
  http.createServer(function(req, res) {
    if (req.method === 'GET' && req.url === '/') {
      console.log('Serving webpage');

      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.write('Time, Temperature (F), Humidity (%RH)\n');
      storage.forEach(function(data) {
        res.write(data[0] + ', ' + data[1].toFixed(2) + ', ' + data[2].toFixed(2) + '\n');
      });

      res.end();
    } else {
      console.log('Unknown webpage request');

      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.end('Not found\n');
    }
  }).listen(80);
}

if (wifi.isConnected()) {
  setupServer();
} else {
  wifi.on('connect', setupServer);
}
