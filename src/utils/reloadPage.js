import { useDatabase } from "@/composables/useDatabase";

const {
    closeDB
} = useDatabase();

export async function reloadPage() {
    window.location.reload()
}