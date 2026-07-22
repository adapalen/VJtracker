// Vietnamese Male Demographic & Statistical Engine (GSO, MOH, WHO, iSEE, IDC, VAMM, VAMA, MOC, VNREA & MOLISA 2026 Simulation)

const TOTAL_MALE_POPULATION = 35200000; // Total VN males aged 18-60 = 100% baseline
const TRONG_DONG_STADIUM_SEATS = 135000; // Trống Đồng Stadium Capacity
const GRID_SEAT_DOTS = 1350; // 1,350 seat dots grid (1 dot = 100 seats)

// DOM Elements
const htmlElement = document.documentElement;
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const themeText = document.getElementById('theme-text');

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

// Modal Elements
const delusionModalOverlay = document.getElementById('delusion-modal-overlay');
const btnCloseModal = document.getElementById('btn-close-modal');
const floatingEmojisContainer = document.getElementById('floating-emojis');

let breakdownChart = null;
let modalHasBeenTriggered = false; // Prevent repetitive popup modal spam while tweaking
let ovalDotElements = []; // Store references for fast color updates

// Sub-Page Navigation Switcher
function initSubpageNavigation() {
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.dataset.target;
            
            navTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            subpageViews.forEach(view => {
                if (view.id === targetId) {
                    view.classList.add('active-view');
                } else {
                    view.classList.remove('active-view');
                }
            });

            // Re-render icons if needed
            if (window.lucide) lucide.createIcons();
        });
    });
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

    if (breakdownChart) {
        const isDark = theme === 'dark';
        breakdownChart.options.scales.x.ticks.color = isDark ? '#cbd5e1' : '#475569';
        breakdownChart.options.scales.y.ticks.color = isDark ? '#9ca3af' : '#64748b';
        breakdownChart.update();
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

// Calculate total combined match percentage using Bayesian sequential update
function calculateMatches() {
    const ageMin = parseInt(ageMinInput.value);
    const ageMax = parseInt(ageMaxInput.value);
    const minHeight = parseInt(heightInput.value);
    const weightVal = weightSelect.value;
    const minSalary = parseFloat(salaryInput.value);
    
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

    // Individual module probabilities
    const probs = {
        age: (ageMin <= 18 && ageMax >= 60) ? 1.0 : Math.max(0.02, (ageMax - ageMin + 1) / 43),
        height: getHeightProbability(minHeight),
        weight: getWeightIntervalProbability(weightVal),
        salary: getSalaryProbability(minSalary),
        edu: getEduProbability(eduValue),
        job: getJobProbability(jobValue),
        vehicle: getVehicleProbability(vehicleValue),
        house: getHouseProbability(houseValue),
        iphone: getIphoneProbability(reqIphone),
        religion: getReligionProbability(religionValue),
        ethnicity: getEthnicityProbability(ethnicityValue),
        orientation: getOrientationProbability(orientationValue),
        smoke: getSmokeProbability(smokeValue),
        drink: getDrinkProbability(drinkValue),
        single: getSingleProbability(ageMin, ageMax, reqSingle)
    };

    // Overall Bayesian joint probability across all criteria
    let totalProb = probs.age * probs.height * probs.weight * probs.salary * probs.edu * probs.job * 
                    probs.vehicle * probs.house * probs.iphone * probs.religion * probs.ethnicity * 
                    probs.orientation * probs.smoke * probs.drink * probs.single;
    
    // Check if ALL choices are 'any' / baseline
    const isAllAny = (ageMin <= 18 && ageMax >= 60) &&
                     minHeight <= 150 &&
                     weightVal === 'any' &&
                     minSalary <= 0 &&
                     eduValue === 'any' &&
                     jobValue === 'any' &&
                     vehicleValue === 'any' &&
                     houseValue === 'any' &&
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

    // Get current module order from DOM (First element = Prior variable)
    const currentOrder = getModuleOrder();

    // Map ordered breakdown for Chart.js
    const orderedBreakdown = [];
    currentOrder.forEach(modId => {
        switch(modId) {
            case 'age':
                orderedBreakdown.push({ label: 'Tuổi', val: probs.age * 100 });
                break;
            case 'height':
                orderedBreakdown.push({ label: 'Cao', val: probs.height * 100 });
                break;
            case 'weight':
                orderedBreakdown.push({ label: 'Nặng', val: probs.weight * 100 });
                break;
            case 'salary':
                orderedBreakdown.push({ label: 'Lương', val: probs.salary * 100 });
                break;
            case 'job':
                orderedBreakdown.push({ label: 'Nghề nghiệp', val: probs.job * 100 });
                break;
            case 'vehicle':
                orderedBreakdown.push({ label: 'Phương tiện', val: probs.vehicle * 100 });
                break;
            case 'house':
                orderedBreakdown.push({ label: 'BĐS / Nhà', val: probs.house * 100 });
                break;
            case 'education':
                orderedBreakdown.push({ label: 'Học vấn', val: probs.edu * 100 });
                break;
            case 'religion':
                orderedBreakdown.push({ label: 'Tôn giáo', val: probs.religion * 100 });
                break;
            case 'ethnicity':
                orderedBreakdown.push({ label: 'Dân tộc', val: probs.ethnicity * 100 });
                break;
            case 'orientation':
                orderedBreakdown.push({ label: 'Tính dục', val: probs.orientation * 100 });
                break;
            case 'lifestyle':
                orderedBreakdown.push({ label: 'Thuốc', val: probs.smoke * 100 });
                orderedBreakdown.push({ label: 'Rượu', val: probs.drink * 100 });
                break;
            case 'toggles':
                orderedBreakdown.push({ label: 'iPhone', val: probs.iphone * 100 });
                orderedBreakdown.push({ label: 'Độc thân', val: probs.single * 100 });
                break;
        }
    });

    return {
        percent,
        estimatedCount,
        orderedBreakdown
    };
}

// Satirical verdict generation with dating reality-check mockery
function getSatiricalVerdict(percent, estimatedCount) {
    let verdict;
    if (estimatedCount === 0 || percent === 0) {
        verdict = {
            meterPercent: 100,
            scoreText: 'Độ khó: ẢO TƯỞNG CỰC ĐẠI (0 NGƯỜI)',
            badge: '💔 0 NGƯỜI ĐẠT TIÊU CHUẨN',
            title: 'M BỊ NGÁO RỒI! 🤪',
            desc: 'M bị ngáo rồi! Tiêu chuẩn của m ảo tưởng đến mức cả 35.2 triệu nam giới Việt Nam không có nổi 1 người đáp ứng được. Tỉnh mộng ngay em ơi!',
            color: '#ef4444',
            isZero: true
        };
    } else if (percent >= 90) {
        verdict = {
            meterPercent: 5,
            scoreText: 'Độ khó: 0% (TẤT CẢ NAM GIỚI)',
            badge: '💚 100% THỰC TẾ',
            title: 'Tất Cả Nam Giới Việt Nam (18 - 60 Tuổi)',
            desc: 'Yêu cầu quá dễ dãi! Toàn bộ 35.2 triệu nam giới Việt Nam đều sẵn sàng. Ra đầu ngõ vẫy tay nhẹ là có bạn trai ngay!',
            color: '#10b981'
        };
    } else if (percent >= 35) {
        verdict = {
            meterPercent: 20,
            scoreText: 'Độ khó: RẤT DỄ (Chàng Trai Bình Dân)',
            badge: '💚 THỰC TẾ & BÌNH DÂN',
            title: 'Chàng Trai Bình Dân Hàng Xóm',
            desc: 'Tiêu chuẩn vô cùng thực tế! Anh ấy xuất hiện ở mọi quán cà phê vỉa hè hay trà đá. Chỉ cần em mở lòng là chốt đơn!',
            color: '#10b981'
        };
    } else if (percent >= 12) {
        verdict = {
            meterPercent: 40,
            scoreText: 'Độ khó: HỢP LÝ (Mẫu Bạn Trai Tiêu Chuẩn)',
            badge: '💙 TIÊU CHUẨN HỢP LÝ',
            title: 'Mẫu Người Bạn Trai Tiêu Chuẩn',
            desc: 'Yêu cầu rất hợp lý và thực tế. Tỷ lệ cạnh tranh vừa phải, anh ấy hoàn toàn nằm trong tầm tay em đấy!',
            color: '#3b82f6'
        };
    } else if (percent >= 2.5) {
        verdict = {
            meterPercent: 60,
            scoreText: 'Độ khó: KHÁ CAO (Cạnh Tranh Gay Gắt)',
            badge: '💛 HOÀNG TỬ PHỐ THỊ',
            title: 'Hotboy Phố Thị Thu Nhập Tốt',
            desc: 'Tiêu chuẩn tương đối cao! Mẫu nam giới này thu hút rất nhiều chị em. Muốn giữ chân anh ấy thì em phải có chiêu cực đỉnh!',
            color: '#f59e0b'
        };
    } else if (percent >= 0.4) {
        verdict = {
            meterPercent: 80,
            scoreText: 'Độ khó: CỰC CAO (Hiếm Như Vé Số)',
            badge: '🧡 BẠCH MÃ HOÀNG TỬ',
            title: 'Bạch Mã Hoàng Tử Trong Truyền Thuyết',
            desc: 'Vài trăm người mới có 1 người đáp ứng! Anh ấy đẹp trai, có điều kiện lại độc thân. Khuyên em chuẩn bị tinh thần cạnh tranh khốc liệt!',
            color: '#f97316'
        };
    } else {
        verdict = {
            meterPercent: 95,
            scoreText: 'Độ khó: ẢO TƯỞNG CỰC ĐẠI',
            badge: '💜 TỶ PHÚ NAM THẦN',
            title: 'CEO Tổng Tài Trong Phim Ngôn Tình',
            desc: 'Tỷ lệ gặp anh ấy còn khó hơn trúng Vietlott Jackpot! Lời khuyên chân thành: Hãy nuôi thêm 3 chú mèo hoặc giảm bớt tiêu chuẩn ngay!',
            color: '#a855f7'
        };
    }
    // Override description when fewer than 100 men meet the criteria
    if (estimatedCount > 0 && estimatedCount < 100) {
        verdict.desc = `Chắc ${estimatedCount.toLocaleString('vi-VN')} người này đang trốn khỏi m đó con ơi`;
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
    stadiumSeatBadge.textContent = `${estimatedSeats.toLocaleString('vi-VN')} / 135.000 chỗ phát sáng (${formatPercentage(percent)}%)`;

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

    // Satirical mockery commentary referencing Trống Đồng Stadium (135,000 seats)
    let satireMsg = '';
    if (estimatedCount === 0 || percent === 0) {
        satireMsg = '🚨 Cả vành đai Sân vận động Trống Đồng 135.000 khán giả tắt đèn tối thui! KHÔNG CÓ NỔI 1 NGƯỜI ĐỦ TIÊU CHUẨN ĐỂ LẤY ĐẦY 1 GHẾ! Tỉnh mộng ngay em ơi! 🤪';
    } else if (percent >= 99.9) {
        satireMsg = '✨ 135.000/135.000 ghế vành đai Sân Trống Đồng bừng sáng 100%! Yêu cầu dễ dãi như thế này thì chắc em chỉ cần ra đầu ngõ vẫy tay là có ngay!';
    } else if (percent < 0.1) {
        satireMsg = `🔥 Giữa 135.000 chỗ ngồi Sân Trống Đồng, chỉ có lơ thơ lăm ba ghế phát sáng (~${estimatedSeats} chỗ)! Muốn tìm anh ấy chắc em phải mang kính hiển vi đi soi!`;
    } else if (percent < 1.0) {
        satireMsg = `⚡ Sân Trống Đồng 135.000 ghế nhưng tiêu chuẩn của em chỉ lấp vừa 1 góc ban công VIP (~${estimatedSeats} chỗ)! Tỷ lệ chọi khốc liệt hơn cả mua vé concert!`;
    } else if (percent < 10.0) {
        satireMsg = `🌟 Anh ấy lấp đầy được 1 khán đài nhỏ trong Sân Trống Đồng (~${estimatedSeats.toLocaleString('vi-VN')} chỗ)! Hoàng tử trong mộng của em hiếm lắm đấy, chuẩn bị tuyệt chiêu giữ chân đi!`;
    } else {
        satireMsg = `💚 Khán đài Sân Trống Đồng bừng sáng sắc xanh với ~${estimatedSeats.toLocaleString('vi-VN')} chỗ phát sáng! Tiêu chuẩn của em rất rộng mở & thực tế!`;
    }

    stadiumSatireText.textContent = satireMsg;
}

// Trigger 0% Delusion Overdrive Modal with Bouncing Emojis & Screen Shake
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

// Chart.js Funnel Render (Renders bars according to Bayesian module order)
function updateChart(orderedBreakdown) {
    const chartElem = document.getElementById('breakdown-chart');
    if (!chartElem || !orderedBreakdown) return;
    const ctx = chartElem.getContext('2d');
    const isDark = htmlElement.getAttribute('data-theme') === 'dark';

    const labels = orderedBreakdown.map(item => item.label);
    const data = orderedBreakdown.map(item => item.val);

    if (breakdownChart) {
        breakdownChart.data.labels = labels;
        breakdownChart.data.datasets[0].data = data;
        breakdownChart.options.scales.x.ticks.color = isDark ? '#a6c4b2' : '#3d5e4d';
        breakdownChart.options.scales.y.ticks.color = isDark ? '#6d8e7c' : '#6c8a7b';
        breakdownChart.update();
        return;
    }

    breakdownChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '% Đạt tiêu chí',
                data: data,
                backgroundColor: [
                    'rgba(45, 106, 79, 0.75)',
                    'rgba(82, 183, 136, 0.75)',
                    'rgba(116, 198, 157, 0.75)',
                    'rgba(233, 196, 106, 0.75)',
                    'rgba(194, 142, 93, 0.75)',
                    'rgba(212, 163, 115, 0.75)',
                    'rgba(82, 183, 136, 0.75)',
                    'rgba(45, 106, 79, 0.75)',
                    'rgba(231, 111, 81, 0.75)',
                    'rgba(244, 162, 97, 0.75)',
                    'rgba(116, 198, 157, 0.75)',
                    'rgba(194, 142, 93, 0.75)',
                    'rgba(233, 196, 106, 0.75)',
                    'rgba(230, 57, 70, 0.75)',
                    'rgba(45, 106, 79, 0.75)'
                ],
                borderColor: [
                    '#2d6a4f', '#52b788', '#74c69d', '#e9c46a', '#c28e5d', '#d4a373', '#52b788', '#2d6a4f',
                    '#e76f51', '#f4a261', '#74c69d', '#c28e5d', '#e9c46a', '#e63946',
                    '#2d6a4f'
                ],
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Đạt tiêu chí: ${formatPercentage(context.parsed.y)}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: isDark ? '#9ca3af' : '#64748b',
                        callback: value => value + '%'
                    },
                    grid: { color: 'rgba(150, 150, 150, 0.1)' }
                },
                x: {
                    ticks: { color: isDark ? '#cbd5e1' : '#475569', font: { size: 7.5 } },
                    grid: { display: false }
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
    ageDisplay.textContent = `${ageMin} - ${ageMax} tuổi`;

    const heightVal = parseInt(heightInput.value);
    heightDisplay.textContent = heightVal <= 150 ? '≥ 150 cm (Bất kỳ)' : `≥ ${heightVal} cm`;
    updatePresetActive(heightPresets, heightVal);

    // Pure Vietnamese Auto BMI Calculation
    const selectedWeightVal = weightSelect.value;
    const avgWeightKg = getAverageWeightForRange(selectedWeightVal);

    if (avgWeightKg === null) {
        // "Bất kỳ" Weight selected -> Reset BMI to uncalculated & Hide mockery text completely
        bmiValDisplay.textContent = 'BMI = --';
        bmiStatusDesc.textContent = 'Chọn khoảng cân nặng để tính BMI tự động';
        bmiMockeryBox.style.setProperty('display', 'none', 'important');
        bmiMockeryBox.classList.add('hidden');
    } else {
        // Specific Weight Range Selected -> Calculate BMI
        const selectedHeightM = (heightVal <= 150 ? 168.5 : heightVal) / 100;
        const bmiScore = avgWeightKg / (selectedHeightM * selectedHeightM);

        bmiValDisplay.textContent = `BMI = ${bmiScore.toFixed(1)}`;

        let bmiStatusText = '';
        if (bmiScore < 18.5) {
            bmiStatusText = 'Gầy';
        } else if (bmiScore < 23.0) {
            bmiStatusText = 'Cân đối';
        } else if (bmiScore < 25.0) {
            bmiStatusText = 'Thừa cân';
        } else {
            bmiStatusText = 'Béo phì';
        }
        bmiStatusDesc.textContent = bmiStatusText;

        // Show satire pop-up text based on BMI thresholds:
        // BMI < 18.5 -> "M iu hoàng kim cốt à? 💀"
        // BMI >= 25.0 -> "Thế m đã nhìn lại mình chưa? 🤪"
        if (bmiScore < 18.5) {
            mockeryText.textContent = 'M iu hoàng kim cốt à? 💀';
            bmiMockeryBox.style.setProperty('display', 'flex', 'important');
            bmiMockeryBox.classList.remove('hidden');
        } else if (bmiScore >= 25.0) {
            mockeryText.textContent = 'Thế m đã nhìn lại mình chưa? 🤪';
            bmiMockeryBox.style.setProperty('display', 'flex', 'important');
            bmiMockeryBox.classList.remove('hidden');
        } else {
            bmiMockeryBox.style.setProperty('display', 'none', 'important');
            bmiMockeryBox.classList.add('hidden');
        }
    }

    const salaryVal = parseFloat(salaryInput.value);
    salaryDisplay.textContent = salaryVal === 0 ? 'Bất kỳ (≥ 0 Tr)' : `≥ ${salaryVal} Triệu VNĐ`;
    updatePresetActive(salaryPresets, salaryVal);

    [eduRadios, vehicleRadios, houseRadios, religionRadios, ethnicityRadios, orientationRadios, smokeRadios, drinkRadios].forEach(group => {
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

    const verdict = getSatiricalVerdict(result.percent, result.estimatedCount);
    meterBar.style.width = `${verdict.meterPercent}%`;
    delusionScoreText.textContent = verdict.scoreText;
    delusionScoreText.style.color = verdict.color;

    verdictBadge.textContent = verdict.badge;
    verdictBadge.style.background = verdict.color;
    verdictTitle.textContent = verdict.title;
    verdictDesc.textContent = verdict.desc;

    renderOvalStadiumSeatGrid(result.percent, result.estimatedCount);

    if (verdict.isZero) {
        triggerZeroDelusionOverdrive();
    } else {
        modalHasBeenTriggered = false; // Reset trigger state when criteria are relaxed above 0%
        hideDelusionModal();
    }

    updateChart(result.orderedBreakdown);
}

// Preset Chip Active State Helper
function updatePresetActive(container, val) {
    const chips = container.querySelectorAll('.chip');
    chips.forEach(chip => {
        if (parseFloat(chip.dataset.val) === val) chip.classList.add('active');
        else chip.classList.remove('active');
    });
}


// Bayesian Module Definitions & Human-Readable Labels
const MODULE_DEFS = {
    age: { label: 'Tuổi', key: 'age' },
    height: { label: 'Cao', key: 'height' },
    weight: { label: 'Nặng', key: 'weight' },
    salary: { label: 'Lương', key: 'salary' },
    job: { label: 'Nghề nghiệp', key: 'job' },
    vehicle: { label: 'Phương tiện', key: 'vehicle' },
    house: { label: 'BĐS / Nhà', key: 'house' },
    education: { label: 'Học vấn', key: 'edu' },
    religion: { label: 'Tôn giáo', key: 'religion' },
    ethnicity: { label: 'Dân tộc', key: 'ethnicity' },
    orientation: { label: 'Tính dục', key: 'orientation' },
    lifestyle: { label: 'Thuốc & Rượu', key: 'lifestyle' },
    toggles: { label: 'iPhone & Độc thân', key: 'toggles' }
};

// Get current DOM module order (Highest element = Prior variable)
function getModuleOrder() {
    const modules = Array.from(document.querySelectorAll('#calculator-form .criterion-module'));
    if (modules.length === 0) {
        return ['age', 'height', 'weight', 'salary', 'job', 'vehicle', 'house', 'education', 'religion', 'ethnicity', 'orientation', 'lifestyle', 'toggles'];
    }
    return modules.map(m => m.dataset.moduleId);
}

// Drag-and-Drop Handler for Bayesian Modules
function initDragDrop() {
    const form = document.getElementById('calculator-form');
    if (!form) return;

    let draggedItem = null;

    form.addEventListener('dragstart', (e) => {
        const module = e.target.closest('.criterion-module');
        if (!module) return;

        // Prevent drag initiation if user is adjusting an input/select or clicking radio/switch
        const targetTag = e.target.tagName.toLowerCase();
        if (['input', 'select', 'button', 'option'].includes(targetTag) || 
            e.target.closest('.switch') || 
            e.target.closest('.radio-card') || 
            e.target.closest('.chip')) {
            e.preventDefault();
            return;
        }

        draggedItem = module;
        module.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', module.dataset.moduleId);
    });

    form.addEventListener('dragend', (e) => {
        if (draggedItem) {
            draggedItem.classList.remove('is-dragging');
            draggedItem = null;
        }
        document.querySelectorAll('.criterion-module').forEach(m => m.classList.remove('drag-over'));
        renderUI();
    });

    form.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const target = e.target.closest('.criterion-module');
        if (!target || target === draggedItem) return;

        document.querySelectorAll('.criterion-module').forEach(m => m.classList.remove('drag-over'));
        target.classList.add('drag-over');

        const rect = target.getBoundingClientRect();
        const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;

        form.insertBefore(draggedItem, next ? target.nextSibling : target);
    });

    form.addEventListener('dragleave', (e) => {
        const target = e.target.closest('.criterion-module');
        if (target) {
            target.classList.remove('drag-over');
        }
    });

    form.addEventListener('drop', (e) => {
        e.preventDefault();
        document.querySelectorAll('.criterion-module').forEach(m => m.classList.remove('drag-over'));
        renderUI();
    });
}

// Event Listeners Setup
function initListeners() {
    ageMinInput.addEventListener('input', renderUI);
    ageMaxInput.addEventListener('input', renderUI);
    heightInput.addEventListener('input', renderUI);

    weightSelect.addEventListener('change', renderUI);
    salaryInput.addEventListener('input', renderUI);

    jobSelect.addEventListener('change', renderUI);

    [...eduRadios, ...vehicleRadios, ...houseRadios, ...religionRadios, ...ethnicityRadios, ...orientationRadios, ...smokeRadios, ...drinkRadios].forEach(
        r => r.addEventListener('change', renderUI)
    );

    toggleIphone.addEventListener('change', renderUI);
    toggleSingle.addEventListener('change', renderUI);

    heightPresets.addEventListener('click', (e) => {
        if (e.target.classList.contains('chip')) {
            heightInput.value = e.target.dataset.val;
            renderUI();
        }
    });

    salaryPresets.addEventListener('click', (e) => {
        if (e.target.classList.contains('chip')) {
            salaryInput.value = e.target.dataset.val;
            renderUI();
        }
    });

    btnReset.addEventListener('click', resetToBaseline);
    btnCloseModal.addEventListener('click', () => {
        hideDelusionModal();
        resetToBaseline();
    });

    btnShare.addEventListener('click', copyResultsSummary);
    btnCopyLink.addEventListener('click', copyResultsSummary);
}

function resetToBaseline() {
    ageMinInput.value = 18;
    ageMaxInput.value = 60;
    heightInput.value = 150;
    weightSelect.value = 'any';
    salaryInput.value = 0;
    jobSelect.value = 'any';
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
    showToast('Đã đặt lại về 100% cơ bản!');
}

function copyResultsSummary() {
    const percent = percentageVal.textContent;
    const count = countVal.textContent;
    const title = verdictTitle.textContent;

    const summaryText = `🎯 THƯỚC ĐO TIÊU CHUẨN BẠN TRAI VIỆT NAM\n\n` +
        `• Tỷ lệ nam giới đáp ứng: ${percent}%\n` +
        `• Ước tính: ~${count} người (18-60t)\n` +
        `• Đánh giá: ${title}\n\n` +
        `Kiểm tra tiêu chuẩn của bạn tại Male Delusion Calculator VN! 🚀`;

    navigator.clipboard.writeText(summaryText).then(() => {
        showToast('Đã sao chép kết quả vào bộ nhớ tạm!');
    }).catch(() => {
        showToast('Không thể sao chép kết quả!');
    });
}

function showToast(msg) {
    toastMessage.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 2800);
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initSubpageNavigation();
    initOvalStadiumSeats();
    initDragDrop();
    initListeners();
    renderUI();
});
