export function initUI() {
    
    const menuBtn = document.getElementById('menuBtn');
    const closeMenuBtn = document.getElementById('closeMenuBtn');
    const drawerMenu = document.getElementById('drawerMenu');
    const drawerOverlay = document.getElementById('drawerOverlay');

    function openMenu() { drawerMenu.classList.remove('translate-x-full'); drawerOverlay.classList.remove('hidden'); }
    function closeMenu() { drawerMenu.classList.add('translate-x-full'); drawerOverlay.classList.add('hidden'); }

    if(menuBtn) menuBtn.addEventListener('click', openMenu);
    if(closeMenuBtn) closeMenuBtn.addEventListener('click', closeMenu);
    if(drawerOverlay) drawerOverlay.addEventListener('click', closeMenu);
}

export function updateAuthUI(user) {
    const authZone = document.getElementById('authZone');
    if (!authZone) return;

    if (user) {
        authZone.innerHTML = `
            <div class="flex items-center gap-3 p-3 bg-dsCardBg rounded-lg border border-dsBorder w-full">
                <img src="${user.photoURL}" class="w-9 h-9 rounded-full border border-dsGold">
                <div class="flex-1 overflow-hidden">
                    <p class="text-xs text-dsGold font-bold truncate">${user.displayName}</p>
                    <p class="text-[10px] text-gray-400">Logged in via Google</p>
                </div>
                <button onclick="window.handleLogout()" class="p-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded transition" title="Logout"><i class="fa-solid fa-right-from-bracket"></i></button>
            </div>
        `;
    } else {
        authZone.innerHTML = `
            <button onclick="window.handleLogin()" class="w-full p-3 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/40 text-blue-300 transition flex items-center justify-center gap-2 font-bold text-sm">
                <i class="fa-brands fa-google"></i> Login with Google
            </button>
        `;
    }
}