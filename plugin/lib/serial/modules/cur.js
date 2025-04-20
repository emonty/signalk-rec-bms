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
    throw new Error(`[signalk-rec-bms - serial - cur] No configuration found for command tag "${tag}"`);
  }
  const commandStr = config.command || (tag + "?");
  const packet = hexer.buildPacket(targetAddress, Buffer.from(commandStr));
  return packet;
}

//parsers
function parseIOFFResponse(input) {
  const packet = Array.isArray(input) ? input[0] : input;
  if (!packet) {
    return null;
  }
  const payload = packet.slice(4, packet.length - 3).toString('utf8');
  const value = parseFloat(payload);
  const result = {
    type: "IOFF",
    data: { currentSensorOffset: value }
  };
  return result;
}

function parseIOJAResponse(input) {
  const packet = Array.isArray(input) ? input[0] : input;
  if (!packet) {
    return null;
  }
  const payload = packet.slice(4, packet.length - 3).toString('utf8');
  const value = parseFloat(payload);
  const result = {
    type: "IOJA",
    data: { currentSensorCoefficient: value }
  };
  return result;
}

//deltas
function getDelta(parsed, options, app) {
  let vesselId = (typeof app.getSelfId === 'function') ? app.getSelfId() : (app.selfId || "self");
  const context = `vessels.${vesselId}`;
  const prefix = options.deltaPrefix || "electrical.batteries.bms";
  
  let delta = null;
  switch (parsed.type) {
    case "IOFF": {
      const d = parsed.data;
      delta = {
        context,
        updates: [{
          timestamp: new Date().toISOString(),
          values: [
            { path: `${prefix}.currentSensorOffset`, value: d.currentSensorOffset }
          ]
        }]
      };
      break;
    }
    case "IOJA": {
      const d = parsed.data;
      delta = {
        context,
        updates: [{
          timestamp: new Date().toISOString(),
          values: [
            { path: `${prefix}.currentSensorCoefficient`, value: d.currentSensorCoefficient }
          ]
        }]
      };
      break;
    }
    default:
      break;
  }
  return delta;
}

module.exports = {
  buildCommand,
  getDelta,
  parseIOFFResponse,
  parseIOJAResponse
};
