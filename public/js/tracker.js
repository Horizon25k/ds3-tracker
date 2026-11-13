import { loadProgress, saveProgress } from './api.js';

let currentCategory = ''; // 'rings' or 'gestures'
let dataset = [];
let checkedItems = {};
let searchQuery = '';
let statusFilter = 'all';

export async function initTracker(category, data, userUid) {
    currentCategory = category;
    dataset = data;
    await reloadData();
    setupListeners();
    renderList();
}

export async function setTrackerUser(uid) {
    await reloadData();
    renderList();
}

async function reloadData() {
    const progress = await loadProgress();
    const arr = progress[currentCategory] || [];
    checkedItems = {};
    arr.forEach(id => checkedItems[id] = true);
}

function setupListeners() {
    document.getElementById('searchInput').addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderList();
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => {
                b.className = "filter-btn px-3 py-1.5 rounded-md text-gray-400 hover:text-white bg-dsDarkBg border border-dsBorder";
            });
            e.target.className = "filter-btn px-3 py-1.5 rounded-md bg-dsGold text-black";
            statusFilter = e.target.dataset.status;
            renderList();
        });
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
        if(confirm(`ยืนยันการล้างข้อมูล ${currentCategory} ทั้งหมด?`)) {
            checkedItems = {};
            saveCurrentState();
            renderList();
        }
    });
}

function saveCurrentState() {
    const progressArr = Object.keys(checkedItems).filter(id => checkedItems[id]);
    loadProgress().then(fullData => {
        fullData[currentCategory] = progressArr;
        saveProgress(fullData);
    });
}

window.toggleItem = function(id) {
    checkedItems[id] = !checkedItems[id];
    saveCurrentState();
    renderList();
}

function renderList() {
    const container = document.getElementById('listContainer');
    container.innerHTML = '';
    let obtainedCount = 0;

    const filtered = dataset.filter(item => {
        const isChecked = !!checkedItems[item.id];
        if (isChecked) obtainedCount++;
        
        if (statusFilter === 'obtained' && !isChecked) return false;
        if (statusFilter === 'remaining' && isChecked) return false;
        if (searchQuery && !item.name.toLowerCase().includes(searchQuery)) return false;
        return true;
    });

    filtered.forEach(item => {
        const isChecked = !!checkedItems[item.id];
        container.innerHTML += `
            <div class="p-4 rounded-xl border transition flex items-start gap-3 cursor-pointer ${isChecked ? 'bg-dsCardBg/40 border-dsBorder/40 opacity-60' : 'bg-dsCardBg border-dsBorder hover:border-dsGold/60'}" onclick="toggleItem('${item.id}')">
                <input type="checkbox" ${isChecked ? 'checked' : ''} class="custom-checkbox mt-1 shrink-0" onclick="event.stopPropagation(); toggleItem('${item.id}')">
                <div>
                    <h4 class="font-bold text-lg ${isChecked ? 'line-through text-gray-400' : 'text-dsGold'}">${item.name}</h4>
                    <p class="text-xs text-gray-300 mt-1"><i class="fa-solid fa-map-pin text-dsGold/70 mr-1"></i> ${item.location}</p>
                    <p class="text-xs text-gray-400 italic mt-1">${item.effect}</p>
                </div>
            </div>
        `;
    });

    // Update Stats
    const total = dataset.length;
    const pct = Math.round((obtainedCount / total) * 100);
    document.getElementById('statsText').textContent = `${obtainedCount} / ${total} (${pct}%)`;
    document.getElementById('progressBar').style.width = `${pct}%`;
}