// -----------------------------
// Utilities & State
// -----------------------------
const STORAGE_KEY = "emissionsHistory";
let historyData = loadHistory();

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(historyData));
}

function formatDate(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// -----------------------------
// Location Tracker (auto-fill city)
// -----------------------------
async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error("Reverse geocoding failed");
  return res.json();
}

function detectLocation() {
  const locEl = document.getElementById("userLocation");
  const cityInput = document.getElementById("city");
  if (!navigator.geolocation) {
    locEl.textContent = "Geolocation not supported";
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      locEl.textContent = `Lat: ${latitude.toFixed(2)}, Lon: ${longitude.toFixed(2)}`;
      try {
        const data = await reverseGeocode(latitude, longitude);
        const addr = data.address || {};
        const cityName = addr.city || addr.town || addr.village || addr.suburb || addr.state || addr.county;
        if (cityName) {
          cityInput.value = cityName;
          locEl.textContent = `📍 ${cityName}`;
        }
      } catch (e) {
        console.warn(e);
      }
    },
    () => {
      locEl.textContent = "Permission denied or unavailable";
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
  );

  // Manual city selector fallback
document.addEventListener("DOMContentLoaded", () => {
  const citySelector = document.getElementById("citySelector");
  const cityInput = document.getElementById("city");

  if (citySelector) {
    citySelector.addEventListener("change", () => {
      if (citySelector.value) {
        cityInput.value = citySelector.value;
      }
    });
  }
});

}

// -----------------------------
// Emissions Calculation
// -----------------------------
function baseEmissionByVehicle(vehicleType, fuelType) {
  // Baseline g/km (approximate placeholders)
  const base = {
    car: { petrol: 180, diesel: 170, cng: 140, hybrid: 120, electric: 0 },
    motorcycle: { petrol: 90, diesel: 100, cng: 80, hybrid: 70, electric: 0 },
    truck: { petrol: 300, diesel: 280, cng: 220, hybrid: 200, electric: 0 },
    bus: { petrol: 260, diesel: 240, cng: 200, hybrid: 180, electric: 0 },
    auto: { petrol: 130, diesel: 140, cng: 110, hybrid: 100, electric: 0 },
    lcv: { petrol: 220, diesel: 210, cng: 180, hybrid: 160, electric: 0 },
  };
  const vt = base[vehicleType] || base.car;
  return vt[fuelType] ?? vt.petrol;
}

function modifiers({ engineSize, vehicleAge, aero, load, temp, gradient, network, popDensity }) {
  let factor = 1;

  // Engine size: +5% per liter above 1.5L, -5% below
  if (engineSize) {
    const delta = engineSize - 1.5;
    factor *= 1 + (delta * 0.05);
  }

  // Vehicle age: +2% per year above 5 years, -2% below
  if (vehicleAge) {
    const deltaAge = vehicleAge - 5;
    factor *= 1 + (deltaAge * 0.02);
  }

  // Aerodynamics
  if (aero === "poor") factor *= 1.10;
  if (aero === "average") factor *= 1.05;
  if (aero === "good") factor *= 0.98;

  // Load
  if (load === "heavy") factor *= 1.12;
  if (load === "medium") factor *= 1.06;
  if (load === "light") factor *= 1.00;

  // Temperature: extreme temps increase consumption
  if (typeof temp === "number") {
    if (temp < 10) factor *= 1.05;
    else if (temp > 32) factor *= 1.07;
  }

  // Gradient: +1.5% per % grade
  if (typeof gradient === "number") {
    factor *= 1 + (Math.max(0, gradient) * 0.015);
  }

  // Network
  const netMap = {
    urban_dense: 1.12,
    urban_moderate: 1.08,
    peri_urban: 1.03,
    rural: 0.98,
    highway: 0.92,
  };
  factor *= netMap[network] || 1.0;

  // Population density: proxy for congestion
  if (popDensity) {
    if (popDensity > 20000) factor *= 1.10;
    else if (popDensity > 8000) factor *= 1.06;
    else if (popDensity > 3000) factor *= 1.03;
  }

  return factor;
}

function estimateEmissions(inputs) {
  const base = baseEmissionByVehicle(inputs.vehicleType, inputs.fuelType);
  const factor = modifiers(inputs);
  const emissions = Math.max(0, base * factor);
  return emissions;
}

// -----------------------------
// Sustainability Score & Tips
// -----------------------------
function sustainabilityScore(emissions) {
  // 100 at 0 g/km, 0 at 300+ g/km
  const score = Math.max(0, Math.min(100, Math.round(100 * (1 - emissions / 300))));
  return score;
}

function generateTips(inputs, emissions) {
  const tips = [];
  const goal = 150;

  if (emissions > goal) tips.push("Consider switching to CNG, hybrid, or EV to reduce emissions.");
  if ((inputs.engineSize || 0) > 2.0) tips.push("Smaller engine sizes (e.g., 1.2–1.5 L) can significantly cut emissions.");
  if ((inputs.vehicleAge || 0) > 8) tips.push("Regular maintenance and tire pressure checks improve efficiency in older vehicles.");
  if (inputs.load === "heavy") tips.push("Reduce cargo weight or consolidate trips to lower fuel consumption.");
  if ((inputs.gradient || 0) > 4) tips.push("Plan routes with gentler gradients when possible.");
  if (inputs.network === "urban_dense") tips.push("Avoid peak hours or use public transit in dense urban areas.");
  if ((inputs.popDensity || 0) > 10000) tips.push("Carpooling or micro-mobility options help in high-density areas.");
  if ((inputs.temp || 0) > 32 || (inputs.temp || 0) < 10) tips.push("Moderate AC/heating usage to reduce extra load on the engine.");

  if (tips.length === 0) tips.push("Great setup—keep optimizing routes and maintenance for continued gains.");
  return tips;
}

// -----------------------------
// UI Updates
// -----------------------------
function updateProgress(emissions) {
  const goal = 150;
  const pct = Math.max(0, Math.min(100, Math.round(100 * (1 - emissions / goal))));
  const circle = document.getElementById("progressBar");
  const text = document.getElementById("progressText");
  const circumference = 2 * Math.PI * 70; // r=70
  const offset = circumference * (1 - pct / 100);
  circle.setAttribute("stroke-dasharray", `${circumference}`);
  circle.setAttribute("stroke-dashoffset", `${offset}`);
  circle.setAttribute("stroke", emissions <= goal ? "#10b981" : "#ef4444");
  text.textContent = `${pct}%`;
}

function renderTips(tips) {
  const ul = document.getElementById("ecoTips");
  ul.innerHTML = "";
  tips.forEach(t => {
    const li = document.createElement("li");
    li.textContent = t;
    ul.appendChild(li);
  });
}

function renderBadges(inputs, emissions) {
  const badges = document.getElementById("badges");
  badges.innerHTML = "";

  const items = [
    { label: `Vehicle: ${inputs.vehicleType}` },
    { label: `Fuel: ${inputs.fuelType}` },
    { label: `City: ${inputs.city || "N/A"}` },
    { label: `Emissions: ${emissions.toFixed(1)} g/km` },
  ];

  items.forEach(i => {
    const span = document.createElement("span");
    span.className = "inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold";
    span.textContent = i.label;
    badges.appendChild(span);
  });
}

function renderScore(score) {
  const el = document.getElementById("sustainScore");
  el.textContent = `${score} / 100`;
}

function renderSummaryBanner(emissions) {
  const banner = document.getElementById("summaryBanner");
  const goal = 150;
  const good = emissions <= goal;
  banner.className = `mt-10 text-center p-4 rounded-lg font-bold text-lg ${good ? "bg-green-100 text-green-800 border border-green-200" : "bg-red-100 text-red-800 border border-red-200"}`;
  banner.textContent = good
    ? "✅ You’re aligned with the sustainability target (≤ 150 g/km). Keep it up!"
    : "⚠️ Above target. Try the tips below to bring emissions closer to ≤ 150 g/km.";
}

// -----------------------------
// History & CSV
// -----------------------------
function renderHistory() {
  const tbody = document.getElementById("historyLog");
  tbody.innerHTML = "";
  historyData.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="px-4 py-2 text-gray-700">${row.date}</td>
      <td class="px-4 py-2 text-gray-700">${row.city || "—"}</td>
      <td class="px-4 py-2 text-gray-700">${row.emissions.toFixed(1)}</td>
      <td class="px-4 py-2 text-gray-700">${row.score}</td>
    `;
    tbody.appendChild(tr);
  });
}

function downloadCSV() {
  const headers = ["Date", "City", "Emissions (g/km)", "Score"];
  const rows = historyData.map(r => [r.date, r.city || "", r.emissions.toFixed(1), r.score]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "emissions_history.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// -----------------------------
// Chart
// -----------------------------
let chart;

function initChart() {
  const ctx = document.getElementById("historyChart").getContext("2d");
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: historyData.map(h => h.date),
      datasets: [
        {
          label: "Emissions (g/km)",
          data: historyData.map(h => h.emissions),
          borderColor: "#10b981",
          backgroundColor: "rgba(16,185,129,0.2)",
          tension: 0.3,
        },
        {
          label: "Sustainability Score",
          data: historyData.map(h => h.score),
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59,130,246,0.2)",
          tension: 0.3,
          yAxisID: "y1",
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: { title: { display: true, text: "Emissions (g/km)" }, min: 0 },
        y1: { position: "right", title: { display: true, text: "Score" }, min: 0, max: 100 },
      },
      plugins: {
        legend: { display: true },
        tooltip: { mode: "index", intersect: false },
      },
    },
  });
}

function updateChart() {
  if (!chart) return;
  chart.data.labels = historyData.map(h => h.date);
  chart.data.datasets[0].data = historyData.map(h => h.emissions);
  chart.data.datasets[1].data = historyData.map(h => h.score);
  chart.update();
}

// -----------------------------
// Form Handling
// -----------------------------
function getInputs() {
  const getNum = (id) => {
    const v = document.getElementById(id).value;
    return v === "" ? null : Number(v);
  };
  return {
    vehicleType: document.getElementById("vehicleType")?.value || "car",
    fuelType: document.getElementById("fuelType")?.value || "petrol",
    engineSize: getNum("engineSize"),
    vehicleAge: getNum("vehicleAge"),
    aero: document.getElementById("aero")?.value || "average",
    load: document.getElementById("load")?.value || "light",
    city: document.getElementById("city")?.value || "",
    temp: getNum("temp"),
    gradient: getNum("gradient"),
    network: document.getElementById("network")?.value || "urban_moderate",
    popDensity: getNum("popDensity"),
  };
}

function onEstimate() {
  const inputs = getInputs();
  const emissions = estimateEmissions(inputs);
  const score = sustainabilityScore(emissions);
  const tips = generateTips(inputs, emissions);

  // Output panel
  renderBadges(inputs, emissions);
  renderTips(tips);
  renderScore(score);
  updateProgress(emissions);
  renderSummaryBanner(emissions);

  // History
  const entry = { date: formatDate(), city: inputs.city, emissions, score };
  historyData.push(entry);
  saveHistory();
  renderHistory();
  updateChart();
}

function onReset() {
  // Clear inputs
  ["engineSize", "vehicleAge", "city", "temp", "gradient", "popDensity"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  // Reset selects to defaults
  const defaults = {
    vehicleType: "car",
    fuelType: "petrol",
    aero: "average",
    load: "light",
    network: "urban_moderate",
  };
  Object.entries(defaults).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  });

  // Clear outputs
  document.getElementById("badges").innerHTML = "";
  document.getElementById("ecoTips").innerHTML = "";
  document.getElementById("sustainScore").textContent = "0 / 100";
  document.getElementById("summaryBanner").textContent = "";
  updateProgress(0);
}

// -----------------------------
// Init
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
  // Bind buttons
  document.getElementById("estimate")?.addEventListener("click", onEstimate);
  document.getElementById("reset")?.addEventListener("click", onReset);
  document.getElementById("downloadCSV")?.addEventListener("click", downloadCSV);

  // Location + history + chart
  detectLocation();
  renderHistory();
  initChart();
  updateProgress(0);
});
