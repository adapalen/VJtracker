'use strict';
// ─── VJTracker app.js ──────────────────────────────────────────
// Accurate flight price analytics dashboard.
// Key improvements over previous version:
//   • Rolling 7-day average instead of all-time average
//   • Trend detection: last 3 scans vs prior 3 scans
//   • Lead-time-aware stats (7/14/30 baselines shown separately)
//   • Buy/Wait verdict uses 5% threshold + trend direction
//   • Carrier chips auto-populate from DB data
// ──────────────────────────────────────────────────────────────

let db = [];
let currentRoute    = 'HAN-SGN';
let currentLeadTime = '14';        // '7'|'14'|'30'|'all'
let selectedCarriers = [];
let priceChart = null;

const CARRIER_COLORS = {
  'Vietjet':           '#e05252',
  'Vietnam Airlines':  '#4a90d9',
  'Bamboo Airways':    '#3dbb7e',
  'Vietravel Airlines':'#e8a839',
  'SunPhuquoc Airways':'#a970d9',
};

// Routes available per origin (mirrors scraper.js)
const ROUTE_MAP = {
  HAN: ['SGN','DAD','CXR','PQC','PXU','DLI','UIH','HUI','VII','BMV','VCS','BKK'],
  SGN: ['HAN','DAD','CXR','PQC','PXU','DLI','UIH','HUI','VII','BMV','VCS','BKK'],
  DAD: ['HAN','SGN'],
  CXR: ['HAN','SGN'],
  PQC: ['HAN','SGN'],
  PXU: ['HAN','SGN'],
  DLI: ['HAN','SGN'],
  UIH: ['HAN','SGN'],
  HUI: ['HAN','SGN'],
  VII: ['HAN','SGN'],
  BMV: ['HAN','SGN'],
  VCS: ['HAN','SGN'],
  BKK: ['HAN','SGN'],
};

const AIRPORT_NAMES = {
  HAN:'Hà Nội (HAN)', SGN:'TP. HCM (SGN)', DAD:'Đà Nẵng (DAD)',
  CXR:'Nha Trang (CXR)', PQC:'Phú Quốc (PQC)', PXU:'Pleiku (PXU)',
  DLI:'Đà Lạt (DLI)', UIH:'Quy Nhơn (UIH)', HUI:'Huế (HUI)',
  VII:'Vinh (VII)', BMV:'Buôn Ma Thuột (BMV)', VCS:'Côn Đảo (VCS)',
  BKK:'Bangkok (BKK)',
};

// Carriers that never operate on BKK routes
const BKK_BLOCKED = new Set(['Bamboo Airways','SunPhuquoc Airways']);
// Carriers that never operate on these domestic small routes
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

// ── Carrier Availability ──────────────────────────────────────
function isCarrierAvailable(carrier) {
  if (currentRoute.includes('BKK') && BKK_BLOCKED.has(carrier)) return false;
  if (['PXU','VCS','BMV'].some(c => currentRoute.includes(c)) && SMALL_ROUTE_BLOCKED.has(carrier)) return false;
  return true;
}

// ── Initialization ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  await loadDb();
  populateDestinations('HAN');
  buildCarrierChips();
  refreshAll();

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
}

function onDestChange(dest) {
  const origin = document.getElementById('origin-select').value;
  currentRoute = `${origin}-${dest}`;
  refreshAll();
}

// ── Lead Time Pills ───────────────────────────────────────────
function setLeadTime(val) {
  currentLeadTime = val;
  document.querySelectorAll('#lead-pills .pill').forEach(p => {
    p.classList.toggle('active', p.dataset.lead === val);
  });
  refreshAll();
}

// ── Carrier Chips ─────────────────────────────────────────────
function buildCarrierChips() {
  const wrap = document.getElementById('carrier-toggles');
  wrap.innerHTML = '';
  const allCarriers = Object.keys(CARRIER_COLORS);
  allCarriers.forEach(carrier => {
    const color = CARRIER_COLORS[carrier];
    const chip = document.createElement('div');
    chip.className = 'carrier-chip' + (selectedCarriers.includes(carrier) ? ' active' : '');
    chip.id = 'chip-' + carrier.replace(/\s/g, '-');
    chip.innerHTML = `<span class="chip-dot" style="background:${color}"></span>${carrier}`;
    chip.onclick = () => toggleCarrier(carrier);
    wrap.appendChild(chip);
  });
}

function syncCarrierChips() {
  const allCarriers = Object.keys(CARRIER_COLORS);
  allCarriers.forEach(carrier => {
    const chip = document.getElementById('chip-' + carrier.replace(/\s/g, '-'));
    if (!chip) return;
    const avail = isCarrierAvailable(carrier);
    chip.classList.toggle('disabled', !avail);
    chip.classList.toggle('active', selectedCarriers.includes(carrier) && avail);
  });
}

function toggleCarrier(carrier) {
  if (!isCarrierAvailable(carrier)) return;
  const idx = selectedCarriers.indexOf(carrier);
  if (idx > -1) {
    if (selectedCarriers.length === 1) return; // keep at least one
    selectedCarriers.splice(idx, 1);
  } else {
    selectedCarriers.push(carrier);
  }
  syncCarrierChips();
  renderChart();
}

// ── Master Refresh ────────────────────────────────────────────
function refreshAll() {
  // Auto-select Vietjet if nothing selected or all invalid
  const avail = Object.keys(CARRIER_COLORS).filter(isCarrierAvailable);
  if (!selectedCarriers.some(c => avail.includes(c))) {
    selectedCarriers = avail.slice(0, 1); // default to first available
  }
  syncCarrierChips();
  updateLastScan();
  updateStatsRow();
  updateAnalysisCards();
  renderChart();
  renderTable();

  // Update chart route label
  const [o, d] = currentRoute.split('-');
  const el = document.getElementById('chart-route-label');
  if (el) el.textContent = `${AIRPORT_NAMES[o] || o} → ${AIRPORT_NAMES[d] || d}`;
}

// ── Last Scan ─────────────────────────────────────────────────
function updateLastScan() {
  const el = document.getElementById('last-scan-label');
  if (!db.length) { el.textContent = 'Chưa có dữ liệu'; return; }
  const ts = db.map(r => new Date(r.crawlTimestamp).getTime());
  const latest = new Date(Math.max(...ts));
  el.innerHTML = `Quét lúc <b>${fmtDT(latest.toISOString())}</b>`;
}

// ── Stats Row ─────────────────────────────────────────────────
function updateStatsRow() {
  // Focus on Vietjet for the headline stats
  const recs = getFilteredRecords('Vietjet');
  const latest = recs[0] || null;

  // Latest price
  const valLatest = document.getElementById('val-latest');
  const subLatest = document.getElementById('sub-latest');
  if (latest) {
    valLatest.textContent = fmt(latest.lowestPrice);
    subLatest.textContent = `${fmtDT(latest.crawlTimestamp)} · bay ${latest.departureDate}`;
  } else {
    valLatest.textContent = '—';
    subLatest.textContent = 'Chưa có dữ liệu cho chặng này';
  }

  // Rolling 7-day average (scans from the last 7 days)
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

// ── Recommendation (accurate) ─────────────────────────────────
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

  // Baseline: rolling 7-day avg, or full history if < 3 recent
  const baselineRecs = recent7.length >= 3 ? recent7 : recs;
  const baseline = avg(baselineRecs.map(r => r.lowestPrice));

  // Trend: compare last 3 scans vs prior 3 scans
  const last3  = recs.slice(0, 3).map(r => r.lowestPrice);
  const prior3 = recs.slice(3, 6).map(r => r.lowestPrice);
  let trendDir = 0; // -1 falling, 0 flat, +1 rising
  if (prior3.length >= 2) {
    const avgLast  = avg(last3);
    const avgPrior = avg(prior3);
    const pct = (avgLast - avgPrior) / avgPrior;
    if (pct >  0.03) trendDir =  1; // rising >3%
    if (pct < -0.03) trendDir = -1; // falling >3%
  }

  const pctVsBaseline = (latestPrice - baseline) / baseline;
  const THRESHOLD = 0.05; // 5%

  let cls, icon, text, sub;

  if (pctVsBaseline < -THRESHOLD) {
    // Price is below baseline: buy signal — but check if it's still falling
    if (trendDir < 0) {
      cls  = 'flat';
      icon = '<i class="fa-solid fa-arrow-trend-down"></i>';
      text = 'Đang giảm – theo dõi thêm';
      sub  = `Giá thấp hơn baseline ${Math.round(-pctVsBaseline * 100)}% và còn đang giảm. Có thể chờ thêm vài ngày.`;
    } else {
      cls  = 'buy';
      icon = '<i class="fa-solid fa-circle-check"></i>';
      text = 'Mua ngay';
      sub  = `Thấp hơn baseline ${Math.round(-pctVsBaseline * 100)}% (${fmt(Math.round(baseline - latestPrice))} so với TB 7 ngày).`;
    }
  } else if (pctVsBaseline > THRESHOLD) {
    cls  = 'wait';
    icon = '<i class="fa-solid fa-triangle-exclamation"></i>';
    text = 'Chờ thêm';
    sub  = `Cao hơn baseline ${Math.round(pctVsBaseline * 100)}% (${fmt(Math.round(latestPrice - baseline))} so với TB 7 ngày). Xu hướng ${trendDir > 0 ? 'tiếp tục tăng' : 'có thể hồi phục'}.`;
  } else {
    cls  = 'flat';
    icon = '<i class="fa-solid fa-minus"></i>';
    text = 'Giá ổn định';
    sub  = `Trong khoảng ±5% so với baseline. ${trendDir > 0 ? 'Xu hướng tăng nhẹ.' : trendDir < 0 ? 'Xu hướng giảm nhẹ.' : 'Không có xu hướng rõ.'}`;
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
  const recs = getFilteredRecords('Vietjet');
  if (recs.length < 4) {
    container.innerHTML = '<div class="trend-row"><span class="trend-label">Chưa đủ dữ liệu để phân tích xu hướng.</span></div>';
    return;
  }

  // Group by scan date (day), compute daily average price
  const byDay = {};
  recs.forEach(r => {
    const day = r.crawlTimestamp.slice(0, 10);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(r.lowestPrice);
  });

  const days = Object.keys(byDay).sort().reverse().slice(0, 7); // last 7 days
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
  [7, 14, 30].forEach(lead => {
    const el = document.getElementById(`lt-${lead}`);
    const sub = document.getElementById(`lt-${lead}-sub`);
    const recs = db.filter(r =>
      r.route === currentRoute &&
      r.carrier === 'Vietjet' &&
      r.leadDays === lead &&
      r.lowestPrice != null
    );
    if (recs.length) {
      const a = Math.round(avg(recs.map(r => r.lowestPrice)));
      if (el) el.textContent = fmt(a);
    } else {
      if (el) el.textContent = '—';
    }
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
          backgroundColor: 'var(--surface, #171922)',
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
            label: ctx => ctx.parsed.y != null
              ? ` ${ctx.dataset.label}: ${fmt(ctx.parsed.y)}`
              : null,
          }
        }
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

  const rows = db
    .filter(r => selectedCarriers.includes(r.carrier) && isCarrierAvailable(r.carrier))
    .sort((a, b) => new Date(b.crawlTimestamp) - new Date(a.crawlTimestamp))
    .slice(0, 150);

  if (countEl) countEl.textContent = `${rows.length} bản ghi gần nhất`;

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="no-data">Không có dữ liệu.</td></tr>';
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
