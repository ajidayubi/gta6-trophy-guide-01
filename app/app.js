const STORAGE_KEY = 'gta6-trophy-guide-progress-v1';

let trophies = [];
let progress = {};
let currentFilter = 'all';
let searchQuery = '';
let hideSpoilers = true;
let selectedTrophyId = null;

async function init() {
  try {
    const res = await fetch('data/trophies.json');
    if (!res.ok) throw new Error('Failed to load trophies.json');
    const data = await res.json();
    trophies = data.trophies || [];
    loadProgress();
    setupEventListeners();
    render();
  } catch (err) {
    console.error('Initialization error:', err);
    document.getElementById('trophy-list').innerHTML = `
      <div class="card" style="padding: 2rem; text-align: center; color: var(--accent-amber);">
        <h3>Error Loading Trophies</h3>
        <p>${err.message}</p>
        <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 1rem;">Please ensure you are running via a local static server (e.g. python3 -m http.server).</p>
      </div>
    `;
  }
}

function loadProgress() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      progress = JSON.parse(saved);
    } else {
      progress = {};
    }
  } catch (e) {
    console.error('Failed to load progress from localStorage', e);
    progress = {};
  }
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save progress to localStorage', e);
  }
}

function setupEventListeners() {
  // Filter buttons
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter');
      renderList();
    });
  });

  // Search input
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderList();
  });

  // Spoiler toggle
  const spoilerToggle = document.getElementById('spoiler-toggle');
  spoilerToggle.addEventListener('change', (e) => {
    hideSpoilers = e.target.checked;
    renderList();
  });

  // Export progress
  document.getElementById('export-btn').addEventListener('click', exportProgress);

  // Import progress
  document.getElementById('import-file').addEventListener('change', importProgress);

  // Reset progress
  document.getElementById('reset-btn').addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all earned trophy progress?')) {
      progress = {};
      saveProgress();
      render();
    }
  });

  // Modal close
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('detail-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('detail-modal')) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

function render() {
  renderProgressStats();
  renderList();
  if (selectedTrophyId !== null) {
    renderDetail(selectedTrophyId);
  }
}

function renderProgressStats() {
  const earnedCount = trophies.filter(t => progress[t.id]).length;
  const totalCount = trophies.length;
  const pct = Math.round((earnedCount / totalCount) * 100);

  document.getElementById('progress-text').textContent = `${earnedCount} / ${totalCount} earned`;
  document.getElementById('progress-pct').textContent = `${pct}%`;
  document.getElementById('progress-bar').style.width = `${pct}%`;
}

function renderList() {
  const listEl = document.getElementById('trophy-list');
  
  const filtered = trophies.filter(t => {
    // Kind filter
    if (currentFilter !== 'all') {
      if (currentFilter === 'platinum' && t.grade !== 'platinum') return false;
      if (currentFilter === 'missable' && !t.missable) return false;
      if (currentFilter !== 'platinum' && currentFilter !== 'missable') {
        if (t.kind !== currentFilter) return false;
      }
    }

    // Search filter
    if (searchQuery) {
      const matchName = t.name.toLowerCase().includes(searchQuery);
      const matchDesc = t.description.toLowerCase().includes(searchQuery);
      const matchGuide = t.guide.toLowerCase().includes(searchQuery);
      if (!matchName && !matchDesc && !matchGuide) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state card">
        <p>No trophies found matching your criteria.</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = filtered.map(t => {
    const isEarned = !!progress[t.id];
    const isHiddenStory = t.hidden && !isEarned && hideSpoilers;

    const displayName = isHiddenStory ? 'Hidden trophy — earn it to reveal' : t.name;
    const displayDesc = isHiddenStory ? 'Progress through the story or complete prerequisites to reveal this trophy description.' : t.description;

    const gradeClass = `grade-${t.grade}`;
    const gradeLabel = t.grade.toUpperCase();

    return `
      <div class="trophy-card card ${isEarned ? 'earned' : ''}" data-id="${t.id}">
        <div class="trophy-main-row">
          <div class="trophy-checkbox-wrap" onclick="event.stopPropagation()">
            <input type="checkbox" class="trophy-check" data-id="${t.id}" ${isEarned ? 'checked' : ''} aria-label="Mark ${t.name} as earned">
          </div>
          <div class="trophy-info" onclick="openDetail(${t.id})">
            <div class="trophy-meta-badges">
              <span class="badge ${gradeClass}">${gradeLabel}</span>
              <span class="badge kind-badge">${t.kind}</span>
              ${t.missable ? '<span class="badge badge-missable">MISSABLE</span>' : ''}
              ${t.count ? `<span class="badge badge-count">Target: ${t.count}</span>` : ''}
            </div>
            <h3 class="trophy-title">${displayName}</h3>
            <p class="trophy-desc">${displayDesc}</p>
          </div>
          <div class="trophy-action-hint" onclick="openDetail(${t.id})">
            <span class="view-guide-link">Guide &rarr;</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach checkbox event listeners
  listEl.querySelectorAll('.trophy-check').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const id = parseInt(e.target.getAttribute('data-id'), 10);
      progress[id] = e.target.checked;
      saveProgress();
      renderProgressStats();
      // Re-render list to update earned card styling
      renderList();
      if (selectedTrophyId === id) {
        renderDetail(id);
      }
    });
  });
}

window.openDetail = function(id) {
  selectedTrophyId = id;
  renderDetail(id);
  document.getElementById('detail-modal').style.display = 'flex';
}

function closeModal() {
  selectedTrophyId = null;
  document.getElementById('detail-modal').style.display = 'none';
}

function renderDetail(id) {
  const t = trophies.find(item => item.id === id);
  if (!t) return;

  const isEarned = !!progress[id];
  const isHiddenStory = t.hidden && !isEarned && hideSpoilers;

  const displayName = isHiddenStory ? 'Hidden trophy — earn it to reveal' : t.name;
  const displayDesc = isHiddenStory ? 'Progress through the story or complete prerequisites to reveal this trophy description.' : t.description;
  const displayGuide = isHiddenStory ? 'Guide hidden while trophy is locked and spoiler protection is active. Earn the trophy or disable "Hide story spoilers" to view.' : t.guide;

  const sourcesHtml = (t.sources && t.sources.length > 0) 
    ? t.sources.map(s => `<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.name}</a></li>`).join('')
    : '<li>Official Leonida cross-referenced game database</li>';

  const modalBody = document.getElementById('modal-body');
  modalBody.innerHTML = `
    <div class="detail-header">
      <div class="trophy-meta-badges">
        <span class="badge grade-${t.grade}">${t.grade.toUpperCase()}</span>
        <span class="badge kind-badge">${t.kind}</span>
        ${t.missable ? '<span class="badge badge-missable">MISSABLE</span>' : ''}
        ${t.count ? `<span class="badge badge-count">Target: ${t.count}</span>` : ''}
      </div>
      <h2>${displayName}</h2>
      <p class="detail-official-desc"><strong>Official Description:</strong> ${displayDesc}</p>
    </div>

    <div class="detail-section">
      <h3>Leonida Roadbook Guide</h3>
      <p class="detail-guide-text">${displayGuide}</p>
    </div>

    <div class="detail-section">
      <h3>Cited Sources &amp; References</h3>
      <ul class="sources-list">
        ${sourcesHtml}
      </ul>
    </div>

    <div class="detail-footer-action">
      <label class="checkbox-label-large">
        <input type="checkbox" id="modal-check" ${isEarned ? 'checked' : ''}> Mark as Earned
      </label>
    </div>
  `;

  document.getElementById('modal-check').addEventListener('change', (e) => {
    progress[id] = e.target.checked;
    saveProgress();
    renderProgressStats();
    renderList();
  });
}

function exportProgress() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
    version: 1,
    game: "gta6-trophy-guide-01",
    timestamp: new Date().toISOString(),
    progress: progress
  }, null, 2));
  
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "gta6_trophy_progress.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importProgress(e) {
  const fileReader = new FileReader();
  if (e.target.files[0]) {
    fileReader.readAsText(e.target.files[0], "UTF-8");
    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed && parsed.progress && typeof parsed.progress === 'object') {
          progress = parsed.progress;
          saveProgress();
          render();
          alert('Progress imported successfully!');
        } else if (parsed && typeof parsed === 'object') {
          // Direct map format support
          progress = parsed;
          saveProgress();
          render();
          alert('Progress imported successfully!');
        } else {
          throw new Error('Invalid JSON structure');
        }
      } catch (err) {
        alert('Failed to import progress file: ' + err.message);
      }
      // Reset file input
      e.target.value = '';
    };
  }
}

// Start app
init();
