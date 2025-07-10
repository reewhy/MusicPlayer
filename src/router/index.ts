import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import HomeView from "@/views/HomeView.vue";

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    component: HomeView
  },
  {
    path: '/album/:id',
    name: 'album',
    component: () => import('../views/AlbumView.vue')
  },
  {
    path: '/library',
    component: () => import('../views/LibraryView.vue')
  },
  {
    path: '/settings',
    component: () => import('../views/SettingsView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  linkActiveClass: 'bg-gray-500 ',
  routes
})

export default router
