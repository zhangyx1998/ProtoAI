<script lang="ts">
import type { Packet, UserHint } from "core";
import { BinaryParser } from '../models/BinaryParser'
import { defineComponent, PropType, useTemplateRef, watch } from 'vue';
import { ElementSize } from "@lib/util";
import DataEntry from "./DataEntry.vue";

export default {
  components: {
    DataEntry
  },
  props: {
    packets: {
      type: Array as PropType<(Packet | UserHint)[]>,
      default: () => []
    },
    startTime: {
      type: Number,
      required: true
    }
  },
  methods: {
    isUserHint(item: (Packet | UserHint)): item is UserHint {
      if (item.type === "USER-HINT") {
        return true
      } else {
        return false
      }
    }
  }
}
</script>

<template>
  <div class="packets-container">
    <div class="chat-bubble" v-for="packet in packets" :class="isUserHint(packet) ? 'right' : 'left'">
      <div class="data-packet" v-if="!isUserHint(packet)">
        <DataEntry :packet="packet" :startTime="startTime"/>
      </div>
      <div class="hint-packet" v-else>
        <DataEntry :packet="packet" :startTime="startTime"/>
      </div>
    </div>
  </div>


</template>


<style scoped>
.packets-container {
  overflow-y: scroll;
}

.chat-bubble {
  display: flex;
  flex-direction: row;
  margin: 1em;
  /* margin-top: 0.25rem;
  margin-bottom: 0.25rem; */

  overflow: hidden;
  word-break: break-word;
}

.chat-bubble.right {
  justify-content: flex-end;

}

.chat-bubble.left {
  justify-content: flex-start;
}

.hint-packet {
  display: flex;
  flex-direction: row;
  padding: 0.5rem;
  border-radius: 10px;
  background: #3a62a9;
  justify-content: flex-end;
}

.data-packet {
  min-width: 70%;
  display: flex;
  flex-direction: row;
  padding: 0.5rem;
  border-radius: 10px;
  background: rgb(66, 74, 82);

  justify-content: flex-start;
}
</style>