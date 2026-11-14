let currentStatusFilter = 'all';
let currentNgFilter = 'all';
let currentTypeFilter = 'all';
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
            const res = await fetch(`/api/progress/${currentUser}`);
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
    renderList();
}

export async function setTrackerUser(user) {
    currentUser = user;
    await loadProgress();
}

async function saveProgress() {
    localStorage.setItem(`ds3_${trackerType}`, JSON.stringify(userProgress));
    if (currentUser) {
        try {
            await fetch(`/api/progress/${currentUser}`, {
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

    const updateActiveButton = (buttons, selectedBtn, activeClasses) => {
        buttons.forEach(b => {
            b.classList.remove(
                'bg-dsGold', 'text-black', 'font-bold',
                'bg-dsGold/20', 'text-dsGold', 'border-dsGold/40',
                'bg-cyan-500/20', 'text-cyan-400', 'border-cyan-500/60'
            );
            b.classList.add('text-gray-400', 'bg-dsDarkBg', 'border-dsBorder');
        });

        selectedBtn.classList.remove('text-gray-400', 'bg-dsDarkBg', 'border-dsBorder');
        selectedBtn.classList.add(...activeClasses);
    };

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            updateActiveButton(
                document.querySelectorAll('.filter-btn'),
                e.currentTarget,
                ['bg-dsGold', 'text-black', 'font-bold']
            );
            currentStatusFilter = e.currentTarget.dataset.status;
            renderList();
        });
    });

    document.querySelectorAll('.ng-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget;
            const isDlc = target.dataset.ng === 'DLC';

            updateActiveButton(
                document.querySelectorAll('.ng-filter-btn, .type-filter-btn'),
                target,
                isDlc 
                    ? ['bg-cyan-500/20', 'text-cyan-400', 'border-cyan-500/60', 'font-bold']
                    : ['bg-dsGold/20', 'text-dsGold', 'border-dsGold/40', 'font-bold']
            );

            currentNgFilter = target.dataset.ng;
            currentTypeFilter = 'all'; 
            renderList();
        });
    });

    // Type Filter (gestures, sorceries, pyromancies, miracles)
    document.querySelectorAll('.type-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget;
            const isDlc = target.dataset.type === 'dlc';

            updateActiveButton(
                document.querySelectorAll('.ng-filter-btn, .type-filter-btn'),
                target,
                isDlc 
                    ? ['bg-cyan-500/20', 'text-cyan-400', 'border-cyan-500/60', 'font-bold']
                    : ['bg-dsGold/20', 'text-dsGold', 'border-dsGold/40', 'font-bold']
            );

            currentTypeFilter = target.dataset.type;
            currentNgFilter = 'all'; 
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

function isQuestItem(item) {
    if (item.isQuest !== undefined) return item.isQuest;
    if (item.type === 'quest') return true;
    const loc = (item.location || '').toLowerCase();
    const npcList = ['Yoel', 'Yuria', 'Greirat', 'Siegward', 'Leonhard', 'Sirris', 'Heysel', 'Black Hand', 'Patches', 'Cornyx', 'Irina', 'Karla', 'Hawkwood'];
    return npcList.some(npc => loc.includes(npc.toLowerCase())) || loc.includes('quest') || loc.includes('npc');
}

function isDLCItem(item) {
    const loc = (item.location || '').toLowerCase();
    return loc.startsWith('dlc:') || loc.includes('dlc') || loc.includes('ariandel') || loc.includes('ringed city') || loc.includes('dreg heap');
}

function getSorceryType(item) {
    if (item.type) return item.type;
    const loc = (item.location || '').toLowerCase();
    if (loc.includes('soul of') || loc.includes('แลกจาก') || loc.includes('ludleth')) return 'boss';
    if (loc.includes('covenant') || loc.includes('aldrich')) return 'covenant';
    if (loc.includes('ซื้อ') || loc.includes('orbeck') || loc.includes('karla') || loc.includes('yuria')) return 'npc';
    return 'loot';
}

function getPyromancyType(item) {
    if (item.type) return item.type;
    const loc = (item.location || '').toLowerCase();
    if (loc.includes('soul of') || loc.includes('แลกจาก') || loc.includes('ludleth')) return 'boss';
    if (loc.includes('covenant') || loc.includes('mound-makers')) return 'covenant';
    if (loc.includes('ซื้อ') || loc.includes('cornyx') || loc.includes('karla')) return 'npc';
    return 'loot';
}

function getMiracleType(item) {
    if (item.type) return item.type;
    const loc = (item.location || '').toLowerCase();
    if (loc.includes('soul of') || loc.includes('แลกจาก') || loc.includes('ludleth')) return 'boss';
    if (loc.includes('covenant') || loc.includes('sunlight') || loc.includes('darkmoon')) return 'covenant';
    if (loc.includes('ซื้อ') || loc.includes('irina') || loc.includes('karla')) return 'npc';
    return 'loot';
}

function renderList() {
    const container = document.getElementById('listContainer');
    if (!container) return;

    container.style.minHeight = '350px';

    const filtered = itemsData.filter(item => {
    const isObtained = userProgress.includes(item.id);
    const itemIsDLC = isDLCItem(item);
    
    // Status Filter
    if (currentStatusFilter === 'obtained' && !isObtained) return false;
    if (currentStatusFilter === 'remaining' && isObtained) return false;

    const isDlcFilterSelected = (currentNgFilter === 'DLC' || currentTypeFilter === 'dlc');
    
    if (itemIsDLC && !isDlcFilterSelected) {
        return false;
    }

    // Rings Filter (rings.html)
    if (trackerType === 'rings') {
        if (currentNgFilter !== 'all') {
            if (currentNgFilter === 'DLC') {
                if (!itemIsDLC) return false;
            } else {
                const itemNg = getItemNG(item);
                if (itemNg !== currentNgFilter || itemIsDLC) return false;
            }
        }
    }

    // Gesture Filter (gestures.html)
    if (trackerType === 'gestures' && currentTypeFilter !== 'all') {
        const isQuest = isQuestItem(item);
        if (currentTypeFilter === 'quest' && !isQuest) return false;
        if (currentTypeFilter === 'general' && isQuest) return false;
    }

    // Sorceries Filter (sorceries.html)
    if (trackerType === 'sorceries' && currentTypeFilter !== 'all') {
        if (currentTypeFilter === 'dlc') {
            if (!itemIsDLC) return false;
        } else {
            const sType = getSorceryType(item);
            if (sType !== currentTypeFilter || itemIsDLC) return false;
        }
    }

    // Pyromancies Filter (pyromancies.html)
    if (trackerType === 'pyromancies' && currentTypeFilter !== 'all') {
        if (currentTypeFilter === 'dlc') {
            if (!itemIsDLC) return false;
        } else {
            const pType = getPyromancyType(item);
            if (pType !== currentTypeFilter || itemIsDLC) return false;
        }
    }

    // Miracles Filter (miracles.html)
    if (trackerType === 'miracles' && currentTypeFilter !== 'all') {
        if (currentTypeFilter === 'dlc') {
            if (!itemIsDLC) return false;
        } else {
            const mType = getMiracleType(item);
            if (mType !== currentTypeFilter || itemIsDLC) return false;
        }
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
        const itemIsDLC = isDLCItem(item);
        
        let tagHtml = '';
        if (itemIsDLC) {
            tagHtml = `<span class="text-[10px] px-1.5 py-0.5 rounded border border-cyan-500/40 text-cyan-400 ml-1.5"><i class="fa-solid fa-snowflake mr-1"></i>DLC</span>`;
        } else if (trackerType === 'rings') {
            const ngTag = getItemNG(item);
            tagHtml = `<span class="text-[10px] px-1.5 py-0.5 rounded border border-dsGold/40 text-dsGold ml-1.5">${ngTag}</span>`;
        } else if (trackerType === 'gestures') {
            const isQuest = isQuestItem(item);
            tagHtml = isQuest 
                ? `<span class="text-[10px] px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-400 ml-1.5"><i class="fa-solid fa-scroll mr-1"></i>NPC Quest</span>`
                : `<span class="text-[10px] px-1.5 py-0.5 rounded border border-gray-600 text-gray-400 ml-1.5">ทั่วไป</span>`;
        } else if (trackerType === 'sorceries') {
            const sType = getSorceryType(item);
            if (sType === 'boss') {
                tagHtml = `<span class="text-[10px] px-1.5 py-0.5 rounded border border-purple-500/40 text-purple-400 ml-1.5"><i class="fa-solid fa-skull mr-1"></i>Soul บอส</span>`;
            } else if (sType === 'npc') {
                tagHtml = `<span class="text-[10px] px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-400 ml-1.5"><i class="fa-solid fa-user-tag mr-1"></i>NPC/เควส</span>`;
            } else if (sType === 'covenant') {
                tagHtml = `<span class="text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/40 text-emerald-400 ml-1.5"><i class="fa-solid fa-shield-halved mr-1"></i>Covenant</span>`;
            } else {
                tagHtml = `<span class="text-[10px] px-1.5 py-0.5 rounded border border-blue-500/40 text-blue-400 ml-1.5"><i class="fa-solid fa-box-open mr-1"></i>เก็บตามฉาก</span>`;
            }
        } else if (trackerType === 'pyromancies') {
            const pType = getPyromancyType(item);
            if (pType === 'boss') {
                tagHtml = `<span class="text-[10px] px-1.5 py-0.5 rounded border border-purple-500/40 text-purple-400 ml-1.5"><i class="fa-solid fa-skull mr-1"></i>Soul บอส</span>`;
            } else if (pType === 'npc') {
                tagHtml = `<span class="text-[10px] px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-400 ml-1.5"><i class="fa-solid fa-book mr-1"></i>NPC/Tome</span>`;
            } else if (pType === 'covenant') {
                tagHtml = `<span class="text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/40 text-emerald-400 ml-1.5"><i class="fa-solid fa-shield-halved mr-1"></i>Covenant</span>`;
            } else {
                tagHtml = `<span class="text-[10px] px-1.5 py-0.5 rounded border border-orange-500/40 text-orange-400 ml-1.5"><i class="fa-solid fa-fire mr-1"></i>เก็บตามฉาก</span>`;
            }
        } else if (trackerType === 'miracles') {
            const mType = getMiracleType(item);
            if (mType === 'boss') {
                tagHtml = `<span class="text-[10px] px-1.5 py-0.5 rounded border border-purple-500/40 text-purple-400 ml-1.5"><i class="fa-solid fa-skull mr-1"></i>Soul บอส</span>`;
            } else if (mType === 'npc') {
                tagHtml = `<span class="text-[10px] px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-400 ml-1.5"><i class="fa-solid fa-book-bookmark mr-1"></i>NPC/Tome</span>`;
            } else if (mType === 'covenant') {
                tagHtml = `<span class="text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/40 text-emerald-400 ml-1.5"><i class="fa-solid fa-shield-halved mr-1"></i>Covenant</span>`;
            } else {
                tagHtml = `<span class="text-[10px] px-1.5 py-0.5 rounded border border-yellow-500/40 text-yellow-400 ml-1.5"><i class="fa-solid fa-sun mr-1"></i>เก็บตามฉาก</span>`;
            }
        }

        return `
            <div class="bg-dsCardBg border ${checked ? 'border-dsEmerald/50' : 'border-dsBorder'} p-3.5 rounded-lg flex items-center justify-between transition hover:border-dsGold/40">
                <div class="flex items-center gap-3.5">
                    <input type="checkbox" data-id="${item.id}" ${checked ? 'checked' : ''} class="custom-checkbox item-check">
                    <div>
                        <div class="font-bold text-sm ${checked ? 'text-dsEmerald line-through' : 'text-gray-200'}">
                            ${item.name} 
                            ${tagHtml}
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
export function exportBackup() {
    const backupData = {
        rings: JSON.parse(localStorage.getItem('ds3_rings') || '[]'),
        gestures: JSON.parse(localStorage.getItem('ds3_gestures') || '[]'),
        sorceries: JSON.parse(localStorage.getItem('ds3_sorceries') || '[]'),
        pyromancies: JSON.parse(localStorage.getItem('ds3_pyromancies') || '[]'),
        miracles: JSON.parse(localStorage.getItem('ds3_miracles') || '[]'),
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

export function importBackup(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const imported = JSON.parse(event.target.result);
            if (imported.rings && Array.isArray(imported.rings)) localStorage.setItem('ds3_rings', JSON.stringify(imported.rings));
            if (imported.gestures && Array.isArray(imported.gestures)) localStorage.setItem('ds3_gestures', JSON.stringify(imported.gestures));
            if (imported.sorceries && Array.isArray(imported.sorceries)) localStorage.setItem('ds3_sorceries', JSON.stringify(imported.sorceries));
            if (imported.pyromancies && Array.isArray(imported.pyromancies)) localStorage.setItem('ds3_pyromancies', JSON.stringify(imported.pyromancies));
            if (imported.miracles && Array.isArray(imported.miracles)) localStorage.setItem('ds3_miracles', JSON.stringify(imported.miracles));

            userProgress = imported[trackerType] || [];

            if (currentUser) {
                await fetch(`/api/progress/${currentUser}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        rings: imported.rings || [],
                        gestures: imported.gestures || [],
                        sorceries: imported.sorceries || [],
                        pyromancies: imported.pyromancies || [],
                        miracles: imported.miracles || []
                    })
                });
            }

            updateUI();
            renderList();

            alert('นำเข้าข้อมูลเรียบร้อยแล้ว!');
        } catch (err) {
            alert('ไฟล์ Backup ไม่ถูกต้อง หรือเกิดความผิดพลาดในการอ่านไฟล์');
        }
    };
    reader.readAsText(file);
}