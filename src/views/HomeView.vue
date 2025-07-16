<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useDabManager } from "@/composables/useDabManager"
import SongItem from "@/components/SongItem.vue";
import AlbumItem from "@/components/AlbumItem.vue";
import {Album, Song} from "@/types/common";

const { searchAlbums, searchTracks } = useDabManager()
const route = useRoute()
// Reactive form data
const title = ref('')
const type = ref<'track' | 'album'>('track')

// Search results
const searchResults = ref<Song[] | Album[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

// Search state management
const SEARCH_STATE_KEY = 'musicSearchState'

const saveSearchState = () => {
  const searchState = {
    title: title.value,
    type: type.value,
    results: searchResults.value,
    timestamp: Date.now()
  }
  sessionStorage.setItem(SEARCH_STATE_KEY, JSON.stringify(searchState))
}

const loadSearchState = () => {
  try {
    const saved = sessionStorage.getItem(SEARCH_STATE_KEY)
    if (saved) {
      const state = JSON.parse(saved)
      // Only restore state if it's less than 30 minutes old
      if (Date.now() - state.timestamp < 30 * 60 * 1000) {
        return state
      }
    }
  } catch (error) {
    console.error('Error loading search state:', error)
  }
  return null
}

const clearSearchState = () => {
  sessionStorage.removeItem(SEARCH_STATE_KEY)
}

const restoreSearchState = () => {
  const savedState = loadSearchState()
  if (savedState) {
    title.value = savedState.title || ''
    type.value = savedState.type || 'track'
    searchResults.value = savedState.results || []

    // Focus the search input after restoration
    // setTimeout(() => {
    //   const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement
    //   if (searchInput) {
    //     searchInput.focus()
    //   }
    // }, 100)
  }
}

const search = async () => {
  if (!title.value.trim()) {
    error.value = 'Please enter a title to search'
    return
  }

  try {
    isLoading.value = true
    error.value = null

    if (type.value === 'track') {
      searchResults.value = await searchTracks(title.value)
    } else {
      searchResults.value = await searchAlbums(title.value)
    }

    // Save search state after successful search
    saveSearchState()

    console.log('Search results:', searchResults.value)
  } catch (err) {
    error.value = 'Search failed. Please try again.'
    console.error('Search error:', err)
  } finally {
    isLoading.value = false
  }
}

// Auto-save search state when title or type changes
watch([title, type], () => {
  if (title.value || searchResults.value.length > 0) {
    saveSearchState()
  }
}, { deep: true })

// Clear search functionality
const clearSearch = () => {
  title.value = ''
  searchResults.value = []
  error.value = null
  clearSearchState()

  // Focus the search input after clearing
  setTimeout(() => {
    const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement
    if (searchInput) {
      searchInput.focus()
    }
  }, 100)
}

// Check if user is returning from a specific page
const isReturningUser = () => {
  return route.query.restored === 'true' || loadSearchState() !== null
}

onMounted(() => {
  // Check if we're restoring from URL params (coming back from album page)
  if (route.query.restored === 'true') {
    if (route.query.title) {
      title.value = route.query.title as string
    }
    if (route.query.type) {
      type.value = route.query.type as 'track' | 'album'
    }
    // Trigger search if we have a title
    if (title.value.trim()) {
      search()
    }
  } else {
    // Try to restore from session storage
    restoreSearchState()
  }
})
</script>

<template>
  <main class="max-w-4xl mx-auto p-5 pb-24">
    <!-- Search Header -->
    <div class="fixed top-0 left-0 right-0 z-10 bg-slate-900/90 z-50 backdrop-blur-lg backdrop-saturate-150 border-b border-slate-700/50 shadow-lg">

      <div class="max-w-4xl mx-auto p-4">
        <h1 class="text-2xl font-bold text-white mb-4 text-center">
          <span class="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Music Search
          </span>
        </h1>

        <form @submit.prevent="search" class="flex gap-2">
          <div class="flex-1 relative">
            <input
                v-model="title"
                type="search"
                placeholder="Search for music..."
                :disabled="isLoading"
                required
                enterkeyhint="search"
                class="w-full px-4 py-3 pl-12 pr-10 rounded-2xl text-sm bg-slate-800/60 border border-slate-600/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 disabled:opacity-50"
                @keydown.enter="search"
            />
            <div class="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400">
              <v-icon name="md-search" scale="1.1"></v-icon>
            </div>

            <!-- Clear button -->
            <button
                v-if="title || searchResults.length > 0"
                type="button"
                @click="clearSearch"
                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors duration-200 p-1 rounded-full hover:bg-slate-700/50"
            >
              <v-icon name="md-close" scale="1"></v-icon>
            </button>
          </div>

          <select
              v-model="type"
              :disabled="isLoading"
              class="px-4 py-3 rounded-2xl text-sm bg-slate-800/60 border border-slate-600/50 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 disabled:opacity-50"
          >
            <option value="track">Tracks</option>
            <option value="album">Albums</option>
          </select>

        </form>

        <!-- Search status indicator -->
        <div v-if="isReturningUser() && searchResults.length > 0" class="mt-2 text-center">
          <span class="text-xs text-indigo-300 bg-indigo-600/20 px-2 py-1 rounded-full">
            <v-icon name="md-restore" scale="0.8" class="mr-1"></v-icon>
            Search restored
          </span>
        </div>
      </div>
    </div>

    <!-- Content Area -->
    <div class="pt-32">
      <!-- Error Message -->
      <div v-if="error" class="mb-6 p-4 rounded-2xl bg-red-900/20 border border-red-500/30 text-red-300">
        <div class="flex items-center gap-2">
          <v-icon name="md-error" scale="1.1"></v-icon>
          {{ error }}
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        <p class="mt-4 text-slate-400">Searching...</p>
      </div>

      <!-- Search Results -->
      <div v-else-if="searchResults.length > 0" class="space-y-6">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-semibold text-white">
            Results
          </h3>
          <div class="flex items-center gap-3">
            <span class="px-3 py-1 rounded-full bg-indigo-600/20 text-indigo-300 text-sm font-medium">
              {{ searchResults.length }} {{ type === 'track' ? 'tracks' : 'albums' }}
            </span>
            <button
                @click="clearSearch"
                class="px-3 py-1 rounded-full bg-slate-700/50 text-slate-300 hover:text-white hover:bg-slate-600/50 text-sm transition-all duration-200"
            >
              Clear
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <SongItem
              v-if="type === 'track'"
              v-for="(result, index) in searchResults"
              :key="result.id || index"
              :result="result"
              class="transform hover:scale-105 transition-transform duration-200"
          />
          <AlbumItem
              v-else
              v-for="(result, index) in searchResults"
              :key="result.id || index"
              :result="result"
              class="transform hover:scale-105 transition-transform duration-200"
          />
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!isLoading && searchResults.length === 0 && !error" class="text-center py-16">
        <div class="mb-4">
          <v-icon name="md-musicnote" scale="3" class="text-slate-600"></v-icon>
        </div>
        <h3 class="text-xl font-semibold text-slate-400 mb-2">
          {{ title ? 'No Results Found' : 'Start Your Search' }}
        </h3>
        <p class="text-slate-500">
          {{ title ? `No ${type}s found for "${title}"` : 'Enter a song or album title to discover music' }}
        </p>
        <button
            v-if="title"
            @click="clearSearch"
            class="mt-4 px-4 py-2 rounded-xl bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 hover:text-indigo-200 transition-all duration-200"
        >
          Clear Search
        </button>
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