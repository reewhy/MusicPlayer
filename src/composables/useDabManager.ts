import {Album, Song} from "@/types/common";
import {Capacitor, CapacitorHttp} from "@capacitor/core";
import {FileTransfer} from "@capacitor/file-transfer";
import {Directory, Filesystem, ProgressStatus} from "@capacitor/filesystem";
import { useDatabase } from "@/composables/useDatabase";

let state: ReturnType<typeof createDabManager> | null = null;

function createDabManager() {
    const ROOT_URL = Capacitor.isNativePlatform()
        ? "https://dab.yeet.su/api"
        : "/api"

    const {
        insertTrack
    } = useDatabase();

    // const MUSIC_URL = Capacitor.isNativePlatform()
    //     ? "https://streaming-qobuz-std.akamaized.net"
    //     : '/music'

    async function searchTracks(query: string, offset: number = 0): Promise<Song[] | null> {
        const finalUrl = `${ROOT_URL}/search?q=${encodeURIComponent(query)}&offset=${offset}&type=track`;
        const response = await fetchData(finalUrl);

        console.log(response);
        return response.tracks || null;
    }

    async function searchAlbums(query: string, offset: number = 0): Promise<Album[] | null> {
        const finalUrl = `${ROOT_URL}/search?q=${encodeURIComponent(query)}&offset=${offset}&type=album`;
        const response = await fetchData(finalUrl);

        console.log(response);
        return response.albums || null;
    }

    async function fetchAlbum(albumId: string): Promise<Album> {
        const finalUrl = `${ROOT_URL}/album?albumId=${albumId}`;
        const response = await fetchData(finalUrl);
        return await response.album;
    }

    async function downloadSong(song: Song, callback: (progress: ProgressStatus) => void): Promise<void> {
        try{
            const permission = await Filesystem.checkPermissions()

            if(permission.publicStorage != 'granted') await Filesystem.requestPermissions();

            await FileTransfer.addListener('progress',  (progress) => {
                callback(progress)
                const percent = progress.lengthComputable
                    ? Math.round((progress.bytes / progress.contentLength) * 100)
                    : 0;
                console.log(`Downloaded ${percent}%`);
            })

            let filePath;

            if(Capacitor.isNativePlatform()){
                const pathResult = await Filesystem.getUri({
                    path: `songs/${song.id}.flac`,
                    directory: Directory.Documents
                })

                filePath = pathResult.uri
            }

            const streamUrl = `${ROOT_URL}/stream?trackId=${song.id}&quality=27`;

            const finalUrl = await fetchData(streamUrl);

            const url = finalUrl.url;

            console.log(`Downloading ${url}`)
            console.log(`File path: ${filePath}`)

            let result;

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