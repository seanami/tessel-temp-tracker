var tessel = require('tessel');
var climateLib = require('climate-si7005');
var wifi = require('wifi-cc3000');
var http = require('http');
var plotlyLib = require('plotly');

// Config
var CLIMATE_PORT = 'A';
var TEMP_UNIT = 'F';
var FREQUENCY = 5 * 60 * 1000;
var MAX_STORAGE = 2048;
var PLOTLY_USERNAME = '';
var PLOTLY_API_KEY = '';
var PLOTLY_FILENAME = 'Temperature and Humidity';

// In-memory storage (array of arrays with 0=time, 1=temp, 2=humidity)
var storage = [];

// Set up connection to plotly for graphing
var plotly = plotlyLib(PLOTLY_USERNAME, PLOTLY_API_KEY);


// Climate tracking and reporting

var climate = climateLib.use(tessel.port[CLIMATE_PORT]);

function getAndReportClimate() {
  climate.readTemperature(TEMP_UNIT.toLowerCase(), function (err, temperature) {
    climate.readHumidity(function (err, humidity) {
      var currentTime = Date.now();

      storage.push([currentTime, temperature, humidity]);
      if (storage.length > MAX_STORAGE) {
        storage.shift();
      }

      console.log('Temperature:', temperature.toFixed(4) + TEMP_UNIT.toUpperCase(), 'Humidity:', humidity.toFixed(4) + '%RH');

      var traceTemperature = {
        x: [currentTime],
        y: [temperature],
        type: 'scatter',
      };

      var traceHumidity = {
        x: [currentTime],
        y: [humidity],
        type: 'scatter',
      };

      var graphOptions = {
        filename: PLOTLY_FILENAME,
        fileopt: 'extend',
      };

      plotly.plot([traceTemperature, traceHumidity], graphOptions, function(err) {
        if (err) {
          console.log('Error logging data to Plotly');
        }

        setTimeout(getAndReportClimate, Math.max(0, FREQUENCY - Date.now() + currentTime));
      });
    });
  });
};

climate.on('ready', function () {
  console.log('Connected to climate module');
  ensureWifi(getAndReportClimate);
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

ensureWifi(setupServer);


// Wifi helper

function ensureWifi(callback) {
  if (wifi.isConnected()) {
    setImmediate(callback);
  } else {
    wifi.on('connect', callback);
  }
}
