import type { Packet, UserHint } from "core";

export const combinedData: Array<Packet | UserHint> = [
    {
    type: "DATA-DOWN",
    timestamp: 10n,
    payload: hexStringToArrayBuffer("24 4D 3C 00 01 01"),
  },
    {
    type: "DATA-UP",
    timestamp: 20n,
    payload: hexStringToArrayBuffer("24 4D 3E 03 01 00 01 2D 2E"),
  },
  {
    type: "DATA-DOWN",
    timestamp: 30n,
    payload: hexStringToArrayBuffer("24 4D 3C 00 04 04"),
  },
  {
    type: "DATA-UP",
    timestamp: 40n,
    payload: hexStringToArrayBuffer("24 4D 3E 04 04 42 45 54 41 12"),
  },
    {
    type: "USER-HINT",
    timestamp: 50n, // Represents a point in time
    payload: "the flight controller is initiated",
  },
  {
    type: "DATA-DOWN",
    timestamp: 60n,
    payload: hexStringToArrayBuffer("24 4D 3C 01 4D 02 4E"),
  },
  {
    type: "USER-HINT",
    timestamp: 70n,
    payload: "the robot is moving forward right now",
  },
];

function hexStringToArrayBuffer(hexString: string) {
  // Remove any spaces from the string
  const cleanHexString = hexString.replace(/\s+/g, '');

  // Ensure the string has an even number of characters
  if (cleanHexString.length % 2 !== 0) {
    console.error("Hex string must have an even number of characters.");
    return new ArrayBuffer(0);
  }

  // Create a Uint8Array to hold the byte values
  const byteArray = new Uint8Array(cleanHexString.length / 2);

  // Loop through the string, taking two characters at a time
  for (let i = 0; i < cleanHexString.length; i += 2) {
    const byteString = cleanHexString.substr(i, 2);
    const byteValue = parseInt(byteString, 16);
    byteArray[i / 2] = byteValue;
  }

  // The .buffer property of the Uint8Array is the ArrayBuffer
  return byteArray.buffer;
}