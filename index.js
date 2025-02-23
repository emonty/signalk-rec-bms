const WebSocket = require('ws');

module.exports = function(app) {
  let ws;
  const initialReconnectInterval = 5000; // 5 seconds
  let currentReconnectInterval = initialReconnectInterval;
  const heartbeatInterval = 5000; // 5 seconds
  let pingInterval;
  let shouldReconnect = true;

  var plugin = {
    id: "signalk-rec-bms",
    name: "REC BMS Plugin",
    description: "SignalK plugin for REC-BMS",
    schema: {
      type: "object",
      properties: {
        bmsUrl: {
          title: "BMS WebSocket URL",
          type: "string",
          default: "ws://bms-ip/ws"
        },
        deltaPrefix: {
          title: "Delta",
          type: "string",
          default: "electrical.batteries.bms"
        }
      }
    },
    start: function(options) {
      app.debug("REC BMS Plugin: START function invoked with options " + JSON.stringify(options));
      app.setPluginStatus("Connecting to BMS WebSocket…");
      shouldReconnect = true;
      currentReconnectInterval = initialReconnectInterval;

      // Determine the vessel ID (use app.getSelfId if available, otherwise app.selfId or fallback to "self")
      let vesselId;
      if (typeof app.getSelfId === "function") {
        vesselId = app.getSelfId();
      } else if (app.selfId) {
        vesselId = app.selfId;
      } else {
        vesselId = "self";
      }
      const context = "vessels." + vesselId;
      app.debug("REC BMS Plugin: Using vessel context: " + context);

      // Get the user-defined delta prefix (or default if not provided)
      const prefix = options.deltaPrefix || "electrical.batteries.bms";
      app.debug("REC BMS Plugin: Using delta prefix: " + prefix);

      // Function to (re)connect.
      function connect() {
        app.debug("REC BMS Plugin: Attempting to connect to " + options.bmsUrl);
        ws = new WebSocket(options.bmsUrl);

        ws.on('open', () => {
          app.debug("REC BMS Plugin: WebSocket connection opened");
          app.setPluginStatus("Connected to BMS");
          // Reset reconnection interval on successful connection.
          currentReconnectInterval = initialReconnectInterval;
          // Start the ping interval for heartbeat.
          pingInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.ping();
              app.debug("REC BMS Plugin: Sent ping");
            }
          }, heartbeatInterval);
        });

        ws.on('pong', () => {
          app.debug("REC BMS Plugin: Received pong");
        });

        ws.on('message', (data) => {
          let message = data;
          if (typeof message !== 'string') {
            if (Buffer.isBuffer(message)) {
              message = message.toString();
            } else {
              app.debug("REC BMS Plugin: Received payload is not a string or Buffer");
              return;
            }
          }
          app.debug("REC BMS Plugin: Received message: " + message);

          try {
            const parsedData = JSON.parse(message);
            app.debug("REC BMS Plugin: JSON parsed successfully");

            // Build the delta update with proper context and timestamp.
            let delta = {
              context: context,
              updates: [{
                timestamp: new Date().toISOString(),
                values: []
              }]
            };

            // Helper: Convert time strings like "1 h 15 min" into minutes.
            function extractMinutes(timeString) {
              if (!timeString) return null;
              let match = timeString.match(/(\d+)\s*h\s*(\d+)?\s*min/);
              if (match) {
                let hours = parseInt(match[1], 10);
                let minutes = match[2] ? parseInt(match[2], 10) : 0;
                return hours * 60 + minutes;
              }
              return null;
            }

            // Process "status" messages.
            if (parsedData.type === "status" && parsedData.bms_array) {
              let master = parsedData.bms_array.master;
              let power = (master.vbat !== undefined && master.ibat !== undefined)
                ? master.vbat * master.ibat : null;
              let cellVoltageDifference = master.maxcell - master.mincell;

              delta.updates[0].values.push(
                { path: `${prefix}.MinCellVoltage`, value: master.mincell },
                { path: `${prefix}.MaxCellVoltage`, value: master.maxcell },
                { path: `${prefix}.CellVoltageDifference`, value: cellVoltageDifference },
                { path: `${prefix}.Current`, value: master.ibat },
                { path: `${prefix}.Temperature`, value: master.tmax },
                { path: `${prefix}.Voltage`, value: master.vbat },
                { path: `${prefix}.StateOfCharge`, value: master.soc },
                { path: `${prefix}.StateOfHealth`, value: master.soh },
                { path: `${prefix}.TimeRemaining`, value: extractMinutes(master.time_remaining) },
                { path: `${prefix}.ChargeDirection`, value: master.st_naprav },
                { path: `${prefix}.ErrorPresent`, value: master.erro.present },
                { path: `${prefix}.ErrorAddress`, value: master.erro.addr },
                { path: `${prefix}.ErrorStatus`, value: master.erro.st },
                { path: `${prefix}.ErrorConnection`, value: master.erro.con_st },
                { path: `${prefix}.ErrorMessage`, value: master.error },
                { path: `${prefix}.Power`, value: power },
                { path: `${prefix}.MasterTime`, value: master.time },
                { path: `${prefix}.MasterDate`, value: master.date }
              );

              if (parsedData.bms_array.slave) {
                let slave = parsedData.bms_array.slave["0"];
                if (slave) {
                  delta.updates[0].values.push(
                    { path: `${prefix}.SlaveAddress`, value: slave.address },
                    { path: `${prefix}.SlaveTempSensorStatus`, value: slave.st_temp },
                    { path: `${prefix}.BMSTemperature`, value: slave.temp_bms },
                    { path: `${prefix}.SlaveCellCount`, value: slave.st_celic }
                  );

                  Object.entries(slave.temp || {}).forEach(([key, value], index) => {
                    delta.updates[0].values.push({
                      path: `${prefix}.CellTemperature${index + 1}`,
                      value
                    });
                  });

                  Object.entries(slave.res || {}).forEach(([key, value], index) => {
                    delta.updates[0].values.push({
                      path: `${prefix}.CellResistance${index + 1}`,
                      value
                    });
                  });

                  Object.entries(slave.nap || {}).forEach(([key, value], index) => {
                    delta.updates[0].values.push({
                      path: `${prefix}.CellVoltage${index + 1}`,
                      value
                    });
                  });
                }
              }
            }

            // Process "settings" messages.
            if (parsedData.type === "settings") {
              let AhRemaining = (parsedData.capa !== undefined && parsedData.Ah !== undefined)
                ? parsedData.capa - parsedData.Ah : null;
              let maxChargeVoltage = (parsedData.cmax !== undefined && parsedData.cans !== undefined)
                ? parsedData.cmax * parsedData.cans : null;

              delta.updates[0].values.push(
                { path: `${prefix}.MinVoltageThreshold`, value: parsedData.cmin },
                { path: `${prefix}.MaxVoltageThreshold`, value: parsedData.cmax },
                { path: `${prefix}.Tmax`, value: parsedData.tmax },
                { path: `${prefix}.BVoltage`, value: parsedData.bvol },
                { path: `${prefix}.BMinVoltage`, value: parsedData.bmin },
                { path: `${prefix}.TBalance`, value: parsedData.tbal },
                { path: `${prefix}.Tmin`, value: parsedData.tmin },
                { path: `${prefix}.Capacity`, value: parsedData.capa },
                { path: `${prefix}.ChargeVoltage`, value: parsedData.char },
                { path: `${prefix}.Ioff`, value: parsedData.ioff },
                { path: `${prefix}.ChargeHysteresis`, value: parsedData.chis },
                { path: `${prefix}.VoltageDiffThreshold`, value: parsedData.razl },
                { path: `${prefix}.MaxH`, value: parsedData.maxh },
                { path: `${prefix}.MinH`, value: parsedData.minh },
                { path: `${prefix}.BMSThreshold`, value: parsedData.bmth },
                { path: `${prefix}.Ioja`, value: parsedData.ioja },
                { path: `${prefix}.Soch`, value: parsedData.soch },
                { path: `${prefix}.Op2L`, value: parsedData.op2l },
                { path: `${prefix}.Op2H`, value: parsedData.op2h },
                { path: `${prefix}.Re1L`, value: parsedData.re1l },
                { path: `${prefix}.Re1H`, value: parsedData.re1h },
                { path: `${prefix}.ChargeMode`, value: parsedData.chac },
                { path: `${prefix}.DischargeMode`, value: parsedData.dchc },
                { path: `${prefix}.MaxChargeCurrent`, value: parsedData.maxc },
                { path: `${prefix}.MaxDischargeCurrent`, value: parsedData.maxd },
                { path: `${prefix}.LowVoltageCutoff`, value: parsedData.clow },
                //{ path: `${prefix}.StateOfChargeS`, value: parsedData.socs },
                { path: `${prefix}.CycleCount`, value: parsedData.cycl },
                { path: `${prefix}.Cans`, value: parsedData.cans },
                { path: `${prefix}.Chemistry`, value: parsedData.chem },
                { path: `${prefix}.Strn`, value: parsedData.strn },
                { path: `${prefix}.Re1T`, value: parsedData.re1t },
                { path: `${prefix}.Op2T`, value: parsedData.op2t },
                { path: `${prefix}.Re1V`, value: parsedData.re1v },
                { path: `${prefix}.Op2V`, value: parsedData.op2v },
                { path: `${prefix}.Cfvc`, value: parsedData.cfvc },
                { path: `${prefix}.Rsbr`, value: parsedData.rsbr },
                { path: `${prefix}.BMSClockTime`, value: parsedData.mcu_time },
                { path: `${prefix}.BMSClockDate`, value: parsedData.mcu_date },
                { path: `${prefix}.BMSName`, value: parsedData.bms_name },
                { path: `${prefix}.Address`, value: parsedData.addr },
                { path: `${prefix}.TUnit`, value: parsedData.tunit },
                { path: `${prefix}.AhUsed`, value: parsedData.Ah },
                { path: `${prefix}.Current`, value: parsedData.cur },
                { path: `${prefix}.NewLogEveryMidnight`, value: parsedData.new_log_every_midnight },
                { path: `${prefix}.Out`, value: parsedData.out },
                { path: `${prefix}.AhRemaining`, value: AhRemaining },
                { path: `${prefix}.MaxChargeVoltage`, value: maxChargeVoltage }
              );

              if (parsedData.baud) {
                delta.updates[0].values.push(
                  { path: `${prefix}.LcdBaudRate`, value: parsedData.baud.lcd },
                  { path: `${prefix}.ComBaudRate`, value: parsedData.baud.com }
                );
              }

              if (parsedData.err) {
                delta.updates[0].values.push(
                  { path: `${prefix}.ErrorPresenceFlag`, value: parsedData.err.p },
                  { path: `${prefix}.ErrorNumber`, value: parsedData.err.num }
                );
              }

              if (parsedData.nnc) {
                delta.updates[0].values.push(
                  { path: `${prefix}.NearestNeighborBMS`, value: parsedData.nnc.bms },
                  { path: `${prefix}.NearestNeighborCell`, value: parsedData.nnc.cell }
                );
              }

              if (parsedData.vnc) {
                delta.updates[0].values.push(
                  { path: `${prefix}.VNCBMS`, value: parsedData.vnc.bms },
                  { path: `${prefix}.VNCCell`, value: parsedData.vnc.cell }
                );
              }

              if (parsedData.toor) {
                delta.updates[0].values.push(
                  { path: `${prefix}.ToorBMS`, value: parsedData.toor.bms },
                  { path: `${prefix}.ToorCell`, value: parsedData.toor.cell }
                );
              }
            }

            delta.updates[0].values = delta.updates[0].values.filter(item => item.value !== null && item.value !== undefined);

            app.debug("REC BMS Plugin: Sending delta: " + JSON.stringify(delta));
            app.handleMessage(plugin.id, delta, 'v1');
          } catch (err) {
            app.error("REC BMS Plugin: Failed to parse JSON: " + err.message);
          }
        });

        ws.on('close', () => {
          app.debug("REC BMS Plugin: WebSocket connection closed");
          app.setPluginStatus("BMS disconnected - ERROR");
          clearInterval(pingInterval);
          if (shouldReconnect) {
            app.debug("REC BMS Plugin: Reconnecting in " + currentReconnectInterval + "ms");
            setTimeout(connect, currentReconnectInterval);
            // Exponential backoff, up to a maximum of 60 seconds.
            currentReconnectInterval = Math.min(currentReconnectInterval * 2, 60000);
          }
        });

        ws.on('error', (error) => {
          app.error("REC BMS Plugin: error: " + error.message);
          app.setPluginStatus("Error: " + error.message + " - ERROR");
          clearInterval(pingInterval);
          if (ws) {
            ws.terminate();
          }
        });
      }

      // Start by connecting.
      connect();
    },
    stop: function() {
      shouldReconnect = false;
      clearInterval(pingInterval);
      if (ws) {
        ws.close();
        ws = null;
      }
      app.debug("REC BMS Plugin: stopped");
      app.setPluginStatus("Stopped");
    }
  };

  return plugin;
};
