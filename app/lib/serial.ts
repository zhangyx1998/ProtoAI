import { SerialPort } from "serialport";
import { markRaw, Raw, ref, Ref } from "vue";

type PortInfo = Awaited<ReturnType<typeof SerialPort.list>>[number];

(window as any).SerialPort = SerialPort;

export const portList = ref<PortInfo[]>([]);

export const upStream = ref<Raw<SerialDevice> | null>(null);
export const downStream = ref<Raw<SerialDevice> | null>(null);

import type { Packet } from "core";
type PacketType = Packet["type"];

export const queue = ref<Packet[] | null>(null);

export async function updatePortList() {
    const list = (portList.value = await SerialPort.list());
    if (!upStream.value) {
        const candidates = list
            .filter((p) => p.manufacturer === "ProtoAI")
            .filter((p) => p.path !== downStream.value?.info.path)
            .sort((a, b) => {
                if (a.path > b.path) return 1;
                if (a.path < b.path) return -1;
                return 0;
            });
        if (candidates.length)
            new SerialDevice(candidates.at(-1)!, upStream, "DATA-UP");
    }
}

const usb = (navigator as any).usb as EventTarget | undefined;
usb?.addEventListener("connect", updatePortList);
usb?.addEventListener("disconnect", updatePortList);

class SerialDevice extends SerialPort {
    constructor(
        public readonly info: PortInfo,
        public readonly ref: Ref<SerialDevice | null>,
        public readonly type: PacketType
    ) {
        super({ path: info.path, baudRate: 115200 });
        if (ref.value) ref.value.close();
        ref.value = this;
        this.on("data", (data: Buffer) => {
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
        super.close();
    }
}
