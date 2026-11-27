/**
 * ai-couch.js — FitSim v2.1 (исправленная версия)
 * Что исправлено относительно v2.0:
 *  - ReferenceError: key is not defined  → передаём '' в callGroq
 *  - Добавлены fallback-и для getAiKey / getAiKeys / getAiProvider / getNoKeyMsg / toast
 *  - initAiPage вызывается автоматически при показе страницы + MutationObserver
 *  - injectAiPlusUI не падает, если каких-то элементов нет
 *  - Расширен список моделей Groq, добавлен deepseek и llama
 *  - Улучшенные сообщения об ошибках (401/429/timeout/сеть)
 */

'use strict';

/* ══════════════════════════════════════════════════════════════
   БЕЗОПАСНЫЕ ЗАГЛУШКИ (если внешние модули не загрузились)
══════════════════════════════════════════════════════════════ */

if (typeof AppStorage === 'undefined') {
  window.AppStorage = {
    getItem: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    setItem: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    removeItem: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
}

if (typeof window.getAiKeys === 'undefined') {
  window.getAiKeys = function () {
    try { return JSON.parse(AppStorage.getItem('fs-ai-keys') || '{}') || {}; }
    catch (e) { return {}; }
  };
}

if (typeof window.getAiKey === 'undefined') {
  window.getAiKey = function () {
    var st = window.getAiKeys();
    return st.groq || st.gigachat || st.yandex || st.key || '';
  };
}

if (typeof window.getAiProvider === 'undefined') {
  window.getAiProvider = function () {
    return (window.getAiKeys().provider) || 'groq';
  };
}

if (typeof window.getNoKeyMsg === 'undefined') {
  window.getNoKeyMsg = function () {
    return '🔑 Сначала вставь API-ключ Groq в карточке «🔗 Подключение ИИ» — она выше чата.';
  };
}

if (typeof window.toast === 'undefined') {
  window.toast = function (msg) {
    // если в проекте есть свой toast — используется он; иначе — консоль
    console.log('[toast]', msg);
    try {
      var t = document.getElementById('__fs_toast__');
      if (!t) {
        t = document.createElement('div');
        t.id = '__fs_toast__';
        t.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);' +
          'background:#222;color:#fff;padding:10px 16px;border-radius:10px;z-index:99999;' +
          'font:600 13px -apple-system,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.35);transition:opacity .3s';
        document.body.appendChild(t);
      }
      t.textContent = msg;
      t.style.opacity = '1';
      clearTimeout(t._h);
      t._h = setTimeout(function () { t.style.opacity = '0'; }, 2200);
    } catch (e) {}
  };
}

/* ══════════════════════════════════════════════════════════════
   CONSTANTS & STATE
══════════════════════════════════════════════════════════════ */

var aiGoal = 'loss';
var aiLevel = '';
var aiEquip = [];
var aiChatHistory = [];
var chatReady = false;
var lastTopic = null;
var generating = false;
var lastPlanParams = null;
var aiStyle = 'fullbody';
var aiIntensity = 'medium';
var aiCoachPersonality = 'balanced';
var aiStreamingEnabled = true;
var lastAiPlanText = '';
var aiAutoInitDone = false;

var PERSONALITY_PROMPTS = {
  strict:   'Ты строгий, требовательный тренер. Не терпишь отговорок. Мотивируешь жёстко, но честно.',
  balanced: 'Ты профессиональный фитнес-тренер с отличным чувством юмора. Мотивируешь, поддерживаешь, но говоришь прямо.',
  mentor:   'Ты терпеливый наставник и нутрициолог. Объясняешь науку, даёшь развёрнутые ответы.'
};

var QUICK_REPLY_SETS = {
  greeting:  ['Составь план на неделю', 'Что поесть перед тренировкой?', 'Как ускорить прогресс?'],
  workout:   ['Сохранить в дневник', 'Сделай легче', 'Объясни технику', 'Альтернативы без зала'],
  nutrition: ['Рассчитай макросы', 'Что лучше до/после тренировки?', 'Список продуктов на неделю'],
  progress:  ['Что не так в моём прогрессе?', 'Когда ждать результатов?', 'Плато — что делать?'],
  generic:   ['Расскажи подробнее', 'Дай пример', 'Почему это важно?', 'Что делать дальше?']
};

/* ══════════════════════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════════════════════ */

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderMarkdown(text) {
  if (!text) return '';
  var s = escapeHtml(String(text));

  s = s.replace(/```([\s\S]*?)```/g, function (_, code) {
    return '<pre class="ai-code-block"><code>' + code.trim() + '</code></pre>';
  });
  s = s.replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>');
  s = s.replace(/^### (.+)$/gm, '<div class="ai-h3">$1</div>');
  s = s.replace(/^## (.+)$/gm, '<div class="ai-h2">$1</div>');
  s = s.replace(/^# (.+)$/gm, '<div class="ai-h1">$1</div>');
  s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^\s*][^*]*?)\*/g, '<em>$1</em>');
  s = s.replace(/^&gt; (.+)$/gm, '<div class="ai-quote">$1</div>');
  s = s.replace(/^---$/gm, '<hr class="ai-hr">');
  s = s.replace(/^(✅|🔥|💪|⚡|🎯|📌|❌|✨|🏋️|🥗|💤|🧠|⚠️) (.+)$/gm,
    '<div class="ai-emoji-line"><span class="ai-emoji-icon">$1</span><span>$2</span></div>');
  s = s.replace(/((?:^[-•] .+\n?)+)/gm, function (block) {
    var items = block.trim().split('\n').map(function (l) { return '<li>' + l.replace(/^[-•] /, '') + '</li>'; }).join('');
    return '<ul class="ai-list">' + items + '</ul>';
  });
  s = s.replace(/((?:^\d+\. .+\n?)+)/gm, function (block) {
    var items = block.trim().split('\n').map(function (l) { return '<li>' + l.replace(/^\d+\. /, '') + '</li>'; }).join('');
    return '<ol class="ai-list ai-list-num">' + items + '</ol>';
  });
  s = s.replace(/\n\n/g, '<br><br>');
  s = s.replace(/\n/g, '<br>');
  return s;
}

function extractJSON(str) {
  if (!str) return null;
  var clean = String(str).replace(/```json|```/g, '');
  var start = clean.indexOf('{');
  if (start === -1) return null;
  var depth = 0, inString = false, escaped = false;
  for (var i = start; i < clean.length; i++) {
    var ch = clean[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(clean.slice(start, i + 1)); } catch (e) { return null; }
      }
    }
  }
  return null;
}

function getProfile() {
  try { return JSON.parse(AppStorage.getItem('fs-profile') || '{}'); } catch (e) { return {}; }
}
function getTodayNutr() {
  try {
    var entries = JSON.parse(AppStorage.getItem('fs-nutrition') || '[]');
    var today = new Date().toLocaleDateString('ru-RU');
    var todayE = entries.filter(function (e) { return e.date === today; });
    return todayE.reduce(function (a, e) {
      return { kcal: a.kcal + (e.kcal || 0), protein: a.protein + (e.protein || 0),
               carbs: a.carbs + (e.carbs || 0), fat: a.fat + (e.fat || 0) };
    }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  } catch (e) { return null; }
}
function getRecentWorkouts() {
  try {
    var diary = JSON.parse(AppStorage.getItem('fs-diary') || '[]');
    return diary.slice(-5).reverse();
  } catch (e) { return []; }
}
function getWaterToday() {
  try {
    var w = JSON.parse(AppStorage.getItem('fs-water') || '{}');
    var now = new Date();
    var key = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    if (w && w.date === key) return w.amount || 0;
    var hist = JSON.parse(AppStorage.getItem('fs-water-hist') || '[]');
    if (Array.isArray(hist)) {
      for (var i = hist.length - 1; i >= 0; i--) {
        if (hist[i] && hist[i].date === key) return Number(hist[i].amount) || 0;
      }
    }
    return 0;
  } catch (e) { return 0; }
}

/* ══════════════════════════════════════════════════════════════
   API CALL — Groq / GigaChat / YandexGPT
══════════════════════════════════════════════════════════════ */

// Модели Groq по порядку попыток (актуально на конец 2026).
var AIP_GROQ_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'llama-3.1-8b-instant'
];

async function aipFetchChat(url, key, model, sys, msgs, max, extraHeaders) {
  var controller = typeof AbortController === 'function' ? new AbortController() : null;
  var timeoutId = controller ? setTimeout(function () { controller.abort(); }, 45000) : null;
  try {
    var headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key };
    if (extraHeaders) for (var h in extraHeaders) headers[h] = extraHeaders[h];
    var r = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'system', content: sys }].concat(msgs || []),
        max_tokens: max || 1400,
        temperature: 0.65
      }),
      signal: controller ? controller.signal : undefined
    });
    if (!r.ok) {
      var errBody = '';
      try { errBody = await r.text(); } catch (e) {}
      throw new Error('HTTP ' + r.status + (errBody ? ' ' + errBody.slice(0, 200) : ''));
    }
    var d = await r.json();
    var c = d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
    return c || '';
  } catch (err) {
    if (err && err.name === 'AbortError') throw new Error('timeout');
    if (err instanceof TypeError) throw new Error('нет связи с сервисом');
    throw err;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function aipUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

async function getGigaToken(authKey) {
  var cached = null;
  try { cached = JSON.parse(AppStorage.getItem('fs-giga-token') || 'null'); } catch (e) {}
  if (cached && cached.token && cached.expires > Date.now() + 60000) return cached.token;
  try {
    var r = await fetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
      method: 'POST',
      headers: { 'RqUID': aipUuid(), 'Authorization': 'Basic ' + authKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'GIGACHAT_API_PERS' })
    });
    if (!r.ok) throw new Error('GigaChat ' + r.status);
    var d = await r.json();
    var token = d && d.access_token || '';
    if (!token) throw new Error('GigaChat: не удалось получить токен');
    try { AppStorage.setItem('fs-giga-token', JSON.stringify({ token: token, expires: Date.now() + 25 * 60 * 1000 })); } catch (e) {}
    return token;
  } catch (err) {
    throw new Error('GigaChat недоступен из браузера. Переключись на Groq.');
  }
}

/**
 * ВАЖНО: параметр `key` оставлен для совместимости, но реально
 * ключ берётся из хранилища. Можно передавать ''.
 */
async function callGroq(key, sys, msgs, max) {
  var st = getAiKeys();
  var p = st.provider || 'groq';

  if (p === 'groq') {
    var realKey = st.groq || st.key || key || '';
    if (!realKey) throw new Error('Сначала вставь ключ Groq в карточке «🔗 Подключение ИИ».');
    var lastErr = null;
    for (var i = 0; i < AIP_GROQ_MODELS.length; i++) {
      try {
        return await aipFetchChat('https://api.groq.com/openai/v1/chat/completions',
          realKey, AIP_GROQ_MODELS[i], sys, msgs, max, null);
      } catch (e) {
        lastErr = e;
        var m = String(e.message || '');
        // 404/400 = модель недоступна → пробуем следующую
        if (m.indexOf('404') === -1 && m.indexOf('400') === -1) throw e;
      }
    }
    throw lastErr || new Error('Все модели Groq недоступны');
  }

  if (p === 'gigachat') {
    if (!st.gigachat) throw new Error('Сначала вставь ключ GigaChat.');
    var tok = await getGigaToken(st.gigachat);
    return await aipFetchChat('https://gigachat.devices.sberbank.ru/api/v1/chat/completions',
      tok, 'GigaChat', sys, msgs, max, null);
  }

  if (p === 'yandex') {
    if (!st.yandex) throw new Error('Сначала вставь ключ YandexGPT.');
    var folder = st.yandexFolder || '';
    var model = folder ? folder + '/yandexgpt-lite' : 'yandexgpt-lite';
    var headers = folder ? { 'x-folder-id': folder } : null;
    return await aipFetchChat('https://llm.api.cloud.yandex.net/openai/v1/chat/completions',
      st.yandex, model, sys, msgs, max, headers);
  }

  throw new Error('Неизвестный провайдер: ' + p);
}

/* ══════════════════════════════════════════════════════════════
   DATA SUMMARY (14 дней)
══════════════════════════════════════════════════════════════ */

function aipParseDiaryDate(d) {
  if (!d) return null;
  var m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(d));
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  var t = new Date(d);
  return isNaN(t) ? null : t;
}

function aipMapMuscle(name) {
  var s = String(name || '').toLowerCase();
  if (/жим леж|отжим|баттерф|кроссовер|развод|жим на наклон/.test(s)) return 'грудь';
  if (/подтяг|тяга|гребл|гиперэкстен|станов|турник/.test(s)) return 'спина';
  if (/присед|выпад|жим ног|разгиб ног|сгиб ног|икр|ягодич|мост|болгар/.test(s)) return 'ноги';
  if (/жим стоя|армейск|жим вверх|мах|разводк/.test(s)) return 'плечи';
  if (/бицепс|молотк|франц|трицепс|сгибан|разгибан|подъём шт/.test(s)) return 'руки';
  if (/планк|пресс|скручив|подъём ног|велосипед|бок|брус/.test(s)) return 'кор';
  if (/бег|скакалк|эллипс|велотренаж|гребной|кардио|ходьб/.test(s)) return 'кардио';
  return '';
}

function aipExerciseNames(w) {
  var ex = w && w.exercises;
  var out = [];
  if (Array.isArray(ex)) {
    ex.forEach(function (e) {
      if (typeof e === 'string') out.push(e);
      else if (e && (e.name || e.exName || e.title)) out.push(e.name || e.exName || e.title);
    });
  } else if (typeof ex === 'string' && ex) {
    out = ex.split(/[;,\n]/).map(function (x) { return x.trim(); }).filter(Boolean);
  }
  return out;
}

function aipDaysSince(d) {
  var t = aipParseDiaryDate(d);
  if (!t) return null;
  var now = new Date();
  var a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var b = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  return Math.round((a - b) / 86400000);
}

function buildDataSummary() {
  var pr = getProfile();
  var lines = [];

  /* --- ТРЕНИРОВКИ --- */
  try {
    var diary = JSON.parse(AppStorage.getItem('fs-diary') || '[]');
    var win = [];
    (Array.isArray(diary) ? diary : []).forEach(function (w) {
      var dd = aipDaysSince(w.date);
      if (dd !== null && dd <= 14) win.push({ w: w, dd: dd });
    });
    if (win.length) {
      var groups = {}, exCount = {}, totalKcal = 0;
      win.forEach(function (x) {
        totalKcal += Number(x.w.kcal) || 0;
        aipExerciseNames(x.w).forEach(function (n) {
          var g = aipMapMuscle(n);
          if (g) groups[g] = (groups[g] || 0) + 1;
          if (n) exCount[n] = (exCount[n] || 0) + 1;
        });
      });
      var minDd = null;
      win.forEach(function (x) { if (minDd === null || x.dd < minDd) minDd = x.dd; });
      var gList = Object.keys(groups).sort(function (a, b) { return groups[b] - groups[a]; })
        .map(function (g) { return g + ' ×' + groups[g]; }).join(', ');
      var topEx = Object.keys(exCount).sort(function (a, b) { return exCount[b] - exCount[a]; })
        .slice(0, 8).map(function (n) { return n + ' ×' + exCount[n]; }).join(', ');
      lines.push('=== ТРЕНИРОВКИ ЗА 14 ДНЕЙ ===');
      lines.push('Всего: ' + win.length + ' (~' + (win.length / 2).toFixed(1) + '/нед), суммарный расход ' + Math.round(totalKcal) + ' ккал');
      if (gList) lines.push('Группы мышц: ' + gList);
      if (topEx) lines.push('Любимые упражнения: ' + topEx);
      if (minDd !== null) lines.push('Дней с последней тренировки: ' + minDd + (minDd >= 4 ? ' — есть пропуск!' : ''));
      var untouched = ['грудь', 'спина', 'ноги', 'плечи', 'руки', 'кор'].filter(function (g) { return !groups[g]; });
      if (untouched.length && win.length >= 3) lines.push('НЕ тренировались 2 недели: ' + untouched.join(', '));
      lines.push('');
    } else {
      lines.push('=== ТРЕНИРОВКИ === За 14 дней тренировок нет.');
      lines.push('');
    }
  } catch (e) {}

  /* --- ПИТАНИЕ --- */
  try {
    var nutr = JSON.parse(AppStorage.getItem('fs-nutrition') || '[]');
    var byDate = {}, foodCount = {}, mealCount = {};
    (Array.isArray(nutr) ? nutr : []).forEach(function (e) {
      var dd = aipDaysSince(e.date);
      if (dd === null || dd > 14) return;
      if (!byDate[e.date]) byDate[e.date] = { kcal: 0, protein: 0, fat: 0, carbs: 0 };
      byDate[e.date].kcal += Number(e.kcal) || 0;
      byDate[e.date].protein += Number(e.protein) || 0;
      byDate[e.date].fat += Number(e.fat) || 0;
      byDate[e.date].carbs += Number(e.carbs) || 0;
      if (e.name) foodCount[e.name] = (foodCount[e.name] || 0) + 1;
      if (e.mealType) mealCount[e.mealType] = (mealCount[e.mealType] || 0) + 1;
    });
    var days = Object.keys(byDate);
    if (days.length) {
      var avgK = days.reduce(function (s, d) { return s + byDate[d].kcal; }, 0) / days.length;
      var avgP = days.reduce(function (s, d) { return s + byDate[d].protein; }, 0) / days.length;
      var avgF = days.reduce(function (s, d) { return s + byDate[d].fat; }, 0) / days.length;
      var avgC = days.reduce(function (s, d) { return s + byDate[d].carbs; }, 0) / days.length;
      lines.push('=== ПИТАНИЕ ЗА 14 ДНЕЙ ===');
      lines.push('Дней с записями: ' + days.length + '/14' + (days.length < 7 ? ' — ведёт дневник нерегулярно' : ''));
      lines.push('Средние за день: ' + Math.round(avgK) + ' ккал, белок ' + Math.round(avgP) + ' г, жиры ' + Math.round(avgF) + ' г, углеводы ' + Math.round(avgC) + ' г');
      var MEAL_RU = { breakfast: 'завтрак', lunch: 'обед', dinner: 'ужин', snack: 'перекус', other: 'прочее' };
      var mealList = Object.keys(mealCount).map(function (m) { return (MEAL_RU[m] || m) + ' ×' + mealCount[m]; }).join(', ');
      if (mealList) lines.push('Приёмы пищи: ' + mealList);
      var topFood = Object.keys(foodCount).sort(function (a, b) { return foodCount[b] - foodCount[a]; })
        .slice(0, 10).map(function (n) { return n + ' ×' + foodCount[n]; }).join(', ');
      if (topFood) lines.push('Часто ест: ' + topFood);
      lines.push('');
    }
  } catch (e) {}

  /* --- ВОДА --- */
  try {
    var hist = JSON.parse(AppStorage.getItem('fs-water-hist') || '[]');
    var wDays = [], wToday = getWaterToday();
    (Array.isArray(hist) ? hist : []).forEach(function (e) {
      var dd = aipDaysSince(e.date);
      if (dd !== null && dd <= 14 && Number(e.amount) > 0) wDays.push(Number(e.amount));
    });
    if (wDays.length || wToday > 0) {
      var wAvg = wDays.length ? wDays.reduce(function (s, x) { return s + x; }, 0) / wDays.length : 0;
      var bw = Number(pr.weight) > 0 ? Number(pr.weight) : 70;
      var ag = Number(pr.age) > 0 ? Number(pr.age) : 30;
      var wNorm = Math.round((ag < 18 ? bw * 40 : bw * 30) / 50) * 50;
      lines.push('=== ВОДА ===');
      lines.push('Сегодня: ' + Math.round(wToday) + ' мл из нормы ' + wNorm + ' мл' + (wToday < wNorm * 0.6 ? ' — сильно недобирает!' : ''));
      if (wDays.length) lines.push('Средняя за 14 дней: ' + Math.round(wAvg) + ' мл/день (дней с записями: ' + wDays.length + ')');
      lines.push('');
    }
  } catch (e) {}

  /* --- ВЕС И ЗАМЕРЫ --- */
  try {
    var wlog = JSON.parse(AppStorage.getItem('fs-wlog') || '[]');
    var blog = JSON.parse(AppStorage.getItem('fs-bodylog') || '[]');
    var pts = [];
    (Array.isArray(wlog) ? wlog : []).forEach(function (e) {
      var t = aipParseDiaryDate(e.date);
      if (t && Number(e.weight) > 0) pts.push({ t: t, kg: Number(e.weight), waist: null });
    });
    (Array.isArray(blog) ? blog : []).forEach(function (e) {
      var t = aipParseDiaryDate(e.date);
      if (!t) return;
      if (Number(e.weight) > 0) pts.push({ t: t, kg: Number(e.weight), waist: Number(e.waist) > 0 ? Number(e.waist) : null });
    });
    pts.sort(function (a, b) { return a.t - b.t; });
    if (pts.length) {
      var cur = pts[pts.length - 1];
      var d14 = pts.filter(function (p) { return (cur.t - p.t) / 86400000 <= 14 && (cur.t - p.t) / 86400000 >= 0; });
      var old14 = d14.length ? d14[0] : null;
      var target = Number(pr.target) > 0 ? Number(pr.target) : null;
      lines.push('=== ВЕС И ЦЕЛЬ ===');
      lines.push('Текущий вес: ' + cur.kg + ' кг (запись от ' + cur.t.toLocaleDateString('ru-RU') + ')');
      if (old14 && old14 !== cur) {
        var diff14 = cur.kg - old14.kg;
        lines.push('Изменение за 14 дней: ' + (diff14 > 0 ? '+' : '') + diff14.toFixed(1) + ' кг');
      }
      if (pts.length > 1) {
        var diffAll = cur.kg - pts[0].kg;
        lines.push('Изменение за всё время: ' + (diffAll > 0 ? '+' : '') + diffAll.toFixed(1) + ' кг (' + pts.length + ' записей)');
      }
      if (target) {
        var toGo = Math.abs(cur.kg - target);
        lines.push('Цель: ' + target + ' кг → осталось ' + toGo.toFixed(1) + ' кг (' + (cur.kg > target ? 'сбросить' : 'набрать') + ')');
      }
      if (cur.waist) lines.push('Талия: ' + cur.waist + ' см');
      lines.push('');
    }
  } catch (e) {}

  /* --- ПРЕДПОЧТЕНИЯ В ЕДЕ --- */
  try {
    var prefs = null;
    if (pr && Array.isArray(pr.dietPrefs) && pr.dietPrefs.length) prefs = pr.dietPrefs;
    if (!prefs) {
      var dp = JSON.parse(AppStorage.getItem('fs-diet-prefs') || 'null');
      if (Array.isArray(dp) && dp.length) prefs = dp;
    }
    if (prefs) lines.push('=== ПРЕДПОЧТЕНИЯ В ЕДЕ ===\n' + prefs.join(', '), '');
  } catch (e) {}

  /* --- ЖУРНАЛ УПРАЖНЕНИЙ (прогресс) --- */
  try {
    var exlog = JSON.parse(AppStorage.getItem('fs-exlog') || '{}');
    var names = Object.keys(exlog || {});
    if (names.length) {
      var progress = [];
      names.forEach(function (n) {
        var arr = Array.isArray(exlog[n]) ? exlog[n] : [];
        if (!arr.length) return;
        var first = arr[0], last = arr[arr.length - 1];
        var fk = Number(first.kg != null ? first.kg : (first.setsData || first.sets_data || [])[0] && (first.setsData || first.sets_data)[0].kg) || 0;
        var lk = Number(last.kg != null ? last.kg : (last.setsData || last.sets_data || [])[0] && (last.setsData || last.sets_data)[0].kg) || 0;
        if (fk > 0 && lk > 0 && lk !== fk) progress.push(n + ': ' + fk + ' → ' + lk + ' кг');
        else if (lk > 0) progress.push(n + ': ' + lk + ' кг');
      });
      if (progress.length) {
        lines.push('=== ПРОГРЕСС В УПРАЖНЕНИЯХ (первая → последняя запись) ===');
        lines.push(progress.slice(0, 10).join('; '));
        lines.push('');
      }
    }
  } catch (e) {}

  return lines.join('\n') + '\n' + buildProgressSummary();
}


/* ==================== ПРОГРЕСС ДЛЯ ИИ ====================
   ИИ видит: прошлые подходы, расчётный максимум, рабочие подходы
   по группам мышц за эту и прошлую неделю, дату последнего замера.
   Тоннаж не используется.
============================================================ */
function fsAiDateKey(value) {
  var parts = String(value || '').split(',')[0].trim().split('.');
  return parts.length === 3 ? parts[2] + '-' + parts[1].padStart(2, '0') + '-' + parts[0].padStart(2, '0') : String(value || '');
}
function fsAiBestSet(sets) {
  if (!Array.isArray(sets)) return null;
  var best = null;
  sets.forEach(function (set) {
    var kg = Number(set.kg) || 0;
    var reps = Number(set.r) || 0;
    if (kg <= 0 || reps <= 0) return;
    var e1rm = kg * (1 + reps / 30);
    if (!best || e1rm > best.e1rm) best = { kg: kg, reps: reps, e1rm: e1rm };
  });
  return best;
}
function fsAiExerciseHistory(name) {
  var all = [];
  var exlog = {};
  try { exlog = JSON.parse(AppStorage.getItem('fs-exlog')) || {}; } catch (e) {}
  if (Array.isArray(exlog[name])) all.push(...exlog[name]);
  var diary = [];
  try { diary = JSON.parse(AppStorage.getItem('fs-diary')) || []; } catch (e) {}
  if (Array.isArray(diary)) {
    diary.forEach(function (entry) {
      if (!entry || !Array.isArray(entry.exerciseDetails)) return;
      entry.exerciseDetails.forEach(function (ex) {
        if (String(ex.name || ex.n || '') !== name) return;
        var sets = Array.isArray(ex.sets) ? ex.sets : [];
        if (!sets.length) return;
        var best = fsAiBestSet(sets);
        if (!best) return;
        all.push({ date: entry.date, kg: best.kg, r: best.reps, s: sets.length });
      });
    });
  }
  var seen = new Set();
  return all.filter(function (item) {
    var key = fsAiDateKey(item.date) + '|' + item.kg + '|' + item.r + '|' + item.s;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort(function (a, b) { return fsAiDateKey(b.date).localeCompare(fsAiDateKey(a.date)); });
}
function fsAiWeeklyMuscleVolume() {
  var labels = { chest: 'Грудь', back: 'Спина', legs: 'Ноги', shoulders: 'Плечи', biceps: 'Бицепс', triceps: 'Трицепс', glutes: 'Ягодицы', abs: 'Пресс', forearms: 'Предплечья' };
  var counts = { thisWeek: {}, lastWeek: {} };
  Object.keys(labels).forEach(function (k) { counts.thisWeek[k] = 0; counts.lastWeek[k] = 0; });
  var diary = [];
  try { diary = JSON.parse(AppStorage.getItem('fs-diary')) || []; } catch (e) {}
  var now = new Date();
  function startOfWeek(offsetWeeks) {
    var d = new Date(now);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - offsetWeeks * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  var thisStart = startOfWeek(0), lastStart = startOfWeek(1), nextStart = startOfWeek(-1);
  if (Array.isArray(diary)) {
    diary.forEach(function (entry) {
      if (!entry) return;
      var iso = fsAiDateKey(entry.date);
      var date = new Date(iso + 'T00:00:00');
      if (isNaN(date.getTime())) return;
      var bucket = date >= thisStart && date < nextStart ? 'thisWeek' : (date >= lastStart && date < thisStart ? 'lastWeek' : null);
      if (!bucket) return;
      var exercises = Array.isArray(entry.exerciseDetails) && entry.exerciseDetails.length ? entry.exerciseDetails : [];
      exercises.forEach(function (ex) {
        var category = typeof workoutExerciseCategory === 'function' ? workoutExerciseCategory(ex) : ex.category;
        if (!labels[category]) return;
        var sets = Array.isArray(ex.sets) ? ex.sets : [];
        counts[bucket][category] += sets.filter(function (s) { return Number(s.r) > 0; }).length || 1;
      });
    });
  }
  return { labels: labels, counts: counts };
}
function fsAiLastMeasurementDays() {
  var body = [];
  try { body = JSON.parse(AppStorage.getItem('fs-bodylog')) || []; } catch (e) {}
  var dates = body.map(function (e) { return fsAiDateKey(e.date); }).filter(Boolean).sort();
  if (!dates.length) return null;
  var last = new Date(dates[dates.length - 1] + 'T00:00:00');
  if (isNaN(last.getTime())) return null;
  return Math.round((Date.now() - last.getTime()) / 86400000);
}
function buildProgressSummary() {
  var lines = [];
  try {
    var exlog = {};
    try { exlog = JSON.parse(AppStorage.getItem('fs-exlog')) || {}; } catch (e) {}
    var names = Object.keys(exlog).sort(function (a, b) { return a.localeCompare(b, 'ru'); });
    if (names.length) {
      lines.push('ПРОГРЕСС УПРАЖНЕНИЙ:');
      names.slice(0, 12).forEach(function (name) {
        var history = fsAiExerciseHistory(name);
        if (!history.length) return;
        var last = history[0];
        var prev = history[1];
        var best = fsAiBestSet([{ kg: last.kg, r: last.r }]);
        var line = '- ' + name + ': последний раз ' + last.kg + ' кг × ' + last.r + ' (' + last.s + ' подхода), дата ' + last.date;
        if (best) line += ', расчётный максимум ' + best.e1rm.toFixed(1) + ' кг';
        if (prev) line += '; до этого ' + prev.kg + ' кг × ' + prev.r;
        lines.push(line);
      });
    }
  } catch (e) {}
  try {
    var vol = fsAiWeeklyMuscleVolume();
    var rows = Object.keys(vol.labels).map(function (key) {
      var now = vol.counts.thisWeek[key], prev = vol.counts.lastWeek[key];
      return '- ' + vol.labels[key] + ': эта неделя ' + now + ', прошлая ' + prev;
    });
    lines.push('НАГРУЗКА ПО МЫШЦАМ (рабочие подходы):');
    lines.push(...rows);
  } catch (e) {}
  try {
    var days = fsAiLastMeasurementDays();
    if (days !== null) lines.push('ПОСЛЕДНИЙ ЗАМЕР: ' + days + ' дн. назад' + (days > 21 ? ' — пора обновить замеры.' : '.'));
    else lines.push('ПОСЛЕДНИЙ ЗАМЕР: данных нет.');
  } catch (e) {}
  return lines.join('\n');
}

function aipGetCheckins(days) {
  try {
    var arr = JSON.parse(AppStorage.getItem('fs-checkins') || '[]');
    if (!Array.isArray(arr)) return [];
    return arr.filter(function (c) {
      var t = aipParseDiaryDate(c.date);
      return t && (new Date() - t) / 86400000 <= (days || 7);
    });
  } catch (e) { return []; }
}

function hasCheckinToday() {
  var today = new Date().toLocaleDateString('ru-RU');
  return aipGetCheckins(1).some(function (c) { return c.date === today; });
}

function buildSystemPrompt() {
  var pr = getProfile();
  var water = getWaterToday();
  var personality = PERSONALITY_PROMPTS[aiCoachPersonality] || PERSONALITY_PROMPTS.balanced;

  /* Профиль передаётся ВСЕГДА, даже без имени */
  var profileBlock = '';
  var rows = [
    '=== ПРОФИЛЬ ===',
    'Пол: ' + (pr.gender === 'male' ? 'мужской' : pr.gender === 'female' ? 'женский' : '—'),
    'Возраст: ' + (pr.age || '?') + ' лет',
    'Вес: ' + (pr.weight || '?') + ' кг',
    'Рост: ' + (pr.height || '?') + ' см',
    'Цель: ' + (pr.goal === 'loss' ? 'похудение' : pr.goal === 'gain' ? 'набор массы' : 'поддержание веса'),
    'Целевой вес: ' + (pr.target || '—') + ' кг',
    'Стаж тренировок: ' + (pr.exp || '—')
  ];
  profileBlock = rows.join('\n');
  try {
    var w = Number(pr.weight) > 0 ? Number(pr.weight) : 75;
    var h = Number(pr.height) > 0 ? Number(pr.height) : 175;
    var ag = Number(pr.age) > 0 ? Number(pr.age) : 25;
    var base = 10 * w + 6.25 * h - 5 * ag;
    var bmr = pr.gender === 'male' ? base + 5 : base - 161;
    var tdee = Math.round(bmr * (Number(pr.activity) || 1.55));
    profileBlock += '\nBMR: ' + Math.round(bmr) + ' ккал · TDEE ~' + tdee + ' ккал';
    if (pr.goal === 'loss') profileBlock += '\nРекомендуемая норма для цели (дефицит ~400): ' + (tdee - 400) + ' ккал/день';
    if (pr.goal === 'gain') profileBlock += '\nРекомендуемая норма для цели (профицит ~300): ' + (tdee + 300) + ' ккал/день';
    if (pr.goal === 'maintain') profileBlock += '\nРекомендуемая норма: ' + tdee + ' ккал/день';
  } catch (e) {}

  var wToday = '';
  try {
    var entries = JSON.parse(AppStorage.getItem('fs-nutrition') || '[]');
    var today = new Date().toLocaleDateString('ru-RU');
    var tE = entries.filter(function (e) { return e.date === today; });
    if (tE.length) {
      var tt = tE.reduce(function (ac, e) {
        return { kcal: ac.kcal + (e.kcal || 0), protein: ac.protein + (e.protein || 0),
                 carbs: ac.carbs + (e.carbs || 0), fat: ac.fat + (e.fat || 0) };
      }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
      wToday = '=== ПИТАНИЕ СЕГОДНЯ ===\n' +
        'Ккал: ' + Math.round(tt.kcal) + ', белок: ' + Math.round(tt.protein) +
        ' г, жиры: ' + Math.round(tt.fat) + ' г, углеводы: ' + Math.round(tt.carbs) + ' г\n' +
        'Вода сегодня: ' + Math.round(water) + ' мл\n';
    }
  } catch (e) {}

  var ci = aipGetCheckins(7);
  var ciBlock = '';
  if (ci.length) {
    ciBlock = '=== ЧЕК-ИНЫ (7 дней) ===\n' + ci.map(function (c) {
      var parts = [];
      if (c.sleep) parts.push('сон ' + c.sleep + ' ч');
      if (c.energy) parts.push('энергия ' + c.energy + '/5');
      if (c.note) parts.push('«' + c.note + '»');
      return '• ' + c.date + ': ' + (parts.join(', ') || '—');
    }).join('\n') + '\n';
    var slp = ci.filter(function (c) { return Number(c.sleep) > 0; });
    if (slp.length) {
      var avgSleep = slp.reduce(function (s, c) { return s + Number(c.sleep); }, 0) / slp.length;
      if (avgSleep < 7) ciBlock += 'Сон в среднем ' + avgSleep.toFixed(1) + ' ч — ниже нормы 7–9 ч, это тормозит восстановление и прогресс.\n';
    }
  }
  if (!hasCheckinToday()) {
    ciBlock += '\nВАЖНО: пользователь сегодня не заполнял чек-ин. При уместности спроси про сон/самочувствие.\n';
  }

  return ['Ты ИИ-тренер FitSim. Отвечай кратко и по данным. Если спрашивают о прошлом подходе, прогрессе, нагрузке по мышцам или замерах — используй блоки ПРОГРЕСС УПРАЖНЕНИЙ, НАГРУЗКА ПО МЫШЦАМ и ПОСЛЕДНИЙ ЗАМЕР. Формат: сначала факт, затем короткая рекомендация. Не выдумывай данные. Если данных нет — скажи честно. Тоннаж не используй.',
    'Ты персональный AI-тренер по фитнесу, нутрициологии и восстановлению в приложении FitSim.',
    personality,
    '',
    '=== ТВОЯ РОЛЬ: НАПРАВЛЯЮЩИЙ ТРЕНЕР ===',
    'Ты не пассивный справочник — ты ведёшь пользователя к его цели и следишь за движением к ней.',
    'Перед каждым ответом просматривай данные ниже и привязывай совет к фактам:',
    '— сверяй текущий вес с целевым и динамику за 14 дней («за 2 недели −0,8 кг — темп верный» или «вес стоит — усилим»);',
    '— сверяй средние калории с нормой для цели и комментируй разницу цифрой;',
    '— сверяй белок с 1,6–2 г на кг веса при наборе массы и похудении;',
    '— сверяй воду с нормой из сводки и отмечай недобор;',
    '— смотри сон и энергию из чек-инов: если мало спит или низкая энергия — это приоритетнее тренировок, скажи об этом;',
    '— отмечай пропуски тренировок и группы мышц, которые не тренировались 2 недели;',
    '— если пользователь делает одни и те же упражнения, предложи разнообразие;',
    '',
    '=== СТИЛЬ ОБЩЕНИЯ ===',
    'Отвечай на русском. Эмодзи — умеренно. Формат: **жирный**, списки, заголовки.',
    'Давай 1–3 конкретных шага на сейчас, а не общие лекции.',
    'Задавай не больше одного уточняющего вопроса за раз.',
    'Хвали за реальные сдвиги (цифры из данных), а не дежурно.',
    'Если данных мало — уточни, не выдумывай.',
    'Советы по здоровью давай осторожно: при подозрении на проблему со здоровьем рекомендуй врача.',
    '',
    profileBlock,
    wToday,
    buildDataSummary(),
    ciBlock,
    'Эти данные — твоя основа. Всегда учитывай их и отталкивайся от них в ответах.'
  ].filter(Boolean).join('\n\n');
}

/* ══════════════════════════════════════════════════════════════
   PERSISTENCE
══════════════════════════════════════════════════════════════ */

function persistChatHistory() {
  try { AppStorage.setItem('fs-ai-chat-history', JSON.stringify(aiChatHistory.slice(-50))); }
  catch (e) {}
}
function restoreChatHistory() {
  try { aiChatHistory = JSON.parse(AppStorage.getItem('fs-ai-chat-history') || '[]'); }
  catch (e) { aiChatHistory = []; }
}

/* ══════════════════════════════════════════════════════════════
   UI RENDERING
══════════════════════════════════════════════════════════════ */

function appendMsg(role, text, opts) {
  opts = opts || {};
  var msgs = document.getElementById('ai-chat-msgs');
  if (!msgs) return null;

  var msgId = 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2);

  var wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;' +
    (role === 'user' ? 'align-items:flex-end;' : 'align-items:flex-start;');

  var bubble = document.createElement('div');
  bubble.id = msgId;
  bubble.className = 'ai-bubble ai-bubble-' + role;
  bubble.innerHTML = role === 'ai' ? renderMarkdown(text) : escapeHtml(String(text || ''));
  wrap.appendChild(bubble);

  if (role === 'ai' && !opts.noReactions) {
    var reactionBar = document.createElement('div');
    reactionBar.className = 'ai-reaction-bar';
    reactionBar.innerHTML =
      '<button class="ai-reaction-btn" onclick="aiReact(\'' + msgId + '\',1)" title="Полезно">👍</button>' +
      '<button class="ai-reaction-btn" onclick="aiReact(\'' + msgId + '\',0)" title="Не то">👎</button>' +
      '<button class="ai-reaction-btn ai-copy-btn" onclick="aiCopyMsg(\'' + msgId + '\')" title="Копировать">📋</button>';
    wrap.appendChild(reactionBar);

    if (opts.quickReplies && opts.quickReplies.length) {
      var chipsWrap = document.createElement('div');
      chipsWrap.className = 'ai-qr-wrap';
      opts.quickReplies.forEach(function (qr) {
        var chip = document.createElement('button');
        chip.className = 'ai-qr-chip';
        chip.textContent = qr;
        chip.onclick = function () { chipsWrap.remove(); sendAiMessage(qr); };
        chipsWrap.appendChild(chip);
      });
      wrap.appendChild(chipsWrap);
    }
  }

  msgs.appendChild(wrap);
  msgs.scrollTop = msgs.scrollHeight;
  return msgId;
}

function streamText(elementId, text, onDone) {
  var el = document.getElementById(elementId);
  if (!el || !aiStreamingEnabled) {
    if (el) el.innerHTML = renderMarkdown(text);
    if (onDone) onDone();
    return;
  }
  var i = 0;
  var speed = Math.max(8, Math.min(25, Math.round(8000 / Math.max(text.length, 1))));
  el.innerHTML = '';
  var partial = '';
  function step() {
    if (i >= text.length) {
      el.innerHTML = renderMarkdown(text);
      var msgs = document.getElementById('ai-chat-msgs');
      if (msgs) msgs.scrollTop = msgs.scrollHeight;
      if (onDone) onDone();
      return;
    }
    partial += text.slice(i, i + 3);
    i += 3;
    el.innerHTML = partial.replace(/\n/g, '<br>');
    var msgs = document.getElementById('ai-chat-msgs');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
    setTimeout(step, speed);
  }
  step();
}

function appendTyping(id, phase) {
  var msgs = document.getElementById('ai-chat-msgs');
  if (!msgs) return;
  var w = document.createElement('div');
  w.id = id;
  w.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 0;';
  w.innerHTML =
    '<div class="ai-typing"><span></span><span></span><span></span></div>' +
    '<span id="' + id + '-phase" class="ai-typing-phase">' + (phase || '') + '</span>';
  msgs.appendChild(w);
  msgs.scrollTop = msgs.scrollHeight;
}
function updateTypingPhase(id, phase) {
  var el = document.getElementById(id + '-phase');
  if (el) el.textContent = phase;
}

/* ══════════════════════════════════════════════════════════════
   REACTIONS & COPY
══════════════════════════════════════════════════════════════ */

function aiReact(msgId, positive) {
  var el = document.getElementById(msgId);
  if (!el) return;
  var bar = el.parentNode && el.parentNode.querySelector('.ai-reaction-bar');
  if (bar) {
    bar.innerHTML = positive
      ? '<span style="font-size:13px;color:var(--accent);font-weight:600">👍 Отлично!</span>'
      : '<span style="font-size:13px;color:var(--text-light)">👎 Учту</span>';
  }
}
window.aiReact = aiReact;

function aiCopyMsg(msgId) {
  var el = document.getElementById(msgId);
  if (!el) return;
  var text = el.innerText || el.textContent || '';
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () { toast('Скопировано 📋'); });
  } else {
    try {
      var ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      toast('Скопировано 📋');
    } catch (e) {}
  }
}
window.aiCopyMsg = aiCopyMsg;

/* ══════════════════════════════════════════════════════════════
   TOPIC DETECTION
══════════════════════════════════════════════════════════════ */

function detectTopic(text) {
  var t = text.toLowerCase();
  if (/трениров|упражн|жим|присед|становая|подтягив|план|программ/.test(t)) return 'workout';
  if (/ед|питан|калор|белок|протеин|ужин|завтрак|обед|рецепт|макр/.test(t)) return 'nutrition';
  if (/прогресс|результат|плато|не похуд|не расту|застой/.test(t)) return 'progress';
  return 'generic';
}
function getQuickReplies(responseText, userMsg) {
  var topic = detectTopic((userMsg || '') + ' ' + (responseText || ''));
  return QUICK_REPLY_SETS[topic] || QUICK_REPLY_SETS.generic;
}
function detectWorkoutPlan(text) {
  var t = text || '';
  var matches = t.match(/(?:день|day|понедельник|вторник|среда|четверг|пятница|суббота|воскресенье)[^\n]*/gi);
  return !!(matches && matches.length >= 2);
}

/* ══════════════════════════════════════════════════════════════
   EXPORT PLAN TO DIARY
══════════════════════════════════════════════════════════════ */

window.aiExportPlanToDiary = function (btn) {
  try {
    var planText = (btn && btn.dataset && btn.dataset.plan) || lastAiPlanText || 'Сгенерирован AI-тренером';
    var diary = JSON.parse(AppStorage.getItem('fs-diary') || '[]');
    diary.push({
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('ru-RU'),
      type: '📋 AI-план тренировок',
      exercises: planText,
      kcal: 0
    });
    AppStorage.setItem('fs-diary', JSON.stringify(diary));
    toast('План сохранён в дневник 📅');
  } catch (e) {
    toast('Не удалось сохранить план');
  }
};

function attachExportButton(msgId, planText) {
  var el = document.getElementById(msgId);
  if (!el || !el.parentNode) return;
  var wrap = document.createElement('div');
  wrap.style.marginTop = '8px';
  wrap.innerHTML = '<button class="ai-export-btn" onclick="aiExportPlanToDiary(this)" ' +
    'data-plan="' + escapeHtml(planText) + '">📅 Сохранить план в дневник</button>';
  el.parentNode.insertBefore(wrap, el.nextSibling);
}

/* ══════════════════════════════════════════════════════════════
   MAIN SEND (главный фикс: callGroq('', ...) вместо callGroq(key, ...))
══════════════════════════════════════════════════════════════ */

async function sendAiMessage(text) {
  if (!text) {
    var inp = document.getElementById('ai-input');
    if (!inp) return;
    text = inp.value.trim();
    if (!text) return;
    inp.value = '';
    inp.style.height = 'auto';
  }

  if (!getAiKey()) { appendMsg('ai', getNoKeyMsg(), { noReactions: true }); return; }
  if (generating) return;

  document.querySelectorAll('.ai-qr-wrap').forEach(function (el) { el.remove(); });

  appendMsg('user', text);
  aiChatHistory.push({ role: 'user', content: text });
  persistChatHistory();

  generating = true;
  updateSendBtn(true);
  var typingId = 'typing-' + Date.now();
  appendTyping(typingId, 'Думаю...');

  var phases = ['Анализирую данные...', 'Составляю ответ...', 'Почти готово...'];
  var phaseIdx = 0;
  var phaseTimer = setInterval(function () {
    phaseIdx = (phaseIdx + 1) % phases.length;
    updateTypingPhase(typingId, phases[phaseIdx]);
  }, 1800);

  try {
    var sys = buildSystemPrompt();
    var msgs = aiChatHistory.slice(-20);
    // ★★★ ГЛАВНЫЙ ФИКС: передаём '', ключ подтягивается внутри callGroq ★★★
    var reply = await callGroq('', sys, msgs, 1400);

    clearInterval(phaseTimer);
    var typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();

    aiChatHistory.push({ role: 'assistant', content: reply });
    persistChatHistory();
    updateMsgCounter();

    var qr = getQuickReplies(reply, text);
    var msgId = appendMsg('ai', '', { quickReplies: qr });

    streamText(msgId, reply, function () {
      if (detectWorkoutPlan(reply)) {
        lastAiPlanText = reply;
        attachExportButton(msgId, reply);
      }
    });

    lastTopic = detectTopic(text);
  } catch (err) {
    clearInterval(phaseTimer);
    var typingElErr = document.getElementById(typingId);
    if (typingElErr) typingElErr.remove();
    var errMsg = err && err.message ? err.message : 'Ошибка';
    if (errMsg.indexOf('401') !== -1) errMsg = 'Неверный API ключ. Проверь ключ Groq в карточке подключения.';
    else if (errMsg.indexOf('429') !== -1) errMsg = 'Превышен лимит запросов. Попробуй через минуту.';
    else if (errMsg.indexOf('timeout') !== -1) errMsg = 'Сервер не отвечает. Попробуй ещё раз.';
    else if (errMsg.indexOf('нет связи') !== -1) errMsg = 'Нет связи с сервисом. Проверь интернет.';
    appendMsg('ai', '❌ ' + errMsg, { noReactions: true });
  } finally {
    generating = false;
    updateSendBtn(false);
  }
}
window.sendAiMessage = sendAiMessage;

function updateSendBtn(busy) {
  var btn = document.getElementById('ai-send-btn');
  if (!btn) return;
  btn.disabled = !!busy;
  btn.textContent = busy ? '⏳' : '➤';
}

function updateMsgCounter() {
  var el = document.getElementById('ai-msg-count');
  if (el) {
    var count = aiChatHistory.length;
    el.textContent = count + '/50';
    el.style.color = count > 40 ? 'var(--accent)' : 'var(--text-light)';
  }
}

/* ══════════════════════════════════════════════════════════════
   CLEAR / WELCOME
══════════════════════════════════════════════════════════════ */

function clearAiChat() {
  if (!confirm('Очистить историю диалога?')) return;
  aiChatHistory = [];
  persistChatHistory();
  var msgs = document.getElementById('ai-chat-msgs');
  if (msgs) msgs.innerHTML = '';
  updateMsgCounter();
  showWelcomeMessage();
}
window.clearAiChat = clearAiChat;

function showWelcomeMessage() {
  var pr = getProfile();
  var name = pr.name ? ', ' + pr.name : '';
  var msg = 'Привет' + name + '! 💪 Я твой AI-тренер: вижу дневник, питание, воду и твой прогресс.';
  if (Number(pr.weight) > 0) {
    msg += ' Сейчас ' + pr.weight + ' кг';
    if (Number(pr.target) > 0) msg += ', цель — ' + pr.target + ' кг';
    msg += '.';
  }
  if (!hasCheckinToday()) msg += ' Заполни «☀️ Чек-ин» — так я пойму твоё восстановление.';
  msg += ' Спроси про свой прогресс или что угодно ещё.';
  appendMsg('ai', msg, { quickReplies: QUICK_REPLY_SETS.greeting, noReactions: true });
}
window.showWelcomeMessage = showWelcomeMessage;

/* ══════════════════════════════════════════════════════════════
   PERSONALITY
══════════════════════════════════════════════════════════════ */

function setAiPersonality(p) {
  aiCoachPersonality = p;
  try { AppStorage.setItem('fs-ai-personality', p); } catch (e) {}
  document.querySelectorAll('.ai-personality-btn').forEach(function (btn) {
    btn.classList.toggle('ai-personality-active', btn.dataset.p === p);
  });
  var names = { strict: 'Строгий тренер', balanced: 'Профи', mentor: 'Наставник' };
  toast('Режим: ' + (names[p] || p));
}
window.setAiPersonality = setAiPersonality;

/* ══════════════════════════════════════════════════════════════
   VOICE INPUT
══════════════════════════════════════════════════════════════ */

var aiVoiceRecognition = null;
var aiVoiceActive = false;

function startAiVoice() {
  var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) { toast('Голосовой ввод не поддерживается'); return; }
  if (aiVoiceActive) {
    if (aiVoiceRecognition) aiVoiceRecognition.stop();
    return;
  }
  aiVoiceRecognition = new SpeechRec();
  aiVoiceRecognition.lang = 'ru-RU';
  aiVoiceRecognition.interimResults = false;
  aiVoiceActive = true;

  var voiceBtn = document.getElementById('ai-voice-btn');
  if (voiceBtn) voiceBtn.classList.add('listening');

  aiVoiceRecognition.onresult = function (e) {
    var transcript = e.results[0][0].transcript;
    var inp = document.getElementById('ai-input');
    if (inp) inp.value = transcript;
    sendAiMessage(transcript);
  };
  aiVoiceRecognition.onend = aiVoiceRecognition.onerror = function () {
    aiVoiceActive = false;
    if (voiceBtn) voiceBtn.classList.remove('listening');
  };
  aiVoiceRecognition.start();
}
window.startAiVoice = startAiVoice;

/* ══════════════════════════════════════════════════════════════
   GENERATE PLAN / ANALYZE NUTRITION / PROGRESS
══════════════════════════════════════════════════════════════ */

async function generateWorkoutPlan() {
  if (!getAiKey()) { appendMsg('ai', getNoKeyMsg(), { noReactions: true }); return; }
  if (generating) return;

  generating = true;
  updateSendBtn(true);
  var typingId = 'typing-plan-' + Date.now();
  appendTyping(typingId, 'Составляю план...');

  var phases = ['Подбираю упражнения...', 'Рассчитываю объём...', 'Финальная настройка...'];
  var phaseIdx = 0;
  var phaseTimer = setInterval(function () {
    phaseIdx = (phaseIdx + 1) % phases.length;
    updateTypingPhase(typingId, phases[phaseIdx]);
  }, 2000);

  try {
    var sys = buildSystemPrompt();
    var prompt = 'Составь детальный недельный план тренировок. Стиль: ' + aiStyle +
      ', Интенсивность: ' + aiIntensity +
      '. Для каждого дня укажи: название, упражнения с подходами/повторами/весами. Markdown.';
    // ★★★ ФИКС ★★★
    var reply = await callGroq('', sys, [{ role: 'user', content: prompt }], 2000);

    clearInterval(phaseTimer);
    var typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();

    aiChatHistory.push({ role: 'user', content: prompt });
    aiChatHistory.push({ role: 'assistant', content: reply });
    persistChatHistory();
    updateMsgCounter();

    var msgId = appendMsg('ai', '', {
      quickReplies: ['Сделай сложнее', 'Объясни упражнение', 'Альтернативы без зала']
    });
    streamText(msgId, reply, function () {
      lastAiPlanText = reply;
      attachExportButton(msgId, reply);
    });

    lastPlanParams = { style: aiStyle, intensity: aiIntensity };
  } catch (err) {
    clearInterval(phaseTimer);
    var tEl = document.getElementById(typingId);
    if (tEl) tEl.remove();
    appendMsg('ai', '❌ Не удалось сгенерировать план: ' + ((err && err.message) || ''), { noReactions: true });
  } finally {
    generating = false;
    updateSendBtn(false);
  }
}
window.generateWorkoutPlan = generateWorkoutPlan;

async function analyzeNutrition() {
  if (!getAiKey()) { appendMsg('ai', getNoKeyMsg(), { noReactions: true }); return; }
  if (generating) return;

  var nutr = getTodayNutr();
  if (!nutr || nutr.kcal === 0) {
    appendMsg('ai', '📊 Сегодня питание ещё не записано. Добавь приёмы пищи, и я проанализирую.', {
      quickReplies: ['Что можно съесть сейчас?', 'Рассчитай мою норму калорий'],
      noReactions: true
    });
    return;
  }

  generating = true;
  updateSendBtn(true);
  var typingId = 'typing-nutr-' + Date.now();
  appendTyping(typingId, 'Анализирую питание...');

  try {
    var sys = buildSystemPrompt();
    var prompt = 'Проанализируй моё питание за сегодня. Дай конкретные рекомендации: что добавить, что убрать, когда есть. Будь конкретен с граммами.';
    var reply = await callGroq('', sys, [{ role: 'user', content: prompt }], 1200);

    var typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();

    aiChatHistory.push({ role: 'user', content: prompt });
    aiChatHistory.push({ role: 'assistant', content: reply });
    persistChatHistory();
    updateMsgCounter();

    var msgId = appendMsg('ai', '', {
      quickReplies: ['Список продуктов на неделю', 'Что на ужин?', 'Рецепты с высоким белком']
    });
    streamText(msgId, reply);
  } catch (err) {
    var tEl = document.getElementById(typingId);
    if (tEl) tEl.remove();
    appendMsg('ai', '❌ Ошибка: ' + ((err && err.message) || ''), { noReactions: true });
  } finally {
    generating = false;
    updateSendBtn(false);
  }
}
window.analyzeNutrition = analyzeNutrition;

async function analyzeProgress() {
  if (!getAiKey()) { appendMsg('ai', getNoKeyMsg(), { noReactions: true }); return; }
  if (generating) return;

  generating = true;
  updateSendBtn(true);
  var typingId = 'typing-prog-' + Date.now();
  appendTyping(typingId, 'Анализирую прогресс...');

  try {
    var sys = buildSystemPrompt();
    var prompt = 'Проанализируй мой прогресс. Что хорошо? Где проблемы? 3–5 конкретных действий на сегодня.';
    var reply = await callGroq('', sys, [{ role: 'user', content: prompt }], 1200);

    var typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();

    aiChatHistory.push({ role: 'user', content: prompt });
    aiChatHistory.push({ role: 'assistant', content: reply });
    persistChatHistory();
    updateMsgCounter();

    var msgId = appendMsg('ai', '', {
      quickReplies: ['Как выйти из плато?', 'Оптимальное время тренировок', 'Нужен ли отдых?']
    });
    streamText(msgId, reply);
  } catch (err) {
    var tEl = document.getElementById(typingId);
    if (tEl) tEl.remove();
    appendMsg('ai', '❌ ' + ((err && err.message) || ''), { noReactions: true });
  } finally {
    generating = false;
    updateSendBtn(false);
  }
}
window.analyzeProgress = analyzeProgress;

/* ══════════════════════════════════════════════════════════════
   PROVIDERS UI (карточка подключения)
══════════════════════════════════════════════════════════════ */

var AIP_PROVIDERS = {
  groq: {
    name: 'Groq', badge: '✓ Работает сразу', badgeColor: '#22c55e',
    placeholder: 'gsk_...',
    steps: [
      'Открой console.groq.com/keys — регистрация бесплатная',
      'Нажми «Create API Key», придумай имя',
      'Скопируй ключ (gsk_...) и вставь ниже → «Сохранить»'
    ]
  },
  gigachat: {
    name: 'GigaChat', badge: '⚠ Может не пропустить из браузера', badgeColor: '#f59e0b',
    placeholder: 'Ключ авторизации GigaChat',
    steps: [
      'developers.sber.ru → СберID',
      'Создай проект и скопируй ключ',
      'Вставь ключ ниже. Если ошибка соединения — вернись на Groq'
    ]
  },
  yandex: {
    name: 'YandexGPT', badge: '⚠ Нужен Yandex Cloud', badgeColor: '#f59e0b',
    placeholder: 'API-ключ Yandex Cloud',
    steps: [
      'console.cloud.yandex.ru → API-ключ',
      'Скопируй ключ и ID каталога',
      'Вставь ниже. Если ошибка соединения — вернись на Groq'
    ]
  }
};

function saveAiKeys(obj) {
  try { AppStorage.setItem('fs-ai-keys', JSON.stringify(obj)); } catch (e) {}
}

function setAiProvider(p) {
  var st = getAiKeys();
  st.provider = p;
  saveAiKeys(st);
  aipRenderProviderForm();
  toast('Провайдер: ' + (AIP_PROVIDERS[p] ? AIP_PROVIDERS[p].name : p));
}
window.setAiProvider = setAiProvider;
window.aipSelectProvider = setAiProvider;

function saveAiKey() {
  var st = getAiKeys();
  var p = st.provider || 'groq';
  var keyInp = document.getElementById('aip-key-input');
  var folderInp = document.getElementById('aip-folder-input');
  var statusEl = document.getElementById('aip-key-status');
  if (!keyInp) return;
  var key = keyInp.value.trim();
  if (!key) {
    if (statusEl) { statusEl.textContent = '⚠️ Вставь ключ перед сохранением'; statusEl.style.color = '#f97316'; }
    return;
  }
  if (p === 'groq') st.groq = key;
  if (p === 'gigachat') st.gigachat = key;
  if (p === 'yandex') st.yandex = key;
  if (folderInp) st.yandexFolder = folderInp.value.trim();
  saveAiKeys(st);
  if (statusEl) {
    statusEl.textContent = '✅ Ключ сохранён';
    statusEl.style.color = '#22c55e';
    setTimeout(function () { if (statusEl) statusEl.textContent = ''; }, 3000);
  }
  keyInp.type = 'password';
  toast('✅ Ключ сохранён!');
}
window.saveAiKey = saveAiKey;

function aipRenderProviderForm() {
  var info = document.getElementById('aip-provider-info');
  var form = document.getElementById('aip-provider-form');
  if (!info || !form) return;
  var p = getAiProvider();
  var conf = AIP_PROVIDERS[p] || AIP_PROVIDERS.groq;
  var st = getAiKeys();
  var saved = (p === 'groq' && (st.groq || st.key)) ||
              (p === 'gigachat' && st.gigachat) ||
              (p === 'yandex' && st.yandex);

  info.innerHTML =
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
    '<span style="font-size:12px;color:' + conf.badgeColor + ';font-weight:600">' + conf.badge + '</span></div>' +
    '<ol style="margin:0 0 10px 18px;padding:0;font-size:13px;opacity:.9;line-height:1.5">' +
    conf.steps.map(function (s) { return '<li style="margin-bottom:3px">' + s + '</li>'; }).join('') + '</ol>';

  var folderField = (p === 'yandex')
    ? '<input class="aip-input" id="aip-folder-input" placeholder="ID каталога" value="' + escapeHtml(st.yandexFolder || '') + '" style="margin-bottom:8px">'
    : '';
  form.innerHTML =
    folderField +
    '<input class="aip-input" id="aip-key-input" type="password" autocomplete="off" placeholder="' +
    conf.placeholder + '" value="' + escapeHtml(saved || '') + '" style="margin-bottom:8px">' +
    '<div style="display:flex;gap:8px;align-items:center">' +
    '<button class="aip-save" onclick="saveAiKey()">💾 Сохранить</button>' +
    (saved ? '<span style="font-size:12px;color:#22c55e;font-weight:600">✅ подключено</span>' : '') +
    '</div>' +
    '<div id="aip-key-status" style="font-size:12px;margin-top:6px"></div>';

  document.querySelectorAll('.aip-chip').forEach(function (ch) {
    ch.classList.toggle('aip-chip-active', ch.dataset.p === p);
  });
}

/* ══════════════════════════════════════════════════════════════
   CHECK-IN
══════════════════════════════════════════════════════════════ */

var aipEnergy = 0;
var aipCiEditing = false;

function renderCheckIn() {
  var body = document.getElementById('aip-ci-body');
  if (!body) return;
  var today = new Date().toLocaleDateString('ru-RU');
  var todayCi = aipGetCheckins(1).filter(function (c) { return c.date === today; })[0];
  if (todayCi && !aipEnergy && !aipCiEditing) {
    body.innerHTML =
      '<div style="font-size:13px;color:#22c55e;font-weight:600;margin-bottom:6px">✅ ' +
      'Сон ' + (todayCi.sleep || '?') + ' ч, энергия ' + (todayCi.energy || '?') + '/5' +
      (todayCi.note ? ', «' + escapeHtml(todayCi.note) + '»' : '') + '</div>' +
      '<button class="aip-btn" onclick="editCheckIn()">✏️ Изменить</button>';
    return;
  }
  var savedE = todayCi ? todayCi.energy : 0;
  aipEnergy = aipEnergy || savedE || 0;
  var emojis = ['😞', '🙁', '😐', '🙂', '😀'];
  body.innerHTML =
    '<div style="font-size:12px;opacity:.8;margin-bottom:4px">Сколько спал(а), часов</div>' +
    '<input class="aip-input" id="ci-sleep" inputmode="decimal" type="number" min="0" max="14" step="0.5" placeholder="7" value="' +
    (todayCi && todayCi.sleep ? todayCi.sleep : '') + '" style="margin-bottom:8px">' +
    '<div style="font-size:12px;opacity:.8;margin-bottom:4px">Заряд энергии</div>' +
    '<div style="display:flex;gap:4px;margin-bottom:8px">' +
    emojis.map(function (e, i) {
      return '<button class="aip-ener' + (aipEnergy === i + 1 ? ' aip-ener-active' : '') +
        '" data-n="' + (i + 1) + '" onclick="setCiEnergy(' + (i + 1) + ')">' + e + '</button>';
    }).join('') + '</div>' +
    '<input class="aip-input" id="ci-note" placeholder="Как день? (необязательно)" value="' +
    escapeHtml(todayCi && todayCi.note || '') + '" style="margin-bottom:8px">' +
    '<button class="aip-save" onclick="saveCheckIn()">💾 Сохранить</button>';
}
window.renderCheckIn = renderCheckIn;

function setCiEnergy(n) {
  aipEnergy = n;
  document.querySelectorAll('.aip-ener').forEach(function (b) {
    b.classList.toggle('aip-ener-active', Number(b.dataset.n) === n);
  });
}
window.setCiEnergy = setCiEnergy;

function saveCheckIn() {
  var sleepInp = document.getElementById('ci-sleep');
  var noteInp = document.getElementById('ci-note');
  var sleep = sleepInp ? parseFloat(sleepInp.value) : null;
  var note = noteInp ? noteInp.value.trim() : '';
  if (!sleep || sleep <= 0) { toast('Укажи, сколько спал(а) 🙂'); return; }
  var arr = [];
  try { arr = JSON.parse(AppStorage.getItem('fs-checkins') || '[]'); } catch (e) {}
  if (!Array.isArray(arr)) arr = [];
  var today = new Date().toLocaleDateString('ru-RU');
  arr = arr.filter(function (c) { return c.date !== today; });
  arr.push({ date: today, sleep: sleep, energy: aipEnergy || null, note: note });
  if (arr.length > 30) arr = arr.slice(-30);
  try { AppStorage.setItem('fs-checkins', JSON.stringify(arr)); } catch (e) {}
  aipEnergy = 0;
  aipCiEditing = false;
  renderCheckIn();
  toast('Чек-ин сохранён 💪');
}
window.saveCheckIn = saveCheckIn;

function editCheckIn() { aipEnergy = 0; aipCiEditing = true; renderCheckIn(); }
window.editCheckIn = editCheckIn;

/* ══════════════════════════════════════════════════════════════
   STREAMING TOGGLE
══════════════════════════════════════════════════════════════ */

function toggleStreaming() {
  aiStreamingEnabled = !aiStreamingEnabled;
  var btn = document.getElementById('aip-stream-toggle');
  if (btn) btn.textContent = aiStreamingEnabled ? '⚡ Анимация: вкл' : '⚡ Анимация: выкл';
}
window.toggleStreaming = toggleStreaming;

/* ══════════════════════════════════════════════════════════════
   INJECT AI+ UI
══════════════════════════════════════════════════════════════ */

function injectAiPlusUI() {
  var shell = document.querySelector('.ai-shell');
  if (!shell) return false;

  if (document.getElementById('aip-conn-card')) { renderCheckIn(); return true; }

  var styleId = 'aip-inline-style';
  if (!document.getElementById(styleId)) {
    var style = document.createElement('style');
    style.id = styleId;
    style.textContent =
      '.aip-chip{border:1px solid rgba(128,128,128,.4);border-radius:16px;padding:6px 10px;background:transparent;color:inherit;font-size:13px;cursor:pointer}' +
      '.aip-chip-active{background:var(--accent,#4f8cff);color:#fff;border-color:var(--accent,#4f8cff)}' +
      '.aip-ener{font-size:22px;background:transparent;border:none;cursor:pointer;padding:2px 6px;color:inherit;opacity:.45}' +
      '.aip-ener-active{opacity:1;transform:scale(1.25)}' +
      '.aip-input{width:100%;box-sizing:border-box;border:1px solid rgba(128,128,128,.4);border-radius:8px;padding:8px;font-size:14px;background:transparent;color:inherit}' +
      '.aip-save{border:none;border-radius:8px;padding:8px 14px;font-weight:600;cursor:pointer;background:var(--accent,#4f8cff);color:#fff}' +
      '.aip-btn{border:1px solid rgba(128,128,128,.4);border-radius:8px;padding:6px 10px;background:transparent;color:inherit;cursor:pointer;font-size:13px}' +
      '.ai-qr-wrap{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}' +
      '.ai-qr-chip{font-size:12px;padding:6px 10px;border-radius:999px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);cursor:pointer}' +
      '.ai-reaction-bar{display:flex;gap:4px;margin-top:4px}' +
      '.ai-reaction-btn{background:transparent;border:none;cursor:pointer;font-size:14px;opacity:.65}' +
      '.ai-reaction-btn:hover{opacity:1}' +
      '.ai-export-btn{margin-top:6px;padding:8px 12px;border-radius:8px;border:1px solid var(--accent);background:var(--accent);color:#fff;font-weight:600;cursor:pointer;font-size:13px}';
    document.head.appendChild(style);
  }

  var chatCard = document.getElementById('ai-chat-msgs');
  if (!chatCard) return false;
  chatCard = chatCard.closest('.card');
  if (!chatCard) return false;

  // Скрываем старые дубли
  shell.querySelectorAll(':scope > .card').forEach(function (card) {
    var t = card.textContent || '';
    if (t.indexOf('Режим тренера') > -1 || t.indexOf('Настройки AI-тренера') > -1) {
      card.style.display = 'none';
    }
  });

  // Карточка подключения
  var conn = document.createElement('div');
  conn.className = 'card';
  conn.id = 'aip-conn-card';
  conn.innerHTML =
    '<div class="card-body" style="padding:12px">' +
    '<div style="font-weight:700;margin-bottom:8px">🔗 Подключение ИИ</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">' +
    '<button class="aip-chip" data-p="groq" onclick="aipSelectProvider(\'groq\')">Groq ✓</button>' +
    '<button class="aip-chip" data-p="gigachat" onclick="aipSelectProvider(\'gigachat\')">GigaChat</button>' +
    '<button class="aip-chip" data-p="yandex" onclick="aipSelectProvider(\'yandex\')">YandexGPT</button>' +
    '</div>' +
    '<div id="aip-provider-info"></div>' +
    '<div id="aip-provider-form"></div>' +
    '</div>';
  chatCard.parentNode.insertBefore(conn, chatCard);

  // Чек-ин
  var ci = document.createElement('div');
  ci.className = 'card';
  ci.id = 'aip-ci-card';
  ci.innerHTML =
    '<div class="card-body" style="padding:12px">' +
    '<div style="font-weight:700;margin-bottom:8px">☀️ Чек-ин на сегодня</div>' +
    '<div id="aip-ci-body"></div>' +
    '</div>';
  chatCard.parentNode.insertBefore(ci, chatCard);

  // Панель кнопок
  var bar = document.createElement('div');
  bar.id = 'aip-toolbar';
  bar.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin:0 0 8px';
  bar.innerHTML =
    '<button id="aip-stream-toggle" class="aip-btn" onclick="toggleStreaming()">⚡ Анимация: вкл</button>' +
    '<button class="aip-btn" onclick="clearAiChat()">🗑 Очистить</button>';
  chatCard.parentNode.insertBefore(bar, chatCard);

  aipRenderProviderForm();
  renderCheckIn();
  return true;
}
window.injectAiPlusUI = injectAiPlusUI;

/* ══════════════════════════════════════════════════════════════
   INIT PAGE (автоматический вызов + защита от повторного запуска)
══════════════════════════════════════════════════════════════ */

function initAiPage() {
  if (aiAutoInitDone) {
    // повторный вход на страницу — просто перерисовать
    try { injectAiPlusUI(); renderCheckIn(); } catch (e) {}
    return;
  }

  restoreChatHistory();

  try {
    var saved = AppStorage.getItem('fs-ai-personality');
    if (saved) aiCoachPersonality = saved;
  } catch (e) {}

  document.querySelectorAll('.ai-personality-btn').forEach(function (btn) {
    btn.classList.toggle('ai-personality-active', btn.dataset.p === aiCoachPersonality);
  });

  var msgs = document.getElementById('ai-chat-msgs');
  if (!msgs) {
    // страница ещё не отрисована — попробуем позже
    setTimeout(initAiPage, 150);
    return;
  }

  updateMsgCounter();

  if (aiChatHistory.length > 0) {
    msgs.innerHTML = '';
    aiChatHistory.forEach(function (m) {
      if (m.role === 'user') appendMsg('user', m.content);
      else if (m.role === 'assistant') appendMsg('ai', m.content, { noReactions: true });
    });
  } else {
    msgs.innerHTML = '';
    showWelcomeMessage();
  }

  var inp = document.getElementById('ai-input');
  if (inp) {
    inp.onkeydown = function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendAiMessage();
      }
    };
    inp.oninput = function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    };
  }

  try { injectAiPlusUI(); } catch (e) { console.warn('injectAiPlusUI', e); }
  chatReady = true;
  aiAutoInitDone = true;
}
window.initAiPage = initAiPage;

/* ══════════════════════════════════════════════════════════════
   AUTO-INIT: запускаем при показе страницы #page-ai
   Работает даже если роутер не вызывает initAiPage.
══════════════════════════════════════════════════════════════ */

function isAiPageActive() {
  var pg = document.getElementById('page-ai');
  if (!pg) return false;
  return pg.classList.contains('active') ||
         pg.classList.contains('page-active') ||
         (pg.style.display && pg.style.display !== 'none');
}

function tryAutoInit() {
  if (!document.getElementById('page-ai')) return;
  if (isAiPageActive()) initAiPage();
}

document.addEventListener('DOMContentLoaded', function () {
  setTimeout(tryAutoInit, 300);
});

if (document.readyState === 'interactive' || document.readyState === 'complete') {
  setTimeout(tryAutoInit, 300);
}

// MutationObserver: следим за переключением страниц
(function () {
  if (typeof MutationObserver === 'undefined') return;
  var attached = false;
  function attach() {
    if (attached) return;
    var pg = document.getElementById('page-ai');
    if (!pg) return;
    attached = true;
    var obs = new MutationObserver(function () {
      if (isAiPageActive()) initAiPage();
    });
    obs.observe(pg, { attributes: true, attributeFilter: ['class', 'style'] });
  }
  document.addEventListener('DOMContentLoaded', attach);
  if (document.readyState !== 'loading') attach();
})();

// Перехват роутера (если goTo определён) — безопасный хак
(function () {
  if (typeof window.goTo !== 'function') return;
  var orig = window.goTo;
  window.goTo = function (page, title) {
    var res = orig.apply(this, arguments);
    if (page === 'ai') setTimeout(initAiPage, 100);
    return res;
  };
})();