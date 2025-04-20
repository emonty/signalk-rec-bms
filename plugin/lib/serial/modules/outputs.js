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
    throw new Error(`[signalk-rec-bms - serial - outputs] No configuration found for command tag "${tag}"`);
  }
  const commandStr = config.command || (tag + "?");
  const packet = hexer.buildPacket(targetAddress, Buffer.from(commandStr));
  return packet;
}

//parsers
function parseRE1Response(input) {
  const packet = Array.isArray(input) ? input[0] : input;
  if (!packet) {
    return null;
  }
  const payload = packet.slice(4, packet.length - 3).toString('utf8');
  const value = parseFloat(payload);
  const result = {
    type: "RE1L",
    data: { relay1Voltage: value }
  };
  return result;
}

function parseRE1HResponse(input) {
  const packet = Array.isArray(input) ? input[0] : input;
  if (!packet) {
    return null;
  }
  const payload = packet.slice(4, packet.length - 3).toString('utf8');
  const value = parseFloat(payload);
  const result = {
    type: "RE1H",
    data: { relay1Hysteresis: value }
  };
  return result;
}

function parseOP2Response(input) {
  const packet = Array.isArray(input) ? input[0] : input;
  if (!packet) {
    return null;
  }
  const payload = packet.slice(4, packet.length - 3).toString('utf8');
  const value = parseFloat(payload);
  const result = {
    type: "OP2L",
    data: { opto2Voltage: value }
  };
  return result;
}

function parseOP2HResponse(input) {
  const packet = Array.isArray(input) ? input[0] : input;
  if (!packet) {
    return null;
  }
  const payload = packet.slice(4, packet.length - 3).toString('utf8');
  const value = parseFloat(payload);
  const result = {
    type: "OP2H",
    data: { opto2Hysteresis: value }
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
    case "RE1L": {
      const d = parsed.data;
      delta = {
        context,
        updates: [{
          timestamp: new Date().toISOString(),
          values: [
            { path: `${prefix}.relay1Voltage`, value: d.relay1Voltage }
          ]
        }]
      };
      break;
    }
    case "RE1H": {
      const d = parsed.data;
      delta = {
        context,
        updates: [{
          timestamp: new Date().toISOString(),
          values: [
            { path: `${prefix}.relay1Hysteresis`, value: d.relay1Hysteresis }
          ]
        }]
      };
      break;
    }
    case "OP2L": {
      const d = parsed.data;
      delta = {
        context,
        updates: [{
          timestamp: new Date().toISOString(),
          values: [
            { path: `${prefix}.opto2Voltage`, value: d.opto2Voltage }
          ]
        }]
      };
      break;
    }
    case "OP2H": {
      const d = parsed.data;
      delta = {
        context,
        updates: [{
          timestamp: new Date().toISOString(),
          values: [
            { path: `${prefix}.opto2Hysteresis`, value: d.opto2Hysteresis }
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
  parseRE1Response,
  parseRE1HResponse,
  parseOP2Response,
  parseOP2HResponse
};
