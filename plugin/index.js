"use strict";

const schema = require('./lib/schema');
const connection = require('./lib/connection');

module.exports = function(app) {
  let conn;
  let pluginOptions;
  let commsHandler;

  function publishDelta(delta) {
    let mergedConfig = {};
    if (pluginOptions && pluginOptions.deltas) {
      if (pluginOptions.deltas.common) {
        Object.assign(mergedConfig, pluginOptions.deltas.common);
      }
      if (pluginOptions.deltas.ws) {
        Object.assign(mergedConfig, pluginOptions.deltas.ws);
      }
      if (pluginOptions.deltas.serial) {
        Object.assign(mergedConfig, pluginOptions.deltas.serial);
      }
    }
  
    const precision = 5;
    const factor = Math.pow(10, precision);
  
    delta.updates.forEach(update => {
      update.values.forEach(item => {
        if (typeof item.value === "number") {
          item.value = Math.round(item.value * factor) / factor;
        }
      });
    });
  
    if (delta && delta.updates && delta.updates.some(u => u.values.length > 0)) {
      app.debug(`[INDEX] Publishing delta: ${JSON.stringify(delta)}`);
      app.handleMessage("signalk-rec-bms", delta, "v1");
    } else {
      app.debug("[INDEX] Delta empty after processing, not publishing.");
    }
  }
  
  var plugin = {
    id: "signalk-rec-bms",
    name: "SignalK-REC-BMS",
    description: "SignalK plugin for REC-BMS",
    schema: schema,
    start: function(options) {
      pluginOptions = options;
      app.debug(`[INDEX] START invoked with options: ${JSON.stringify(options)}`);
      app.setPluginStatus("Connecting to BMS…");
      conn = connection(options, app, publishDelta);
      conn.start(options);
    },
    stop: function() {
      if (conn) {
        conn.stop();
        conn = null;
      }
      app.debug("[INDEX] Plugin stopped");
      app.setPluginStatus("Stopped");
    },
  };

  return plugin;
};