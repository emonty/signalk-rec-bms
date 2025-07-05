"use strict";

module.exports = function(parsedData, prefix, config) {
  const values = [];
  if (!parsedData.bms_array || !parsedData.bms_array.master) {
    return values;
  }

  const master = parsedData.bms_array.master;
  const slave = parsedData.bms_array.slave["0"];
  // Helper function to convert time into minutes.
  function extractMinutes(timeString) {
    if (!timeString) {
      return null;
    }
    const match = timeString.match(/(\d+)\s*h\s*(\d+)?\s*min/);
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = match[2] ? parseInt(match[2], 10) : 0;
      const total = hours * 60 + minutes;
      return total;
    }
    return null;
  }

  // Data from WiFi module WebSocket under SETTINGS message 
  values.push({ path: `${prefix}.date`, value: master.date });
  values.push({ path: `${prefix}.time`, value: master.time });
  //values.push({ path: `${prefix}.cellVoltageDifference`, value: master.maxcell - master.mincell });
  values.push({ path: `${prefix}.current`, value: master.ibat });
  values.push({ path: `${prefix}.errorAddress`, value: master.erro.addr });
  values.push({ path: `${prefix}.errorConnectionState`, value: master.erro.con_st });
  values.push({ path: `${prefix}.errorMessage`, value: master.error });
  values.push({ path: `${prefix}.errorPresent`, value: master.erro.present });
  values.push({ path: `${prefix}.errorStatus`, value: master.erro.st });
  values.push({ path: `${prefix}.maxCellVoltage`, value: master.maxcell });
  values.push({ path: `${prefix}.minCellVoltage`, value: master.mincell });
  values.push({ path: `${prefix}.stateOfCharge`, value: master.soc });
  values.push({ path: `${prefix}.stateOfHealth`, value: master.soh });
  //values.push({ path: `${prefix}.timeRemaining`, value: extractMinutes(master.time_remaining) });
  values.push({ path: `${prefix}.voltage`, value: master.vbat });
  values.push({ path: `${prefix}.bmsTemperature`, value: slave.temp_bms });
  values.push({ path: `${prefix}.slaveAddress`, value: slave.address });
  values.push({ path: `${prefix}.slaveCellCount`, value: slave.st_celic });
  values.push({ path: `${prefix}.slaveTempSensorStatus`, value: slave.st_temp });
  // Process temperature entries.
  Object.entries(slave.temp || {}).forEach(([key, value], index) => {
    values.push({ path: `${prefix}.cellTemperature${index + 1}`, value });
  });
  // Process resistance entries.
  Object.entries(slave.res || {}).forEach(([key, value], index) => {
    values.push({ path: `${prefix}.cellResistance${index + 1}`, value });
  });
  // Process voltage entries.
  Object.entries(slave.nap || {}).forEach(([key, value], index) => {
    values.push({ path: `${prefix}.cellVoltage${index + 1}`, value });
  });
  return values;
};
