<script>

export default {
  data() {
    return {
      inputText: ""
    }
  }
}

</script>

<template>
  <form class="user-dialog-container">
    <input v-model="inputText"/>
    <button>Send</button>
  </form>
</template>

<style scoped>

.user-dialog-container {
  display: flex;
  flex-direction: row;
}

input {
  height: 100%;
  padding: 10px;
  flex-grow: 1;
}

button {
  margin: 5px;
  padding: 10px;
}

</style>