// ------------------------------------------------------
// Copyright (c) 2025 Yuxuan Zhang
// This source code is licensed under the MIT license.
// You may find the full license in project root directory.
// -------------------------------------------------------

type Awaitable<T> = T | Promise<T>;

type Packet = {
    // Raw packet info
    type: "DATA-UP" | "DATA-DOWN";
    timestamp: BigInt;
    payload: ArrayBuffer;
    // AI Inferred Properties
    inferred?: InferredPacketProperties;
};

type UserHint = {
    type: "USER-HINT";
    timestamp: BigInt;
    payload: string;
};

type InferredPacketProperties = {
    readonly protocol_name: string;
    readonly description: string; // Describes the packet's role or purpose within the protocol
    readonly confidence: number; // Confidence level of the inference (0 to 1)
    readonly fields: BinaryField[];
};

type BinaryField = {
    readonly name: string; // Name of the field
    readonly description: string; // Description of the field's purpose
    readonly start_bit: number; // Start position of the field in bits
    readonly length: number; // Length of the field in bits
};

declare module "core" {
    /** Path to the resolved native module */
    export const __origin__: string;

    class CoreObject {
        /**
         * Releases underlying native resources.
         * After calling destroy(), any further access to the object will throw an error.
         * It is safe to call destroy() multiple times.
         */
        public destroy(): void;
    }

    export class Counter extends CoreObject {
        [Symbol.iterator](): Iterator<number>;
        get value(): number;
    }

    export class PseudoTTY extends CoreObject {
        /**
         * @param tty path to the actual tty serial port of a physical device
         */
        static create(tty: string): PseudoTTY;
        // Path to the emulated TTY device
        get path(): string;
        // Connection state change subscriber
        onConnectionStateChange(callback: (connected: boolean) => any): void;
        // Data packet subscriber
        onData(callback: (data: Packet) => any): void;
    }
}

function hexStringToArrayBuffer(hexString) {
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

const combinedData: Array<Packet | UserHint> = [
    {
    type: "DATA-DOWN",
    timestamp: 30n,
    payload: hexStringToArrayBuffer("24 4D 3C 00 01 01"),
  },
    {
    type: "DATA-UP",
    timestamp: 10n,
    payload: hexStringToArrayBuffer("24 4D 3E 03 01 00 01 2D 2E"),
  },
  {
    type: "DATA-DOWN",
    timestamp: 30n,
    payload: hexStringToArrayBuffer("24 4D 3C 00 04 04"),
  },
  {
    type: "DATA-UP",
    timestamp: 10n,
    payload: hexStringToArrayBuffer("24 4D 3E 04 04 42 45 54 41 12"),
  },
    {
    type: "USER-HINT",
    timestamp: 20n, // Represents a point in time
    payload: "the flight controller is initiated",
  },
  {
    type: "DATA-DOWN",
    timestamp: 30n,
    payload: hexStringToArrayBuffer("24 4D 3C 01 4D 02 4E"),
  },
  {
    type: "USER-HINT",
    timestamp: 40n,
    payload: "the robot is moving forward right now",
  },
];