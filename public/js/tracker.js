let currentStatusFilter = 'all';
let currentNgFilter = 'all';
let searchKeyword = '';
let itemsData = [];
let userProgress = [];
let trackerType = '';
let currentUser = null;

export function initTracker(type, data, user) {
    trackerType = type;
    itemsData = data;
    currentUser = user;

    loadProgress();
    bindEvents();
    renderList();
}

async function loadProgress() {
    if (currentUser) {
        try {
            const res = await fetch(`/api/progress/${currentUser.uid}`);
            if (res.ok) {
                const data = await res.json();
                userProgress = data[trackerType] || [];
            } else {
                userProgress = JSON.parse(localStorage.getItem(`ds3_${trackerType}`) || '[]');
            }
        } catch (e) {
            console.error('Failed to load progress from server:', e);
            userProgress = JSON.parse(localStorage.getItem(`ds3_${trackerType}`) || '[]');
        }
    } else {
        userProgress = JSON.parse(localStorage.getItem(`ds3_${trackerType}`) || '[]');
    }
    updateUI();
}

async function saveProgress() {
    localStorage.setItem(`ds3_${trackerType}`, JSON.stringify(userProgress));
    if (currentUser) {
        try {
            await fetch(`/api/progress/${currentUser.uid}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [trackerType]: userProgress })
            });
        } catch (e) {
            console.error('Failed to sync progress to server:', e);
        }
    }
    updateUI();
}

function bindEvents() {
    // Search
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        searchKeyword = e.target.value.toLowerCase().trim();
        renderList();
    });

    // Status Filter
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => {
                b.classList.remove('bg-dsGold', 'text-black', 'font-bold');
                b.classList.add('text-gray-400', 'bg-dsDarkBg');
            });
            const target = e.currentTarget;
            target.classList.add('bg-dsGold', 'text-black', 'font-bold');
            target.classList.remove('text-gray-400', 'bg-dsDarkBg');
            currentStatusFilter = target.dataset.status;
            renderList();
        });
    });

    // NG Filter
    document.querySelectorAll('.ng-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.ng-filter-btn').forEach(b => {
                b.classList.remove('bg-dsGold/20', 'text-dsGold', 'border-dsGold/40', 'font-bold');
                b.classList.add('text-gray-400', 'bg-dsDarkBg');
            });
            const target = e.currentTarget;
            target.classList.add('bg-dsGold/20', 'text-dsGold', 'border-dsGold/40', 'font-bold');
            target.classList.remove('text-gray-400', 'bg-dsDarkBg');
            currentNgFilter = target.dataset.ng;
            renderList();
        });
    });

    // Reset Progress
    document.getElementById('resetBtn')?.addEventListener('click', async () => {
        if (confirm('คุณต้องการรีเซ็ต Progress ทั้งหมดหรือไม่?')) {
            userProgress = [];
            await saveProgress();
            renderList();
        }
    });

    // Export Backup
    document.getElementById('exportBtn')?.addEventListener('click', exportBackup);

    // Import Backup
    document.getElementById('importInput')?.addEventListener('change', importBackup);
}

function getItemNG(item) {
    if (item.ng) return item.ng;
    if (item.name.includes('+3')) return 'NG++';
    if (item.name.includes('+2')) return 'NG++';
    if (item.name.includes('+1')) return 'NG+';
    return 'NG';
}

function renderList() {
    const container = document.getElementById('listContainer');
    if (!container) return;

    const filtered = itemsData.filter(item => {
        const isObtained = userProgress.includes(item.id);
        
        // Status Filter
        if (currentStatusFilter === 'obtained' && !isObtained) return false;
        if (currentStatusFilter === 'remaining' && isObtained) return false;

        // NG Filter
        if (currentNgFilter !== 'all') {
            const itemNg = getItemNG(item);
            if (itemNg !== currentNgFilter) return false;
        }

        // Search Filter
        if (searchKeyword) {
            const matchName = item.name.toLowerCase().includes(searchKeyword);
            const matchLoc = item.location ? item.location.toLowerCase().includes(searchKeyword) : false;
            if (!matchName && !matchLoc) return false;
        }

        return true;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div class="text-center py-8 text-gray-500">ไม่พบรายการที่ค้นหา</div>`;
        return;
    }

    container.innerHTML = filtered.map(item => {
        const checked = userProgress.includes(item.id);
        const ngTag = getItemNG(item);
        
        return `
            <div class="bg-dsCardBg border ${checked ? 'border-dsEmerald/50' : 'border-dsBorder'} p-3.5 rounded-lg flex items-center justify-between transition hover:border-dsGold/40">
                <div class="flex items-center gap-3.5">
                    <input type="checkbox" data-id="${item.id}" ${checked ? 'checked' : ''} class="custom-checkbox item-check">
                    <div>
                        <div class="font-bold text-sm ${checked ? 'text-dsEmerald line-through' : 'text-gray-200'}">
                            ${item.name} 
                            <span class="text-[10px] px-1.5 py-0.5 rounded border border-dsGold/40 text-dsGold ml-1.5">${ngTag}</span>
                        </div>
                        <div class="text-xs text-gray-400 mt-0.5">${item.location || 'ไม่มีระบุสถานที่'}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Attach Event Listeners to Checkboxes
    document.querySelectorAll('.item-check').forEach(chk => {
        chk.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            if (e.target.checked) {
                if (!userProgress.includes(id)) userProgress.push(id);
            } else {
                userProgress = userProgress.filter(i => i !== id);
            }
            saveProgress();
            renderList();
        });
    });
}

function updateUI() {
    const total = itemsData.length;
    const current = userProgress.length;
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;

    const statsText = document.getElementById('statsText');
    const progressBar = document.getElementById('progressBar');

    if (statsText) statsText.innerText = `${current} / ${total} (${percent}%)`;
    if (progressBar) progressBar.style.width = `${percent}%`;
}

// Backup Export & Import
function exportBackup() {
    const backupData = {
        rings: JSON.parse(localStorage.getItem('ds3_rings') || '[]'),
        gestures: JSON.parse(localStorage.getItem('ds3_gestures') || '[]'),
        exportedAt: new Date().toISOString()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ds3_tracker_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importBackup(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const imported = JSON.parse(event.target.result);
            if (imported.rings && Array.isArray(imported.rings)) {
                localStorage.setItem('ds3_rings', JSON.stringify(imported.rings));
            }
            if (imported.gestures && Array.isArray(imported.gestures)) {
                localStorage.setItem('ds3_gestures', JSON.stringify(imported.gestures));
            }

            if (currentUser) {
                await fetch(`/api/progress/${currentUser.uid}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        rings: imported.rings || [],
                        gestures: imported.gestures || []
                    })
                });
            }

            alert('นำเข้าข้อมูลเรียบร้อยแล้ว!');
            window.location.reload();
        } catch (err) {
            alert('ไฟล์ Backup ไม่ถูกต้อง หรือเกิดความผิดพลาดในการอ่านไฟล์');
        }
    };
    reader.readAsText(file);
}