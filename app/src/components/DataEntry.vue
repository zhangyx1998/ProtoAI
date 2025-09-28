<!-- <script lang="ts" setup>
import { Packet } from 'core';
const props = defineProps<{ packet: Packet }>()

</script> -->

<script lang="ts">
import { Packet, UserHint } from 'core';
import { PropType } from 'vue';
import TableDropdown from './TableDropdown.vue';
import FieldDropdown from './FieldDropdown.vue';

export default {
  components: {
    TableDropdown,
    FieldDropdown
  },
  props: {
    packet: {
      type: Object as PropType<Packet | UserHint>,
      required: true
    },
    startTime: {
      type: Number,
      required: true
    }
  },
  data(): { focus: Boolean } {
    return {
      focus: false
    }
  },
  computed: {
    getTimestamp() {
      const elapsed = Number(this.packet.timestamp) - this.startTime; // in ms

      const minutes = String(Math.floor(elapsed / 60000)).padStart(2, "0");
      const seconds = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, "0");
      const milliseconds = String(elapsed % 1000).padStart(3, "0"); // keep 3 digits

      return `${minutes}:${seconds}:${milliseconds}`;
    }
  },  
  methods: {
    toggleFocus() {
      this.focus = !this.focus
    },
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
        <div class="data-entry">
          <div v-if="!isUserHint(packet)" class="chat-bubble">
            <div @click="toggleFocus()">
              <div class="bubble-message">
                <div class="message-left">
                  <div class="title" v-if="packet.inferred">
                    {{ packet.inferred.title }}
                  </div>
                  <div class="title" v-else>
                    Unknown Packet
                  </div>
                </div>
                <div class="timestamp">
                  {{ getTimestamp }}
                </div>
              </div>
            </div>
            <div class="description" v-if="packet.inferred">
              {{ packet.inferred.description }}
            </div>
            <TableDropdown :timestamp="packet.timestamp" :payload="packet.payload" />
            <div v-if="packet.inferred">
              <FieldDropdown :fields="packet.inferred.fields" :inferenceTitle="packet.inferred.title" />
            </div>
            
          </div>

          <div v-else class="chat-bubble">
            <div class="user-hint">
              <div class="message-title">
                {{ packet.payload }}
              </div>
              <div class="timestamp">
                {{ getTimestamp }}
              </div>
            </div>
          </div>
    </div>
</template>


<style scoped>

.bubble-message {
  display: flex;
  flex-direction: row;

  justify-content: space-between;
}

.description {
  overflow-wrap: break-word;
  padding-bottom: 0.5rem;
}

.user-hint {
  display: flex;
  flex-direction: row;

  justify-content: flex-end;
}

.title {
  font-size: 1.2rem;
  font-weight: 800;
}

.message-title {
  font-size: 1rem;
  font-weight: 300;
}

.timestamp {
  font-size: 0.8rem;
  font-weight: 200;
  padding-left: 0.5rem;
  
  font-style: italic;
}

.data-entry {
  width: 100%;
}

</style>