import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import { updateAuthUI } from "./ui.js";
import { setTrackerUser } from "./tracker.js";

let auth;
let provider;
export let currentUserUID = null;

export async function initAuth() {
    return new Promise(async (resolve) => {
        try {
            const res = await fetch('/api/config');
            const config = await res.json();
            const app = initializeApp(config);
            auth = getAuth(app);
            provider = new GoogleAuthProvider();

            window.handleLogin = () => signInWithPopup(auth, provider).catch(console.error);
            window.handleLogout = () => signOut(auth);

            onAuthStateChanged(auth, (user) => {
                currentUserUID = user ? user.uid : null;
                updateAuthUI(user);
                setTrackerUser(currentUserUID); // trigger re-fetch data
                resolve(currentUserUID);
            });
        } catch (e) {
            console.error("Firebase init failed:", e);
            updateAuthUI(null);
            resolve(null);
        }
    });
    
}