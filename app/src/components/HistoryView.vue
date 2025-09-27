<script lang="ts">
import type { Packet, UserHint } from "core";
import { BinaryParser } from '../models/BinaryParser'
import { defineComponent, PropType, useTemplateRef, watch } from 'vue';
import { ElementSize } from "@lib/util";

interface dataInterface {
  hoverIndex: { packetTime: string, row: number, col: number }
}

export default {

  setup(props, ctx) {
    const container = useTemplateRef<HTMLDivElement>('container')
    const size = new ElementSize(container);
    watch(() => [size.width, size.height], ([w, h]) => console.log({ w, h }));
    return { container, size };
  },
  props: {
    packets: {
      type: Array as PropType<(Packet | UserHint)[]>,
      default: () => []
    }
  },
  data(): dataInterface {
    return {
      hoverIndex: {  packetTime: "", row: -1, col: -1 }
    }
  },
  computed: {
    bytesPerRow() {
      if (this.size.width < 300) return 2;
      else if (this.size.width < 400) return 4;
      else if (this.size.width < 500) return 6;
      else if (this.size.width < 900) return 8;
      else if (this.size.width < 1000) return 16;
      else return 16;
    }
  },
  methods: {
    isUserHint(packet: (Packet | UserHint)): packet is UserHint {
      if (packet.type == "USER-HINT") {
        return true;
      } else {
        return false;
      }
    },
    displayDataPacket(packet: Packet) {
      const parsedBinary = new BinaryParser(packet.payload);

      const rows: { hex: string[], chars: string[] }[] = []

      const { hexValues, charValues } = parsedBinary;

      for (let i = 0; i < hexValues.length; i += this.bytesPerRow) {
        rows.push({
          hex: hexValues.slice(i, i + this.bytesPerRow),
          chars: charValues.slice(i, i + this.bytesPerRow)
        })
      }

      // fill extra space
      if (hexValues.length % this.bytesPerRow > 0) {
        for (let i = 0; i < rows[rows.length - 1].hex.length % this.bytesPerRow; i++) {
          rows[rows.length - 1].hex.push('-')
          rows[rows.length - 1].chars.push('-')
        }
      }

      return rows;
    },
    displayMessagePacket(packet: UserHint) {
      return packet.payload;
    },
    checkPacket(packetTime: string, row: number, col: number) {
      const matchPacket = packetTime === this.hoverIndex.packetTime;
      const matchLocation = (this.hoverIndex.row === row && this.hoverIndex.col === col)
      if (matchPacket && matchLocation) {
        return true
      } else {
        return false
      }
    },
    onHover(packet: Packet, row: number, col: number) {
      this.hoverIndex = { packetTime: packet.timestamp.toString(), row: row, col: col }
    },
    onLeave() {
      this.hoverIndex = { packetTime: "", row: -1, col: -1 }
    }
  },
}
</script>

<template>
  <div ref="container" class="packet-viewer">
    <div v-for="packet in packets" class="chat-row" :class="isUserHint(packet) ? 'right' : 'left'"
      :key="packet.timestamp.toString()">
      <div class="chat-bubble">
        <!-- User hint packets -->
        <div v-if="isUserHint(packet)">
          {{ displayMessagePacket(packet) }}
        </div>

        <!-- Data packets -->
        <div class="hex-tables" v-else>
          <table>
            <tbody>
              <tr v-for="(row, rowIndex) in displayDataPacket(packet)" :key="'hex-' + rowIndex">
                <td class="hex">
                  <span 
                    v-for="(hex, i) in row.hex" 
                    :key="i"
                    :class="{ highlighted: checkPacket(packet.timestamp.toString(), rowIndex, i) }"
                    @mouseenter="onHover(packet, rowIndex, i)"
                    @mouseleave="onLeave()"
                  >
                    {{ hex }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          <table>
            <tbody>
              <tr v-for="(row, rowIndex) in displayDataPacket(packet)" :key="'sep-' + rowIndex">
                <td class="chars">|</td>
              </tr>
            </tbody>
          </table>

          <table>
            <tbody>
              <tr v-for="(row, rowIndex) in displayDataPacket(packet)" :key="'char-' + rowIndex">
                <td class="chars">
                  <span
                    v-for="(char, i) in row.chars"
                    :key="i"
                    :class="{ highlighted: checkPacket(packet.timestamp.toString(), rowIndex, i) }"
                    @mouseenter="onHover(packet, rowIndex, i)"
                    @mouseleave="onLeave()"
                  >
                    {{ char }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>

.highlighted {
  background-color: orange;
}

.hex-tables {
  display: flex;
  flex-direction: row;
}

.packet-viewer {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  gap: 1rem;
  width: 100%;
  height: 100%;
  overflow-y: scroll;
  overflow-x: hidden;

  /* font-family: monospace; */
}

.chat-row {
  display: flex;
  width: 100%;
}

.chat-row.left {
  justify-content: flex-start;
}

.chat-row.right {
  justify-content: flex-end;
}

.chat-bubble {
  max-width: 80%;
  padding: 0.75rem;
  border-radius: 1rem;
  background: rgb(66, 74, 82);
  word-break: break-word;
}

.chat-row.right .chat-bubble {
  background: #007aff;
  /* blue bubble */
  color: white;
}

.hex-viewer table {
  border-collapse: collapse;
}

.hex-viewer td {
  padding: 2px 5px;
}

.hex span {
  display: inline-block;
  width: 25px;
  text-align: center;
}

.chars span {
  display: inline-block;
  width: 15px;
  text-align: center;
}
</style>