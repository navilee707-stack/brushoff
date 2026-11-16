/* mobile.js : opens / closes the sidebar drawer on small screens */
(function () {
  const sb = document.querySelector('.sidebar'), btn = document.getElementById('menu-btn'), scrim = document.getElementById('scrim');
  if (!sb || !btn || !scrim) return;

  const set = open => {
    sb.classList.toggle('drawer-open', open);
    scrim.classList.toggle('show', open);
    document.body.classList.toggle('drawer-lock', open);
    btn.setAttribute('aria-expanded', String(open));
  };
  const isOpen = () => sb.classList.contains('drawer-open');

  btn.addEventListener('click', () => set(!isOpen()));
  scrim.addEventListener('click', () => set(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) { set(false); btn.focus(); } });

  // close after picking a page / opening settings / logging out
  sb.addEventListener('click', e => {
    if (e.target.closest('label.item, #open-settings, #logout, [data-go="profile"], [data-go="settings"], [data-go="logout"]')) set(false);
  });

  // leaving the phone layout (rotate / resize) resets the drawer
  window.matchMedia('(min-width: 821px)').addEventListener('change', e => { if (e.matches) set(false); });

  // keep the page title in the top bar in sync with the open view
  const title = document.getElementById('topbar-title');
  const names = ['Dashboard', 'Reports', 'Discover', 'Tickets', 'Tasks', 'Projects', 'Application', 'User Management', 'Settings'];
  const sync = () => {
    const r = document.querySelector('.nav-radio:checked');
    if (title && r) title.textContent = names[(+r.id.replace('nav-', '') || 1) - 1];
  };
  document.querySelectorAll('.nav-radio').forEach(r => r.addEventListener('change', sync));
  document.addEventListener('click', () => setTimeout(sync, 0));   // goNav() sets radios without a change event
  sync();
})();
