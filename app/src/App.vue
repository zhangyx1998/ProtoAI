<script lang="ts">

import HorizontalDivision from './layout/HorizontalDivision.vue';
import Menubar from './components/MenuBar.vue';
import FootBar from './components/FootBar.vue';
import HistoryView from './components/HistoryView.vue';
import UserDialog from './components/UserDialog.vue';
import { getPlaceholderData } from './helpers/createPlaceholderData';
import type { Packet, UserHint } from "core";

interface dataInterface {
  packetData: (Packet | UserHint)[];
}

export default {
  components: {
    HorizontalDivision,
    Menubar,
    FootBar,
    HistoryView,
    UserDialog
  },
  data(): dataInterface {
    return {
      packetData: getPlaceholderData()
    }
  }
}

</script>

<template>
  <Menubar />
  <FootBar />
  <HorizontalDivision :min-width-left="320" :min-width-right="320" class="main-layout">
    <template #left>
      <div class="data-panel">
        <HistoryView style="flex-grow: 1" :packets="packetData"/>
        <UserDialog style="height: 3em; border: 1px solid gray" />
      </div>
    </template>
    <template #right>
      <div class="inference-panel" placeholder="AI Inference">
      </div>
    </template>
  </HorizontalDivision>
</template>

<style>
:root {
  --menu-bar-height: 60px;
  --foot-bar-height: 50px;
}

.menu-bar {
  top: 0;
  left: 0;
  width: 100vw;
  height: var(--menu-bar-height);
}

.foot-bar {
  bottom: 0;
  left: 0;
  width: 100vw;
  height: var(--foot-bar-height);
}

.main-layout {
  position: absolute;
  top: var(--menu-bar-height);
  bottom: var(--foot-bar-height);
  left: 0;
  right: 0;
  z-index: -1;
}

.vertical-division {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding: 0 !important;
}

.vertical-division>* {
  width: 100%;
  margin: 0;
  padding: 0 !important;
}

.data-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>
