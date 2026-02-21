let config = { url: '', user: '', pass: '' };

// 1. GERENCIADOR DE TELAS
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
    document.querySelector(`#${screenId} .focusable`)?.focus();
}

// 2. NAVEGAÇÃO D-PAD (Setas do Controle)
document.addEventListener('keydown', (e) => {
    const focusable = Array.from(document.querySelectorAll('.screen:not(.hidden) .focusable'));
    let index = focusable.indexOf(document.activeElement);

    if (e.key === "ArrowRight") index = (index + 1) % focusable.length;
    if (e.key === "ArrowLeft") index = (index - 1 + focusable.length) % focusable.length;
    if (e.key === "ArrowDown") index = (index + 3) % focusable.length; // Salto de linha aproximado
    if (e.key === "ArrowUp") index = (index - 3 + focusable.length) % focusable.length;

    if (focusable[index]) focusable[index].focus();
});

// 3. LOGIN
document.getElementById('btn-login').addEventListener('click', async () => {
    config.url = document.getElementById('dns').value;
    config.user = document.getElementById('user').value;
    config.pass = document.getElementById('pass').value;

    try {
        const res = await fetch(`${config.url}/player_api.php?username=${config.user}&password=${config.pass}`);
        const data = await res.json();
        if (data.user_info.auth === 1) {
            document.getElementById('status-bar').innerText = `Expira em: ${new Date(data.user_info.exp_date * 1000).toLocaleDateString()}`;
            showScreen('main-menu');
        }
    } catch (e) { alert("Erro de Login!"); }
});

// 4. CARREGAR CONTEÚDO (Live, Movies, Series)
async function loadContent(type) {
    let action = type === 'live' ? 'get_live_streams' : (type === 'vod' ? 'get_vod_streams' : 'get_series');
    const res = await fetch(`${config.url}/player_api.php?username=${config.user}&password=${config.pass}&action=${action}`);
    const data = await res.json();
    
    const grid = document.getElementById('item-grid');
    grid.innerHTML = '';
    showScreen('list-screen');

    data.slice(0, 40).forEach(item => { // Limite de 40 para performance na TV
        const div = document.createElement('div');
        div.className = "tile-item focusable";
        div.tabIndex = 0;
        div.innerHTML = `<img src="${item.stream_icon || item.cover}" width="100%"><p>${item.name}</p>`;
        div.onclick = () => playMedia(item.stream_id || item.series_id, type);
        grid.appendChild(div);
    });
}

// 5. PLAYER + EPG + SINOPSE
async function playMedia(id, type) {
    const video = document.getElementById('main-video');
    let streamUrl = "";

    if (type === 'live') {
        streamUrl = `${config.url}/live/${config.user}/${config.pass}/${id}.ts`;
        updateEPG(id);
    } else {
        streamUrl = `${config.url}/movie/${config.user}/${config.pass}/${id}.mp4`;
    }

    video.src = streamUrl;
    showScreen('player-screen');
}

async function updateEPG(id) {
    const res = await fetch(`${config.url}/player_api.php?username=${config.user}&password=${config.pass}&action=get_short_epg&stream_id=${id}`);
    const data = await res.json();
    if (data.epg_listings?.[0]) {
        const prog = data.epg_listings[0];
        document.getElementById('epg-title').innerText = atob(prog.title);
        document.getElementById('epg-desc').innerText = atob(prog.description);
        
        // Lógica de Lembrete
        document.getElementById('btn-reminder').onclick = () => {
            const start = new Date(prog.start).getTime();
            const delay = start - Date.now();
            if (delay > 0) {
                setTimeout(() => alert(`HORA DE VER: ${atob(prog.title)}`), delay);
                alert("Lembrete definido!");
            }
        };
    }
}

function closePlayer() {
    document.getElementById('main-video').pause();
    showScreen('main-menu');
}