<script setup lang="ts">
import { StatusBar } from '@capacitor/status-bar';
import { onMounted, computed, defineAsyncComponent, ref } from "vue";
import { useRoute } from "vue-router";
import { useDatabase } from "@/composables/useDatabase";
import { useOverlayStore } from "@/stores/overlayStore";
import { useMusicManager } from "@/composables/useMusicManager";
import MusicOverlay from "@/components/MusicOverlay.vue";
import ExpandedMusicOverlay from "@/components/overlays/ExpandedMusicOverlay.vue";

const overlay = useOverlayStore();

const musicManager = useMusicManager();


const {
  openDB,
  createTable,
} = useDatabase();

const route = useRoute();
const isInitializing = ref(true);
const initializationError = ref<string | null>(null);

// Computed properties for navigation states
const isHomeActive = computed(() => route.path === '/');
const isLibraryActive = computed(() => route.path === '/library');
const isSettingsActive = computed(() => route.path === '/settings');

// Lazy load overlays only when needed
const OverlayScreen = defineAsyncComponent({
  loader: () => import('@/components/overlays/OverlayScreen.vue'),
  loadingComponent: () => null, // No loading component for overlays
  errorComponent: () => null,   // Handle errors gracefully
  delay: 0,
  timeout: 5000,
  onError: (error) => {
    console.error('Failed to load OverlayScreen:', error);
  }
});

const OverScreen = defineAsyncComponent({
  loader: () => import('@/components/overlays/OverScreen.vue'),
  loadingComponent: () => null,
  errorComponent: () => null,
  delay: 0,
  timeout: 5000,
  onError: (error) => {
    console.error('Failed to load OverScreen:', error);
  }
});

const PlaylistScreen = defineAsyncComponent({
  loader: () => import('@/components/overlays/PlaylistScreen.vue'),
  loadingComponent: () => null,
  errorComponent: () => null,
  delay: 0,
  timeout: 5000,
  onError: (error) => {
    console.error('Failed to load PlaylistScreen:', error);
  }
});

const ConfirmDialog = defineAsyncComponent({
  loader: () => import('@/components/ConfirmDialog.vue'),
  loadingComponent: () => null,
  errorComponent: () => null,
  delay: 0,
  timeout: 5000,
  onError: (error) => {
    console.error('Failed to load ConfirmDialog:', error);
  }
});

const AddScreen = defineAsyncComponent({
  loader: () => import('@/components/overlays/AddScreen.vue'),
  loadingComponent: () => null,
  errorComponent: () => null,
  delay: 0,
  timeout: 5000,
  onError: (error) => {
    console.error('Failed to load AddScreen:', error);
  }
});

// App initialization with proper error handling
const initializeApp = async () => {
  try {
    isInitializing.value = true;
    initializationError.value = null;

    // Hide status bar (mobile only)
    try {
      await StatusBar.hide();
    } catch (error) {
      console.warn('StatusBar.hide() failed (probably running in browser):', error);
    }

    // Initialize database
    await openDB();
    await createTable();

    console.log('App initialized successfully');
  } catch (error) {
    console.error('App initialization failed:', error);
    initializationError.value = error instanceof Error ? error.message : 'Unknown initialization error';
  } finally {
    isInitializing.value = false;
  }
};

// Preload critical overlays after app loads
const preloadCriticalOverlays = async () => {
  // Wait a bit to avoid blocking the main thread
  await new Promise(resolve => setTimeout(resolve, 1000));

  try {
    // Preload the most commonly used overlays
    await Promise.all([
      import('@/components/ConfirmDialog.vue'),
      import('@/components/overlays/OverlayScreen.vue')
    ]);
    console.log('Critical overlays preloaded');
  } catch (error) {
    console.warn('Failed to preload some overlays:', error);
  }
};

onMounted(async () => {
  await initializeApp();

  // Preload critical overlays in the background
  if (!initializationError.value) {
    preloadCriticalOverlays();
  }
});
</script>

<template>
  <!-- Background container with fixed gradient -->
  <div class="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900"></div>

  <!-- Loading screen during initialization -->
  <div v-if="isInitializing" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900">
    <div class="text-center">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mb-4"></div>
      <p class="text-slate-300 text-lg">Initializing app...</p>
    </div>
  </div>

  <!-- Error screen if initialization fails -->
  <div v-else-if="initializationError" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900">
    <div class="text-center max-w-md mx-4">
      <div class="text-red-400 mb-4">
        <svg class="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
        </svg>
      </div>
      <h2 class="text-white text-xl font-bold mb-2">Initialization Failed</h2>
      <p class="text-slate-300 text-sm mb-4">{{ initializationError }}</p>
      <button
          @click="initializeApp"
          class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Retry
      </button>
    </div>
  </div>

  <!-- Main content area -->
  <main v-else class="relative z-10 pt-8 min-h-screen">
    <RouterView></RouterView>
  </main>

  <!-- Bottom navigation with proper backdrop blur -->
  <nav v-if="!isInitializing && !initializationError" class="fixed bottom-0 right-0 left-0 z-50">
    <!-- Backdrop blur layer -->
    <div class="absolute inset-0 bg-slate-900/80 backdrop-blur-xl"></div>

    <!-- Border -->
    <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent"></div>

    <!-- Navigation content -->
    <div class="relative z-10 grid grid-cols-1">
      <MusicOverlay></MusicOverlay>
      <div class="flex justify-evenly p-4">
        <router-link
            to="/"
            class="nav-item p-3 rounded-2xl text-xs transition-all duration-300 hover:bg-indigo-600/20"
            :class="isHomeActive ? 'bg-indigo-600/30 text-indigo-300 shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-indigo-300'"
            aria-label="Home"
        >
          <v-icon :name="isHomeActive ? 'md-home' : 'md-home-outlined'" scale="1.4"></v-icon>
          <span class="font-medium">Home</span>
        </router-link>

        <router-link
            to="/library"
            class="nav-item p-3 rounded-2xl text-xs transition-all duration-300 hover:bg-indigo-600/20"
            :class="isLibraryActive ? 'bg-indigo-600/30 text-indigo-300 shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-indigo-300'"
            aria-label="Library"
        >
          <v-icon :name="isLibraryActive ? 'md-librarymusic' : 'md-librarymusic-outlined'" scale="1.4"></v-icon>
          <span class="font-medium">Library</span>
        </router-link>

        <router-link
            to="/settings"
            class="nav-item p-3 rounded-2xl text-xs transition-all duration-300 hover:bg-indigo-600/20"
            :class="isSettingsActive ? 'bg-indigo-600/30 text-indigo-300 shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-indigo-300'"
            aria-label="Settings"
        >
          <v-icon :name="isSettingsActive ? 'md-settings' : 'md-settings-outlined'" scale="1.4"></v-icon>
          <span class="font-medium">Settings</span>
        </router-link>
      </div>

    </div>
  </nav>

  <!-- Lazy loaded overlays - render once accessed, then keep in DOM for transitions -->
  <Suspense>
    <OverlayScreen v-show="overlay.isOpen" :enabled="overlay.isOpen" />
  </Suspense>

  <Suspense>
    <OverScreen v-show="overlay.isOverOpen" :enabled="overlay.isOverOpen" />
  </Suspense>

  <Suspense>
    <PlaylistScreen v-show="overlay.isPlaylistOpen" :enabled="overlay.isPlaylistOpen" />
  </Suspense>

  <ConfirmDialog/>
  <ExpandedMusicOverlay :is-visible="overlay.isMusicOpen"></ExpandedMusicOverlay>

  <Suspense>
    <AddScreen v-show="overlay.isAddOpen" :enabled="overlay.isAddOpen" />
  </Suspense>
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

/* Loading animation */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>