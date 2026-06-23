// ─── Data ───────────────────────────────────────────────────────────
const COLORS = ['#534AB7','#1D9E75','#D85A30','#D4537E','#BA7517','#378ADD','#3B6D11','#636363'];
const STORAGE_KEY = 'agenda_ideas_v2';

let state = load();
let editProjId = null, editIdeaId = null, activeProjId = null;
let selColor = COLORS[0];

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return {
    projects: [],
    nextProjId: 1,
    nextIdeaId: 1,
    theme: 'light'
  };
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ─── Theme ──────────────────────────────────────────────────────────
function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  document.getElementById('theme-icon').className = state.theme === 'dark' ? 'ti ti-sun' : 'ti ti-moon';
}
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  save(); applyTheme();
}

// ─── Helpers ────────────────────────────────────────────────────────
function pct(ideas) {
  if (!ideas.length) return 0;
  return Math.round(ideas.filter(i => i.done).length / ideas.length * 100);
}

function fmtDate(d) {
  if (!d) return '';
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${y}`;
}

function isOverdue(d) {
  if (!d) return false;
  return new Date(d) < new Date(new Date().toDateString());
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ─── Stats ──────────────────────────────────────────────────────────
function updateStats() {
  const projs = state.projects;
  const total = projs.reduce((s, p) => s + p.ideas.length, 0);
  const done  = projs.reduce((s, p) => s + p.ideas.filter(i => i.done).length, 0);
  const pctDone = total ? Math.round(done / total * 100) : 0;

  document.getElementById('stat-projects').textContent = projs.length;
  document.getElementById('stat-ideas').textContent = total;
  document.getElementById('stat-done').textContent = pctDone + '%';
  document.getElementById('subtitle').textContent =
    `${projs.length} proyecto${projs.length !== 1 ? 's' : ''} · ${total} idea${total !== 1 ? 's' : ''}`;
}

// ─── Render ─────────────────────────────────────────────────────────
function render() {
  updateStats();
  const list = document.getElementById('projects-list');
  list.innerHTML = '';

  if (!state.projects.length) {
    list.innerHTML = `
      <div class="empty">
        <i class="ti ti-mood-empty"></i>
        <div class="empty-title">Sin proyectos todavía</div>
        <div class="empty-desc">Crea tu primer proyecto y empieza a organizar tus ideas.</div>
      </div>`;
    return;
  }

  state.projects.forEach(proj => {
    list.appendChild(buildProjectCard(proj));
  });
}

function buildProjectCard(proj) {
  const p = pct(proj.ideas);
  const r = 16, circ = 2 * Math.PI * r;
  const offset = circ - (p / 100 * circ);
  const done = proj.ideas.filter(i => i.done).length;

  const card = document.createElement('div');
  card.className = 'project-card';
  card.id = `pc-${proj.id}`;

  card.innerHTML = `
    <div class="project-header" onclick="toggleProj(${proj.id})" tabindex="0" role="button" aria-expanded="${proj.open}">
      <div class="proj-color-bar" style="background:${proj.color}"></div>
      <div class="proj-info">
        <div class="proj-name">${esc(proj.name)}</div>
        <div class="proj-count">${proj.ideas.length} idea${proj.ideas.length !== 1 ? 's' : ''} · ${done} completada${done !== 1 ? 's' : ''}</div>
      </div>
      <div class="ring-wrap">
        <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
          <circle class="ring-bg" cx="22" cy="22" r="${r}"/>
          <circle class="ring-fill" cx="22" cy="22" r="${r}"
            stroke="${proj.color}"
            stroke-dasharray="${circ.toFixed(2)}"
            stroke-dashoffset="${offset.toFixed(2)}"/>
        </svg>
        <div class="ring-pct">${p}%</div>
      </div>
      <div class="proj-actions" onclick="event.stopPropagation()">
        <button class="btn-icon" title="Editar proyecto" onclick="editProj(${proj.id})" aria-label="Editar proyecto"><i class="ti ti-edit"></i></button>
        <button class="btn-icon danger" title="Eliminar proyecto" onclick="delProj(${proj.id})" aria-label="Eliminar proyecto"><i class="ti ti-trash"></i></button>
      </div>
      <i class="ti ti-chevron-down chevron${proj.open ? ' open' : ''}"></i>
    </div>
    <div class="proj-progress-bar">
      <div class="proj-progress-fill" style="width:${p}%;background:${proj.color}"></div>
    </div>
    <div class="project-body${proj.open ? ' open' : ''}" id="pb-${proj.id}">
      <div class="progress-label">${done}/${proj.ideas.length} completadas</div>
      <div class="ideas-list" id="il-${proj.id}">
        ${buildIdeasHTML(proj)}
      </div>
      <button class="btn-add-idea" onclick="openIdeaModal(${proj.id})">
        <i class="ti ti-plus"></i> Añadir idea
      </button>
    </div>
  `;

  return card;
}

function buildIdeasHTML(proj) {
  if (!proj.ideas.length) {
    return `<div style="text-align:center;padding:14px 0;color:var(--text3);font-size:13px">
      Sin ideas aún. ¡Añade la primera!
    </div>`;
  }
  return proj.ideas.map(idea => {
    const over = !idea.done && isOverdue(idea.date);
    return `
      <div class="idea-row${idea.done ? ' done' : ''}" id="ir-${idea.id}">
        <input type="checkbox" class="idea-cb" ${idea.done ? 'checked' : ''}
          onchange="toggleIdea(${proj.id},${idea.id})" aria-label="Marcar completada">
        <div class="idea-content">
          <div class="idea-title-line">
            <span class="idea-title${idea.done ? ' done-text' : ''}">${esc(idea.title)}</span>
            <span class="badge badge-${idea.priority}">${capFirst(idea.priority)}</span>
          </div>
          ${idea.desc ? `<div class="idea-desc">${esc(idea.desc)}</div>` : ''}
          ${idea.date ? `<div class="idea-date${over ? ' overdue' : ''}">
            <i class="ti ti-calendar"></i>${fmtDate(idea.date)}${over ? ' · Vencida' : ''}
          </div>` : ''}
        </div>
        <div class="idea-row-actions">
          <button class="btn-icon" title="Editar idea" onclick="editIdea(${proj.id},${idea.id})" aria-label="Editar idea"><i class="ti ti-edit"></i></button>
          <button class="btn-icon danger" title="Eliminar idea" onclick="delIdea(${proj.id},${idea.id})" aria-label="Eliminar idea"><i class="ti ti-trash"></i></button>
        </div>
      </div>`;
  }).join('');
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function capFirst(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ─── Project actions ─────────────────────────────────────────────────
function toggleProj(id) {
  const p = state.projects.find(x => x.id === id);
  if (p) p.open = !p.open;
  save(); render();
}

function openProjectModal(editId = null) {
  editProjId = editId;
  const mp = document.getElementById('modal-project');
  const nameEl = document.getElementById('proj-name');

  if (editId) {
    const p = state.projects.find(x => x.id === editId);
    nameEl.value = p.name;
    selColor = p.color;
    document.getElementById('mp-title').textContent = 'Editar proyecto';
  } else {
    nameEl.value = '';
    selColor = COLORS[0];
    document.getElementById('mp-title').textContent = 'Nuevo proyecto';
  }
  buildColorPicker();
  mp.classList.add('active');
  setTimeout(() => nameEl.focus(), 80);
}

function editProj(id) { openProjectModal(id); }

function delProj(id) {
  const p = state.projects.find(x => x.id === id);
  if (!confirm(`¿Eliminar el proyecto "${p.name}" y todas sus ideas?`)) return;
  state.projects = state.projects.filter(x => x.id !== id);
  save(); render();
  showToast('Proyecto eliminado');
}

function saveProject() {
  const name = document.getElementById('proj-name').value.trim();
  if (!name) { document.getElementById('proj-name').focus(); return; }

  if (editProjId) {
    const p = state.projects.find(x => x.id === editProjId);
    p.name = name; p.color = selColor;
    showToast('Proyecto actualizado');
  } else {
    state.projects.push({ id: state.nextProjId++, name, color: selColor, open: true, ideas: [] });
    showToast('Proyecto creado');
  }
  save();
  closeModal('modal-project');
  render();
}

// ─── Idea actions ────────────────────────────────────────────────────
function openIdeaModal(projId, editId = null) {
  activeProjId = projId;
  editIdeaId = editId;

  if (editId) {
    const p = state.projects.find(x => x.id === projId);
    const idea = p.ideas.find(i => i.id === editId);
    document.getElementById('idea-title-inp').value = idea.title;
    document.getElementById('idea-desc-inp').value = idea.desc || '';
    document.getElementById('idea-priority').value = idea.priority;
    document.getElementById('idea-date').value = idea.date || '';
    document.getElementById('mi-title').textContent = 'Editar idea';
  } else {
    document.getElementById('idea-title-inp').value = '';
    document.getElementById('idea-desc-inp').value = '';
    document.getElementById('idea-priority').value = 'media';
    document.getElementById('idea-date').value = '';
    document.getElementById('mi-title').textContent = 'Nueva idea';
  }
  document.getElementById('modal-idea').classList.add('active');
  setTimeout(() => document.getElementById('idea-title-inp').focus(), 80);
}

function editIdea(projId, ideaId) { openIdeaModal(projId, ideaId); }

function delIdea(projId, ideaId) {
  const p = state.projects.find(x => x.id === projId);
  p.ideas = p.ideas.filter(i => i.id !== ideaId);
  save(); render();
  showToast('Idea eliminada');
}

function saveIdea() {
  const title = document.getElementById('idea-title-inp').value.trim();
  if (!title) { document.getElementById('idea-title-inp').focus(); return; }

  const p = state.projects.find(x => x.id === activeProjId);
  if (editIdeaId) {
    const idea = p.ideas.find(i => i.id === editIdeaId);
    idea.title = title;
    idea.desc = document.getElementById('idea-desc-inp').value.trim();
    idea.priority = document.getElementById('idea-priority').value;
    idea.date = document.getElementById('idea-date').value;
    showToast('Idea actualizada');
  } else {
    p.ideas.push({
      id: state.nextIdeaId++,
      title,
      desc: document.getElementById('idea-desc-inp').value.trim(),
      priority: document.getElementById('idea-priority').value,
      date: document.getElementById('idea-date').value,
      done: false
    });
    showToast('Idea añadida');
  }
  save();
  closeModal('modal-idea');
  render();
}

function toggleIdea(projId, ideaId) {
  const p = state.projects.find(x => x.id === projId);
  const idea = p.ideas.find(i => i.id === ideaId);
  idea.done = !idea.done;
  save(); render();
}

// ─── Modal helpers ───────────────────────────────────────────────────
function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

document.querySelectorAll('.overlay').forEach(ov => {
  ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('active'); });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.overlay.active').forEach(ov => ov.classList.remove('active'));
  }
});

// ─── Color picker ────────────────────────────────────────────────────
function buildColorPicker() {
  const cp = document.getElementById('color-picker');
  cp.innerHTML = '';
  COLORS.forEach(c => {
    const d = document.createElement('div');
    d.className = 'c-dot' + (c === selColor ? ' selected' : '');
    d.style.background = c;
    d.onclick = () => { selColor = c; buildColorPicker(); };
    d.setAttribute('tabindex', '0');
    d.setAttribute('role', 'radio');
    d.setAttribute('aria-checked', c === selColor);
    d.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { selColor = c; buildColorPicker(); } };
    cp.appendChild(d);
  });
}

// ─── Init ────────────────────────────────────────────────────────────
applyTheme();
render();
