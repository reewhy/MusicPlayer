import {Capacitor} from "@capacitor/core";
import {Directory, Filesystem} from "@capacitor/filesystem";
import {Song} from "@/types/common";

export async function getFilePath(song: Song) {
    if(Capacitor.isNativePlatform()){
        const pathResult = await Filesystem.getUri({
            path: `songs/${song.id}.flac`,
            directory: Directory.Documents
        })

        return pathResult.uri
    }
}