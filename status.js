module.exports = function(parsedData, prefix, config) {
  const values = [];
  if (!parsedData.bms_array || !parsedData.bms_array.master) return values;

  const master = parsedData.bms_array.master;

  // convert time into seconds
  function extractMinutes(timeString) {
    if (!timeString) return null;
    const match = timeString.match(/(\d+)\s*h\s*(\d+)?\s*min/);
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = match[2] ? parseInt(match[2], 10) : 0;
      return hours * 60 + minutes;
    }
    return null;
  }

  // derived data - NOT FROM BMS
  if (config.wbat) {
    const power = (master.vbat !== undefined && master.ibat !== undefined)
      ? master.vbat * master.ibat : null;
    values.push({ path: `${prefix}.power`, value: power });
  }
  
  // data from WiFi module WebSocket under SETTINGS message 
  if (config.mincell) {
    values.push({ path: `${prefix}.minCellVoltage`, value: master.mincell });
  }
  if (config.maxcell) {
    values.push({ path: `${prefix}.maxCellVoltage`, value: master.maxcell });
  }
  if (config.cvd) {
    values.push({ path: `${prefix}.cellVoltageDifference`, value: master.maxcell - master.mincell });
  }
  if (config.ibat) {
    values.push({ path: `${prefix}.current`, value: master.ibat });
  }
  if (config.tmax) {
    values.push({ path: `${prefix}.temperature`, value: master.tmax });
  }
  if (config.vbat) {
    values.push({ path: `${prefix}.voltage`, value: master.vbat });
  }
  if (config.soc) {
    values.push({ path: `${prefix}.stateOfCharge`, value: master.soc });
  }
  if (config.soh) {
    values.push({ path: `${prefix}.stateOfHealth`, value: master.soh });
  }
  if (config.time_remaining) {
    values.push({ path: `${prefix}.timeRemaining`, value: extractMinutes(master.time_remaining) });
  }
  if (config.st_naprav) {
    values.push({ path: `${prefix}.chargeDirection`, value: master.st_naprav });
  }
  if (master.erro) {
    if (config.erro_present) {
      values.push({ path: `${prefix}.errorPresent`, value: master.erro.present });
    }
    if (config.erro_addr) {
      values.push({ path: `${prefix}.errorAddress`, value: master.erro.addr });
    }
    if (config.erro_st) {
      values.push({ path: `${prefix}.errorStatus`, value: master.erro.st });
    }
    if (config.erro_con_st) {
      values.push({ path: `${prefix}.errorConnection`, value: master.erro.con_st });
    }
  }
  if (config.error) {
    values.push({ path: `${prefix}.errorMessage`, value: master.error });
  }
  if (config.mcu_time) {
    values.push({ path: `${prefix}.mcuTime`, value: master.time });
  }
  if (config.mcu_date) {
    values.push({ path: `${prefix}.mcuDate`, value: master.date });
  }
  if (parsedData.bms_array.slave && parsedData.bms_array.slave["0"]) {
    const slave = parsedData.bms_array.slave["0"];

    if (config.slaveAddress) {
      values.push({ path: `${prefix}.slaveAddress`, value: slave.address });
    }
    if (config.st_temp) {
      values.push({ path: `${prefix}.slaveTempSensorStatus`, value: slave.st_temp });
    }
    if (config.temp_bms) {
      values.push({ path: `${prefix}.bmsTemperature`, value: slave.temp_bms });
    }
    if (config.st_celic) {
      values.push({ path: `${prefix}.slaveCellCount`, value: slave.st_celic });
    }
    if (config.temp) {
      Object.entries(slave.temp || {}).forEach(([key, value], index) => {
        values.push({ path: `${prefix}.cellTemperature${index + 1}`, value });
      });
    }
    if (config.res) {
      Object.entries(slave.res || {}).forEach(([key, value], index) => {
        values.push({ path: `${prefix}.cellResistance${index + 1}`, value });
      });
    }
    if (config.nap) {
      Object.entries(slave.nap || {}).forEach(([key, value], index) => {
        values.push({ path: `${prefix}.cellVoltage${index + 1}`, value });
      });
    }
  }
  return values;
};
