// Improvements: don't reload the entire page
import router from "@/router";

export async function reloadPage() {
    router.go(0);
}