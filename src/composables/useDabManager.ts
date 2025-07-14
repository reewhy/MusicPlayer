import {Album, Song} from "@/types/common";
import {Capacitor, CapacitorHttp} from "@capacitor/core";
import {FileTransfer} from "@capacitor/file-transfer";
import {Directory, Filesystem, ProgressStatus} from "@capacitor/filesystem";
import {getFilePath} from "@/utils/getFilePath";

let state: ReturnType<typeof createDabManager> | null = null;

function createDabManager() {
    // On mobile use absolute path
    // On web use Vite proxy
    const ROOT_URL = Capacitor.isNativePlatform()
        ? "https://dab.yeet.su/api"
        : "/api"

    // Search tracks on API
    async function searchTracks(query: string, offset: number = 0): Promise<Song[] | null> {
        const finalUrl = `${ROOT_URL}/search?q=${encodeURIComponent(query)}&offset=${offset}&type=track`;
        const response = await fetchData(finalUrl);

        console.log(response);
        return response.tracks || null;
    }

    // Search albums on API
    async function searchAlbums(query: string, offset: number = 0): Promise<Album[] | null> {
        const finalUrl = `${ROOT_URL}/search?q=${encodeURIComponent(query)}&offset=${offset}&type=album`;
        const response = await fetchData(finalUrl);

        console.log(response);
        return response.albums || null;
    }

    // Fetch an album from API
    async function fetchAlbum(albumId: string): Promise<Album> {
        const finalUrl = `${ROOT_URL}/album?albumId=${albumId}`;
        const response = await fetchData(finalUrl);
        return await response.album;
    }

    // Download a song
    async function downloadSong(song: Song, callback: (progress: ProgressStatus) => void): Promise<void> {
        try{
            // Get all permissions on mobile
            const permission = await Filesystem.checkPermissions()
            if(permission.publicStorage != 'granted') await Filesystem.requestPermissions();

            // Add download progress listener
            await FileTransfer.addListener('progress',  (progress) => {
                callback(progress)
                const percent = progress.lengthComputable
                    ? Math.round((progress.bytes / progress.contentLength) * 100)
                    : 0;
                console.log(`Downloaded ${percent}%`);
            })

            let filePath;
            // On mobile: download path
            // To-Do: change from documents to data
            if(Capacitor.isNativePlatform()){
                filePath = await getFilePath(song)
            }
            // To-Do: Implement web (electron/tauri)

            // Get url
            const streamUrl = `${ROOT_URL}/stream?trackId=${song.id}&quality=27`;
            const finalUrl = await fetchData(streamUrl);
            const url = finalUrl.url;

            console.log(`Downloading ${url}`)
            console.log(`File path: ${filePath}`)

            let result;

            // Download the file
            if(filePath){
                console.log('Officially downloading');
                result = await FileTransfer.downloadFile({
                    url: url,
                    path: filePath,
                    progress: true
                })

                console.log('Finised')
            }


            console.log(result)
        } catch(error){
            console.log(error)
        }
    }

    // Fetch data using CapacitorHTTP
    async function fetchData(url: string) {
        if (Capacitor.isNativePlatform()) {
            const response = await CapacitorHttp.get({
                url: url,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } else {
            const response = await fetch(url);
            return await response.json();
        }
    }

    return {
        searchTracks,
        searchAlbums,
        fetchAlbum,
        downloadSong
    };
}

export function useDabManager() {
    if(!state) {
        state = createDabManager();
    }
    return state;
}