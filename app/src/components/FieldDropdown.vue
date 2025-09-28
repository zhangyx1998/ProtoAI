<script lang="ts">

import type { BinaryField } from "core";
import { defineComponent, PropType, useTemplateRef, watch } from 'vue';
import { ElementSize } from "@lib/util";

export default {
  setup(props, ctx) {
    const container = useTemplateRef<HTMLDivElement>(props.inferenceTitle)
    const size = new ElementSize(container);
    // watch(() => [size.width, size.height], ([w, h]) => console.log({ w, h }));
    return { container, size };
  },
  props: {
    fields: {
      type: Array<BinaryField>,
      required: true
    },
    inferenceTitle: {
      type: String,
      required: true
    }
  },
  data(): { isOpen: boolean } {
    return {
      isOpen: false
    }
  },
  methods: {
    toggleField() {
      this.isOpen = !this.isOpen;
    },
  }
}

</script>

<template>

<div 
  class="fields-section"

>
  <button @click="toggleField()">
    Fields
  </button>
  <div
    class="dropdown-content"
    :style="{
      height: isOpen ? `${size.height}px` : 0,
    }"
  >
    <div :ref="inferenceTitle">
      <div class="field-object" v-for="(field, index) in fields">
        <div>
          -
        </div>
        <div class="field-container">
          <div class="field-name">
            {{ field.name }}
          </div>
          <div class="field-description">
            {{ field.description }}
          </div>
        </div>
      </div>
    </div>
    
  </div>
</div>

</template>


<style scoped>

.field-object {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.field-space {
  height: 2px;
  background-color: rgb(39, 44, 49);
}

.fields-section {
  border-bottom-right-radius: 10px;
  border-bottom-left-radius: 10px;
  background-color: rgb(66, 74, 82);
  
  
  overflow: hidden;

  transition: border-color 0.3s;
}

button {
  all: unset;

  display: flex;
  flex-direction: column;
  justify-content: center;
  width: calc(100% - 1rem);

  padding-left: 0.5rem;
  padding-right: 0.5rem;
  height: 1.5rem;
  background-color: rgb(39, 44, 49);

  cursor: pointer;
}

.dropdown-content {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: height 0.5s ease-in-out;

}

.field-container {
  display: flex;
  flex-direction: column;

  justify-content: center;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  height: 3rem;
}

</style>