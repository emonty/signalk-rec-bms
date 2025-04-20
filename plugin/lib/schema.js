module.exports = {
  type: "object",
  properties: {
    connection: {
      title: "Connection Settings",
      type: "object",
      properties: {
        connectionType: {
          title: "Connection Type",
          type: "string",
          enum: ["websocket", "serial"],
          default: "websocket"
        }
      }
    },
    websocket: {
      title: "WebSocket Connection Settings",
      type: "object",
      properties: {
        websocketURL: {
          title: "WebSocket URL",
          type: "string",
          default: "ws://192.168.88.10/ws"
        }
      }
    },
    serial: {
      title: "Serial Connection Settings",
      type: "object",
      properties: {
        device: { 
          title: "Serial Device", 
          type: "string", 
          default: "/dev/ttyUSB0" 
        },
        baudRate: { 
          title: "Baud Rate", 
          type: "number", 
          default: 115200 
        },
        targetAddress: { 
          title: "Target (Destination) Address", 
          type: "number", 
          default: 2 
        },
        senderAddress: { 
          title: "Sender Address", 
          type: "number", 
          default: 0 
        }
      }
    },
    deltaPrefix: {
      title: "Delta Path Prefix",
      type: "string",
      default: "electrical.batteries.bms"
    }
  }
};