/* auth.js — demo authentication (front-end only)
   NOTE: this runs in the browser, so anyone can read these passwords.
   Fine for a demo/school project; a real app must check credentials on a server.
   New sign-ups are saved in this browser's localStorage only. */

const Auth = (() => {
  const KEY = 'sidebar.session';
  const USERS_KEY = 'sidebar.users';

  // Reserved accounts (Admin and Staff). Change their emails / passwords here.
  // Everyone who signs up on the page becomes a Member.
  const BUILTIN = [
    { username: 'admin', email: 'admin@workspace.com', password: 'Admin@123', name: 'Ivan Kenemen', role: 'Admin' },
    { username: 'staff', email: 'staff@workspace.com', password: 'Staff@123', name: 'Marco Reyes',   role: 'Staff' },
  ];

  const saved = () => {
    try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; } catch { return []; }
  };
  /* per-user edits (name / password) made from the Settings page */
  const OV_KEY = 'sidebar.overrides';
  const overrides = () => {
    try { return JSON.parse(localStorage.getItem(OV_KEY)) || {}; } catch { return {}; }
  };
  const patch = (username, fields) => {
    try {
      const o = overrides();
      o[username] = { ...o[username], ...fields };
      localStorage.setItem(OV_KEY, JSON.stringify(o));
      return true;
    } catch { return false; }
  };
  const allUsers = () => [...BUILTIN, ...saved()].map(u => ({ ...u, ...(overrides()[u.username] || {}) }));

  const session = () => {
    try { return JSON.parse(sessionStorage.getItem(KEY)); } catch { return null; }
  };

  const start = u => {
    const s = { username: u.username, name: u.name, email: u.email, role: u.role, profile: u.profile || null, guest: !!u.guest };
    try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch {}
    return s;
  };

  return {
    session,
    isAdmin: () => session()?.role === 'Admin',

    /* "Continue anonymously" sessions can browse, but can't send reports, create tickets / tasks /
       projects, vote, save or comment. */
    isGuest: () => !!session()?.guest,

    /* If the visitor is anonymous, show the "sign in first" dialog and return true (= stop the action).
       Signed-in users get false and carry on.   usage:  if (Auth.gate('submit a report')) return; */
    gate(what = 'do that') {
      if (!session()?.guest) return false;
      if (document.getElementById('gate-dlg')) return true;
      const d = document.createElement('dialog');
      d.id = 'gate-dlg'; d.className = 'modal gate';
      d.innerHTML = `<div class="mform">
        <div class="gate-ic" aria-hidden="true"><i class="icon" data-lucide="lock"></i></div>
        <h2>Sign in required</h2>
        <p class="mnote">You’re browsing anonymously. You need to sign in to ${what}. Don’t have an account yet? Continue to sign up, it only takes a minute.</p>
        <div class="gate-btns">
          <button class="btn" type="button" data-to="signin">Sign in</button>
          <button class="btn ghost" type="button" data-to="signup">Sign up</button>
          <button class="gate-x" type="button" data-to="">Not now</button>
        </div></div>`;
      d.addEventListener('click', e => {
        const b = e.target.closest('[data-to]');
        if (e.target === d || (b && !b.dataset.to)) return d.close();
        if (b) {                                         // end the anonymous session so login.html doesn't bounce back
          try { sessionStorage.removeItem(KEY); } catch {}
          location.href = 'login.html#' + b.dataset.to;
        }
      });
      d.addEventListener('close', () => d.remove());
      (document.querySelector('.page') || document.body).appendChild(d);   // inside .page so it follows light/dark theme
      if (window.lucide) lucide.createIcons();
      d.showModal();
      return true;
    },

    /* only these roles may edit / move / delete tickets. Members can read them and comment. */
    canManageTickets: () => ['Admin', 'Staff'].includes(session()?.role),

    /* Staff & Admin see every ticket. A Member only sees tickets their own account created. */
    canSeeTicket(t) {
      const s = session();
      if (!s || !t) return false;
      if (['Admin', 'Staff'].includes(s.role)) return true;
      return t.byUser ? t.byUser === s.username : !!t.by && t.by === s.name;   // older tickets only stored the name
    },

    /* Tasks follow the same rule: Staff & Admin see every account's tasks, a Member only their own. */
    canSeeTask(t) { return this.canSeeTicket(t); },

    /* every account (used by the Tasks page so Staff / Admin can browse by account) */
    accounts: () => allUsers().map(({ username, name, role }) => ({ username, name, role })),

    /* sign in with either username or email */
    login(id, password) {
      id = id.trim().toLowerCase();
      const u = allUsers().find(x => (x.username === id || (x.email || '').toLowerCase() === id) && x.password === password);
      return u ? start(u) : null;
    },

    /* create an account and sign it in. Returns { ok, error?, session? } */
    register({ name, username, email, password, profile }) {
      username = username.trim().toLowerCase();
      email = email.trim().toLowerCase();
      if (allUsers().some(u => u.username === username)) return { ok: false, error: 'That username is already taken.' };
      if (allUsers().some(u => (u.email || '').toLowerCase() === email)) return { ok: false, error: 'That email is already registered.' };
      const u = { username, password, name: name.trim(), email, role: 'Member', profile: profile || null };  // sign-ups are always Members
      try { localStorage.setItem(USERS_KEY, JSON.stringify([...saved(), u])); }
      catch { return { ok: false, error: 'Could not save the account (browser storage is blocked).' }; }
      return { ok: true, session: start(u) };
    },

    /* continue without an account. A throw-away Member session: nothing is saved to the
       users list, and it ends when the tab closes. */
    guest() {
      const id = 'guest-' + Math.random().toString(36).slice(2, 8);
      return start({ username: id, name: 'Anonymous', email: '', role: 'Member', guest: true });
    },

    /* Settings page: change display name. Returns { ok, error?, session? } */
    updateProfile({ name }) {
      const s = session();
      if (!s) return { ok: false, error: 'You are not signed in.' };
      name = (name || '').trim();
      if (!name) return { ok: false, error: 'Please enter your name.' };
      if (!patch(s.username, { name })) return { ok: false, error: 'Could not save (browser storage is blocked).' };
      const next = { ...s, name };
      try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return { ok: true, session: next };
    },

    /* Settings page: change password. Same rule as sign-up: 8+ chars, a letter and a number */
    changePassword(current, next) {
      const s = session();
      const u = s && allUsers().find(x => x.username === s.username);
      if (!u || u.password !== current) return { ok: false, error: 'Your current password is incorrect.' };
      if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) return { ok: false, error: 'New password needs 8+ characters with a letter and a number.' };
      if (next === current) return { ok: false, error: 'Choose a password different from your current one.' };
      if (!patch(s.username, { password: next })) return { ok: false, error: 'Could not save (browser storage is blocked).' };
      return { ok: true };
    },

    usernameTaken: username => allUsers().some(u => u.username === username.trim().toLowerCase()),

    logout() {
      try { sessionStorage.removeItem(KEY); } catch {}
      location.replace('login.html');
    },

    /* call at the top of a protected page */
    require() { if (!session()) location.replace('login.html'); },
  };
})();
