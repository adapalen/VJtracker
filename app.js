// VietJet Flight Price Tracker Dashboard Logic
let flightDatabase = [];
let currentRoute = 'HAN-SGN';
let currentLeadTime = '7'; // 'all', '7', '14', '30'
let priceChart = null;

// Airport translation lookups
const airportNames = {
  'HAN': 'Hà Nội (HAN)',
  'SGN': 'TP. HCM (SGN)',
  'DAD': 'Đà Nẵng (DAD)',
  'CXR': 'Nha Trang (CXR)',
  'PQC': 'Phú Quốc (PQC)',
  'PXU': 'Pleiku (PXU)',
  'DLI': 'Đà Lạt (DLI)',
  'UIH': 'Quy Nhơn (UIH)',
  'HUI': 'Huế (HUI)',
  'VII': 'Vinh (VII)',
  'BMV': 'Buôn Ma Thuột (BMV)',
  'VCS': 'Côn Đảo (VCS)'
};

// Route connections matching scraper.js
const routeMap = {
  'HAN': ['SGN', 'DAD', 'CXR', 'PQC', 'PXU', 'DLI', 'UIH', 'HUI', 'VII', 'BMV', 'VCS'],
  'SGN': ['HAN', 'DAD', 'CXR', 'PQC', 'PXU', 'DLI', 'UIH', 'HUI', 'VII', 'BMV', 'VCS'],
  'DAD': ['HAN', 'SGN'],
  'CXR': ['HAN', 'SGN'],
  'PQC': ['HAN', 'SGN'],
  'PXU': ['HAN', 'SGN'],
  'DLI': ['HAN', 'SGN'],
  'UIH': ['HAN', 'SGN'],
  'HUI': ['HAN', 'SGN'],
  'VII': ['HAN', 'SGN'],
  'BMV': ['HAN', 'SGN'],
  'VCS': ['HAN', 'SGN']
};

// HSL color configurations for lines
const routeColors = {
  'HAN-SGN': { border: '#ff3c6b', bg: 'rgba(255, 60, 107, 0.1)' },
  'SGN-HAN': { border: '#00e676', bg: 'rgba(0, 230, 118, 0.1)' },
  'HAN-PXU': { border: '#ffd600', bg: 'rgba(255, 214, 0, 0.1)' },
  'PXU-HAN': { border: '#00b0ff', bg: 'rgba(0, 176, 255, 0.1)' }
};

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  await loadDatabase();
  initDashboard();
});

// Theme Management (Light/Dark Mode)
function initTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  if (!themeToggle) return;

  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
  } else {
    document.body.classList.remove('light-theme');
    themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
  }

  themeToggle.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    themeToggle.innerHTML = isLight ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    
    // Dynamically update chart styling
    updateChartTheme();
  });
}

function getChartColors() {
  const isLight = document.body.classList.contains('light-theme');
  return {
    text: isLight ? '#4a4d5c' : '#a0a5c0',
    grid: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.05)'
  };
}

function updateChartTheme() {
  if (!priceChart) return;
  const colors = getChartColors();
  priceChart.options.plugins.legend.labels.color = colors.text;
  priceChart.options.scales.x.ticks.color = colors.text;
  priceChart.options.scales.x.grid.color = colors.grid;
  priceChart.options.scales.y.ticks.color = colors.text;
  priceChart.options.scales.y.grid.color = colors.grid;
  priceChart.update();
}

// Fetch database json file
async function loadDatabase() {
  try {
    const res = await fetch('flights_db.json');
    if (!res.ok) throw new Error('Không tìm thấy tệp cơ sở dữ liệu');
    flightDatabase = await res.json();
    console.log(`Đã tải thành công ${flightDatabase.length} bản ghi.`);
  } catch (err) {
    console.warn("Không thể tải flights_db.json, đang tải dữ liệu mô phỏng:", err.message);
    flightDatabase = generateMockData();
  }
}

// Format number to VND currency
function formatVND(num) {
  if (num === null || num === undefined) return 'N/A';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
}

// Format ISO string to readable local time (GMT+7)
function formatDateTime(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleString('vi-VN', { 
    dateStyle: 'short', 
    timeStyle: 'short', 
    timeZone: 'Asia/Ho_Chi_Minh' 
  });
}

function initDashboard() {
  populateDestinations('HAN');
  updateLastUpdated();
  updateStatsCards();
  renderChart();
  renderTable();
}

function updateLastUpdated() {
  const el = document.getElementById('last-updated').querySelector('span');
  if (flightDatabase.length === 0) {
    el.innerText = 'Lần quét cuối: Chưa có dữ liệu';
    return;
  }
  
  // Find latest crawl timestamp
  const timestamps = flightDatabase.map(r => new Date(r.crawlTimestamp));
  const latest = new Date(Math.max(...timestamps));
  el.innerText = `Lần quét cuối: ${formatDateTime(latest.toISOString())}`;
}

// Calculate recommendations and update stat cards dynamically based on currentRoute
function updateStatsCards() {
  const routeRecords = flightDatabase.filter(r => r.route === currentRoute && r.lowestPrice !== null);
  
  const valLatest = document.getElementById('val-latest-price');
  const descLatest = document.getElementById('desc-latest-price');
  const valAvg = document.getElementById('val-avg-price');
  const valMin = document.getElementById('val-min-price');
  const descMin = document.getElementById('desc-min-price');
  
  const valRec = document.getElementById('val-recommendation');
  const badgeRec = document.getElementById('badge-rec');
  const descRec = document.getElementById('desc-recommendation');
  const iconRec = document.getElementById('icon-rec');

  if (routeRecords.length === 0) {
    if (valLatest) valLatest.innerText = 'K/A';
    if (valAvg) valAvg.innerText = 'K/A';
    if (valMin) valMin.innerText = 'K/A';
    if (valRec) valRec.innerText = 'Đang tính toán...';
    return;
  }
  
  // Sort by crawlTimestamp descending
  routeRecords.sort((a, b) => new Date(b.crawlTimestamp) - new Date(a.crawlTimestamp));
  const latestRecord = routeRecords[0];
  const latestPrice = latestRecord.lowestPrice;
  
  // Calculate average
  const prices = routeRecords.map(r => r.lowestPrice);
  const avgPrice = Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length);
  
  // Calculate min
  const minPrice = Math.min(...prices);
  const minRecords = routeRecords.filter(r => r.lowestPrice === minPrice);
  const minRecord = minRecords[minRecords.length - 1]; // oldest min run
  
  // Update values
  if (valLatest) valLatest.innerText = formatVND(latestPrice);
  if (descLatest) descLatest.innerText = `Mua trước ${latestRecord.leadDays} ngày (${latestRecord.departureDate})`;
  
  if (valAvg) valAvg.innerText = formatVND(avgPrice);
  
  if (valMin) valMin.innerText = formatVND(minPrice);
  if (descMin) descMin.innerText = `Ghi nhận lúc: ${formatDateTime(minRecord.crawlTimestamp)}`;
  
  // Recommendations
  if (iconRec) iconRec.className = 'fa-solid trend-icon ';
  if (badgeRec) badgeRec.className = 'recommendation-badge ';
  
  if (latestPrice < avgPrice * 0.97) {
    if (iconRec) iconRec.classList.add('fa-arrow-trend-down', 'green');
    if (badgeRec) {
      badgeRec.classList.add('buy');
      badgeRec.innerText = 'MUA NGAY';
    }
    const diffPercent = Math.round(((avgPrice - latestPrice) / avgPrice) * 100);
    if (valRec) valRec.innerText = 'Thời điểm vàng!';
    if (descRec) descRec.innerText = `Thấp hơn trung bình ${diffPercent}%`;
  } else if (latestPrice > avgPrice * 1.03) {
    if (iconRec) iconRec.classList.add('fa-arrow-trend-up', 'red');
    if (badgeRec) {
      badgeRec.classList.add('wait');
      badgeRec.innerText = 'CHỜ THÊM';
    }
    const diffPercent = Math.round(((latestPrice - avgPrice) / avgPrice) * 100);
    if (valRec) valRec.innerText = 'Nên chờ thêm';
    if (descRec) descRec.innerText = `Cao hơn trung bình ${diffPercent}%`;
  } else {
    if (iconRec) iconRec.classList.add('fa-equals', 'yellow');
    if (badgeRec) {
      badgeRec.classList.add('buy');
      badgeRec.innerText = 'MUA NGAY';
    }
    if (valRec) valRec.innerText = 'Giá vé bình ổn';
    if (descRec) descRec.innerText = 'Mức giá ngang giá trung bình';
  }
}

function setRoute(route) {
  currentRoute = route;
  const [origin, dest] = route.split('-');

  // Sync origin dropdown if changed externally
  const originSelect = document.getElementById('origin-select');
  if (originSelect && originSelect.value !== origin) {
    originSelect.value = origin;
    populateDestinations(origin);
  }

  // Sync destination dropdown if changed externally
  const destSelect = document.getElementById('dest-select');
  if (destSelect && destSelect.value !== dest) {
    destSelect.value = dest;
  }

  updateStatsCards();
  renderChart();
}

function populateDestinations(origin) {
  const destSelect = document.getElementById('dest-select');
  if (!destSelect) return;
  destSelect.innerHTML = '';
  
  const allowedDests = routeMap[origin] || [];
  allowedDests.forEach(dest => {
    const opt = document.createElement('option');
    opt.value = dest;
    opt.innerText = airportNames[dest] || dest;
    destSelect.appendChild(opt);
  });
}

function onOriginChange(origin) {
  populateDestinations(origin);
  const destSelect = document.getElementById('dest-select');
  if (destSelect) {
    const dest = destSelect.value;
    setRoute(`${origin}-${dest}`);
  }
}

function onDestChange(dest) {
  const originSelect = document.getElementById('origin-select');
  if (originSelect) {
    const origin = originSelect.value;
    setRoute(`${origin}-${dest}`);
  }
}

function setLeadTime(val) {
  currentLeadTime = val;
  renderChart();
}

// Render line chart showing trends
function renderChart() {
  const ctx = document.getElementById('priceChart').getContext('2d');
  
  // Filter data for active route and lead time
  let filtered = flightDatabase.filter(r => r.route === currentRoute && r.lowestPrice !== null);
  if (currentLeadTime !== 'all') {
    const days = parseInt(currentLeadTime, 10);
    filtered = filtered.filter(r => r.leadDays === days);
  }
  
  // Sort by crawlTimestamp ascending
  filtered.sort((a, b) => new Date(a.crawlTimestamp) - new Date(b.crawlTimestamp));
  
  const labels = filtered.map(r => formatDateTime(r.crawlTimestamp));
  const prices = filtered.map(r => r.lowestPrice);
  
  // Destroy old chart instance if exists
  if (priceChart) {
    priceChart.destroy();
  }
  
  const colors = routeColors[currentRoute] || routeColors['HAN-SGN'];
  const themeColors = getChartColors();
  
  priceChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: `Giá thấp nhất chặng ${currentRoute} (VND)`,
        data: prices,
        borderColor: colors.border,
        backgroundColor: colors.bg,
        borderWidth: 3,
        pointBackgroundColor: colors.border,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: themeColors.text,
            font: { family: 'Outfit', size: 13 }
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          titleFont: { family: 'Outfit', size: 13 },
          bodyFont: { family: 'Outfit', size: 13 }
        }
      },
      scales: {
        x: {
          grid: { color: themeColors.grid },
          ticks: { color: themeColors.text, font: { family: 'Outfit', size: 11 } }
        },
        y: {
          grid: { color: themeColors.grid },
          ticks: { 
            color: themeColors.text, 
            font: { family: 'Outfit', size: 11 },
            callback: function(value) {
              return value.toLocaleString('vi-VN') + ' ₫';
            }
          }
        }
      }
    }
  });
}

// Populate the log data table
function renderTable() {
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';
  
  if (flightDatabase.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="no-data">Không tìm thấy dữ liệu chuyến bay nào.</td></tr>`;
    return;
  }
  
  // Sort by crawlTimestamp descending and limit to latest 100 entries for performance
  const sorted = [...flightDatabase].sort((a, b) => new Date(b.crawlTimestamp) - new Date(a.crawlTimestamp)).slice(0, 100);
  
  sorted.forEach(r => {
    const tr = document.createElement('tr');
    
    // Format flights summary
    let flightsSummary = 'Không có';
    if (r.allFlights && r.allFlights.length > 0) {
      flightsSummary = r.allFlights.slice(0, 3).map(f => `${f.departureTime} (${formatVND(f.price)})`).join(', ');
      if (r.allFlights.length > 3) flightsSummary += ` (+${r.allFlights.length - 3} chuyến khác)`;
    }
    
    tr.innerHTML = `
      <td>${formatDateTime(r.crawlTimestamp)}</td>
      <td><strong>${r.route}</strong></td>
      <td>${r.departureDate}</td>
      <td>Mua trước ${r.leadDays} ngày</td>
      <td style="color: var(--text-primary); font-weight: 600;">${r.lowestPrice ? formatVND(r.lowestPrice) : 'N/A'}</td>
      <td style="color: var(--text-secondary); font-size: 0.85rem;">${flightsSummary}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Mock Data Generator for presentation when database is empty
function generateMockData() {
  console.log("Đang sinh dữ liệu mô phỏng...");
  const data = [];
  const routes = ['HAN-SGN', 'SGN-HAN', 'HAN-PXU', 'PXU-HAN'];
  const leadTimes = [7, 14, 30];
  const now = new Date();
  
  // Generate 15 runs over the past 5 days (3 runs/day)
  for (let i = 14; i >= 0; i--) {
    const crawlTime = new Date(now.getTime() - i * 8 * 60 * 60 * 1000); // 8 hours intervals
    
    routes.forEach(route => {
      leadTimes.forEach(lead => {
        // Base price calculation
        let basePrice = route.includes('PXU') ? 1200000 : 1800000;
        // Fluctuations based on lead time and random factors
        let leadModifier = lead === 7 ? 1.2 : lead === 14 ? 1.0 : 0.85;
        let randomFactor = 1 + (Math.sin(i / 2) * 0.08) + (Math.random() * 0.03);
        let finalPrice = Math.round(basePrice * leadModifier * randomFactor);
        
        // Generate mock flights list
        const flights = [];
        const times = ['06:00 AM', '10:20 AM', '03:05 PM', '08:45 PM'];
        times.forEach((time, index) => {
          flights.push({
            carrier: 'Vietjet',
            departureTime: time,
            duration: route.includes('PXU') ? '1 hr 35 min' : '2 hr 10 min',
            price: Math.round(finalPrice * (1 + index * 0.03))
          });
        });
        
        flights.sort((a,b) => a.price - b.price);
        
        data.push({
          crawlTimestamp: crawlTime.toISOString(),
          route: route,
          departureDate: new Date(crawlTime.getTime() + lead * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          leadDays: lead,
          carrier: 'Vietjet',
          lowestPrice: flights[0].price,
          allFlights: flights
        });
      });
    });
  }
  return data;
}
