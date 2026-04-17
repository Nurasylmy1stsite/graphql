const GQL_URL = 'https://01yessenov.yu.edu.kz/api/graphql-engine/v1/graphql';
const AUTH_URL = 'https://01yessenov.yu.edu.kz/api/auth/signin';

setInterval(() => {
    document.getElementById('clock').innerText = new Date().toLocaleTimeString('ru-RU');
}, 1000);

document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    const userVal = document.getElementById('username').value;
    const passVal = document.getElementById('password').value;
    const encoded = btoa(`${userVal}:${passVal}`);

    try {
        const res = await fetch(AUTH_URL, { 
            method: 'POST', 
            headers: { 'Authorization': `Basic ${encoded}` } 
        });
        if (!res.ok) throw new Error();
        localStorage.setItem('token', await res.json());
        init();
    } catch { 
        document.getElementById('login-error').innerText = 'Invalid username or password'; 
    }
};

async function init() {
    const token = localStorage.getItem('token');
    if (!token) return;

    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');

    const query = `{
        user { login auditRatio totalUp totalDown }
        transaction(where: {type: {_eq: "xp"}}, order_by: {createdAt: asc}) { amount createdAt }
        level: transaction(where: {type: {_eq: "level"}}, order_by: {amount: desc}, limit: 1) { amount }
        skills: transaction(where: {type: {_like: "skill_%"}}) { type }
    }`;

    try {
        const res = await fetch(GQL_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ query })
        });
        const { data } = await res.json();
        render(data);
    } catch (err) { console.error('Data fetch error:', err); }
}

function render(data) {
    const user = data.user[0];
    
    document.getElementById('user-login').innerText = user.login.toUpperCase();
    document.getElementById('user-level').innerText = data.level[0]?.amount || 0;
    document.getElementById('lvl-fill').style.width = '65%'; // Dynamic width example
    
    document.getElementById('audit-ratio').innerText = user.auditRatio.toFixed(1);
    const totalXP = data.transaction.reduce((a, b) => a + b.amount, 0);
    document.getElementById('total-xp').innerText = (totalXP / 1000000).toFixed(2) + " MB";
    document.getElementById('audit-up').innerText = (user.totalUp / 1000000).toFixed(2) + " MB";
    document.getElementById('audit-down').innerText = (user.totalDown / 1000000).toFixed(2) + " MB";

    const skills = [...new Set(data.skills.map(s => s.type.replace('skill_', '').toUpperCase()))]
        .filter(s => !['STATS', 'AI'].includes(s));
    document.getElementById('skills-container').innerHTML = skills
        .map(s => `<span class="skill-tag">${s}</span>`).join('');

    drawCharts(data.transaction, user);
}

function drawCharts(xpData, user) {
    const xpCont = document.getElementById('xp-chart');
    const w = xpCont.clientWidth, h = xpCont.clientHeight;
    
    let current = 0;
    const pts = xpData.map((d, i) => { current += d.amount; return { x: i, y: current }; });
    const maxY = pts[pts.length - 1]?.y || 1;
    const maxX = pts.length - 1 || 1;
    const polyline = pts.map(p => `${(p.x / maxX) * w},${h - (p.y / maxY) * h}`).join(' ');

    xpCont.innerHTML = `<svg width="100%" height="100%"><polyline points="${polyline}" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linejoin="round" /></svg>`;

    const audCont = document.getElementById('audit-chart');
    const r = 60, circ = 2 * Math.PI * r;
    const ratio = user.totalUp / (user.totalUp + user.totalDown) || 0.5;
    const offset = circ * (1 - ratio);
    
    audCont.innerHTML = `
        <svg width="160" height="160" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="${r}" fill="none" stroke="#0f172a" stroke-width="12"/>
            <circle cx="80" cy="80" r="${r}" fill="none" stroke="#38bdf8" stroke-width="12" stroke-dasharray="${circ}" stroke-dashoffset="${offset}" transform="rotate(-90 80 80)" stroke-linecap="round"/>
            <text x="50%" y="55%" text-anchor="middle" fill="white" font-size="24px" font-weight="bold">${user.auditRatio.toFixed(1)}</text>
        </svg>`;
}

document.getElementById('logout-btn').onclick = () => { localStorage.clear(); location.reload(); };
if (localStorage.getItem('token')) init();