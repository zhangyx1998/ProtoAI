<!-- ---------------------------------------------------
Copyright (c) 2025 Yuxuan Zhang, sing-lab@z-yx.cc
This source code is licensed under the MIT license.
You may find the full license in project root directory.
---------------------------------------------------- -->

<script setup lang="ts">
import { ref, watch } from "vue";
import {
    SerialDevice,
    PortInfo,
    ports,
    upStream,
    downStream,
    enumeratePorts,
    queue
} from "@lib/serial";
import { store } from "@src/store";
import { runGPTInference } from "@src/GPT.js";
const downStreamPort = ref<PortInfo | null>(null);
function filter(ports: PortInfo[]) {
    return ports.filter(
        (port) =>
            port.manufacturer !== "ProtoAI" &&
            port.path !== downStream.value?.info.path
    );
}
function display({ path, vendorId, productId, manufacturer }: PortInfo) {
    if (vendorId && productId && manufacturer)
        return `[${vendorId}:${productId}] ${manufacturer}`;
    else return path;
}
watch(downStreamPort, (port) => {
    if (!port || port.path === downStream.value?.info.path) return;
    if (downStream.value) downStream.value.close();
    downStream.value = new SerialDevice(
        port,
        downStream,
        "DATA-UP",
        upStream
    );
});

async function stopCapture() {
    const captured = queue.value?.slice(0, 5);
    queue.value = null;
    console.log("Captured packets:", captured);
    store.value.push(...(captured ?? []));
    const chatData = await runGPTInference(store.value);
    store.value = chatData.details;
}
</script>

<template>
    <div class="menu-bar">
        <div class="logo">ProtoAI</div>
        <div class="spacer" style="flex-grow: 1"></div>
        <select v-model="downStreamPort" @click="enumeratePorts">
            <option :key="''" :value="null">Select Port</option>
            <option v-for="port of filter(ports)" :key="port.path" :value="port">
                {{ display(port) }}
            </option>
        </select>
        <div class="menu-item">
            <button v-if="queue === null" @click="queue = []">Start Capture</button>
            <button v-else @click="stopCapture">Stop Capture</button>
        </div>
    </div>
</template>

<style scoped lang="scss">
button {
    background-color: #3a62a9;
    color: #fff;
    border: none;
    padding: 8px 16px;
    margin: 0 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    transition: background-color 0.3s;

    &[disabled="true"] {
        background-color: #666;
        cursor: not-allowed;
    }
}

.menu-bar {
    display: flex;
    align-items: center;
    background-color: #222;
    color: #fff;
}

.logo {
    font-size: 24px;
    font-weight: bold;
    font-style: italic;
    font-family: "Times New Roman", Times, serif;
    color: #fff;
    padding: 10px;
}

select {
    font-size: 0.8em;
    display: block;
    margin: 0;
    padding: 0 0.4em;
    width: 12em;
    height: 2em;
    font-family: inherit;
    background-color: #fff1;
    border-radius: 4px;
    outline: 1px solid #ccc;
    overflow: hidden;
    text-overflow: ellipsis;
}
</style>
