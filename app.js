const GQL_URL = 'https://01yessenov.yu.edu.kz/api/graphql-engine/v1/graphql';
const AUTH_URL = 'https://01yessenov.yu.edu.kz/api/auth/signin';

setInterval(() => {
    const clock = document.getElementById('clock');
    if (clock) clock.innerText = new Date().toLocaleTimeString('ru-RU');
}, 1000);

document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    const encoded = btoa(`${u}:${p}`);

    try {
        const res = await fetch(AUTH_URL, { 
            method: 'POST', 
            headers: { 'Authorization': `Basic ${encoded}` } 
        });
        if (!res.ok) throw new Error();
        localStorage.setItem('token', await res.json());
        initDashboard();
    } catch { 
        document.getElementById('login-error').innerText = 'Access Denied.'; 
    }
};

async function initDashboard() {
    const token = localStorage.getItem('token');
    if (!token) return;

    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');

    try {
        const res = await fetch(GQL_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ query: `{ user { login } }` })
        });
        const { data } = await res.json();
        fetchUserProfile(data.user[0].login);
    } catch (err) { console.error(err); }
}

async function fetchUserProfile(username) {
    const token = localStorage.getItem('token');
    const query = `
    query getUserData($login: String!) {
        user(where: {login: {_eq: $login}}) {
            login
            auditRatio
            totalUp
            totalDown
        }
        transaction(where: {user: {login: {_eq: $login}}, type: {_eq: "xp"}}, order_by: {createdAt: asc}) {
            amount
            path
        }
        level: transaction(where: {user: {login: {_eq: $login}}, type: {_eq: "level"}}, order_by: {amount: desc}, limit: 1) {
            amount
        }
        skills: transaction(where: {user: {login: {_eq: $login}}, type: {_like: "skill_%"}}) {
            type
        }
    }`;

    try {
        const res = await fetch(GQL_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables: { login: username } })
        });
        const { data } = await res.json();
        renderData(data);
    } catch (err) { console.error(err); }
}

function renderData(data) {
    const user = data.user[0];
    document.getElementById('user-login').innerText = user.login.toUpperCase();
    document.getElementById('user-level').innerText = data.level[0]?.amount || 0;
    document.getElementById('audit-ratio').innerText = user.auditRatio ? user.auditRatio.toFixed(1) : "0.0";
    document.getElementById('audit-up').innerText = formatBytes(user.totalUp || 0);
    document.getElementById('audit-down').innerText = formatBytes(user.totalDown || 0);

    let cumulativeXp = 0;
    const xpHistoryPoints = [{ val: 0 }];

    data.transaction.forEach(tr => {
        cumulativeXp += tr.amount;
        xpHistoryPoints.push({ val: cumulativeXp });
    });

    document.getElementById('total-xp').innerText = formatBytes(cumulativeXp);

    const forbidden = ['SYS-ADMIN', 'C', 'UNIX', 'TCP', 'STATS', 'AI', 'FRONT-END'];
    const skillSet = new Set();
    data.skills.forEach(s => {
        const name = s.type.replace('skill_', '').toUpperCase();
        if (!forbidden.includes(name)) skillSet.add(name);
    });
    skillSet.add('FRONTEND');

    document.getElementById('skills-container').innerHTML = [...skillSet]
        .map(s => `<span class="skill-tag">${s}</span>`).join('');

    drawPassFail(user.totalUp, user.totalDown);
    drawAudit(user.auditRatio || 0);
    drawXpChart(xpHistoryPoints);
}

function drawPassFail(up, down) {
    const total = up + down || 1;
    const passPerc = ((up / total) * 100).toFixed(0);
    const failPerc = (100 - passPerc).toFixed(0);
    
    document.getElementById('pass-fail-chart').innerHTML = `
        <div class="pf-bar-label"><span>Pass</span> <span>${passPerc}%</span></div>
        <div class="pf-track"><div class="pf-fill pass" style="width: ${passPerc}%"></div></div>
        <div class="pf-bar-label" style="margin-top:10px;"><span>Fail</span> <span>${failPerc}%</span></div>
        <div class="pf-track"><div class="pf-fill fail" style="width: ${failPerc}%"></div></div>
    `;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1000;
    const sizes = ['B', 'kB', 'MB', 'GB'];
    let i = Math.floor(Math.log(bytes) / Math.log(k));
    
    let val = bytes / Math.pow(k, i);
    if (val < 1 && i > 0) {
        i--;
        val = bytes / Math.pow(k, i);
    }
    
    return val.toFixed(val < 10 ? 2 : 0) + ' ' + sizes[i];
}

function drawXpChart(data) {
    const cont = document.getElementById('xp-chart');
    const w = cont.clientWidth || 600, h = cont.clientHeight || 200;
    const p = 45;

    const maxX = Math.max(data.length - 1, 1);
    const maxVal = data[data.length - 1].val || 1000;
    const maxY = maxVal * 1.1;

    const getX = (i) => p + (i / maxX) * (w - p * 2);
    const getY = (v) => h - p - (v / maxY) * (h - p * 2);

    let svg = '';
    
    [0, 0.5, 1].forEach(ratio => {
        const val = maxY * ratio;
        const y = getY(val);
        svg += `<line x1="${p}" y1="${y}" x2="${w-p}" y2="${y}" stroke="rgba(255,255,255,0.05)" />`;
        svg += `<text x="${p-10}" y="${y+4}" text-anchor="end" fill="#94a3b8" font-size="10px">${formatBytes(val)}</text>`;
    });

    const poly = data.map((pt, i) => `${getX(i)},${getY(pt.val)}`).join(' ');
    svg += `<polyline points="${poly}" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linejoin="round" />`;
    
    const lastX = getX(data.length - 1);
    const lastY = getY(data[data.length - 1].val);
    svg += `<circle cx="${lastX}" cy="${lastY}" r="5" fill="#1e293b" stroke="#38bdf8" stroke-width="2" />`;
    svg += `<text x="${lastX}" y="${lastY-15}" text-anchor="end" fill="#38bdf8" font-size="12px" font-weight="bold">${formatBytes(maxVal)}</text>`;

    cont.innerHTML = `<svg width="100%" height="100%">${svg}</svg>`;
}

function drawAudit(ratio) {
    const cont = document.getElementById('audit-chart');
    const r = 55, circ = 2 * Math.PI * r;
    const fill = ratio > 2 ? 1 : (ratio / 2); 
    cont.innerHTML = `
        <svg width="140" height="140">
            <circle cx="70" cy="70" r="${r}" fill="none" stroke="#0f172a" stroke-width="10"/>
            <circle cx="70" cy="70" r="${r}" fill="none" stroke="#38bdf8" stroke-width="10" 
                stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - fill)}" transform="rotate(-90 70 70)" stroke-linecap="round"/>
            <text x="50%" y="55%" text-anchor="middle" fill="white" font-size="22px" font-weight="bold">${ratio.toFixed(1)}</text>
        </svg>`;
}

document.getElementById('logout-btn').onclick = () => {
    localStorage.removeItem('token');
    location.reload();
};

if (localStorage.getItem('token')) initDashboard();