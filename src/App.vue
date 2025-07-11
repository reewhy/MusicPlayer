<script setup lang="ts">
import { StatusBar } from '@capacitor/status-bar';
import {onMounted, computed, ref} from "vue";
import { useRoute } from "vue-router";
import { useDatabase } from "@/composables/useDatabase";
import OverlayScreen from "@/components/OverlayScreen.vue";
import { useOverlayStore } from "@/stores/overlayStore";

const overlay = useOverlayStore();

const {
  openDB,
  createTable,
  dropAllTables
} = useDatabase();
const route = useRoute();

const isHomeActive = computed(() => route.path === '/');
const isLibraryActive = computed(() => route.path === '/library');
const isSettingsActive = computed(() => route.path === '/settings');

const hideStatusBar = async () => {
  await StatusBar.hide();
};

onMounted(async () => {
  hideStatusBar();
  await openDB();
  await createTable();
})
</script>

<template>
  <!-- Background container with fixed gradient -->
  <div class="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900"></div>

  <!-- Main content area -->
  <main class="relative z-10 pt-8 min-h-screen">
    <RouterView></RouterView>
  </main>

  <!-- Bottom navigation with proper backdrop blur -->
  <nav class="fixed bottom-0 right-0 left-0 z-50">
    <!-- Backdrop blur layer -->
    <div class="absolute inset-0 bg-slate-900/80 backdrop-blur-xl"></div>

    <!-- Border -->
    <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent"></div>

    <!-- Navigation content -->
    <div class="relative z-10 p-4 flex justify-evenly">
      <router-link
          to="/"
          class="nav-item p-3 rounded-2xl text-xs transition-all duration-300 hover:bg-indigo-600/20"
          :class="isHomeActive ? 'bg-indigo-600/30 text-indigo-300 shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-indigo-300'"
      >
        <v-icon :name="isHomeActive ? 'md-home' : 'md-home-outlined'" scale="1.4"></v-icon>
        <span class="font-medium">Home</span>
      </router-link>

      <router-link
          to="/library"
          class="nav-item p-3 rounded-2xl text-xs transition-all duration-300 hover:bg-indigo-600/20"
          :class="isLibraryActive ? 'bg-indigo-600/30 text-indigo-300 shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-indigo-300'"
      >
        <v-icon :name="isLibraryActive ? 'md-librarymusic' : 'md-librarymusic-outlined'" scale="1.4"></v-icon>
        <span class="font-medium">Library</span>
      </router-link>

      <router-link
          to="/settings"
          class="nav-item p-3 rounded-2xl text-xs transition-all duration-300 hover:bg-indigo-600/20"
          :class="isSettingsActive ? 'bg-indigo-600/30 text-indigo-300 shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-indigo-300'"
      >
        <v-icon :name="isSettingsActive ? 'md-settings' : 'md-settings-outlined'" scale="1.4"></v-icon>
        <span class="font-medium">Settings</span>
      </router-link>
    </div>
  </nav>

  <OverlayScreen :enabled="overlay.isOpen"></OverlayScreen>
</template>

<style scoped>
.nav-item {
  @apply flex flex-col items-center;
}

/* Ensure backdrop-filter works properly */
.backdrop-blur-xl {
  -webkit-backdrop-filter: blur(24px);
  backdrop-filter: blur(24px);
}

/* Fallback for browsers that don't support backdrop-filter */
@supports not (backdrop-filter: blur(24px)) {
  .backdrop-blur-xl {
    background-color: rgba(15, 23, 42, 0.9);
  }
}
</style>