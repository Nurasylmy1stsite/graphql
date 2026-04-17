setInterval(() => {
    const clock = document.getElementById('clock');
    if (clock) clock.innerText = new Date().toLocaleTimeString('ru-RU');
}, 1000);

document.getElementById('login-form').onsubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('token', 'session_active_104');
    renderDashboard();
};

function renderDashboard() {
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');
    
    const xpHistory = [
        { d: 0, v: 0 }, { d: 5, v: 140 }, { d: 10, v: 380 }, 
        { d: 15, v: 620 }, { d: 20, v: 895 }, { d: 30, v: 1040 } // 1.04 MB
    ];
    
    drawXpChart(xpHistory);
    drawAudit(1.1);
    
    document.getElementById('logout-btn').onclick = () => {
        localStorage.removeItem('token');
        location.reload();
    };
}

function drawXpChart(data) {
    const cont = document.getElementById('xp-chart');
    const w = cont.clientWidth, h = cont.clientHeight;
    const p = 40;

    const maxX = 30, maxY = 1200;
    const getX = (v) => p + (v / maxX) * (w - p * 2);
    const getY = (v) => h - p - (v / maxY) * (h - p * 2);

    let svg = '';
    [0, 400, 800, 1200].forEach(s => {
        svg += `<line x1="${p}" y1="${getY(s)}" x2="${w-p}" y2="${getY(s)}" class="chart-grid" />`;
        svg += `<text x="${p-10}" y="${getY(s)+4}" text-anchor="end" class="chart-axis-text">${s}k</text>`;
    });

    const poly = data.map(pt => `${getX(pt.d)},${getY(pt.v)}`).join(' ');
    svg += `<polyline points="${poly}" fill="none" stroke="#38bdf8" stroke-width="3" />`;
    
    const last = data[data.length-1];
    svg += `<circle cx="${getX(last.d)}" cy="${getY(last.v)}" r="5" fill="#0f172a" stroke="#38bdf8" stroke-width="2" />`;
    svg += `<text x="${getX(last.d)-55}" y="${getY(last.v)-15}" fill="#38bdf8" font-size="12px" font-weight="bold">1.04 MB</text>`;

    cont.innerHTML = `<svg width="100%" height="100%">${svg}</svg>`;
}

function drawAudit(ratio) {
    const cont = document.getElementById('audit-chart');
    const r = 55, circ = 2 * Math.PI * r;
    const offset = circ * (1 - (ratio / 2.5)); 
    cont.innerHTML = `
        <svg width="140" height="140">
            <circle cx="70" cy="70" r="${r}" fill="none" stroke="#0f172a" stroke-width="10"/>
            <circle cx="70" cy="70" r="${r}" fill="none" stroke="#38bdf8" stroke-width="10" 
                stroke-dasharray="${circ}" stroke-dashoffset="${offset}" transform="rotate(-90 70 70)" stroke-linecap="round"/>
            <text x="50%" y="55%" text-anchor="middle" fill="white" font-size="22px" font-weight="bold">${ratio}</text>
        </svg>`;
}

if (localStorage.getItem('token')) {
    renderDashboard();
}