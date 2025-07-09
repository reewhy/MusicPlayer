export interface AudioQuality {
    maximumBitDepth?: number;
    maximumSamplingRate?: number;
    isHiRes?: boolean;
}

export interface Images {
    small?: string;
    thumbnail?: string;
    large?: string;
    back?: string;
}

export interface Song {
    id?: string;
    title?: string;
    artist?: string;
    artistId?: string;
    albumTitle?: string;
    albumId?: string;
    releaseDate?: string;
    genre?: string;
    duration?: number;
    audioQuality?: AudioQuality;
    version?: string;
    label?: string;
    labelId?: number;
    upc?: string;
    mediaCount?: number;
    parentalWarning?: boolean;
    streamable?: boolean;
    purchasable?: boolean;
    previewable?: boolean;
    genreId?: number;
    genreSlug?: string;
    genreColor?: string;
    releaseDateStream?: string;
    releaseDateDownload?: string;
    maximumChannelCount?: number;
    images?: Images;
    isrc?: string;
}

export interface Album {
    id?: string;
    title?: string;
    artist?: string;
    artistId?: string;
    releaseDate?: string;
    cover?: string;
    genre?: string;
    trackCount?: number;
    audioQuality?: AudioQuality;
    label?: string;
    genreId?: number;
    images?: Images;
}

export interface AlbumsResponse {
    albums?: Album[];
}

export interface TracksResponse {
    tracks?: Song[];
}