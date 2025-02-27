const WebSocket = require('ws');
const status = require('./status');
const settings = require('./settings');
const schema = require('./schema');

module.exports = function(app) {
  let ws;
  const initialReconnectInterval = 5000;
  let currentReconnectInterval = initialReconnectInterval;
  const heartbeatInterval = 10000;
  let pingInterval;
  let shouldReconnect = true;
  let heartbeatTimeout;

  var plugin = {
    id: "signalk-rec-bms",
    name: "SignalK-REC-BMS",
    description: "SignalK plugin for REC-BMS",
    schema: schema,
    start: function(options) {
      app.debug(`[signalk-rec-bms] (${new Date().toISOString()}) START function invoked with options: ${JSON.stringify(options)}`);
      app.setPluginStatus("Connecting to BMS WebSocket…");
      shouldReconnect = true;
      currentReconnectInterval = initialReconnectInterval;

      let vesselId = typeof app.getSelfId === "function" ? app.getSelfId() : app.selfId || "self";
      const context = `vessels.${vesselId}`;
      app.debug(`[signalk-rec-bms] (${new Date().toISOString()}) Using vessel context: ${context}`);

      const prefix = options.deltaPrefix || "electrical.batteries.bms";
      app.debug(`[signalk-rec-bms] (${new Date().toISOString()}) Using delta prefix: ${prefix}`);

      function resetHeartbeat() {
        clearTimeout(heartbeatTimeout);
        heartbeatTimeout = setTimeout(() => {
          app.debug("[signalk-rec-bms] Heartbeat timeout. Terminating connection.");
          if (ws) {
            ws.terminate();
          }
        }, heartbeatInterval);
      }

      function connect() {
        app.debug(`[signalk-rec-bms] (${new Date().toISOString()}) Attempting to connect to ${options.bmsUrl}`);
        ws = new WebSocket(options.bmsUrl);

        ws.on('open', () => {
          app.debug("[signalk-rec-bms] WebSocket connection opened");
          app.setPluginStatus("Connected to BMS - waiting for serial number");
          currentReconnectInterval = initialReconnectInterval;

          pingInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.ping();
              app.debug("[signalk-rec-bms] Sent ping");
            }
          }, heartbeatInterval);

          resetHeartbeat();
        });

        ws.on('pong', () => {
          app.debug("[signalk-rec-bms] Received pong");
        });

        ws.on('message', (data) => {
          resetHeartbeat();
          let message = data;

          if (typeof message !== 'string') {
            if (Buffer.isBuffer(message)) {
              message = message.toString();
            } else {
              app.debug("[signalk-rec-bms] Received payload is not a string or Buffer");
              return;
            }
          }

          app.debug(`[signalk-rec-bms] (${new Date().toISOString()}) Received message: ${message}`);

          try {
            const parsedData = JSON.parse(message);
            app.debug("[signalk-rec-bms] JSON parsed successfully");

            let delta = {
              context: context,
              updates: [{
                timestamp: new Date().toISOString(),
                values: []
              }]
            };

            if (parsedData.type === "status") {
              app.debug("[signalk-rec-bms] Processing STATUS message...");
              const statusValues = status(parsedData, prefix, options.statusDeltas) || [];
              delta.updates[0].values.push(...statusValues);
            }

            if (parsedData.type === "settings") {
              app.debug("[signalk-rec-bms] Processing SETTINGS message...");
              const settingsValues = settings(parsedData, prefix, options.settingsDeltas) || [];
              delta.updates[0].values.push(...settingsValues);

              if (parsedData.bms_name) {
                app.setPluginStatus(`Connected to BMS: ${parsedData.bms_name}`);
              }
            }

            delta.updates[0].values = delta.updates[0].values.filter(item => item.value !== null && item.value !== undefined);

            if (delta.updates[0].values.length > 0) {
              app.debug(`[signalk-rec-bms] (${new Date().toISOString()}) Sending delta: ${JSON.stringify(delta)}`);
              app.handleMessage(plugin.id, delta, 'v1');
            } else {
              app.debug("[signalk-rec-bms] No valid deltas to send.");
            }
          } catch (err) {
            app.error(`[signalk-rec-bms] Failed to parse JSON: ${err.message}`);
          }
        });

        ws.on('close', () => {
          app.debug("[signalk-rec-bms] WebSocket connection closed");
          app.setPluginStatus("BMS disconnected - ERROR");
          clearInterval(pingInterval);

          if (shouldReconnect) {
            app.debug(`[signalk-rec-bms] Reconnecting in ${currentReconnectInterval}ms`);
            setTimeout(connect, currentReconnectInterval);
            currentReconnectInterval = Math.min(currentReconnectInterval * 2, 60000);
          }
        });

        ws.on('error', (error) => {
          app.error(`[signalk-rec-bms] WebSocket error: ${error.message}`);
          app.setPluginStatus(`Error: ${error.message} - ERROR`);
          clearInterval(pingInterval);
          if (ws) {
            ws.terminate();
          }
          if (shouldReconnect) {
            app.debug(`[signalk-rec-bms] Reconnecting in ${currentReconnectInterval}ms due to error.`);
            setTimeout(connect, currentReconnectInterval);
            currentReconnectInterval = Math.min(currentReconnectInterval * 2, 60000);
          }
        });
      }

      connect();
    },

    stop: function() {
      shouldReconnect = false;
      clearInterval(pingInterval);
      if (ws) {
        ws.close();
        ws = null;
      }
      app.debug("[signalk-rec-bms] Plugin stopped");
      app.setPluginStatus("Stopped");
    }
  };

  return plugin;
};
