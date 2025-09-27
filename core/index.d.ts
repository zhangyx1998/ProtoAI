// ------------------------------------------------------
// Copyright (c) 2025 Yuxuan Zhang
// This source code is licensed under the MIT license.
// You may find the full license in project root directory.
// -------------------------------------------------------

type Awaitable<T> = T | Promise<T>;

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
}
