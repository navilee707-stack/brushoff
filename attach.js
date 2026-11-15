/* attach.js — pictures & files on tickets / tasks / comments.
   Files are stored inside the browser (localStorage) as data URLs, so this works with no server.
   Pictures are shrunk automatically to keep the 5 MB browser storage from filling up. */

const Attach = (() => {
  const MAX_ITEMS = 6;                 // per ticket / task / comment
  const MAX_FILE = 1.5 * 1024 * 1024;  // non-picture files
  const MAX_TOTAL = 2 * 1024 * 1024;   // everything attached to one item
  const MAX_DIM = 1280;                // pictures are scaled down to this many pixels

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => n < 1024 ? n + ' B' : n < 1048576 ? Math.round(n / 1024) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
  const isImg = a => /^data:image\//.test(a?.data || '');
  const total = list => list.reduce((s, a) => s + (a.data?.length || 0), 0);

  const readFile = f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(f); });

  async function shrink(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
      const k = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.naturalWidth * k));
      c.height = Math.max(1, Math.round(img.naturalHeight * k));
      const g = c.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);   // transparent PNGs get a white background
      g.drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.78);
    } finally { URL.revokeObjectURL(url); }
  }

  /* File -> { name, type, size, data } */
  async function make(file) {
    const picture = file.type.startsWith('image/');
    let data;
    if (picture && file.type !== 'image/gif' && file.type !== 'image/svg+xml') {
      try { data = await shrink(file); } catch { data = null; }
    }
    if (!data) {
      if (file.size > MAX_FILE) throw new Error(`“${file.name}” is too big (max ${fmt(MAX_FILE)}).`);
      data = await readFile(file);
    }
    return { name: file.name, type: file.type || 'application/octet-stream', size: data.length, data };
  }

  /* read-only display of a list of attachments */
  function render(list, removable = false) {
    list = (list || []).filter(a => a && /^data:/.test(a.data || ''));
    if (!list.length) return '';
    const pics = list.map((a, i) => ({ a, i })).filter(x => isImg(x.a));
    const files = list.map((a, i) => ({ a, i })).filter(x => !isImg(x.a));
    const rm = i => removable ? `<button type="button" class="att-x" data-rm="${i}" aria-label="Remove">&times;</button>` : '';
    return `<div class="atts">
      ${pics.map(({ a, i }) => `<div class="att-pic"><button type="button" class="att-img" title="${esc(a.name)}"><img src="${esc(a.data)}" alt="${esc(a.name)}" loading="lazy" /></button>${rm(i)}</div>`).join('')}
      ${files.map(({ a, i }) => `<div class="att-file"><a href="${esc(a.data)}" download="${esc(a.name)}"><i class="icon" data-lucide="file-text"></i><span><b>${esc(a.name)}</b><small>${fmt(a.size || 0)}</small></span></a>${rm(i)}</div>`).join('')}
    </div>`;
  }

  /* the "add files" control. root = an empty element. Returns { get, busy } */
  function widget(root, initial = []) {
    let list = [...initial], pending = 0;
    root.classList.add('attach');
    root.innerHTML = `<label class="drop"><input type="file" multiple hidden /><i class="icon" data-lucide="paperclip"></i><span><b>Add pictures or files</b><small>Click here or drop them in · up to ${MAX_ITEMS} files</small></span></label><div class="alist"></div><p class="set-msg err" role="alert"></p>`;
    const input = root.querySelector('input'), box = root.querySelector('.alist'), msg = root.querySelector('.set-msg'), drop = root.querySelector('.drop');
    const say = t => { msg.textContent = t || ''; };
    const paint = () => { box.innerHTML = render(list, true); if (window.lucide) lucide.createIcons(); };

    async function add(files) {
      say('');
      for (const f of files) {
        if (list.length >= MAX_ITEMS) { say(`You can attach up to ${MAX_ITEMS} files.`); break; }
        pending++; drop.classList.add('busy');
        try {
          const a = await make(f);
          if (total(list) + a.data.length > MAX_TOTAL) say(`Too much attached. Keep the total under ${fmt(MAX_TOTAL)}.`);
          else { list.push(a); paint(); }
        } catch (e) { say(e.message || 'Could not read that file.'); }
        pending--; if (!pending) drop.classList.remove('busy');
      }
    }
    input.addEventListener('change', () => { add([...input.files]); input.value = ''; });
    ['dragenter', 'dragover'].forEach(n => drop.addEventListener(n, e => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(n => drop.addEventListener(n, e => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', e => add([...e.dataTransfer.files]));
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-rm]'); if (!b) return;
      list.splice(+b.dataset.rm, 1); say(''); paint();
    });
    paint();
    return { get: () => list.slice(), busy: () => pending > 0, reset: () => { list = []; say(''); paint(); } };
  }

  /* click a picture anywhere on the page to see it full size */
  document.addEventListener('click', e => {
    const b = e.target.closest('.att-img'); if (!b) return;
    e.stopPropagation();
    const d = document.createElement('dialog');
    d.className = 'lightbox';
    d.innerHTML = `<img src="${esc(b.querySelector('img').src)}" alt="" /><button type="button" aria-label="Close">&times;</button>`;
    d.addEventListener('click', () => d.close());
    d.addEventListener('close', () => d.remove());
    (b.closest('.page') || document.body).appendChild(d);
    d.showModal();
  }, true);

  return { render, widget, count: l => (l || []).length };
})();
