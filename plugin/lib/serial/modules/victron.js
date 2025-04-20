"use strict";
const hexer = require('../hexer');
const atlas = require('../atlas.json'); // Load static configuration from atlas.json

// Build a mapping from command tag to configuration for quick lookup.
const atlasMapping = {};
atlas.forEach(entry => {
  atlasMapping[entry.tag] = entry;
});

//commands
function buildCommand(tag, targetAddress) {
  const config = atlasMapping[tag];
  if (!config) {
    throw new Error(`[signalk-rec-bms - serial - victron] No configuration found for command tag "${tag}"`);
  }
  const commandStr = config.command || (tag + "?");
  const packet = hexer.buildPacket(targetAddress, Buffer.from(commandStr));
  return packet;
}

//parsers
function parseCHACResponse(input) {
  const packet = Array.isArray(input) ? input[0] : input;
  if (!packet) {
    return null;
  }
  const payload = packet.slice(4, packet.length - 3).toString('utf8');
  const value = parseFloat(payload);
  const result = {
    type: "CHAC",
    data: { chargeCoefficient: value }
  };
  return result;
}

function parseDCHCResponse(input) {
  const packet = Array.isArray(input) ? input[0] : input;
  if (!packet) {
    return null;
  }
  const payload = packet.slice(4, packet.length - 3).toString('utf8');
  const value = parseFloat(payload);
  const result = {
    type: "DCHC",
    data: { dischargeCoefficient: value }
  };
  return result;
}

function parseSTRNResponse(input) {
  const packet = Array.isArray(input) ? input[0] : input;
  if (!packet) {
    return null;
  }
  const payload = packet.slice(4, packet.length - 3).toString('utf8');
  const value = parseInt(payload, 10);
  const result = {
    type: "STRN",
    data: { numberOfInverterDevices: value }
  };
  return result;
}

function parseMAXCResponse(input) {
  const packet = Array.isArray(input) ? input[0] : input;
  if (!packet) {
    return null;
  }
  const payload = packet.slice(4, packet.length - 3).toString('utf8');
  const value = parseFloat(payload);
  const result = {
    type: "MAXC",
    data: { maxChargeCurrent: value }
  };
  return result;
}

function parseMAXDResponse(input) {
  const packet = Array.isArray(input) ? input[0] : input;
  if (!packet) {
    return null;
  }
  const payload = packet.slice(4, packet.length - 3).toString('utf8');
  const value = parseFloat(payload);
  const result = {
    type: "MAXD",
    data: { maxDischargeCurrent: value }
  };
  return result;
}

function parseCLOWResponse(input) {
  const packet = Array.isArray(input) ? input[0] : input;
  if (!packet) {
    return null;
  }
  const payload = packet.slice(4, packet.length - 3).toString('utf8');
  const value = parseFloat(payload);
  const result = {
    type: "CLOW",
    data: { minDischargeCellVoltage: value }
  };
  return result;
}

// function parseCANFResponse(input) {
//   console.debug("[signalk-rec-bms - serial - victron] parseCANFResponse() called.");
//   const packet = Array.isArray(input) ? input[0] : input;
//   if (!packet) {
//     console.debug("[signalk-rec-bms - serial - victron] parseCANFResponse() found no valid packet, returning null.");
//     return null;
//   }
//   const payload = packet.slice(4, packet.length - 3).toString('utf8');
//   console.debug("[signalk-rec-bms - serial - victron] Raw payload for CANF:", payload);
//   const value = parseInt(payload, 10);
//   const result = {
//     type: "CANF",
//     data: { canBusSetting: value }
//   };
//   console.debug("[signalk-rec-bms - serial - victron] parseCANFResponse() returning result:", JSON.stringify(result));
//   return result;
// }

//deltas
function getDelta(parsed, options, app) {
  let vesselId = (typeof app.getSelfId === 'function') ? app.getSelfId() : (app.selfId || "self");
  const context = `vessels.${vesselId}`;
  const prefix = options.deltaPrefix || "electrical.batteries.bms";
  
  let delta = null;
  switch (parsed.type) {
    case "CHAC": {
      const d = parsed.data;
      delta = {
        context,
        updates: [{
          timestamp: new Date().toISOString(),
          values: [
            { path: `${prefix}.chargeCoefficient`, value: d.chargeCoefficient }
          ]
        }]
      };
      break;
    }
    case "DCHC": {
      const d = parsed.data;
      delta = {
        context,
        updates: [{
          timestamp: new Date().toISOString(),
          values: [
            { path: `${prefix}.dischargeCoefficient`, value: d.dischargeCoefficient }
          ]
        }]
      };
      break;
    }
    case "STRN": {
      const d = parsed.data;
      delta = {
        context,
        updates: [{
          timestamp: new Date().toISOString(),
          values: [
            { path: `${prefix}.numberOfInverterDevices`, value: d.numberOfInverterDevices }
          ]
        }]
      };
      break;
    }
    case "MAXC": {
      const d = parsed.data;
      delta = {
        context,
        updates: [{
          timestamp: new Date().toISOString(),
          values: [
            { path: `${prefix}.maxChargeCurrent`, value: d.maxChargeCurrent }
          ]
        }]
      };
      break;
    }
    case "MAXD": {
      const d = parsed.data;
      delta = {
        context,
        updates: [{
          timestamp: new Date().toISOString(),
          values: [
            { path: `${prefix}.maxDischargeCurrent`, value: d.maxDischargeCurrent }
          ]
        }]
      };
      break;
    }
    case "CLOW": {
      const d = parsed.data;
      delta = {
        context,
        updates: [{
          timestamp: new Date().toISOString(),
          values: [
            { path: `${prefix}.minDischargeCellVoltage`, value: d.minDischargeCellVoltage }
          ]
        }]
      };
      break;
    }
    // case "CANF": {
    //   const d = parsed.data;
    //   delta = {
    //     context,
    //     updates: [{
    //       timestamp: new Date().toISOString(),
    //       values: [
    //         { path: `${prefix}.canBusSetting`, value: d.canBusSetting }
    //       ]
    //     }]
    //   };
    //   break;
    // }
    
    default:
      break;
  }
  return delta;
}

module.exports = {
  buildCommand,
  getDelta,
  parseCHACResponse,
  parseDCHCResponse,
  parseSTRNResponse,
  parseMAXCResponse,
  parseMAXDResponse,
  parseCLOWResponse,
  //parseCANFResponse
};
