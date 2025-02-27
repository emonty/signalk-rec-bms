module.exports = function(parsedData, prefix, config) {
  if (parsedData.type !== "settings") return [];

  const settings = parsedData;
  const values = []; 

  // derived data - NOT FROM BMS
  if (config.AhR) {
    const AhR = (parsedData.capa !== undefined && parsedData.Ah !== undefined)
      ? parsedData.capa - parsedData.Ah : null;
    values.push({ path: `${prefix}.ampHourRemaining`, value: AhR });
  }
  // data from WiFi module WebSocket under SETTINGS message
  if (config.cmin) {
    values.push({ path: `${prefix}.minCellVoltage`, value: parsedData.cmin });
  }
  if (config.cmax) {
    values.push({ path: `${prefix}.maxCellVoltage`, value: parsedData.cmax });
  }
  if (config.tmax) {
    values.push({ path: `${prefix}.maxAllowedCellTemp`, value: parsedData.tmax });
  }
  if (config.bvol) {
    values.push({ path: `${prefix}.balEndVoltage`, value: parsedData.bvol });
  }
  if (config.bmin) {
    values.push({ path: `${prefix}.balStartVoltage`, value: parsedData.bmin });
  }
  if (config.tbal) {
    values.push({ path: `${prefix}.maxAllowedBMSTemp`, value: parsedData.tbal });
  }
  if (config.tmin) {
    values.push({ path: `${prefix}.minAllowedCellTemp`, value: parsedData.tmin });
  }
  if (config.capa) {
    values.push({ path: `${prefix}.capacity`, value: parsedData.capa });
  }
  if (config.char) {
    values.push({ path: `${prefix}.endChargeVoltage`, value: parsedData.char });
  }
  if (config.ioff) {
    values.push({ path: `${prefix}.currentOffset`, value: parsedData.ioff });
  }
  if (config.chis) {
    values.push({ path: `${prefix}.endChargeHysteresis`, value: parsedData.chis });
  }
  if (config.razl) {
    values.push({ path: `${prefix}.maxAllowedCellVoltDiff`, value: parsedData.razl });
  }
  if (config.maxh) {
    values.push({ path: `${prefix}.maxAllowedVoltageHysteresis`, value: parsedData.maxh });
  }
  if (config.minh) {
    values.push({ path: `${prefix}.minAllowedVoltageHysteresis`, value: parsedData.minh });
  }
  if (config.bmth) {
    values.push({ path: `${prefix}.maxAllowedBMSTempHysteresis`, value: parsedData.bmth });
  }
  if (config.ioja) {
    values.push({ path: `${prefix}.currentSensorCoefficient`, value: parsedData.ioja });
  }
  if (config.soch) {
    values.push({ path: `${prefix}.soch`, value: parsedData.soch });
  }
  if (config.op2l) {
    values.push({ path: `${prefix}.opto2Low`, value: parsedData.op2l });
  }
  if (config.op2h) {
    values.push({ path: `${prefix}.opto2High`, value: parsedData.op2h });
  }
  if (config.re1l) {
    values.push({ path: `${prefix}.relay1Low`, value: parsedData.re1l });
  }
  if (config.re1h) {
    values.push({ path: `${prefix}.relay1High`, value: parsedData.re1h });
  }
  if (config.chac) {
    values.push({ path: `${prefix}.chargeCoefficient`, value: parsedData.chac });
  }
  if (config.dchc) {
    values.push({ path: `${prefix}.dischargeCoefficient`, value: parsedData.dchc });
  }
  if (config.maxc) {
    values.push({ path: `${prefix}.maxChargeCurrent`, value: parsedData.maxc });
  }
  if (config.maxd) {
    values.push({ path: `${prefix}.maxDischargeCurrent`, value: parsedData.maxd });
  }
  if (config.clow) {
    values.push({ path: `${prefix}.minDischargeCellVoltage`, value: parsedData.clow });
  }
  if (config.socs) {
    values.push({ path: `${prefix}.socs`, value: parsedData.socs });
  }
  if (config.cycl) {
    values.push({ path: `${prefix}.cycleCount`, value: parsedData.cycl });
  }
  if (config.cans) {
    values.push({ path: `${prefix}.canbusSetting`, value: parsedData.cans });
  }
  if (config.chem) {
    values.push({ path: `${prefix}.chemistry`, value: parsedData.chem });
  }
  if (config.strn) {
    values.push({ path: `${prefix}.numberOfInverterDevices`, value: parsedData.strn });
  }
  if (config.mcu_time) {
    values.push({ path: `${prefix}.mcuTime`, value: parsedData.mcu_time });
  }
  if (config.mcu_date) {
    values.push({ path: `${prefix}.mcuDate`, value: parsedData.mcu_date });
  }
  if (config.bms_name) {
    values.push({ path: `${prefix}.bmsName`, value: parsedData.bms_name });
  }
  if (config.addr) {
    values.push({ path: `${prefix}.address`, value: parsedData.addr });
  }
  if (config.tunit) {
    values.push({ path: `${prefix}.temperatureUnit`, value: parsedData.tunit });
  }
  if (config.Ah) {
    values.push({ path: `${prefix}.Ah`, value: parsedData.Ah });
  }
  //if (config.cur) {
  //  values.push({ path: `${prefix}.current2`, value: parsedData.cur });
  //}
  if (config.new_log_every_midnight) {
    values.push({ path: `${prefix}.newLogEveryMidnight`, value: parsedData.new_log_every_midnight });
  }
  if (config.out) {
    values.push({ path: `${prefix}.outputStatus`, value: parsedData.out });
  }
  if (parsedData.err && config.errorGroup) {
    Object.entries(parsedData.err).forEach(([childKey, childValue]) => {
      values.push({ path: `${prefix}.err.${childKey}`, value: childValue });
    });
  }
  if (parsedData.nnc && config.nncGroup) {
    Object.entries(parsedData.nnc).forEach(([childKey, childValue]) => {
      values.push({ path: `${prefix}.nnc.${childKey}`, value: childValue });
    });
  }
  if (parsedData.vnc && config.vncGroup) {
    Object.entries(parsedData.vnc).forEach(([childKey, childValue]) => {
      values.push({ path: `${prefix}.vnc.${childKey}`, value: childValue });
    });
  }
  if (parsedData.toor && config.toorGroup) {
    Object.entries(parsedData.toor).forEach(([childKey, childValue]) => {
      values.push({ path: `${prefix}.toor.${childKey}`, value: childValue });
    });
  }
  if (parsedData.baud && config.baudGroup) {
    Object.entries(parsedData.baud).forEach(([childKey, childValue]) => {
      values.push({ path: `${prefix}.${childKey}`, value: childValue });
    });
  }
  return values;
};
