"use strict";

// Cache latest values across messages
let latestMaster = null;
let latestSettings = null;

module.exports = function(parsedData, prefix) {
  const values = [];

  // Update cache if master data is present
  if (parsedData?.bms_array?.master) {
    latestMaster = parsedData.bms_array.master;
  }

  // Update cache if settings data is present
  if (parsedData?.type === "settings") {
    latestSettings = parsedData;
  }

  // If we don't have both yet, don't compute anything
  if (!latestMaster || !latestSettings) return values;

  const master = latestMaster;
  const settings = latestSettings;

  // power = voltage * current
  if (typeof master.vbat === "number" && typeof master.ibat === "number") {
    values.push({
      path: `${prefix}.power`,
      value: master.vbat * master.ibat
    });
  }

  // cellVoltageDifference = max - min
  if (typeof master.maxcell === "number" && typeof master.mincell === "number") {
    values.push({
      path: `${prefix}.cellVoltageDifference`,
      value: master.maxcell - master.mincell
    });
  }

  // ampHourRemaining = capacity - ampHourUsed
  if (typeof settings.capa === "number" && typeof settings.Ah === "number") {
    values.push({
      path: `${prefix}.ampHourRemaining`,
      value: settings.capa - settings.Ah
    });
  }

  // timeToFull / timeToEmpty in seconds
  if (
    typeof settings.capa === "number" &&
    typeof settings.Ah === "number" &&
    typeof master.ibat === "number"
  ) {
    const capacity = settings.capa;
    const current = master.ibat;
    const soc = typeof master.soc === "number" ? master.soc : null;
    const remainingAh = (soc !== null) ? (soc / 100) * capacity : (capacity - settings.Ah);

    if (current > 0 && remainingAh < capacity) {
      const missingAh = capacity - remainingAh;
      const timeToFull = (missingAh / current) * 3600;
      values.push({ path: `${prefix}.timeToFull`, value: timeToFull });
      values.push({ path: `${prefix}.timeToEmpty`, value: 0 });
    } else if (current < 0 && remainingAh > 0) {
      const timeToEmpty = (remainingAh / Math.abs(current)) * 3600;
      values.push({ path: `${prefix}.timeToFull`, value: 0 });
      values.push({ path: `${prefix}.timeToEmpty`, value: timeToEmpty });
    } else {
      // idle or insufficient current
      values.push({ path: `${prefix}.timeToFull`, value: 0 });
      values.push({ path: `${prefix}.timeToEmpty`, value: 0 });
    }
  }

  return values;
};
