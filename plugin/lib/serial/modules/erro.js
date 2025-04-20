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
    throw new Error(`[signalk-rec-bms - serial - erro] No configuration found for command tag "${tag}"`);
  }
  const commandStr = config.command || (tag + "?");
  const packet = hexer.buildPacket(targetAddress, Buffer.from(commandStr));
  return packet;
}

//parsers
function parseERRLResponse(input) {
  const packet = Array.isArray(input) ? input[0] : input;
  if (!packet) {
    return null;
  }
  const payload = packet.slice(4, packet.length - 3).toString('utf8');
  const result = {
    type: "ERRL",
    data: { errorLogData: payload }
  };
  return result;
}

function parseERLDResponse(input) {
  const packet = Array.isArray(input) ? input[0] : input;
  if (!packet) {
    return null;
  }
  const payload = packet.slice(4, packet.length - 3).toString('utf8');
  const value = parseInt(payload, 10);
  const result = {
    type: "ERLD",
    data: { errorLogDelete: value }
  };
  return result;
}

function parseVMAXResponse(input) {
  const packet = Array.isArray(input) ? input[0] : input;
  if (!packet) {
    return null;
  }
  const payload = packet.slice(4, packet.length - 3).toString('utf8');
  const value = parseInt(payload, 10);
  const result = {
    type: "VMAX",
    data: { vmaxExceededCount: value }
  };
  return result;
}

function parseVMINResponse(input) {
  const packet = Array.isArray(input) ? input[0] : input;
  if (!packet) {
    return null;
  }
  const payload = packet.slice(4, packet.length - 3).toString('utf8');
  const value = parseInt(payload, 10);
  const result = {
    type: "VMIN",
    data: { vminExceededCount: value }
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
    case "ERRL": {
      const d = parsed.data;
      delta = {
        context,
        updates: [{
          timestamp: new Date().toISOString(),
          values: [
            { path: `${prefix}.errorLogData`, value: d.errorLogData }
          ]
        }]
      };
      break;
    }
    case "ERLD": {
      const d = parsed.data;
      delta = {
        context,
        updates: [{
          timestamp: new Date().toISOString(),
          values: [
            { path: `${prefix}.errorLogDelete`, value: d.errorLogDelete }
          ]
        }]
      };
      break;
    }
    case "VMAX": {
      const d = parsed.data;
      delta = {
        context,
        updates: [{
          timestamp: new Date().toISOString(),
          values: [
            { path: `${prefix}.vmaxExceededCount`, value: d.vmaxExceededCount }
          ]
        }]
      };
      break;
    }
    case "VMIN": {
      const d = parsed.data;
      delta = {
        context,
        updates: [{
          timestamp: new Date().toISOString(),
          values: [
            { path: `${prefix}.vminExceededCount`, value: d.vminExceededCount }
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
  parseERRLResponse,
  parseERLDResponse,
  parseVMAXResponse,
  parseVMINResponse
};
