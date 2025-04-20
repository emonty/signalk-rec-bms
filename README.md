# signalk-rec-bms

![alt text](https://github.com/ofernander/signalk-rec-bms/blob/main/public/assets/images/rec-sk.png)

## Features

- Reads all avabile data streams from BMS and publishes to SignalK
- Supports Websocket connection from the REC WiFi module with firmare >= SW164_2
- Supports serial connection directly from BMS
- Can set BMS settings when using serial connection
- Live status & settings page within SignalK 

## Notes

Tested with the 4 cell ABMS model only

## Requirements

#### Websocket connection (WiFi):

- A REC WiFi module with firmware >= SW164_2, which enables websockets  

[Firmware SW164_2](https://www.rec-bms.com/wp-content/uploads/2025/01/Wi-Fi-FW-Update_SW164_2.zip)
  
#### Serial connection:

- RS485 to USB adapter with 3v output. The REC-BMS serial chip is not powered internally and you must supply 3v to power it. 

![alt text](https://github.com/ofernander/signalk-rec-bms/blob/main/public/assets/images/rs485.jpg)

![alt text](https://github.com/ofernander/signalk-rec-bms/blob/main/public/assets/images/bms_serial.png)

## Dependencies

- npm package: [websocket](https://www.npmjs.com/package/websocket)
- npm package: [serialport](https://www.npmjs.com/package/serialport)
- npm package: [crc](https://www.npmjs.com/package/crc)

## Installation (choose one)

Use the SignalK application store (preferred)

Run the following command:
   ```bash
   npm install signalk-rec-bms
   ```
