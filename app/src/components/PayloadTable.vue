<script lang="ts">
import { PropType } from 'vue';


export default {
  props: {
    rows: {
      type: Array as PropType<string[][]>,
      required: true
    }
  }
}

</script>


<template>

<table>
  <tbody>
    <tr v-for="(row, rowIndex) in rows">
      <td class="row-container">
        <span 
          v-for="(item, i) in row" 
          :key="i"
          class="single-element"
        >
          {{ item }}
        </span>
      </td>
    </tr>
  </tbody>
</table>

</template>


<style scoped>

.single-element {
  padding-left: 0.25rem;
  padding-right: 0.25rem;
}

</style>