<script lang="ts">
import type { Packet, UserHint } from "core";

export default {
  props: {
    sendPacket: {
      type: Function,
      required: true
    },
    startTime: {
      type: Number,
      required: true
    }
  },
  data() {
    return {
      inputText: "",
      creationTime: 0
    }
  },
  created() {
    this.creationTime = Date.now();
  },
  computed: {
    validInput() {
      if (this.inputText === "") {
        return false
      }

      return true;
    },
  },
  methods: {
    submitMessage() {
      if (!this.validInput) {
        return
      }

      const packet: UserHint = {
        type: "USER-HINT",
        timestamp: Date.now() - this.startTime,
        payload: this.inputText
      }

      this.sendPacket(packet);
      this.inputText = ""
    }
  }
}

</script>

<template>
  <form @submit.prevent="submitMessage" class="user-dialog-container">
    <input class="input-box" v-model="inputText" />
    <button type="submit" :class="{ valid: validInput }">
      Send
    </button>
  </form>
</template>

<style scoped>
.user-dialog-container {
  display: flex;
  flex-direction: row;
  border: 1px solid gray;
  transition: border-color 0.5s;

  z-index: 255;
}

.user-dialog-container:focus,
.user-dialog-container:focus-within {
  display: flex;
  flex-direction: row;
  border-color: #3a62a9;
}

.input-box {
  margin: 5px;
  padding: 5px;
  flex-grow: 1;
  /* border-radius: 10px;
  border: rgb(56, 56, 56) solid 1px;
  transition: border-color 0.3s; */
}

.input-box:focus {
  border-color: gray;
}

button {
  margin: 5px;
  padding: 10px;
  transition: background-color 0.5s;
  transform: outline 0.5s;
}

button.valid {
  background-color: #3a62a9;
  border-color: white;
  border-radius: 3px;
}
</style>