<script setup lang="ts">
import { useDatabase } from "@/composables/useDatabase";
import {onMounted, ref} from "vue";
import SongItem from "@/components/SongItem.vue";

const {
  getAllTracks
} = useDatabase();

const tracks = ref()
const isLoading = ref(true)

onMounted(async () => {
  tracks.value = await getAllTracks()
  isLoading.value = false
})
</script>

<template>
  <main class="max-w-4xl mx-auto p-5 pb-24">
    <div class="fixed top-0 left-0 right-0 z-10 bg-slate-900/90 z-50 backdrop-blur-lg backdrop-saturate-150 border-b border-slate-700/50 shadow-lg">
      <div class="max-w-4xl mx-auto p-4">
        <h1 class="text-2xl font-bold text-white mb-4 mt-2 text-left">
              <span class="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Library
              </span>
        </h1>
      </div>
    </div>
    <div class="pt-32">

      <!-- Loading State -->
      <div v-if="isLoading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        <p class="mt-4 text-slate-400">Searching...</p>
      </div>

      <!-- Search Results -->
      <div class="space-y-6" v-else-if="tracks.length > 0">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <SongItem
              v-for="(result, index) in tracks"
              :key="result.id || index"
              :result="result"
              class="transform hover:scale-105 transition-transform duration-200"
          />
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!isLoading && tracks.length === 0" class="text-center py-16">
        <div class="mb-4">
          <v-icon name="md-musicnote" scale="3" class="text-slate-600"></v-icon>
        </div>
        <h3 class="text-xl font-semibold text-slate-400 mb-2">
          No songs found.
        </h3>
      </div>
    </div>
  </main>
</template>

<style scoped>
/* Ensure backdrop-filter works properly */
.backdrop-blur-lg {
  -webkit-backdrop-filter: blur(24px);
  backdrop-filter: blur(24px);
}

/* Fallback for browsers that don't support backdrop-filter */
@supports not (backdrop-filter: blur(24px)) {
  .backdrop-blur-lg {
    background-color: rgba(15, 23, 42, 0.9);
  }
}
</style>