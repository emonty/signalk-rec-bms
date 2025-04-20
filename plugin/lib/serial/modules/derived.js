module.exports = function Derived(app, sendDeltaCallback, config) {
  app.debug("[DERIVED] Module instantiated with config: " + JSON.stringify(config));
  let voltage, current, ampHourUsed, capacity;

  const base = (config && config.deltaPrefix) ? config.deltaPrefix : "";
  const prefix = base
    ? (base.endsWith('.') ? base : base + '.')
    : "";

  function computeAndSendDeltas() {
    if ([voltage, current, ampHourUsed, capacity].every(v => typeof v === 'number')) {
      const power = voltage * current;
      const ahRemaining = capacity - ampHourUsed;
      sendDeltaCallback({
        updates: [{
          values: [
            { path: prefix + 'power',             value: power },
            { path: prefix + 'ampHourRemaining', value: ahRemaining }
          ]
        }]
      });
    }
  }

  app.streambundle.getSelfStream(prefix + 'voltage').forEach(v => {
    if (typeof v === 'number') { voltage = v; computeAndSendDeltas(); }
  });
  app.streambundle.getSelfStream(prefix + 'current').forEach(v => {
    if (typeof v === 'number') { current = v; computeAndSendDeltas(); }
  });
  app.streambundle.getSelfStream(prefix + 'ampHourUsed').forEach(v => {
    if (typeof v === 'number') { ampHourUsed = v; computeAndSendDeltas(); }
  });
  app.streambundle.getSelfStream(prefix + 'capacity').forEach(v => {
    if (typeof v === 'number') { capacity = v; computeAndSendDeltas(); }
  });

  let totalCells = 0;
  const cellVoltages = {};
  let subscribedCellStreams = false;

  app.streambundle.getSelfStream(prefix + 'numBMSUnits').forEach(units => {
    if (!subscribedCellStreams && typeof units === 'number' && units > 0) {
      totalCells = units * 4;
      for (let i = 1; i <= totalCells; i++) {
        const cellPath = prefix + 'cellVoltage' + i;
        app.streambundle.getSelfStream(cellPath).forEach(val => {
          if (typeof val === 'number') {
            cellVoltages[i] = val;
            trySendCellDiff();
          }
        });
      }
      subscribedCellStreams = true;
    }
  });

  function trySendCellDiff() {
    const keys = Object.keys(cellVoltages).map(k => parseInt(k,10));
    if (keys.length === totalCells) {
      const vals = keys.map(i => cellVoltages[i]);
      const minV = Math.min(...vals);
      const maxV = Math.max(...vals);
      sendDeltaCallback({
        updates: [{
          values: [
            { path: prefix + 'cellVoltageDifference', value: maxV - minV }
          ]
        }]
      });
    }
  }

  return {
    stop: () => {
      app.debug("[DERIVED] Stopping derived module");
    }
  };
};
