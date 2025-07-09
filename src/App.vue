<template>
  <main class="pt-8">
    <RouterView></RouterView>
  </main>
  <nav class="p-3 fixed bottom-0 right-0 left-0 bg-gray-700">
    <router-link to="/">Home</router-link>
  </nav>
</template>

<script setup lang="ts">
import { StatusBar } from '@capacitor/status-bar';
import {onMounted} from "vue";

const hideStatusBar = async () => {
  await StatusBar.hide();
};

onMounted(async () => {
  hideStatusBar();
})
</script>
