/* ticket.js : the single-ticket page.
   Staff & Admin  -> edit form (title, description, customer, priority, status) + delete
   Members        -> read-only view
   Everyone       -> can post comments
   NOTE: front-end demo. The role check lives in the browser, so a real app must also enforce it on a server. */

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const COLORS = ['#6d5dfc', '#3f8cff', '#f59e0b', '#1fa971', '#ec4899', '#06b6d4', '#a855f7'];
const initials = n => n.split(' ').map(w => w[0]).join('').slice(0, 2);
const av = (n, i = 0) => `<div class="av" style="background:${COLORS[(n.length + i) % COLORS.length]}">${esc(initials(n))}</div>`;
const ic = n => `<i class="icon" data-lucide="${n}"></i>`;
const ago = at => { const m = Math.max(0, Math.round((Date.now() - at) / 60000)); return m < 1 ? 'just now' : m < 60 ? m + 'm ago' : m < 1440 ? Math.floor(m / 60) + 'h ago' : Math.floor(m / 1440) + 'd ago'; };

const TSTATUS = ['Open', 'In progress', 'Resolved'], PRIOS = ['Urgent', 'High', 'Normal', 'Low'];
const PILL = { Urgent: 'red', High: 'amber', Normal: 'blue', Low: '', Open: 'blue', 'In progress': 'amber', Resolved: 'green' };
const CUSTOMERS = ['Marco Reyes', 'Aisha Khan', 'Liam O’Connor', 'Sofia Alvarez', 'Kenji Watanabe', 'Priya Nair', 'Daniel Cruz', 'Emma Johansson', 'Carlos Mendez', 'Hana Kim'];

const KEY = 'sidebar.tickets';                       // same list the dashboard uses
const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v) ? v : []; } catch { return []; } };
const saveAll = list => { try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch { return false; } };

const me = Auth.session(), canEdit = Auth.canManageTickets();
const id = new URLSearchParams(location.search).get('id');
const app = $('#app');
const pick = list => list.find(x => x.id === id && Auth.canSeeTicket(x));   // Members only get their own tickets
const current = () => pick(load());

const bar = `<div class="tbar"><a class="btn ghost" href="index.html#tickets">${ic('arrow-left')}Back to tickets</a>
  <div class="who-chip">${av(me.name)}<div><b>${esc(me.name)}</b><span>${esc(me.role)}</span></div></div></div>`;

const flash = (el, text, ok) => { el.textContent = text; el.className = 'set-msg ' + (ok ? 'ok' : 'err'); };

function paintInfo() {
  const t = current(); if (!t) return;
  const idx = TSTATUS.indexOf(t.status);
  const sel = (idn, opts, v) => `<select class="field" id="${idn}">${opts.map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  const customers = CUSTOMERS.includes(t.customer) ? CUSTOMERS : [t.customer, ...CUSTOMERS];

  const body = canEdit ? `
    <form id="eform" autocomplete="off"><div class="mgrid">
      <div class="mrow"><label for="e-title">Title</label><input class="field" id="e-title" maxlength="80" required value="${esc(t.title)}" /></div>
      <div class="mrow"><label for="e-desc">Description</label><textarea class="field" id="e-desc" rows="4" maxlength="300">${esc(t.desc)}</textarea></div>
      <div class="mrow"><label for="e-customer">Customer</label>${sel('e-customer', customers, t.customer)}</div>
      <div class="mrow half"><label for="e-priority">Priority</label>${sel('e-priority', PRIOS, t.priority)}</div>
      <div class="mrow half"><label for="e-status">Status</label>${sel('e-status', TSTATUS, t.status)}</div>
    </div>
    <div class="mfoot"><button class="btn danger" type="button" id="e-del">${ic('trash-2')}Delete ticket</button><p class="set-msg" id="e-msg" role="status"></p><button class="btn" type="submit">Save changes</button></div></form>`
    : `<p class="tdesc">${esc(t.desc) || 'No description provided.'}</p>
       <p class="tnote">${ic('lock')}Only Staff and Admin can change ticket details. You can still join the discussion below.</p>`;

  $('#tinfo').innerHTML = `
    <div class="thead"><span class="tid">${esc(t.id)}</span><span class="pill ${PILL[t.status] || ''}">${esc(t.status)}</span><span class="pill ${PILL[t.priority] || ''}">${esc(t.priority)}</span></div>
    <h1>${esc(t.title)}</h1>
    <div class="tmeta">${av(t.customer)}<span><b>${esc(t.customer)}</b> · opened ${ago(t.at)}${t.by ? ' by ' + esc(t.by) : ''}</span></div>
    <ol class="steps">${TSTATUS.map((s, i) => `<li class="${i < idx ? 'done' : i === idx ? 'now' : ''}"><i></i>${s}</li>`).join('')}</ol>
    ${(t.attachments || []).length ? `<h4 class="att-h">Attachments</h4>${Attach.render(t.attachments)}` : ''}
    ${body}`;
  document.title = t.id + ' · ' + t.title;
  lucide.createIcons();
  if (canEdit) bindEdit();
}

function bindEdit() {
  $('#eform').addEventListener('submit', e => {
    e.preventDefault();
    if (!canEdit) return;                                // belt and braces
    const v = { title: $('#e-title').value.trim(), desc: $('#e-desc').value.trim(), customer: $('#e-customer').value, priority: $('#e-priority').value, status: $('#e-status').value };
    if (!v.title) return flash($('#e-msg'), 'Please enter a title.', false);
    const list = load(), t = pick(list); if (!t) return;
    const log = [];
    if (t.status !== v.status) log.push(`changed the status from ${t.status} to ${v.status}`);
    if (t.priority !== v.priority) log.push(`changed the priority from ${t.priority} to ${v.priority}`);
    Object.assign(t, v);
    t.comments = t.comments || [];
    log.forEach(text => t.comments.push({ by: me.name, role: me.role, text, at: Date.now(), event: true }));
    if (!saveAll(list)) return flash($('#e-msg'), 'Could not save (browser storage is blocked).', false);
    paintInfo(); paintThread();
    flash($('#e-msg'), 'Saved.', true);
  });

  const del = $('#e-del');
  del.addEventListener('click', () => {
    if (!canEdit) return;
    if (!del.dataset.sure) {                             // two-step delete
      del.dataset.sure = '1'; del.lastChild.textContent = 'Click again to confirm';
      setTimeout(() => { if (del.isConnected) { delete del.dataset.sure; del.lastChild.textContent = 'Delete ticket'; } }, 3000);
      return;
    }
    if (saveAll(load().filter(x => x.id !== id))) location.href = 'index.html#tickets';
  });
}

function paintThread() {
  const t = current(); if (!t) return;
  const c = t.comments || [], n = c.filter(x => !x.event).length;
  $('#thread').innerHTML = c.length ? c.map(x => x.event
    ? `<div class="evt">${ic('activity')}<span><b>${esc(x.by)}</b> ${esc(x.text)}</span><time>${ago(x.at)}</time></div>`
    : `<div class="cmt">${av(x.by)}<div class="cbody"><div class="chead"><b>${esc(x.by)}</b><span class="pill ${x.role === 'Member' ? '' : 'blue'}">${esc(x.role)}</span><time>${ago(x.at)}</time></div>${x.text ? `<p>${esc(x.text)}</p>` : ''}${Attach.render(x.attachments)}</div></div>`).join('')
    : '<div class="empty">No comments yet. Start the conversation below.</div>';
  $('#ccount').textContent = n + (n === 1 ? ' comment' : ' comments');
  lucide.createIcons();
}

if (!current()) {
  const exists = load().some(x => x.id === id);
  app.innerHTML = bar + (exists
    ? `<div class="card empty">${ic('lock')} You don’t have access to this ticket. Members can only see tickets they created.</div>`
    : `<div class="card empty">This ticket doesn’t exist any more. It may have been deleted.</div>`);
} else {
  app.innerHTML = bar + `
    <div class="card tcard" id="tinfo"></div>
    <div class="card tcard"><h3>Discussion<small id="ccount"></small></h3><div id="thread"></div>
      <form class="cform" id="cform" autocomplete="off">${av(me.name)}
        <div class="cbox"><textarea class="field" id="ctext" rows="3" maxlength="500" placeholder="Write a comment…"></textarea>
        <div id="cfiles" style="margin-top:10px"></div>
        <div class="cfoot"><p class="set-msg" id="cmsg" role="status"></p><button class="btn" type="submit">${ic('send')}Post comment</button></div></div>
      </form></div>`;
  paintInfo(); paintThread();
  const files = Attach.widget($('#cfiles'));

  $('#cform').addEventListener('submit', e => {
    e.preventDefault();
    if (Auth.gate('comment on a ticket')) return;
    const text = $('#ctext').value.trim(), attachments = files.get();
    if (files.busy()) return flash($('#cmsg'), 'Still reading your files… one moment.', false);
    if (!text && !attachments.length) return flash($('#cmsg'), 'Write something or attach a file first.', false);
    const list = load(), t = pick(list); if (!t) return;
    (t.comments = t.comments || []).push({ by: me.name, role: me.role, text, attachments, at: Date.now() });
    if (!saveAll(list)) return flash($('#cmsg'), 'No room left in the browser for these files. Try fewer or smaller pictures.', false);
    $('#ctext').value = ''; files.reset(); flash($('#cmsg'), 'Comment posted.', true);
    paintThread();
  });

  // another tab changed this ticket
  window.addEventListener('storage', e => { if (e.key === KEY && current()) { paintThread(); if (!canEdit) paintInfo(); } });
}
lucide.createIcons();
