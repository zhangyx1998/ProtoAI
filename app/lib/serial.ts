import { SerialPort } from "serialport";
import { markRaw, Raw, ref, Ref } from "vue";

export type PortInfo = Awaited<ReturnType<typeof SerialPort.list>>[number];

(window as any).SerialPort = SerialPort;

export const ports = ref<PortInfo[]>([]);

Object.defineProperty(window, "ports", {
    get() {
        return [...ports.value];
    },
});

enumeratePorts();

export const upStream = ref<Raw<SerialDevice> | null>(null);
export const downStream = ref<Raw<SerialDevice> | null>(null);

import type { Packet, UserHint } from "core";
type PacketType = Packet["type"];

export const queue = ref<(Packet | UserHint)[] | null>(null);

export async function enumeratePorts() {
    console.log("Enumerating ports...");
    ports.value = (await SerialPort.list()).map((p) => markRaw(p));
    if (!upStream.value) {
        const candidates = ports.value
            .filter((p) => p.manufacturer === "ProtoAI")
            .filter((p) => p.path !== downStream.value?.info.path)
            .sort((a, b) => {
                if (a.path > b.path) return 1;
                if (a.path < b.path) return -1;
                return 0;
            });
        if (candidates.length) {
            const port = candidates.at(-1)!;
            console.log(
                [
                    "Auto-selecting upstream port:",
                    ...Object.entries(port).map(([k, v]) => `  ${k}: ${v}`),
                ].join("\n")
            );
            new SerialDevice(port, upStream, "DATA-DOWN", downStream);
        }
    }
}

const usb = (navigator as any).usb as EventTarget | undefined;
usb?.addEventListener("connect", enumeratePorts);
usb?.addEventListener("disconnect", enumeratePorts);

export class SerialDevice extends SerialPort {
    constructor(
        public readonly info: PortInfo,
        public readonly ref: Ref<SerialDevice | null>,
        public readonly type: PacketType,
        public readonly forward?: Ref<SerialDevice | null>
    ) {
        super({ path: info.path, baudRate: 115200 });
        if (ref.value) ref.value.close();
        ref.value = this;
        this.on("data", (data: Buffer) => {
            this.forward?.value?.write(data);
            const q = queue.value;
            if (!q) return;
            q.push({
                type: this.type,
                timestamp: Date.now(),
                payload: new Uint8Array(data),
            });
        });
        this.on("close", () => this.close());
        return markRaw(this);
    }
    close() {
        this.ref.value = null;
        if (super.isOpen) super.close();
    }
}
