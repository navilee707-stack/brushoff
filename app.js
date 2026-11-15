/* app.js — sample data + rendering for each view */
const $ = (s, r = document) => r.querySelector(s);
const COLORS = ['#6d5dfc', '#3f8cff', '#f59e0b', '#1fa971', '#ec4899', '#06b6d4', '#a855f7'];
const initials = n => n.split(' ').map(w => w[0]).join('').slice(0, 2);
const av = (n, i = 0) => `<div class="av" style="background:${COLORS[(n.length + i) % COLORS.length]}">${initials(n)}</div>`;
const ic = (n, c = '') => `<i class="icon ${c}" data-lucide="${n}"></i>`;
const money = n => '$' + n.toLocaleString();
const head = (t, s, btn = '') => `<div class="head"><div><h1>${t}</h1><p>${s}</p></div>${btn}</div>`;
const stat = (label, icon, value, d, up = true, note = 'vs last month') => `
  <div class="card stat"><div class="label">${label}<div class="chip">${ic(icon)}</div></div>
  <div class="value">${value}</div>
  <div class="delta ${up ? 'up' : 'down'}">${ic(up ? 'trending-up' : 'trending-down')}${d} <span>${note}</span></div></div>`;
const pill = s => ({ Open: 'blue', 'In progress': 'amber', Resolved: 'green', Active: 'green', Trial: 'amber', Churned: 'red', Invited: 'amber', Suspended: 'red', Urgent: 'red', High: 'amber', Normal: 'blue', Low: '' }[s] || '');

/* ---------- helpers for tickets & projects ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = (k, seed) => { try { const v = JSON.parse(localStorage.getItem(k)); if (Array.isArray(v)) return v; } catch {} return seed(); };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
const ago = at => { const m = Math.max(0, Math.round((Date.now() - at) / 60000)); return m < 1 ? 'just now' : m < 60 ? m + 'm ago' : m < 1440 ? Math.floor(m / 60) + 'h ago' : Math.floor(m / 1440) + 'd ago'; };
const todayISO = (add = 0) => { const d = new Date(); d.setDate(d.getDate() + add); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const fmtDue = iso => { const d = new Date(iso + 'T00:00'); return isNaN(d) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) }); };
const canEdit = () => Auth.canManageTickets();
const TSTATUS = ['Open', 'In progress', 'Resolved'], PRIOS = ['Urgent', 'High', 'Normal', 'Low'], RANK = { Urgent: 0, High: 1, Normal: 2, Low: 3 };

/* ---------- data ---------- */
const customers = [
  ['Marco Reyes', 'Northwind Traders', 'Business', 'Active', 1240, 'Manila'],
  ['Aisha Khan', 'Brightpath Labs', 'Enterprise', 'Active', 4800, 'Dubai'],
  ['Liam O’Connor', 'Greenleaf Co.', 'Starter', 'Trial', 0, 'Dublin'],
  ['Sofia Alvarez', 'Pixel & Pine', 'Business', 'Active', 1190, 'Madrid'],
  ['Kenji Watanabe', 'Orbit Systems', 'Enterprise', 'Active', 5250, 'Tokyo'],
  ['Priya Nair', 'Lotus Retail', 'Starter', 'Churned', 0, 'Bengaluru'],
  ['Daniel Cruz', 'Harbor Freight Co.', 'Business', 'Active', 980, 'Cebu'],
  ['Emma Johansson', 'Nordlys AB', 'Enterprise', 'Active', 3900, 'Stockholm'],
  ['Carlos Mendez', 'Sol Studio', 'Starter', 'Trial', 0, 'Mexico City'],
  ['Hana Kim', 'Bloom Analytics', 'Business', 'Active', 1420, 'Seoul'],
];
const seedTickets = () => [
  ['TK-1048', 'Cannot export invoices to PDF', 'Export button spins forever on large invoices.', 'Marco Reyes', 'Urgent', 'Open', 12],
  ['TK-1047', 'SSO login redirect loop', 'Users bounce between IdP and app after the update.', 'Aisha Khan', 'Urgent', 'In progress', 60],
  ['TK-1046', 'Request: dark mode for reports', 'Would love a dark theme on the reports page.', 'Sofia Alvarez', 'Low', 'Open', 180],
  ['TK-1045', 'Webhook retries not firing', 'Failed deliveries are never retried.', 'Kenji Watanabe', 'High', 'In progress', 300],
  ['TK-1044', 'Wrong VAT on March invoice', 'Charged 20% instead of 7%.', 'Emma Johansson', 'High', 'Open', 420],
  ['TK-1043', 'Update billing email', 'Please change billing contact.', 'Daniel Cruz', 'Normal', 'Resolved', 1440],
  ['TK-1042', 'API rate limit increase', 'Need 5k req/min for launch week.', 'Hana Kim', 'Normal', 'Resolved', 1440],
  ['TK-1041', 'Mobile menu overlaps content', 'Android Chrome only.', 'Carlos Mendez', 'Normal', 'In progress', 2880],
].map(([id, title, desc, customer, priority, status, mins]) => ({ id, title, desc, customer, priority, status, at: Date.now() - mins * 60000 }));
let tickets = store('sidebar.tickets', seedTickets);
const visibleTickets = () => tickets.filter(t => Auth.canSeeTicket(t));      // Members: only their own
const tcount = () => {
  const mine = visibleTickets();
  const c = Object.fromEntries(TSTATUS.map(x => [x, mine.filter(t => t.status === x).length]));
  const live = mine.filter(t => t.status !== 'Resolved');
  return { ...c, open: live.length, urgent: live.filter(t => t.priority === 'Urgent').length };
};
const seedTasks = () => [
  ['Review Q4 roadmap with product', 'Prep the notes before the 3 PM call.', 0, 'High', 1, 'admin'],
  ['Reply to enterprise renewal (Orbit Systems)', '', 0, 'Urgent', 0, 'admin'],
  ['Triage new support tickets', 'Start with anything marked Urgent.', 0, 'Normal', 1, 'staff'],
  ['Publish release notes v2.8', '', 1, 'Normal', 0, 'admin'],
  ['Prepare onboarding deck for new hires', '', 2, 'Low', 0, 'staff'],
  ['Audit user permissions', 'Remove accounts that have not signed in for 90 days.', 3, 'High', 0, 'admin'],
  ['Send invoice reminders', '', 4, 'Normal', 0, 'staff'],
  ['Update knowledge base: SSO setup', '', 6, 'Low', 0, 'staff'],
].map(([title, desc, due, priority, done, byUser], i) => ({
  id: 'tsk-' + (i + 1), title, desc, due: todayISO(due), priority, done: !!done, byUser,
  by: byUser === 'admin' ? 'Ananya Sharma' : 'Marco Reyes', attachments: [], at: Date.now() - (i + 1) * 3600000,
}));
let tasks = store('sidebar.tasks', seedTasks);
const visibleTasks = () => tasks.filter(t => Auth.canSeeTask(t));        // Members: only their own
const taskStats = () => {
  const open = visibleTasks().filter(t => !t.done);
  return { open: open.length, today: open.filter(t => t.due <= todayISO()).length };
};
const seedProjects = () => [
  ['Website Redesign', 'New marketing site and pricing page.', 72, '2026-11-28', ['Ananya Sharma', 'Marco Reyes', 'Hana Kim']],
  ['Mobile App v2', 'Offline mode and push notifications.', 45, '2026-12-15', ['Kenji Watanabe', 'Priya Nair']],
  ['Billing Migration', 'Move subscriptions to the new provider.', 88, '2026-11-20', ['Daniel Cruz', 'Emma Johansson', 'Ananya Sharma']],
  ['Customer Portal', 'Self-serve invoices and ticket history.', 30, '2027-01-10', ['Sofia Alvarez', 'Carlos Mendez']],
  ['Data Warehouse', 'Centralised analytics and reporting.', 58, '2026-12-02', ['Aisha Khan', 'Liam O’Connor']],
  ['Security Audit', 'SOC 2 readiness and pen-test fixes.', 95, '2026-11-15', ['Ananya Sharma', 'Kenji Watanabe']],
].map(([name, desc, progress, due, team], i) => ({ id: 'p' + (i + 1), name, desc, progress, due, team }));
let projects = store('sidebar.projects', seedProjects);
const pstate = p => p.progress >= 100 ? 'Completed' : p.due < todayISO() ? 'Overdue' : 'Active';
const mails = [
  ['Aisha Khan', 'Renewal terms for 2027', 'Hi Ananya, we’d like to renew for another 24 months, provided the SSO fix lands before December. Could you confirm timelines and send an updated quote?', '9:42 AM', 1],
  ['Billing Bot', 'Invoice #2291 paid', 'Payment of $4,800.00 from Brightpath Labs was received and applied to invoice #2291. No further action is required.', '8:15 AM', 1],
  ['Kenji Watanabe', 'Webhook retry follow-up', 'Thanks for the update. We still see missed deliveries from last night. I’ve attached the logs from our side so your team can compare timestamps.', 'Yesterday', 0],
  ['Hana Kim', 'Great onboarding session', 'Just wanted to say thank you. The team learned a lot and the shared workspace tips were extremely helpful. Looking forward to the next session.', 'Yesterday', 0],
  ['Security Team', 'Quarterly access review', 'Please review the list of users with admin privileges and confirm who should keep access by Friday. The report is in the shared drive.', 'Mon', 0],
];
const users = [
  ['Ananya Sharma', 'ananya@company.com', 'Admin', 'Active', 'Just now'], ['Marco Reyes', 'marco@company.com', 'Manager', 'Active', '2h ago'],
  ['Hana Kim', 'hana@company.com', 'Support', 'Active', '4h ago'], ['Lee Ivan Jacinto', 'leeivan@company.com', 'Developer', 'Active', 'Yesterday'],
  ['Priya Nair', 'priya@company.com', 'Developer', 'Invited', '—'], ['Daniel Cruz', 'daniel@company.com', 'Support', 'Active', '3d ago'],
  ['Carlos Mendez', 'carlos@company.com', 'Viewer', 'Suspended', '2w ago'],
];

/* ---------- charts ---------- */
function areaChart(vals, labels, w = 640, h = 240) {
  const p = { l: 40, r: 12, t: 12, b: 28 }, max = Math.ceil(Math.max(...vals) / 10000) * 10000;
  const x = i => p.l + i * (w - p.l - p.r) / (vals.length - 1), y = v => h - p.b - v / max * (h - p.t - p.b);
  const pts = vals.map((v, i) => [x(i), y(v)]);
  const d = pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' ');
  const grid = [0, .25, .5, .75, 1].map(f => { const yy = y(max * f); return `<line class="grid-l" x1="${p.l}" x2="${w - p.r}" y1="${yy}" y2="${yy}"/><text x="${p.l - 8}" y="${yy + 4}" text-anchor="end">${Math.round(max * f / 1000)}k</text>`; }).join('');
  const xl = labels.map((l, i) => `<text x="${x(i)}" y="${h - 8}" text-anchor="middle">${l}</text>`).join('');
  const last = pts.at(-1);
  return `<svg class="chart" viewBox="0 0 ${w} ${h}">${grid}${xl}<path class="area" d="${d} L${x(vals.length - 1)} ${h - p.b} L${p.l} ${h - p.b}Z"/><path class="line" d="${d}"/><circle class="dot" cx="${last[0]}" cy="${last[1]}" r="5"/></svg>`;
}
function barChart(a, b, labels, w = 640, h = 200) {
  const p = { l: 8, r: 8, t: 8, b: 26 }, max = Math.max(...a, ...b), bw = (w - p.l - p.r) / labels.length;
  return `<svg class="chart" viewBox="0 0 ${w} ${h}">` + labels.map((l, i) => {
    const ha = a[i] / max * (h - p.t - p.b), hb = b[i] / max * (h - p.t - p.b), x0 = p.l + i * bw + bw * .2;
    return `<rect class="bar" x="${x0}" y="${h - p.b - ha}" width="${bw * .27}" height="${ha}" rx="4"/><rect class="bar alt" x="${x0 + bw * .3}" y="${h - p.b - hb}" width="${bw * .27}" height="${hb}" rx="4"/><text x="${p.l + i * bw + bw / 2}" y="${h - 8}" text-anchor="middle">${l}</text>`;
  }).join('') + '</svg>';
}
const STATUS = ['#6d5dfc', '#f59e0b', '#1fa971', '#9aa0c4'];
function donut(data, size = 150) {
  const r = 56, c = 2 * Math.PI * r, real = data.reduce((s, d) => s + d[1], 0), tot = real || 1; let off = 0;
  const segs = data.map((d, i) => { if (!d[1]) return ''; const len = d[1] / tot * c, s = `<circle r="${r}" cx="75" cy="75" fill="none" stroke="${STATUS[i]}" stroke-width="18" stroke-dasharray="${len - 3} ${c - len + 3}" stroke-dashoffset="${-off}" transform="rotate(-90 75 75)"/>`; off += len; return s; }).join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 150 150">${segs}<text x="75" y="72" text-anchor="middle" font-size="24" font-weight="800" fill="var(--text)">${real}</text><text x="75" y="92" text-anchor="middle" font-size="11" fill="var(--muted)">tickets</text></svg>
  <div class="legend">${data.map((d, i) => `<div><i style="background:${STATUS[i]}"></i>${d[0]}<b>${d[1]}</b></div>`).join('')}</div>`;
}

/* ---------- views ---------- */
/* ---------- BRUSHOFF: Reports (submissions) + Discover (community posts) ---------- */
const R_TYPES = ['Article', 'Research paper', 'Fact sheet', 'Law or policy', 'Story'];
const R_TOPICS = ['Violence and abuse', 'Workplace', 'Online harassment', 'School', 'Care work and pay', 'Men and masculinity', 'LGBTQ+', 'Health and stigma', 'Other'];
const tslug = t => t.toLowerCase().replace(/\+/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const seedReports = () => [
  ['RP-0001', 'Violence against women: key facts (WHO)', 'Fact sheet', 'Violence and abuse', 'Global estimates, risk factors and health effects of intimate partner and sexual violence against women.', 'https://www.who.int/news-room/fact-sheets/detail/violence-against-women', 240],
  ['RP-0002', 'Facts and figures: ending violence against women (UN Women)', 'Fact sheet', 'Violence and abuse', 'Explains the reporting gap: fewer than 40% of women who experience violence seek help, and fewer than 10% of those go to the police.', 'https://www.unwomen.org/en/what-we-do/ending-violence-against-women/facts-and-figures', 180],
  ['RP-0003', 'Republic Act 11313: the Safe Spaces Act (full text)', 'Law or policy', 'Online harassment', 'Defines gender-based sexual harassment in streets, public spaces, online, workplaces and schools, including catcalling and sexist, homophobic and transphobic slurs.', 'https://lawphil.net/statutes/repacts/ra2019/ra_11313_2019.html', 120],
  ['RP-0004', 'Violence and harassment at work: ILO–Lloyd’s Register Foundation–Gallup survey (2022)', 'Research paper', 'Workplace', 'A 121-country survey found 22.8% of workers have experienced violence or harassment at work, and only about half of victims told anyone.', '', 60],
].map(([id, title, type, topic, summary, link, mins]) => ({ id, title, type, topic, summary, link, file: '', anon: false, status: 'Published', by: 'BRUSHOFF team', byUser: 'team', at: Date.now() - mins * 60000, votes: {}, saved: [], comments: [] }));
let reports = store('sidebar.reports', seedReports);
const myUser = () => Auth.session()?.username || '';
const rvis = () => reports.filter(r => r.status === 'Published' || canEdit() || r.byUser === myUser());   // Members see published + their own pending
const rauthor = r => r.anon ? 'Anonymous' : r.by;
const rscore = r => Object.values(r.votes || {}).reduce((s, v) => s + v, 0);
const rday = at => new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const rwhen = at => new Date(at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const rpill = s => s === 'Published' ? 'green' : 'amber';
let selReport = null, dSort = 'Hot', dComm = 'all', openThreads = new Set();

const bstat = (label, icon, value, sub) => `<div class="card stat bstat"><div class="chip">${ic(icon)}</div><div><div class="value">${value}</div><div class="bl">${label}</div><span>${sub}</span></div></div>`;
function v1() {
  const l = rvis(), pub = l.filter(r => r.status === 'Published'), pend = l.filter(r => r.status === 'Pending');
  const cmts = l.reduce((s, r) => s + (r.comments || []).length, 0);
  const counts = R_TOPICS.map(t => [t, l.filter(r => r.topic === t).length]).filter(x => x[1]).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...counts.map(x => x[1]));
  const starter = l.filter(r => r.byUser === 'team');
  const act = [
    ...(starter.length ? [{ at: Math.max(...starter.map(r => r.at)), text: `Team added ${starter.length === 4 ? 'four' : starter.length} starter source${starter.length === 1 ? '' : 's'}` }] : []),
    ...l.filter(r => r.byUser !== 'team').map(r => ({ at: r.at, text: `${esc(rauthor(r))} submitted ${esc(r.id)}` })),
    ...l.flatMap(r => (r.comments || []).map(c => ({ at: c.at, text: `${esc(c.by)} commented on ${esc(r.id)}` }))),
  ].sort((a, b) => b.at - a.at).slice(0, 6);
  const facts = [['1 in 3', 'women worldwide face physical or sexual violence in their lifetime (WHO)'], ['22.8%', 'of workers have experienced violence or harassment at work (ILO, 2022)'], ['54%', 'of those victims told anyone about it (ILO, 2022)'], ['<10%', 'of women who seek help go to the police (UN Women)']];
  return `
  <div class="card hero">
    <div><div class="eyebrow">Gender and Society · Issue awareness</div>
      <h1>Some issues get <em>brushed off.</em></h1>
      <p>Share research, discover what others found, and join the conversation. Every article and every reply makes an overlooked issue easier to see.</p>
      <div class="hero-btns"><button class="btn" type="button" data-nav="2">${ic('upload')}Submit an article</button><button class="btn ghost" type="button" data-nav="3">${ic('compass')}Explore Discover</button></div></div>
    <svg class="hero-art" viewBox="0 0 320 200" aria-hidden="true"><circle cx="165" cy="100" r="82" fill="none" stroke="var(--border)" stroke-width="2"/><rect x="40" y="40" width="130" height="70" rx="16" fill="var(--surface)" stroke="var(--border)"/><path d="M70 110 L60 132 L92 110Z" fill="var(--surface)" stroke="var(--border)"/><rect x="58" y="58" width="70" height="6" rx="3" fill="var(--accent)"/><rect x="58" y="74" width="94" height="6" rx="3" fill="var(--muted)" opacity=".6"/><rect x="58" y="90" width="50" height="6" rx="3" fill="var(--muted)" opacity=".6"/><rect x="130" y="102" width="130" height="62" rx="16" fill="var(--accent)"/><rect x="152" y="122" width="76" height="6" rx="3" fill="#fff" opacity=".85"/><rect x="152" y="138" width="46" height="6" rx="3" fill="#fff" opacity=".6"/><path d="M30 150 Q100 120 170 150 T300 138" fill="none" stroke="#e8806a" stroke-width="6" stroke-linecap="round" stroke-dasharray="1 10"/></svg>
  </div>
  <div class="grid g4 mt">${bstat('Total submissions', 'file-text', l.length, 'Articles, research and stories')}${bstat('Pending review', 'clock', pend.length, 'Awaiting a moderator')}${bstat('Published', 'compass', pub.length, 'Visible in Discover')}${bstat('Comments', 'message-square', cmts, 'Community discussion')}</div>
  <div class="grid g21 mt">
    <div class="card"><h3>Recent submissions<a class="more" href="#" data-nav="2">View all</a></h3><div class="scroll"><table><thead><tr><th>Ref</th><th>Title</th><th>Type</th><th>Status</th></tr></thead><tbody>${l.slice().sort((a, b) => b.at - a.at).slice(0, 5).map(r => `<tr><td>${esc(r.id)}</td><td>${esc(r.title)}</td><td>${esc(r.type)}</td><td><span class="pill ${rpill(r.status)}">${r.status}</span></td></tr>`).join('') || '<tr><td colspan="4" class="empty">No submissions yet.</td></tr>'}</tbody></table></div></div>
    <div class="card"><h3>Submissions by topic</h3><div class="topic-bars">${counts.map(([t, n]) => `<div class="tb"><span>${esc(t)}</span><div class="bar-track"><div class="bar-fill" style="width:${n / max * 100}%"></div></div><b>${n}</b></div>`).join('') || '<div class="empty">Nothing yet.</div>'}</div></div>
  </div>
  <div class="card mt"><h3>Did you know?</h3><div class="facts">${facts.map((f, i) => `<div class="fact ${i === 1 ? 'hot' : ''}"><b>${f[0]}</b><span>${f[1]}</span></div>`).join('')}</div></div>
  <div class="grid g21 mt">
    <div class="card"><h3>Recent activity</h3><div class="list">${act.map(a => `<div class="row"><div class="grow"><b>${a.text}</b></div><time>${ago(a.at)}</time></div>`).join('') || '<div class="empty">No activity yet.</div>'}</div></div>
    <div><div class="card"><h3>Quick actions</h3><div class="qa">
      <button type="button" data-nav="2">${ic('upload')}Submit research</button><button type="button" data-nav="3">${ic('search')}Discover</button>
      <button type="button" data-soon="Myths vs facts">${ic('shield-check')}Myths vs facts</button><button type="button" data-soon="Take action">${ic('heart')}Take action</button></div></div>
    <div class="card note mt"><b>Together for a safer campus.</b><span>Every article you share and every comment you leave makes an overlooked issue easier to see.</span></div></div>
  </div>`;
}

/* ----- Reports ----- */
function v2() {
  const opt = a => a.map(o => `<option>${esc(o)}</option>`).join('');
  return head('Reports', 'Upload articles, research and stories. A moderator reviews each one before it appears in Discover.', `<button class="btn js-export" type="button">${ic('download')}Export CSV</button>`) + `
  <div class="grid g21 rp-grid">
    <div class="rp-stack">
      <form class="card rp-form" id="rf" autocomplete="off" novalidate>
        <h3>Submit an article or research</h3>
        <div class="rp-row"><label for="r-title">Title *</label><input class="field" id="r-title" maxlength="140" placeholder="e.g. Unpaid care work in rural households" /></div>
        <div class="rp-two"><div class="rp-row"><label for="r-type">Type</label><select class="field" id="r-type">${opt(R_TYPES)}</select></div><div class="rp-row"><label for="r-topic">Topic</label><select class="field" id="r-topic">${opt(R_TOPICS)}</select></div></div>
        <div class="rp-row"><label for="r-sum">Summary *</label><textarea class="field" id="r-sum" rows="4" maxlength="400" placeholder="What is it about, and what did it find? (a few sentences)"></textarea></div>
        <div class="rp-row"><label for="r-link">Link (optional)</label><input class="field" id="r-link" type="url" maxlength="300" placeholder="https://" /></div>
        <div class="rp-row"><label for="r-file">Attach a file (optional)</label><input class="field" id="r-file" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" /><small>PDF, DOC, PNG or JPG. Only the file name is kept in this demo.</small></div>
        <label class="rp-check"><input type="checkbox" id="r-anon" /> Post anonymously</label>
        <div class="set-foot"><button class="btn" type="submit">${ic('send')}Submit for review</button><p class="set-msg" id="rf-msg" role="status"></p></div>
      </form>
      <div class="card"><h3>Submission queue</h3>
        <div class="tools"><input class="field" id="rq" placeholder="Search title or ref" /><select class="field" id="rs"><option>All statuses</option><option>Pending</option><option>Published</option></select></div>
        <div class="scroll"><table><thead><tr><th>Ref</th><th>Title</th><th>Type</th><th>Submitted</th><th>Status</th></tr></thead><tbody id="rt"></tbody></table></div></div>
    </div>
    <div class="card rp-detail" id="rd"></div>
  </div>`;
}
function fillReports() {
  const q = ($('#rq').value || '').trim().toLowerCase(), s = $('#rs').value, l = rvis().slice().sort((a, b) => b.at - a.at);
  const rows = l.filter(r => (s === 'All statuses' || r.status === s) && (r.id + ' ' + r.title).toLowerCase().includes(q));
  if (!l.some(r => r.id === selReport)) selReport = l[0]?.id || null;
  $('#rt').innerHTML = rows.map(r => `<tr class="js-click ${r.id === selReport ? 'sel' : ''}" data-rep="${esc(r.id)}" tabindex="0"><td>${esc(r.id)}</td><td>${esc(r.title)}</td><td>${esc(r.type)}</td><td>${rday(r.at)}</td><td><span class="pill ${rpill(r.status)}">${r.status}</span></td></tr>`).join('') || '<tr><td colspan="5" class="empty">No submissions match.</td></tr>';
  const r = l.find(x => x.id === selReport);
  $('#rd').innerHTML = !r ? '<div class="empty">Select a submission to see its details.</div>' : `<h3>Submission details<span class="pill ${rpill(r.status)}">${r.status}</span></h3>
    ${[['Reference', r.id], ['Type', r.type], ['Topic', r.topic], ['Submitted', rwhen(r.at)], ['Author', rauthor(r)]].map(x => `<div class="kv"><span>${x[0]}</span><b>${esc(x[1])}</b></div>`).join('')}
    ${r.file ? `<div class="kv"><span>File</span><b>${esc(r.file)}</b></div>` : ''}
    <h4>${esc(r.title)}</h4><div class="rp-sum">${esc(r.summary)}</div>
    ${/^https?:\/\//i.test(r.link) ? `<p><a class="src" href="${esc(r.link)}" target="_blank" rel="noopener noreferrer">Read the source ↗</a></p>` : ''}
    ${canEdit() && r.status === 'Pending' ? `<button class="btn" type="button" data-publish="${esc(r.id)}">${ic('check')}Publish to Discover</button>` : ''}`;
  lucide.createIcons();
}
const csvCell = v => { v = String(v ?? ''); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
function exportReports() {
  const rows = [['Ref', 'Title', 'Type', 'Topic', 'Submitted', 'Status', 'Author'], ...rvis().map(r => [r.id, r.title, r.type, r.topic, new Date(r.at).toISOString(), r.status, rauthor(r)])];
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([rows.map(r => r.map(csvCell).join(',')).join('\n')], { type: 'text/csv' }));
  a.download = 'brushoff-reports.csv'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ----- Discover ----- */
function v3() {
  const me = Auth.session() || { name: '?' };
  return head('Discover', 'Articles and research shared by the community. Vote, comment and reply.') + `
  <div class="grid g21 dc-grid">
    <div class="dc-main">
      <button class="card dc-share" type="button" data-nav="2">${av(me.name)}<span>Share an article or research…</span></button>
      <div class="card"><div class="tools" style="margin:0"><div class="seg" id="df">${['Hot', 'New', 'Top', 'Most discussed'].map(f => `<button type="button" class="${f === dSort ? 'on' : ''}">${f}</button>`).join('')}</div><input class="field" id="dq" placeholder="Search posts" /></div></div>
      <div id="feed"></div>
    </div>
    <div class="dc-side">
      <div class="card"><h3>Communities</h3><div class="comm" id="comm"></div></div>
      <div class="card"><h3>About Discover</h3><p class="soft">Share research that gets brushed off. Upvote what helps, reply with care, and keep it respectful.</p><div class="mini-stats" id="dstat"></div></div>
    </div>
  </div>`;
}
function fillDiscover() {
  const pub = reports.filter(r => r.status === 'Published'), me = myUser(), q = ($('#dq').value || '').trim().toLowerCase();
  const tc = t => pub.filter(r => r.topic === t).length;
  $('#comm').innerHTML = `<button type="button" data-comm="all" class="${dComm === 'all' ? 'on' : ''}">All communities<b>${pub.length}</b></button>` + R_TOPICS.map(t => `<button type="button" data-comm="${esc(t)}" class="${dComm === t ? 'on' : ''}">t/${tslug(t)}<b>${tc(t)}</b></button>`).join('');
  $('#dstat').innerHTML = `<div><b>${new Set(reports.map(r => r.byUser)).size}</b>members</div><div><b>${pub.length}</b>posts</div><div><b>${pub.reduce((s, r) => s + r.comments.length, 0)}</b>comments</div>`;
  const hot = r => rscore(r) + r.comments.length;
  const sorts = { Hot: (a, b) => hot(b) - hot(a) || b.at - a.at, New: (a, b) => b.at - a.at, Top: (a, b) => rscore(b) - rscore(a) || b.at - a.at, 'Most discussed': (a, b) => b.comments.length - a.comments.length || b.at - a.at };
  const list = pub.filter(r => (dComm === 'all' || r.topic === dComm) && (r.title + ' ' + r.summary).toLowerCase().includes(q)).sort(sorts[dSort]);
  $('#feed').innerHTML = list.map(r => {
    const my = (r.votes || {})[me] || 0, saved = (r.saved || []).includes(me), open = openThreads.has(r.id);
    return `<article class="card post">
      <div class="vote"><button type="button" data-vote="1" data-id="${esc(r.id)}" class="${my === 1 ? 'on' : ''}" aria-label="Upvote">${ic('arrow-up')}</button><b>${rscore(r)}</b><button type="button" data-vote="-1" data-id="${esc(r.id)}" class="${my === -1 ? 'on' : ''}" aria-label="Downvote">${ic('arrow-down')}</button></div>
      <div class="pbody"><div class="pmeta"><span class="pill blue">${esc(r.type)}</span><b>t/${tslug(r.topic)}</b><span>Posted by <b>u/${esc(rauthor(r))}</b> · ${ago(r.at)}</span></div>
        <h3>${esc(r.title)}</h3><p>${esc(r.summary)}</p>
        ${/^https?:\/\//i.test(r.link) ? `<a class="src" href="${esc(r.link)}" target="_blank" rel="noopener noreferrer">Read the source ↗</a>` : ''}
        <div class="pact"><button type="button" data-cmt="${esc(r.id)}">${ic('message-circle')}${r.comments.length} comment${r.comments.length === 1 ? '' : 's'}</button><button type="button" data-save="${esc(r.id)}" class="${saved ? 'on' : ''}">${ic('bookmark')}${saved ? 'Saved' : 'Save'}</button><button type="button" data-share="${esc(r.id)}">${ic('share-2')}Share</button></div>
        ${open ? `<div class="thread">${r.comments.map(c => `<div class="cm"><b>${esc(c.by)}</b> <time>${ago(c.at)}</time><p>${esc(c.text)}</p></div>`).join('') || '<p class="soft">No comments yet. Be the first to reply.</p>'}<div class="reply"><input class="field" data-cin="${esc(r.id)}" maxlength="300" placeholder="Write a reply…" /><button class="btn" type="button" data-csend="${esc(r.id)}">Reply</button></div></div>` : ''}
      </div></article>`;
  }).join('') || '<div class="card empty">No posts match.</div>';
  lucide.createIcons();
}
function brushSave() { const ok = save('sidebar.reports', reports); $('#v1').innerHTML = v1(); fillReports(); fillDiscover(); lucide.createIcons(); return ok; }
function v4() {
  return head('Tickets', canEdit() ? 'Everything the team is working on, by status. Drag a card to move it, or open one to edit it.' : 'You can see the tickets you created. Open one to follow the discussion. Only Staff and Admin can change tickets.', `<button class="btn js-new-ticket" type="button">${ic('plus')}New ticket</button>`) + `
  <div class="tools"><input class="field" id="tq" placeholder="Search tickets…" /><div class="seg" id="tf">${['All', ...PRIOS].map((f, i) => `<button type="button" class="${i ? '' : 'on'}">${f}</button>`).join('')}</div></div>
  <div class="board" id="board"></div>`;
}
const tkCard = t => `<div class="tk" draggable="${canEdit()}" data-ticket="${esc(t.id)}" tabindex="0" role="button"><b>${esc(t.title)}</b><p>${esc(t.desc)}</p><div class="tk-who">${av(t.customer)}<span>${esc(t.customer)}</span></div><div class="meta"><span class="pill ${pill(t.priority)}">${t.priority}</span><span>${(t.attachments || []).length ? `<span class="clip">${ic('paperclip')}${t.attachments.length}</span> ` : ''}${esc(t.id)} · ${ago(t.at)}</span></div></div>`;
function fillBoard() {
  const q = $('#tq').value.trim().toLowerCase(), f = $('#tf .on').textContent;
  const match = t => (f === 'All' || t.priority === f) && (t.id + ' ' + t.title + ' ' + t.customer + ' ' + t.desc).toLowerCase().includes(q);
  $('#board').innerHTML = TSTATUS.map(c => {
    const mine = visibleTickets();
    const l = mine.filter(t => t.status === c && match(t)).sort((a, b) => b.at - a.at);
    const none = mine.some(t => t.status === c) ? 'No matching tickets' : canEdit() ? 'Drop tickets here' : 'No tickets';
    return `<div class="col" data-s="${c}"><h3>${c}<span>${l.length}</span></h3>${l.map(tkCard).join('') || `<div class="empty-col">${none}</div>`}</div>`;
  }).join('');
}
/* ----- Tasks. Members see only the tasks their account created. Staff & Admin see every account's tasks. ----- */
let taskAcct = 'all', taskStatus = 'All';
const acctName = u => (Auth.accounts().find(a => a.username === u) || {}).name;
const owner = t => acctName(t.byUser) || t.by || 'Unknown';
function v5() {
  const staff = canEdit();
  return head('Tasks', staff ? 'Every account’s tasks in one place. Pick an account to see just theirs.' : 'Your to-do list. Add notes, pictures and files, and tick things off as you go.', `<button class="btn js-new-task" type="button">${ic('plus')}New task</button>`) + `
  <div class="tools"><input class="field" id="kq" placeholder="Search tasks…" /><div class="seg" id="kf">${['All', 'To do', 'Done'].map((f, i) => `<button type="button" class="${i ? '' : 'on'}">${f}</button>`).join('')}</div></div>
  ${staff ? '<div class="tools"><div class="seg acct-seg" id="ka"></div></div>' : ''}
  <div class="grid g21"><div class="card"><div id="tl"></div></div>
  <div class="card"><h3>Progress<small id="tscope"></small></h3><div class="value" id="tp" style="font-size:34px;font-weight:800"></div><div class="bar-track" style="margin:14px 0"><div class="bar-fill" id="tb"></div></div><p style="color:var(--soft);font-size:13px;margin:0" id="tn"></p></div></div>`;
}
const taskRow = (t, showOwner) => {
  const at = (t.attachments || []).filter(a => a && a.data), pics = at.filter(a => /^data:image\//.test(a.data));
  const late = !t.done && t.due && t.due < todayISO();
  return `<div class="tk-row ${t.done ? 'done' : ''}" data-task="${esc(t.id)}" tabindex="0" role="button">
    <input type="checkbox" data-tick="${esc(t.id)}" ${t.done ? 'checked' : ''} aria-label="Mark done" />
    <div class="tk-body"><b>${esc(t.title)}</b>${t.desc ? `<p>${esc(t.desc)}</p>` : ''}
      <div class="tk-meta"><span class="pill ${pill(t.priority)}">${esc(t.priority || 'Normal')}</span>
        ${t.due ? `<span class="${late ? 'late' : ''}">${ic('calendar')} ${late ? 'Overdue · ' : 'Due '}${fmtDue(t.due)}</span>` : ''}
        ${at.length ? `<span class="clip">${ic('paperclip')}${at.length}</span>` : ''}
        ${showOwner ? `<span class="who">${av(owner(t))}${esc(owner(t))}</span>` : ''}</div>
      ${pics.length ? `<div class="tk-thumbs">${pics.slice(0, 4).map(a => `<img src="${esc(a.data)}" alt="" />`).join('')}${at.length > 4 ? `<span>+${at.length - 4}</span>` : ''}</div>` : ''}
    </div></div>`;
};
function fillTasks() {
  const staff = canEdit(), all = visibleTasks();
  const badge = $('#task-badge'); if (badge) { const n = taskStats().open; badge.textContent = n; badge.hidden = !n; }

  // account filter (Staff / Admin only)
  if (staff) {
    const accts = Auth.accounts(), owners = [...new Set(tasks.map(t => t.byUser))].filter(u => !accts.some(a => a.username === u)).map(u => ({ username: u, name: tasks.find(t => t.byUser === u).by || u, role: '' }));
    const list = [...accts, ...owners];
    if (taskAcct !== 'all' && !list.some(a => a.username === taskAcct)) taskAcct = 'all';
    $('#ka').innerHTML = `<button type="button" data-a="all" class="${taskAcct === 'all' ? 'on' : ''}">All accounts<small>${all.length}</small></button>` +
      list.map(a => `<button type="button" data-a="${esc(a.username)}" class="${taskAcct === a.username ? 'on' : ''}">${esc(a.name)}<small>${all.filter(t => t.byUser === a.username).length}</small></button>`).join('');
  }
  const scope = staff && taskAcct !== 'all' ? all.filter(t => t.byUser === taskAcct) : all;
  const q = $('#kq').value.trim().toLowerCase();
  const shown = scope.filter(t => (taskStatus === 'All' || (taskStatus === 'Done') === t.done) && (t.title + ' ' + (t.desc || '') + ' ' + owner(t)).toLowerCase().includes(q))
    .sort((a, b) => a.done - b.done || (a.due || '9').localeCompare(b.due || '9') || b.at - a.at);

  let html;
  if (!shown.length) html = `<div class="empty">${scope.length ? 'No tasks match.' : staff && taskAcct !== 'all' ? 'This account has no tasks yet.' : 'No tasks yet. Click “New task” to add one.'}</div>`;
  else if (staff && taskAcct === 'all') {                                  // grouped by account
    const keys = [...new Set(shown.map(t => t.byUser))];
    html = keys.map(u => { const g = shown.filter(t => t.byUser === u), nm = owner(g[0]), a = Auth.accounts().find(x => x.username === u);
      return `<div class="tk-group"><h3 class="tk-ghead">${av(nm)}${esc(nm)}<span>${a ? esc(a.role) + ' · ' : ''}${g.length} task${g.length === 1 ? '' : 's'}</span></h3>${g.map(t => taskRow(t, false)).join('')}</div>`; }).join('');
  } else html = shown.map(t => taskRow(t, staff)).join('');
  $('#tl').innerHTML = html;

  const d = scope.filter(t => t.done).length, p = scope.length ? Math.round(d / scope.length * 100) : 0;
  $('#tp').textContent = p + '%'; $('#tb').style.width = p + '%';
  $('#tn').textContent = `${d} of ${scope.length} tasks complete`;
  $('#tscope').textContent = staff ? (taskAcct === 'all' ? 'All accounts' : owner({ byUser: taskAcct })) : 'Your tasks';
  lucide.createIcons();
}
function v6() {
  return head('Projects', '<span id="pcount"></span>', `<button class="btn js-new-project" type="button">${ic('plus')}New project</button>`) + `
  <div class="tools"><input class="field" id="pq" placeholder="Search projects…" /><div class="seg" id="pf">${['All', 'Active', 'Completed', 'Overdue'].map((f, i) => `<button type="button" class="${i ? '' : 'on'}">${f}</button>`).join('')}</div></div>
  <div class="grid g3" id="pgrid"></div>`;
}
const projCard = p => {
  const st = pstate(p), late = st === 'Overdue', extra = p.team.length - 4;
  return `<div class="card proj" data-project="${esc(p.id)}" tabindex="0" role="button"><h3>${esc(p.name)}<span class="pill ${late ? 'red' : p.progress > 85 ? 'green' : 'blue'}">${late ? 'Overdue · ' : ''}${p.progress}%</span></h3><p>${esc(p.desc)}</p><div class="bar-track"><div class="bar-fill" style="width:${p.progress}%"></div></div>
  <div class="foot"><div class="stack">${p.team.slice(0, 4).map((n, i) => av(n, i)).join('') + (extra > 0 ? `<div class="av" style="background:var(--muted)">+${extra}</div>` : '') || '<span>No members</span>'}</div><span class="${late ? 'late' : ''}">${ic('calendar')} Due ${fmtDue(p.due)}</span></div></div>`;
};
function fillProjects() {
  const q = $('#pq').value.trim().toLowerCase(), f = $('#pf .on').textContent;
  const l = projects.filter(p => (f === 'All' || pstate(p) === f) && (p.name + ' ' + p.desc).toLowerCase().includes(q));
  $('#pgrid').innerHTML = l.map(projCard).join('') || `<div class="card empty" style="grid-column:1/-1">${projects.length ? 'No projects match.' : 'No projects yet. Click “New project” to add one.'}</div>`;
  $('#pcount').textContent = `${projects.length} projects · ${projects.filter(p => pstate(p) === 'Completed').length} completed`;
  lucide.createIcons();
}
function v7() {
  return head('Application', 'Messages from customers, billing and your team.') + `<div class="card mail"><div class="side" id="ml">${mails.map((m, i) => `<div class="msg ${m[4] ? 'unread' : ''} ${i ? '' : 'on'}" data-i="${i}">${av(m[0], i)}<div><b>${m[0]}</b><span>${m[1]}</span></div></div>`).join('')}</div><div class="read" id="mr"></div></div>`;
}
function showMail(i) {
  const m = mails[i];
  $('#mr').innerHTML = `<h2>${m[1]}</h2><div class="from">${m[0]} · ${m[3]}</div><p>${m[2]}</p><p>Best regards,<br>${m[0].split(' ')[0]}</p><div class="reply"><input class="field" placeholder="Write a reply…"/><button class="btn">Send</button></div>`;
}
function v8() {
  return head('User Management', 'Control who can access your workspace and what they can do.', `<button class="btn">${ic('plus')}Invite user</button>`) + `
  <div class="card"><div class="scroll"><table><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Last active</th><th>Access</th></tr></thead><tbody>${users.map((u, i) => `<tr><td class="who">${av(u[0], i)}<div><b>${u[0]}</b><span>${u[1]}</span></div></td><td>${u[2]}</td><td><span class="pill ${pill(u[3])}">${u[3]}</span></td><td>${u[4]}</td><td><input type="checkbox" class="switch" ${u[3] === 'Active' || u[3] === 'Invited' ? 'checked' : ''}/></td></tr>`).join('')}</tbody></table></div></div>`;
}

function v9() {
  return head('Settings', 'Manage your profile, appearance, notifications and security.') + `
  <div class="settings">
    <form class="card set" id="sf-profile" autocomplete="off">
      <h3>${ic('user')}Profile<small>Visible to your team</small></h3>
      <div class="set-row"><label for="s-name">Full name</label><input class="field" id="s-name" maxlength="60" required /></div>
      <div class="set-row"><label for="s-email">Email</label><input class="field" id="s-email" disabled /></div>
      <div class="set-row"><label for="s-role">Role</label><input class="field" id="s-role" disabled /></div>
      <div class="set-foot"><button class="btn" type="submit">Save changes</button><p class="set-msg" id="pf-msg" role="status"></p></div>
    </form>

    <div class="card set">
      <h3>${ic('palette')}Appearance<small>Saved on this device</small></h3>
      <div class="set-row"><span class="lbl">Theme</span><div class="seg" id="s-theme" style="justify-self:start"><button type="button" data-t="light">Light</button><button type="button" data-t="dark">Dark</button></div></div>
    </div>

    <div class="card set" id="s-notify">
      <h3>${ic('bell')}Notifications<small>Saved on this device</small></h3>
      <label class="set-toggle"><div><b>Email notifications</b><span>Get an email when a ticket is assigned to you.</span></div><input type="checkbox" class="switch" data-k="email" /></label>
      <label class="set-toggle"><div><b>Desktop alerts</b><span>Show an alert when a customer replies.</span></div><input type="checkbox" class="switch" data-k="desktop" /></label>
      <label class="set-toggle"><div><b>Weekly summary</b><span>A Monday recap of tickets, tasks and revenue.</span></div><input type="checkbox" class="switch" data-k="digest" /></label>
    </div>

    <form class="card set" id="sf-pass" autocomplete="off">
      <h3>${ic('lock')}Security<small>Change your password</small></h3>
      <div class="set-row"><label for="pw-cur">Current password</label><input class="field" id="pw-cur" type="password" autocomplete="current-password" required /></div>
      <div class="set-row"><label for="pw-new">New password</label><input class="field" id="pw-new" type="password" autocomplete="new-password" required /></div>
      <div class="set-row"><label for="pw-new2">Confirm new password</label><input class="field" id="pw-new2" type="password" autocomplete="new-password" required /></div>
      <div class="set-foot"><button class="btn" type="submit">Update password</button><p class="set-msg" id="pw-msg" role="status"></p></div>
    </form>
  </div>`;
}

/* ---------- boot ---------- */
[v1, v2, v3, v4, v5, v6, v7, v8, v9].forEach((f, i) => $('#v' + (i + 1)).innerHTML = f());
fillReports(); fillDiscover(); fillTasks(); showMail(0); fillBoard(); fillProjects();
save('sidebar.tickets', tickets); save('sidebar.projects', projects); save('sidebar.tasks', tasks);   // so ticket.html can read the sample data too
/* ----- Reports + Discover events ----- */
const goNav = n => { const r = $('#nav-' + n); if (r) { r.checked = true; window.scrollTo({ top: 0 }); } };
$('#rq').addEventListener('input', fillReports); $('#rs').addEventListener('change', fillReports);
$('#dq').addEventListener('input', fillDiscover);
$('#df').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; dSort = b.textContent; document.querySelectorAll('#df button').forEach(x => x.classList.toggle('on', x === b)); fillDiscover(); });
$('#rf').addEventListener('submit', e => {
  e.preventDefault();
  const msg = $('#rf-msg'), title = $('#r-title').value.trim(), summary = $('#r-sum').value.trim(), link = $('#r-link').value.trim(), u = Auth.session();
  if (!title || !summary) return flash(msg, 'Please add a title and a short summary.', false);
  if (link && !/^https?:\/\/\S+$/i.test(link)) return flash(msg, 'The link must start with http:// or https://', false);
  const n = Math.max(0, ...reports.map(x => +x.id.slice(3) || 0)) + 1;
  const r = { id: 'RP-' + String(n).padStart(4, '0'), title, type: $('#r-type').value, topic: $('#r-topic').value, summary, link, file: $('#r-file').files[0]?.name || '', anon: $('#r-anon').checked, status: 'Pending', by: u.name, byUser: u.username, at: Date.now(), votes: {}, saved: [], comments: [] };
  reports.push(r); selReport = r.id;
  if (!brushSave()) say('Saved for this session only (browser storage is full)');
  e.target.reset(); flash(msg, 'Submitted. A moderator will review it before it appears in Discover.', true); say('Submitted for review');
});
document.addEventListener('click', e => {
  const t = e.target;
  const nav = t.closest('[data-nav]'); if (nav) { e.preventDefault(); return goNav(nav.dataset.nav); }
  const soon = t.closest('[data-soon]'); if (soon) return say(soon.dataset.soon + ' is coming soon');
  if (t.closest('.js-export')) return exportReports();
  const rep = t.closest('[data-rep]'); if (rep) { selReport = rep.dataset.rep; return fillReports(); }
  const pub = t.closest('[data-publish]'); if (pub) { if (!canEdit()) return; const r = reports.find(x => x.id === pub.dataset.publish); if (r) { r.status = 'Published'; brushSave(); say(r.id + ' published to Discover'); } return; }
  const cm = t.closest('[data-comm]'); if (cm) { dComm = cm.dataset.comm; return fillDiscover(); }
  const vote = t.closest('[data-vote]'); if (vote) { const r = reports.find(x => x.id === vote.dataset.id); if (!r) return; const v = +vote.dataset.vote, me = myUser(); r.votes = r.votes || {}; if (r.votes[me] === v) delete r.votes[me]; else r.votes[me] = v; return brushSave(); }
  const sv = t.closest('[data-save]'); if (sv) { const r = reports.find(x => x.id === sv.dataset.save); if (!r) return; const me = myUser(); r.saved = r.saved || []; r.saved = r.saved.includes(me) ? r.saved.filter(x => x !== me) : [...r.saved, me]; return brushSave(); }
  const sh = t.closest('[data-share]'); if (sh) { const r = reports.find(x => x.id === sh.dataset.share); if (!r) return; const text = /^https?:\/\//i.test(r.link) ? r.link : r.title; (navigator.clipboard?.writeText(text) || Promise.reject()).then(() => say('Copied to clipboard'), () => say('Could not copy')); return; }
  const cb = t.closest('[data-cmt]'); if (cb) { const id = cb.dataset.cmt; openThreads.has(id) ? openThreads.delete(id) : openThreads.add(id); return fillDiscover(); }
  const cs = t.closest('[data-csend]'); if (cs) sendComment(cs.dataset.csend);
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset?.cin) { e.preventDefault(); sendComment(e.target.dataset.cin); } });
function sendComment(id) {
  const inp = document.querySelector(`[data-cin="${CSS.escape(id)}"]`), text = inp?.value.trim(), r = reports.find(x => x.id === id), u = Auth.session();
  if (!text || !r) return;
  r.comments.push({ by: u.name, text, at: Date.now() }); openThreads.add(id); brushSave();
  document.querySelector(`[data-cin="${CSS.escape(id)}"]`)?.focus();
}
$('#ml').addEventListener('click', e => { const m = e.target.closest('.msg'); if (!m) return; document.querySelectorAll('.msg').forEach(x => x.classList.remove('on')); m.classList.add('on'); m.classList.remove('unread'); showMail(+m.dataset.i); });
lucide.createIcons();

/* ---------- session / roles ---------- */
const me = Auth.session();
$('#logout').addEventListener('click', Auth.logout);

// only admins can manage users
if (!Auth.isAdmin()) {
  ['#nav-8', 'label[for="nav-8"]', '#v8'].forEach(s => $(s)?.remove());
}


/* ---------- settings page + account menu ---------- */
const page = $('.page'), sidebar = $('.sidebar'), themeBox = $('#theme');
const menu = $('#acct-menu'), acctBtn = $('#acct-btn');

// small toast
const toast = document.createElement('div');
toast.className = 'toast'; toast.setAttribute('role', 'status');
page.appendChild(toast);
let toastTimer;
const say = t => { toast.textContent = t; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2400); };
const flash = (el, text, ok) => { el.textContent = text; el.className = 'set-msg ' + (ok ? 'ok' : 'err'); };

// show who is signed in (sidebar, menu and settings form)
function paintUser() {
  const u = Auth.session();
  $('#who').textContent = u.name;
  $('#role').textContent = u.role;
  $('#m-name').textContent = u.name;
  $('#m-email').textContent = u.email || '@' + u.username;
  $('#s-name').value = u.name;
  $('#s-email').value = u.email || '—';
  $('#s-role').value = u.role;
}
paintUser();

function openSettings(focusName) {
  $('#nav-9').checked = true;
  window.scrollTo({ top: 0 });
  if (focusName) $('#s-name').focus({ preventScroll: true });
}
$('#open-settings').addEventListener('click', () => openSettings());

// account dropdown (the down arrow)
const setMenu = open => {
  sidebar.classList.toggle('menu-open', open);
  acctBtn.setAttribute('aria-expanded', String(open));
};
$('.profile').addEventListener('click', () => setMenu(!sidebar.classList.contains('menu-open')));
document.addEventListener('click', e => { if (!e.target.closest('.profile, .acct-menu')) setMenu(false); });
sidebar.addEventListener('mouseleave', () => setMenu(false));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && sidebar.classList.contains('menu-open')) { setMenu(false); acctBtn.focus(); } });
menu.addEventListener('click', e => {
  const b = e.target.closest('[data-go]'); if (!b) return;
  setMenu(false);
  const go = b.dataset.go;
  if (go === 'profile') openSettings(true);
  else if (go === 'settings') openSettings();
  else if (go === 'theme') themeBox.click();
  else if (go === 'logout') Auth.logout();
});

// theme: remember it, keep every control in sync
function syncTheme() {
  const dark = themeBox.checked;
  try { localStorage.setItem('sidebar.theme', dark ? 'dark' : 'light'); } catch {}
  $('#m-theme').textContent = dark ? 'Light mode' : 'Dark mode';
  document.querySelectorAll('#s-theme button').forEach(b => b.classList.toggle('on', (b.dataset.t === 'dark') === dark));
}
themeBox.addEventListener('change', syncTheme);
$('#s-theme').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  themeBox.checked = b.dataset.t === 'dark';
  syncTheme();
});
syncTheme();

// profile form
$('#sf-profile').addEventListener('submit', e => {
  e.preventDefault();
  const r = Auth.updateProfile({ name: $('#s-name').value });
  if (!r.ok) return flash($('#pf-msg'), r.error, false);
  paintUser();
  flash($('#pf-msg'), 'Profile saved.', true);
  say('Profile saved');
});

// notification switches
const PREF_KEY = 'sidebar.prefs';
const prefs = () => { try { return { email: true, desktop: false, digest: true, ...JSON.parse(localStorage.getItem(PREF_KEY)) }; } catch { return { email: true, desktop: false, digest: true }; } };
const pv = prefs();
document.querySelectorAll('#s-notify .switch').forEach(sw => { sw.checked = !!pv[sw.dataset.k]; });
$('#s-notify').addEventListener('change', e => {
  if (!e.target.dataset.k) return;
  const next = { ...prefs(), [e.target.dataset.k]: e.target.checked };
  try { localStorage.setItem(PREF_KEY, JSON.stringify(next)); } catch {}
  say('Preference saved');
});

// password form
$('#sf-pass').addEventListener('submit', e => {
  e.preventDefault();
  const msg = $('#pw-msg'), cur = $('#pw-cur').value, nw = $('#pw-new').value, nw2 = $('#pw-new2').value;
  if (nw !== nw2) { $('#pw-new2').value = ''; $('#pw-new2').focus(); return flash(msg, 'The new passwords don’t match.', false); }
  const r = Auth.changePassword(cur, nw);
  if (!r.ok) return flash(msg, r.error, false);
  e.target.reset();
  flash(msg, 'Password updated.', true);
  say('Password updated');
});


/* ---------- tickets & projects: modal, forms, drag & drop ---------- */
const dlg = document.createElement('dialog');
dlg.className = 'modal';
page.appendChild(dlg);                                  // inside .page so it follows light/dark theme
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });   // click the backdrop to close
dlg.addEventListener('close', () => { dlg.innerHTML = ''; });

/* generic form dialog. fields: [{ k, label, type, req, half, def, options }] */
function openModal({ title, note, fields, data = {}, saveLabel = 'Save', onSave, onDelete }) {
  const row = x => {
    const v = data[x.k] ?? x.def ?? '', id = 'f-' + x.k;
    let ctl;
    if (x.type === 'textarea') ctl = `<textarea class="field" id="${id}" rows="3" maxlength="300">${esc(v)}</textarea>`;
    else if (x.type === 'select') ctl = `<select class="field" id="${id}">${x.options.map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    else if (x.type === 'range') ctl = `<div class="rng"><input type="range" id="${id}" min="0" max="100" step="5" value="${+v || 0}" /><output id="${id}-o">${+v || 0}%</output></div>`;
    else if (x.type === 'files') ctl = `<div id="${id}"></div>`;
    else if (x.type === 'checks') ctl = `<div class="checks" id="${id}">${x.options.map(o => `<label class="chk"><input type="checkbox" value="${esc(o)}" ${(v || []).includes(o) ? 'checked' : ''} /><span>${esc(o)}</span></label>`).join('')}</div>`;
    else ctl = `<input class="field" id="${id}" type="${x.type || 'text'}" value="${esc(v)}" ${x.type === 'date' ? '' : 'maxlength="80"'} ${x.req ? 'required' : ''} />`;
    return `<div class="mrow ${x.half ? 'half' : ''}"><label for="${id}">${x.label}</label>${ctl}</div>`;
  };
  dlg.innerHTML = `<form class="mform" autocomplete="off"><h2>${esc(title)}</h2>${note ? `<p class="mnote">${esc(note)}</p>` : ''}<div class="mgrid">${fields.map(row).join('')}</div>
    <div class="mfoot">${onDelete ? '<button class="btn danger" type="button" id="m-del">Delete</button>' : ''}<p class="set-msg err" id="m-msg" role="alert"></p>
    <button class="btn ghost" type="button" id="m-cancel">Cancel</button><button class="btn" type="submit">${esc(saveLabel)}</button></div></form>`;

  const widgets = {};
  fields.filter(x => x.type === 'files').forEach(x => { widgets[x.k] = Attach.widget($('#f-' + x.k, dlg), data[x.k] || []); });
  dlg.querySelectorAll('input[type=range]').forEach(r => r.addEventListener('input', () => { $('#' + r.id + '-o', dlg).textContent = r.value + '%'; }));
  $('#m-cancel', dlg).addEventListener('click', () => dlg.close());

  const del = $('#m-del', dlg);
  if (del) del.addEventListener('click', () => {
    if (!del.dataset.sure) {                           // two-step delete, no pop-up needed
      del.dataset.sure = '1'; del.textContent = 'Click again to confirm';
      setTimeout(() => { if (del.isConnected) { delete del.dataset.sure; del.textContent = 'Delete'; } }, 3000);
      return;
    }
    onDelete(); dlg.close();
  });

  $('.mform', dlg).addEventListener('submit', e => {
    e.preventDefault();
    if (Object.values(widgets).some(w => w.busy())) return flash($('#m-msg', dlg), 'Still reading your files… one moment.', false);
    const v = {};
    fields.forEach(x => {
      if (x.type === 'files') { v[x.k] = widgets[x.k].get(); return; }
      const el = $('#f-' + x.k, dlg);
      v[x.k] = x.type === 'range' ? +el.value : x.type === 'checks' ? [...el.querySelectorAll('input:checked')].map(i => i.value) : el.value.trim();
    });
    const err = onSave(v);
    if (err) return flash($('#m-msg', dlg), err, false);
    dlg.close();
  });
  dlg.showModal();
}

/* save everything and repaint every view that shows tickets / tasks / projects */
const STORAGE_FULL = 'The browser has no room left for these files. Try fewer or smaller pictures.';
const persist = () => [save('sidebar.tickets', tickets), save('sidebar.projects', projects), save('sidebar.tasks', tasks)].every(Boolean);
function repaint() {
  fillBoard(); fillProjects(); fillTasks();
  $('#v1').innerHTML = v1();
  lucide.createIcons();
}
const commit = () => { const ok = persist(); repaint(); return ok; };

/* ----- tickets: the form only CREATES a ticket. Editing happens on ticket.html (Staff / Admin only) ----- */
function openNewTicket() {
  const staff = canEdit(), me = Auth.session();
  openModal({
    title: 'New ticket',
    saveLabel: 'Create ticket',
    fields: [
      { k: 'title', label: 'Title', req: true },
      { k: 'desc', label: 'Description', type: 'textarea' },
      { k: 'customer', label: 'Customer', type: 'select', options: customers.map(c => c[0]) },
      { k: 'priority', label: 'Priority', type: 'select', options: PRIOS, def: 'Normal', half: !!staff },
      ...(staff ? [{ k: 'status', label: 'Status', type: 'select', options: TSTATUS, def: 'Open', half: true }] : []),
      { k: 'attachments', label: 'Pictures & files', type: 'files' },
    ],
    onSave(v) {
      if (!v.title) return 'Please enter a title.';
      const n = Math.max(1000, ...tickets.map(x => +x.id.slice(3) || 0)) + 1;
      tickets.unshift({ id: 'TK-' + n, status: 'Open', ...v, by: me.name, byUser: me.username, comments: [], at: Date.now() });
      if (!commit()) { tickets.shift(); repaint(); return STORAGE_FULL; }
      say('Ticket created');
    },
  });
}

/* ----- tasks ----- */
function openTask(id) {
  const t = id && tasks.find(x => x.id === id && Auth.canSeeTask(x)), me = Auth.session();
  if (id && !t) return;
  openModal({
    title: t ? 'Task' : 'New task',
    note: t ? `Created by ${owner(t)} · ${ago(t.at)}` : '',
    saveLabel: t ? 'Save changes' : 'Create task',
    data: t || {},
    fields: [
      { k: 'title', label: 'Title', req: true },
      { k: 'desc', label: 'Notes', type: 'textarea' },
      { k: 'due', label: 'Due date', type: 'date', def: todayISO(1), half: true },
      { k: 'priority', label: 'Priority', type: 'select', options: PRIOS, def: 'Normal', half: true },
      { k: 'attachments', label: 'Pictures & files', type: 'files' },
    ],
    onSave(v) {
      if (!v.title) return 'Please enter a title.';
      if (t) {
        const prev = { ...t }; Object.assign(t, v);
        if (!commit()) { Object.assign(t, prev); repaint(); return STORAGE_FULL; }
        say('Task updated');
      } else {
        tasks.unshift({ id: 'tsk-' + Date.now(), done: false, ...v, by: me.name, byUser: me.username, at: Date.now() });
        if (!commit()) { tasks.shift(); repaint(); return STORAGE_FULL; }
        say('Task created');
      }
    },
    onDelete: t && (() => { tasks = tasks.filter(x => x !== t); commit(); say('Task deleted'); }),
  });
}

/* ----- projects ----- */
function openProject(id) {
  const p = id && projects.find(x => x.id === id);
  const people = [...new Set([Auth.session().name, ...users.map(u => u[0]), ...projects.flatMap(x => x.team)])];
  openModal({
    title: p ? 'Edit project' : 'New project',
    saveLabel: p ? 'Save changes' : 'Create project',
    data: p || {},
    fields: [
      { k: 'name', label: 'Project name', req: true },
      { k: 'desc', label: 'Description', type: 'textarea' },
      { k: 'due', label: 'Due date', type: 'date', req: true, def: todayISO(14), half: true },
      { k: 'progress', label: 'Progress', type: 'range', def: 0, half: true },
      { k: 'team', label: 'Team members', type: 'checks', options: people },
    ],
    onSave(v) {
      if (!v.name) return 'Please enter a project name.';
      if (!v.due) return 'Please choose a due date.';
      if (p) Object.assign(p, v);
      else projects.unshift({ id: 'p' + Date.now(), ...v });
      commit(); say(p ? 'Project updated' : 'Project created');
    },
    onDelete: p && (() => { projects = projects.filter(x => x !== p); commit(); say('Project deleted'); }),
  });
}

/* ----- clicks (works for re-rendered content too) ----- */
document.addEventListener('click', e => {
  if (e.target.closest('.js-new-ticket')) return openNewTicket();
  if (e.target.closest('.js-new-project')) return openProject();
  if (e.target.closest('.js-new-task')) return openTask();
  if (e.target.closest('[data-tick]')) return;                      // the checkbox has its own handler
  const k = e.target.closest('[data-task]'); if (k) return openTask(k.dataset.task);
  const t = e.target.closest('[data-ticket]'); if (t) { location.href = 'ticket.html?id=' + encodeURIComponent(t.dataset.ticket); return; }
  const p = e.target.closest('[data-project]'); if (p) return openProject(p.dataset.project);
});
document.addEventListener('keydown', e => {            // Enter / Space opens a focused card
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const c = e.target.closest?.('[data-ticket], [data-project], [data-task]');
  if (!c || c !== e.target) return;
  e.preventDefault(); c.click();
});

/* ----- search + filters ----- */
const segBind = (sel, fn) => $(sel).addEventListener('click', e => {
  if (e.target.tagName !== 'BUTTON') return;
  document.querySelectorAll(sel + ' button').forEach(b => b.classList.remove('on'));
  e.target.classList.add('on'); fn();
});
$('#tq').addEventListener('input', fillBoard); segBind('#tf', fillBoard);
$('#pq').addEventListener('input', fillProjects); segBind('#pf', fillProjects);
$('#kq').addEventListener('input', fillTasks);
$('#kf').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; document.querySelectorAll('#kf button').forEach(x => x.classList.remove('on')); b.classList.add('on'); taskStatus = b.textContent; fillTasks(); });
$('#ka')?.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b) return; taskAcct = b.dataset.a; fillTasks(); });
$('#v5').addEventListener('change', e => {                          // tick a task done / not done
  const id = e.target.dataset.tick; if (!id) return;
  const t = tasks.find(x => x.id === id && Auth.canSeeTask(x)); if (!t) return;
  t.done = e.target.checked; commit();
});

/* ----- drag a ticket to another column ----- */
let dragId = null;
const board = $('#v4');
board.addEventListener('dragstart', e => {
  const c = e.target.closest('.tk'); if (!c) return;
  if (!canEdit()) { e.preventDefault(); return; }
  dragId = c.dataset.ticket; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId);
  requestAnimationFrame(() => c.classList.add('drag'));
});
board.addEventListener('dragend', () => { dragId = null; board.querySelectorAll('.drag, .over').forEach(x => x.classList.remove('drag', 'over')); });
board.addEventListener('dragover', e => { const c = e.target.closest('.col'); if (!c || !dragId) return; e.preventDefault(); c.classList.add('over'); });
board.addEventListener('dragleave', e => { const c = e.target.closest('.col'); if (c && !c.contains(e.relatedTarget)) c.classList.remove('over'); });
board.addEventListener('drop', e => {
  const c = e.target.closest('.col'); if (!c || !dragId || !canEdit()) return;
  e.preventDefault();
  const t = tickets.find(x => x.id === dragId && Auth.canSeeTicket(x)); dragId = null;
  if (t && t.status !== c.dataset.s) { t.status = c.dataset.s; commit(); say('Moved to ' + c.dataset.s); }
  else board.querySelectorAll('.over').forEach(x => x.classList.remove('over'));
});


/* ----- coming back from ticket.html lands on the Tickets view with fresh data ----- */
if (location.hash === '#tickets') $('#nav-4').checked = true;
window.addEventListener('pageshow', e => { if (e.persisted) location.reload(); });
