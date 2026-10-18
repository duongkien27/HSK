/* ===== HSK Review App (shared across levels via APP_CONFIG) ===== */
const SPEAKER_ICON_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" class="icon-speaker" aria-hidden="true"><path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 1 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z"/><path d="M15.932 7.757a.75.75 0 0 1 1.061 0 6 6 0 0 1 0 8.486.75.75 0 0 1-1.06-1.061 4.5 4.5 0 0 0 0-6.364.75.75 0 0 1 0-1.06Z"/></svg>';
const HOME_ICON_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" class="icon-nav" aria-hidden="true"><path d="M12 2 3 10.5 5.5 10.5 5.5 21 18.5 21 18.5 10.5 21 10.5Z"/></svg>';
const BOOK_ICON_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" class="icon-nav" aria-hidden="true"><path d="M2 5 11 3 11 19 2 21Z"/><path d="M22 5 13 3 13 19 22 21Z"/></svg>';
const CARDS_ICON_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" class="icon-nav" aria-hidden="true"><rect x="7" y="2" width="13" height="9" rx="1.8" opacity="0.4"/><rect x="4" y="7" width="13" height="9" rx="1.8"/></svg>';
const SWITCH_ICON_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" class="icon-nav" aria-hidden="true"><path d="M7 6.5h11.19l-2.6-2.6L17 2.5l4.5 4.5L17 11.5l-1.41-1.41 2.6-2.59H7Z"/><path d="M17 17.5H5.81l2.6 2.6L7 21.5l-4.5-4.5L7 12.5l1.41 1.41-2.6 2.59H17Z"/></svg>';
const CHECK_ICON_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" class="icon-ui" aria-hidden="true"><path d="M9.55 17.65 4.4 12.5l1.65-1.65 3.5 3.5 8.4-8.4 1.65 1.65Z"/></svg>';
const STAR_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" class="icon-ui" aria-hidden="true"><path d="M12,3 L13.6,9.1 L20.56,9.22 L15.42,13.11 L17.29,19.28 L12,15.6 L6.71,19.28 L8.58,13.11 L3.44,9.22 L10.4,9.1 Z"/></svg>';
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
  const NAV_ICONS = { home: HOME_ICON_SVG, 'vocab-all': BOOK_ICON_SVG, flashcard: CARDS_ICON_SVG };
  document.querySelectorAll('.nav-item').forEach(el => {
    const r = el.getAttribute('data-route');
    if (r) el.setAttribute('data-nav', r);
    if (r && NAV_ICONS[r]) el.innerHTML = `${NAV_ICONS[r]} ${el.textContent.trim()}`;
  });
  const switchLink = document.getElementById('levelSwitchLink');
  if (switchLink) switchLink.innerHTML = `${SWITCH_ICON_SVG} ${switchLink.textContent.trim()}`;
}

/* ===== Home ===== */
function renderHome(main) {
  const totalVocab = ALL_VOCAB.length;
  const totalGrammar = LESSONS.reduce((s, l) => s + l.grammar.length, 0);
  const totalTexts = LESSONS.reduce((s, l) => s + l.texts.length, 0);
  main.innerHTML = `
    <div class="main-inner">
      <div class="hero">
        <h1>欢迎 · Chào mừng bạn!</h1>
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
        <a href="#/vocab-all"><button class="btn btn-primary">Xem toàn bộ từ vựng</button></a>
        <a href="#/flashcard"><button class="btn btn-ghost">Bắt đầu Flashcard</button></a>
      </div>

      <div class="section-title">Danh sách bài học</div>
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

      <div class="section-title">Chú thích viết tắt từ loại</div>
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
      <button class="vspeak" data-speak="${encodeURIComponent(v.hanzi)}" title="Phát âm">${SPEAKER_ICON_SVG}</button>
      <div class="vhanzi hanzi">${v.hanzi}</div>
      <div class="vmid">
        <span class="vpinyin">${v.pinyin}</span><span class="vpos">${v.pos || ''}</span>
        <div class="vvn">${v.vn}</div>
      </div>
      ${opts.showLesson ? `<div class="vlesson">Bài ${v.lessonId}</div>` : ''}
      <button class="vwrite" data-write="${encodeURIComponent(v.hanzi)}" data-pinyin="${encodeURIComponent(v.pinyin)}" data-vn="${encodeURIComponent(v.vn || '')}" title="Thứ tự viết nét chữ">Thứ tự viết nét chữ</button>
      <button class="icon-btn know-toggle" data-key="${v.key}" title="Đánh dấu đã thuộc" style="background:${known ? '#e1f3e4' : 'var(--line)'}; color:${known ? 'var(--green)' : 'var(--muted)'};">${known ? CHECK_ICON_SVG : STAR_ICON_SVG}</button>
    </div>
  `;
}

function attachVocabRowEvents(container) {
  container.querySelectorAll('[data-speak]').forEach(btn => {
    btn.addEventListener('click', () => speak(decodeURIComponent(btn.getAttribute('data-speak'))));
  });
  container.querySelectorAll('[data-write]').forEach(btn => {
    btn.addEventListener('click', () => openStrokeModal({
      hanzi: decodeURIComponent(btn.getAttribute('data-write')),
      pinyin: decodeURIComponent(btn.getAttribute('data-pinyin')),
      vn: decodeURIComponent(btn.getAttribute('data-vn'))
    }));
  });
  container.querySelectorAll('.know-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-key');
      toggleKnown(key);
      const row = container.querySelector(`.vocab-row[data-key="${key}"]`);
      const known = isKnown(key);
      row.classList.toggle('known', known);
      btn.innerHTML = known ? CHECK_ICON_SVG : STAR_ICON_SVG;
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
      <div class="section-title">Toàn bộ từ vựng (${ALL_VOCAB.length} từ)</div>
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
          <strong style="font-size:13px;">Mục tiêu bài học</strong>
          <ul>${lesson.goals.map(g => `<li>${g}</li>`).join('')}</ul>
        </div>` : ''}
      </div>

      <div class="tabs">
        <button class="tab-btn" data-tab="vocab">Từ vựng (${lesson.vocab.length})</button>
        <button class="tab-btn" data-tab="grammar">Ngữ pháp (${lesson.grammar.length})</button>
        <button class="tab-btn" data-tab="texts">Bài khóa (${lesson.texts.length})</button>
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
          <div class="ex-cn hanzi">${ex.cn} <button class="vspeak vspeak-sm" data-speak="${encodeURIComponent(ex.cn)}" title="Phát âm">${SPEAKER_ICON_SVG}</button></div>
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

/* ===== Speaker avatars ===== */
const AVATAR_DIR = '../assets/avatars/';
// Chinese name -> avatar file stem (in Avatar/, exported to assets/avatars/)
const CHAR_AVATAR = {
  '王一雪': 'WangYixue', '白家月': 'BaiJiayue', '安妮': 'Annie', '王一飞': 'WangYifei',
  '李文': 'LiWen', '陈天中': 'ChenTianzhong', '杨同乐': 'YangTongle', '刘明': 'LiuMing',
  '刘小雪': 'LiuXiaoxue', '刘小明': 'LiuXiaoming', '小语': 'Xiaoyu'
};
const NAME_PINYIN = {
  '王一雪': 'Wáng Yīxuě', '白家月': 'Bái Jiāyuè', '安妮': 'Annie', '王一飞': 'Wáng Yīfēi',
  '李文': 'Lǐ Wén', '陈天中': 'Chén Tiānzhōng', '杨同乐': 'Yáng Tónglè', '刘明': 'Liú Míng',
  '刘小雪': 'Liú Xiǎoxuě', '刘小明': 'Liú Xiǎomíng', '小语': 'Xiǎoyǔ'
};
// Vietnamese/English-only speaker strings (no Chinese chars) -> Chinese key above
const NAME_ALIAS = {
  'Bạch Gia Nguyệt': '白家月', 'Trần Thiên Trung': '陈天中', 'Lý Văn': '李文',
  'Vương Nhất Phi': '王一飞', 'Vương Nhất Tuyết': '王一雪', 'Lưu Minh': '刘明',
  'Dương Đồng Lạc': '杨同乐', 'Dương Đồng Nhạc': '杨同乐', 'Annie': '安妮',
  'Lưu Tiểu Tuyết': '刘小雪', 'Lưu Tiểu Minh': '刘小明'
};
function fallbackColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return `hsl(${hash % 360}, 50%, 52%)`;
}
function resolveSpeakers(raw) {
  if (!raw) return [];
  const zhMatches = raw.match(/[一-龥]+/g);
  const tokens = (zhMatches && zhMatches.length) ? zhMatches
    : raw.split(/\/|、|，|,/).map(s => s.trim()).filter(Boolean);
  return tokens.map(tok => {
    const zhKey = CHAR_AVATAR[tok] ? tok : NAME_ALIAS[tok];
    if (zhKey && CHAR_AVATAR[zhKey]) {
      return { label: zhKey, pinyin: NAME_PINYIN[zhKey] || '', avatar: AVATAR_DIR + CHAR_AVATAR[zhKey] + '.png' };
    }
    return { label: tok, pinyin: '', avatar: null, initial: tok.charAt(0), color: fallbackColor(tok) };
  });
}
function avatarChipHtml(s) {
  const pinyinLine = s.pinyin ? `<div class="avatar-pinyin">${s.pinyin}</div>` : '';
  const face = s.avatar
    ? `<img class="avatar-img" src="${s.avatar}" alt="${s.label}">`
    : `<div class="avatar-fallback" style="background:${s.color}">${s.initial}</div>`;
  return `<div class="avatar-chip">${face}${pinyinLine}<div class="avatar-label">${s.label}</div></div>`;
}

function textImageSrc(lesson, ti) {
  return `../assets/texts/${APP_CONFIG.level.toLowerCase()}/${lesson.id}-${ti + 1}.jpg`;
}

function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function buildVocabHighlighter(lesson) {
  const words = [...new Set(lesson.vocab.map(v => v.hanzi).filter(Boolean))].sort((a, b) => b.length - a.length);
  if (!words.length) return cn => cn;
  const pattern = new RegExp(words.map(escapeRegExp).join('|'), 'g');
  return cn => cn.replace(pattern, m => `<span class="new-word" data-hanzi="${encodeURIComponent(m)}">${m}</span>`);
}

/* Word-by-word pinyin ruby for passage ("letter/diary") texts, like the printed textbook:
   the pinyin string is split on whitespace into word tokens (as authored), each token's
   syllable count is inferred from its vowel-letter runs (y/w act as consonants, so every
   Mandarin syllable boundary shows up as a new run), and that many hanzi characters are
   paired with it as one <ruby> group so pinyin wrapping always stays aligned to its word. */
const PINYIN_VOWEL_RUN_RE = new RegExp('[' +
  'aeiouvAEIOUV' +
  'āáǎàĀÁǍÀ' + 'ēéěèĒÉĚÈ' + 'īíǐìĪÍǏÌ' + 'ōóǒòŌÓǑÒ' + 'ūúǔùŭŬŪÚǓÙ' + 'ǖǘǚǜǕǗǙǛ' + 'üÜ' +
  ']+', 'g');
const CJK_RE = /[一-鿿㐀-䶿0-9]/;
const PASSAGE_PUNCT_RE = /[，！？。、：；（）“”…—,.!?;:()'"]/;

function countPinyinSyllables(core) {
  const matches = core.match(PINYIN_VOWEL_RUN_RE);
  let syll = matches ? matches.length : 0;
  // Erhua (儿) fuses onto the previous syllable with no vowel of its own
  // (e.g. "diǎnr" = 点 + 儿, "miàntiáor" = 面 + 条 + 儿), adding a hanzi
  // character the vowel-run count alone can't see — except the small set
  // of syllables where trailing "r" IS the whole final (二/儿/而/耳 itself).
  const stripped = core.replace(/[^A-Za-zÀ-ɏ]/g, '').toLowerCase();
  const isBareErWord = /^[eéèěē]r$/.test(stripped);
  const hasApostropheBeforeEr = /['’][eéèěē]r$/i.test(core);
  if (stripped.endsWith('r') && !isBareErWord && !hasApostropheBeforeEr) syll += 1;
  return syll;
}

function buildPassageRuby(cn, pinyinLine, highlightCn) {
  const tokens = (pinyinLine || '').trim().split(/\s+/).filter(Boolean);
  let ci = 0;
  const out = [];
  tokens.forEach(tok => {
    // Punctuation-only tokens (a lone "—" authored with spaces around it, stray
    // quote marks, etc.) have no syllable of their own — skip without consuming
    // any hanzi; the leading-punctuation sweep below will carry them to output.
    const m = tok.match(/[A-Za-zÀ-ɏ'-]+/);
    if (!m) return;
    const core = m[0];
    const syll = Math.max(1, countPinyinSyllables(core));
    let leading = '';
    while (ci < cn.length && PASSAGE_PUNCT_RE.test(cn[ci])) { leading += cn[ci]; ci++; }
    let group = '';
    let got = 0;
    while (got < syll && ci < cn.length) {
      const ch = cn[ci++];
      group += ch;
      if (CJK_RE.test(ch)) got++;
    }
    let trailing = '';
    while (ci < cn.length && PASSAGE_PUNCT_RE.test(cn[ci])) { trailing += cn[ci]; ci++; }
    if (group) out.push(`${leading}<ruby>${highlightCn(group)}<rt>${core}</rt></ruby>${trailing}`);
    else out.push(leading);
  });
  if (ci < cn.length) out.push(highlightCn(cn.slice(ci)));
  return out.join('');
}

function renderTextsTab(el, lesson) {
  if (!lesson.texts.length) { el.innerHTML = `<div class="empty-state">Chưa có dữ liệu bài khóa.</div>`; return; }
  const highlightCn = buildVocabHighlighter(lesson);
  el.innerHTML = lesson.texts.map((t, ti) => {
    const isPassage = t.type === 'passage';
    return `
    <div class="text-card" data-text-idx="${ti}">
      <div class="text-label">${t.label} ${isPassage ? '· Đoạn văn' : '· Hội thoại'}
      </div>
      <div class="audio-row">
        ${t.audio_dialogue ? `
          <div class="audio-block">
            <span class="audio-label">Băng nghe bài khóa</span>
            <audio controls preload="none" src="${audioSrc(t.audio_dialogue)}"></audio>
          </div>` : ''}
        ${t.audio_vocab ? `
          <div class="audio-block">
            <span class="audio-label">Băng nghe từ mới</span>
            <audio controls preload="none" src="${audioSrc(t.audio_vocab)}"></audio>
          </div>` : ''}
      </div>
      <div class="text-scene">
        <div class="text-main">
          <div class="toggle-row">
            <button class="toggle-chip" data-toggle="pinyin">Pinyin</button>
            <button class="toggle-chip" data-toggle="vn">Bản dịch</button>
            <span class="toggle-note">Chọn các từ mới để xem nghĩa</span>
          </div>
          <div class="text-body">
            ${isPassage ? `
              <div class="diary-card">
                ${t.lines.map(l => `
                  <div class="passage-line">
                    <div class="passage-cn hanzi toggle-ruby-pinyin ruby-hide">${buildPassageRuby(l.cn, l.pinyin, highlightCn)}</div>
                  </div>
                `).join('')}
                ${t.translation_vn ? `<div class="passage-vn toggle-part-vn hide-content" style="white-space:pre-line;">${t.translation_vn}</div>` : ''}
              </div>
            ` : `
              ${t.lines.map(l => `
                <div class="dlg-line">
                  <div class="dlg-avatars">${resolveSpeakers(l.speaker).map(avatarChipHtml).join('')}</div>
                  <div class="dlg-bubble">
                    <div class="dlg-pinyin toggle-part-pinyin hide-content">${l.pinyin}</div>
                    <div class="dlg-cn hanzi">${highlightCn(l.cn)}</div>
                  </div>
                </div>
              `).join('')}
              ${t.translation_vn ? `<div class="dlg-vn toggle-part-vn hide-content" style="white-space:pre-line;">${t.translation_vn}</div>` : ''}
            `}
          </div>
        </div>
        <div class="text-illustration">
          <img src="${textImageSrc(lesson, ti)}" alt="${t.label}" loading="lazy" onerror="this.parentElement.remove()">
        </div>
      </div>
    </div>
  `;
  }).join('');

  el.querySelectorAll('.toggle-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('on');
      const card = chip.closest('.text-card');
      const kind = chip.getAttribute('data-toggle');
      const on = chip.classList.contains('on');
      card.querySelectorAll(`.toggle-part-${kind}`).forEach(p => p.classList.toggle('hide-content', !on));
      card.querySelectorAll(`.toggle-ruby-${kind}`).forEach(p => p.classList.toggle('ruby-hide', !on));
    });
  });
  el.querySelectorAll('.new-word').forEach(span => {
    span.addEventListener('click', () => {
      const hanzi = decodeURIComponent(span.getAttribute('data-hanzi'));
      const v = lesson.vocab.find(x => x.hanzi === hanzi);
      if (v) openWordModal(v);
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
      <div class="section-title">Flashcard ôn tập</div>
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
          <button class="btn btn-primary" id="fcStart">Bắt đầu ôn tập</button>
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
    document.getElementById('fcFront').innerHTML = `<div style="font-size:20px; display:flex; align-items:center; justify-content:center; gap:8px;">Hoàn thành!</div><div class="fc-hint">Bạn đã ôn qua ${fcDeck.length} thẻ.</div>`;
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

/* ===== Stroke order / handwriting practice (HanziWriter) ===== */
let strokeChars = [];
let strokeActiveIndex = 0;
let strokeWriter = null;

function openStrokeModal(v) {
  strokeChars = v.hanzi.split('');
  strokeActiveIndex = 0;
  document.getElementById('strokeWordHanzi').textContent = v.hanzi;
  document.getElementById('strokeWordMeta').textContent = `${v.pinyin}${v.vn ? ' · ' + v.vn : ''}`;

  const tabs = document.getElementById('strokeCharTabs');
  if (strokeChars.length > 1) {
    tabs.style.display = 'flex';
    tabs.innerHTML = strokeChars.map((c, i) => `<button class="stroke-char-tab ${i === 0 ? 'active' : ''}" data-idx="${i}">${c}</button>`).join('');
    tabs.querySelectorAll('.stroke-char-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        tabs.querySelectorAll('.stroke-char-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        strokeActiveIndex = parseInt(btn.getAttribute('data-idx'), 10);
        loadStrokeChar();
      });
    });
  } else {
    tabs.style.display = 'none';
    tabs.innerHTML = '';
  }

  document.getElementById('strokeModal').classList.add('show');
  loadStrokeChar();
}

function loadStrokeChar() {
  const target = document.getElementById('strokeTarget');
  target.innerHTML = '';
  setStrokeFeedback('', '');
  const char = strokeChars[strokeActiveIndex];
  strokeWriter = HanziWriter.create(target, char, {
    width: 260,
    height: 260,
    padding: 14,
    showOutline: true,
    strokeColor: '#2a2520',
    outlineColor: '#ece4d8',
    radicalColor: '#f5821f',
    strokeAnimationSpeed: 1,
    delayBetweenStrokes: 300
  });
}

function setStrokeFeedback(html, kind) {
  const el = document.getElementById('strokeFeedback');
  el.innerHTML = html;
  el.className = 'stroke-feedback' + (kind ? ' ' + kind : '');
}

function strokeAnimate() {
  if (strokeWriter) strokeWriter.animateCharacter();
}

function strokeQuiz() {
  if (!strokeWriter) return;
  setStrokeFeedback('Hãy viết từng nét theo đúng thứ tự…', '');
  strokeWriter.quiz({
    showHintAfterMisses: 3,
    onMistake: data => setStrokeFeedback(`Chưa đúng, thử lại nét ${data.strokeNum + 1}…`, 'warn'),
    onCorrectStroke: data => setStrokeFeedback(`Đúng! Còn ${data.strokesRemaining} nét.`, 'ok'),
    onComplete: data => setStrokeFeedback(data.totalMistakes === 0 ? `Hoàn hảo!` : `Hoàn thành! (sai ${data.totalMistakes} lần)`, 'done')
  });
}

function closeStrokeModal() {
  document.getElementById('strokeModal').classList.remove('show');
}

/* ===== New-word meaning popup (click a highlighted word in bài khóa) ===== */
let currentWordVocab = null;
function openWordModal(v) {
  currentWordVocab = v;
  document.getElementById('wordHanzi').textContent = v.hanzi;
  document.getElementById('wordPinyin').textContent = v.pinyin || '';
  document.getElementById('wordPos').textContent = v.pos || '';
  document.getElementById('wordVn').textContent = v.vn || '';
  document.getElementById('wordModal').classList.add('show');
}
function closeWordModal() {
  document.getElementById('wordModal').classList.remove('show');
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
  document.getElementById('fcSpeak').innerHTML = `${SPEAKER_ICON_SVG} Phát âm`;
  document.getElementById('fcSpeak').addEventListener('click', () => {
    if (fcIndex < fcDeck.length) speak(fcDeck[fcIndex].hanzi);
  });
  document.getElementById('fcWrong').addEventListener('click', () => fcNext(false));
  document.getElementById('fcCorrect').addEventListener('click', () => fcNext(true));

  document.getElementById('strokeClose').addEventListener('click', closeStrokeModal);
  document.getElementById('strokeAnimateBtn').addEventListener('click', strokeAnimate);
  document.getElementById('strokeQuizBtn').addEventListener('click', strokeQuiz);

  document.getElementById('wordClose').addEventListener('click', closeWordModal);
  document.getElementById('wordSpeak').addEventListener('click', () => {
    const h = document.getElementById('wordHanzi').textContent;
    if (h) speak(h);
  });
  document.getElementById('wordWriteBtn').addEventListener('click', () => {
    if (!currentWordVocab) return;
    closeWordModal();
    openStrokeModal(currentWordVocab);
  });

  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {};
  }
});
