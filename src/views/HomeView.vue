<script setup lang="ts">
import { ref } from 'vue'
import { useDabManager } from "@/composables/useDabManager"
import SongItem from "@/components/SongItem.vue";
import AlbumItem from "@/components/AlbumItem.vue";

const { searchAlbums, searchTracks } = useDabManager()

// Reactive form data
const title = ref('')
const type = ref<'track' | 'album'>('track')

// Search results
const searchResults = ref<any[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

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

    console.log('Search results:', searchResults.value)
  } catch (err) {
    error.value = 'Search failed. Please try again.'
    console.error('Search error:', err)
  } finally {
    isLoading.value = false
  }
}
</script>
<template>
  <main class="max-w-3xl mx-auto p-5">
    <form @submit.prevent="search" class="flex flex-wrap md:flex-nowrap gap-3 mb-5 items-end">
      <div class="flex flex-col flex-grow">
        <input
            v-model="title"
            type="text"
            placeholder="Title"
            :disabled="isLoading"
            required
            class="px-3 py-2 border border-gray-300 rounded text-sm disabled:opacity-50"
        />
      </div>

      <div class="flex flex-col">
        <select
            v-model="type"
            :disabled="isLoading"
            class="px-3 py-2 border border-gray-300 rounded text-sm disabled:opacity-50"
        >
          <option value="track">Track</option>
          <option value="album">Album</option>
        </select>
      </div>

      <button
          type="submit"
          :disabled="isLoading || !title.trim()"
          class="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
      >
        {{ isLoading ? 'Searching...' : 'Search' }}
      </button>
    </form>

    <div v-if="error" class="text-red-700 bg-red-100 border border-red-300 px-4 py-3 rounded mb-5">
      {{ error }}
    </div>

    <div v-if="searchResults.length > 0" class="mt-5">
      <h3 class="mb-4 text-lg font-semibold text-gray-200">
        Results ({{ searchResults.length }})
      </h3>
      <div >
        <span
            v-if="type === 'track'"
            class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
        >
          <SongItem
              v-for="(result, index) in searchResults"
              :key="result.id || index"
              :result="result"
          ></SongItem>
        </span>
        <span
            class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
            v-else
        >
          <AlbumItem
              v-for="(result, index) in searchResults"
              :key="result.id || index"
              :result="result"
          ></AlbumItem>
        </span>
      </div>
    </div>
  </main>
</template>
