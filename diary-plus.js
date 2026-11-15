/* diary-plus.js — «Дневник+» для FitSim
   1) Отчёт тренеру  2) Заметка о самочувствии
   3) «Повторить тренировку»  4) Динамика замеров
   Подключать ПОСЛЕДНИМ, после pages.js и ai-couch.js. */
(function () {
  'use strict';
  if (window.fsDiaryPlus) return;
  window.fsDiaryPlus = true;

  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout !== 'function') {
    AbortSignal.timeout = function (ms) {
      var c = new AbortController();
      setTimeout(function () { c.abort(); }, ms);
      return c.signal;
    };
  }

  window.calcWorkoutCalories = function (list) {
    try {
      if (typeof estimateWorkoutCalories === 'function') {
        return Math.round(Number(estimateWorkoutCalories(list || []).kcal) || 0);
      }
    } catch (e) {}
    return 0;
  };

  window.aiExportPlanToDiary = function (btn) {
    var plan = '';
    if (btn && btn.dataset && btn.dataset.plan) plan = btn.dataset.plan;
    if (!plan) {
      var found = document.querySelectorAll('.ai-export-btn[data-plan]');
      if (found.length) plan = found[found.length - 1].getAttribute('data-plan') || '';
    }
    if (!plan) { if (typeof toast === 'function') toast('Сначала сгенерируй план тренировки'); return; }
    try {
      var diary = JSON.parse(localStorage.getItem('fs-diary') || '[]');
      diary.push({
        id: Date.now().toString(),
        date: new Date().toLocaleDateString('ru-RU'),
        type: '📋 AI-план тренировок',
        exercises: plan,
        kcal: 0
      });
      localStorage.setItem('fs-diary', JSON.stringify(diary));
      if (typeof toast === 'function') toast('План сохранён в дневник 📅');
      if (typeof renderDiary === 'function') renderDiary();
      if (typeof renderCalendar === 'function') renderCalendar();
    } catch (e) { if (typeof toast === 'function') toast('Не удалось сохранить план'); }
  };

  var CSS = [
    '.fs-report-card{margin-top:12px}',
    '.fs-report-hint{font-size:.85rem;color:var(--text-light);margin-bottom:10px}',
    '.fs-report-btns{display:flex;gap:8px}',
    '.fs-report-btn{flex:1;padding:12px;border-radius:14px;border:1px solid var(--border);background:var(--card-inner);color:var(--text);font-weight:600;font-size:.9rem;cursor:pointer;transition:transform .15s}',
    '.fs-report-btn:active{transform:scale(.97)}',
    '.fs-report-modal{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:var(--overlay)}',
    '.fs-report-modal-box{background:var(--bg2);border:1px solid var(--border);border-radius:20px;padding:16px;width:min(92vw,480px)}',
    '.fs-report-modal textarea{width:100%;height:220px;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:12px;padding:10px;font-size:.85rem;resize:none;margin-bottom:10px}',
    '.fs-feel-bar{margin:10px 4px;padding:12px;border:1px solid var(--border);border-radius:16px;background:var(--card)}',
    '.fs-feel-title{font-size:.85rem;font-weight:700;color:var(--text-light);margin-bottom:8px}',
    '.fs-feel-chips{display:flex;gap:6px;flex-wrap:wrap}',
    '.fs-feel-chips button{width:34px;height:34px;border-radius:50%;border:1px solid var(--border);background:var(--card-inner);color:var(--text-light);font-size:.85rem;cursor:pointer}',
    '.fs-feel-chips button.active{background:var(--accent);color:#fff;border-color:var(--accent)}',
    '.fs-feel-text{width:100%;margin-top:8px;padding:10px 12px;border-radius:12px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:.9rem}',
    '.fs-body-deltas{margin:10px 0;padding:12px 14px;border:1px solid var(--border);border-radius:16px;background:var(--card)}',
    '.fs-deltas-title{font-size:.75rem;font-weight:700;color:var(--text-light);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}',
    '.fs-delta-row{display:flex;justify-content:space-between;align-items:baseline;padding:3px 0;font-size:.9rem}',
    '.fs-delta-row small{color:var(--text-light)}',
    '.fs-delta-good{color:#34d399;font-weight:600}',
    '.fs-delta-warn{color:#f59e0b;font-weight:600}',
    '.fs-deltas-empty{font-size:.85rem;color:var(--text-light)}',
    '.fs-delta-remind{margin-top:8px;font-size:.8rem;color:var(--text-light)}'
  ].join('\n');

  function ensureStyle() {
    if (document.getElementById('fs-diary-plus-style')) return;
    var st = document.createElement('style');
    st.id = 'fs-diary-plus-style';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

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
  function daysHuman(n) {
    var w = (n % 10 === 1 && n % 100 !== 11) ? 'день' : ((n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? 'дня' : 'дней');
    return n + ' ' + w;
  }
  function fmt(n) { return Number(n).toLocaleString('ru-RU'); }
  function readJSON(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key) || 'null'); return v || fallback; }
    catch (e) { return fallback; }
  }

  /* ── 2. Заметка о самочувствии ── */
  var FEEL_KEY = 'fs-feel-note';
  function getFeel() { return readJSON(FEEL_KEY, {}); }
  window.fsSetRpe = function (i) {
    var s = getFeel(); s.rpe = i;
    localStorage.setItem(FEEL_KEY, JSON.stringify(s));
    ensureFeelBar();
  };
  window.fsSetFeelText = function (v) {
    var s = getFeel(); s.text = String(v || '').slice(0, 200);
    localStorage.setItem(FEEL_KEY, JSON.stringify(s));
  };
  function ensureFeelBar() {
    var host = document.getElementById('wt-execute');
    if (!host) return;
    var bar = document.getElementById('fs-feel-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'fs-feel-bar';
      bar.className = 'fs-feel-bar';
      var chips = '';
      for (var i = 1; i <= 10; i++) chips += '<button type="button" data-rpe="' + i + '" onclick="fsSetRpe(' + i + ')">' + i + '</button>';
      bar.innerHTML = '<div class="fs-feel-title">Как прошла тренировка? <small>(1 — легко, 10 — выжался)</small></div>' +
        '<div class="fs-feel-chips">' + chips + '</div>' +
        '<input id="fs-feel-text" class="fs-feel-text" type="text" maxlength="200" placeholder="Короткая заметка, например: поясница тянулась" oninput="fsSetFeelText(this.value)">';
      var anchor = document.getElementById('execute-buttons');
      if (anchor && anchor.parentNode === host) host.insertBefore(bar, anchor);
      else host.appendChild(bar);
    }
    var st = getFeel();
    bar.querySelectorAll('.fs-feel-chips button').forEach(function (b) {
      b.classList.toggle('active', Number(b.dataset.rpe) === Number(st.rpe));
    });
    var inp = bar.querySelector('#fs-feel-text');
    if (inp && inp.value !== (st.text || '')) inp.value = st.text || '';
    bar.style.display = (typeof customWt !== 'undefined' && customWt && customWt.length) ? '' : 'none';
  }
  function attachNoteToNewEntry(prevIds) {
    var st = getFeel();
    if (!st.rpe && !st.text) return;
    var diary = readJSON('fs-diary', []);
    var fresh = null;
    for (var i = 0; i < diary.length; i++) { if (!prevIds.has(String(diary[i].id))) { fresh = diary[i]; break; } }
    if (!fresh) return;
    fresh.feel = { rpe: st.rpe || null, text: st.text || '' };
    localStorage.setItem('fs-diary', JSON.stringify(diary));
    localStorage.removeItem(FEEL_KEY);
  }
  function wrapSave(fnName) {
    var orig = window[fnName];
    if (typeof orig !== 'function' || orig.__fsPlus) return;
    var wrapped = function () {
      var prevIds = new Set();
      try { readJSON('fs-diary', []).forEach(function (e) { prevIds.add(String(e.id)); }); } catch (e) {}
      var r = orig.apply(this, arguments);
      try { attachNoteToNewEntry(prevIds); } catch (e) {}
      return r;
    };
    wrapped.__fsPlus = true;
    window[fnName] = wrapped;
  }

  /* ── 3. Повторить тренировку ── */
  window.repeatDiaryWorkout = function (id) {
    var entry = null;
    readJSON('fs-diary', []).forEach(function (e) { if (String(e.id) === String(id)) entry = e; });
    if (!entry) { toast('Тренировка не найдена'); return; }
    var details = (Array.isArray(entry.exerciseDetails) && entry.exerciseDetails.length)
      ? entry.exerciseDetails
      : (typeof calendarWorkoutExercises === 'function' ? calendarWorkoutExercises(entry) : []);
    if (!details || !details.length) { toast('У этой записи нет сохранённых упражнений'); return; }
    customWt = details.map(function (ex) {
      var sets = (Array.isArray(ex.sets) ? ex.sets : []).map(function (s) {
        return { r: Number(s.r) || 0, kg: Number(s.kg) || 0, done: false };
      });
      if (!sets.length) sets = [{ r: Number(ex.r) || 0, kg: Number(ex.kg) || 0, done: false }];
      return {
        n: ex.name || ex.n || 'Упражнение',
        name: ex.name || ex.n || '',
        category: ex.category || '',
        s: sets.length,
        r: Number(sets[0].r) || 0,
        kg: Number(sets[0].kg) || 0,
        sets_data: sets,
        done: false
      };
    });
    workoutDateISO = todayISO();
    currentWtScreen = 'execute';
    if (typeof clearWorkoutFlowState === 'function') clearWorkoutFlowState();
    if (typeof saveWorkoutFlowState === 'function') saveWorkoutFlowState();
    if (typeof showWtScreen === 'function') showWtScreen('execute');
    if (typeof renderExecute === 'function') renderExecute();
    if (typeof goTo === 'function') goTo('workout', 'Тренировка');
    toast('🔁 Тренировка загружена — отмечай подходы как выполненные');
  };
  function wrapHistoryMenu() {
    var orig = window.toggleHistoryWorkoutActions;
    if (typeof orig !== 'function' || orig.__fsPlus) return;
    window.toggleHistoryWorkoutActions = function (trigger) {
      orig.apply(this, arguments);
      var menu = document.querySelector('.history-workout-menu');
      if (!menu || menu.dataset.fsPlus) return;
      menu.dataset.fsPlus = '1';
      var rep = document.createElement('button');
      rep.type = 'button';
      rep.setAttribute('role', 'menuitem');
      rep.textContent = '🔁 Повторить';
      rep.onclick = function () {
        var id = trigger.dataset.id;
        trigger.click();
        repeatDiaryWorkout(id);
      };
      var del = menu.querySelector('button.danger');
      if (del) menu.insertBefore(rep, del); else menu.appendChild(rep);
      var r = menu.getBoundingClientRect();
      if (r.bottom > window.innerHeight) menu.style.top = Math.max(8, window.innerHeight - r.height - 8) + 'px';
    };
    window.toggleHistoryWorkoutActions.__fsPlus = true;
  }

  /* ── 4. Динамика замеров ── */
  function deltaRow(label, value, d, unit, span) {
    var goal = '';
    try { if (typeof profile !== 'undefined' && profile) goal = profile.goal || ''; } catch (e) {}
    var goodDown = goal !== 'gain';
    var cls = d === 0 ? '' : (((d < 0) === goodDown) ? 'fs-delta-good' : 'fs-delta-warn');
    var arrow = d === 0 ? '±' : (d > 0 ? '↑ +' : '↓ −');
    return '<div class="fs-delta-row"><span>' + label + '</span><b>' + value + '</b>' +
      '<span class="' + cls + '">' + arrow + fmt(Math.abs(d)) + ' ' + unit + '</span><small>' + span + '</small></div>';
  }
  function buildDeltasHTML() {
    var wlog = readJSON('fs-wlog', []).filter(function (e) { return Number(e.weight) > 0; })
      .sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
    var body = readJSON('fs-bodylog', []);
    var rows = [];
    if (wlog.length >= 2) {
      var a = wlog[wlog.length - 2], b = wlog[wlog.length - 1];
      rows.push(deltaRow('Вес', fmt(b.weight) + ' кг', Math.round((b.weight - a.weight) * 10) / 10, 'кг', daysHuman(daysBetween(a.date, b.date))));
    }
    var waist = body.filter(function (e) { return Number(e.waist) > 0; })
      .sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
    if (waist.length >= 2) {
      var wa = waist[waist.length - 2], wb = waist[waist.length - 1];
      rows.push(deltaRow('Талия', fmt(wb.waist) + ' см', Math.round((wb.waist - wa.waist) * 10) / 10, 'см', daysHuman(daysBetween(wa.date, wb.date))));
    }
    if (!rows.length) return '<div class="fs-deltas-empty">Сделай второй замер — здесь появится динамика</div>';
    var rem = '';
    if (wlog.length) {
      var gap = daysBetween(wlog[wlog.length - 1].date, todayISO());
      if (gap >= 21) rem = '<div class="fs-delta-remind">⏰ Последний замер был ' + daysHuman(gap) + ' назад — пора обновить</div>';
    }
    return '<div class="fs-deltas-title">Динамика</div>' + rows.join('') + rem;
  }
  function ensureBodyDeltas() {
    var section = document.querySelector('.diary-measurements-history');
    if (!section || !section.parentNode) return;
    var box = document.getElementById('fs-body-deltas');
    if (!box) {
      box = document.createElement('div');
      box.id = 'fs-body-deltas';
      box.className = 'card fs-body-deltas';
      section.parentNode.insertBefore(box, section);
    }
    box.innerHTML = buildDeltasHTML();
  }

  /* ── 1. Отчёт тренеру ── */
  function buildReportText(days) {
    var today = todayISO(), from = addDaysISO(today, -(days - 1));
    var L = ['📊 Отчёт для тренера', 'Период: ' + isoToRu(from) + ' — ' + isoToRu(today), ''];
    var diary = readJSON('fs-diary', []);
    var wos = diary.filter(function (e) { var k = dateKey(e.date); return k && k >= from && k <= today; });
    L.push('🏋️ Тренировок: ' + wos.length);
    wos.forEach(function (e) {
      var f = e.feel || {};
      var suffix = '';
      if (f.rpe || f.text) suffix = ' — ' + (f.rpe ? 'нагрузка ' + f.rpe + '/10' : '') + (f.text ? ' «' + f.text + '»' : '');
      L.push('• ' + String(e.date || '').split(',')[0] + ' — ' + String(e.type || 'Тренировка').replace(/\s*\+\s*/g, ' · ') + (e.kcal ? ', ' + e.kcal + ' ккал' : '') + suffix);
    });
    var nutr = readJSON('fs-nutrition', []).filter(function (x) {
      var k = dateKey(x.date); return k && k >= from && k <= today && Number(x.kcal) > 0;
    });
    if (nutr.length) {
      var sum = 0; nutr.forEach(function (x) { sum += Number(x.kcal); });
      L.push('', '🍽 Питание: в среднем ' + fmt(Math.round(sum / nutr.length)) + ' ккал в день (' + nutr.length + ' дн. с записями)');
    }
    var wd = readJSON('fs-water-hist', []).filter(function (x) {
      var k = dateKey(x.date); return k && k >= from && k <= today && Number(x.amount) > 0;
    });
    if (wd.length) {
      var wsum = 0; wd.forEach(function (x) { wsum += Number(x.amount); });
      L.push('💧 Вода: в среднем ' + fmt(Math.round(wsum / wd.length)) + ' мл в день');
    }
    var wlog = readJSON('fs-wlog', []).filter(function (e) { return Number(e.weight) > 0; })
      .sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
    if (wlog.length) {
      L.push('', '📏 Вес: ' + fmt(wlog[wlog.length - 1].weight) + ' кг');
      if (wlog.length >= 2) {
        var wa2 = wlog[wlog.length - 2], wb2 = wlog[wlog.length - 1];
        var d = Math.round((wb2.weight - wa2.weight) * 10) / 10;
        L.push('Изменение: ' + (d > 0 ? '+' : '') + d.toLocaleString('ru-RU') + ' кг за ' + daysHuman(daysBetween(wa2.date, wb2.date)));
      }
    }
    var waist = readJSON('fs-bodylog', []).filter(function (e) { return Number(e.waist) > 0; })
      .sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
    if (waist.length >= 2) {
      var wa3 = waist[waist.length - 2], wb3 = waist[waist.length - 1];
      var dw = Math.round((wb3.waist - wa3.waist) * 10) / 10;
      L.push('Талия: ' + fmt(wb3.waist) + ' см (' + (dw > 0 ? '+' : '') + dw.toLocaleString('ru-RU') + ' см)');
    }
    return L.filter(function (v, i, arr) { return !(v === '' && arr[i - 1] === ''); }).join('\n');
  }
  function showReportModal(text) {
    var ov = document.createElement('div');
    ov.className = 'fs-report-modal';
    ov.innerHTML = '<div class="fs-report-modal-box"><div class="fs-feel-title">📤 Отчёт тренеру</div>' +
      '<textarea readonly></textarea>' +
      '<div class="fs-report-btns"><button type="button" class="fs-report-btn" data-act="copy">Скопировать</button>' +
      '<button type="button" class="fs-report-btn" data-act="close">Закрыть</button></div></div>';
    document.body.appendChild(ov);
    var ta = ov.querySelector('textarea');
    ta.value = text;
    ov.querySelector('[data-act="copy"]').onclick = function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { toast('📋 Скопировано'); }, function () {
          ta.select(); try { document.execCommand('copy'); toast('📋 Скопировано'); } catch (e) {}
        });
      } else { ta.select(); try { document.execCommand('copy'); toast('📋 Скопировано'); } catch (e) {} }
    };
    ov.querySelector('[data-act="close"]').onclick = function () { ov.remove(); };
    ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
  }
  function sendReport(text) {
    if (navigator.share) {
      navigator.share({ title: 'FitSim — отчёт', text: text }).catch(function (e) {
        if (e && e.name === 'AbortError') return;
        copyFallback();
      });
      return;
    }
    copyFallback();
    function copyFallback() {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { toast('📋 Отчёт скопирован — отправь его тренеру'); }, function () { showReportModal(text); });
      } else showReportModal(text);
    }
  }
  window.fsSendReport = function (days) { sendReport(buildReportText(days)); };
  function ensureReportCard() {
    var host = document.getElementById('wt-home');
    if (!host || document.getElementById('fs-report-card')) return;
    var sec = document.createElement('section');
    sec.id = 'fs-report-card';
    sec.className = 'card fs-report-card';
    sec.innerHTML = '<div class="card-header"><span>📤 Отчёт тренеру</span></div>' +
      '<div class="card-body"><div class="fs-report-hint">Сводка за неделю или месяц: тренировки, питание, замеры. Отправь её в мессенджер одним касанием.</div>' +
      '<div class="fs-report-btns"><button type="button" class="fs-report-btn" onclick="fsSendReport(7)">Неделя</button>' +
      '<button type="button" class="fs-report-btn" onclick="fsSendReport(30)">Месяц</button></div></div>';
    host.appendChild(sec);
  }

  function wrapRender(fnName, after) {
    var orig = window[fnName];
    if (typeof orig !== 'function' || orig.__fsPlus) return;
    var wrapped = function () { var r = orig.apply(this, arguments); try { after(); } catch (e) {} return r; };
    wrapped.__fsPlus = true;
    window[fnName] = wrapped;
  }
  wrapRender('renderDiary', ensureBodyDeltas);
  wrapRender('renderBodyLog', ensureBodyDeltas);
  wrapRender('renderExecute', ensureFeelBar);
  wrapRender('renderHome', ensureReportCard);
  wrapHistoryMenu();
  wrapSave('saveCurrentWorkout');
  wrapSave('finishCustomWorkout');

  ensureStyle();
  var tries = 0;
  (function boot() {
    ensureReportCard(); ensureBodyDeltas(); ensureFeelBar();
    if (++tries < 10) setTimeout(boot, 400);
  })();
})();
