<script lang="ts">

import HorizontalDivision from './layout/HorizontalDivision.vue';
import Menubar from './components/MenuBar.vue';
import FootBar from './components/FootBar.vue';
import HistoryView from './components/HistoryView.vue';
import UserDialog from './components/UserDialog.vue';
import packetJson from './summary.json'
import { store } from './store'
import { queue } from '@lib/serial';
import type { Packet, UserHint } from "core";
import DataOverview from './components/DataOverview.vue';

export default {
  components: {
    HorizontalDivision,
    Menubar,
    FootBar,
    HistoryView,
    UserDialog,
    DataOverview
  },
  computed: {
    startTime() {
      console.log(`startTime: ${Math.min(...store.value.map(e => Number(e.timestamp)))}`)
      return Math.min(...store.value.map(e => Number(e.timestamp)))
    }
  },
  data() {
    return {
      store,
      // summary: packetJson.summary
      summary: null
    };
  },
  methods: {
    appendPacket(packet: (Packet | UserHint)) {
      if (queue.value !== null) {
        queue.value.push(packet);
      } else {
        store.value.push(packet);
      }
    }
  }
}

</script>

<template>
  <Menubar />
  <FootBar style="z-index: -1" />
  <HorizontalDivision :min-width-left="320" :min-width-right="320" class="main-layout">
    <template #left>
      <div class="data-panel">
        <HistoryView style="height: calc(100% - 3em)" :packets="store" :startTime="startTime" />
        <UserDialog style="height: 3em" :sendPacket="appendPacket" :startTime="startTime" />
      </div>
    </template>
    <template #right>
      <DataOverview :summary="summary" />
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
