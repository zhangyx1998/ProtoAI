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
    readonly title: string; // A concise name for the packet type
    readonly description: string; // Describes the packet's role or purpose within the protocol
    readonly confidence: number; // Confidence level of the inference (0 to 1)
    readonly fields: BinaryField[];
};

type BinaryField = {
    // Name of the field
    readonly name: string;
    // Description of the field's purpose
    readonly description: string;
    // Start and end position of the field in bits
    // Adjacent fields must not overlap, but they may or may not
    //  be contiguous
    readonly range: [number, number];
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
        static create(): Counter;
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
