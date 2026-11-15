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
    const s = { username: u.username, name: u.name, email: u.email, role: u.role };
    try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch {}
    return s;
  };

  return {
    session,
    isAdmin: () => session()?.role === 'Admin',

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
    register({ name, username, email, password }) {
      username = username.trim().toLowerCase();
      email = email.trim().toLowerCase();
      if (allUsers().some(u => u.username === username)) return { ok: false, error: 'That username is already taken.' };
      if (allUsers().some(u => (u.email || '').toLowerCase() === email)) return { ok: false, error: 'That email is already registered.' };
      const u = { username, password, name: name.trim(), email, role: 'Member' };  // sign-ups are always Members
      try { localStorage.setItem(USERS_KEY, JSON.stringify([...saved(), u])); }
      catch { return { ok: false, error: 'Could not save the account (browser storage is blocked).' }; }
      return { ok: true, session: start(u) };
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
