class CellManager {
    constructor() {
      this.container = null;
      this.existingTowers = {};
      this.MAX_VOLTAGE = 4.2;
    }
  
    init(containerId) {
      this.container = document.getElementById(containerId);
      if (!this.container) {
        console.error('Cell container not found');
        return;
      }
      this.createVoltageScale();
    }
  
    createVoltageScale() {
      const existingScale = this.container.querySelector('.voltage-scale');
      if (existingScale) existingScale.remove();
  
      const scale = document.createElement('div');
      scale.className = 'voltage-scale';
  
      const MAX_V = 4.0;
      const INCREMENT = 0.5;
      for (let v = 0; v <= MAX_V; v += INCREMENT) {
        const mark = document.createElement('div');
        mark.className = 'voltage-mark';
        mark.style.bottom = `${(v / MAX_V) * 100}%`;
        mark.textContent = `${v.toFixed(1)}V`;
        scale.appendChild(mark);
      }
  
      this.container.appendChild(scale);
      this.scale = scale;
    }
  
    updateAllCells({ cellVoltages, cellResistances }) {
      if (!this.container) return;
  
      Object.entries(cellVoltages)
        .filter(([key]) => /^cellVoltage\d+$/.test(key))
        .sort((a, b) => parseInt(a[0].match(/\d+/)[0]) - parseInt(b[0].match(/\d+/)[0]))
        .forEach(([path, voltage]) => {
          const cellId = path.match(/\d+/)[0];
          const resistance = cellResistances[`cellResistance${cellId}`];
          this.updateCell(cellId, voltage, resistance);
        });
    }
  
    updateCell(cellId, voltage, resistance) {
      let tower = this.existingTowers[cellId];
      
      if (!tower) {
        tower = document.createElement('div');
        tower.className = 'cell-tower';
        tower.dataset.cell = cellId;
  
        const block = document.createElement('div');
        block.className = 'tower-block';
        tower.appendChild(block);
  
        const voltageDisplay = document.createElement('div');
        voltageDisplay.className = 'tower-voltage-value';
        block.appendChild(voltageDisplay);
  
        const resistanceDisplay = document.createElement('div');
        resistanceDisplay.className = 'tower-resistance-value';
        block.appendChild(resistanceDisplay);
  
        const label = document.createElement('div');
        label.className = 'tower-label';
        label.textContent = `Cell ${cellId}`;
        tower.appendChild(label);
  
        this.container.insertBefore(tower, this.scale);
        this.existingTowers[cellId] = tower;
      }
  
      const block = tower.querySelector('.tower-block');
      block.style.height = `${(voltage / this.MAX_VOLTAGE) * 100}%`;
  
      tower.querySelector('.tower-voltage-value').textContent = `${voltage.toFixed(3)}V`;
      tower.querySelector('.tower-resistance-value').textContent = 
        resistance !== undefined ? `${(resistance * 1000).toFixed(2)} mΩ` : "-- mΩ";
    }
  }
  
  export const CellVisualizer = new CellManager();