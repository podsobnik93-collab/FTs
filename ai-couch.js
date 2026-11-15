/**
 * ai-couch.js — улучшенный AI-тренер для FitSim v2.0
 * Улучшения:
 * - Streaming-like анимация текста (посимвольный вывод)
 * - Markdown-рендеринг (жирный, курсив, списки, заголовки)
 * - Умные быстрые ответы (контекстные чипы под каждым AI-сообщением)
 * - История диалога с поиском
 * - Реакции на сообщения (👍/👎)
 * - Улучшенный system prompt с полным контекстом пользователя
 * - Стриминг мышления (typing-индикатор с фазами: "Анализирую...", "Составляю план...")
 * - Голосовой ввод в чате
 * - Экспорт плана тренировки в дневник одной кнопкой
 * - Мод "Строгий тренер" / "Мягкий тренер" / "Наставник"
 * - Быстрые шаблоны запросов
 * - Индикатор токенов / лимита истории
 */

'use strict';

/* Аварийная заглушка: если AppStorage не определён в других модулях,
   используем прямую обёртку над localStorage, чтобы чат не падал. */
if (typeof AppStorage === 'undefined') {
  window.AppStorage = {
    getItem: function(k) { try { return localStorage.getItem(k); } catch(e) { return null; } },
    setItem: function(k, v) { try { localStorage.setItem(k, v); } catch(e) {} }
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
var aiCoachPersonality = 'balanced'; // 'strict' | 'balanced' | 'mentor'
var aiStreamingEnabled = true;
var lastAiPlanText = ''; // текст последнего AI-плана — для кнопки «Сохранить в дневник»

var PERSONALITY_PROMPTS = {
  strict: 'Ты строгий, требовательный тренер. Не терпишь отговорок. Мотивируешь жёстко, но честно. Иногда немного подтруниваешь, чтобы встряхнуть пользователя.',
  balanced: 'Ты профессиональный фитнес-тренер с отличным чувством юмора. Мотивируешь, поддерживаешь, но говоришь прямо если видишь проблему.',
  mentor: 'Ты терпеливый наставник и нутрициолог. Объясняешь науку, даёшь развёрнутые ответы, радуешься каждому прогрессу пользователя.'
};

var QUICK_REPLY_SETS = {
  greeting: ['Составь план на неделю', 'Что поесть перед тренировкой?', 'Как ускорить прогресс?'],
  workout:  ['Добавить в дневник', 'Сделай легче', 'Объясни технику', 'Альтернативные упражнения'],
  nutrition:['Рассчитай макросы', 'Что лучше до/после тренировки?', 'Список продуктов на неделю'],
  progress: ['Что не так в моём прогрессе?', 'Когда ждать результатов?', 'Плато — что делать?'],
  generic:  ['Расскажи подробнее', 'Дай пример', 'Почему это важно?', 'Что делать дальше?']
};

/* ══════════════════════════════════════════════════════════════
   UTILITY FUNCTIONS
══════════════════════════════════════════════════════════════ */

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Renders markdown-like syntax to HTML
 * Supports: **bold**, *italic*, # headings, - lists, numbered lists, `code`, > blockquote
 */
function renderMarkdown(text) {
  if (!text) return '';
  var s = escapeHtml(String(text));

  // Code blocks (```...```)
  s = s.replace(/```([\s\S]*?)```/g, function(_, code) {
    return '<pre class="ai-code-block"><code>' + code.trim() + '</code></pre>';
  });
  // Inline code
  s = s.replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>');

  // Headings
  s = s.replace(/^### (.+)$/gm, '<div class="ai-h3">$1</div>');
  s = s.replace(/^## (.+)$/gm, '<div class="ai-h2">$1</div>');
  s = s.replace(/^# (.+)$/gm, '<div class="ai-h1">$1</div>');

  // Bold + italic
  s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^\s*][^*]*?)\*/g, '<em>$1</em>');

  // Blockquote
  s = s.replace(/^&gt; (.+)$/gm, '<div class="ai-quote">$1</div>');

  // Horizontal rule
  s = s.replace(/^---$/gm, '<hr class="ai-hr">');

  // Emoji bullet enhancement
  s = s.replace(/^(✅|🔥|💪|⚡|🎯|📌|❌|✨|🏋️|🥗|💤|🧠|⚠️) (.+)$/gm,
    '<div class="ai-emoji-line"><span class="ai-emoji-icon">$1</span><span>$2</span></div>');

  // Unordered lists
  s = s.replace(/((?:^[-•] .+\n?)+)/gm, function(block) {
    var items = block.trim().split('\n').map(function(line) {
      return '<li>' + line.replace(/^[-•] /, '') + '</li>';
    }).join('');
    return '<ul class="ai-list">' + items + '</ul>';
  });

  // Ordered lists
  s = s.replace(/((?:^\d+\. .+\n?)+)/gm, function(block) {
    var items = block.trim().split('\n').map(function(line) {
      return '<li>' + line.replace(/^\d+\. /, '') + '</li>';
    }).join('');
    return '<ol class="ai-list ai-list-num">' + items + '</ol>';
  });

  // Line breaks
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
        try { return JSON.parse(clean.slice(start, i + 1)); }
        catch (e) { return null; }
      }
    }
  }
  return null;
}

function getProfile() {
  try { return JSON.parse(AppStorage.getItem('fs-profile') || '{}'); }
  catch(e) { return {}; }
}

function getTodayNutr() {
  try {
    var entries = JSON.parse(AppStorage.getItem('fs-nutrition') || '[]');
    var today = new Date().toLocaleDateString('ru-RU');
    var todayE = entries.filter(function(e) { return e.date === today; });
    var totals = todayE.reduce(function(a, e) {
      return { kcal: a.kcal + (e.kcal||0), protein: a.protein + (e.protein||0),
               carbs: a.carbs + (e.carbs||0), fat: a.fat + (e.fat||0) };
    }, { kcal:0, protein:0, carbs:0, fat:0 });
    return totals;
  } catch(e) { return null; }
}

function getRecentWorkouts() {
  try {
    var diary = JSON.parse(AppStorage.getItem('fs-diary') || '[]');
    return diary.slice(-5).reverse();
  } catch(e) { return []; }
}

function getWaterToday() {
  try {
    var w = JSON.parse(AppStorage.getItem('fs-water') || '{}');
    return w.amount || 0;
  } catch(e) { return 0; }
}

/* ══════════════════════════════════════════════════════════════
   API CALL
══════════════════════════════════════════════════════════════ */

async function callGroq(key, sys, msgs, max) {
  // AbortSignal.timeout недоступен в старых Safari/Firefox — заменяем на
  // AbortController + setTimeout (совместимо везде).
  var controller = typeof AbortController === 'function' ? new AbortController() : null;
  var timeoutId = controller ? setTimeout(function() { controller.abort(); }, 35000) : null;
  try {
    var r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: sys }].concat(msgs || []),
        max_tokens: max || 1400,
        temperature: 0.65
      }),
      signal: controller ? controller.signal : undefined
    });
    if (!r.ok) throw new Error('Groq ' + r.status);
    var d = await r.json();
    return d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content || '';
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/* ══════════════════════════════════════════════════════════════
   SYSTEM PROMPT BUILDER
══════════════════════════════════════════════════════════════ */

function buildSystemPrompt() {
  var pr = getProfile();
  var nutr = getTodayNutr();
  var workouts = getRecentWorkouts();
  var water = getWaterToday();
  var personality = PERSONALITY_PROMPTS[aiCoachPersonality] || PERSONALITY_PROMPTS.balanced;

  var profileBlock = '';
  if (pr && pr.name) {
    profileBlock = [
      '=== ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ ===',
      'Имя: ' + (pr.name || 'не указано'),
      'Пол: ' + (pr.gender === 'male' ? 'мужской' : pr.gender === 'female' ? 'женский' : 'не указан'),
      'Возраст: ' + (pr.age || '?') + ' лет',
      'Вес: ' + (pr.weight || '?') + ' кг',
      'Рост: ' + (pr.height || '?') + ' см',
      'Цель: ' + (pr.goal === 'loss' ? 'похудение' : pr.goal === 'gain' ? 'набор массы' : 'поддержание формы'),
      'Активность: ' + (pr.activity || '1.55'),
      'Уровень подготовки: ' + (aiLevel || pr.level || 'не указан'),
      'Стиль тренировок: ' + aiStyle,
      'Интенсивность: ' + aiIntensity,
      'Оборудование: ' + (aiEquip.length ? aiEquip.join(', ') : 'без оборудования'),
    ].join('\n');
  }

  var nutritionBlock = '';
  if (nutr && nutr.kcal > 0) {
    nutritionBlock = [
      '=== ПИТАНИЕ СЕГОДНЯ ===',
      'Калории: ' + Math.round(nutr.kcal) + ' ккал',
      'Белок: ' + Math.round(nutr.protein) + ' г',
      'Жиры: ' + Math.round(nutr.fat) + ' г',
      'Углеводы: ' + Math.round(nutr.carbs) + ' г',
      'Вода: ' + Math.round(water) + ' мл',
    ].join('\n');
  }

  var workoutBlock = '';
  if (workouts && workouts.length) {
    workoutBlock = '=== ПОСЛЕДНИЕ ТРЕНИРОВКИ ===\n' +
      workouts.slice(0,3).map(function(w) {
        return '• ' + (w.date||'') + ' — ' + (w.type||w.name||'тренировка') +
          (w.kcal ? ' (' + w.kcal + ' ккал)' : '');
      }).join('\n');
  }

  return [
    'Ты персональный AI-тренер по фитнесу и нутрициологии в приложении FitSim.',
    personality,
    'Отвечай на русском языке. Используй эмодзи умеренно. Форматируй текст с **жирным**, списками и заголовками для лучшей читаемости.',
    'Будь конкретным: называй упражнения, веса, подходы, граммы продуктов.',
    'Если пользователь просит план тренировки, структурируй его по дням недели.',
    '',
    profileBlock,
    nutritionBlock,
    workoutBlock,
    '',
    'Всегда учитывай данные пользователя при ответах. Не придумывай данные если их нет — попроси уточнить.',
  ].filter(Boolean).join('\n');
}

/* ══════════════════════════════════════════════════════════════
   CHAT PERSISTENCE
══════════════════════════════════════════════════════════════ */

function persistChatHistory() {
  try { AppStorage.setItem('fs-ai-chat-history', JSON.stringify(aiChatHistory.slice(-50))); }
  catch (e) {}
}

function restoreChatHistory() {
  try {
    aiChatHistory = JSON.parse(AppStorage.getItem('fs-ai-chat-history') || '[]');
  } catch (e) {
    aiChatHistory = [];
  }
}

/* ══════════════════════════════════════════════════════════════
   UI — MESSAGE RENDERING
══════════════════════════════════════════════════════════════ */

function appendMsg(role, text, opts) {
  opts = opts || {};
  var msgs = document.getElementById('ai-chat-msgs');
  if (!msgs) return;

  var msgId = 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2);

  var wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;' +
    (role === 'user' ? 'align-items:flex-end;' : 'align-items:flex-start;');

  var bubble = document.createElement('div');
  bubble.id = msgId;
  bubble.className = 'ai-bubble ai-bubble-' + role;
  bubble.innerHTML = role === 'ai' ? renderMarkdown(text) : escapeHtml(String(text || ''));
  wrap.appendChild(bubble);

  // Reaction bar for AI messages
  if (role === 'ai' && !opts.noReactions) {
    var reactionBar = document.createElement('div');
    reactionBar.className = 'ai-reaction-bar';
    reactionBar.innerHTML =
      '<button class="ai-reaction-btn" onclick="aiReact(\'' + msgId + '\',1)" title="Полезно">👍</button>' +
      '<button class="ai-reaction-btn" onclick="aiReact(\'' + msgId + '\',0)" title="Не то">👎</button>' +
      '<button class="ai-reaction-btn ai-copy-btn" onclick="aiCopyMsg(\'' + msgId + '\')" title="Копировать">📋</button>';
    wrap.appendChild(reactionBar);

    // Quick reply chips
    if (opts.quickReplies && opts.quickReplies.length) {
      var chipsWrap = document.createElement('div');
      chipsWrap.className = 'ai-qr-wrap';
      opts.quickReplies.forEach(function(qr) {
        var chip = document.createElement('button');
        chip.className = 'ai-qr-chip';
        chip.textContent = qr;
        chip.onclick = function() {
          chipsWrap.remove();
          sendAiMessage(qr);
        };
        chipsWrap.appendChild(chip);
      });
      wrap.appendChild(chipsWrap);
    }
  }

  msgs.appendChild(wrap);
  msgs.scrollTop = msgs.scrollHeight;
  return msgId;
}

/**
 * Simulates streaming: renders text character by character
 */
function streamText(elementId, text, onDone) {
  var el = document.getElementById(elementId);
  if (!el || !aiStreamingEnabled) {
    if (el) el.innerHTML = renderMarkdown(text);
    if (onDone) onDone();
    return;
  }
  var i = 0;
  var speed = Math.max(8, Math.min(25, Math.round(8000 / text.length))); // adapt speed
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
    // Render in chunks of 3 chars for performance
    partial += text.slice(i, i + 3);
    i += 3;
    // Simple partial markdown (only line breaks during streaming)
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
      : '<span style="font-size:13px;color:var(--text-light)">👎 Учту это</span>';
  }
  // Could log to analytics
}
window.aiReact = aiReact;

function aiCopyMsg(msgId) {
  var el = document.getElementById(msgId);
  if (!el) return;
  var text = el.innerText || el.textContent;
  navigator.clipboard && navigator.clipboard.writeText(text).then(function() {
    if (typeof toast === 'function') toast('Скопировано! 📋');
  });
}
window.aiCopyMsg = aiCopyMsg;

/* ══════════════════════════════════════════════════════════════
   DETECT TOPIC & QUICK REPLIES
══════════════════════════════════════════════════════════════ */

function detectTopic(text) {
  var t = text.toLowerCase();
  if (/трениров|упражн|жим|присед|становая|подтягив|план|программ/.test(t)) return 'workout';
  if (/ед|питан|калор|белок|протеин|ужин|завтрак|обед|рецепт|макр/.test(t)) return 'nutrition';
  if (/прогресс|результат|плато|не похуд|не расту|застой/.test(t)) return 'progress';
  return 'generic';
}

function getQuickReplies(responseText, userMsg) {
  var topic = detectTopic(userMsg + ' ' + (responseText || ''));
  return QUICK_REPLY_SETS[topic] || QUICK_REPLY_SETS.generic;
}

/* ══════════════════════════════════════════════════════════════
   DETECT WORKOUT PLAN IN RESPONSE
══════════════════════════════════════════════════════════════ */

function detectWorkoutPlan(text) {
  // Returns structured plan if detectable
  var t = text || '';
  var days = [];
  // Pattern: День 1 / Понедельник / Monday
  var dayPattern = /(?:день|day|понедельник|вторник|среда|четверг|пятница|суббота|воскресенье)[^\n]*/gi;
  var matches = t.match(dayPattern);
  if (matches && matches.length >= 2) return true;
  return false;
}

function renderExportButton(planText) {
  return '<button class="ai-export-btn" onclick="aiExportPlanToDiary(this)" ' +
    'data-plan="' + escapeHtml(planText) + '">' +
    '📅 Добавить в дневник</button>';
}

window.aiExportPlanToDiary = function(btn) {
  // Save plan as a diary entry — сохраняем сам текст плана, а не заглушку.
  // Приоритет: data-plan кнопки -> последний сгенерированный план.
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
    if (typeof toast === 'function') toast('План сохранён в дневник! 📅');
  } catch(e) {
    if (typeof toast === 'function') toast('Не удалось сохранить план в дневник');
  }
};

/* ══════════════════════════════════════════════════════════════
   MAIN SEND FUNCTION
══════════════════════════════════════════════════════════════ */

async function sendAiMessage(text) {
  if (!text) {
    var inp = document.getElementById('ai-input');
    if (!inp) return;
    text = inp.value.trim();
    if (!text) return;
    inp.value = '';
  }

  var key = AppStorage.getItem('fs-groq-key') || '';
  if (!key) {
    appendMsg('ai', '⚠️ Введи Groq API ключ в настройках профиля чтобы использовать AI-тренера.', { noReactions: true });
    return;
  }
  if (generating) return;

  // Remove all quick-reply chip sets
  document.querySelectorAll('.ai-qr-wrap').forEach(function(el) { el.remove(); });

  appendMsg('user', text);
  aiChatHistory.push({ role: 'user', content: text });
  persistChatHistory();

  generating = true;
  updateSendBtn(true);

  var typingId = 'typing-' + Date.now();
  appendTyping(typingId, 'Думаю...');

  // Animated thinking phases
  var phases = ['Анализирую данные...', 'Составляю ответ...', 'Почти готово...'];
  var phaseIdx = 0;
  var phaseTimer = setInterval(function() {
    phaseIdx = (phaseIdx + 1) % phases.length;
    updateTypingPhase(typingId, phases[phaseIdx]);
  }, 1800);

  try {
    var sys = buildSystemPrompt();
    var msgs = aiChatHistory.slice(-20); // keep last 20 for context
    var reply = await callGroq(key, sys, msgs, 1400);

    clearInterval(phaseTimer);
    var typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();

    aiChatHistory.push({ role: 'assistant', content: reply });
    persistChatHistory();
    updateMsgCounter();

    var qr = getQuickReplies(reply, text);
    var msgId = appendMsg('ai', '', { quickReplies: qr });

    // Stream the text
    streamText(msgId, reply, function() {
      // Add export button if plan detected
      if (detectWorkoutPlan(reply)) {
        lastAiPlanText = reply;
        var el = document.getElementById(msgId);
        if (el) {
          var exportBtn = document.createElement('div');
          exportBtn.style.marginTop = '8px';
          exportBtn.innerHTML = '<button class="ai-export-btn" onclick="aiExportPlanToDiary(this)" data-plan="' + escapeHtml(reply) + '">📅 Сохранить план в дневник</button>';
          el.parentNode.insertBefore(exportBtn, el.nextSibling);
        }
      }
    });

    lastTopic = detectTopic(text);

  } catch (err) {
    clearInterval(phaseTimer);
    var typingElErr = document.getElementById(typingId);
    if (typingElErr) typingElErr.remove();
    var errMsg = err.message || 'Ошибка';
    if (errMsg.includes('401')) errMsg = 'Неверный API ключ. Проверь ключ в настройках.';
    else if (errMsg.includes('429')) errMsg = 'Превышен лимит запросов. Попробуй через минуту.';
    else if (errMsg.includes('timeout')) errMsg = 'Сервер не отвечает. Попробуй ещё раз.';
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
  btn.disabled = busy;
  btn.innerHTML = busy
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
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
   CLEAR HISTORY
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
  var greetings = [
    'Привет' + name + '! 💪 Готов помочь с тренировками и питанием. С чего начнём?',
    'Здравствуй' + name + '! 🔥 Я твой AI-тренер. Задай любой вопрос — составлю план, разберу технику или посчитаю макросы.',
    'Снова в деле' + name + '! ⚡ Что сегодня — тренировка, питание или анализ прогресса?',
  ];
  var msg = greetings[Math.floor(Math.random() * greetings.length)];
  appendMsg('ai', msg, { quickReplies: QUICK_REPLY_SETS.greeting, noReactions: true });
}

/* ══════════════════════════════════════════════════════════════
   PERSONALITY SWITCHER
══════════════════════════════════════════════════════════════ */

function setAiPersonality(p) {
  aiCoachPersonality = p;
  AppStorage.setItem('fs-ai-personality', p);
  document.querySelectorAll('.ai-personality-btn').forEach(function(btn) {
    btn.classList.toggle('ai-personality-active', btn.dataset.p === p);
  });
  var names = { strict: 'Строгий тренер', balanced: 'Профессионал', mentor: 'Наставник' };
  if (typeof toast === 'function') toast('Режим: ' + (names[p] || p));
}
window.setAiPersonality = setAiPersonality;

/* ══════════════════════════════════════════════════════════════
   VOICE INPUT
══════════════════════════════════════════════════════════════ */

var aiVoiceRecognition = null;
var aiVoiceActive = false;

function startAiVoice() {
  var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    if (typeof toast === 'function') toast('Голосовой ввод не поддерживается');
    return;
  }
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

  aiVoiceRecognition.onresult = function(e) {
    var transcript = e.results[0][0].transcript;
    var inp = document.getElementById('ai-input');
    if (inp) inp.value = transcript;
    sendAiMessage(transcript);
  };
  aiVoiceRecognition.onend = function() {
    aiVoiceActive = false;
    var voiceBtn = document.getElementById('ai-voice-btn');
    if (voiceBtn) voiceBtn.classList.remove('listening');
  };
  aiVoiceRecognition.onerror = function() {
    aiVoiceActive = false;
    var voiceBtn = document.getElementById('ai-voice-btn');
    if (voiceBtn) voiceBtn.classList.remove('listening');
  };
  aiVoiceRecognition.start();
}
window.startAiVoice = startAiVoice;

/* ══════════════════════════════════════════════════════════════
   WORKOUT PLAN GENERATOR (structured JSON)
══════════════════════════════════════════════════════════════ */

async function generateWorkoutPlan() {
  var key = AppStorage.getItem('fs-groq-key') || '';
  if (!key) {
    appendMsg('ai', '⚠️ Добавь Groq API ключ чтобы генерировать планы.', { noReactions: true });
    return;
  }
  if (generating) return;

  generating = true;
  updateSendBtn(true);
  var typingId = 'typing-plan-' + Date.now();
  appendTyping(typingId, 'Составляю план тренировок...');

  var phases = ['Подбираю упражнения...', 'Рассчитываю объём...', 'Финальная настройка...'];
  var phaseIdx = 0;
  var phaseTimer = setInterval(function() {
    phaseIdx = (phaseIdx + 1) % phases.length;
    updateTypingPhase(typingId, phases[phaseIdx]);
  }, 2000);

  try {
    var pr = getProfile();
    var sys = buildSystemPrompt();
    var prompt = 'Составь детальный недельный план тренировок. ' +
      'Стиль: ' + aiStyle + ', Интенсивность: ' + aiIntensity + '. ' +
      'Для каждого дня укажи: название, упражнения с подходами/повторами/весами. ' +
      'Используй Markdown форматирование. Сделай план практичным и реалистичным.';

    var reply = await callGroq(key, sys, [{ role: 'user', content: prompt }], 2000);

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
    streamText(msgId, reply, function() {
      lastAiPlanText = reply;
      var el = document.getElementById(msgId);
      if (el) {
        var exportBtn = document.createElement('div');
        exportBtn.style.marginTop = '8px';
        exportBtn.innerHTML = '<button class="ai-export-btn" onclick="aiExportPlanToDiary(this)" data-plan="' + escapeHtml(reply) + '">📅 Сохранить план в дневник</button>';
        el.parentNode.insertBefore(exportBtn, el.nextSibling);
      }
    });

    lastPlanParams = { style: aiStyle, intensity: aiIntensity };

  } catch(err) {
    clearInterval(phaseTimer);
    var typingElErr = document.getElementById(typingId);
    if (typingElErr) typingElErr.remove();
    appendMsg('ai', '❌ Не удалось сгенерировать план: ' + (err.message || ''), { noReactions: true });
  } finally {
    generating = false;
    updateSendBtn(false);
  }
}
window.generateWorkoutPlan = generateWorkoutPlan;

/* ══════════════════════════════════════════════════════════════
   NUTRITION ANALYSIS
══════════════════════════════════════════════════════════════ */

async function analyzeNutrition() {
  var key = AppStorage.getItem('fs-groq-key') || '';
  if (!key) return;
  if (generating) return;

  var nutr = getTodayNutr();
  if (!nutr || nutr.kcal === 0) {
    appendMsg('ai', '📊 Сегодня питание ещё не записано. Добавь приёмы пищи в раздел Питание, и я проанализирую твой рацион.', {
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
    var prompt = 'Проанализируй моё питание за сегодня. Дай конкретные рекомендации что улучшить: ' +
      'что добавить, что убрать, когда есть. Будь конкретен с граммами и продуктами.';

    var reply = await callGroq(key, sys, [{ role: 'user', content: prompt }], 1200);

    var typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();

    aiChatHistory.push({ role: 'user', content: prompt });
    aiChatHistory.push({ role: 'assistant', content: reply });
    persistChatHistory();
    updateMsgCounter();

    var msgId = appendMsg('ai', '', {
      quickReplies: ['Список продуктов на неделю', 'Что приготовить на ужин?', 'Рецепты с высоким белком']
    });
    streamText(msgId, reply);

  } catch(err) {
    var typingElErr = document.getElementById(typingId);
    if (typingElErr) typingElErr.remove();
    appendMsg('ai', '❌ Ошибка анализа: ' + (err.message || ''), { noReactions: true });
  } finally {
    generating = false;
    updateSendBtn(false);
  }
}
window.analyzeNutrition = analyzeNutrition;

/* ══════════════════════════════════════════════════════════════
   PROGRESS ANALYSIS
══════════════════════════════════════════════════════════════ */

async function analyzeProgress() {
  var key = AppStorage.getItem('fs-groq-key') || '';
  if (!key) return;
  if (generating) return;

  generating = true;
  updateSendBtn(true);
  var typingId = 'typing-prog-' + Date.now();
  appendTyping(typingId, 'Анализирую прогресс...');

  try {
    var sys = buildSystemPrompt();
    var workouts = getRecentWorkouts();
    var prompt = 'Проанализируй мой прогресс на основе данных профиля и последних тренировок. ' +
      'Что идёт хорошо? Где есть проблемы? Что нужно изменить для лучших результатов? ' +
      'Дай 3-5 конкретных действий которые я могу сделать сегодня.';

    var reply = await callGroq(key, sys, [{ role: 'user', content: prompt }], 1200);

    var typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();

    aiChatHistory.push({ role: 'user', content: prompt });
    aiChatHistory.push({ role: 'assistant', content: reply });
    persistChatHistory();
    updateMsgCounter();

    var msgId = appendMsg('ai', '', {
      quickReplies: ['Как выйти из плато?', 'Оптимальное время тренировок', 'Нужен ли мне отдых?']
    });
    streamText(msgId, reply);

  } catch(err) {
    var typingElErr = document.getElementById(typingId);
    if (typingElErr) typingElErr.remove();
    appendMsg('ai', '❌ ' + (err.message || ''), { noReactions: true });
  } finally {
    generating = false;
    updateSendBtn(false);
  }
}
window.analyzeProgress = analyzeProgress;

/* ══════════════════════════════════════════════════════════════
   INIT PAGE
══════════════════════════════════════════════════════════════ */


// ── Save Groq API Key ─────────────────────────────────────
function saveGroqKey() {
  var inp = document.getElementById('ai-groq-key-input');
  var statusEl = document.getElementById('ai-key-status');
  if (!inp) return;
  var key = inp.value.trim();
  if (!key) {
    if (statusEl) { statusEl.textContent = '⚠️ Введи ключ перед сохранением'; statusEl.style.color = '#f97316'; }
    return;
  }
  try {
    AppStorage.setItem('fs-groq-key', key);
  } catch(e) {}
  // Mask the input
  inp.type = 'password';
  if (statusEl) {
    statusEl.innerHTML = '✅ Ключ сохранён — AI-тренер готов к работе';
    statusEl.style.color = '#22c55e';
    setTimeout(function(){ statusEl.textContent = ''; }, 3000);
  }
  toast('✅ API ключ сохранён!');   // <--- ИСПРАВЛЕНО: было showToast
}

function initAiPage() {
  restoreChatHistory();
  // Restore saved API key into input
  try {
    var savedKey = AppStorage.getItem('fs-groq-key') || '';
    var keyInp = document.getElementById('ai-groq-key-input');
    var keyStatus = document.getElementById('ai-key-status');
    if (keyInp && savedKey) {
      keyInp.value = savedKey;
      if (keyStatus) {
        keyStatus.innerHTML = '✅ Ключ сохранён';
        keyStatus.style.color = '#22c55e';
      }
    }
  } catch(e) {}


  // Restore personality
  try {
    var saved = AppStorage.getItem('fs-ai-personality');
    if (saved) aiCoachPersonality = saved;
  } catch(e) {}

  // Set personality button states
  document.querySelectorAll('.ai-personality-btn').forEach(function(btn) {
    btn.classList.toggle('ai-personality-active', btn.dataset.p === aiCoachPersonality);
  });

  var msgs = document.getElementById('ai-chat-msgs');
  if (!msgs) return;

  updateMsgCounter();

  // Restore previous messages
  if (aiChatHistory.length > 0) {
    msgs.innerHTML = '';
    aiChatHistory.forEach(function(m) {
      if (m.role === 'user') {
        appendMsg('user', m.content);
      } else if (m.role === 'assistant') {
        appendMsg('ai', m.content, { noReactions: true });
      }
    });
  } else {
    msgs.innerHTML = '';
    showWelcomeMessage();
  }

  // Input enter handler
  var inp = document.getElementById('ai-input');
  if (inp) {
    inp.onkeydown = function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendAiMessage();
      }
    };
    // Auto-resize textarea
    inp.oninput = function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    };
  }

  chatReady = true;
}
window.initAiPage = initAiPage;

/* ══════════════════════════════════════════════════════════════
   EQUIPMENT & SETTINGS HELPERS
══════════════════════════════════════════════════════════════ */

function toggleEquip(e) {
  var v = e.dataset.v;
  if (!v) return;
  e.classList.toggle('ai-chip-active');
  if (aiEquip.indexOf(v) > -1) {
    aiEquip = aiEquip.filter(function(x) { return x !== v; });
  } else {
    aiEquip.push(v);
  }
}
window.toggleEquip = toggleEquip;

function setAiGoal(v) {
  aiGoal = v;
  document.querySelectorAll('[data-goal]').forEach(function(el) {
    el.classList.toggle('ai-chip-active', el.dataset.goal === v);
  });
}
window.setAiGoal = setAiGoal;

function setAiLevel(v) {
  aiLevel = v;
  document.querySelectorAll('[data-level]').forEach(function(el) {
    el.classList.toggle('ai-chip-active', el.dataset.level === v);
  });
}
window.setAiLevel = setAiLevel;

function setAiStyle(v) {
  aiStyle = v;
  document.querySelectorAll('[data-style]').forEach(function(el) {
    el.classList.toggle('ai-chip-active', el.dataset.style === v);
  });
}
window.setAiStyle = setAiStyle;

function setAiIntensity(v) {
  aiIntensity = v;
  document.querySelectorAll('[data-intensity]').forEach(function(el) {
    el.classList.toggle('ai-chip-active', el.dataset.intensity === v);
  });
}
window.setAiIntensity = setAiIntensity;

/* ══════════════════════════════════════════════════════════════
   STREAMING TOGGLE
══════════════════════════════════════════════════════════════ */

function toggleStreaming() {
  aiStreamingEnabled = !aiStreamingEnabled;
  var btn = document.getElementById('ai-stream-toggle');
  if (btn) btn.textContent = aiStreamingEnabled ? '⚡ Анимация: вкл' : '⚡ Анимация: выкл';
}
window.toggleStreaming = toggleStreaming;


/* ══════════════════════════════════════════════════════════════
   AI+: ИИ привязан к данным приложения
   - «Режим тренера» и «Настройки AI-тренера» убраны, всё берётся из профиля
   - Сводка за 14 дней: тренировки, питание, вода, вес, талия, чек-ины
   - Карточка «Чек-ин на сегодня»: сон, энергия, заметка
   - Карточка «Подключение ИИ-тренера»: 3 простых шага получения ключа
═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.fsAiPlus) return;
  window.fsAiPlus = true;

  /* Таймаут fetch для старых Safari / Firefox */
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout !== 'function') {
    AbortSignal.timeout = function (ms) {
      var c = new AbortController();
      setTimeout(function () { c.abort(); }, ms);
      return c.signal;
    };
  }

  /* ── Утилиты ── */
  function pad(n) { return String(n).padStart(2, '0'); }
  function todayISO() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addDaysISO(iso, n) { var d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function isoToRu(iso) { return iso.split('-').reverse().join('.'); }
  function dateKey(v) {
    var s = String(v || '').split(',')[0].trim();
    var m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (m) return m[3] + '-' + pad(Number(m[2])) + '-' + pad(Number(m[1]));
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return '';
  }
  function daysBetween(a, b) { return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000); }
  function readJSON(key, fb) { try { var v = JSON.parse(localStorage.getItem(key) || 'null'); return v || fb; } catch (e) { return fb; } }
  function fmt(n) { return Number(n).toLocaleString('ru-RU'); }
  function escAttr(s) { return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

  var GROUP_RU = { chest: 'Грудь', back: 'Спина', legs: 'Ноги', glutes: 'Ягодицы', shoulders: 'Плечи',
    biceps: 'Бицепс', triceps: 'Трицепс', abs: 'Пресс', forearms: 'Предплечья', arms: 'Руки', cardio: 'Кардио' };

  function profileGoal(P) {
    var g = String((P && P.goal) || '').toLowerCase();
    if (g.indexOf('масс') > -1 || g.indexOf('набор') > -1 || g === 'gain') return 'gain';
    if (g.indexOf('похуд') > -1 || g.indexOf('сниж') > -1 || g === 'loss') return 'loss';
    return 'maintain';
  }
  function goalRu(g) { return g === 'gain' ? 'набор массы' : g === 'loss' ? 'похудение' : 'поддержание веса'; }
  function levelRu(P) {
    var exp = String((P && P.exp) || '').toLowerCase();
    if (exp.indexOf('нович') === 0) return 'новичок';
    if (exp.indexOf('до 1') > -1) return 'начинающий (до 1 года)';
    if (exp.indexOf('1') === 0 || exp.indexOf('2') === 0) return 'средний (1-3 года)';
    return 'опытный (3+ года)';
  }
  function dailyTarget(P) {
    P = P || {};
    var w = Number(P.weight) || 70, h = Number(P.height) || 175, a = Number(P.age) || 30;
    var bmr = (P.gender === 'female' ? -161 : 5) + 10 * w + 6.25 * h - 5 * a;
    var tdee = bmr * (parseFloat(P.activity) || 1.55);
    var g = profileGoal(P);
    if (g === 'loss') tdee *= 0.85;
    if (g === 'gain') tdee *= 1.12;
    return Math.round(tdee / 10) * 10;
  }
  function proteinTarget(P) {
    var w = Number(P.weight) || 70;
    return Math.round((profileGoal(P) === 'gain' ? 2 : 1.6) * w);
  }

  /* ── Сводка за 14 дней ── */
  function buildUserContext() {
    var P = getProfile() || {};
    var today = todayISO(), from = addDaysISO(today, -13);
    var L = [];
    L.push('ПРОФИЛЬ: имя ' + (P.name || 'не указано') + '; цель: ' + goalRu(profileGoal(P)) +
      '; целевой вес: ' + (P.target ? P.target + ' кг' : 'не указан') +
      '; стаж: ' + levelRu(P) + '; вес ' + (P.weight || '?') + ' кг, рост ' + (P.height || '?') + ' см');
    if (Array.isArray(P.dietPrefs) && P.dietPrefs.length) L.push('Предпочтения в еде: ' + P.dietPrefs.join(', '));

    var diary = readJSON('fs-diary', []);
    var wos = diary.filter(function (e) { var k = dateKey(e.date); return k && k >= from && k <= today; });
    L.push('');
    L.push('ТРЕНИРОВКИ (14 дней): всего ' + wos.length);
    if (wos.length) {
      var groups = {}, names = {}, rpes = [];
      wos.forEach(function (e) {
        var det = Array.isArray(e.exerciseDetails) ? e.exerciseDetails : [];
        if (det.length) {
          det.forEach(function (x) {
            var nm = x.name || x.n || '';
            if (nm) names[nm] = (names[nm] || 0) + 1;
            var g = x.category || x.group || '';
            if (g) { g = GROUP_RU[String(g).toLowerCase()] || g; groups[g] = (groups[g] || 0) + 1; }
          });
        } else if (e.exercises) {
          String(e.exercises).split('\n').forEach(function (ln) {
            var nm = String(ln).replace(/[×xX]\s*\d.*$/, '').replace(/^\d+\.\s*/, '').trim();
            if (nm.length > 2) names[nm] = (names[nm] || 0) + 1;
          });
        }
        if (e.feel && e.feel.rpe) rpes.push(Number(e.feel.rpe));
      });
      var gTop = Object.keys(groups).sort(function (a, b) { return groups[b] - groups[a]; });
      L.push('Группы мышц: ' + (gTop.length ? gTop.map(function (g) { return g + ' ' + groups[g] + ' раз'; }).join(', ') : 'не определены'));
      var nTop = Object.keys(names).sort(function (a, b) { return names[b] - names[a]; }).slice(0, 5);
      if (nTop.length) L.push('Частые упражнения: ' + nTop.map(function (n) { return n + ' (х' + names[n] + ')'; }).join(', '));
      if (rpes.length) L.push('Самооценка нагрузки: в среднем ' + (rpes.reduce(function (a, b) { return a + b; }, 0) / rpes.length).toFixed(1) + '/10');
      var gap = daysBetween(dateKey(wos[wos.length - 1].date), today);
      L.push('Последняя тренировка: ' + isoToRu(dateKey(wos[wos.length - 1].date)) + ' (' + gap + ' дн. назад)');
      var dayNames = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
      L.push('Дни тренировок: ' + wos.map(function (e) { var k = dateKey(e.date); return k ? dayNames[new Date(k + 'T00:00:00').getDay()] : '?'; }).join(', '));
    } else {
      L.push('Записей о тренировках за 2 недели нет — предложи начать вести дневник.');
    }

    var nutr = readJSON('fs-nutrition', []);
    var byDay = {}, foods = {};
    nutr.forEach(function (x) {
      var k = dateKey(x.date);
      if (!k || k < from || k > today) return;
      var d = byDay[k] = byDay[k] || { kcal: 0, p: 0 };
      d.kcal += Number(x.kcal) || 0; d.p += Number(x.protein) || 0;
      var items = x.items || x.foods || x.products || [];
      if (Array.isArray(items)) items.forEach(function (it) {
        var nm = (it && (it.n || it.name || it.title)) || '';
        if (nm) foods[nm] = (foods[nm] || 0) + 1;
      });
    });
    L.push('');
    L.push('ПИТАНИЕ (14 дней): дней с записями ' + Object.keys(byDay).length + ' из 14');
    if (Object.keys(byDay).length) {
      var ks = Object.keys(byDay);
      var avgK = ks.reduce(function (s, k) { return s + byDay[k].kcal; }, 0) / ks.length;
      var avgP = ks.reduce(function (s, k) { return s + byDay[k].p; }, 0) / ks.length;
      L.push('Средние калории: ' + Math.round(avgK) + ' ккал/день (норма для цели ~' + dailyTarget(P) + ' ккал)');
      L.push('Средний белок: ' + Math.round(avgP) + ' г/день (ориентир для цели ~' + proteinTarget(P) + ' г)');
      var fTop = Object.keys(foods).sort(function (a, b) { return foods[b] - foods[a]; }).slice(0, 7);
      if (fTop.length) L.push('Частые продукты: ' + fTop.join(', '));
    }

    var wd = readJSON('fs-water-hist', []).filter(function (x) { var k = dateKey(x.date); return k && k >= from && k <= today && Number(x.amount) > 0; });
    if (wd.length) L.push('Вода: в среднем ' + fmt(Math.round(wd.reduce(function (s, x) { return s + Number(x.amount); }, 0) / wd.length)) + ' мл/день (цель ~2000 мл)');

    var wlog = readJSON('fs-wlog', []).filter(function (e) { return Number(e.weight) > 0; })
      .sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
    if (wlog.length) {
      L.push('ВЕС: сейчас ' + fmt(wlog[wlog.length - 1].weight) + ' кг');
      if (wlog.length >= 2) {
        var dW = Math.round((wlog[wlog.length - 1].weight - wlog[wlog.length - 2].weight) * 10) / 10;
        L.push('Динамика веса: ' + (dW > 0 ? '+' : '') + dW.toLocaleString('ru-RU') + ' кг');
      }
    }
    var waist = readJSON('fs-bodylog', []).filter(function (e) { return Number(e.waist) > 0; })
      .sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
    if (waist.length >= 2) {
      var dWa = Math.round((waist[waist.length - 1].waist - waist[waist.length - 2].waist) * 10) / 10;
      L.push('ТАЛИЯ: сейчас ' + fmt(waist[waist.length - 1].waist) + ' см (' + (dWa > 0 ? '+' : '') + dWa.toLocaleString('ru-RU') + ' см)');
    }

    var ci = readJSON('fs-checkins', []).filter(function (x) { var k = dateKey(x.date); return k && k >= addDaysISO(today, -6) && k <= today; });
    if (ci.length) {
      L.push('ЧЕК-ИНЫ (7 дней):');
      ci.forEach(function (x) {
        L.push('• ' + isoToRu(dateKey(x.date)) + ': сон ' + (x.sleep || '?') + ' ч, энергия ' + (x.energy || '?') + '/5' + (x.note ? ', «' + x.note + '»' : ''));
      });
    } else {
      L.push('ЧЕК-ИНЫ: за неделю не заполнены. Если уместно — спроси про сон и самочувствие одним коротким вопросом.');
    }
    return L.join('\n');
  }

  function syncAIParams() {
    var P = getProfile() || {};
    aiGoal = profileGoal(P);
    var exp = String(P.exp || '').toLowerCase();
    aiLevel = (exp.indexOf('нович') === 0 || exp.indexOf('до 1') > -1) ? 'beginner'
      : (exp.indexOf('1') === 0 || exp.indexOf('2') === 0) ? 'intermediate' : 'advanced';
    aiStyle = aiLevel === 'beginner' ? 'fullbody' : 'split';
    aiIntensity = aiLevel === 'beginner' ? 'light' : aiLevel === 'intermediate' ? 'medium' : 'high';
    if (!aiEquip || !aiEquip.length) aiEquip = ['штанга', 'гантели', 'турник', 'тренажёры'];
  }

  /* Новый системный промпт: ИИ видит реальные данные приложения */
  window.buildSystemPrompt = function () {
    syncAIParams();
    return [
      'Ты — AI-тренер по фитнесу и нутрициологии в приложении FitSim.',
      'Отвечай на русском, кратко и по делу, дружелюбно. Форматируй ответ: короткие абзацы, списки, **жирный** для главного.',
      'Ниже — РЕАЛЬНЫЕ данные пользователя из приложения за последние 14 дней. Опирайся только на них, не выдумывай цифры.',
      '',
      '=== ДАННЫЕ ПОЛЬЗОВАТЕЛЯ ===',
      buildUserContext(),
      '',
      '=== КАК ОТВЕЧАТЬ ===',
      '- Ссылайся на конкретные цифры пользователя: сколько тренировок, сколько белка, сколько сна, сколько воды.',
      '- Замечай пробелы под его цель: для набора массы — белок и профицит калорий; для похудения — дефицит и активность; пропуски тренировок; мало воды; мало сна.',
      '- Давай 1-3 конкретных шага на ответ, без лекций.',
      '- Если данных мало — мягко подскажи, что заполнить (дневник, замеры, чек-ин), но всё равно дай полезный ответ.',
      '- Не ставь диагнозы; при боли и плохом самочувствии советуй остановиться и обратиться к врачу.',
      '- Цели и уровень бери только из профиля пользователя, а не из разговоров.'
    ].join('\n');
  };

  /* ── Чек-ин: сон, энергия, заметка ── */
  window.fsSetEnergy = function (el, v) {
    var row = el.parentNode;
    row.querySelectorAll('button').forEach(function (b) { b.classList.remove('fs-ci-active'); });
    el.classList.add('fs-ci-active');
  };
  window.fsSaveCheckin = function () {
    var sl = Number((document.getElementById('fs-ci-sleep') || {}).value) || 0;
    var activeEl = document.querySelector('#fs-checkin-card .fs-ci-active');
    var en = activeEl ? Number(activeEl.dataset.v) : 0;
    var note = ((document.getElementById('fs-ci-note') || {}).value) || '';
    if (!sl && !en) { toast('Укажи хотя бы сон или энергию'); return; }
    var t = todayISO();
    var list = readJSON('fs-checkins', []).filter(function (x) { return dateKey(x.date) !== t; });
    list.push({ date: t, sleep: sl, energy: en, note: String(note).slice(0, 120) });
    localStorage.setItem('fs-checkins', JSON.stringify(list));
    renderCheckin();
    toast('☀️ Чек-ин сохранён');
  };
  function renderCheckin() {
    var shell = document.querySelector('#page-ai .ai-shell');
    if (!shell) return;
    var card = document.getElementById('fs-checkin-card');
    if (!card) {
      card = document.createElement('div');
      card.id = 'fs-checkin-card';
      card.className = 'card';
      var keyCard = document.getElementById('fs-key-card');
      if (keyCard) shell.insertBefore(card, keyCard); else shell.appendChild(card);
    }
    var t = todayISO();
    var cur = readJSON('fs-checkins', []).filter(function (x) { return dateKey(x.date) === t; })[0];
    var chips = '';
    var emo = ['😵', '😕', '🙂', '😀', '🔥'];
    for (var i = 1; i <= 5; i++) {
      chips += '<button type="button" data-v="' + i + '" class="' + (cur && Number(cur.energy) === i ? 'fs-ci-active' : '') + '" onclick="fsSetEnergy(this,' + i + ')">' + emo[i - 1] + '</button>';
    }
    card.innerHTML = '<div class="card-header">☀️ Чек-ин на сегодня</div><div class="card-body">' +
      '<div class="fs-ci-row"><span>Сон, часов</span><input id="fs-ci-sleep" type="number" min="0" max="14" step="0.5" value="' + (cur && cur.sleep ? cur.sleep : '') + '" placeholder="8"></div>' +
      '<div class="fs-ci-row"><span>Энергия</span><div class="fs-ci-emo">' + chips + '</div></div>' +
      '<input id="fs-ci-note" type="text" maxlength="120" placeholder="Как прошёл день (необязательно)" value="' + escAttr(cur ? cur.note : '') + '">' +
      '<button type="button" class="fs-ci-save" onclick="fsSaveCheckin()">' + (cur ? 'Обновить чек-ин' : 'Сохранить чек-ин') + '</button></div>';
  }

  /* ── Чистка карточек: «Режим тренера» и «Настройки AI-тренера» ── */
  function findCardByText(txt) {
    var els = document.querySelectorAll('#page-ai *');
    for (var i = 0; i < els.length; i++) {
      if (els[i].children.length === 0 && els[i].textContent.trim() === txt) {
        var card = els[i].closest('.card');
        if (card) return card;
      }
    }
    return null;
  }
  function cleanupAiCards() {
    /* Режим тренера: сохраняем «Анимация» и «Очистить», карточку убираем */
    var modeCard = findCardByText('Режим тренера');
    if (modeCard) {
      var streamBtn = document.getElementById('ai-stream-toggle');
      var clearBtn = document.getElementById('ai-clear-btn');
      var shell = document.querySelector('#page-ai .ai-shell');
      if (streamBtn && clearBtn && shell) {
        var bar = document.createElement('div');
        bar.className = 'fs-ai-toolbar';
        var chatCard = modeCard.nextElementSibling;
        shell.insertBefore(bar, chatCard || modeCard);
        bar.appendChild(streamBtn);
        bar.appendChild(clearBtn);
      }
      modeCard.remove();
    }
    /* Настройки AI-тренера: остаётся только подключение ключа */
    var setCard = findCardByText('Настройки AI-тренера');
    if (setCard) {
      var keyInp = document.getElementById('ai-groq-key-input');
      var keyStatus = document.getElementById('ai-key-status');
      var saveBtn = null, wrap = keyInp ? keyInp.closest('div') : null;
      setCard.querySelectorAll('button').forEach(function (b) {
        if (b.textContent.indexOf('Сохранить') > -1) saveBtn = b;
      });
      var newCard = document.createElement('div');
      newCard.id = 'fs-key-card';
      newCard.className = 'card';
      newCard.innerHTML = '<div class="card-header">🔗 Подключение ИИ-тренера</div><div class="card-body">' +
        '<div class="fs-key-steps">Подключается один раз, бесплатно:<br>' +
        '1. Открой <a href="https://console.groq.com/keys" target="_blank" rel="noopener">console.groq.com</a><br>' +
        '2. Нажми «Create API Key» и скопируй ключ<br>' +
        '3. Вставь ключ сюда и нажми «Сохранить»</div></div>';
      setCard.parentNode.insertBefore(newCard, setCard);
      var body = newCard.querySelector('.card-body');
      if (wrap && keyInp) body.appendChild(wrap);
      if (keyStatus && keyStatus.parentNode !== body) body.appendChild(keyStatus);
      if (saveBtn && saveBtn.parentNode !== body) body.appendChild(saveBtn);
      setCard.remove();
    }
  }

  /* ── Стили ── */
  function ensureStyle() {
    if (document.getElementById('fs-ai-plus-style')) return;
    var st = document.createElement('style');
    st.id = 'fs-ai-plus-style';
    st.textContent = [
      '.fs-ai-toolbar{display:flex;gap:8px;margin:6px 4px 10px;flex-wrap:wrap}',
      '.fs-ai-toolbar button{padding:8px 14px;border-radius:12px;border:1px solid var(--border);background:var(--card-inner);color:var(--text);font-size:.8rem;cursor:pointer}',
      '.fs-key-steps{font-size:.85rem;color:var(--text-light);line-height:1.7;margin-bottom:10px}',
      '.fs-key-steps a{color:var(--accent);font-weight:600}',
      '.fs-ci-row{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;font-size:.9rem}',
      '.fs-ci-row input{width:90px;padding:8px 10px;border-radius:10px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);text-align:center;font-size:.95rem}',
      '.fs-ci-emo{display:flex;gap:6px}',
      '.fs-ci-emo button{width:38px;height:38px;border-radius:50%;border:1px solid var(--border);background:var(--card-inner);font-size:1rem;cursor:pointer;transition:transform .15s}',
      '.fs-ci-emo button.fs-ci-active{border-color:var(--accent);background:var(--accent);transform:scale(1.1)}',
      '#fs-ci-note{width:100%;margin-bottom:10px;padding:10px 12px;border-radius:12px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:.9rem}',
      '.fs-ci-save{width:100%;padding:12px;border-radius:14px;border:none;background:var(--accent);color:#fff;font-weight:600;font-size:.9rem;cursor:pointer}'
    ].join('\n');
    document.head.appendChild(st);
  }

  ensureStyle();
  var tries = 0;
  (function boot() {
    cleanupAiCards();
    renderCheckin();
    if (++tries < 12) setTimeout(boot, 350);
  })();
  var origInitAi = window.initAiPage;
  if (typeof origInitAi === 'function' && !origInitAi.__fsAiPlus) {
    var wrappedInit = function () { var r = origInitAi.apply(this, arguments); try { renderCheckin(); } catch (e) {} return r; };
    wrappedInit.__fsAiPlus = true;
    window.initAiPage = wrappedInit;
  }
})();
