'use strict';
// ─── VJTracker app.js ──────────────────────────────────────────
// Flight price analytics dashboard.
// Features:
//   • Rolling 7-day average + trend detection
//   • Lead-time-aware stats (7/14/30 baselines)
//   • Buy/Wait verdict: 5% threshold + trend direction
//   • Favorite routes (localStorage)
//   • Price delta badge (vs previous scan)
//   • Chart annotation lines (avg + min)
//   • Keyboard shortcuts (R/1/2/3/0/F)
// ──────────────────────────────────────────────────────────────

let db = [];
let currentRoute    = 'HAN-SGN';
let currentLeadTime = '14';
let selectedCarriers = [];
let priceChart = null;

const CARRIER_COLORS = {
  'Vietjet':           '#e05252',
  'Vietnam Airlines':  '#4a90d9',
  'Bamboo Airways':    '#3dbb7e',
  'Vietravel Airlines':'#e8a839',
  'SunPhuquoc Airways':'#a970d9',
};

const ROUTE_MAP = {
  HAN: ['SGN','DAD','CXR','PQC','PXU','DLI','UIH','HUI','VII','BMV','VCS','BKK'],
  SGN: ['HAN','DAD','CXR','PQC','PXU','DLI','UIH','HUI','VII','BMV','VCS','BKK'],
  DAD: ['HAN','SGN'], CXR: ['HAN','SGN'], PQC: ['HAN','SGN'],
  PXU: ['HAN','SGN'], DLI: ['HAN','SGN'], UIH: ['HAN','SGN'],
  HUI: ['HAN','SGN'], VII: ['HAN','SGN'], BMV: ['HAN','SGN'],
  VCS: ['HAN','SGN'], BKK: ['HAN','SGN'],
};

const AIRPORT_NAMES = {
  HAN:'Hà Nội (HAN)', SGN:'TP. HCM (SGN)', DAD:'Đà Nẵng (DAD)',
  CXR:'Nha Trang (CXR)', PQC:'Phú Quốc (PQC)', PXU:'Pleiku (PXU)',
  DLI:'Đà Lạt (DLI)', UIH:'Quy Nhơn (UIH)', HUI:'Huế (HUI)',
  VII:'Vinh (VII)', BMV:'Buôn Ma Thuột (BMV)', VCS:'Côn Đảo (VCS)',
  BKK:'Bangkok (BKK)',
};

const AIRPORT_SHORT = {
  HAN:'HAN', SGN:'SGN', DAD:'DAD', CXR:'CXR', PQC:'PQC', PXU:'PXU',
  DLI:'DLI', UIH:'UIH', HUI:'HUI', VII:'VII', BMV:'BMV', VCS:'VCS', BKK:'BKK',
};

const BKK_BLOCKED = new Set(['Bamboo Airways','SunPhuquoc Airways']);
const SMALL_ROUTE_BLOCKED = new Set(['SunPhuquoc Airways']);

// ── Helpers ──────────────────────────────────────────────────
function fmt(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('vi-VN', { style:'currency', currency:'VND', maximumFractionDigits:0 }).format(n);
}

function fmtDT(iso) {
  return new Date(iso).toLocaleString('vi-VN', {
    day:'2-digit', month:'2-digit', year:'numeric',
    hour:'2-digit', minute:'2-digit',
    timeZone:'Asia/Ho_Chi_Minh'
  });
}

function fmtChartLabel(iso) {
  const d = new Date(iso);
  const opts = { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false, timeZone:'Asia/Ho_Chi_Minh' };
  const p = {};
  new Intl.DateTimeFormat('en-US', opts).formatToParts(d).forEach(x => p[x.type] = x.value);
  return `${p.hour}:${p.minute} ${p.day}/${p.month}`;
}

function avg(arr) {
  if (!arr.length) return null;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function timeAgo(date) {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return 'vừa xong';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  return `${day} ngày trước`;
}

// Returns the primary carrier for stats (first selected, or Vietjet)
function primaryCarrier() {
  if (selectedCarriers.length && isCarrierAvailable(selectedCarriers[0])) return selectedCarriers[0];
  return 'Vietjet';
}

// ── Carrier Availability ──────────────────────────────────────
let _carriersWithData = new Set();

function recomputeCarriersWithData() {
  _carriersWithData = new Set(
    db.filter(r => r.route === currentRoute && r.lowestPrice != null).map(r => r.carrier)
  );
}

function isCarrierAvailable(carrier) {
  if (currentRoute.includes('BKK') && BKK_BLOCKED.has(carrier)) return false;
  if (['PXU','VCS','BMV'].some(c => currentRoute.includes(c)) && SMALL_ROUTE_BLOCKED.has(carrier)) return false;
  return _carriersWithData.has(carrier);
}

// ── Initialization ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  await loadDb();

  // Restore last route from URL hash or localStorage
  const hash = location.hash.replace('#','');
  const savedRoute = hash || localStorage.getItem('vjt-last-route') || 'HAN-SGN';
  const [o, d] = savedRoute.split('-');
  if (o && d && ROUTE_MAP[o]) {
    document.getElementById('origin-select').value = o;
    populateDestinations(o);
    if (ROUTE_MAP[o].includes(d)) {
      document.getElementById('dest-select').value = d;
    }
    currentRoute = `${o}-${document.getElementById('dest-select').value}`;
  } else {
    populateDestinations('HAN');
  }

  buildAirlineChecks();
  buildFavorites();
  refreshAll();
  initKeyboardShortcuts();

  // Auto-poll every 5 min
  setInterval(async () => {
    try {
      const res = await fetch('flights_db.json');
      if (!res.ok) return;
      const newDb = await res.json();
      if (newDb.length !== db.length) { db = newDb; refreshAll(); }
    } catch (_) {}
  }, 5 * 60 * 1000);
});

async function loadDb() {
  try {
    const res = await fetch('flights_db.json');
    if (!res.ok) throw new Error();
    db = await res.json();
  } catch (_) {
    db = generateMockData();
  }
}

// ── Theme ─────────────────────────────────────────────────────
function initTheme() {
  const btn = document.getElementById('theme-toggle');
  const saved = localStorage.getItem('vjt-theme') || 'dark';
  applyTheme(saved);
  btn.addEventListener('click', () => {
    const next = document.body.classList.contains('light-theme') ? 'dark' : 'light';
    localStorage.setItem('vjt-theme', next);
    applyTheme(next);
    updateChartTheme();
  });
}

function applyTheme(t) {
  document.body.classList.toggle('light-theme', t === 'light');
  const btn = document.getElementById('theme-toggle');
  btn.innerHTML = t === 'light'
    ? '<i class="fa-solid fa-moon"></i>'
    : '<i class="fa-solid fa-sun"></i>';
}

// ── Keyboard Shortcuts ────────────────────────────────────────
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Don't trigger when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key.toLowerCase()) {
      case 'r': reverseRoute(); break;
      case '1': setLeadTime('7');  break;
      case '2': setLeadTime('14'); break;
      case '3': setLeadTime('30'); break;
      case '0': setLeadTime('all'); break;
      case 'f': toggleFavorite(); break;
    }
  });
}

// ── Favorite Routes ───────────────────────────────────────────
function getFavorites() {
  try { return JSON.parse(localStorage.getItem('vjt-favs') || '[]'); }
  catch { return []; }
}

function saveFavorites(favs) {
  localStorage.setItem('vjt-favs', JSON.stringify(favs));
}

function isFavorite(route) {
  return getFavorites().includes(route);
}

function toggleFavorite() {
  const favs = getFavorites();
  const idx = favs.indexOf(currentRoute);
  if (idx > -1) {
    favs.splice(idx, 1);
  } else {
    favs.push(currentRoute);
  }
  saveFavorites(favs);
  buildFavorites();
}

function buildFavorites() {
  const wrap = document.getElementById('fav-pills');
  const addBtn = document.getElementById('fav-add-btn');
  const favBar = document.getElementById('fav-bar');
  if (!wrap) return;

  const favs = getFavorites();

  // Update add button state
  if (addBtn) {
    const isSaved = isFavorite(currentRoute);
    addBtn.classList.toggle('saved', isSaved);
    addBtn.innerHTML = isSaved
      ? '<i class="fa-solid fa-star"></i> Đã lưu'
      : '<i class="fa-regular fa-star"></i> Lưu chặng';
    addBtn.onclick = toggleFavorite;
  }

  wrap.innerHTML = '';
  favs.forEach(route => {
    const [o, d] = route.split('-');
    const pill = document.createElement('button');
    pill.className = 'fav-pill' + (route === currentRoute ? ' active' : '');
    pill.innerHTML = `${o} → ${d} <span class="fav-remove" title="Xoá">✕</span>`;

    pill.addEventListener('click', (e) => {
      if (e.target.classList.contains('fav-remove')) {
        const f = getFavorites().filter(r => r !== route);
        saveFavorites(f);
        buildFavorites();
        return;
      }
      // Navigate to this route
      document.getElementById('origin-select').value = o;
      populateDestinations(o);
      document.getElementById('dest-select').value = d;
      currentRoute = route;
      refreshAll();
      buildFavorites();
    });

    wrap.appendChild(pill);
  });

  // Show/hide bar
  if (favBar) {
    favBar.classList.toggle('hidden', favs.length === 0 && !isFavorite(currentRoute));
  }
}

// ── Route Controls ────────────────────────────────────────────
function populateDestinations(origin) {
  const sel = document.getElementById('dest-select');
  sel.innerHTML = '';
  (ROUTE_MAP[origin] || []).forEach(dest => {
    const o = document.createElement('option');
    o.value = dest;
    o.textContent = AIRPORT_NAMES[dest] || dest;
    sel.appendChild(o);
  });
}

function onOriginChange(origin) {
  populateDestinations(origin);
  const dest = document.getElementById('dest-select').value;
  currentRoute = `${origin}-${dest}`;
  refreshAll();
  buildFavorites();
}

function onDestChange(dest) {
  const origin = document.getElementById('origin-select').value;
  currentRoute = `${origin}-${dest}`;
  refreshAll();
  buildFavorites();
}

function reverseRoute() {
  const originSel = document.getElementById('origin-select');
  const destSel   = document.getElementById('dest-select');
  const oldOrigin = originSel.value;
  const oldDest   = destSel.value;

  // Check if reverse route exists
  if (!ROUTE_MAP[oldDest] || !ROUTE_MAP[oldDest].includes(oldOrigin)) return;

  originSel.value = oldDest;
  populateDestinations(oldDest);
  destSel.value = oldOrigin;
  currentRoute = `${oldDest}-${oldOrigin}`;
  refreshAll();
  buildFavorites();
}

// ── Lead Time Pills ───────────────────────────────────────────
function setLeadTime(val) {
  currentLeadTime = val;
  document.querySelectorAll('#lead-pills .pill').forEach(p => {
    p.classList.toggle('active', p.dataset.lead === val);
  });
  refreshAll();
}

// ── Airline Checkboxes ───────────────────────────────────────
function buildAirlineChecks() {
  const wrap = document.getElementById('airline-checks');
  if (!wrap) return;
  wrap.innerHTML = '';
  Object.entries(CARRIER_COLORS).forEach(([carrier, color]) => {
    const label = document.createElement('label');
    label.className = 'airline-check-label';
    label.style.color = color;
    label.dataset.carrier = carrier;
    label.innerHTML = `
      <span class="check-box"><i class="fa-solid fa-check"></i></span>
      <span class="airline-dot" style="background:${color}"></span>
      <span>${carrier}</span>`;
    label.addEventListener('click', (e) => {
      e.preventDefault();
      toggleCarrier(carrier);
    });
    wrap.appendChild(label);
  });
}

function syncAirlineChecks() {
  document.querySelectorAll('.airline-check-label').forEach(label => {
    const carrier   = label.dataset.carrier;
    const isAvail   = isCarrierAvailable(carrier);
    const isChecked = selectedCarriers.includes(carrier) && isAvail;
    label.classList.toggle('disabled', !isAvail);
    label.classList.toggle('checked',  isChecked);
    label.title = isAvail ? '' : 'Không có chuyến bay của hãng này trên chặng đang chọn';
  });
}

function toggleCarrier(carrier) {
  if (!isCarrierAvailable(carrier)) return;
  const idx = selectedCarriers.indexOf(carrier);
  if (idx > -1) {
    if (selectedCarriers.length === 1) return;
    selectedCarriers.splice(idx, 1);
  } else {
    selectedCarriers.push(carrier);
  }
  syncAirlineChecks();
  refreshAll();
}

// ── Master Refresh ────────────────────────────────────────────
function refreshAll() {
  recomputeCarriersWithData();
  selectedCarriers = selectedCarriers.filter(c => isCarrierAvailable(c));
  if (selectedCarriers.length === 0) {
    const avail = Object.keys(CARRIER_COLORS).filter(isCarrierAvailable);
    selectedCarriers = avail.includes('Vietjet') ? ['Vietjet'] : avail.slice(0, 1);
  }

  syncAirlineChecks();
  updateLastScan();
  updateStatsRow();
  updateAnalysisCards();
  renderChart();
  renderTable();

  // Persist last route
  localStorage.setItem('vjt-last-route', currentRoute);
  location.hash = currentRoute;

  // Update chart route label
  const [o, d] = currentRoute.split('-');
  const el = document.getElementById('chart-route-label');
  if (el) el.textContent = `${AIRPORT_NAMES[o] || o} → ${AIRPORT_NAMES[d] || d}`;

  // Update analysis card carrier labels
  const pc = primaryCarrier();
  const trendLabel = document.getElementById('trend-carrier-label');
  const ltLabel    = document.getElementById('lt-carrier-label');
  if (trendLabel) trendLabel.textContent = pc;
  if (ltLabel)    ltLabel.textContent = pc;

  // Update stat carrier tag
  const tag = document.getElementById('stat-carrier-tag');
  if (tag) tag.textContent = pc;
}

// ── Last Scan ─────────────────────────────────────────────────
function updateLastScan() {
  const el = document.getElementById('last-scan-label');
  if (!db.length) { el.textContent = 'Chưa có dữ liệu'; return; }
  const ts = db.map(r => new Date(r.crawlTimestamp).getTime());
  const latest = new Date(Math.max(...ts));
  el.innerHTML = `Quét <b>${timeAgo(latest)}</b>`;
}

// ── Stats Row ─────────────────────────────────────────────────
function updateStatsRow() {
  const pc = primaryCarrier();
  const recs = getFilteredRecords(pc);
  const latest = recs[0] || null;

  // Latest price
  const valLatest = document.getElementById('val-latest');
  const subLatest = document.getElementById('sub-latest');
  const deltaEl   = document.getElementById('delta-latest');
  if (latest) {
    valLatest.textContent = fmt(latest.lowestPrice);
    subLatest.textContent = `${fmtDT(latest.crawlTimestamp)} · bay ${latest.departureDate}`;

    // Delta vs previous scan
    if (recs.length >= 2 && deltaEl) {
      const prev = recs[1].lowestPrice;
      const diff = latest.lowestPrice - prev;
      const pct  = ((diff / prev) * 100).toFixed(1);
      if (Math.abs(diff) < 1000) {
        deltaEl.className = 'stat-box-delta flat';
        deltaEl.textContent = '~ không đổi';
      } else if (diff > 0) {
        deltaEl.className = 'stat-box-delta up';
        deltaEl.innerHTML = `<i class="fa-solid fa-arrow-up"></i> +${pct}% (${fmt(diff)})`;
      } else {
        deltaEl.className = 'stat-box-delta down';
        deltaEl.innerHTML = `<i class="fa-solid fa-arrow-down"></i> ${pct}% (${fmt(diff)})`;
      }
    } else if (deltaEl) {
      deltaEl.className = 'stat-box-delta';
      deltaEl.textContent = '';
    }
  } else {
    valLatest.textContent = '—';
    subLatest.textContent = 'Chưa có dữ liệu cho chặng này';
    if (deltaEl) { deltaEl.className = 'stat-box-delta'; deltaEl.textContent = ''; }
  }

  // Rolling 7-day average
  const avg7Val = document.getElementById('val-avg7');
  const sub7Val = document.getElementById('sub-avg7');
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent7 = recs.filter(r => new Date(r.crawlTimestamp).getTime() >= sevenDaysAgo);
  if (recent7.length >= 2) {
    const a = Math.round(avg(recent7.map(r => r.lowestPrice)));
    avg7Val.textContent = fmt(a);
    sub7Val.textContent = `${recent7.length} lần quét trong 7 ngày qua`;
  } else if (recs.length) {
    const a = Math.round(avg(recs.map(r => r.lowestPrice)));
    avg7Val.textContent = fmt(a);
    sub7Val.textContent = `Trung bình lịch sử (${recs.length} lần quét)`;
  } else {
    avg7Val.textContent = '—';
    sub7Val.textContent = '—';
  }

  // Historical minimum
  const valMin  = document.getElementById('val-min');
  const subMin  = document.getElementById('sub-min');
  if (recs.length) {
    const minRec = recs.reduce((a, b) => b.lowestPrice < a.lowestPrice ? b : a);
    valMin.textContent = fmt(minRec.lowestPrice);
    subMin.textContent = fmtDT(minRec.crawlTimestamp);
  } else {
    valMin.textContent = '—';
    subMin.textContent = '—';
  }

  // Recommendation
  updateRecommendation(recs, recent7);
}

// ── Recommendation ────────────────────────────────────────────
function updateRecommendation(recs, recent7) {
  const box     = document.getElementById('rec-box');
  const verdict = document.getElementById('rec-verdict');
  const valRec  = document.getElementById('val-rec');
  const reason  = document.getElementById('rec-reason');

  if (recs.length < 3) {
    box.className = 'stat-box rec-box';
    verdict.className = 'rec-verdict flat'; verdict.innerHTML = '— CHƯA ĐỦ DỮ LIỆU';
    valRec.textContent = '—';
    reason.textContent = 'Cần ít nhất 3 lần quét để tính xu hướng.';
    return;
  }

  const latestPrice = recs[0].lowestPrice;
  const baselineRecs = recent7.length >= 3 ? recent7 : recs;
  const baseline = avg(baselineRecs.map(r => r.lowestPrice));

  const last3  = recs.slice(0, 3).map(r => r.lowestPrice);
  const prior3 = recs.slice(3, 6).map(r => r.lowestPrice);
  let trendDir = 0;
  if (prior3.length >= 2) {
    const pct = (avg(last3) - avg(prior3)) / avg(prior3);
    if (pct >  0.03) trendDir =  1;
    if (pct < -0.03) trendDir = -1;
  }

  const pctVsBaseline = (latestPrice - baseline) / baseline;
  const THRESHOLD = 0.05;
  let cls, icon, text, sub;

  if (pctVsBaseline < -THRESHOLD) {
    if (trendDir < 0) {
      cls = 'flat'; icon = '<i class="fa-solid fa-arrow-trend-down"></i>';
      text = 'Đang giảm – theo dõi thêm';
      sub = `Giá thấp hơn baseline ${Math.round(-pctVsBaseline * 100)}% và còn đang giảm. Có thể chờ thêm vài ngày.`;
    } else {
      cls = 'buy'; icon = '<i class="fa-solid fa-circle-check"></i>';
      text = 'Mua ngay';
      sub = `Thấp hơn baseline ${Math.round(-pctVsBaseline * 100)}% (${fmt(Math.round(baseline - latestPrice))} so với TB 7 ngày).`;
    }
  } else if (pctVsBaseline > THRESHOLD) {
    cls = 'wait'; icon = '<i class="fa-solid fa-triangle-exclamation"></i>';
    text = 'Chờ thêm';
    sub = `Cao hơn baseline ${Math.round(pctVsBaseline * 100)}% (${fmt(Math.round(latestPrice - baseline))} so với TB 7 ngày). Xu hướng ${trendDir > 0 ? 'tiếp tục tăng' : 'có thể hồi phục'}.`;
  } else {
    cls = 'flat'; icon = '<i class="fa-solid fa-minus"></i>';
    text = 'Giá ổn định';
    sub = `Trong khoảng ±5% so với baseline. ${trendDir > 0 ? 'Xu hướng tăng nhẹ.' : trendDir < 0 ? 'Xu hướng giảm nhẹ.' : 'Không có xu hướng rõ.'}`;
  }

  box.className     = `stat-box rec-box ${cls}`;
  verdict.className = `rec-verdict ${cls}`;
  verdict.innerHTML = `${icon} ${text.toUpperCase()}`;
  valRec.textContent = fmt(latestPrice);
  reason.textContent = sub;
}

// ── Analysis Cards ────────────────────────────────────────────
function updateAnalysisCards() {
  updateTrendRows();
  updateLeadTimeGrid();
}

function updateTrendRows() {
  const container = document.getElementById('trend-rows');
  const pc = primaryCarrier();
  const recs = getFilteredRecords(pc);
  if (recs.length < 4) {
    container.innerHTML = '<div class="trend-row"><span class="trend-label">Chưa đủ dữ liệu để phân tích xu hướng.</span></div>';
    return;
  }

  const byDay = {};
  recs.forEach(r => {
    const day = r.crawlTimestamp.slice(0, 10);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(r.lowestPrice);
  });

  const days = Object.keys(byDay).sort().reverse().slice(0, 7);
  const rows = [];

  for (let i = 0; i < Math.min(days.length, 5); i++) {
    const day = days[i];
    const dayAvg = Math.round(avg(byDay[day]));
    const prevDay = days[i + 1];
    let badge = '';
    if (prevDay) {
      const prevAvg = Math.round(avg(byDay[prevDay]));
      const pct = ((dayAvg - prevAvg) / prevAvg * 100).toFixed(1);
      const cls = pct > 1 ? 'up' : pct < -1 ? 'down' : 'flat';
      const sign = pct > 0 ? '+' : '';
      badge = `<span class="trend-badge ${cls}">${sign}${pct}%</span>`;
    }
    rows.push(`
      <div class="trend-row">
        <span class="trend-label">${day}</span>
        <span class="trend-value">${fmt(dayAvg)}</span>
        ${badge}
      </div>`);
  }

  container.innerHTML = rows.join('') || '<div class="trend-row"><span class="trend-label">Không có dữ liệu.</span></div>';
}

function updateLeadTimeGrid() {
  const pc = primaryCarrier();
  const prices = {};

  [7, 14, 30].forEach(lead => {
    const el = document.getElementById(`lt-${lead}`);
    const recs = db.filter(r =>
      r.route === currentRoute &&
      r.carrier === pc &&
      r.leadDays === lead &&
      r.lowestPrice != null
    );
    if (recs.length) {
      const a = Math.round(avg(recs.map(r => r.lowestPrice)));
      if (el) el.textContent = fmt(a);
      prices[lead] = a;
    } else {
      if (el) el.textContent = '—';
      prices[lead] = null;
    }
  });

  // Highlight cheapest lead-time cell
  const validPrices = Object.entries(prices).filter(([, v]) => v != null);
  const minLead = validPrices.length
    ? validPrices.reduce((a, b) => b[1] < a[1] ? b : a)[0]
    : null;

  [7, 14, 30].forEach(lead => {
    const cell = document.getElementById(`lt-cell-${lead}`);
    if (cell) cell.classList.toggle('cheapest', String(lead) === minLead);
  });
}

// ── Filter helpers ────────────────────────────────────────────
function getFilteredRecords(carrier) {
  return db
    .filter(r => r.route === currentRoute && r.carrier === carrier && r.lowestPrice != null)
    .filter(r => currentLeadTime === 'all' || r.leadDays === parseInt(currentLeadTime))
    .sort((a, b) => new Date(b.crawlTimestamp) - new Date(a.crawlTimestamp));
}

// ── Chart ─────────────────────────────────────────────────────
function chartColors() {
  const light = document.body.classList.contains('light-theme');
  return {
    text: light ? '#555a72' : '#616680',
    grid: light ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)',
  };
}

function updateChartTheme() {
  if (!priceChart) return;
  const c = chartColors();
  priceChart.options.plugins.legend.labels.color = c.text;
  priceChart.options.scales.x.ticks.color = c.text;
  priceChart.options.scales.x.grid.color  = c.grid;
  priceChart.options.scales.y.ticks.color = c.text;
  priceChart.options.scales.y.grid.color  = c.grid;
  priceChart.update();
}

function renderChart() {
  const ctx = document.getElementById('priceChart').getContext('2d');

  let recs = db.filter(r => r.route === currentRoute && r.lowestPrice != null);
  if (currentLeadTime !== 'all') {
    recs = recs.filter(r => r.leadDays === parseInt(currentLeadTime));
  }

  const timestamps = [...new Set(recs.map(r => r.crawlTimestamp))].sort();
  const labels     = timestamps.map(fmtChartLabel);

  const datasets = selectedCarriers
    .filter(isCarrierAvailable)
    .map(carrier => {
      const priceMap = {};
      recs.filter(r => r.carrier === carrier).forEach(r => { priceMap[r.crawlTimestamp] = r.lowestPrice; });
      const color = CARRIER_COLORS[carrier] || '#9ea3b8';
      return {
        label: carrier,
        data: timestamps.map(t => priceMap[t] ?? null),
        borderColor: color,
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointBackgroundColor: color,
        pointBorderColor: 'transparent',
        pointRadius: 3,
        pointHoverRadius: 5,
        tension: 0.2,
        spanGaps: true,
      };
    });

  if (priceChart) priceChart.destroy();

  // Compute annotation lines (avg + min for primary carrier)
  const pc = primaryCarrier();
  const pcRecs = recs.filter(r => r.carrier === pc);
  const pcPrices = pcRecs.map(r => r.lowestPrice).filter(Boolean);
  const avgPrice = pcPrices.length ? Math.round(avg(pcPrices)) : null;
  const minPrice = pcPrices.length ? Math.min(...pcPrices) : null;

  const annotations = {};
  if (avgPrice) {
    annotations.avgLine = {
      type: 'line', yMin: avgPrice, yMax: avgPrice,
      borderColor: 'rgba(158,163,184,0.35)', borderWidth: 1, borderDash: [6, 4],
      label: {
        display: true, content: `TB: ${(avgPrice / 1000).toFixed(0)}k`,
        position: 'start', backgroundColor: 'transparent',
        color: 'rgba(158,163,184,0.6)', font: { size: 10, family: 'JetBrains Mono' },
      }
    };
  }
  if (minPrice && minPrice !== avgPrice) {
    annotations.minLine = {
      type: 'line', yMin: minPrice, yMax: minPrice,
      borderColor: 'rgba(61,187,126,0.3)', borderWidth: 1, borderDash: [4, 4],
      label: {
        display: true, content: `Min: ${(minPrice / 1000).toFixed(0)}k`,
        position: 'start', backgroundColor: 'transparent',
        color: 'rgba(61,187,126,0.5)', font: { size: 10, family: 'JetBrains Mono' },
      }
    };
  }

  const c = chartColors();
  priceChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: {
            color: c.text,
            font: { family: 'Inter', size: 12 },
            boxWidth: 12, boxHeight: 2,
          }
        },
        tooltip: {
          backgroundColor: '#171922',
          titleColor: '#e8eaf2',
          bodyColor: '#9ea3b8',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          titleFont: { family: 'Inter', size: 12 },
          bodyFont: { family: 'JetBrains Mono', size: 12 },
          callbacks: {
            title: ctx => timestamps[ctx[0].dataIndex]
              ? fmtChartLabel(timestamps[ctx[0].dataIndex])
              : '',
            label: ctx => {
              if (ctx.parsed.y == null) return null;
              const price = ctx.parsed.y;
              let extra = '';
              if (avgPrice) {
                const pct = ((price - avgPrice) / avgPrice * 100).toFixed(1);
                extra = pct > 0 ? ` (+${pct}% vs TB)` : ` (${pct}% vs TB)`;
              }
              return ` ${ctx.dataset.label}: ${fmt(price)}${extra}`;
            },
          }
        },
        annotation: { annotations }
      },
      scales: {
        x: {
          grid: { color: c.grid },
          ticks: { color: c.text, font: { family: 'JetBrains Mono', size: 10 }, maxRotation: 45 }
        },
        y: {
          grid: { color: c.grid },
          ticks: {
            color: c.text,
            font: { family: 'JetBrains Mono', size: 10 },
            callback: v => (v / 1000).toFixed(0) + 'k ₫'
          }
        }
      }
    }
  });
}

// ── Table ─────────────────────────────────────────────────────
function renderTable() {
  const tbody = document.getElementById('table-body');
  const countEl = document.getElementById('table-count');

  // Filter by current route AND selected carriers
  const rows = db
    .filter(r => r.route === currentRoute && selectedCarriers.includes(r.carrier) && isCarrierAvailable(r.carrier))
    .sort((a, b) => new Date(b.crawlTimestamp) - new Date(a.crawlTimestamp))
    .slice(0, 150);

  if (countEl) countEl.textContent = `${rows.length} bản ghi`;

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="no-data">Không có dữ liệu cho chặng này.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const color = CARRIER_COLORS[r.carrier] || '#9ea3b8';
    return `<tr>
      <td>${fmtDT(r.crawlTimestamp)}</td>
      <td class="td-route">${r.route}</td>
      <td><span class="carrier-dot" style="background:${color}"></span>${r.carrier}</td>
      <td>${r.departureDate}</td>
      <td>${r.leadDays} ngày</td>
      <td class="td-price">${r.lowestPrice ? fmt(r.lowestPrice) : '—'}</td>
    </tr>`;
  }).join('');
}

// ── Mock data (fallback when DB unavailable) ──────────────────
function generateMockData() {
  const data = [];
  const routes = ['HAN-SGN','SGN-HAN','HAN-DAD','SGN-DAD'];
  const leads  = [7,14,30];
  const carriers = ['Vietjet','Vietnam Airlines','Bamboo Airways','Vietravel Airlines'];
  const now = new Date();
  const basePrices = { 'HAN-SGN':1750000, 'SGN-HAN':1750000, 'HAN-DAD':900000, 'SGN-DAD':900000 };
  const mods = { 'Vietjet':1.0, 'Bamboo Airways':1.2, 'Vietravel Airlines':1.02, 'Vietnam Airlines':1.4 };

  for (let i = 20; i >= 0; i--) {
    const ts = new Date(now.getTime() - i * 8 * 3600 * 1000);
    routes.forEach(route => {
      leads.forEach(lead => {
        carriers.forEach(carrier => {
          const base = basePrices[route] || 1500000;
          const leadMod = lead === 7 ? 1.15 : lead === 14 ? 1.0 : 0.88;
          const wave = 1 + Math.sin(i / 3) * 0.06;
          const price = Math.round(base * leadMod * mods[carrier] * wave);
          data.push({
            crawlTimestamp: ts.toISOString(),
            route, leadDays: lead, carrier,
            departureDate: new Date(ts.getTime() + lead * 86400000).toISOString().slice(0,10),
            lowestPrice: price, allFlights: []
          });
        });
      });
    });
  }
  return data;
}
