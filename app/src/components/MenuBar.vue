<!-- ---------------------------------------------------
Copyright (c) 2025 Yuxuan Zhang, sing-lab@z-yx.cc
This source code is licensed under the MIT license.
You may find the full license in project root directory.
---------------------------------------------------- -->

<script setup lang="ts">
</script>

<template>
    <div class="menu-bar">
        <div class="logo">ProtoAI</div>
        <div class="spacer" style="flex-grow: 1"></div>
        <div class="menu-item">
            <button>Connect</button>
        </div>
    </div>
</template>

<style scoped lang="scss">
button {
    background-color: #3a62a9;
    color: #fff;
    border: none;
    padding: 8px 16px;
    margin: 0 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    transition: background-color 0.3s;

    &[disabled=true] {
        background-color: #666;
        cursor: not-allowed;
    }
}

.menu-bar {
    display: flex;
    align-items: center;
    background-color: #222;
    color: #fff;
}

.logo {
    font-size: 24px;
    font-weight: bold;
    font-style: italic;
    font-family: 'Times New Roman', Times, serif;
    color: #fff;
    padding: 10px;
}
</style>
