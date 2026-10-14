/* ===== HSK Review App (shared across levels via APP_CONFIG) ===== */
const LESSONS = APP_CONFIG.data.lessons;
const POS_TABLE = APP_CONFIG.data.pos_table;

/* Build flattened vocab list with unique keys */
const ALL_VOCAB = [];
LESSONS.forEach(l => {
  l.vocab.forEach((v, i) => {
    ALL_VOCAB.push({
      ...v,
      lessonId: l.id,
      lessonTitleVn: l.title_vn,
      key: `${l.id}__${i}__${v.hanzi}`
    });
  });
});

/* ===== Known-word tracking (localStorage) ===== */
const KNOWN_KEY = APP_CONFIG.storageKey;
function loadKnown() {
  try { return JSON.parse(localStorage.getItem(KNOWN_KEY)) || {}; }
  catch (e) { return {}; }
}
let knownMap = loadKnown();
function isKnown(key) { return !!knownMap[key]; }
function toggleKnown(key) {
  if (knownMap[key]) delete knownMap[key];
  else knownMap[key] = true;
  localStorage.setItem(KNOWN_KEY, JSON.stringify(knownMap));
}
function knownCount() { return Object.keys(knownMap).length; }

/* ===== Speech synthesis ===== */
// macOS/iOS ship a set of "novelty" fun-effect voices (Eddy, Flo, Grandma,
// Grandpa, Reed, Rocko, Sandy, Shelley, Albert, Bells, Boing, Bubbles, ...)
// that are listed for every language, incl. zh-CN. If we pick the first
// zh-CN match blindly we often land on one of these instead of a normal
// voice, which sounds bizarre rather than just "robotic". Explicitly
// deprioritize them and prefer a real Chinese voice, favoring
// Enhanced/Premium quality if the user has downloaded one.
const NOVELTY_VOICE_NAMES = ['eddy', 'flo', 'grandma', 'grandpa', 'reed', 'rocko', 'sandy', 'shelley',
  'albert', 'bad news', 'bahh', 'bells', 'boing', 'bubbles', 'cellos', 'good news', 'jester',
  'organ', 'superstar', 'trinoids', 'whisper', 'wobble', 'zarvox'];

function pickChineseVoice(voices) {
  const zhVoices = voices.filter(v => v.lang === 'zh-CN') .concat(voices.filter(v => v.lang && v.lang.startsWith('zh') && v.lang !== 'zh-CN'));
  const normal = zhVoices.filter(v => !NOVELTY_VOICE_NAMES.some(n => v.name.toLowerCase().includes(n)));
  const pool = normal.length ? normal : zhVoices;
  if (!pool.length) return null;
  // Prefer higher-quality downloaded voices (Enhanced/Premium) if available.
  const premium = pool.find(v => /premium/i.test(v.name));
  if (premium) return premium;
  const enhanced = pool.find(v => /enhanced/i.test(v.name));
  if (enhanced) return enhanced;
  // Otherwise prefer the standard "Tingting" (zh-CN default) voice over others.
  const tingting = pool.find(v => /tingting/i.test(v.name));
  return tingting || pool[0];
}

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';
  u.rate = 0.85;
  const voice = pickChineseVoice(window.speechSynthesis.getVoices());
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}

/* ===== State ===== */
const state = { searchQuery: '' };

/* ===== Router ===== */
function currentHash() { return location.hash || '#/home'; }
function parseRoute() {
  const h = currentHash().replace(/^#\//, '');
  const parts = h.split('/').filter(Boolean);
  return parts;
}

function route() {
  const parts = parseRoute();
  const main = document.getElementById('main');
  closeMobileSidebar();

  if (parts[0] === 'lesson' && parts[1]) {
    const id = parseInt(parts[1], 10);
    const tab = parts[2] || 'vocab';
    const lesson = LESSONS.find(l => l.id === id);
    if (lesson) { renderLesson(main, lesson, tab); highlightNav(`lesson-${id}`); return; }
  }
  if (parts[0] === 'vocab-all') { renderVocabAll(main); highlightNav('vocab-all'); return; }
  if (parts[0] === 'flashcard') { renderFlashcardSetup(main); highlightNav('flashcard'); return; }
  renderHome(main); highlightNav('home');
}
window.addEventListener('hashchange', route);

function highlightNav(key) {
  document.querySelectorAll('.nav-item, .lesson-item').forEach(el => el.classList.remove('active'));
  const el = document.querySelector(`[data-nav="${key}"]`);
  if (el) el.classList.add('active');
}

/* ===== Sidebar lesson list ===== */
function buildSidebar() {
  const list = document.getElementById('lessonList');
  list.innerHTML = LESSONS.map(l => `
    <a href="#/lesson/${l.id}/vocab" class="lesson-item" data-nav="lesson-${l.id}">
      <span class="lid">${l.id}</span>
      <span class="ltitle">${l.title_vn}</span>
    </a>
  `).join('');
  document.querySelectorAll('.nav-item').forEach(el => {
    const r = el.getAttribute('data-route');
    if (r) el.setAttribute('data-nav', r);
  });
}

/* ===== Home ===== */
function renderHome(main) {
  const totalVocab = ALL_VOCAB.length;
  const totalGrammar = LESSONS.reduce((s, l) => s + l.grammar.length, 0);
  const totalTexts = LESSONS.reduce((s, l) => s + l.texts.length, 0);
  main.innerHTML = `
    <div class="main-inner">
      <div class="hero">
        <h1>欢迎 · Chào mừng bạn trở lại! 👋</h1>
        <p>Ôn tập từ vựng, ngữ pháp và bài khóa của giáo trình ${APP_CONFIG.bookLabelHtml} (chuẩn 3.0, bản tiếng Việt) — đầy đủ ${LESSONS.length} bài.</p>
      </div>
      <div class="stat-grid">
        <div class="stat-card"><div class="num">${LESSONS.length}</div><div class="label">Bài học</div></div>
        <div class="stat-card"><div class="num">${totalVocab}</div><div class="label">Từ vựng</div></div>
        <div class="stat-card"><div class="num">${totalGrammar}</div><div class="label">Điểm ngữ pháp</div></div>
        <div class="stat-card"><div class="num">${totalTexts}</div><div class="label">Bài khóa</div></div>
        <div class="stat-card"><div class="num" id="homeKnownCount">${knownCount()}</div><div class="label">Từ đã thuộc</div></div>
      </div>
      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom: 10px;">
        <a href="#/vocab-all"><button class="btn btn-primary">📚 Xem toàn bộ từ vựng</button></a>
        <a href="#/flashcard"><button class="btn btn-ghost">🧠 Bắt đầu Flashcard</button></a>
      </div>

      <div class="section-title">📖 Danh sách bài học</div>
      <div class="lesson-grid">
        ${LESSONS.map(l => `
          <a class="lesson-card" href="#/lesson/${l.id}/vocab">
            <span class="tag">Bài ${l.id}</span>
            <div class="lc-cn hanzi">${l.title_cn}</div>
            <div class="lc-vn">${l.title_vn}</div>
            <div class="lc-meta">${l.vocab.length} từ vựng · ${l.grammar.length} ngữ pháp · ${l.texts.length} bài khóa</div>
          </a>
        `).join('')}
      </div>

      <div class="section-title">🔤 Chú thích viết tắt từ loại</div>
      <table class="legend-table">
        <thead><tr><th>Hán tự</th><th>Tiếng Việt</th><th>Viết tắt</th></tr></thead>
        <tbody>
          ${POS_TABLE.map(p => `<tr><td class="hanzi">${p.pos_cn}</td><td>${p.pos_vn}</td><td><strong>${p.abbr}</strong></td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/* ===== Vocab row renderer (shared) ===== */
function vocabRowHtml(v, opts = {}) {
  const known = isKnown(v.key);
  return `
    <div class="vocab-row ${known ? 'known' : ''}" data-key="${v.key}">
      <button class="vspeak" data-speak="${encodeURIComponent(v.hanzi)}" title="Phát âm">🔊</button>
      <div class="vhanzi hanzi">${v.hanzi}</div>
      <div class="vmid">
        <span class="vpinyin">${v.pinyin}</span><span class="vpos">${v.pos || ''}</span>
        <div class="vvn">${v.vn}</div>
      </div>
      ${opts.showLesson ? `<div class="vlesson">Bài ${v.lessonId}</div>` : ''}
      <button class="icon-btn know-toggle" data-key="${v.key}" title="Đánh dấu đã thuộc" style="background:${known ? '#e1f3e4' : 'var(--line)'}; color:${known ? 'var(--green)' : 'var(--muted)'};">${known ? '✓' : '☆'}</button>
    </div>
  `;
}

function attachVocabRowEvents(container) {
  container.querySelectorAll('[data-speak]').forEach(btn => {
    btn.addEventListener('click', () => speak(decodeURIComponent(btn.getAttribute('data-speak'))));
  });
  container.querySelectorAll('.know-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-key');
      toggleKnown(key);
      const row = container.querySelector(`.vocab-row[data-key="${key}"]`);
      const known = isKnown(key);
      row.classList.toggle('known', known);
      btn.textContent = known ? '✓' : '☆';
      btn.style.background = known ? '#e1f3e4' : 'var(--line)';
      btn.style.color = known ? 'var(--green)' : 'var(--muted)';
      const hc = document.getElementById('homeKnownCount');
      if (hc) hc.textContent = knownCount();
    });
  });
}

/* ===== Vocab-all page ===== */
function renderVocabAll(main) {
  main.innerHTML = `
    <div class="main-inner">
      <div class="section-title">📚 Toàn bộ từ vựng (${ALL_VOCAB.length} từ)</div>
      <div class="vocab-toolbar">
        <input type="search" id="vocabAllSearch" placeholder="Lọc theo Hán tự / pinyin / nghĩa…" value="${escapeHtml(state.searchQuery)}">
        <select id="vocabAllLesson">
          <option value="">Tất cả bài</option>
          ${LESSONS.map(l => `<option value="${l.id}">Bài ${l.id}</option>`).join('')}
        </select>
      </div>
      <div class="vocab-card-list" id="vocabAllList"></div>
    </div>
  `;
  const search = document.getElementById('vocabAllSearch');
  const lessonSel = document.getElementById('vocabAllLesson');
  function renderList() {
    const q = search.value.trim().toLowerCase();
    const lid = lessonSel.value;
    let items = ALL_VOCAB;
    if (lid) items = items.filter(v => String(v.lessonId) === lid);
    if (q) items = items.filter(v =>
      v.hanzi.includes(q) || v.pinyin.toLowerCase().includes(q) || (v.vn || '').toLowerCase().includes(q)
    );
    const listEl = document.getElementById('vocabAllList');
    if (!items.length) {
      listEl.innerHTML = `<div class="empty-state">Không tìm thấy từ nào khớp.</div>`;
      return;
    }
    listEl.innerHTML = items.map(v => vocabRowHtml(v, { showLesson: true })).join('');
    attachVocabRowEvents(listEl);
  }
  search.addEventListener('input', () => { state.searchQuery = search.value; renderList(); });
  lessonSel.addEventListener('change', renderList);
  renderList();
  if (state.searchQuery) search.focus();
}

/* Called by topbar global search */
function focusVocabAllFilter() {
  const el = document.getElementById('vocabAllSearch');
  if (el) {
    el.value = state.searchQuery;
    el.dispatchEvent(new Event('input'));
  }
}

/* ===== Lesson page ===== */
function renderLesson(main, lesson, tab) {
  const idx = LESSONS.findIndex(l => l.id === lesson.id);
  const prev = LESSONS[idx - 1];
  const next = LESSONS[idx + 1];

  main.innerHTML = `
    <div class="main-inner">
      <div class="lesson-head">
        <span class="tag">Bài ${lesson.id}</span>
        <h2 class="hanzi">${lesson.title_cn}</h2>
        <div class="pinyin-line">${lesson.title_pinyin}</div>
        <div class="vn-line">${lesson.title_vn}</div>
        ${lesson.goals && lesson.goals.length ? `
        <div class="goals">
          <strong style="font-size:13px;">🎯 Mục tiêu bài học</strong>
          <ul>${lesson.goals.map(g => `<li>${g}</li>`).join('')}</ul>
        </div>` : ''}
      </div>

      <div class="tabs">
        <button class="tab-btn" data-tab="vocab">📚 Từ vựng (${lesson.vocab.length})</button>
        <button class="tab-btn" data-tab="grammar">📐 Ngữ pháp (${lesson.grammar.length})</button>
        <button class="tab-btn" data-tab="texts">📝 Bài khóa (${lesson.texts.length})</button>
      </div>
      <div id="tabContent"></div>

      <div class="lesson-nav">
        ${prev ? `<a href="#/lesson/${prev.id}/${tab}"><button class="btn btn-ghost">← Bài ${prev.id}</button></a>` : '<span></span>'}
        ${next ? `<a href="#/lesson/${next.id}/${tab}"><button class="btn btn-ghost">Bài ${next.id} →</button></a>` : '<span></span>'}
      </div>
    </div>
  `;

  main.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
    btn.addEventListener('click', () => {
      location.hash = `#/lesson/${lesson.id}/${btn.getAttribute('data-tab')}`;
    });
  });

  const tabContent = document.getElementById('tabContent');
  if (tab === 'grammar') renderGrammarTab(tabContent, lesson);
  else if (tab === 'texts') renderTextsTab(tabContent, lesson);
  else renderVocabTab(tabContent, lesson);
}

function renderVocabTab(el, lesson) {
  el.innerHTML = `
    <div class="vocab-toolbar">
      <input type="search" id="lessonVocabSearch" placeholder="Lọc từ vựng trong bài này…">
    </div>
    <div class="vocab-card-list" id="lessonVocabList"></div>
  `;
  const search = document.getElementById('lessonVocabSearch');
  const listEl = document.getElementById('lessonVocabList');
  const items = ALL_VOCAB.filter(v => v.lessonId === lesson.id);
  function renderList() {
    const q = search.value.trim().toLowerCase();
    const filtered = q ? items.filter(v => v.hanzi.includes(q) || v.pinyin.toLowerCase().includes(q) || (v.vn || '').toLowerCase().includes(q)) : items;
    listEl.innerHTML = filtered.length ? filtered.map(v => vocabRowHtml(v)).join('') : `<div class="empty-state">Không tìm thấy.</div>`;
    attachVocabRowEvents(listEl);
  }
  search.addEventListener('input', renderList);
  renderList();
}

function renderGrammarTab(el, lesson) {
  if (!lesson.grammar.length) { el.innerHTML = `<div class="empty-state">Chưa có dữ liệu ngữ pháp.</div>`; return; }
  el.innerHTML = lesson.grammar.map(g => `
    <div class="grammar-card">
      <h3 class="hanzi">${g.title}</h3>
      <div class="explain">${g.explanation_vn}</div>
      ${g.examples && g.examples.length ? g.examples.map(ex => `
        <div class="example-row">
          <div class="ex-cn hanzi">${ex.cn} <button class="vspeak" data-speak="${encodeURIComponent(ex.cn)}" title="Phát âm" style="font-size:13px;">🔊</button></div>
          ${ex.pinyin ? `<div class="ex-pinyin">${ex.pinyin}</div>` : ''}
          ${ex.vn ? `<div class="ex-vn">${ex.vn}</div>` : ''}
        </div>
      `).join('') : ''}
    </div>
  `).join('');
  attachVocabRowEvents(el);
}

function audioSrc(filename) {
  if (!filename) return '';
  return APP_CONFIG.audioDir + encodeURIComponent(filename);
}

function renderTextsTab(el, lesson) {
  if (!lesson.texts.length) { el.innerHTML = `<div class="empty-state">Chưa có dữ liệu bài khóa.</div>`; return; }
  el.innerHTML = lesson.texts.map((t, ti) => {
    return `
    <div class="text-card" data-text-idx="${ti}">
      <div class="text-label">${t.label} ${t.type === 'passage' ? '· Đoạn văn' : '· Hội thoại'}
      </div>
      <div class="audio-row">
        ${t.audio_dialogue ? `
          <div class="audio-block">
            <span class="audio-label">🎧 Băng nghe bài khóa</span>
            <audio controls preload="none" src="${audioSrc(t.audio_dialogue)}"></audio>
          </div>` : ''}
        ${t.audio_vocab ? `
          <div class="audio-block">
            <span class="audio-label">🎧 Băng nghe từ mới</span>
            <audio controls preload="none" src="${audioSrc(t.audio_vocab)}"></audio>
          </div>` : ''}
      </div>
      <div class="toggle-row">
        <button class="toggle-chip on" data-toggle="pinyin">Pinyin</button>
        <button class="toggle-chip on" data-toggle="vn">Bản dịch</button>
      </div>
      <div class="text-body">
        ${t.type === 'dialogue' ? t.lines.map(l => `
          <div class="dlg-line">
            <div class="dlg-speaker">${l.speaker || ''}</div>
            <div class="dlg-content">
              <div class="dlg-cn hanzi">${l.cn}</div>
              <div class="dlg-pinyin toggle-part-pinyin">${l.pinyin}</div>
            </div>
          </div>
        `).join('') : `
          <div class="passage-cn hanzi">${t.lines.map(l => l.cn).join('')}</div>
          <div class="passage-pinyin toggle-part-pinyin">${t.lines.map(l => l.pinyin).join(' ')}</div>
        `}
        ${t.translation_vn ? `<div class="${t.type === 'dialogue' ? 'dlg-vn' : 'passage-vn'} toggle-part-vn" style="white-space:pre-line;">${t.translation_vn}</div>` : ''}
      </div>
    </div>
  `;
  }).join('');

  el.querySelectorAll('.toggle-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('on');
      const card = chip.closest('.text-card');
      const kind = chip.getAttribute('data-toggle');
      const parts = card.querySelectorAll(`.toggle-part-${kind}`);
      parts.forEach(p => p.classList.toggle('hide-content', !chip.classList.contains('on')));
    });
  });
  attachVocabRowEvents(el);
}

function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ===== Flashcard ===== */
let fcDeck = [];
let fcIndex = 0;
let fcMode = 'hanzi'; // front shown

function renderFlashcardSetup(main) {
  main.innerHTML = `
    <div class="main-inner">
      <div class="section-title">🧠 Flashcard ôn tập</div>
      <div class="fc-setup">
        <label>Phạm vi ôn tập</label>
        <select id="fcScope">
          <option value="all">Toàn bộ ${LESSONS.length} bài (${ALL_VOCAB.length} từ)</option>
          <option value="unknown">Chỉ từ chưa thuộc (${ALL_VOCAB.length - knownCount()} từ)</option>
          ${LESSONS.map(l => `<option value="lesson-${l.id}">Bài ${l.id}: ${l.title_vn} (${l.vocab.length} từ)</option>`).join('')}
        </select>

        <label>Mặt trước thẻ</label>
        <div class="radio-group" id="fcModeGroup">
          <div class="radio-chip active" data-mode="hanzi">Hán tự → Nghĩa</div>
          <div class="radio-chip" data-mode="vn">Nghĩa → Hán tự</div>
        </div>

        <div style="margin-top:20px;">
          <button class="btn btn-primary" id="fcStart">▶ Bắt đầu ôn tập</button>
        </div>
      </div>
    </div>
  `;
  document.querySelectorAll('#fcModeGroup .radio-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#fcModeGroup .radio-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      fcMode = chip.getAttribute('data-mode');
    });
  });
  document.getElementById('fcStart').addEventListener('click', () => {
    const scope = document.getElementById('fcScope').value;
    let deck;
    if (scope === 'all') deck = ALL_VOCAB.slice();
    else if (scope === 'unknown') deck = ALL_VOCAB.filter(v => !isKnown(v.key));
    else { const lid = parseInt(scope.replace('lesson-', ''), 10); deck = ALL_VOCAB.filter(v => v.lessonId === lid); }
    if (!deck.length) { alert('Không có từ nào trong phạm vi này (có thể bạn đã thuộc hết!).'); return; }
    shuffle(deck);
    fcDeck = deck;
    fcIndex = 0;
    openFlashcardModal();
  });
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function openFlashcardModal() {
  document.getElementById('flashcardModal').classList.add('show');
  showFlashcard();
}
function closeFlashcardModal() {
  document.getElementById('flashcardModal').classList.remove('show');
}

function showFlashcard() {
  const card = document.getElementById('flashcard');
  card.classList.remove('flipped');
  const progress = document.getElementById('fcProgress');
  if (fcIndex >= fcDeck.length) {
    document.getElementById('fcFront').innerHTML = `<div style="font-size:20px;">🎉 Hoàn thành!</div><div class="fc-hint">Bạn đã ôn qua ${fcDeck.length} thẻ.</div>`;
    document.getElementById('fcBack').innerHTML = '';
    progress.textContent = `${fcDeck.length} / ${fcDeck.length}`;
    document.getElementById('fcAnswers').style.visibility = 'hidden';
    return;
  }
  document.getElementById('fcAnswers').style.visibility = 'visible';
  const v = fcDeck[fcIndex];
  progress.textContent = `${fcIndex + 1} / ${fcDeck.length}`;
  const front = document.getElementById('fcFront');
  const back = document.getElementById('fcBack');
  if (fcMode === 'hanzi') {
    front.innerHTML = `<div class="fc-hanzi hanzi">${v.hanzi}</div><div class="fc-hint">Chạm để lật thẻ</div>`;
    back.innerHTML = `<div class="fc-pinyin">${v.pinyin}</div><div class="fc-pos">${v.pos || ''}</div><div class="fc-vn">${v.vn}</div>`;
  } else {
    front.innerHTML = `<div class="fc-vn">${v.vn}</div><div class="fc-hint">Chạm để lật thẻ</div>`;
    back.innerHTML = `<div class="fc-hanzi hanzi">${v.hanzi}</div><div class="fc-pinyin">${v.pinyin}</div><div class="fc-pos">${v.pos || ''}</div>`;
  }
}

function fcNext(correct) {
  const v = fcDeck[fcIndex];
  if (v) {
    if (correct && !isKnown(v.key)) toggleKnown(v.key);
    if (!correct && isKnown(v.key)) toggleKnown(v.key);
  }
  fcIndex++;
  showFlashcard();
}

/* ===== Init / event wiring ===== */
function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarBackdrop').classList.remove('show');
}

document.addEventListener('DOMContentLoaded', () => {
  document.title = APP_CONFIG.pageTitle;
  document.querySelector('.brand-badge').textContent = APP_CONFIG.level;
  document.querySelector('.brand-title').innerHTML = `Ôn tập <strong>${APP_CONFIG.bookLabelHtml}</strong> · chuẩn 3.0`;
  document.querySelector('.sidebar-label').textContent = `${LESSONS.length} Bài học`;

  buildSidebar();
  route();

  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar').classList.toggle('collapsed');
    document.getElementById('sidebarBackdrop').classList.toggle('show');
  });
  document.getElementById('sidebarBackdrop').addEventListener('click', closeMobileSidebar);

  const globalSearch = document.getElementById('globalSearch');
  let debounceTimer;
  globalSearch.addEventListener('input', () => {
    state.searchQuery = globalSearch.value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (parseRoute()[0] !== 'vocab-all') {
        location.hash = '#/vocab-all';
      } else {
        focusVocabAllFilter();
      }
    }, 150);
  });

  document.getElementById('fcClose').addEventListener('click', closeFlashcardModal);
  document.getElementById('flashcard').addEventListener('click', () => {
    document.getElementById('flashcard').classList.toggle('flipped');
  });
  document.getElementById('fcFlip').addEventListener('click', () => {
    document.getElementById('flashcard').classList.toggle('flipped');
  });
  document.getElementById('fcSpeak').addEventListener('click', () => {
    if (fcIndex < fcDeck.length) speak(fcDeck[fcIndex].hanzi);
  });
  document.getElementById('fcWrong').addEventListener('click', () => fcNext(false));
  document.getElementById('fcCorrect').addEventListener('click', () => fcNext(true));

  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {};
  }
});
