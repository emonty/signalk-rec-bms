"use strict";
const { crc16 } = require("crc");

// Address validation from schema
const ADDRESS_CONFIG = {
  MIN_TARGET: 1,    // From schema.serial.targetAddress
  MAX_TARGET: 127,  // RS485 standard upper limit
  SENDER: 0         // From schema.serial.senderAddress
};

/**
 * Validates BMS address against schema constraints
 * @param {number} address 
 * @param {'target'|'sender'} type 
 * @returns {boolean}
 */
function validateAddress(address, type = 'target') {
  if (type === 'sender') {
    return address === ADDRESS_CONFIG.SENDER;
  }
  return Number.isInteger(address) && 
         address >= ADDRESS_CONFIG.MIN_TARGET && 
         address <= ADDRESS_CONFIG.MAX_TARGET;
}

/**
 * Build RS485 packet with schema-validated addressing
 * @param {number} address - Destination address (validated)
 * @param {Buffer} command - Command bytes
 * @param {Object} [options]
 * @param {number} [options.senderAddress=0] - Source address
 * @returns {Buffer}
 * @throws {Error} On invalid address
 */
function buildPacket(address, command, { senderAddress = 0 } = {}) {
  if (!validateAddress(address, 'target')) {
    throw new Error(`Invalid target address: ${address}. Must be ${ADDRESS_CONFIG.MIN_TARGET}-${ADDRESS_CONFIG.MAX_TARGET}`);
  }
  if (!validateAddress(senderAddress, 'sender')) {
    throw new Error(`Invalid sender address: ${senderAddress}. Must be ${ADDRESS_CONFIG.SENDER}`);
  }

  const L = command.length;
  const packet = Buffer.alloc(L + 7); // STX+ADDR+RES+LEN+CMD+CRC+ETX

  packet.writeUInt8(0x55, 0);          // STX
  packet.writeUInt8(address, 1);       // Validated target address
  packet.writeUInt8(senderAddress, 2); // Validated sender address
  packet.writeUInt8(L, 3);             // Command length
  command.copy(packet, 4);             // Command payload
  packet.writeUInt16BE(crc16(packet.slice(1, 4 + L)), 4 + L); // CRC
  packet.writeUInt8(0xAA, 4 + L + 2);  // ETX

  return packet;
}

module.exports = {
  buildPacket,
  validateAddress // Exposed for pre-validation
};