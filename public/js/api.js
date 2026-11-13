import { currentUserUID } from './auth.js';
const STORAGE_KEY = 'ds3_tracker_v3';

export async function loadProgress() {
    if (currentUserUID) {
        try {
            const res = await fetch(`/api/progress/${currentUserUID}`);
            if (res.ok) return await res.json();
        } catch (e) { console.error("DB Load failed", e); }
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : { rings: [], gestures: [] };
}

export async function saveProgress(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (currentUserUID) {
        try {
            await fetch(`/api/progress/${currentUserUID}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (e) { console.error("DB Save failed", e); }
    }
    
}