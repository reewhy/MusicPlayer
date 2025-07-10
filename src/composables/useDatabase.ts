import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from "@capacitor-community/sqlite"
import { ref } from "vue"
import { Song } from "@/types/common"

let state: ReturnType<typeof createDatabase> | null = null

const sqlite = new SQLiteConnection(CapacitorSQLite)
const db = ref<SQLiteDBConnection | null>(null)

function createDatabase() {
    const openDB = async () => {
        try {
            db.value = await sqlite.createConnection(
                "goon_db",
                false,
                "no-encryption",
                1,
                false
            )
            await db.value.open()
            console.log("Database opened!")
        } catch (e) {
            console.error(e)
        }
    }

    const createTable = async () => {
        if (!db.value) return

        const queries = [
            `
                CREATE TABLE IF NOT EXISTS albums (
                                                      id TEXT PRIMARY KEY,
                                                      title TEXT,
                                                      artist TEXT,
                                                      artistId TEXT,
                                                      releaseDate TEXT,
                                                      cover TEXT,
                                                      genre TEXT,
                                                      trackCount INTEGER,
                                                      audioQuality TEXT,
                                                      label TEXT,
                                                      genreId INTEGER,
                                                      images TEXT
                );
            `,
            `
                CREATE TABLE IF NOT EXISTS playlists (
                                                         id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                         name TEXT,
                                                         image TEXT
                );
            `,
            `
                CREATE TABLE IF NOT EXISTS playlists_tracks (
                                                                playlist INTEGER,
                                                                track TEXT
                );
            `,
            `
                CREATE TABLE IF NOT EXISTS songs (
                                                     id TEXT PRIMARY KEY,
                                                     title TEXT,
                                                     artist TEXT,
                                                     artistId TEXT,
                                                     albumTitle TEXT,
                                                     albumId TEXT,
                                                     releaseDate TEXT,
                                                     genre TEXT,
                                                     duration REAL,
                                                     audioQuality TEXT,
                                                     version TEXT,
                                                     label TEXT,
                                                     labelId INTEGER,
                                                     upc TEXT,
                                                     mediaCount INTEGER,
                                                     parentalWarning INTEGER,
                                                     streamable INTEGER,
                                                     purchasable INTEGER,
                                                     previewable INTEGER,
                                                     genreId INTEGER,
                                                     genreSlug TEXT,
                                                     genreColor TEXT,
                                                     releaseDateStream TEXT,
                                                     releaseDateDownload TEXT,
                                                     maximumChannelCount INTEGER,
                                                     images TEXT,
                                                     isrc TEXT
                );
            `
        ]

        for (const query of queries) {
            await db.value.execute(query)
        }

        console.log("Tables created")
    }

    const dropAllTables = async () => {
        if (!db.value) return;

        const queries = [
            `DROP TABLE IF EXISTS albums;`,
            `DROP TABLE IF EXISTS playlists;`,
            `DROP TABLE IF EXISTS playlists_tracks;`,
            `DROP TABLE IF EXISTS songs;`
        ];

        for (const query of queries) {
            await db.value.execute(query);
        }

        console.log("All tables dropped.");
    };


    const getAllTracks = async () => {
        if (!db.value) return []
        const res = await db.value.query("SELECT * FROM songs;")
        const tracks = res.values ?? []

        console.log(tracks)

        // Parse images JSON back to object
        return tracks.map((track) => ({
            ...track,
            images: track.images ? JSON.parse(track.images) : null,
            parentalWarning: !!track.parentalWarning,
            streamable: !!track.streamable,
            purchasable: !!track.purchasable,
            previewable: !!track.previewable
        }))
    }

    const insertTrack = async (track: Song) => {
        if (!db.value) return

        const statement = `
            INSERT INTO songs (
                id, title, artist, artistId, albumTitle, albumId, releaseDate, genre,
                duration, audioQuality, version, label, labelId, upc, mediaCount,
                parentalWarning, streamable, purchasable, previewable,
                genreId, genreSlug, genreColor, releaseDateStream, releaseDateDownload,
                maximumChannelCount, images, isrc
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `

        const values = [
            track.id ?? '',
            track.title ?? '',
            track.artist ?? '',
            track.artistId ?? '',
            track.albumTitle ?? '',
            track.albumId ?? '',
            track.releaseDate ?? '',
            track.genre ?? '',
            track.duration ?? null,
            track.audioQuality ? JSON.stringify(track.audioQuality) : '',
            track.version ?? '',
            track.label ?? '',
            track.labelId ?? null,
            track.upc ?? '',
            track.mediaCount ?? null,
            track.parentalWarning ? 1 : 0,
            track.streamable ? 1 : 0,
            track.purchasable ? 1 : 0,
            track.previewable ? 1 : 0,
            track.genreId ?? null,
            track.genreSlug ?? '',
            track.genreColor ?? '',
            track.releaseDateStream ?? '',
            track.releaseDateDownload ?? '',
            track.maximumChannelCount ?? null,
            track.images ? JSON.stringify(track.images) : '',
            track.isrc ?? ''
        ]


        await db.value.run(statement, values)

        console.log(`Track ${track.id} inserted!`)
    }

    return {
        insertTrack,
        getAllTracks,
        openDB,
        createTable,
        dropAllTables
    }
}

export function useDatabase() {
    if (!state) {
        state = createDatabase()
    }

    return state
}
