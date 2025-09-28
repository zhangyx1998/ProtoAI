<script lang="ts">
import { PropType, useTemplateRef } from 'vue';
import { BinaryParser } from '../models/BinaryParser'
import { ElementSize } from '@lib/util';
import PayloadTable from './PayloadTable.vue';

export default {
  setup(props, ctx) {
    const container = useTemplateRef<HTMLDivElement>(props.timestamp.toString())
    const size = new ElementSize(container);
    return { size };
  },
  components: {
    PayloadTable
  },
  props: {
    payload: {
      type: Object as PropType<ArrayBuffer>,
      required: true
    },
    displayOne: {
      type: Boolean,
      default: false
    },
    timestamp: {
      type: Object as PropType<BigInt>,
      required: true
    }
  },
  computed: {
    bytesPerRow() {
      if (this.size.width < 300) return 4;
      else if (this.size.width < 450) return 8;
      else if (this.size.width < 500) return 10;
      else if (this.size.width < 700) return 14;
      else if (this.size.width < 850) return 16;
      else if (this.size.width < 1000) return 16;
      else return 16;
    },
    displayPayload() {
      const parsedBinary = new BinaryParser(this.payload);

      const hexRows: Array<string[]> = [];
      const charRows: Array<string[]> = [];
      const spacerRows: Array<string[]> = [];
      const { hexValues, charValues } = parsedBinary;

      // Only display one row if prop is passed
      const rowCount = this.displayOne ? 1 : hexValues.length;

      // Insert rows to be displayed
      for (let i = 0; i < rowCount; i += this.bytesPerRow) {
        hexRows.push(hexValues.slice(i, i + this.bytesPerRow)),
        charRows.push(charValues.slice(i, i + this.bytesPerRow))
        spacerRows.push(['|'])
      }

      // fill extra space
      if (hexValues.length % this.bytesPerRow > 0) {
        for (let i = 0; i < hexRows[hexRows.length - 1].length % this.bytesPerRow; i++) {
          hexRows[hexRows.length - 1].push('-')
          charRows[charRows.length - 1].push('-')
        }
      }

      const rows: { hex: Array<string[]>, char: Array<string[]>, spacer: Array<string[]>} = {
        hex: hexRows,
        char: charRows,
        spacer: spacerRows
      }
      return rows;
    },
  }
}

</script>


<template>

<div :ref="timestamp.toString()" class="hex-tables">
  <PayloadTable :rows="displayPayload.hex" class="user-select"/>
  <PayloadTable :rows="displayPayload.spacer"/>
  <PayloadTable :rows="displayPayload.char"/>
</div>

</template>


<style scoped>

.hex-tables {
  display: flex;
  flex-direction: row;
}

</style>