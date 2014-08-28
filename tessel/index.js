var tessel = require('tessel');
var climateLib = require('climate-si7005');

// Config
var CLIMATE_PORT = 'A';
var FREQUENCY = 1000;
var TEMP_UNIT = 'f';

// Set up climate module
var climate = climateLib.use(tessel.port[CLIMATE_PORT]);

climate.on('ready', function () {
  console.log('Connected to climate module');

  // Loop forever
  setImmediate(function loop () {
    climate.readTemperature(TEMP_UNIT, function (err, temp) {
      climate.readHumidity(function (err, humid) {
        console.log('Degrees:', temp.toFixed(4) + TEMP_UNIT.toUpperCase(), 'Humidity:', humid.toFixed(4) + '%RH');
        setTimeout(loop, FREQUENCY);
      });
    });
  });
});

climate.on('error', function(err) {
  console.log('Error connecting to climate module', err);
});
