/* login.js — sign in + sign up */
const $ = s => document.querySelector(s);

// already signed in? go straight to the dashboard
if (Auth.session()) location.replace('index.html');

lucide.createIcons();

const card = $('#card');
const tabs = { in: $('#tab-in'), up: $('#tab-up') };
const panes = { in: $('#form'), up: $('#form-up') };

/* ---------- switch between Sign in / Sign up ---------- */
function mode(m, focus = true) {
  card.dataset.mode = m;
  for (const k of ['in', 'up']) {
    tabs[k].setAttribute('aria-selected', k === m);
    panes[k].hidden = k !== m;
  }
  history.replaceState(null, '', m === 'up' ? '#signup' : '#signin');
  if (focus) (m === 'up' ? $('#su-name') : $('#user')).focus();
}
tabs.in.addEventListener('click', () => mode('in'));
tabs.up.addEventListener('click', () => mode('up'));
document.querySelectorAll('[data-go]').forEach(a =>
  a.addEventListener('click', e => { e.preventDefault(); mode(a.dataset.go); }));
mode(location.hash === '#signup' ? 'up' : 'in', false);

/* ---------- helpers ---------- */
document.querySelectorAll('[data-eye]').forEach(btn => btn.addEventListener('click', () => {
  const input = document.getElementById(btn.dataset.eye);
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  btn.classList.toggle('on', show);
  btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
}));

function say(el, text, ok = false) {
  el.textContent = text;
  el.className = 'msg show' + (ok ? ' ok' : '');
  if (!ok) { card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); }
}
const clear = (...els) => els.forEach(e => e.addEventListener('input', () => e.closest('form').querySelector('.msg').classList.remove('show')));

/* ---------- sign in ---------- */
const user = $('#user'), pass = $('#pass'), msg = $('#msg'), go = $('#go');

panes.in.addEventListener('submit', e => {
  e.preventDefault();
  if (!user.value.trim() || !pass.value) return say(msg, 'Enter your email (or username) and password.');

  go.disabled = true; go.classList.add('busy');
  setTimeout(() => {                       // small delay so the button feedback is visible
    const s = Auth.login(user.value, pass.value);
    if (!s) {
      go.disabled = false; go.classList.remove('busy');
      pass.value = ''; pass.focus();
      return say(msg, 'Wrong email/username or password.');
    }
    say(msg, `Welcome, ${s.name.split(' ')[0]}!`, true);
    setTimeout(() => location.replace('index.html'), 350);
  }, 450);
});
clear(user, pass);

/* ---------- sign up ---------- */
const f = { name: $('#su-name'), user: $('#su-user'), email: $('#su-email'), pass: $('#su-pass'), pass2: $('#su-pass2') };
const msgUp = $('#msg-up'), goUp = $('#go-up'), meter = $('#meter'), meterT = $('#meter-t');

function strength(p) {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p) || p.length >= 12) s++;
  return p ? Math.max(s, 1) : 0;
}
f.pass.addEventListener('input', () => {
  const s = strength(f.pass.value);
  meter.dataset.s = s;
  meterT.textContent = s ? ['', 'Weak', 'Okay', 'Good', 'Strong'][s] : 'At least 8 characters, with a letter and a number';
});

panes.up.addEventListener('submit', e => {
  e.preventDefault();
  const name = f.name.value.trim(), un = f.user.value.trim(), email = f.email.value.trim(), p = f.pass.value;

  if (!name || !un || !email || !p || !f.pass2.value) return say(msgUp, 'Please fill in every field.');
  if (!/^[a-z0-9_]{3,20}$/i.test(un)) return say(msgUp, 'Username: 3–20 letters, numbers or underscores.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return say(msgUp, 'Enter a valid email address.');
  if (p.length < 8 || !/[A-Za-z]/.test(p) || !/\d/.test(p)) return say(msgUp, 'Password needs 8+ characters with a letter and a number.');
  if (p !== f.pass2.value) { f.pass2.value = ''; f.pass2.focus(); return say(msgUp, 'Passwords don’t match.'); }

  goUp.disabled = true; goUp.classList.add('busy');
  setTimeout(() => {
    const r = Auth.register({ name, username: un, email, password: p });
    if (!r.ok) { goUp.disabled = false; goUp.classList.remove('busy'); return say(msgUp, r.error); }
    say(msgUp, `Account created. Welcome, ${r.session.name.split(' ')[0]}!`, true);
    setTimeout(() => location.replace('index.html'), 600);
  }, 450);
});
clear(...Object.values(f));

// social buttons are visual only (they need a real backend / OAuth keys)
document.querySelectorAll('.social button').forEach(b =>
  b.addEventListener('click', () => {
    const el = panes.up.hidden ? msg : msgUp;
    say(el, `${b.dataset.provider} sign-in needs a server. Use the form for now.`);
  }));

