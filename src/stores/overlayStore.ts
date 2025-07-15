import { defineStore } from "pinia";
import { ref } from 'vue';
import {Album, Playlist, Song} from "@/types/common";

export const useOverlayStore = defineStore('overlay', () => {
    // States
    const isOptionsOpen = ref<boolean>(false);  // Song options
    const isOverOpen = ref<boolean>(false);     // Playlist editing
    const isPlaylistOpen = ref<boolean>(false); // Playlist options
    const isAddOpen = ref<boolean>(false);      // Playlist selection
    const isMusicOpen = ref<boolean>(false);                         // Music overlay
    const isQueueOpen = ref<boolean>(false);

    const inPlaylist = ref<boolean>(false);     // Check if we're in a playlist rn

    const editingPlaylist = ref<Playlist | null>(null); // Playlist we're editing
    const objData = ref<Song | Album>({});              // Song or albums we're working with

    function openOverlay(obj: any, inPlaylistOption: boolean = false) {
        objData.value = obj;
        isOptionsOpen.value = true;
        inPlaylist.value = inPlaylistOption;
    }

    function closeOverlay() {
        isOptionsOpen.value = false;
        objData.value = {};
    }

    function openOver() {
        isOverOpen.value = true;
    }

    function closeOver() {
        isOverOpen.value = false;
        editingPlaylist.value = null;
    }

    function openPlaylist(obj: Playlist) {
        editingPlaylist.value = obj;
        isPlaylistOpen.value = true;
    }

    function closePlaylist() {
        isPlaylistOpen.value = false;
    }

    function openAdd(){
        isAddOpen.value = true;
    }

    function closeAdd(){
        objData.value = {};
        isAddOpen.value = false;
    }

    function openMusic(){
        isMusicOpen.value = true;
    }

    function closeMusic(){
        isMusicOpen.value = false;
    }

    function openQueue(){
        isQueueOpen.value = true;
    }
    function closeQueue(){
        isQueueOpen.value = false;
    }

    return {
        openOverlay,
        closeOverlay,
        isOpen: isOptionsOpen,
        objData,
        isOverOpen,
        openOver,
        closeOver,
        editingPlaylist,
        isPlaylistOpen,
        openPlaylist,
        closePlaylist,
        openAdd,
        closeAdd,
        isAddOpen,
        inPlaylist,
        isMusicOpen,
        openMusic,
        closeMusic,
        isQueueOpen,
        openQueue,
        closeQueue,
    };
})