<script setup lang="ts">
import {Playlist} from "@/types/common";
import { RouterLink } from 'vue-router';

const props = defineProps<{
  result: Playlist
}>()

console.log("Playlists: ", JSON.stringify(props, null, 2))
</script>

<template>
  <RouterLink
      class="
        group relative overflow-hidden rounded-2xl bg-slate-800/60 border border-slate-600/50 p-4 transition-all duration-300
        hover:bg-slate-700/60 hover:border-slate-500/50 hover:shadow-lg hover:shadow-indigo-500/10 transform hover:scale-105
        active:bg-slate-700/60 active:border-slate-500/50 active:shadow-lg active:shadow-indigo-500/10 active:scale-105
      "
      :to="{name: 'playlist', params: {id: props.result.id}}"
  >
    <!-- Background gradient overlay -->
    <div class="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-transparent to-purple-900/20 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300"></div>

    <!-- Content grid -->
    <div class="relative z-10 grid grid-cols-1 grid-rows-[160px_1fr] gap-4">
      <!-- Album cover -->
      <div class="relative">
        <div class="aspect-square rounded-xl overflow-hidden bg-slate-700/50 group-hover:shadow-lg group-hover:shadow-indigo-500/20 group-active:shadow-lg group-active:shadow-indigo-500/20 transition-shadow duration-300">
          <img
              class="w-full h-full object-cover group-hover:scale-110 group-active:scale-110 transition-transform duration-500"
              :src="result.image"
              :alt="`${result.name} album cover`"
              loading="lazy"
          />
        </div>
      </div>

      <!-- Text content -->
      <div class="flex flex-col justify-center space-y-2">
        <h4 class="text-base font-semibold text-white group-hover:text-indigo-300 group-active:text-indigo-300 transition-colors duration-300 line-clamp-2">
          {{ result.name }}
        </h4>
      </div>
    </div>
  </RouterLink>
</template>

<style scoped>

</style>