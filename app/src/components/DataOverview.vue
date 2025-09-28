<script lang="ts">

export default {
  props: {
    summary: {
      default: {}
    }
  }
}

</script>


<template>

<div v-if="summary" class="summary-container">
  <div class="title">
    {{ summary.title }}
  </div>
  <div class="overview">
    {{ summary.overview }}
  </div>
  <div class="entry" v-for="entry in summary.entries">
    <div class="entry-title">
      {{ entry.title }}:
    </div>
    <div class="entry-description">
      {{ entry.description }}
    </div>
    <div class="field" v-for="field in entry.fields">
      <div class="field-name">
        {{ field.name }}
      </div>
      <div class="field-description">
        {{ field.description }}
      </div>
    </div>
  </div>
</div>
<div v-else class="empty-content">
  Waiting for AI response...
</div>

</template>

<style scoped>

.empty-content {
  display: flex;
  flex-direction: row;

  justify-content: center;
  align-items: center;
  text-align: center;

  font-size: 3rem;
  font-weight: bold;
}

.field-description {
  font-weight: 100;
}

.field-name {
  font-weight: 500;
}

.field {
  display: flex;
  flex-direction: column;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  padding: 0.5rem;
}

.entry-description {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  text-align: center;

  font-weight: 200;
  font-size: 1rem;
}

.entry-title {
  display: flex;
  flex-direction: row;
  width: 100%;
  justify-content: flex-start;
  text-align: left;

  font-weight: bold;
  font-size: 1rem;
}

.entry {
  display: flex;
  flex-direction: column;
  margin-left: 1rem;
  margin-right: 1rem;
  margin-top: 1rem;
  border-top: white solid 1px;
  padding: 1rem;
}

.title {
  display: flex;
  flex-direction: row;
  justify-content: center;
  text-align: center;
  padding: 2rem;

  font-weight: bolder;
  font-size: 3rem;
}

.overview {
  display: flex;
  flex-direction: row;
  justify-content: center;
  text-align: center;
  align-items: center;
  padding-left: 2rem;
  padding-right: 2rem;

  font-weight: 400;
  font-size: 1rem;
  font-style: italic;
}

.summary-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;

  overflow-y: scroll;
}

</style>