// ------------------------------------------------------
// Copyright (c) 2025 Yuxuan Zhang, dev@z-yx.cc
// This source code is licensed under the MIT license.
// You may find the full license in project root directory.
// -------------------------------------------------------

import { computed, markRaw, ref, ShallowRef, watch } from "vue";
import { Awaitable, Sequence } from "../types";

export function crash(message: string, capture?: Function): never {
    const error = new Error(message);
    Error.captureStackTrace?.(error, capture ?? crash);
    throw error;
}

export function defer<T = any>() {
    type Resolve = (value: T) => void;
    type Reject = (reason?: any) => void;
    let resolve: Resolve, reject: Reject;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return Object.assign([promise, resolve!, reject!], {
        promise,
        resolve: resolve!,
        reject: reject!,
    }) as [Promise<T>, Resolve, Reject] & {
        promise: Promise<T>;
        resolve: Resolve;
        reject: Reject;
    };
}

export function delay(ms: number) {
    if (ms <= 0) return Promise.resolve();
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function clamp(val: number, [min, max]: [number, number]) {
    if (val < min) {
        return min;
    } else if (val > max) {
        return max;
    }
    return val;
}

export function radians(deg: number) {
    return (deg * Math.PI) / 180.0;
}

export function degrees(rad: number) {
    return (rad * 180.0) / Math.PI;
}

export class ElementSize {
    #width = ref(0);
    get width() {
        return this.#width.value;
    }

    #height = ref(0);
    get height() {
        return this.#height.value;
    }

    private readonly listener: () => void;
    constructor(private el: Readonly<ShallowRef<Element | null>>) {
        this.listener = () => this.update();
        window.addEventListener("update-size", this.listener);
        watch(el, () => this.update(), { immediate: true });
    }

    update() {
        if (this.el.value === null) return;
        this.#width.value = this.el.value.getBoundingClientRect().width;
        this.#height.value = this.el.value.getBoundingClientRect().height;
    }

    destroy() {
        window.removeEventListener("update-size", this.listener);
    }

    static notify() {
        window.dispatchEvent(new Event("update-size"));
    }
}

window.addEventListener("resize", ElementSize.notify);
window.setInterval(ElementSize.notify, 200);

export function isValidNumber(value: any): value is number {
    return typeof value === "number" && !isNaN(value) && isFinite(value);
}

export default function linspace(
    start: number,
    end: number,
    step: number
): number[] {
    step = start < end ? Math.abs(step) : -Math.abs(step);
    if (Math.abs(step) <= 0) {
        throw new Error("Step too small");
    }
    const count = Math.floor(Math.abs(end - start) / Math.abs(step));
    return Array.from({ length: count + 1 }, (_, i) => start + i * step);
}

export class Shared {
    constructor(private destroy: () => void) {}
    private references = new Set<symbol>();
    // Abstract init method to be implemented by subclasses
    initialize() {}
    ref() {
        const { initialize, references, destroy, constructor } = this;
        if (references.size === 0) initialize();
        const token = Symbol(`ref::${constructor.name}`);
        references.add(token);
        return () => {
            references.delete(token);
            if (references.size === 0) destroy();
        };
    }
    cleanup() {}
}

export class AsyncChain<T = any> {
    // Value is only valid when next is an AsyncChain node.
    readonly value?: T;
    readonly next: Awaitable<AsyncChain<T> | null>;
    protected resolve: (value: AsyncChain<T> | null) => void;

    constructor() {
        const { promise, resolve } = defer<AsyncChain<T> | null>();
        this.next = promise;
        this.resolve = resolve;
        markRaw(this);
    }

    static async *iter<T>(node: AsyncChain<T>) {
        while (true) {
            if (node.type === "PENDING") await node.next;
            if (node.type === "END") break;
            yield node.value!;
            node = node.next as AsyncChain<T>;
        }
    }

    [Symbol.asyncIterator]() {
        // AsyncChain relies on JavaScript GC Engine to reclaim resources.
        // However, class method holds reference to a node via `this`, the
        // extra closure is therefore used to avoid memory leak.
        return AsyncChain.iter<T>(this);
    }

    get type() {
        if (this.next instanceof Promise) return "PENDING";
        return this.next === null ? "END" : "DATA";
    }

    *current_items() {
        let node: AsyncChain<T> = this;
        while (node.type === "DATA") {
            yield node.value!;
            node = node.next as AsyncChain<T>;
        }
    }

    get current_length() {
        let count = 0;
        for (const _ of this.current_items()) count++;
        return count;
    }

    get back() {
        let node: AsyncChain<T> = this;
        while (node.type === "DATA") {
            node = node.next as AsyncChain<T>;
        }
        return node;
    }

    push(value: T) {
        const { back } = this;
        (back.value as T) = value;
        const next = new AsyncChain<T>();
        (back.next as AsyncChain<T>) = next;
        back.resolve(next);
        return next;
    }

    terminate() {
        const { back } = this;
        if (back.type === "PENDING") {
            back.resolve(null);
        }
    }
}

export function cachedRef<T>(key: string, value: T) {
    try {
        const storedValue = localStorage.getItem(key);
        if (storedValue !== null) value = JSON.parse(storedValue) as T;
    } catch {
        localStorage.removeItem(key);
    }
    const internal = ref<T>(value);
    return computed<T>({
        get() {
            return internal.value;
        },
        set(value: T) {
            internal.value = value;
            localStorage.setItem(key, JSON.stringify(value));
        },
    });
}

export async function* renderTicks() {
    while (true) {
        yield;
        const { promise, resolve } = defer();
        requestAnimationFrame(resolve);
        await promise;
    }
}

export function gaussian(
    sigma = 1,
    x: Sequence<number> = linspace(-3 * sigma, 3 * sigma, sigma / 10),
    norm = true
): Float32Array {
    const y = new Float32Array(x.length);
    const k = 1 / (sigma * Math.sqrt(2 * Math.PI));
    for (let i = 0; i < x.length; i++) {
        y[i] = k * Math.exp(-Math.pow(x[i], 2) / (2 * Math.pow(sigma, 2)));
    }
    if (norm) {
        const sum = y.reduce((a, b) => a + b, 0.0);
        for (let i = 0; i < y.length; i++) {
            y[i] /= sum;
        }
    }
    return y;
}

export function isGenerator<T = any>(obj: any): obj is Generator<T> {
    return (
        obj &&
        typeof obj === "object" &&
        typeof obj.next === "function" &&
        typeof obj.throw === "function"
    );
}

export function hasNext(g: Generator<any>): boolean {
    try {
        const { done } = g.next();
        return !done;
    } catch {
        return false;
    }
}

export type RecursiveArray<T, A = {}> = (Array<RecursiveArray<T, A>> & A) | T;
export type RecursiveGenerator<T, A = {}> =
    | (Generator<RecursiveGenerator<T, A>> & A)
    | T;

export function consume<T, A = {}>(
    g: Generator<RecursiveGenerator<T, A>> & A
): Array<RecursiveArray<T, A>> & A;

export function consume<T, A = {}>(
    g: RecursiveGenerator<T, A>
): RecursiveArray<T, A>;

export function consume<T, A = {}>(
    g: (Generator<RecursiveGenerator<T, A>> & A) | RecursiveGenerator<T, A>
): (Array<RecursiveArray<T, A>> & A) | RecursiveArray<T, A> {
    // Check if g is a generator
    if (!isGenerator(g)) return g;
    const ret = [] as RecursiveArray<T, A>[] & A;
    for (const v of g) ret.push(consume(v));
    // Copy own properties <A>
    for (const k of Object.getOwnPropertyNames(g)) {
        if (k in ret) continue;
        const desc = Object.getOwnPropertyDescriptor(g, k);
        if (desc && (desc.get || desc.set)) {
            Object.defineProperty(ret, k, desc);
        } else {
            (ret as any)[k] = (g as any)[k];
        }
    }
    return ret;
}

export function reverse<T>(sequence: Sequence<T>) {
    return {
        [Symbol.iterator]() {
            return this.values();
        },
        *keys(): Generator<number> {
            for (let i = sequence.length - 1; i >= 0; i--) {
                yield i;
            }
        },
        *values(): Generator<T> {
            for (let i = sequence.length - 1; i >= 0; i--) {
                yield sequence[i];
            }
        },
        *entries(): Generator<[number, T]> {
            for (let i = sequence.length - 1; i >= 0; i--) {
                yield [i, sequence[i]];
            }
        },
    };
}

export function nextTick() {
    return new Promise<void>((resolve) => queueMicrotask(resolve));
}

export function getCurrentSelection(): Partial<Selection> | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const { anchorNode, anchorOffset, focusNode, focusOffset } = selection;
    if (!anchorNode || !focusNode) return null;
    return { anchorNode, anchorOffset, focusNode, focusOffset };
}

export function getCursorOffset(el: Node, offset: number) {
    if (el.nodeType === Node.TEXT_NODE) {
        return offset;
    } else if (el.nodeType === Node.ELEMENT_NODE) {
        let pos = 0;
        for (let i = 0; i < offset; i++) {
            const child = el.childNodes[i];
            pos += child?.textContent?.length ?? 0;
        }
        return pos;
    } else {
        crash(`Unsupported node ${el}`, getCursorOffset);
    }
}
