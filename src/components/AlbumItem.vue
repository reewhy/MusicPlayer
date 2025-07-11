<script setup lang="ts">
const props = defineProps({
  result: Object
})
</script>

<template>
  <RouterLink
      class="
        group relative overflow-hidden rounded-2xl bg-slate-800/60 border border-slate-600/50 p-4 transition-all duration-300
        hover:bg-slate-700/60 hover:border-slate-500/50 hover:shadow-lg hover:shadow-indigo-500/10 transform hover:scale-105
        active:bg-slate-700/60 active:border-slate-500/50 active:shadow-lg active:shadow-indigo-500/10 active:scale-105
      "
      :to="{name: 'album', params: {id: props.result?.id}}"
  >
    <!-- Background gradient overlay -->
    <div class="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-transparent to-purple-900/20 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300"></div>

    <!-- Content grid -->
    <div class="relative z-10 grid grid-cols-[1fr_80px] gap-4">
      <!-- Text content -->
      <div class="flex flex-col justify-center space-y-2">
        <h4 class="text-base font-semibold text-white group-hover:text-indigo-300 group-active:text-indigo-300 transition-colors duration-300 line-clamp-2">
          {{ props.result?.title }}
        </h4>
        <p class="text-sm text-slate-400 group-hover:text-slate-300 group-active:text-slate-300 transition-colors duration-300">
          {{ props.result?.artist }}
        </p>
        <div class="flex items-center gap-2 text-xs text-slate-500">
          <v-icon name="md-album" scale="0.9" class="text-slate-500"></v-icon>
          <span>{{ props.result?.trackCount }} tracks</span>
        </div>

        <!-- Additional metadata -->
        <div v-if="props.result?.releaseDate" class="flex items-center gap-2 text-xs text-slate-500">
          <v-icon name="md-calendarmonth" scale="0.9" class="text-slate-500"></v-icon>
          <span>{{ new Date(props.result.releaseDate).getFullYear() }}</span>
        </div>

        <!-- Genre badge -->
        <div v-if="props.result?.genre" class="inline-flex">
          <span class="px-2 py-1 rounded-full bg-indigo-600/20 text-indigo-300 text-xs font-medium">
            {{ props.result.genre }}
          </span>
        </div>

        <!-- Audio quality indicator -->
        <div v-if="props.result?.audioQuality?.isHiRes" class="flex items-center gap-1 text-xs text-purple-400">
          <v-icon name="md-highquality" scale="0.9"></v-icon>
          <span>Hi-Res</span>
        </div>
      </div>

      <!-- Album cover -->
      <div class="relative">
        <div class="aspect-square rounded-xl overflow-hidden bg-slate-700/50 group-hover:shadow-lg group-hover:shadow-indigo-500/20 group-active:shadow-lg group-active:shadow-indigo-500/20 transition-shadow duration-300">
          <img
              class="w-full h-full object-cover group-hover:scale-110 group-active:scale-110 transition-transform duration-500"
              :src="props.result?.images?.large || props.result?.cover"
              :alt="`${props.result?.title} album cover`"
              loading="lazy"
          />
        </div>

        <!-- Play overlay on hover -->
        <div class="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-300 flex items-center justify-center rounded-xl">
          <div class="w-8 h-8  rounded-full flex items-center justify-center">
            <v-icon name="md-playarrow" scale="1.2" class="text-white ml-0.5"></v-icon>
          </div>
        </div>
      </div>
    </div>
  </RouterLink>
</template>