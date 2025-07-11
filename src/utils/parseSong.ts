import {Song} from "@/types/common";

export function parseSong(row: any): Song {
    try{
        const song = row;

        return {
            ...song,
            images: song.images ? JSON.parse(song.images) : null,
            audioQuality: song.audioQuality ? JSON.parse(song.audioQuality) : null,
            parentalWarning: !!song.parentalWarning,
            streamable: !!song.streamable,
            purchasable: !!song.purchasable,
            previewable: !!song.previewable
        };
    } catch (e) {
        console.error("Error while parsing: ", e);
        return row as Song;
    }

}