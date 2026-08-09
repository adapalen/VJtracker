// Vietnamese Male Demographic & Statistical Engine (GSO, MOH, WHO, iSEE, IDC, VAMM, VAMA, MOC, VNREA & MOLISA 2026 Simulation)

const TOTAL_MALE_POPULATION = 35200000; // Total VN males aged 18-60 = 100% baseline
const TRONG_DONG_STADIUM_SEATS = 135000; // Trống Đồng Stadium Capacity
const GRID_SEAT_DOTS = 1350; // 1,350 seat dots grid (1 dot = 100 seats)

// DOM Elements
const htmlElement = document.documentElement;
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const themeText = document.getElementById('theme-text');

// Sound Toggle DOM Elements & State
const soundToggleBtn = document.getElementById('sound-toggle');
const soundIcon = document.getElementById('sound-icon');
const soundText = document.getElementById('sound-text');
let isSoundEnabled = localStorage.getItem('sound_enabled') !== 'false';

// Sub-Page Navigation Tabs & Views
const navTabs = document.querySelectorAll('.nav-tab');
const subpageViews = document.querySelectorAll('.subpage-view');

const ageMinInput = document.getElementById('age-min');
const ageMaxInput = document.getElementById('age-max');
const ageDisplay = document.getElementById('age-display');

const heightInput = document.getElementById('height-slider');
const heightDisplay = document.getElementById('height-display');
const heightPresets = document.getElementById('height-presets');

const weightSelect = document.getElementById('weight-select');
const bmiValDisplay = document.getElementById('bmi-val-display');
const bmiStatusDesc = document.getElementById('bmi-status-desc');
const bmiMockeryBox = document.getElementById('bmi-mockery-box');
const mockeryText = document.getElementById('mockery-text');
const mockeryIcon = document.getElementById('mockery-icon');

const salaryInput = document.getElementById('salary-slider');
const salaryDisplay = document.getElementById('salary-display');
const salaryPresets = document.getElementById('salary-presets');

const eduRadios = document.querySelectorAll('input[name="education"]');
const jobSelect = document.getElementById('job-select');
const vehicleRadios = document.querySelectorAll('input[name="vehicle"]');
const houseRadios = document.querySelectorAll('input[name="house"]');
const regionRadios = document.querySelectorAll('input[name="region"]');
const religionRadios = document.querySelectorAll('input[name="religion"]');
const ethnicityRadios = document.querySelectorAll('input[name="ethnicity"]');
const orientationRadios = document.querySelectorAll('input[name="orientation"]');
const smokeRadios = document.querySelectorAll('input[name="smoke"]');
const drinkRadios = document.querySelectorAll('input[name="drink"]');

const toggleIphone = document.getElementById('toggle-iphone');
const toggleSingle = document.getElementById('toggle-single');

const percentageVal = document.getElementById('percentage-val');
const countVal = document.getElementById('count-val');

const meterBar = document.getElementById('meter-bar');
const delusionScoreText = document.getElementById('delusion-score-text');

const verdictBox = document.getElementById('verdict-box');
const verdictBadge = document.getElementById('verdict-badge');
const verdictTitle = document.getElementById('verdict-title');
const verdictDesc = document.getElementById('verdict-desc');

const stadiumSeatBadge = document.getElementById('stadium-seat-badge');
const ovalSeatsRing = document.getElementById('oval-seats-ring');
const stadiumSatireText = document.getElementById('stadium-satire-text');

const btnReset = document.getElementById('btn-reset');
const btnShare = document.getElementById('btn-share');
const btnCopyLink = document.getElementById('btn-copy-link');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

const resultsSection = document.getElementById('results-section');
const mobileBarPct = document.getElementById('mobile-bar-pct');
const mobileBarLabel = document.getElementById('mobile-bar-label');
const mobileBarJumpBtn = document.getElementById('mobile-bar-jump');

// Modal Elements
const delusionModalOverlay = document.getElementById('delusion-modal-overlay');
const btnCloseModal = document.getElementById('btn-close-modal');
const floatingEmojisContainer = document.getElementById('floating-emojis');

let breakdownChart = null;
let modalHasBeenTriggered = false; // Prevent repetitive popup modal spam while tweaking
let ovalDotElements = []; // Store references for fast color updates

// ============================================================
// Section Router — the four former sub-pages live in this page now
// ============================================================
const SECTIONS = ['thuoc-do', 'so-keo', 'thong-ke', 'thuoc-chua'];
let currentSection = 'thuoc-do';

function showSection(id, { updateHash = true } = {}) {
    if (!SECTIONS.includes(id)) id = SECTIONS[0];
    currentSection = id;

    subpageViews.forEach(view => view.classList.toggle('active-view', view.id === id));
    navTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.target === id));

    if (updateHash && window.location.hash.slice(1) !== id) {
        history.replaceState(null, '', '#' + id);
    }

    // Chart.js bakes width/height onto the canvas when the chart is constructed.
    // Built inside a display:none section it locks to 0x0 and no later resize()
    // recovers it — so charts are created lazily on first reveal, and only
    // resized on subsequent ones.
    const revealCharts = () => {
        if (id === 'thuoc-do') {
            if (breakdownChart) breakdownChart.resize();
            else renderUI();
        }
        if (id === 'so-keo') {
            if (skRadarChart) skRadarChart.resize();
            else skRender();
        }
    };
    revealCharts();
    requestAnimationFrame(revealCharts);

    syncMobileBar();
    // 'instant', not 'auto': 'auto' defers to html{scroll-behavior:smooth} and
    // switching tabs would glide down the old section instead of jumping.
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (window.lucide) lucide.createIcons();
}

function initRouter() {
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => showSection(tab.dataset.target));
    });

    // In-copy links such as the "thử So Kèo Bản Thân" prescription
    document.querySelectorAll('[data-jump]').forEach(el => {
        el.addEventListener('click', event => {
            event.preventDefault();
            showSection(el.dataset.jump);
        });
    });

    window.addEventListener('hashchange', () => {
        showSection(window.location.hash.slice(1), { updateHash: false });
    });

    showSection(window.location.hash.slice(1) || SECTIONS[0], { updateHash: false });
}

// Mobile summary bar mirrors whichever calculator is on screen
let lastCalcPct = '100%';
let lastSkRank = '—';

function syncMobileBar() {
    const bar = document.getElementById('mobile-result-bar');
    if (!bar) return;

    const onCalc = currentSection === 'thuoc-do';
    const onSoKeo = currentSection === 'so-keo';

    // '' hands control back to the stylesheet, which only shows the bar ≤760px
    bar.style.display = (onCalc || onSoKeo) ? '' : 'none';
    if (!onCalc && !onSoKeo) return;

    if (mobileBarLabel) mobileBarLabel.textContent = onSoKeo ? 'Bạn thuộc nhóm' : 'Đáp ứng tiêu chuẩn';
    if (mobileBarPct) mobileBarPct.textContent = onSoKeo ? lastSkRank : lastCalcPct;
}

// Theme Switcher Handler
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    });
}

function initSound() {
    if (!soundToggleBtn) return;
    setSoundState(isSoundEnabled);

    soundToggleBtn.addEventListener('click', () => {
        isSoundEnabled = !isSoundEnabled;
        localStorage.setItem('sound_enabled', isSoundEnabled ? 'true' : 'false');
        setSoundState(isSoundEnabled);
        if (isSoundEnabled) {
            playChaChing();
        }
    });
}

function setSoundState(enabled) {
    if (!soundIcon || !soundText) return;
    if (enabled) {
        soundText.textContent = 'Âm thanh: Bật';
        soundIcon.setAttribute('data-lucide', 'volume-2');
    } else {
        soundText.textContent = 'Âm thanh: Tắt';
        soundIcon.setAttribute('data-lucide', 'volume-x');
    }
    if (window.lucide) lucide.createIcons();
}

function setTheme(theme) {
    htmlElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    if (theme === 'light') {
        themeText.textContent = 'Giao diện Tối';
        themeIcon.setAttribute('data-lucide', 'moon');
    } else {
        themeText.textContent = 'Giao diện Sáng';
        themeIcon.setAttribute('data-lucide', 'sun');
    }
    if (window.lucide) lucide.createIcons();

    restyleCharts();
}

// Charts read their colours from the same CSS tokens as everything else,
// so a theme switch never leaves them stranded on the old palette.
function cssVar(name) {
    return getComputedStyle(htmlElement).getPropertyValue(name).trim();
}

function chartPalette() {
    return {
        tick: cssVar('--ink-3'),
        label: cssVar('--ink-2'),
        grid: cssVar('--line'),
        accent: cssVar('--accent'),
        gold: cssVar('--gold'),
        danger: cssVar('--danger'),
        surface: cssVar('--surface')
    };
}

function restyleCharts() {
    const p = chartPalette();

    if (breakdownChart) {
        breakdownChart.options.scales.x.ticks.color = p.label;
        breakdownChart.options.scales.y.ticks.color = p.tick;
        breakdownChart.options.scales.y.grid.color = p.grid;
        breakdownChart.data.datasets[0].backgroundColor = p.accent;
        breakdownChart.data.datasets[0].borderColor = p.accent;
        breakdownChart.update('none');
    }

    if (skRadarChart) {
        const scale = skRadarChart.options.scales.r;
        scale.ticks.color = p.tick;
        scale.grid.color = p.grid;
        scale.angleLines.color = p.grid;
        scale.pointLabels.color = p.label;
        const ds = skRadarChart.data.datasets[0];
        ds.borderColor = p.accent;
        ds.pointBackgroundColor = p.accent;
        ds.pointBorderColor = p.surface;
        skRadarChart.update('none');
    }
}

// Normal Distribution Error Function approximation for Height CDF
function erf(x) {
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = (x < 0) ? -1 : 1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
}

// Height Probability (mean = 168.5 cm, std = 6.2 cm)
function getHeightProbability(minHeight) {
    if (minHeight <= 150) return 1.0;
    if (minHeight >= 195) return 0.0001;

    const mean = 168.5;
    const std = 6.2;
    const z = (minHeight - mean) / (std * Math.sqrt(2));
    const probAbove = 0.5 * (1 - erf(z));
    return Math.max(0.0001, Math.min(1.0, probAbove));
}

// Weight Probability in 5kg Intervals for VN Men (mean = 63.5 kg, std = 7.8 kg)
function getWeightIntervalProbability(val) {
    switch(val) {
        case 'under_50': return 0.0418;    // Dưới 50 kg (~4.2%)
        case '50_55': return 0.0988;       // 50 - 55 kg (~9.9%)
        case '55_60': return 0.1843;       // 55 - 60 kg (~18.4%)
        case '60_65': return 0.2458;       // 60 - 65 kg (~24.6% - Phổ biến nhất)
        case '65_70': return 0.2195;       // 65 - 70 kg (~22.0%)
        case '70_75': return 0.1309;       // 70 - 75 kg (~13.1%)
        case '75_80': return 0.0522;       // 75 - 80 kg (~5.2%)
        case '80_85': return 0.0139;       // 80 - 85 kg (~1.4%)
        case '85_90': return 0.0025;       // 85 - 90 kg (~0.25%)
        case 'above_90': return 0.0004;    // Trên 90 kg (~0.04%)
        case 'any':
        default: return 1.0;               // Bất kỳ = 100%
    }
}

// Get average weight in kg for selected 5kg interval range
function getAverageWeightForRange(val) {
    switch(val) {
        case 'under_50': return 47.5;
        case '50_55': return 52.5;
        case '55_60': return 57.5;
        case '60_65': return 62.5;
        case '65_70': return 67.5;
        case '70_75': return 72.5;
        case '75_80': return 77.5;
        case '80_85': return 82.5;
        case '85_90': return 87.5;
        case 'above_90': return 95.0;
        case 'any':
        default: return null; // Unspecified weight
    }
}

// Salary Probability
function getSalaryProbability(minSalary) {
    if (minSalary <= 0) return 1.0;
    if (minSalary <= 5) return 0.85;
    if (minSalary <= 10) return 0.45;
    if (minSalary <= 15) return 0.28;
    if (minSalary <= 20) return 0.16;
    if (minSalary <= 30) return 0.085;
    if (minSalary <= 50) return 0.032;
    if (minSalary <= 100) return 0.008;
    return 0.0025;
}

// Education Level Probability (Minimum requirement cumulative)
function getEduProbability(eduValue) {
    switch(eduValue) {
        case 'thpt': return 0.85;        // THPT trở lên (~85%)
        case 'bachelor': return 0.276;    // Cử nhân/CĐ trở lên (~27.6%)
        case 'master': return 0.0315;     // Thạc sĩ trở lên (~3.15%)
        case 'phd': return 0.0035;        // Tiến sĩ (~0.35%)
        case 'any':
        default: return 1.0;
    }
}

// Job / Occupation Probability (GSO Q1-2026 & MOLISA Data)
function getJobProbability(val) {
    switch(val) {
        case 'unemployed': return 0.022;           // Thất nghiệp (~2.2%)
        case 'police': return 0.014;               // Công an Nhân dân (~1.4%)
        case 'army': return 0.018;                 // Quân đội Nhân dân (~1.8%)
        case 'doctor': return 0.011;               // Bác sĩ / Y tế (~1.1%)
        case 'lawyer': return 0.0045;              // Luật sư / Pháp lý (~0.45%)
        case 'teacher': return 0.021;              // Giáo viên / Giảng viên (~2.1%)
        case 'it': return 0.019;                   // Kỹ sư IT (~1.9%)
        case 'finance': return 0.016;              // Tài chính / Ngân hàng (~1.6%)
        case 'pilot_aviation': return 0.0012;      // Phi công / Hàng không (~0.12%)
        case 'engineer_construction': return 0.032;// Kỹ sư Xây dựng (~3.2%)
        case 'ceo': return 0.022;                  // Doanh nhân / CEO (~2.2%)
        case 'civil_servant': return 0.045;        // Công chức nhà nước (~4.5%)
        case 'freelance_gig': return 0.068;        // Tài xế công nghệ / Freelancer (~6.8%)
        case 'factory_worker': return 0.685;       // Công nhân / Lao động phổ thông (~68.5%)
        case 'any':
        default: return 1.0;                       // Bất kỳ nghề nghiệp nào = 100%
    }
}

// Vehicle Ownership Hierarchy (Minimum requirement cumulative)
function getVehicleProbability(val) {
    switch(val) {
        case 'wave_sirius': return 0.982;       // Xe số Wave trở lên (98.2%)
        case 'future_jupiter': return 0.602;    // Xe số cao cấp Future trở lên (60.2%)
        case 'vision_ab': return 0.412;         // Tay ga tầm trung AB/Vision trở lên (41.2%)
        case 'sh_vespa': return 0.192;          // Tay ga cao cấp SH/Vespa trở lên (19.2%)
        case 'pkl': return 0.137;               // Mô tô PKL trở lên (13.7%)
        case 'car_hatchback_a': return 0.125;   // Ô tô Hạng A trở lên (12.5%)
        case 'car_sedan_bc': return 0.116;      // Ô tô Sedan B-C trở lên (11.6%)
        case 'car_suv_bc': return 0.098;        // SUV B-C trở lên (9.8%)
        case 'car_suv_de': return 0.086;        // SUV D-E trở lên (8.6%)
        case 'car_luxury_mid': return 0.079;    // Ô tô Hạng Sang trở lên (7.9%)
        case 'car_superluxury': return 0.0005;  // Siêu xe trở lên (0.05%)
        case 'any':
        default: return 1.0;                    // Bất kỳ / Không yêu cầu = 100%
    }
}

// Multi-tier House & Real Estate Ownership (Minimum requirement cumulative)
function getHouseProbability(val) {
    switch(val) {
        case 'apartment_budget': return 0.105;  // Chung cư phổ thông trở lên (10.5%)
        case 'apartment_luxury': return 0.063;  // Chung cư cao cấp trở lên (6.3%)
        case 'grounded_alley': return 0.035;    // Nhà đất ngõ nhỏ trở lên (3.5%)
        case 'street_front': return 0.010;      // Nhà mặt phố trở lên (1.0%)
        case 'mansion_villa': return 0.002;     // Biệt thự đơn lập (0.2%)
        case 'any':
        default: return 1.0;                    // Bất kỳ / Không yêu cầu BĐS = 100%
    }
}

// iPhone Ownership Probability (IDC & Statcounter)
function getIphoneProbability(isRequired) {
    if (!isRequired) return 1.0;
    return 0.33; // ~33.0% iOS market share in VN
}

// Regional / Provincial Male Distribution Probability (GSO 2024-2026 Data)
function getRegionProbability(val) {
    switch(val) {
        case 'hanoi': return 0.085;    // Nghìn năm văn hiến (HN ~8.5%)
        case 'hcm': return 0.097;      // Hào sảng (HCM ~9.7%)
        case 'province': return 0.818; // Tỉnh lẻ / Tỉnh khác (~81.8%)
        case 'any':
        default: return 1.0;           // Toàn quốc = 100%
    }
}

// Religion Probability
function getReligionProbability(val) {
    switch(val) {
        case 'none': return 0.863;
        case 'buddhism': return 0.048;
        case 'catholic': return 0.061;
        case 'any':
        default: return 1.0;
    }
}

// Ethnicity Probability
function getEthnicityProbability(val) {
    switch(val) {
        case 'kinh': return 0.853;
        case 'minority': return 0.147;
        case 'any':
        default: return 1.0;
    }
}

// Sexual Orientation Probability
function getOrientationProbability(val) {
    if (val === 'straight') return 0.95;
    if (val === 'lgbt') return 0.05;
    return 1.0;
}

// Smoking Habit Probability
function getSmokeProbability(val) {
    if (val === 'no_smoke') return 0.577;
    if (val === 'smoke') return 0.423;
    return 1.0; // 'any'
}

// Drinking Habit Probability
function getDrinkProbability(val) {
    if (val === 'no_drink') return 0.230;
    if (val === 'drink') return 0.770;
    return 1.0; // 'any'
}

// Single rate based on age span
function getSingleProbability(ageMin, ageMax, isRequired) {
    if (!isRequired) return 1.0;
    const avgAge = (ageMin + ageMax) / 2;
    if (avgAge <= 22) return 0.92;
    if (avgAge <= 28) return 0.62;
    if (avgAge <= 35) return 0.28;
    if (avgAge <= 45) return 0.12;
    return 0.05;
}

// Dynamic Decimal Formatter
function formatPercentage(val) {
    if (val === 0) return '0';
    if (val >= 99.9) return '100';
    if (val >= 10) return val.toFixed(2);
    if (val >= 1) return val.toFixed(3);
    if (val >= 0.01) return val.toFixed(4);
    if (val >= 0.0001) return val.toFixed(5);
    return val.toFixed(6);
}

// Build 1,350 Seat Dots in Pure Concentric Oval Rings
function initOvalStadiumSeats() {
    if (!ovalSeatsRing) return;
    ovalSeatsRing.innerHTML = '';
    ovalDotElements = [];

    const numRings = 15; // 15 concentric oval rings from inner to outer
    const dotsPerRing = Math.floor(GRID_SEAT_DOTS / numRings); // 90 dots per ring

    for (let r = 0; r < numRings; r++) {
        const rx = 10 + r * 2.5; // % width radius (from 10% to 45%)
        const ry = 8 + r * 2.55;  // % height radius (from 8% to 43.7%)

        for (let i = 0; i < dotsPerRing; i++) {
            const angle = (i / dotsPerRing) * 2 * Math.PI;
            const x = 50 + rx * Math.cos(angle);
            const y = 50 + ry * Math.sin(angle);

            const dot = document.createElement('div');
            dot.className = 'oval-dot-cell';
            dot.style.left = `${x.toFixed(2)}%`;
            dot.style.top = `${y.toFixed(2)}%`;

            ovalSeatsRing.appendChild(dot);
            ovalDotElements.push(dot);
        }
    }
}

// Calculate total combined match percentage
function calculateMatches() {
    const ageMin = parseInt(ageMinInput.value);
    const ageMax = parseInt(ageMaxInput.value);
    const minHeight = parseInt(heightInput.value);
    const weightVal = weightSelect.value;
    const minSalary = parseFloat(salaryInput.value);

    let regionValue = 'any';
    regionRadios.forEach(r => { if (r.checked) regionValue = r.value; });

    let eduValue = 'any';
    eduRadios.forEach(r => { if (r.checked) eduValue = r.value; });

    let jobValue = jobSelect.value;

    let vehicleValue = 'any';
    vehicleRadios.forEach(r => { if (r.checked) vehicleValue = r.value; });

    let houseValue = 'any';
    houseRadios.forEach(r => { if (r.checked) houseValue = r.value; });

    let religionValue = 'any';
    religionRadios.forEach(r => { if (r.checked) religionValue = r.value; });

    let ethnicityValue = 'any';
    ethnicityRadios.forEach(r => { if (r.checked) ethnicityValue = r.value; });

    let orientationValue = 'any';
    orientationRadios.forEach(r => { if (r.checked) orientationValue = r.value; });

    let smokeValue = 'any';
    smokeRadios.forEach(r => { if (r.checked) smokeValue = r.value; });

    let drinkValue = 'any';
    drinkRadios.forEach(r => { if (r.checked) drinkValue = r.value; });

    const reqIphone = toggleIphone.checked;
    const reqSingle = toggleSingle.checked;

    // Age span ratio: (ageMax - ageMin + 1) / 43 years (18 to 60)
    const ageSpanProb = (ageMin <= 18 && ageMax >= 60) ? 1.0 : Math.max(0.02, (ageMax - ageMin + 1) / 43);

    const heightProb = getHeightProbability(minHeight);
    const weightProb = getWeightIntervalProbability(weightVal);
    const salaryProb = getSalaryProbability(minSalary);
    const eduProb = getEduProbability(eduValue);
    const jobProb = getJobProbability(jobValue);
    const vehicleProb = getVehicleProbability(vehicleValue);
    const houseProb = getHouseProbability(houseValue);
    const iphoneProb = getIphoneProbability(reqIphone);
    const regionProb = getRegionProbability(regionValue);
    const religionProb = getReligionProbability(religionValue);
    const ethnicityProb = getEthnicityProbability(ethnicityValue);
    const orientationProb = getOrientationProbability(orientationValue);
    const smokeProb = getSmokeProbability(smokeValue);
    const drinkProb = getDrinkProbability(drinkValue);
    const singleProb = getSingleProbability(ageMin, ageMax, reqSingle);

    let totalProb = ageSpanProb * heightProb * weightProb * salaryProb * eduProb * jobProb * vehicleProb *
                    houseProb * iphoneProb * regionProb * religionProb * ethnicityProb * orientationProb *
                    smokeProb * drinkProb * singleProb;

    // Check if ALL choices are 'any' / baseline
    const isAllAny = (ageMin <= 18 && ageMax >= 60) &&
                     minHeight <= 150 &&
                     weightVal === 'any' &&
                     minSalary <= 0 &&
                     eduValue === 'any' &&
                     jobValue === 'any' &&
                     vehicleValue === 'any' &&
                     houseValue === 'any' &&
                     regionValue === 'any' &&
                     religionValue === 'any' &&
                     ethnicityValue === 'any' &&
                     orientationValue === 'any' &&
                     smokeValue === 'any' &&
                     drinkValue === 'any' &&
                     !reqIphone &&
                     !reqSingle;

    if (isAllAny) {
        totalProb = 1.0;
    } else {
        totalProb = Math.min(1.0, totalProb);
    }

    let percent = totalProb * 100;
    let estimatedCount = Math.round(totalProb * TOTAL_MALE_POPULATION);

    if (percent < 0.000001 && !isAllAny) {
        percent = 0;
        estimatedCount = 0;
    }

    return {
        percent,
        estimatedCount,
        breakdown: {
            age: ageSpanProb * 100,
            height: heightProb * 100,
            weight: weightProb * 100,
            salary: salaryProb * 100,
            region: regionProb * 100,
            edu: eduProb * 100,
            job: jobProb * 100,
            vehicle: vehicleProb * 100,
            house: houseProb * 100,
            iphone: iphoneProb * 100,
            religion: religionProb * 100,
            ethnicity: ethnicityProb * 100,
            orientation: orientationProb * 100,
            smoke: smokeProb * 100,
            drink: drinkProb * 100,
            single: singleProb * 100
        }
    };
}

// Satirical verdict. Colours come from the theme tokens so both themes hold up.
function getSatiricalVerdict(percent, estimatedCount) {
    let verdict;

    if (estimatedCount === 0 || percent === 0) {
        verdict = {
            meterPercent: 100,
            scoreText: 'Độ khó: không tồn tại',
            badge: 'KHÔNG CÓ AI',
            title: 'Chúc mừng, bạn vừa xoá sổ cả nước',
            desc: 'Cả 35,2 triệu nam giới Việt Nam không có nổi một người lọt qua bộ lọc này. Không phải hiếm — là bằng không.',
            color: cssVar('--danger'),
            isZero: true
        };
    } else if (percent >= 90) {
        verdict = {
            meterPercent: 5,
            scoreText: 'Độ khó: gần như bằng không',
            badge: 'HOÀN TOÀN THỰC TẾ',
            title: 'Tất cả nam giới Việt Nam',
            desc: 'Bộ lọc gần như chưa loại ai. Ra đầu ngõ vẫy tay là gặp, vấn đề còn lại chỉ là bạn có muốn hay không.',
            color: cssVar('--accent')
        };
    } else if (percent >= 35) {
        verdict = {
            meterPercent: 20,
            scoreText: 'Độ khó: thấp',
            badge: 'THỰC TẾ',
            title: 'Anh hàng xóm bình thường',
            desc: 'Tiêu chuẩn rất dễ chịu. Mẫu người này ngồi đầy ở mọi quán trà đá từ Bắc vào Nam.',
            color: cssVar('--accent')
        };
    } else if (percent >= 12) {
        verdict = {
            meterPercent: 40,
            scoreText: 'Độ khó: vừa phải',
            badge: 'HỢP LÝ',
            title: 'Mẫu bạn trai tiêu chuẩn',
            desc: 'Yêu cầu cân bằng: đủ chọn lọc để có ý nghĩa, đủ rộng để thực sự tìm được. Đây là vùng nên dừng lại.',
            color: cssVar('--info')
        };
    } else if (percent >= 2.5) {
        verdict = {
            meterPercent: 60,
            scoreText: 'Độ khó: cao',
            badge: 'CẠNH TRANH',
            title: 'Hàng hiếm của phố thị',
            desc: 'Cứ khoảng hai mươi tới bốn mươi người mới có một người phù hợp. Và bạn không phải người duy nhất đang tìm.',
            color: cssVar('--gold')
        };
    } else if (percent >= 0.4) {
        verdict = {
            meterPercent: 80,
            scoreText: 'Độ khó: rất cao',
            badge: 'CỰC HIẾM',
            title: 'Bạch mã hoàng tử trong truyền thuyết',
            desc: 'Vài trăm người mới có một. Ở mức này, phần lớn thời gian của bạn sẽ dành cho việc chờ đợi chứ không phải hẹn hò.',
            color: cssVar('--warn')
        };
    } else {
        verdict = {
            meterPercent: 95,
            scoreText: 'Độ khó: ảo tưởng',
            badge: 'GẦN NHƯ KHÔNG TỒN TẠI',
            title: 'Nhân vật chính phim ngôn tình',
            desc: 'Tỷ lệ gặp được thấp hơn trúng Vietlott. Thử bỏ đúng một tiêu chí xem con số nhảy thế nào.',
            color: cssVar('--danger')
        };
    }

    // Fewer than 100 people left country-wide deserves its own punchline
    if (estimatedCount > 0 && estimatedCount < 100) {
        verdict.desc = `Còn đúng ${estimatedCount.toLocaleString('vi-VN')} người trên cả nước. Nhiều khả năng họ đang trốn bạn.`;
    }

    return verdict;
}

// Update 1,350 Seat Dots on Oval Stadium Rings
function renderOvalStadiumSeatGrid(percent, estimatedCount) {
    if (ovalDotElements.length === 0) initOvalStadiumSeats();

    let matchedDots = Math.round((percent / 100) * GRID_SEAT_DOTS);
    if (percent > 0 && matchedDots === 0) matchedDots = 1;
    if (percent === 0 || estimatedCount === 0) matchedDots = 0;

    const estimatedSeats = Math.round((percent / 100) * TRONG_DONG_STADIUM_SEATS);
    stadiumSeatBadge.textContent = `${estimatedSeats.toLocaleString('vi-VN')} / 135.000 ghế`;

    let activeClass = 'active-emerald';
    if (percent < 0.1) activeClass = 'active-pink';
    else if (percent < 2.0) activeClass = 'active-gold';

    for (let i = 0; i < ovalDotElements.length; i++) {
        const dot = ovalDotElements[i];
        dot.className = 'oval-dot-cell';
        if (i < matchedDots) {
            dot.classList.add(activeClass);
        }
    }

    const seats = estimatedSeats.toLocaleString('vi-VN');
    let satireMsg;

    if (estimatedCount === 0 || percent === 0) {
        satireMsg = 'Cả sân tắt đèn. Không sáng nổi một ghế trên tổng số 135.000 chỗ.';
    } else if (percent >= 99.9) {
        satireMsg = 'Sân đầy kín 135.000 chỗ. Bộ lọc của bạn về cơ bản chưa loại ai cả.';
    } else if (percent < 0.1) {
        satireMsg = `Đúng ${seats} ghế sáng giữa một sân vận động trống. Muốn tìm ra thì phải soi từng hàng.`;
    } else if (percent < 1.0) {
        satireMsg = `Khoảng ${seats} ghế sáng — vừa đủ một góc khán đài VIP, không hơn.`;
    } else if (percent < 10.0) {
        satireMsg = `Khoảng ${seats} ghế sáng, tức là một khán đài nhỏ trong sân. Hiếm, nhưng vẫn có thật.`;
    } else {
        satireMsg = `Khoảng ${seats} ghế sáng. Sân vẫn còn rất đông — tiêu chuẩn của bạn đang rộng mở.`;
    }

    stadiumSatireText.textContent = satireMsg;
}

// ============================================================
// Web Audio API Sound Effects Engine
// ============================================================
let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

// Slider tick: subtle click for slider drag feedback
function playSliderTick(intensity) {
    if (!isSoundEnabled) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800 + intensity * 400, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
    } catch (e) {}
}

// Cha-ching: cash register sound for luxury/high-value selections
function playChaChing() {
    if (!isSoundEnabled) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        [880, 1320, 1760].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.07);
            gain.gain.setValueAtTime(0.18, now + i * 0.07);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.25);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.07);
            osc.stop(now + i * 0.07 + 0.25);
        });
    } catch (e) {}
}

// Thunder zap: dramatic impact for extreme requirements
function playThunderZap() {
    if (!isSoundEnabled) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const bufferSize = ctx.sampleRate * 0.3;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        source.connect(gain);
        gain.connect(ctx.destination);
        source.start(now);
    } catch (e) {}
}

// Cricket chirp: lonely void sound for tiny percentages
function playCricketChirp() {
    if (!isSoundEnabled) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        for (let i = 0; i < 3; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(4000, now + i * 0.15);
            osc.frequency.setValueAtTime(3600, now + i * 0.15 + 0.05);
            gain.gain.setValueAtTime(0.08, now + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.1);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.15);
            osc.stop(now + i * 0.15 + 0.1);
        }
    } catch (e) {}
}

// Clown Honk: two-stage HONK HONK for 0% delusional result
function playClownHonkSound() {
    if (!isSoundEnabled) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        playSingleHonk(ctx, now, 320, 0.18);
        playSingleHonk(ctx, now + 0.22, 420, 0.25);
    } catch (e) {
        console.warn('Audio play error:', e);
    }
}

function playSingleHonk(ctx, startTime, freq, duration) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, startTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.75, startTime + duration);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.4, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
}

// Siren: WEE-WOO emergency delusion siren
function playSirenSound() {
    if (!isSoundEnabled) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime + 0.42;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const sweepDuration = 0.30;
        const sweeps = 4;
        const lowFreq = 520;
        const highFreq = 1150;
        for (let i = 0; i < sweeps; i++) {
            const t = now + i * sweepDuration;
            if (i % 2 === 0) {
                osc.frequency.setValueAtTime(lowFreq, t);
                osc.frequency.linearRampToValueAtTime(highFreq, t + sweepDuration);
            } else {
                osc.frequency.setValueAtTime(highFreq, t);
                osc.frequency.linearRampToValueAtTime(lowFreq, t + sweepDuration);
            }
        }
        const totalDuration = sweeps * sweepDuration;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.04);
        gain.gain.setValueAtTime(0.3, now + totalDuration - 0.08);
        gain.gain.linearRampToValueAtTime(0.001, now + totalDuration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + totalDuration);
    } catch (e) {
        console.warn('Siren play error:', e);
    }
}

// Trigger 0% Delusion Overdrive Modal with Bouncing Emojis, Screen Shake & Sound Effects
function triggerZeroDelusionOverdrive() {
    if (modalHasBeenTriggered) return;
    modalHasBeenTriggered = true;

    // Trigger Screen Shake Effect
    document.body.classList.add('delusion-shake');
    setTimeout(() => {
        document.body.classList.remove('delusion-shake');
    }, 600);

    // Populate Floating Bouncing Emojis in Modal
    floatingEmojisContainer.innerHTML = '';
    const emojiList = ['🤪', '😜', '🤡', '🐈', '🐈‍⬛', '💸', '💔', '⚡', '💣'];
    for (let i = 0; i < 14; i++) {
        const item = document.createElement('span');
        item.className = 'floating-emoji-item';
        item.textContent = emojiList[i % emojiList.length];
        item.style.left = `${Math.random() * 80 + 5}%`;
        item.style.top = `${Math.random() * 70 + 10}%`;
        item.style.animationDelay = `${(i * 0.2).toFixed(1)}s`;
        floatingEmojisContainer.appendChild(item);
    }

    // Show Modal Overlay
    delusionModalOverlay.classList.remove('hidden');

    // Play Clown Honk & Siren Mockery Sound Effects
    playClownHonkSound();
    playSirenSound();

    // Explosive Confetti Cannon
    if (window.confetti) {
        confetti({ particleCount: 50, spread: 100, origin: { y: 0.5 } });
    }
}

function hideDelusionModal() {
    delusionModalOverlay.classList.add('hidden');
}

// Animated Counter Update
let animatedPercent = 100;
function animateValue(targetVal) {
    if (targetVal === 0) {
        percentageVal.textContent = '0';
        animatedPercent = 0;
        return;
    }

    const duration = 400;
    const startVal = animatedPercent;
    const startTime = performance.now();

    // Same reasoning as skAnimateRank: land the real value before animating.
    percentageVal.textContent = formatPercentage(targetVal);

    function update(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const current = startVal + (targetVal - startVal) * progress;

        percentageVal.textContent = formatPercentage(current);
        animatedPercent = current;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    requestAnimationFrame(update);
}

// Chart.js Breakdown Bar Chart
function updateChart(breakdown) {
    const chartElem = document.getElementById('breakdown-chart');
    if (!chartElem) return;

    // Same hidden-container caveat as the So Kèo radar (see skRenderRadar)
    if (!breakdownChart && !chartElem.parentElement.clientWidth) return;

    const ctx = chartElem.getContext('2d');
    const p = chartPalette();

    const labels = ['Tuổi', 'Cao', 'Nặng', 'Lương', 'Khu vực', 'Học vấn', 'Nghề', 'Xe', 'Nhà', 'iPhone', 'Tôn giáo', 'Dân tộc', 'Tính dục', 'Thuốc', 'Rượu', 'Độc thân'];
    const data = [
        breakdown.age,
        breakdown.height,
        breakdown.weight,
        breakdown.salary,
        breakdown.region,
        breakdown.edu,
        breakdown.job,
        breakdown.vehicle,
        breakdown.house,
        breakdown.iphone,
        breakdown.religion,
        breakdown.ethnicity,
        breakdown.orientation,
        breakdown.smoke,
        breakdown.drink,
        breakdown.single
    ];

    if (breakdownChart) {
        breakdownChart.data.datasets[0].data = data;
        breakdownChart.update();
        return;
    }

    // One colour for every bar: the comparison is between heights, not hues.
    breakdownChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '% đạt tiêu chí',
                data: data,
                backgroundColor: p.accent,
                borderColor: p.accent,
                borderWidth: 0,
                borderRadius: 3,
                maxBarThickness: 22
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 300 },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: context => `Đạt tiêu chí: ${formatPercentage(context.parsed.y)}%`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { color: p.tick, font: { size: 10 }, callback: value => value + '%' },
                    grid: { color: p.grid, drawTicks: false },
                    border: { display: false }
                },
                x: {
                    ticks: { color: p.label, font: { size: 9 }, maxRotation: 60, minRotation: 45 },
                    grid: { display: false },
                    border: { display: false }
                }
            }
        }
    });
}

// Core Update Function
function renderUI() {
    let ageMin = parseInt(ageMinInput.value);
    let ageMax = parseInt(ageMaxInput.value);
    if (ageMin > ageMax) {
        if (this === ageMinInput) ageMaxInput.value = ageMin;
        else ageMinInput.value = ageMax;
        ageMin = parseInt(ageMinInput.value);
        ageMax = parseInt(ageMaxInput.value);
    }
    ageDisplay.textContent = `${ageMin} – ${ageMax} tuổi`;

    const heightVal = parseInt(heightInput.value);
    heightDisplay.textContent = heightVal <= 150 ? 'Bất kỳ' : `≥ ${heightVal} cm`;
    updatePresetActive(heightPresets, heightVal);

    // Pure Vietnamese Auto BMI Calculation
    const selectedWeightVal = weightSelect.value;
    const avgWeightKg = getAverageWeightForRange(selectedWeightVal);

    if (avgWeightKg === null) {
        bmiValDisplay.textContent = '—';
        bmiStatusDesc.textContent = 'Chọn khoảng cân nặng để tính BMI.';
        bmiMockeryBox.classList.add('hidden');
    } else {
        const selectedHeightM = (heightVal <= 150 ? 168.5 : heightVal) / 100;
        const bmiScore = avgWeightKg / (selectedHeightM * selectedHeightM);

        bmiValDisplay.textContent = bmiScore.toFixed(1);

        let bmiStatusText;
        if (bmiScore < 18.5) bmiStatusText = 'Gầy';
        else if (bmiScore < 23.0) bmiStatusText = 'Cân đối';
        else if (bmiScore < 25.0) bmiStatusText = 'Thừa cân';
        else bmiStatusText = 'Béo phì';

        const heightNote = heightVal <= 150 ? ' (tính theo chiều cao trung bình 168,5 cm)' : '';
        bmiStatusDesc.textContent = bmiStatusText + heightNote;

        if (bmiScore < 18.5) {
            mockeryText.textContent = 'Tiêu chuẩn này gầy hơn cả mức khuyến nghị của WHO đấy.';
            bmiMockeryBox.classList.remove('hidden');
        } else if (bmiScore >= 25.0) {
            mockeryText.textContent = 'Thế m đã nhìn lại mình chưa?';
            bmiMockeryBox.classList.remove('hidden');
        } else {
            bmiMockeryBox.classList.add('hidden');
        }
    }

    const salaryVal = parseFloat(salaryInput.value);
    salaryDisplay.textContent = salaryVal === 0 ? 'Bất kỳ' : `≥ ${salaryVal} Tr`;
    updatePresetActive(salaryPresets, salaryVal);

    [regionRadios, eduRadios, vehicleRadios, houseRadios, religionRadios, ethnicityRadios, orientationRadios, smokeRadios, drinkRadios].forEach(group => {
        group.forEach(radio => {
            const card = radio.closest('.radio-card');
            if (card) {
                if (radio.checked) card.classList.add('active');
                else card.classList.remove('active');
            }
        });
    });

    const result = calculateMatches();

    animateValue(result.percent);
    countVal.textContent = result.estimatedCount.toLocaleString('vi-VN');

    lastCalcPct = `${formatPercentage(result.percent)}%`;
    if (currentSection === 'thuoc-do') syncMobileBar();

    const verdict = getSatiricalVerdict(result.percent, result.estimatedCount);
    meterBar.style.width = `${verdict.meterPercent}%`;
    meterBar.style.backgroundColor = verdict.color;
    delusionScoreText.textContent = verdict.scoreText;
    delusionScoreText.style.color = verdict.color;

    verdictBadge.textContent = verdict.badge;
    verdictBadge.style.color = verdict.color;
    verdictBox.style.borderLeftColor = verdict.color;
    verdictTitle.textContent = verdict.title;
    verdictDesc.textContent = verdict.desc;

    renderOvalStadiumSeatGrid(result.percent, result.estimatedCount);

    if (verdict.isZero) {
        triggerZeroDelusionOverdrive();
    } else {
        modalHasBeenTriggered = false;
        hideDelusionModal();
    }

    updateChart(result.breakdown);
}

// Preset Chip Active State Helper
function updatePresetActive(container, val) {
    const chips = container.querySelectorAll('.chip');
    chips.forEach(chip => {
        if (parseFloat(chip.dataset.val) === val) chip.classList.add('active');
        else chip.classList.remove('active');
    });
}

// Event Listeners Setup
function initListeners() {
    ageMinInput.addEventListener('input', () => {
        playSliderTick((parseInt(ageMinInput.value) - 18) / 42);
        renderUI();
    });
    ageMaxInput.addEventListener('input', () => {
        playSliderTick((parseInt(ageMaxInput.value) - 18) / 42);
        renderUI();
    });
    heightInput.addEventListener('input', () => {
        const val = parseInt(heightInput.value);
        playSliderTick((val - 150) / 40);
        if (val >= 180) playThunderZap();
        renderUI();
    });

    weightSelect.addEventListener('change', renderUI);
    salaryInput.addEventListener('input', () => {
        const val = parseFloat(salaryInput.value);
        playSliderTick(val / 150);
        if (val >= 100) playThunderZap();
        renderUI();
    });

    jobSelect.addEventListener('change', renderUI);

    [...regionRadios, ...eduRadios, ...vehicleRadios, ...houseRadios, ...religionRadios, ...ethnicityRadios, ...orientationRadios, ...smokeRadios, ...drinkRadios].forEach(
        r => r.addEventListener('change', renderUI)
    );

    // Direct click handler for guaranteed cross-browser clickability.
    // Scoped to this section: So Kèo binds its own, and an unscoped query here
    // would tick the radio first and leave that handler with nothing to do.
    document.querySelectorAll('#thuoc-do .radio-card').forEach(card => {
        card.addEventListener('click', () => {
            const radio = card.querySelector('input[type="radio"]');
            if (radio && !radio.checked) {
                radio.checked = true;
                const val = radio.value;
                if (['car_luxury_mid', 'car_superluxury', 'street_front', 'mansion_villa'].includes(val)) {
                    playChaChing();
                    if (val === 'car_superluxury' || val === 'mansion_villa') {
                        playThunderZap();
                    }
                }
                renderUI();
            }
        });
    });

    toggleIphone.addEventListener('change', renderUI);
    toggleSingle.addEventListener('change', renderUI);

    heightPresets.addEventListener('click', (e) => {
        if (e.target.classList.contains('chip')) {
            const val = parseInt(e.target.dataset.val);
            heightInput.value = val;
            if (val >= 180) playThunderZap();
            renderUI();
        }
    });

    salaryPresets.addEventListener('click', (e) => {
        if (e.target.classList.contains('chip')) {
            const val = parseFloat(e.target.dataset.val);
            salaryInput.value = val;
            if (val >= 30) playChaChing();
            if (val >= 100) playThunderZap();
            renderUI();
        }
    });

    btnReset.addEventListener('click', resetToBaseline);
    btnCloseModal.addEventListener('click', () => {
        hideDelusionModal();
        resetToBaseline();
    });

    btnShare.addEventListener('click', shareResults);
    btnCopyLink.addEventListener('click', copyResultsSummary);

    if (mobileBarJumpBtn) {
        mobileBarJumpBtn.addEventListener('click', () => {
            const target = currentSection === 'so-keo'
                ? document.querySelector('#so-keo .results-col')
                : resultsSection;
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }
}

function resetToBaseline() {
    ageMinInput.value = 18;
    ageMaxInput.value = 60;
    heightInput.value = 150;
    weightSelect.value = 'any';
    salaryInput.value = 0;
    jobSelect.value = 'any';
    document.querySelector('input[name="region"][value="any"]').checked = true;
    document.querySelector('input[name="education"][value="any"]').checked = true;
    document.querySelector('input[name="vehicle"][value="any"]').checked = true;
    document.querySelector('input[name="house"][value="any"]').checked = true;
    document.querySelector('input[name="religion"][value="any"]').checked = true;
    document.querySelector('input[name="ethnicity"][value="any"]').checked = true;
    document.querySelector('input[name="orientation"][value="any"]').checked = true;
    document.querySelector('input[name="smoke"][value="any"]').checked = true;
    document.querySelector('input[name="drink"][value="any"]').checked = true;
    toggleIphone.checked = false;
    toggleSingle.checked = false;
    modalHasBeenTriggered = false;
    renderUI();
    showToast('Đã đặt lại về 100%');
}

// Link back to whichever section produced the result
function sectionUrl(section) {
    return `${location.origin}${location.pathname}#${section}`;
}

function buildResultsSummary() {
    return `Thước đo tiêu chuẩn bạn trai\n\n` +
        `• Tỷ lệ nam giới đáp ứng: ${percentageVal.textContent}%\n` +
        `• Ước tính: ~${countVal.textContent} người (18–60 tuổi)\n` +
        `• Đánh giá: ${verdictTitle.textContent}\n\n` +
        `Thử tiêu chuẩn của bạn: ${sectionUrl('thuoc-do')}`;
}

function copyText(text, okMessage) {
    if (!navigator.clipboard) {
        showToast('Trình duyệt không cho phép sao chép');
        return;
    }
    navigator.clipboard.writeText(text)
        .then(() => showToast(okMessage))
        .catch(() => showToast('Không sao chép được'));
}

function copyResultsSummary() {
    copyText(buildResultsSummary(), 'Đã sao chép kết quả');
}

// Native share sheet where it exists, clipboard everywhere else
function shareResults() {
    const text = buildResultsSummary();
    if (navigator.share) {
        navigator.share({ title: 'Cậu bị ngáo à?', text }).catch(() => {});
        return;
    }
    copyText(text, 'Đã sao chép — dán vào chỗ bạn muốn chia sẻ');
}

function showToast(msg) {
    toastMessage.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 2800);
}

// ============================================================
// So Kèo Bản Thân — the self-rating calculator
//
// Same data as the main tool, read the other way round: instead of "how many
// men clear your bar", it asks "how rare is this particular man". Scores are
// combined with a geometric mean so one genuine strength still lifts the whole
// board, which is the point the section is trying to make.
// ============================================================

let skRadarChart = null;
const sk = {};

function skCacheElements() {
    const id = x => document.getElementById(x);
    Object.assign(sk, {
        age: id('sk-age'), ageOut: id('sk-age-out'),
        height: id('sk-height'), heightOut: id('sk-height-out'),
        weight: id('sk-weight'), bmi: id('sk-bmi'),
        salary: id('sk-salary'), salaryOut: id('sk-salary-out'), salaryPresets: id('sk-salary-presets'),
        job: id('sk-job'),
        rank: id('sk-rank'), tier: id('sk-tier'), blurb: id('sk-blurb'),
        nudge: id('sk-nudge'), nudgeText: id('sk-nudge-text'),
        rarityFill: id('sk-rarity-fill'),
        bestName: id('sk-best-name'), bestPct: id('sk-best-pct'),
        worstName: id('sk-worst-name'), worstPct: id('sk-worst-pct'),
        breakdown: id('sk-breakdown'), summary: id('sk-summary'),
        copy: id('sk-copy'), challenge: id('sk-challenge'), reset: id('sk-reset'),
        edu: document.querySelectorAll('input[name="sk-edu"]'),
        vehicle: document.querySelectorAll('input[name="sk-vehicle"]'),
        house: document.querySelectorAll('input[name="sk-house"]'),
        region: document.querySelectorAll('input[name="sk-region"]'),
        noSmoke: id('sk-nosmoke'), noDrink: id('sk-nodrink'),
        iphone: id('sk-iphone'), single: id('sk-single')
    });
}

// "Top N%" — smaller is rarer, so these are the inverse of the main tool's odds
const SK_TOP = {
    edu:     { below_thpt: 100, thpt: 85, bachelor: 27.6, master: 3.15, phd: 0.35 },
    vehicle: { none: 100, wave_sirius: 98.2, future_jupiter: 60.2, vision_ab: 41.2, sh_vespa: 19.2,
               pkl: 13.7, car_hatchback_a: 12.5, car_sedan_bc: 11.6, car_suv_bc: 9.8,
               car_suv_de: 8.6, car_luxury_mid: 7.9, car_superluxury: 0.05 },
    house:   { none: 100, apartment_budget: 10.5, apartment_luxury: 6.3, grounded_alley: 3.5,
               street_front: 1.0, mansion_villa: 0.2 },
    job:     { unemployed: 97.8, factory_worker: 31.5, freelance_gig: 25, civil_servant: 20,
               teacher: 18, engineer_construction: 15, army: 13, police: 11, finance: 9,
               it: 7, doctor: 5, ceo: 3, lawyer: 2, pilot_aviation: 0.5 },
    region:  { province: 81.8, hanoi: 8.5, hcm: 9.7 }
};

function skHeightTop(h) {
    if (h <= 150) return 100;
    if (h >= 195) return 0.01;
    const z = (h - 168.5) / (6.2 * Math.SQRT2);
    return Math.max(0.01, Math.min(100, 0.5 * (1 - erf(z)) * 100));
}

function skSalaryTop(s) {
    if (s <= 0) return 100;
    if (s <= 5) return 85;
    if (s <= 10) return 45;
    if (s <= 15) return 28;
    if (s <= 20) return 16;
    if (s <= 30) return 8.5;
    if (s <= 50) return 3.2;
    if (s <= 100) return 0.8;
    return 0.25;
}

const SK_TIERS = [
    { max: 0.5, key: 'S', label: 'Hạng S · siêu hiếm', meter: 97 },
    { max: 2,   key: 'A', label: 'Hạng A · cực hiếm',  meter: 87 },
    { max: 8,   key: 'B', label: 'Hạng B · rất tốt',   meter: 71 },
    { max: 20,  key: 'C', label: 'Hạng C · khá',       meter: 50 },
    { max: 50,  key: 'D', label: 'Hạng D · trung bình', meter: 28 },
    { max: Infinity, key: 'E', label: 'Hạng E · phổ biến', meter: 10 }
];

function skTierFor(composite) {
    return SK_TIERS.find(t => composite <= t.max);
}

function skRadio(list, fallback) {
    let value = fallback;
    list.forEach(r => { if (r.checked) value = r.value; });
    return value;
}

function skLabelOf(list, value) {
    const el = Array.from(list).find(r => r.value === value);
    return el ? el.closest('.radio-card').querySelector('span').textContent : '—';
}

function skCompute() {
    const age = parseInt(sk.age.value);
    const height = parseInt(sk.height.value);
    const salary = parseFloat(sk.salary.value);
    const job = sk.job.value;
    const edu = skRadio(sk.edu, 'below_thpt');
    const vehicle = skRadio(sk.vehicle, 'none');
    const house = skRadio(sk.house, 'none');
    const region = skRadio(sk.region, 'province');

    const cats = [
        { name: 'Chiều cao',      value: `${height} cm`, topPct: skHeightTop(height) },
        { name: 'Thu nhập',       value: salary === 0 ? 'Chưa có' : `${salary} Tr/tháng`, topPct: skSalaryTop(salary) },
        { name: 'Học vấn',        value: skLabelOf(sk.edu, edu),         topPct: SK_TOP.edu[edu] ?? 100 },
        { name: 'Nghề nghiệp',    value: sk.job.options[sk.job.selectedIndex].text, topPct: SK_TOP.job[job] ?? 50 },
        { name: 'Phương tiện',    value: skLabelOf(sk.vehicle, vehicle), topPct: SK_TOP.vehicle[vehicle] ?? 100 },
        { name: 'Bất động sản',   value: skLabelOf(sk.house, house),     topPct: SK_TOP.house[house] ?? 100 },
        { name: 'Khu vực',        value: skLabelOf(sk.region, region),   topPct: SK_TOP.region[region] ?? 100 }
    ];

    if (sk.noSmoke.checked) cats.push({ name: 'Không hút thuốc', value: 'Không hút', topPct: 57.7 });
    if (sk.noDrink.checked) cats.push({ name: 'Không rượu bia',  value: 'Không uống', topPct: 23.0 });
    if (sk.iphone.checked)  cats.push({ name: 'Dùng iPhone',     value: 'iOS', topPct: 33.0 });
    if (sk.single.checked) {
        const p = age <= 22 ? 92 : age <= 28 ? 62 : age <= 35 ? 28 : age <= 45 ? 12 : 5;
        cats.push({ name: 'Độc thân', value: 'Đang độc thân', topPct: p });
    }

    // Geometric mean: a single outstanding score still moves the needle,
    // which an arithmetic mean would flatten away.
    const product = cats.reduce((acc, c) => acc * c.topPct, 1);
    return { cats, composite: Math.pow(product, 1 / cats.length) };
}

function skBlurbFor(tierKey, composite, best) {
    const t = composite.toFixed(1);
    switch (tierKey) {
        case 'S': return `Top ${t}%. Trong 35,2 triệu người, rất ít hồ sơ chạm được mức này.`;
        case 'A': return `Top ${t}%. Điểm sáng nhất của bạn là ${best.name.toLowerCase()}.`;
        case 'B': return `Top ${t}%. Bạn vượt phần lớn nam giới cùng lứa, rõ nhất ở ${best.name.toLowerCase()}.`;
        case 'C': return `Top ${t}%. Trên trung bình, và còn dư địa để lên hạng B.`;
        case 'D': return `Top ${t}%. Đúng mức trung bình của cả nước.`;
        default:  return `Top ${t}%. Hồ sơ phổ biến — mọi thứ đều bắt đầu từ đâu đó.`;
    }
}

function skRenderBreakdown(cats) {
    sk.breakdown.innerHTML = '';
    [...cats].sort((a, b) => a.topPct - b.topPct).forEach(cat => {
        const p = cat.topPct;
        const grade = p <= 1 ? 'S' : p <= 5 ? 'A' : p <= 15 ? 'B' : p <= 35 ? 'C' : p <= 65 ? 'D' : 'E';
        const row = document.createElement('div');
        row.className = 'sk-row';
        row.innerHTML =
            `<span class="name">${cat.name}</span>` +
            `<span class="rule"></span>` +
            `<span class="pct">${p >= 99.5 ? 'Phổ biến' : 'Top ' + p.toFixed(1) + '%'}</span>` +
            `<span class="grade">${grade}</span>`;
        sk.breakdown.appendChild(row);
    });
}

function skRenderRadar(cats) {
    const canvas = document.getElementById('sk-radar-chart');
    if (!canvas) return;

    // Don't construct while the section is hidden: the chart would be stuck at
    // 0x0 forever. showSection calls skRender again once the section is shown.
    if (!skRadarChart && !canvas.parentElement.clientWidth) return;

    const labels = cats.map(c => c.name);
    const data = cats.map(c => Math.max(0, Math.min(100, 100 - c.topPct)));

    if (skRadarChart) {
        skRadarChart.data.labels = labels;
        skRadarChart.data.datasets[0].data = data;
        skRadarChart.update();
        return;
    }

    const p = chartPalette();
    skRadarChart = new Chart(canvas.getContext('2d'), {
        type: 'radar',
        data: {
            labels,
            datasets: [{
                label: 'Độ hiếm',
                data,
                backgroundColor: 'transparent',
                borderColor: p.accent,
                borderWidth: 1.5,
                pointBackgroundColor: p.accent,
                pointBorderColor: p.surface,
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 300 },
            plugins: { legend: { display: false } },
            scales: {
                r: {
                    min: 0, max: 100,
                    ticks: { stepSize: 25, color: p.tick, backdropColor: 'transparent', font: { size: 9 } },
                    grid: { color: p.grid },
                    angleLines: { color: p.grid },
                    pointLabels: { color: p.label, font: { size: 10 } }
                }
            }
        }
    });
}

let skDisplayed = 0;
let skCountupFrame = null;

function skAnimateRank(target) {
    if (skCountupFrame) cancelAnimationFrame(skCountupFrame);
    const start = skDisplayed;
    const diff = target - start;
    const startTime = performance.now();

    // Write the destination first: rAF is paused while the tab is hidden, and
    // the number must still be correct for anyone reading the DOM before then.
    sk.rank.textContent = `Top ${target.toFixed(1)}%`;

    function tick(now) {
        const progress = Math.min((now - startTime) / 320, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        sk.rank.textContent = `Top ${(start + diff * eased).toFixed(1)}%`;
        if (progress < 1) {
            skCountupFrame = requestAnimationFrame(tick);
        } else {
            skDisplayed = target;
            sk.rank.textContent = `Top ${target.toFixed(1)}%`;
            skCountupFrame = null;
        }
    }
    skCountupFrame = requestAnimationFrame(tick);
}

function skRender() {
    const age = parseInt(sk.age.value);
    const height = parseInt(sk.height.value);
    const salary = parseFloat(sk.salary.value);

    sk.ageOut.textContent = `${age} tuổi`;
    sk.heightOut.textContent = `${height} cm`;
    sk.salaryOut.textContent = salary === 0 ? 'Chưa có' : `${salary} Tr`;
    updatePresetActive(sk.salaryPresets, salary);

    const kg = getAverageWeightForRange(sk.weight.value);
    if (kg) {
        const bmi = kg / Math.pow(height / 100, 2);
        const status = bmi < 18.5 ? 'gầy' : bmi < 23 ? 'cân đối' : bmi < 25 ? 'thừa cân' : 'béo phì';
        sk.bmi.textContent = `${bmi.toFixed(1)} · ${status}`;
    } else {
        sk.bmi.textContent = '—';
    }

    document.querySelectorAll('#so-keo .radio-card').forEach(card => {
        const radio = card.querySelector('input[type="radio"]');
        if (radio) card.classList.toggle('active', radio.checked);
    });

    const { cats, composite } = skCompute();
    const tier = skTierFor(composite);
    const sorted = [...cats].sort((a, b) => a.topPct - b.topPct);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    skAnimateRank(composite);
    sk.tier.textContent = tier.label;
    sk.tier.className = `sk-tier ts-${tier.key}`;
    sk.blurb.textContent = skBlurbFor(tier.key, composite, best);
    sk.rarityFill.style.width = `${tier.meter}%`;

    // Distance to the next tier up, if there is one
    const nextTier = SK_TIERS.filter(t => t.max < composite).pop();
    if (nextTier) {
        sk.nudgeText.innerHTML =
            `Còn <b>${(composite - nextTier.max).toFixed(1)}%</b> nữa là lên ${nextTier.label.split(' · ')[0]}.`;
        sk.nudge.classList.add('show');
    } else {
        sk.nudge.classList.remove('show');
    }

    sk.bestName.textContent = best.name;
    sk.bestPct.textContent = best.topPct >= 99.5 ? 'Phổ biến' : `Top ${best.topPct.toFixed(1)}%`;
    sk.worstName.textContent = worst.name;
    sk.worstPct.textContent = worst.topPct >= 99.5 ? 'Phổ biến nhất' : `Top ${worst.topPct.toFixed(1)}%`;

    skRenderBreakdown(cats);
    skRenderRadar(cats);

    sk.summary.innerHTML = `Bạn thuộc <strong>Top ${composite.toFixed(1)}%</strong> · ${tier.label}`;

    lastSkRank = `Top ${composite.toFixed(1)}%`;
    if (currentSection === 'so-keo') syncMobileBar();
}

const SK_PROFILES = {
    freshman: { age: 23, height: 168, weight: '60_65', salary: 7.5, edu: 'bachelor', job: 'civil_servant',
                vehicle: 'wave_sirius', house: 'none', region: 'province',
                noSmoke: true, noDrink: false, iphone: false, single: true },
    office:   { age: 28, height: 170, weight: '65_70', salary: 15, edu: 'bachelor', job: 'finance',
                vehicle: 'vision_ab', house: 'none', region: 'hcm',
                noSmoke: false, noDrink: false, iphone: true, single: false },
    dev:      { age: 30, height: 172, weight: '70_75', salary: 40, edu: 'bachelor', job: 'it',
                vehicle: 'car_sedan_bc', house: 'apartment_budget', region: 'hcm',
                noSmoke: true, noDrink: true, iphone: true, single: true },
    boss:     { age: 42, height: 171, weight: '80_85', salary: 100, edu: 'master', job: 'ceo',
                vehicle: 'car_luxury_mid', house: 'mansion_villa', region: 'hanoi',
                noSmoke: true, noDrink: false, iphone: true, single: false }
};

function skApplyProfile(key) {
    const p = SK_PROFILES[key];
    if (!p) return;

    sk.age.value = p.age;
    sk.height.value = p.height;
    sk.weight.value = p.weight;
    sk.salary.value = p.salary;
    sk.job.value = p.job;

    const check = (name, value) => {
        const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
        if (el) el.checked = true;
    };
    check('sk-edu', p.edu);
    check('sk-vehicle', p.vehicle);
    check('sk-house', p.house);
    check('sk-region', p.region);

    sk.noSmoke.checked = p.noSmoke;
    sk.noDrink.checked = p.noDrink;
    sk.iphone.checked = p.iphone;
    sk.single.checked = p.single;

    skDisplayed = 0;
    skRender();
    showToast('Đã nạp hồ sơ mẫu');
}

function initSoKeo() {
    skCacheElements();
    if (!sk.age) return;

    [sk.age, sk.height, sk.salary].forEach(el => el.addEventListener('input', skRender));
    [sk.weight, sk.job].forEach(el => el.addEventListener('change', skRender));
    [...sk.edu, ...sk.vehicle, ...sk.house, ...sk.region].forEach(r => r.addEventListener('change', skRender));
    [sk.noSmoke, sk.noDrink, sk.iphone, sk.single].forEach(el => el.addEventListener('change', skRender));

    document.querySelectorAll('#so-keo .radio-card').forEach(card => {
        card.addEventListener('click', () => {
            const radio = card.querySelector('input[type="radio"]');
            if (radio && !radio.checked) {
                radio.checked = true;
                skRender();
            }
        });
    });

    sk.salaryPresets.addEventListener('click', event => {
        if (!event.target.classList.contains('chip')) return;
        sk.salary.value = event.target.dataset.val;
        skRender();
    });

    document.querySelectorAll('.sk-profile').forEach(btn => {
        btn.addEventListener('click', () => skApplyProfile(btn.dataset.profile));
    });

    sk.reset.addEventListener('click', () => {
        sk.age.value = 25;
        sk.height.value = 170;
        sk.weight.value = '60_65';
        sk.salary.value = 10;
        sk.job.value = 'factory_worker';
        document.querySelector('input[name="sk-edu"][value="below_thpt"]').checked = true;
        document.querySelector('input[name="sk-vehicle"][value="none"]').checked = true;
        document.querySelector('input[name="sk-house"][value="none"]').checked = true;
        document.querySelector('input[name="sk-region"][value="province"]').checked = true;
        sk.noSmoke.checked = sk.noDrink.checked = sk.iphone.checked = sk.single.checked = false;
        skDisplayed = 0;
        skRender();
        showToast('Đã đặt lại');
    });

    sk.copy.addEventListener('click', () => {
        copyText(
            `So kèo bản thân\n\n• ${sk.rank.textContent} nam giới Việt Nam\n• ${sk.tier.textContent}\n\n` +
            `Tự đo thử: ${sectionUrl('so-keo')}`,
            'Đã sao chép kết quả'
        );
    });

    sk.challenge.addEventListener('click', () => {
        copyText(
            `Tao thuộc ${sk.rank.textContent} nam giới Việt Nam. Mày được bao nhiêu?\n${sectionUrl('so-keo')}`,
            'Đã sao chép lời thách đấu'
        );
    });

    skRender();
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initSound();
    initOvalStadiumSeats();
    initListeners();
    renderUI();
    initSoKeo();
    initRouter();
    if (window.lucide) lucide.createIcons();
});
