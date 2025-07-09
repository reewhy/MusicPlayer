<script setup lang="ts">
import { ref } from 'vue'
import { useDabManager } from "@/composables/useDabManager"

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
  <main>
    <form @submit.prevent="search">
      <div class="form-group">
        <input
            v-model="title"
            type="text"
            placeholder="Title"
            :disabled="isLoading"
            required
        />
      </div>

      <div class="form-group">
        <select v-model="type" :disabled="isLoading">
          <option value="track">Track</option>
          <option value="album">Album</option>
        </select>
      </div>

      <button type="submit" :disabled="isLoading || !title.trim()">
        {{ isLoading ? 'Searching...' : 'Search' }}
      </button>
    </form>

    <!-- Error message -->
    <div v-if="error" class="error">
      {{ error }}
    </div>

    <!-- Search results -->
    <div v-if="searchResults.length > 0" class="results">
      <h3>Results ({{ searchResults.length }})</h3>
      <div class="results-grid">
        <div
            v-for="(result, index) in searchResults"
            :key="result.id || index"
            class="result-item"
        >
          <h4>{{ result.title }}</h4>
          <p>{{ result.artist }}</p>
          <p v-if="type === 'album'">{{ result.trackCount }} tracks</p>
          <p v-if="type === 'track'">{{ result.albumTitle }}</p>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
main {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

form {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  align-items: end;
}

.form-group {
  display: flex;
  flex-direction: column;
}

input, select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

input {
  min-width: 200px;
}

button {
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

button:hover:not(:disabled) {
  background-color: #0056b3;
}

button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.error {
  color: #dc3545;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.results {
  margin-top: 20px;
}

.results h3 {
  margin-bottom: 15px;
  color: #333;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 15px;
}

.result-item {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  background-color: #f9f9f9;
}

.result-item h4 {
  margin: 0 0 8px 0;
  color: #333;
}

.result-item p {
  margin: 4px 0;
  color: #666;
  font-size: 14px;
}

@media (max-width: 600px) {
  form {
    flex-direction: column;
    align-items: stretch;
  }

  input {
    min-width: unset;
  }

  .results-grid {
    grid-template-columns: 1fr;
  }
}
</style>