<script setup lang="ts">
import { useDatabase } from "@/composables/useDatabase";
import {onMounted, ref} from "vue";
import PlaylistItem from "@/components/PlaylistItem.vue";
import type {Album, Playlist} from "@/types/common"; // adjust if needed
import { useOverlayStore } from "@/stores/overlayStore";
import AlbumItem from "@/components/AlbumItem.vue";

const overlay = useOverlayStore();
const { getAllPlaylists, getAllAlbums } = useDatabase();

const playlists = ref<Playlist[]>([]);
const albums = ref<Album[]>([]);
const isLoading = ref(true);

onMounted(async () => {
  try {
    isLoading.value = true;
    playlists.value = await getAllPlaylists() || [];
    albums.value = await getAllAlbums() || [];
  } catch (error) {
    console.error("Error in LibraryView:", error);
    playlists.value = [];
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <main class="max-w-4xl mx-auto p-5 pb-24">
    <!-- Sticky header -->
    <div class="fixed top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-lg backdrop-saturate-150 border-b border-slate-700/50 shadow-lg">
      <div class="max-w-4xl mx-auto p-4">
        <h1 class="text-2xl font-bold text-white mb-4 mt-2 text-left">
          <span class="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Library
          </span>
        </h1>
      </div>
    </div>

    <div class="pt-16">
      <!-- Loading state -->
      <div v-if="isLoading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        <p class="mt-4 text-slate-400">Loading your playlists...</p>
      </div>

      <!-- Playlists found -->
      <div v-else-if="playlists.length > 0 || albums.length > 0">
        <h1 class="text-2xl font-bold text-white mb-4 text-center">
          <span class="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Playlists
          </span>
        </h1>
        <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <PlaylistItem
              v-for="playlist in playlists"
              :key="playlist.id"
              :result="playlist"
              class="transform hover:scale-105 transition-transform duration-200"
          />
        </div>
        <h1 class="text-2xl font-bold text-white mb-4 text-center mt-6">
          <span class="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Albums
          </span>
        </h1>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AlbumItem
              v-for="album in albums"
              :key="album.id"
              :result="album"
              :compact="true"
              class="transform hover:scale-105 transition-transform duration-200"
          />
        </div>
      </div>

      <!-- No playlists and albums -->
      <div v-else class="text-center py-16">
        <div class="mb-4">
          <v-icon name="md-musicnote" scale="3" class="text-slate-600"></v-icon>
        </div>
        <h3 class="text-xl font-semibold text-slate-400 mb-2">
          No playlists or albums found.
        </h3>
      </div>
    </div>

    <!-- Fab button -->
    <div
        class="fixed bottom-1/7 right-6 border bg-indigo-600/30 shadow-lg shadow-indigo-500/20 hover:bg-slate-700/60 p-4 rounded-xl shadow-2xl backdrop-blur-lg backdrop-saturate-150 border border-slate-700/50 cursor-pointer transform hover:scale-110 active:scale-95 transition-all duration-200 group"
        @click="overlay.openOver()"
    >
      <v-icon
          name="md-add"
          scale="2"
          class="text-white text-xl group-hover:rotate-90 transition-transform duration-200"
      ></v-icon>
    </div>
  </main>
</template>

<style scoped>
/* Ensure backdrop-filter works properly across browsers */
.backdrop-blur-lg {
  -webkit-backdrop-filter: blur(24px);
  backdrop-filter: blur(24px);
}

@supports not (backdrop-filter: blur(24px)) {
  .backdrop-blur-lg {
    background-color: rgba(15, 23, 42, 0.9);
  }
}
</style>