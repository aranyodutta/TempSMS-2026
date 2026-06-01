const firebaseConfig = {
  apiKey: "AIzaSyBAFSNhMWbMXUPR10b8ynjiKD8tVRK6tQ8",
  authDomain: "wlc-talent-show-sms.firebaseapp.com",
  projectId: "wlc-talent-show-sms",
  storageBucket: "wlc-talent-show-sms.firebasestorage.app",
  messagingSenderId: "941916915658",
  appId: "1:941916915658:web:06e04e1ace6a640d237133",
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  doc,
  collection,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  getDocs,
  query,
  orderBy,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const SHOW_ID = "main";
const PLAN_WITH_INTERMISSION = "withIntermission";
const PLAN_SKIP_INTERMISSION = "skipIntermission";
const PLAN_LINEAR = "linear";
const DEFAULT_PLAN = PLAN_WITH_INTERMISSION;
const DEFAULT_TARGET_RUNTIME_SECONDS = 10450;
const DEFAULT_SAFETY_BUFFER_MINUTES = 3;
const OFFSET_STATUS_THRESHOLD_SECONDS = 180;
const SETUP_TYPE_OPTIONS = ["DANCE", "ACTING", "SINGING", "EMCEE", "MC", "INTERMISSION", "CONCLUSION", "SETUP", "OTHER"];
const THEME_STORAGE_KEY = "wlcsms-theme";
const XLSX_CDN_URL = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";

const seedItems = [
  item("opening-remarks", "Opening Remarks", "EMCEE", "core", 420, 1, 1, {
    notes: "Base planned from handwritten timing. Advisors support opening remarks.",
  }),
  item("acting-1", "Acting", "ACTING", "core", 420, 2, 2, { notes: "Opening acting block." }),
  item("freshman-dance", "Freshman Dance", "DANCE", "core", 510, 3, 3, {
    notes: "Raw music time + 0:30 entrance/exit/reset. No captains listed.",
  }),
  item("acting-2", "Acting", "ACTING", "core", 220, 4, 4),
  item("marathi", "Marathi", "DANCE", "core", 460, 5, 5, {
    captains: ["Pihu Sadana", "Sara Kulkarni"],
    notes: "Raw music time + 0:30 entrance/exit/reset.",
  }),
  item("acting-3", "Acting", "ACTING", "core", 150, 6, 6),
  item("hip-hop", "Hip-Hop", "DANCE", "core", 530, 7, 7, {
    captains: ["Arnav Mota", "Sahasra Madasi", "Jessica Rebba"],
    notes: "Raw music time + 0:30 entrance/exit/reset.",
  }),
  item("acting-4", "Acting", "ACTING", "core", 410, 8, 8),
  item("classical", "Classical", "DANCE", "core", 440, 9, 9, {
    captains: ["Sara Kulkarni", "Shruthika Srijeyaraman", "Aparna Aji"],
    notes: "Swapped with Bollywood per handwritten correction.",
  }),
  item("acting-5", "Acting", "ACTING", "core", 260, 10, 10),
  item("bollywood", "Bollywood", "DANCE", "core", 510, 11, 11, {
    captains: ["Prisha Patel", "Aishi Chell"],
    notes: "Decision point follows this item.",
  }),
  item("acting-intermission-intro", "Acting / Intermission Intro", "ACTING", PLAN_WITH_INTERMISSION, 240, 12, null, {
    notes: "With intermission branch: 4:00 before intermission.",
  }),
  item("intermission", "Intermission", "INTERMISSION", PLAN_WITH_INTERMISSION, 900, 13, null),
  item("acting-after-intermission", "Acting after Intermission", "ACTING", PLAN_WITH_INTERMISSION, 240, 14, null, {
    notes: "With intermission branch: 4:00 after intermission.",
  }),
  item("mc-transition", "MC Stalling / MC Transition", "MC", PLAN_SKIP_INTERMISSION, 300, null, 12, {
    notes: "No intermission branch: MC stalls for 5:00 after Bollywood.",
  }),
  item("singing", "Singing", "SINGING", "core", 930, 15, 13, {
    captains: ["Satvik Dhananjay", "Shivali Pandya"],
    notes: "Raw music time + 0:30 changeover + 5:00 mic/instrument setup buffer.",
  }),
  item("acting-6", "Acting", "ACTING", "core", 80, 16, 14),
  item("k-pop", "K-pop", "DANCE", "core", 510, 17, 15, {
    captains: ["Nathan Lam", "Arielle Tu"],
    notes: "Raw music time + 0:30 entrance/exit/reset.",
  }),
  item("acting-7", "Acting", "ACTING", "core", 430, 18, 16),
  item("south-indian", "South Indian", "DANCE", "core", 450, 19, 17, {
    captains: ["Aayush Chebolu", "Rishta Nossam", "Pragna Buddharaju"],
    notes: "Raw music time + 0:30 entrance/exit/reset.",
  }),
  item("acting-8", "Acting", "ACTING", "core", 420, 20, 18),
  item("garba", "Garba", "DANCE", "core", 440, 21, 19, {
    captains: ["Vikram Vijaykrishna", "Ria Badgujar"],
    notes: "Raw music time + 0:30 entrance/exit/reset.",
  }),
  item("acting-9", "Acting", "ACTING", "core", 490, 22, 20),
  item("bhangra", "Bhangra", "DANCE", "core", 510, 23, 21, {
    captains: ["Satvik Dhananjay", "Bina Suresh"],
    notes: "Raw music time + 0:30 entrance/exit/reset.",
  }),
  item("final-acting-with", "Final Acting", "ACTING", PLAN_WITH_INTERMISSION, 360, 24, null, {
    notes: "With intermission branch: 6:00 final acting estimate.",
  }),
  item("conclusion-with", "Conclusion", "CONCLUSION", PLAN_WITH_INTERMISSION, 120, 25, null, {
    notes: "With intermission branch: 2:00 conclusion estimate.",
  }),
  item("final-acting-skip", "Final Acting", "ACTING", PLAN_SKIP_INTERMISSION, 480, null, 22, {
    notes: "No intermission branch: final acting becomes 8:00.",
  }),
  item("conclusion-skip", "Conclusion", "CONCLUSION", PLAN_SKIP_INTERMISSION, 300, null, 23, {
    notes: "No intermission branch: conclusion becomes 5:00.",
  }),
];

const ITEM_COUNT = seedItems.length;
const showRef = doc(db, "shows", SHOW_ID);
const itemsRef = collection(showRef, "items");

function item(id, title, type, branch, plannedSeconds, orderWithIntermission, orderSkipIntermission, extras = {}) {
  return {
    id,
    title,
    type,
    branch,
    plannedSeconds,
    orderWithIntermission,
    orderSkipIntermission,
    performers: extras.performers || extras.people || extras.captains || [],
    captains: extras.captains || [],
    requirements: extras.requirements || defaultRequirements(type),
    notes: extras.notes || "",
  };
}

function defaultRequirements(type) {
  const t = String(type || "").toUpperCase();
  if (t === "DANCE") return { mics: "None", chairs: "0", instruments: "None", other: "Music playback" };
  if (t === "ACTING") return { mics: "As needed", chairs: "As needed", instruments: "None", other: "Acting scene" };
  if (t === "EMCEE") return { mics: "2 handheld", chairs: "0", instruments: "None", other: "Opening remarks" };
  if (t === "SINGING") return { mics: "As needed", chairs: "0", instruments: "As needed", other: "Setup buffer included" };
  if (t === "INTERMISSION") return { mics: "None", chairs: "0", instruments: "None", other: "House/intermission music" };
  if (t === "MC") return { mics: "2 handheld", chairs: "0", instruments: "None", other: "Stalling/transition" };
  if (t === "CONCLUSION") return { mics: "2 handheld", chairs: "0", instruments: "None", other: "Closing remarks" };
  return { mics: "None", chairs: "0", instruments: "None", other: "TBD" };
}

function itemRefByIndex(i) {
  return doc(itemsRef, seedItems[i].id);
}

function subscribeShow(callback) {
  return onSnapshot(
    showRef,
    (snapshot) => callback(snapshot.exists() ? snapshot.data() : null),
    () => callback(null)
  );
}

function subscribeItems(callback) {
  const itemsQuery = query(itemsRef, orderBy("seedIndex", "asc"));
  return onSnapshot(
    itemsQuery,
    (snapshot) => {
      callback(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    },
    () => callback([])
  );
}

function normalizeTimestamp(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function formatClock(date) {
  const d = normalizeTimestamp(date);
  if (!d) return "-";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(totalSeconds) {
  if (totalSeconds == null || Number.isNaN(totalSeconds)) return "-";
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatOffset(offsetSeconds) {
  if (offsetSeconds == null || Number.isNaN(offsetSeconds)) return "-";
  return formatDuration(Math.abs(offsetSeconds));
}

function parsePlannedSeconds(value) {
  if (value == null || value === "") return 0;
  if (typeof value === "number") {
    if (value > 0 && value < 1) return Math.round(value * 24 * 60 * 60);
    return Math.round(value);
  }
  const raw = String(value).trim();
  if (!raw) return 0;
  if (/^\d+(\.\d+)?$/.test(raw)) return Math.round(Number(raw));
  const parts = raw.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) return NaN;
  if (parts.length === 2) return Math.round(parts[0] * 60 + parts[1]);
  if (parts.length === 3) return Math.round(parts[0] * 3600 + parts[1] * 60 + parts[2]);
  return NaN;
}

function formatPlannedInput(seconds) {
  return formatDuration(seconds || 0);
}

function displayStatus(status) {
  const s = String(status || "").toLowerCase();
  if (s === "blue") return "ON DECK";
  return s ? s.toUpperCase() : "-";
}

function planLabel(plan) {
  if (plan === PLAN_LINEAR) return "LINEAR SHOW";
  return plan === PLAN_SKIP_INTERMISSION ? "SKIP INTERMISSION" : "WITH INTERMISSION";
}

function hasBranchingItems(items = []) {
  return items.some((item) => item?.branch === PLAN_WITH_INTERMISSION || item?.branch === PLAN_SKIP_INTERMISSION);
}

function planForShow(showData, items = []) {
  if (showData?.intermissionMode === PLAN_LINEAR) return PLAN_LINEAR;
  if (!hasBranchingItems(items) && showData?.intermissionMode !== "branched") return PLAN_LINEAR;
  return showData?.intermissionPlan === PLAN_SKIP_INTERMISSION ? PLAN_SKIP_INTERMISSION : PLAN_WITH_INTERMISSION;
}

function isActiveForPlan(item, plan) {
  if (plan === PLAN_LINEAR) return !item?.branch || item?.branch === "core" || item?.branch === PLAN_LINEAR;
  return item?.branch === "core" || item?.branch === plan;
}

function planOrder(item, plan) {
  if (plan === PLAN_LINEAR) return item.order ?? item.seedIndex + 1;
  return plan === PLAN_SKIP_INTERMISSION ? item.orderSkipIntermission : item.orderWithIntermission;
}

function activeItemsForPlan(items, plan) {
  return [...items]
    .filter((item) => isActiveForPlan(item, plan))
    .sort((a, b) => (planOrder(a, plan) || 9999) - (planOrder(b, plan) || 9999));
}

function hasBranchItemStarted(items) {
  return items.some((item) => (item.branch === PLAN_WITH_INTERMISSION || item.branch === PLAN_SKIP_INTERMISSION) && normalizeTimestamp(item.actualStartAt));
}

function peopleList(item) {
  if (!item) return [];
  const values = Array.isArray(item.performers) && item.performers.length ? item.performers : Array.isArray(item.people) && item.people.length ? item.people : item.captains;
  return Array.isArray(values) ? values.map((value) => String(value || "").trim()).filter(Boolean) : [];
}

function peopleText(item) {
  const people = peopleList(item);
  return people.length ? people.join(", ") : "-";
}

function openPeopleLine(item) {
  const text = peopleText(item);
  return text === "-" ? "" : `Performers: ${text}`;
}

function activeOrderById(items, plan) {
  const map = new Map();
  activeItemsForPlan(items, plan).forEach((item, idx) => map.set(item.id, idx + 1));
  return map;
}

function computeRemainingSeconds(items, plan) {
  return activeItemsForPlan(items, plan)
    .filter((item) => item.status !== "done")
    .reduce((sum, item) => {
      const planned = item.plannedSeconds || 0;
      if (item.status === "live") {
        const elapsed = getElapsedSeconds(item.actualStartAt);
        return sum + Math.max(0, planned - (elapsed || 0));
      }
      return sum + planned;
    }, 0);
}

function computeProjectedTiming(showData, items, plan = planForShow(showData, items)) {
  const remainingSeconds = computeRemainingSeconds(items, plan);
  const now = new Date();
  const projectedEndAt = new Date(now.getTime() + remainingSeconds * 1000);
  const baseline = normalizeTimestamp(showData?.plannedEndBaselineAt) || projectedEndAt;
  const offsetSeconds = Math.round((projectedEndAt - baseline) / 1000);
  return { projectedEndAt, offsetSeconds };
}

function getOffsetStatus(offsetSeconds) {
  if (offsetSeconds == null || Number.isNaN(offsetSeconds)) return "ON TIME";
  if (Math.abs(offsetSeconds) < OFFSET_STATUS_THRESHOLD_SECONDS) return "ON TIME";
  return offsetSeconds > 0 ? "BEHIND" : "AHEAD";
}

function getTargetRuntimeSeconds(showData) {
  const seconds = Number(showData?.targetRuntimeSeconds);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : DEFAULT_TARGET_RUNTIME_SECONDS;
}

function getSafetyBufferSeconds(showData) {
  const minutes = Number(showData?.safetyBufferMinutes);
  return (Number.isFinite(minutes) && minutes >= 0 ? minutes : DEFAULT_SAFETY_BUFFER_MINUTES) * 60;
}

function getActualShowStartAt(showData) {
  const stored = normalizeTimestamp(showData?.actualShowStartAt);
  if (stored) return stored;
  const baseline = normalizeTimestamp(showData?.plannedEndBaselineAt);
  if (baseline) return new Date(baseline.getTime() - getTargetRuntimeSeconds(showData) * 1000);
  return null;
}

function getTargetEndAt(showData) {
  const start = getActualShowStartAt(showData);
  if (!start) return null;
  return new Date(start.getTime() + getTargetRuntimeSeconds(showData) * 1000);
}

function getRecommendation(showData, items) {
  if (!hasBranchingItems(items)) return "LINEAR SHOW";
  const plan = planForShow(showData, items);
  const locked = !!showData?.intermissionDecisionLocked || hasBranchItemStarted(items);
  if (locked) {
    return plan === PLAN_SKIP_INTERMISSION ? "LOCKED: NO INTERMISSION" : "LOCKED: WITH INTERMISSION";
  }

  const targetEndAt = getTargetEndAt(showData);
  if (!targetEndAt) return "INTERMISSION OK";

  const { projectedEndAt: withEnd } = computeProjectedTiming(showData, items, PLAN_WITH_INTERMISSION);
  const { projectedEndAt: skipEnd } = computeProjectedTiming(showData, items, PLAN_SKIP_INTERMISSION);
  const withDiff = Math.round((withEnd - targetEndAt) / 1000);
  const skipDiff = Math.round((skipEnd - targetEndAt) / 1000);
  const buffer = getSafetyBufferSeconds(showData);

  if (withDiff <= -(buffer + 60)) return "INTERMISSION OK";
  if (withDiff <= buffer) return "WATCH CLOSELY";
  if (skipDiff <= buffer) return "SKIP RECOMMENDED";
  return "SKIP REQUIRED";
}

function recommendationTone(recommendation) {
  if (recommendation.includes("LOCKED") || recommendation === "DECISION PASSED") return "locked";
  if (recommendation === "LINEAR SHOW") return "locked";
  if (recommendation === "INTERMISSION OK") return "ok";
  if (recommendation === "WATCH CLOSELY") return "watch";
  return "danger";
}

function clearSignalClasses(el) {
  if (!el) return;
  ["signal-success", "signal-danger", "signal-warn", "signal-info", "signal-muted"].forEach((c) => el.classList.remove(c));
}

function applySignal(el, tone) {
  if (!el) return;
  clearSignalClasses(el);
  const map = {
    success: "signal-success",
    danger: "signal-danger",
    warn: "signal-warn",
    info: "signal-info",
    muted: "signal-muted",
  };
  el.classList.add(map[tone] || "signal-info");
}

function applyOffsetSignal(el, offsetSeconds) {
  if (offsetSeconds == null || Number.isNaN(offsetSeconds)) return applySignal(el, "muted");
  if (Math.abs(offsetSeconds) <= 10) return applySignal(el, "info");
  return applySignal(el, offsetSeconds > 0 ? "danger" : "success");
}

function applyOverUnderSignal(el, diffSeconds) {
  if (diffSeconds == null || Number.isNaN(diffSeconds)) return applySignal(el, "muted");
  if (Math.abs(diffSeconds) <= 10) return applySignal(el, "info");
  return applySignal(el, diffSeconds > 0 ? "danger" : "success");
}

function applyShowStatusChip(el, status) {
  if (!el) return;
  ["chip-running", "chip-hold", "chip-stopped"].forEach((c) => el.classList.remove(c));
  const s = String(status || "").toLowerCase();
  if (s === "running") el.classList.add("chip-running");
  else if (s === "hold") el.classList.add("chip-hold");
  else el.classList.add("chip-stopped");
}

function getRequirement(item, key) {
  const req = item?.requirements || defaultRequirements(item?.type);
  const val = req?.[key];
  if (val == null) return "-";
  const s = String(val).trim();
  return s.length ? s : "-";
}

function normalizeItemName(nameRaw) {
  let name = String(nameRaw || "").trim().toLowerCase();
  if (!name) return "";
  const map = {
    handhelds: "handheld",
    handheld: "handheld",
    mics: "mic",
    mic: "mic",
    microphones: "mic",
    stands: "stand",
    stand: "stand",
    stools: "stool",
    stool: "stool",
    chairs: "chair",
    chair: "chair",
    guitars: "guitar",
    guitar: "guitar",
  };
  if (map[name]) return map[name];
  if (name.endsWith("s") && name.length > 3) name = name.slice(0, -1);
  return name;
}

function parseRequirementValue(value) {
  const s0 = String(value || "").trim();
  if (!s0) return {};
  const s = s0.toLowerCase();
  if (s === "-" || s === "none" || s === "0" || s === "n/a" || s === "tbd" || s === "as needed") return {};
  const parts = s0.split(",").map((p) => p.trim()).filter(Boolean);
  const counts = {};
  parts.forEach((part) => {
    const m = part.match(/^(\d+)\s+(.*)$/);
    const count = m ? Number(m[1]) : 1;
    const name = normalizeItemName(m ? m[2] : part);
    if (!name || !Number.isFinite(count)) return;
    counts[name] = (counts[name] || 0) + count;
  });
  return counts;
}

function describeChangePills(fromVal, toVal) {
  const fromCounts = parseRequirementValue(fromVal);
  const toCounts = parseRequirementValue(toVal);
  const keys = new Set([...Object.keys(fromCounts), ...Object.keys(toCounts)]);
  const pills = [];
  keys.forEach((key) => {
    const diff = (toCounts[key] || 0) - (fromCounts[key] || 0);
    if (diff > 0) pills.push({ type: "add", text: `+${diff} ${key}` });
    if (diff < 0) pills.push({ type: "remove", text: `${diff} ${key}` });
  });
  return pills.sort((a, b) => a.text.localeCompare(b.text));
}

function renderChangeSummary(containerEl, fromItem, toItem) {
  if (!containerEl) return;
  if (!fromItem || !toItem) {
    containerEl.innerHTML = `<div class="no-change">-</div>`;
    return;
  }
  const manual = String(toItem.changeNotes || "").split(/\n|,/).map((line) => line.trim()).filter(Boolean);
  if (manual.length) {
    containerEl.innerHTML = `
      <div class="change-line">
        <div class="change-label">Manual</div>
        <div class="change-pills">
          ${manual.map((line) => {
            const type = line.startsWith("-") ? "remove" : line.startsWith("+") ? "add" : "";
            return `<span class="pill ${type}">${line}</span>`;
          }).join("")}
        </div>
      </div>
    `;
    return;
  }
  const fields = [
    { key: "mics", label: "Mics" },
    { key: "chairs", label: "Chairs" },
    { key: "instruments", label: "Instruments" },
    { key: "other", label: "Other" },
  ];
  const lines = [];
  fields.forEach((field) => {
    const pills = describeChangePills(getRequirement(fromItem, field.key), getRequirement(toItem, field.key));
    if (!pills.length) return;
    lines.push(`
      <div class="change-line">
        <div class="change-label">${field.label}</div>
        <div class="change-pills">${pills.map((p) => `<span class="pill ${p.type}">${p.text}</span>`).join("")}</div>
      </div>
    `);
  });
  containerEl.innerHTML = lines.length ? lines.join("") : `<div class="no-change">No stage changes.</div>`;
}

function buildInitialItems() {
  return seedItems.map((seed, seedIndex) => ({
    ...seed,
    order: seed.orderWithIntermission ?? seed.orderSkipIntermission ?? seedIndex + 1,
    seedIndex,
    status: "queued",
    actualStartAt: null,
    actualEndAt: null,
  }));
}

function slugifyId(value, index) {
  const base = String(value || "item")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 44);
  return `${base || "item"}-${index + 1}`;
}

function parsePeople(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeBranch(value) {
  const branch = String(value || "core").trim();
  if (!branch || branch.toLowerCase() === "blank") return "core";
  if (branch === PLAN_WITH_INTERMISSION || branch === PLAN_SKIP_INTERMISSION || branch === PLAN_LINEAR || branch === "core" || branch === "custom") return branch;
  if (branch.toLowerCase() === "withintermission" || branch.toLowerCase() === "with intermission") return PLAN_WITH_INTERMISSION;
  if (branch.toLowerCase() === "skipintermission" || branch.toLowerCase() === "skip intermission") return PLAN_SKIP_INTERMISSION;
  return "core";
}

function setupItemFromRuntime(item, index) {
  const planOrderValue = item.order ?? item.orderWithIntermission ?? item.orderSkipIntermission ?? index + 1;
  return {
    id: item.id || slugifyId(item.title, index),
    order: Number(planOrderValue) || index + 1,
    title: item.title || "Untitled Item",
    type: item.type || "OTHER",
    plannedSeconds: Number(item.plannedSeconds) || 0,
    performers: peopleList(item),
    branch: normalizeBranch(item.branch),
    requirements: {
      mics: getRequirement(item, "mics"),
      chairs: getRequirement(item, "chairs"),
      instruments: getRequirement(item, "instruments"),
      other: getRequirement(item, "other"),
    },
    changeNotes: item.changeNotes || "",
    notes: item.notes || "",
  };
}

function fallbackSetupItems() {
  return buildInitialItems().map(setupItemFromRuntime);
}

function setupItemsFromShow(showData, runtimeItems = []) {
  const saved = Array.isArray(showData?.setupItems) ? showData.setupItems : [];
  if (saved.length) return saved.map(setupItemFromRuntime).sort((a, b) => (a.order || 0) - (b.order || 0));
  if (runtimeItems.length) return runtimeItems.map(setupItemFromRuntime).sort((a, b) => (a.order || 0) - (b.order || 0));
  return fallbackSetupItems();
}

function buildRuntimeItemsFromSetup(setupItems) {
  const seen = new Set();
  return setupItems
    .map((setup, index) => {
      const order = Number(setup.order) || index + 1;
      const title = String(setup.title || `Item ${index + 1}`).trim() || `Item ${index + 1}`;
      let id = String(setup.id || "").trim() || slugifyId(title, index);
      while (seen.has(id)) id = `${id}-${index + 1}`;
      seen.add(id);
      const branch = normalizeBranch(setup.branch);
      const plannedSeconds = Math.max(0, Number(setup.plannedSeconds) || 0);
      const performers = parsePeople(setup.performers || setup.people || setup.captains);
      const requirements = {
        mics: String(setup.requirements?.mics ?? setup.mics ?? defaultRequirements(setup.type).mics ?? "").trim(),
        chairs: String(setup.requirements?.chairs ?? setup.chairs ?? defaultRequirements(setup.type).chairs ?? "").trim(),
        instruments: String(setup.requirements?.instruments ?? setup.instruments ?? defaultRequirements(setup.type).instruments ?? "").trim(),
        other: String(setup.requirements?.other ?? setup.other ?? defaultRequirements(setup.type).other ?? "").trim(),
      };
      return {
        id,
        title,
        type: String(setup.type || "OTHER").trim() || "OTHER",
        branch,
        order,
        orderWithIntermission: branch === PLAN_SKIP_INTERMISSION ? null : order,
        orderSkipIntermission: branch === PLAN_WITH_INTERMISSION ? null : order,
        plannedSeconds,
        performers,
        captains: performers,
        requirements,
        changeNotes: String(setup.changeNotes || "").trim(),
        notes: String(setup.notes || "").trim(),
        seedIndex: index,
        status: "queued",
        actualStartAt: null,
        actualEndAt: null,
      };
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

function showHasStarted(showData, items = []) {
  const status = String(showData?.status || "").toLowerCase();
  return status === "running" || status === "hold" || items.some((item) => item.status === "live" || item.status === "done" || normalizeTimestamp(item.actualStartAt));
}

function initThemeToggle() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  const initial = stored === "light" ? "light" : "dark";
  document.body.dataset.theme = initial;
  const button = document.getElementById("themeToggleBtn");
  const sync = () => {
    const nextLabel = document.body.dataset.theme === "light" ? "Dark" : "Light";
    if (button) button.textContent = nextLabel;
  };
  sync();
  button?.addEventListener("click", () => {
    const next = document.body.dataset.theme === "light" ? "dark" : "light";
    document.body.dataset.theme = next;
    localStorage.setItem(THEME_STORAGE_KEY, next);
    sync();
  });
}

function normalizeQueueForPlan(items, showData, plan) {
  const active = activeItemsForPlan(items, plan);
  const activeIds = new Set(active.map((item) => item.id));
  const live = active.find((item) => item.status === "live") || null;
  const branchLocked = showData?.intermissionDecisionLocked || hasBranchItemStarted(items);
  const finalItems = items.map((item) => {
    if (!activeIds.has(item.id)) return { ...item, status: item.status === "done" ? "done" : "queued" };
    if (item.status === "done") return item;
    if (live && item.id === live.id) return { ...item, status: "live" };
    return { ...item, status: "queued" };
  });
  const activeFinal = activeItemsForPlan(finalItems, plan);
  const notDone = activeFinal.filter((item) => item.status !== "done" && item.status !== "live");
  const backstage = notDone[0] || null;
  const deck = notDone[1] || null;
  const currentId = live?.id || backstage?.id || activeFinal[0]?.id || null;
  const normalized = finalItems.map((item) => {
    if (!activeIds.has(item.id) || item.status === "done" || item.status === "live") return item;
    if (backstage && item.id === backstage.id) return { ...item, status: "backstage" };
    if (deck && item.id === deck.id) return { ...item, status: "blue" };
    return { ...item, status: "queued" };
  });
  return {
    items: normalized,
    show: {
      ...showData,
      intermissionPlan: plan,
      intermissionDecisionLocked: branchLocked,
      currentItemId: currentId,
    },
  };
}

async function initShow() {
  const batch = writeBatch(db);
  const now = new Date();
  const setupItems = Array.isArray(window.__currentSetupDraftForInit) && window.__currentSetupDraftForInit.length
    ? window.__currentSetupDraftForInit
    : setupItemsFromShow(window.__currentShowDataForInit || null, window.__currentRuntimeItemsForInit || []);
  const initialItems = buildRuntimeItemsFromSetup(setupItems.length ? setupItems : fallbackSetupItems());
  const hasBranches = hasBranchingItems(initialItems);
  const initialPlan = hasBranches ? DEFAULT_PLAN : PLAN_LINEAR;
  const plannedEndBaselineAt = new Date(now.getTime() + computeRemainingSeconds(initialItems, initialPlan) * 1000);
  const nextIds = new Set(initialItems.map((runtimeItem) => runtimeItem.id));
  const existing = await getDocs(itemsRef);
  existing.docs.forEach((docSnap) => {
    if (!nextIds.has(docSnap.id)) batch.delete(doc(itemsRef, docSnap.id));
  });
  const baseShow = {
    displayName: window.__currentShowDataForInit?.setupTitle || window.__currentShowDataForInit?.displayName || "Stage Management System",
    setupTitle: window.__currentShowDataForInit?.setupTitle || window.__currentShowDataForInit?.displayName || "",
    setupItems,
    setupUpdatedAt: window.__currentShowDataForInit?.setupUpdatedAt || null,
    status: "stopped",
    holdMessage: "",
    currentItemId: activeItemsForPlan(initialItems, initialPlan)[0]?.id || initialItems[0]?.id || null,
    intermissionMode: hasBranches ? "branched" : PLAN_LINEAR,
    intermissionPlan: initialPlan,
    intermissionDecisionLocked: false,
    actualShowStartAt: now,
    targetRuntimeSeconds: DEFAULT_TARGET_RUNTIME_SECONDS,
    safetyBufferMinutes: DEFAULT_SAFETY_BUFFER_MINUTES,
    plannedEndBaselineAt,
    projectedEndAt: plannedEndBaselineAt,
    offsetSeconds: 0,
    updatedAt: serverTimestamp(),
  };
  const normalized = normalizeQueueForPlan(initialItems, baseShow, initialPlan);
  normalized.items.forEach((runtimeItem) => batch.set(doc(itemsRef, runtimeItem.id), runtimeItem));
  batch.set(showRef, { ...normalized.show, projectedEndAt: plannedEndBaselineAt, offsetSeconds: 0, updatedAt: serverTimestamp() });
  await batch.commit();
  return { show: { ...normalized.show, projectedEndAt: plannedEndBaselineAt, offsetSeconds: 0 }, items: normalized.items };
}

function buildShiftMap(items, currentId, plan) {
  const active = activeItemsForPlan(items, plan);
  const current = active.find((item) => item.id === currentId);
  if (!current) return null;
  const notDone = active.filter((item) => item.status !== "done" && item.id !== currentId);
  const nextBackstage = notDone[0] || null;
  const nextDeck = notDone[1] || null;
  const activeIds = new Set(active.map((item) => item.id));
  const map = new Map();
  items.forEach((item) => {
    if (!activeIds.has(item.id)) map.set(item.id, item.status === "done" ? "done" : "queued");
    else if (item.status === "done") map.set(item.id, "done");
    else if (item.id === currentId) map.set(item.id, "live");
    else if (nextBackstage && item.id === nextBackstage.id) map.set(item.id, "backstage");
    else if (nextDeck && item.id === nextDeck.id) map.set(item.id, "blue");
    else map.set(item.id, "queued");
  });
  return map;
}

async function toggleHold(currentStatus, message) {
  const nextStatus = currentStatus === "hold" ? "running" : "hold";
  await updateDoc(showRef, {
    status: nextStatus,
    holdMessage: nextStatus === "hold" ? message || "HOLD" : "",
    updatedAt: serverTimestamp(),
  });
}

async function updatePlannedSeconds(itemId, plannedSeconds) {
  await updateDoc(doc(itemsRef, itemId), { plannedSeconds });
}

function getElapsedSeconds(actualStartAt) {
  const start = normalizeTimestamp(actualStartAt);
  if (!start) return null;
  return Math.floor((Date.now() - start.getTime()) / 1000);
}

function initOperatorView() {
  const operatorTimeEl = document.getElementById("operatorTime");
  if (!operatorTimeEl) return;

  const operatorProjectedEndEl = document.getElementById("operatorProjectedEnd");
  const operatorOffsetEl = document.getElementById("operatorOffset");
  const operatorShowStatusEl = document.getElementById("operatorShowStatus");
  const operatorHeaderStatusEl = document.getElementById("operatorHeaderStatus");
  const currentTitleEl = document.getElementById("currentTitle");
  const currentTypeEl = document.getElementById("currentType");
  const currentStatusEl = document.getElementById("currentStatus");
  const currentPlannedEl = document.getElementById("currentPlanned");
  const currentElapsedEl = document.getElementById("currentElapsed");
  const currentOverUnderEl = document.getElementById("currentOverUnder");
  const backstageTitleEl = document.getElementById("backstageTitle");
  const backstagePlannedEl = document.getElementById("backstagePlanned");
  const deckTitleEl = document.getElementById("blueTitle");
  const deckPlannedEl = document.getElementById("bluePlanned");
  const planLabelEl = document.getElementById("planLabel");
  const lockStatusEl = document.getElementById("lockStatus");
  const keepIntermissionBtn = document.getElementById("keepIntermissionBtn");
  const skipIntermissionBtn = document.getElementById("skipIntermissionBtn");
  const recommendationEl = document.getElementById("recommendation");
  const actualShowStartInput = document.getElementById("actualShowStartInput");
  const targetRuntimeHoursInput = document.getElementById("targetRuntimeHoursInput");
  const targetRuntimeMinutesInput = document.getElementById("targetRuntimeMinutesInput");
  const safetyBufferInput = document.getElementById("safetyBufferInput");
  const saveSettingsBtn = document.getElementById("saveSettingsBtn");
  const currentCaptainsEl = document.getElementById("currentCaptains");
  const backstageCaptainsEl = document.getElementById("backstageCaptains");
  const deckCaptainsEl = document.getElementById("deckCaptains");
  const reqNowTitleEl = document.getElementById("reqNowTitle");
  const reqNowMicsEl = document.getElementById("reqNowMics");
  const reqNowChairsEl = document.getElementById("reqNowChairs");
  const reqNowInstrumentsEl = document.getElementById("reqNowInstruments");
  const reqNowOtherEl = document.getElementById("reqNowOther");
  const reqBackTitleEl = document.getElementById("reqBackTitle");
  const reqBackMicsEl = document.getElementById("reqBackMics");
  const reqBackChairsEl = document.getElementById("reqBackChairs");
  const reqBackInstrumentsEl = document.getElementById("reqBackInstruments");
  const reqBackOtherEl = document.getElementById("reqBackOther");
  const reqBackChangeEl = document.getElementById("reqBackChange");
  const reqDeckTitleEl = document.getElementById("reqDeckTitle");
  const reqDeckMicsEl = document.getElementById("reqDeckMics");
  const reqDeckChairsEl = document.getElementById("reqDeckChairs");
  const reqDeckInstrumentsEl = document.getElementById("reqDeckInstruments");
  const reqDeckOtherEl = document.getElementById("reqDeckOther");
  const reqDeckChangeEl = document.getElementById("reqDeckChange");
  const startBtn = document.getElementById("startBtn");
  const endBtn = document.getElementById("endBtn");
  const undoBtn = document.getElementById("undoBtn");
  const holdBtn = document.getElementById("holdBtn");
  const initBtn = document.getElementById("initBtn");
  const runTableBody = document.querySelector("#runTable tbody");
  const advancedToggle = document.getElementById("advancedToggle");
  const setupTitleInput = document.getElementById("setupTitleInput");
  const setupStatusEl = document.getElementById("setupStatus");
  const setupTableBody = document.querySelector("#setupTable tbody");
  const addSetupItemBtn = document.getElementById("addSetupItemBtn");
  const loadSetupBtn = document.getElementById("loadSetupBtn");
  const saveSetupBtn = document.getElementById("saveSetupBtn");
  const setupSourceLabel = document.getElementById("setupSourceLabel");
  const excelImportInput = document.getElementById("excelImportInput");
  const previewImportBtn = document.getElementById("previewImportBtn");
  const applyImportBtn = document.getElementById("applyImportBtn");
  const importStatusEl = document.getElementById("importStatus");
  const importPreviewEl = document.getElementById("importPreview");
  const addSetupItemBtn2 = document.getElementById("addSetupItemBtn2");
  const setupSearchInput = document.getElementById("setupSearchInput");
  const setupBranchFilter = document.getElementById("setupBranchFilter");
  const setupPaginationLabel = document.getElementById("setupPaginationLabel");
  const runOfShowNavLink = document.querySelector("[data-side-tab='run']");
  const rosTableBody = document.querySelector("#runOfShowTable tbody");
  const rosSearchInput = document.getElementById("rosSearchInput");
  const rosStatusFilter = document.getElementById("rosStatusFilter");
  const rosTypeFilter = document.getElementById("rosTypeFilter");
  const rosBranchFilter = document.getElementById("rosBranchFilter");
  const rosShowCompletedToggle = document.getElementById("rosShowCompletedToggle");
  const rosJumpCurrentBtn = document.getElementById("rosJumpCurrentBtn");
  const rosExportBtn = document.getElementById("rosExportBtn");
  const rosSummaryEl = document.getElementById("rosSummary");
  const rosCountLabel = document.getElementById("rosCountLabel");
  const rosActivePlanEl = document.getElementById("rosActivePlan");
  const rosLiveItemEl = document.getElementById("rosLiveItem");
  const rosNextItemEl = document.getElementById("rosNextItem");
  const rosCompletedCountEl = document.getElementById("rosCompletedCount");
  const footerStatusEl = document.getElementById("footerStatus");

  let showData = null;
  let items = [];
  let setupDraft = [];
  let importDraft = [];
  let setupLoaded = false;
  let lastSnapshot = null;
  let actionInFlight = false;

  function activeSorted() {
    return activeItemsForPlan(items, planForShow(showData, items));
  }

  function currentSet() {
    const active = activeSorted();
    return {
      current: active.find((item) => item.status === "live") || active.find((item) => item.id === showData?.currentItemId) || null,
      backstage: active.find((item) => item.status === "backstage") || null,
      deck: active.find((item) => item.status === "blue") || null,
    };
  }

  function setActionButtonsDisabled(disabled) {
    if (startBtn) startBtn.disabled = disabled;
    if (endBtn) endBtn.disabled = disabled;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function branchLabel(branch) {
    const normalized = normalizeBranch(branch);
    if (normalized === PLAN_WITH_INTERMISSION) return "With Intermission";
    if (normalized === PLAN_SKIP_INTERMISSION) return "Skip Intermission";
    if (normalized === PLAN_LINEAR) return "Linear";
    if (normalized === "core") return "Core";
    if (normalized === "custom") return "Custom";
    return normalized ? normalized.toUpperCase() : "-";
  }

  function orderForRunMode(item, mode, activePlan) {
    if (mode === PLAN_WITH_INTERMISSION) return item.orderWithIntermission ?? item.order ?? item.seedIndex + 1;
    if (mode === PLAN_SKIP_INTERMISSION) return item.orderSkipIntermission ?? item.order ?? item.seedIndex + 1;
    if (mode === PLAN_LINEAR || mode === "core") return item.order ?? item.orderWithIntermission ?? item.orderSkipIntermission ?? item.seedIndex + 1;
    if (mode === "active") return planOrder(item, activePlan) ?? item.order ?? item.seedIndex + 1;
    return item.order ?? item.orderWithIntermission ?? item.orderSkipIntermission ?? item.seedIndex + 1;
  }

  function getRunModePlan(mode, activePlan) {
    if (mode === PLAN_WITH_INTERMISSION || mode === PLAN_SKIP_INTERMISSION || mode === PLAN_LINEAR) return mode;
    return activePlan;
  }

  function formatSignedDuration(seconds) {
    if (seconds == null || Number.isNaN(seconds)) return "-";
    if (seconds === 0) return "00:00";
    return `${seconds > 0 ? "+" : "-"}${formatDuration(Math.abs(seconds))}`;
  }

  function elapsedForRunItem(item) {
    const start = normalizeTimestamp(item?.actualStartAt);
    if (!start) return null;
    const end = normalizeTimestamp(item?.actualEndAt);
    const live = String(item?.status || "").toLowerCase() === "live";
    const stop = end || (live ? new Date() : null);
    if (!stop) return null;
    return Math.max(0, Math.round((stop - start) / 1000));
  }

  function manualChangeNotesHtml(item) {
    const notes = String(item?.changeNotes || "").split(/\n|,/).map((line) => line.trim()).filter(Boolean);
    if (!notes.length) return "-";
    return `<div class="change-pills">${notes.map((line) => {
      const type = line.startsWith("-") ? "remove" : line.startsWith("+") ? "add" : "";
      return `<span class="pill ${type}">${escapeHtml(line)}</span>`;
    }).join("")}</div>`;
  }

  function runSearchText(item) {
    return [
      item.title,
      item.type,
      item.status,
      branchLabel(item.branch),
      peopleText(item),
      getRequirement(item, "mics"),
      getRequirement(item, "chairs"),
      getRequirement(item, "instruments"),
      getRequirement(item, "other"),
      item.changeNotes,
      item.notes,
    ].join(" ").toLowerCase();
  }

  function refreshRunTypeFilter() {
    if (!rosTypeFilter) return;
    const selected = rosTypeFilter.value;
    const types = [...new Set(items.map((item) => String(item.type || "").trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
    rosTypeFilter.innerHTML = `<option value="">All types</option>${types.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join("")}`;
    if (types.includes(selected)) rosTypeFilter.value = selected;
  }

  function runRowsForCurrentFilters() {
    const activePlan = planForShow(showData, items);
    const mode = rosBranchFilter?.value || "active";
    const plan = getRunModePlan(mode, activePlan);
    let base = [];
    if (mode === "active") base = activeItemsForPlan(items, activePlan);
    else if (mode === "all") base = [...items];
    else if (mode === "core") base = items.filter((item) => {
      const branch = normalizeBranch(item.branch);
      return !branch || branch === "core" || branch === PLAN_LINEAR;
    });
    else base = activeItemsForPlan(items, plan);

    const search = String(rosSearchInput?.value || "").trim().toLowerCase();
    const statusFilter = String(rosStatusFilter?.value || "").toLowerCase();
    const typeFilter = String(rosTypeFilter?.value || "");
    const showCompleted = rosShowCompletedToggle?.checked !== false;

    return base
      .filter((item) => {
        const status = String(item.status || "queued").toLowerCase();
        if (!showCompleted && status === "done") return false;
        if (statusFilter && status !== statusFilter) return false;
        if (typeFilter && String(item.type || "") !== typeFilter) return false;
        if (search && !runSearchText(item).includes(search)) return false;
        return true;
      })
      .sort((a, b) => {
        const aOrder = orderForRunMode(a, mode, activePlan);
        const bOrder = orderForRunMode(b, mode, activePlan);
        return (aOrder || 9999) - (bOrder || 9999);
      })
      .map((item) => {
        const elapsed = elapsedForRunItem(item);
        const variance = elapsed == null ? null : elapsed - (item.plannedSeconds || 0);
        return {
          item,
          order: orderForRunMode(item, mode, activePlan),
          activeForPlan: isActiveForPlan(item, activePlan),
          elapsed,
          variance,
        };
      });
  }

  function setupStatus(message, tone = "") {
    if (!setupStatusEl) return;
    setupStatusEl.textContent = message;
    setupStatusEl.classList.toggle("warn", tone === "warn");
    setupStatusEl.classList.toggle("saved", tone === "saved");
  }

  function readSetupDraftFromDom() {
    if (!setupTableBody) return setupDraft;
    setupDraft = [...setupTableBody.querySelectorAll("tr")].map((row, index) => {
      const get = (selector) => row.querySelector(selector)?.value ?? "";
      const order = Number(get("[data-field='order']")) || index + 1;
      const type = get("[data-field='type']").trim() || "OTHER";
      return {
        id: row.dataset.id || slugifyId(get("[data-field='title']"), index),
        order,
        title: get("[data-field='title']").trim() || `Item ${index + 1}`,
        type,
        plannedSeconds: Math.max(0, parsePlannedSeconds(get("[data-field='planned']")) || 0),
        performers: parsePeople(get("[data-field='performers']")),
        branch: normalizeBranch(get("[data-field='branch']")),
        requirements: {
          mics: get("[data-field='mics']").trim() || defaultRequirements(type).mics,
          chairs: get("[data-field='chairs']").trim() || defaultRequirements(type).chairs,
          instruments: get("[data-field='instruments']").trim() || defaultRequirements(type).instruments,
          other: get("[data-field='other']").trim() || defaultRequirements(type).other,
        },
        changeNotes: get("[data-field='changeNotes']").trim(),
        notes: get("[data-field='notes']").trim(),
      };
    });
    return setupDraft;
  }

  function renderSetupTable() {
    if (!setupTableBody) return;
    const search = String(setupSearchInput?.value || "").trim().toLowerCase();
    const branchFilter = String(setupBranchFilter?.value || "");
    const visibleDraft = setupDraft.filter((item) => {
      const branchOk = !branchFilter || normalizeBranch(item.branch) === branchFilter;
      const haystack = `${item.title || ""} ${item.type || ""} ${peopleText(item)} ${item.notes || ""}`.toLowerCase();
      return branchOk && (!search || haystack.includes(search));
    });
    const rows = visibleDraft.map((item) => {
      const index = setupDraft.indexOf(item);
      const planned = formatPlannedInput(Number(item.plannedSeconds) || 0);
      const type = item.type || "OTHER";
      const req = item.requirements || defaultRequirements(type);
      const performers = peopleList(item).join(", ");
      const branch = normalizeBranch(item.branch);
      return `
        <tr data-id="${escapeHtml(item.id || slugifyId(item.title, index))}">
          <td><input class="setup-order" data-field="order" type="number" min="1" step="1" value="${escapeHtml(item.order || index + 1)}" /></td>
          <td><input class="setup-title" data-field="title" type="text" value="${escapeHtml(item.title || "")}" /></td>
          <td><input data-field="type" type="text" list="setupTypeOptions" value="${escapeHtml(type)}" /></td>
          <td><input data-field="planned" type="text" value="${escapeHtml(planned)}" /></td>
          <td><textarea class="setup-people" data-field="performers">${escapeHtml(performers)}</textarea></td>
          <td>
            <div class="setup-req-fields">
              <input data-field="mics" type="text" value="${escapeHtml(req.mics || "")}" aria-label="Mics" />
              <input data-field="chairs" type="text" value="${escapeHtml(req.chairs || "")}" aria-label="Chairs" />
              <input data-field="instruments" type="text" value="${escapeHtml(req.instruments || "")}" aria-label="Instruments" />
              <input data-field="other" type="text" value="${escapeHtml(req.other || "")}" aria-label="Other requirements" />
            </div>
          </td>
          <td>
            <select data-field="branch">
              <option value="core"${branch === "core" ? " selected" : ""}>Core / Linear</option>
              <option value="${PLAN_WITH_INTERMISSION}"${branch === PLAN_WITH_INTERMISSION ? " selected" : ""}>With Intermission</option>
              <option value="${PLAN_SKIP_INTERMISSION}"${branch === PLAN_SKIP_INTERMISSION ? " selected" : ""}>Skip Intermission</option>
              <option value="custom"${branch === "custom" ? " selected" : ""}>Custom / Inactive</option>
            </select>
          </td>
          <td><textarea data-field="changeNotes">${escapeHtml(item.changeNotes || "")}</textarea></td>
          <td><textarea data-field="notes">${escapeHtml(item.notes || "")}</textarea></td>
          <td>
            <div class="setup-row-actions">
              <button class="secondary" type="button" data-action="up">Up</button>
              <button class="secondary" type="button" data-action="down">Down</button>
              <button class="danger" type="button" data-action="delete">Delete</button>
            </div>
          </td>
        </tr>
      `;
    });
    setupTableBody.innerHTML = rows.join("");
    if (setupPaginationLabel) setupPaginationLabel.textContent = `Showing ${visibleDraft.length} of ${setupDraft.length} setup rows`;
  }

  function addSetupItem() {
    readSetupDraftFromDom();
    const nextOrder = setupDraft.length + 1;
    setupDraft.push({
      id: slugifyId("new-item", setupDraft.length),
      order: nextOrder,
      title: `New Item ${nextOrder}`,
      type: "OTHER",
      plannedSeconds: 180,
      performers: [],
      branch: "core",
      requirements: defaultRequirements("OTHER"),
      changeNotes: "",
      notes: "",
    });
    renderSetupTable();
    setupStatus("New item added. Save setup when ready.", "warn");
  }

  function loadSetupDraft(source = "saved") {
    setupDraft = setupItemsFromShow(showData, source === "runtime" ? items : []);
    if (setupTitleInput) setupTitleInput.value = showData?.setupTitle || showData?.displayName || "";
    renderSetupTable();
    setupStatus(source === "runtime" ? "Loaded current live items into setup." : "Loaded saved setup.", source === "runtime" ? "warn" : "");
    if (setupSourceLabel) setupSourceLabel.textContent = source === "runtime" ? "Live items / fallback" : "Saved setup";
  }

  async function saveSetupDraft() {
    readSetupDraftFromDom();
    if (!setupDraft.length) throw new Error("Add at least one show item before saving setup.");
    if (showHasStarted(showData, items) && !confirm("The show has already started. Save setup changes for the next reset?")) return;
    const sorted = [...setupDraft].sort((a, b) => (a.order || 0) - (b.order || 0)).map((item, index) => ({ ...item, order: index + 1 }));
    setupDraft = sorted;
    const title = setupTitleInput?.value?.trim() || showData?.displayName || "";
    const nextShowData = {
      ...(showData || {}),
      displayName: title || "Stage Management System",
      setupTitle: title,
      setupItems: sorted,
      setupUpdatedAt: new Date(),
    };
    const batch = writeBatch(db);
    batch.set(showRef, { ...nextShowData, setupUpdatedAt: serverTimestamp(), updatedAt: serverTimestamp() });
    await batch.commit();
    showData = nextShowData;
    renderSetupTable();
    setupStatus("Setup saved. Init Show / Reset will use it.", "saved");
    if (setupSourceLabel) setupSourceLabel.textContent = "Saved setup";
  }

  function importStatus(message, tone = "") {
    if (!importStatusEl) return;
    importStatusEl.textContent = message;
    importStatusEl.classList.toggle("warn", tone === "warn");
    importStatusEl.classList.toggle("saved", tone === "saved");
    importStatusEl.classList.toggle("danger", tone === "danger");
  }

  function canonicalHeader(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function valueFromRow(row, names) {
    const wanted = new Set(names.map(canonicalHeader));
    const key = Object.keys(row).find((candidate) => wanted.has(canonicalHeader(candidate)));
    return key ? row[key] : "";
  }

  function setupItemFromImportRow(row, index) {
    const title = String(valueFromRow(row, ["Title", "Item", "Name"]) || "").trim();
    const plannedRaw = valueFromRow(row, ["Planned", "Planned Time", "Duration"]);
    const plannedSeconds = parsePlannedSeconds(plannedRaw);
    const errors = [];
    if (!title) errors.push("Title is required.");
    if (!Number.isFinite(plannedSeconds) || plannedSeconds < 0) errors.push("Planned must be seconds, mm:ss, or h:mm:ss.");
    const type = String(valueFromRow(row, ["Type"]) || "OTHER").trim() || "OTHER";
    return {
      item: {
        id: slugifyId(title, index),
        order: Number(valueFromRow(row, ["Order", "#"])) || index + 1,
        title: title || `Row ${index + 2}`,
        type,
        plannedSeconds: Number.isFinite(plannedSeconds) ? plannedSeconds : 0,
        performers: parsePeople(valueFromRow(row, ["People", "Performers", "Captains"])),
        branch: normalizeBranch(valueFromRow(row, ["Branch"])),
        requirements: {
          mics: String(valueFromRow(row, ["Mics", "Microphones"]) || defaultRequirements(type).mics).trim(),
          chairs: String(valueFromRow(row, ["Chairs"]) || defaultRequirements(type).chairs).trim(),
          instruments: String(valueFromRow(row, ["Instruments"]) || defaultRequirements(type).instruments).trim(),
          other: String(valueFromRow(row, ["Other", "Other Requirements"]) || defaultRequirements(type).other).trim(),
        },
        changeNotes: String(valueFromRow(row, ["Change Notes", "Changes"]) || "").trim(),
        notes: String(valueFromRow(row, ["Notes"]) || "").trim(),
      },
      errors,
    };
  }

  async function loadXlsxLibrary() {
    if (window.XLSX) return window.XLSX;
    await new Promise((resolve, reject) => {
      const existing = document.querySelector("script[data-xlsx-loader]");
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = XLSX_CDN_URL;
      script.async = true;
      script.dataset.xlsxLoader = "true";
      script.onload = resolve;
      script.onerror = () => reject(new Error("Could not load the Excel parser. Check internet access and try again."));
      document.head.appendChild(script);
    });
    return window.XLSX;
  }

  function renderImportPreview(results) {
    if (!importPreviewEl) return;
    if (!results.length) {
      importPreviewEl.innerHTML = "";
      return;
    }
    const rows = results.slice(0, 12).map((result, index) => `
      <tr class="${result.errors.length ? "invalid" : ""}">
        <td>${index + 1}</td>
        <td>${escapeHtml(result.item.title)}</td>
        <td>${escapeHtml(result.item.type)}</td>
        <td>${escapeHtml(formatDuration(result.item.plannedSeconds))}</td>
        <td>${escapeHtml(result.item.performers.join(", "))}</td>
        <td>${escapeHtml(result.item.branch)}</td>
        <td>${result.errors.length ? escapeHtml(result.errors.join(" ")) : "OK"}</td>
      </tr>
    `).join("");
    importPreviewEl.innerHTML = `
      <table class="table preview-table">
        <thead><tr><th>#</th><th>Title</th><th>Type</th><th>Planned</th><th>People</th><th>Branch</th><th>Validation</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  async function previewExcelImport() {
    const file = excelImportInput?.files?.[0];
    if (!file) {
      importStatus("Choose an .xlsx file first.", "warn");
      return;
    }
    const XLSX = await loadXlsxLibrary();
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    if (!rows.length) throw new Error("The first worksheet has no data rows.");
    const headers = Object.keys(rows[0]).map(canonicalHeader);
    const missing = ["order", "title", "type", "planned"].filter((required) => !headers.includes(required));
    if (missing.length) {
      importDraft = [];
      renderImportPreview([]);
      importStatus(`Missing required columns: ${missing.join(", ")}.`, "danger");
      if (applyImportBtn) applyImportBtn.disabled = true;
      return;
    }
    const results = rows.map(setupItemFromImportRow);
    const badCount = results.filter((result) => result.errors.length).length;
    importDraft = badCount ? [] : results.map((result, index) => ({ ...result.item, order: index + 1 }));
    renderImportPreview(results);
    if (applyImportBtn) applyImportBtn.disabled = badCount > 0;
    importStatus(badCount ? `${badCount} row(s) need fixes before import.` : `${results.length} row(s) ready to import.`, badCount ? "danger" : "saved");
  }

  async function applyExcelImport() {
    if (!importDraft.length) {
      importStatus("Preview a valid import first.", "warn");
      return;
    }
    if (!confirm("Replace the current Show Setup with the imported rows?")) return;
    setupDraft = importDraft.map((item, index) => ({ ...item, order: index + 1 }));
    renderSetupTable();
    await saveSetupDraft();
    importStatus("Imported setup saved to Firestore.", "saved");
  }

  async function withActionLock(fn) {
    if (actionInFlight) return;
    actionInFlight = true;
    setActionButtonsDisabled(true);
    try {
      await fn();
    } finally {
      actionInFlight = false;
      setActionButtonsDisabled(false);
    }
  }

  function snapshotState() {
    return {
      show: {
        currentItemId: showData?.currentItemId,
        status: showData?.status,
        holdMessage: showData?.holdMessage || "",
        intermissionPlan: planForShow(showData, items),
        intermissionDecisionLocked: !!showData?.intermissionDecisionLocked,
        actualShowStartAt: showData?.actualShowStartAt || null,
        targetRuntimeSeconds: getTargetRuntimeSeconds(showData),
        safetyBufferMinutes: Number(showData?.safetyBufferMinutes ?? DEFAULT_SAFETY_BUFFER_MINUTES),
        projectedEndAt: showData?.projectedEndAt || null,
        offsetSeconds: showData?.offsetSeconds || 0,
      },
      items: items.map((item) => ({
        id: item.id,
        status: item.status,
        actualStartAt: item.actualStartAt || null,
        actualEndAt: item.actualEndAt || null,
        plannedSeconds: item.plannedSeconds || 0,
      })),
    };
  }

  async function undoSnapshot(snapshot) {
    if (!snapshot) return;
    const batch = writeBatch(db);
    snapshot.items.forEach((item) => {
      batch.update(doc(itemsRef, item.id), {
        status: item.status,
        actualStartAt: item.actualStartAt || null,
        actualEndAt: item.actualEndAt || null,
        plannedSeconds: item.plannedSeconds,
      });
    });
    batch.update(showRef, {
      ...snapshot.show,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  }

  function renderRunTable() {
    if (!runTableBody) return;
    const active = activeSorted();
    const orderMap = activeOrderById(items, planForShow(showData, items));
    runTableBody.innerHTML = "";
    active.forEach((item) => {
      const status = String(item.status || "queued").toLowerCase();
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${orderMap.get(item.id)}</td>
        <td>${item.title}</td>
        <td>${item.type}</td>
        <td><span class="tag ${status}">${displayStatus(status)}</span></td>
        <td>${formatDuration(item.plannedSeconds)}</td>
        <td>${peopleText(item)}</td>
        <td>${formatClock(item.actualStartAt)}</td>
        <td>${formatClock(item.actualEndAt)}</td>
        <td class="advanced" style="display:none;">
          <div class="flex">
            <button data-action="set" data-id="${item.id}" class="secondary">Set current</button>
            <button data-action="edit" data-id="${item.id}" class="secondary">Edit planned</button>
          </div>
        </td>
      `;
      runTableBody.appendChild(row);
    });
  }

  function renderRunOfShow() {
    if (!rosTableBody) return;
    refreshRunTypeFilter();
    const activePlan = planForShow(showData, items);
    const mode = rosBranchFilter?.value || "active";
    const active = activeItemsForPlan(items, activePlan);
    const { current, backstage, deck } = currentSet();
    const rows = runRowsForCurrentFilters();
    const completed = active.filter((item) => String(item.status || "").toLowerCase() === "done").length;

    if (rosActivePlanEl) rosActivePlanEl.textContent = planLabel(activePlan);
    if (rosLiveItemEl) rosLiveItemEl.textContent = current?.title || "-";
    if (rosNextItemEl) rosNextItemEl.textContent = [backstage?.title, deck?.title].filter(Boolean).join(" / ") || "-";
    if (rosCompletedCountEl) rosCompletedCountEl.textContent = `${completed} / ${active.length || 0}`;
    if (rosSummaryEl) {
      const modeLabel = rosBranchFilter?.selectedOptions?.[0]?.textContent || "Active Plan Only";
      rosSummaryEl.textContent = `${modeLabel} - ${rows.length} visible of ${items.length} runtime items`;
    }
    if (rosCountLabel) rosCountLabel.textContent = `Showing ${rows.length} runtime item${rows.length === 1 ? "" : "s"}`;

    if (!rows.length) {
      rosTableBody.innerHTML = `
        <tr>
          <td colspan="17" class="empty-cell">No runtime items match the current filters.</td>
        </tr>
      `;
      return;
    }

    rosTableBody.innerHTML = rows.map(({ item, order, activeForPlan, elapsed, variance }) => {
      const status = String(item.status || "queued").toLowerCase();
      const isCurrent = item.id === current?.id;
      const varianceClass = variance == null ? "signal-muted" : variance > 10 ? "signal-danger" : variance < -10 ? "signal-success" : "signal-info";
      const inactiveNote = !activeForPlan && mode === "all" ? `<span class="branch-note">Inactive branch</span>` : "";
      return `
        <tr data-item-id="${escapeHtml(item.id)}" class="${isCurrent ? "run-current-row" : ""} ${!activeForPlan && mode === "all" ? "run-inactive-row" : ""}">
          <td>${escapeHtml(order || "-")}</td>
          <td><strong>${escapeHtml(item.title || "-")}</strong>${inactiveNote}</td>
          <td>${escapeHtml(item.type || "-")}</td>
          <td><span class="tag ${escapeHtml(status)}">${displayStatus(status)}</span></td>
          <td><span class="branch-chip">${escapeHtml(branchLabel(item.branch))}</span></td>
          <td>${formatDuration(item.plannedSeconds)}</td>
          <td>${formatClock(item.actualStartAt)}</td>
          <td>${formatClock(item.actualEndAt)}</td>
          <td>${elapsed == null ? "-" : formatDuration(elapsed)}</td>
          <td class="${varianceClass}">${formatSignedDuration(variance)}</td>
          <td>${escapeHtml(peopleText(item))}</td>
          <td>${escapeHtml(getRequirement(item, "mics"))}</td>
          <td>${escapeHtml(getRequirement(item, "chairs"))}</td>
          <td>${escapeHtml(getRequirement(item, "instruments"))}</td>
          <td>${escapeHtml(getRequirement(item, "other"))}</td>
          <td>${manualChangeNotesHtml(item)}</td>
          <td>${escapeHtml(item.notes || "-")}</td>
        </tr>
      `;
    }).join("");
  }

  function renderNowRunningStatus(statusRaw) {
    const s = String(statusRaw || "").toLowerCase();
    if (s === "live") currentStatusEl.innerHTML = `<span class="live-badge"><span class="live-dot"></span>LIVE</span>`;
    else currentStatusEl.textContent = displayStatus(s);
  }

  function renderPlanCard() {
    const branching = hasBranchingItems(items);
    const plan = planForShow(showData, items);
    const locked = !!showData?.intermissionDecisionLocked || hasBranchItemStarted(items);
    const recommendation = getRecommendation(showData, items);
    if (planLabelEl) planLabelEl.textContent = planLabel(plan);
    if (lockStatusEl) {
      lockStatusEl.textContent = locked ? "LOCKED" : "UNLOCKED";
      lockStatusEl.className = `decision-status ${locked ? "locked" : "unlocked"}`;
    }
    if (recommendationEl) {
      recommendationEl.textContent = recommendation;
      recommendationEl.className = `recommendation ${recommendationTone(recommendation)}`;
    }
    if (keepIntermissionBtn) {
      keepIntermissionBtn.style.display = branching ? "" : "none";
      keepIntermissionBtn.disabled = locked || plan === PLAN_WITH_INTERMISSION;
      keepIntermissionBtn.classList.toggle("selected", plan === PLAN_WITH_INTERMISSION);
    }
    if (skipIntermissionBtn) {
      skipIntermissionBtn.style.display = branching ? "" : "none";
      skipIntermissionBtn.disabled = locked || plan === PLAN_SKIP_INTERMISSION;
      skipIntermissionBtn.classList.toggle("selected", plan === PLAN_SKIP_INTERMISSION);
    }
  }

  function formatTimeInput(date) {
    const d = normalizeTimestamp(date);
    if (!d) return "";
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  function renderSettings() {
    if (!showData) return;
    const startAt = getActualShowStartAt(showData);
    const runtime = getTargetRuntimeSeconds(showData);
    if (actualShowStartInput && document.activeElement !== actualShowStartInput) actualShowStartInput.value = formatTimeInput(startAt);
    if (targetRuntimeHoursInput && document.activeElement !== targetRuntimeHoursInput) targetRuntimeHoursInput.value = String(Math.floor(runtime / 3600));
    if (targetRuntimeMinutesInput && document.activeElement !== targetRuntimeMinutesInput) targetRuntimeMinutesInput.value = String(Math.round((runtime % 3600) / 60));
    if (safetyBufferInput && document.activeElement !== safetyBufferInput) safetyBufferInput.value = String(Number(showData.safetyBufferMinutes ?? DEFAULT_SAFETY_BUFFER_MINUTES));
  }

  function renderShow() {
    if (!showData) return;
    const plan = planForShow(showData, items);
    const { current, backstage, deck } = currentSet();

    operatorProjectedEndEl.textContent = formatClock(showData.projectedEndAt);
    operatorOffsetEl.textContent = showData.offsetSeconds == null ? "-" : `${showData.offsetSeconds > 0 ? "+" : ""}${formatOffset(showData.offsetSeconds)}`;
    applyOffsetSignal(operatorOffsetEl, showData.offsetSeconds);

    const statusText = showData.status?.toUpperCase() || "-";
    operatorShowStatusEl.textContent = statusText;
    if (footerStatusEl) footerStatusEl.textContent = `Status ${statusText} · ${activeSorted().length} active items`;
    if (operatorHeaderStatusEl) {
      operatorHeaderStatusEl.textContent = statusText;
      applyShowStatusChip(operatorHeaderStatusEl, showData.status);
    }

    currentTitleEl.textContent = current?.title || "-";
    currentTypeEl.textContent = current?.type || "-";
    renderNowRunningStatus(current?.status);
    currentPlannedEl.textContent = current ? formatDuration(current.plannedSeconds) : "-";

    backstageTitleEl.textContent = backstage?.title || "-";
    backstagePlannedEl.textContent = backstage ? formatDuration(backstage.plannedSeconds) : "-";
    deckTitleEl.textContent = deck?.title || "-";
    deckPlannedEl.textContent = deck ? formatDuration(deck.plannedSeconds) : "-";

    currentCaptainsEl.textContent = peopleText(current);
    backstageCaptainsEl.textContent = peopleText(backstage);
    deckCaptainsEl.textContent = peopleText(deck);

    reqNowTitleEl.textContent = current?.title || "-";
    reqNowMicsEl.textContent = getRequirement(current, "mics");
    reqNowChairsEl.textContent = getRequirement(current, "chairs");
    reqNowInstrumentsEl.textContent = getRequirement(current, "instruments");
    reqNowOtherEl.textContent = getRequirement(current, "other");

    reqBackTitleEl.textContent = backstage?.title || "-";
    reqBackMicsEl.textContent = getRequirement(backstage, "mics");
    reqBackChairsEl.textContent = getRequirement(backstage, "chairs");
    reqBackInstrumentsEl.textContent = getRequirement(backstage, "instruments");
    reqBackOtherEl.textContent = getRequirement(backstage, "other");

    reqDeckTitleEl.textContent = deck?.title || "-";
    reqDeckMicsEl.textContent = getRequirement(deck, "mics");
    reqDeckChairsEl.textContent = getRequirement(deck, "chairs");
    reqDeckInstrumentsEl.textContent = getRequirement(deck, "instruments");
    reqDeckOtherEl.textContent = getRequirement(deck, "other");

    renderChangeSummary(reqBackChangeEl, current, backstage);
    renderChangeSummary(reqDeckChangeEl, backstage, deck);
    renderPlanCard();
    renderSettings();

    const normalized = normalizeQueueForPlan(items, showData, plan);
    if (showData.intermissionDecisionLocked !== normalized.show.intermissionDecisionLocked && normalized.show.intermissionDecisionLocked) {
      updateDoc(showRef, { intermissionDecisionLocked: true, updatedAt: serverTimestamp() }).catch(() => {});
    }
  }

  function updateClock() {
    operatorTimeEl.textContent = formatClock(new Date());
    const current = currentSet().current;
    const elapsed = getElapsedSeconds(current?.actualStartAt);
    currentElapsedEl.textContent = elapsed == null ? "-" : formatDuration(elapsed);
    const planned = current?.plannedSeconds || 0;
    if (elapsed != null) {
      const diff = elapsed - planned;
      currentOverUnderEl.textContent = `${diff > 0 ? "+" : diff < 0 ? "-" : ""}${formatDuration(Math.abs(diff))}`;
      applyOverUnderSignal(currentOverUnderEl, diff);
    } else {
      currentOverUnderEl.textContent = "-";
      applySignal(currentOverUnderEl, "muted");
    }
    if (document.querySelector("[data-tab-panel='run']:not([hidden])")) renderRunOfShow();
  }

  function safeRun(fn) {
    return fn().catch((error) => {
      alert(error?.message || String(error));
    });
  }

  async function commitItemAndShowState(nextItems, nextShow) {
    const plan = planForShow(nextShow, nextItems);
    const { projectedEndAt, offsetSeconds } = computeProjectedTiming(nextShow, nextItems, plan);
    const batch = writeBatch(db);
    nextItems.forEach((item) => batch.update(doc(itemsRef, item.id), item));
    batch.update(showRef, {
      ...nextShow,
      projectedEndAt,
      offsetSeconds,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  }

  async function startCurrentItemFast() {
    if (!showData) throw new Error("Show not initialized. Click Init Show / Reset first.");
    if (!Array.isArray(items) || !items.length) throw new Error("Items not loaded yet. Try again in a moment.");
    const plan = planForShow(showData, items);
    const currentId = showData.currentItemId || activeSorted()[0]?.id;
    const currentItem = activeSorted().find((item) => item.id === currentId);
    if (!currentItem) throw new Error(`Current item not found: ${currentId}`);
    const target = buildShiftMap(items, currentId, plan);
    if (!target) throw new Error("Could not build queue shift map.");
    const now = new Date();
    const nextItems = items.map((item) => {
      const next = { ...item, status: target.get(item.id) || item.status };
      if (item.id === currentId && !item.actualStartAt) next.actualStartAt = now;
      return next;
    });
    const locked = showData.intermissionDecisionLocked || (currentItem.branch !== "core" && currentItem.branch !== PLAN_LINEAR) || hasBranchItemStarted(nextItems);
    const nextShow = {
      ...showData,
      status: showData.status === "hold" ? "hold" : "running",
      intermissionDecisionLocked: locked,
    };
    items = nextItems;
    showData = nextShow;
    renderShow();
    renderRunTable();
    renderRunOfShow();
    await commitItemAndShowState(nextItems, nextShow);
  }

  async function endCurrentItemFast() {
    if (!showData) throw new Error("Show not initialized. Click Init Show / Reset first.");
    if (!Array.isArray(items) || !items.length) throw new Error("Items not loaded yet. Try again in a moment.");
    const plan = planForShow(showData, items);
    const active = activeSorted();
    const liveItem = active.find((item) => item.status === "live") || active.find((item) => item.id === showData.currentItemId);
    if (!liveItem) throw new Error("No LIVE/current item found to end.");
    const now = new Date();
    const baseItems = items.map((item) => {
      if (item.id === liveItem.id) return { ...item, status: "done", actualEndAt: now };
      return item;
    });
    const nextShowBase = {
      ...showData,
      intermissionDecisionLocked: showData.intermissionDecisionLocked || (liveItem.branch !== "core" && liveItem.branch !== PLAN_LINEAR) || hasBranchItemStarted(baseItems),
    };
    const normalized = normalizeQueueForPlan(baseItems, nextShowBase, plan);
    const activeAfter = activeItemsForPlan(normalized.items, plan);
    const hasRemaining = activeAfter.some((item) => item.status !== "done");
    const nextShow = {
      ...normalized.show,
      status: hasRemaining ? (showData.status === "hold" ? "hold" : "running") : "stopped",
    };
    items = normalized.items;
    showData = nextShow;
    renderShow();
    renderRunTable();
    renderRunOfShow();
    await commitItemAndShowState(normalized.items, nextShow);
  }

  async function setIntermissionPlan(plan) {
    if (!showData) throw new Error("Show not initialized. Click Init Show / Reset first.");
    if (!hasBranchingItems(items)) throw new Error("This setup is linear and does not use an intermission branch.");
    const locked = !!showData.intermissionDecisionLocked || hasBranchItemStarted(items);
    if (locked) throw new Error("Intermission decision is locked because a branch-only item has started.");
    const nextShowBase = { ...showData, intermissionPlan: plan, intermissionDecisionLocked: false };
    const normalized = normalizeQueueForPlan(items, nextShowBase, plan);
    items = normalized.items;
    showData = normalized.show;
    renderShow();
    renderRunTable();
    renderRunOfShow();
    await commitItemAndShowState(normalized.items, normalized.show);
  }

  async function saveSettings() {
    if (!showData) throw new Error("Show not initialized. Click Init Show / Reset first.");
    const timeValue = actualShowStartInput?.value || "";
    const [hh, mm] = timeValue.split(":").map((part) => Number(part));
    const base = getActualShowStartAt(showData) || new Date();
    const actualShowStartAt = new Date(base);
    if (Number.isFinite(hh) && Number.isFinite(mm)) {
      actualShowStartAt.setHours(hh, mm, 0, 0);
    }
    const hours = Number(targetRuntimeHoursInput?.value || 0);
    const minutes = Number(targetRuntimeMinutesInput?.value || 0);
    const targetRuntimeSeconds = Math.max(60, (Number.isFinite(hours) ? hours : 0) * 3600 + (Number.isFinite(minutes) ? minutes : 0) * 60);
    const safetyBufferMinutes = Math.max(0, Number(safetyBufferInput?.value || DEFAULT_SAFETY_BUFFER_MINUTES));
    const nextShow = {
      ...showData,
      actualShowStartAt,
      targetRuntimeSeconds,
      safetyBufferMinutes,
    };
    await commitItemAndShowState(items, nextShow);
  }

  function setActiveTab(tab) {
    document.querySelectorAll("[data-tab]").forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tab));
    document.querySelectorAll("[data-tab-panel]").forEach((panel) => {
      const active = panel.dataset.tabPanel === tab;
      panel.hidden = !active;
      panel.classList.toggle("active", active);
    });
    document.querySelectorAll(".sidebar-nav a").forEach((link) => {
      if (link === runOfShowNavLink) link.classList.toggle("active", tab === "run");
      else if (link.getAttribute("href") === "./operator.html") link.classList.toggle("active", tab !== "run");
    });
    if (tab === "run") renderRunOfShow();
  }

  function currentRunItem() {
    const active = activeSorted();
    return active.find((item) => item.status === "live")
      || active.find((item) => item.id === showData?.currentItemId)
      || active.find((item) => item.status === "backstage")
      || active.find((item) => item.status === "blue")
      || null;
  }

  function focusCurrentRunItem() {
    const target = currentRunItem();
    if (!target) return;
    setActiveTab("run");
    renderRunOfShow();
    let row = [...(rosTableBody?.querySelectorAll("tr") || [])].find((candidate) => candidate.dataset.itemId === target.id);
    if (!row) {
      if (rosSearchInput) rosSearchInput.value = "";
      if (rosStatusFilter) rosStatusFilter.value = "";
      if (rosTypeFilter) rosTypeFilter.value = "";
      if (rosBranchFilter) rosBranchFilter.value = "active";
      if (rosShowCompletedToggle) rosShowCompletedToggle.checked = true;
      renderRunOfShow();
      row = [...(rosTableBody?.querySelectorAll("tr") || [])].find((candidate) => candidate.dataset.itemId === target.id);
    }
    if (!row) return;
    row.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    row.classList.add("run-row-pulse");
    window.setTimeout(() => row.classList.remove("run-row-pulse"), 1800);
  }

  function csvValue(value) {
    const raw = String(value ?? "");
    return /[",\n\r]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
  }

  function exportRunOfShowCsv() {
    const headers = [
      "Order",
      "Title",
      "Type",
      "Status",
      "Branch",
      "Planned Time",
      "Actual Start",
      "Actual End",
      "Elapsed",
      "Variance",
      "People",
      "Mics",
      "Chairs",
      "Instruments",
      "Other",
      "Change Notes",
      "Notes",
    ];
    const rows = runRowsForCurrentFilters().map(({ item, order, elapsed, variance }) => [
      order || "",
      item.title || "",
      item.type || "",
      displayStatus(item.status),
      branchLabel(item.branch),
      formatDuration(item.plannedSeconds),
      formatClock(item.actualStartAt),
      formatClock(item.actualEndAt),
      elapsed == null ? "" : formatDuration(elapsed),
      variance == null ? "" : formatSignedDuration(variance),
      peopleText(item) === "-" ? "" : peopleText(item),
      getRequirement(item, "mics"),
      getRequirement(item, "chairs"),
      getRequirement(item, "instruments"),
      getRequirement(item, "other"),
      item.changeNotes || "",
      item.notes || "",
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvValue).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `run-of-show-${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  startBtn?.addEventListener("click", () => safeRun(() => withActionLock(async () => {
    lastSnapshot = snapshotState();
    await startCurrentItemFast();
  })));

  endBtn?.addEventListener("click", () => safeRun(() => withActionLock(async () => {
    lastSnapshot = snapshotState();
    await endCurrentItemFast();
  })));

  undoBtn?.addEventListener("click", () => safeRun(async () => {
    if (!lastSnapshot) return;
    await undoSnapshot(lastSnapshot);
    lastSnapshot = null;
  }));

  holdBtn?.addEventListener("click", () => safeRun(async () => {
    const message = prompt("Hold message", showData?.holdMessage || "HOLD");
    await toggleHold(showData?.status, message);
  }));

  initBtn?.addEventListener("click", () => safeRun(async () => {
    if (!confirm("Reset the show? This will overwrite all live item data with the saved Show Setup.")) return;
    readSetupDraftFromDom();
    window.__currentShowDataForInit = showData;
    window.__currentRuntimeItemsForInit = items;
    window.__currentSetupDraftForInit = setupDraft;
    const initialized = await initShow();
    if (initialized) {
      showData = initialized.show;
      items = initialized.items;
      renderShow();
      renderRunTable();
      renderRunOfShow();
    }
  }));

  addSetupItemBtn?.addEventListener("click", () => {
    addSetupItem();
  });
  addSetupItemBtn2?.addEventListener("click", () => addSetupItem());
  setupSearchInput?.addEventListener("input", () => renderSetupTable());
  setupBranchFilter?.addEventListener("change", () => renderSetupTable());

  loadSetupBtn?.addEventListener("click", () => {
    if (showHasStarted(showData, items) && !confirm("The show has already started. Load current live items into setup for future resets?")) return;
    loadSetupDraft("runtime");
  });

  saveSetupBtn?.addEventListener("click", () => safeRun(() => saveSetupDraft()));
  previewImportBtn?.addEventListener("click", () => safeRun(() => previewExcelImport()));
  applyImportBtn?.addEventListener("click", () => safeRun(() => applyExcelImport()));

  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.tab));
  });
  runOfShowNavLink?.addEventListener("click", (event) => {
    event.preventDefault();
    setActiveTab("run");
  });
  setActiveTab("live");

  setupTableBody?.addEventListener("input", () => setupStatus("Unsaved setup changes.", "warn"));

  setupTableBody?.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const row = button.closest("tr");
    const index = [...setupTableBody.querySelectorAll("tr")].indexOf(row);
    readSetupDraftFromDom();
    if (button.dataset.action === "delete") {
      if (showHasStarted(showData, items) && !confirm("Delete this setup item for the next reset?")) return;
      setupDraft.splice(index, 1);
    }
    if (button.dataset.action === "up" && index > 0) {
      [setupDraft[index - 1], setupDraft[index]] = [setupDraft[index], setupDraft[index - 1]];
    }
    if (button.dataset.action === "down" && index < setupDraft.length - 1) {
      [setupDraft[index + 1], setupDraft[index]] = [setupDraft[index], setupDraft[index + 1]];
    }
    setupDraft = setupDraft.map((item, idx) => ({ ...item, order: idx + 1 }));
    renderSetupTable();
    setupStatus("Unsaved setup changes.", "warn");
  });

  keepIntermissionBtn?.addEventListener("click", () => safeRun(() => setIntermissionPlan(PLAN_WITH_INTERMISSION)));
  skipIntermissionBtn?.addEventListener("click", () => safeRun(() => setIntermissionPlan(PLAN_SKIP_INTERMISSION)));
  saveSettingsBtn?.addEventListener("click", () => safeRun(() => saveSettings()));
  rosSearchInput?.addEventListener("input", () => renderRunOfShow());
  rosStatusFilter?.addEventListener("change", () => renderRunOfShow());
  rosTypeFilter?.addEventListener("change", () => renderRunOfShow());
  rosBranchFilter?.addEventListener("change", () => renderRunOfShow());
  rosShowCompletedToggle?.addEventListener("change", () => renderRunOfShow());
  rosJumpCurrentBtn?.addEventListener("click", () => focusCurrentRunItem());
  rosExportBtn?.addEventListener("click", () => exportRunOfShowCsv());

  advancedToggle?.addEventListener("change", () => {
    const enabled = advancedToggle.checked;
    document.querySelectorAll(".advanced").forEach((cell) => (cell.style.display = enabled ? "table-cell" : "none"));
    const advancedHeader = document.getElementById("advancedHeader");
    if (advancedHeader) advancedHeader.style.display = enabled ? "table-cell" : "none";
  });

  runTableBody?.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    safeRun(async () => {
      if (button.dataset.action === "set") {
        const itemId = button.dataset.id;
        const nextShowBase = { ...showData, currentItemId: itemId };
        const normalized = normalizeQueueForPlan(items, nextShowBase, planForShow(showData, items));
        await commitItemAndShowState(normalized.items, normalized.show);
      }
      if (button.dataset.action === "edit") {
        const value = prompt("Enter planned seconds", "180");
        const seconds = Number(value);
        if (!Number.isNaN(seconds)) await updatePlannedSeconds(button.dataset.id, seconds);
      }
    });
  });

  subscribeShow((data) => {
    showData = data;
    if (!setupLoaded && Array.isArray(showData?.setupItems) && showData.setupItems.length) {
      setupLoaded = true;
      loadSetupDraft("saved");
    }
    renderShow();
    renderRunTable();
    renderRunOfShow();
  });
  subscribeItems((list) => {
    items = list;
    if (!setupLoaded && (items.length || showData)) {
      setupLoaded = true;
      loadSetupDraft(Array.isArray(showData?.setupItems) && showData.setupItems.length ? "saved" : "runtime");
    }
    renderShow();
    renderRunTable();
    renderRunOfShow();
  });

  setInterval(updateClock, 1000);
  updateClock();
}

function initOpenView() {
  const showStatusEl = document.getElementById("showStatus");
  const holdBarEl = document.getElementById("holdBar");
  const scheduleStatusEl = document.getElementById("scheduleStatus");
  const projectedEndEl = document.getElementById("projectedEnd");
  const currentTimeEl = document.getElementById("currentTime");
  const upcomingListEl = document.getElementById("upcomingList");
  const liveTitleEl = document.getElementById("liveTitle");
  const livePerformersEl = document.getElementById("livePerformers");
  const liveCaptainsEl = document.getElementById("liveCaptains");
  const backstageTitleEl = document.getElementById("backstageTitle");
  const backstagePerformersEl = document.getElementById("backstagePerformers");
  const backstageCaptainsEl = document.getElementById("backstageCaptains");
  const backstageTimerEl = document.getElementById("backstageTimer");
  const blueTitleEl = document.getElementById("blueTitle");
  const bluePerformersEl = document.getElementById("bluePerformers");
  const blueCaptainsEl = document.getElementById("blueCaptains");
  const blueTimerEl = document.getElementById("blueTimer");
  const peopleOnStageSummaryEl = document.getElementById("peopleOnStageSummary");
  const performerLiveStatusEl = document.getElementById("performerLiveStatus");

  if (!scheduleStatusEl || !projectedEndEl || !currentTimeEl) return;

  let showData = null;
  let items = [];
  let renderQueued = false;

  const cache = {
    sorted: [],
    indexById: new Map(),
    prefixSeconds: [0],
    liveRuntime: null,
    anchor: null,
    backstage: null,
    deck: null,
    startIdx: 0,
  };

  function scheduleRenderAll() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      renderAll();
    });
  }

  function typeLine(item) {
    return item?.type || "-";
  }

  function rebuildCache() {
    const plan = planForShow(showData, items);
    cache.sorted = activeItemsForPlan(items, plan);
    cache.indexById = new Map(cache.sorted.map((item, idx) => [item.id, idx]));
    const pref = [0];
    cache.sorted.forEach((item) => pref.push(pref[pref.length - 1] + (item.status === "done" ? 0 : item.plannedSeconds || 0)));
    cache.prefixSeconds = pref;
    cache.liveRuntime = cache.sorted.find((item) => item.status === "live") || null;
    cache.anchor = cache.liveRuntime || cache.sorted.find((item) => item.id === showData?.currentItemId) || null;
    cache.backstage = cache.sorted.find((item) => item.status === "backstage") || null;
    cache.deck = cache.sorted.find((item) => item.status === "blue") || null;
    const anchorIdx = cache.anchor ? cache.indexById.get(cache.anchor.id) ?? -1 : -1;
    cache.startIdx = anchorIdx >= 0 ? anchorIdx : 0;
  }

  function getOpenScheduleLabel(offsetSeconds) {
    if (offsetSeconds == null || Number.isNaN(offsetSeconds)) return "ON TIME";
    if (Math.abs(offsetSeconds) < 180) return "ON TIME";
    return offsetSeconds > 0 ? "BEHIND" : "AHEAD";
  }

  function applyOpenScheduleSignal(el, offsetSeconds) {
    const label = getOpenScheduleLabel(offsetSeconds);
    if (label === "AHEAD") return applySignal(el, "success");
    if (label === "BEHIND") return applySignal(el, "danger");
    return applySignal(el, "info");
  }

  function remainingSecondsForLive() {
    if (!cache.liveRuntime) return null;
    const elapsed = getElapsedSeconds(cache.liveRuntime.actualStartAt);
    if (elapsed == null) return null;
    return Math.max(0, (cache.liveRuntime.plannedSeconds || 0) - elapsed);
  }

  function secondsUntilItemStarts(targetItem) {
    if (!targetItem) return null;
    const status = String(showData?.status || "").toLowerCase();
    if (status === "hold" || status === "stopped") return null;
    if (!cache.liveRuntime) return null;
    const baseRemaining = remainingSecondsForLive();
    if (baseRemaining == null) return null;
    const liveIdx = cache.indexById.get(cache.liveRuntime.id);
    const targetIdx = cache.indexById.get(targetItem.id);
    if (liveIdx == null || targetIdx == null || targetIdx <= liveIdx) return null;
    const between = cache.prefixSeconds[targetIdx] - cache.prefixSeconds[liveIdx + 1];
    return baseRemaining + between;
  }

  function renderHeaderAndTopStats() {
    currentTimeEl.textContent = formatClock(new Date());
    projectedEndEl.textContent = formatClock(showData?.projectedEndAt || showData?.plannedEndBaselineAt);
    const offset = showData?.offsetSeconds;
    const label = getOpenScheduleLabel(offset);
    scheduleStatusEl.textContent = label === "ON TIME" ? "ON TIME" : `${label} ${formatOffset(offset)}`;
    applyOpenScheduleSignal(scheduleStatusEl, offset);

    const statusLower = String(showData?.status || "").toLowerCase();
    if (showStatusEl) {
      showStatusEl.textContent = showData?.status ? String(showData.status).toUpperCase() : "LOADING...";
      applyShowStatusChip(showStatusEl, statusLower);
    }
    if (holdBarEl) {
      holdBarEl.style.display = statusLower === "hold" ? "block" : "none";
      holdBarEl.textContent = statusLower === "hold" ? showData?.holdMessage || "HOLD" : "";
    }
  }

  function renderUpcomingList() {
    if (!upcomingListEl) return;
    const upcoming = cache.sorted.slice(cache.startIdx).filter((item) => item.status !== "done");
    const frag = document.createDocumentFragment();
    if (!upcoming.length) {
      const row = document.createElement("div");
      row.className = "list-item";
      row.innerHTML = `<div><div>-</div><div class="meta">No upcoming items.</div></div><span class="tag queued">-</span>`;
      frag.appendChild(row);
    } else {
      upcoming.forEach((item) => {
        const status = String(item.status || "queued").toLowerCase();
        const capLine = openPeopleLine(item);
        const row = document.createElement("div");
        row.className = "list-item";
        row.innerHTML = `
          <div>
            <div>${item.title || "-"}</div>
            <div class="meta">${typeLine(item)}</div>
            ${capLine ? `<div class="captains-line">${capLine}</div>` : ""}
          </div>
          <span class="tag ${status}">${displayStatus(status)}</span>
        `;
        frag.appendChild(row);
      });
    }
    upcomingListEl.innerHTML = "";
    upcomingListEl.appendChild(frag);
  }

  function renderRightCards() {
    const anchor = cache.anchor;
    if (liveTitleEl) liveTitleEl.textContent = anchor?.title || "-";
    if (livePerformersEl) livePerformersEl.textContent = typeLine(anchor);
    if (liveCaptainsEl) liveCaptainsEl.textContent = openPeopleLine(anchor);
    if (peopleOnStageSummaryEl) peopleOnStageSummaryEl.textContent = peopleText(anchor);
    if (performerLiveStatusEl) performerLiveStatusEl.textContent = cache.liveRuntime ? "LIVE" : "Standby";
    if (backstageTitleEl) backstageTitleEl.textContent = cache.backstage?.title || "-";
    if (backstagePerformersEl) backstagePerformersEl.textContent = typeLine(cache.backstage);
    if (backstageCaptainsEl) backstageCaptainsEl.textContent = openPeopleLine(cache.backstage);
    if (blueTitleEl) blueTitleEl.textContent = cache.deck?.title || "-";
    if (bluePerformersEl) bluePerformersEl.textContent = typeLine(cache.deck);
    if (blueCaptainsEl) blueCaptainsEl.textContent = openPeopleLine(cache.deck);
  }

  function updateTimersOnly() {
    currentTimeEl.textContent = formatClock(new Date());
    const status = String(showData?.status || "").toLowerCase();
    const frozen = status === "hold" || status === "stopped";
    const tBack = frozen ? null : secondsUntilItemStarts(cache.backstage);
    const tBlue = frozen ? null : secondsUntilItemStarts(cache.deck);
    if (backstageTimerEl) backstageTimerEl.textContent = `GO TO STAGE IN: ${tBack == null ? "-" : formatDuration(tBack)}`;
    if (blueTimerEl) blueTimerEl.textContent = `GET READY IN: ${tBlue == null ? "-" : formatDuration(tBlue)}`;
  }

  function renderAll() {
    rebuildCache();
    renderHeaderAndTopStats();
    renderUpcomingList();
    renderRightCards();
    updateTimersOnly();
  }

  subscribeShow((data) => {
    showData = data;
    scheduleRenderAll();
  });
  subscribeItems((list) => {
    items = list;
    scheduleRenderAll();
  });

  setInterval(updateTimersOnly, 1000);
  updateTimersOnly();
}

function initConfidenceView() {
  const confidenceRoot = document.getElementById("confidenceRoot");
  if (!confidenceRoot) return;

  const currentTimeEl = document.getElementById("confidenceCurrentTime");
  const projectedEndEl = document.getElementById("confidenceProjectedEnd");
  const offsetEl = document.getElementById("confidenceOffset");
  const statusEl = document.getElementById("confidenceStatus");
  const currentTitleEl = document.getElementById("confidenceCurrentTitle");
  const liveIndicatorEl = document.getElementById("confidenceLiveIndicator");
  const elapsedEl = document.getElementById("confidenceElapsed");
  const overUnderEl = document.getElementById("confidenceOverUnder");
  const estimatedEndEl = document.getElementById("confidenceEstimatedEnd");
  const nextTitleEl = document.getElementById("confidenceNextTitle");
  const estimatedStartEl = document.getElementById("confidenceEstimatedStart");
  const countdownEl = document.getElementById("confidenceCountdown");
  const recommendationEl = document.getElementById("confidenceRecommendation");
  const targetEndEl = document.getElementById("confidenceTargetEnd");

  let showData = null;
  let items = [];

  function activeSorted() {
    return activeItemsForPlan(items, planForShow(showData, items));
  }

  function currentAndNext() {
    const active = activeSorted();
    const live = active.find((item) => item.status === "live") || null;
    const current = live || active.find((item) => item.id === showData?.currentItemId) || active.find((item) => item.status === "backstage") || null;
    const currentIdx = current ? active.findIndex((item) => item.id === current.id) : -1;
    const next = active.slice(Math.max(0, currentIdx + 1)).find((item) => item.status !== "done") || null;
    return { current, next, isLive: !!live };
  }

  function fixedEstimatedEnd(item) {
    const start = normalizeTimestamp(item?.actualStartAt);
    if (!start || !item) return null;
    return new Date(start.getTime() + (item.plannedSeconds || 0) * 1000);
  }

  function applyExpired(el, expired) {
    if (!el) return;
    el.classList.toggle("expired-blink", !!expired);
  }

  function renderConfidence() {
    const now = new Date();
    const { current, next, isLive } = currentAndNext();
    const elapsed = getElapsedSeconds(current?.actualStartAt);
    const planned = current?.plannedSeconds || 0;
    const estimatedEnd = fixedEstimatedEnd(current);
    const endExpired = estimatedEnd ? now > estimatedEnd : false;
    const countdownSecondsRaw = estimatedEnd ? Math.round((estimatedEnd - now) / 1000) : null;
    const countdownSeconds = countdownSecondsRaw == null ? null : Math.max(0, countdownSecondsRaw);
    const countdownExpired = countdownSecondsRaw != null && countdownSecondsRaw <= 0;
    const offsetStatus = getOffsetStatus(showData?.offsetSeconds);
    const recommendation = getRecommendation(showData, items);

    currentTimeEl.textContent = formatClock(now);
    projectedEndEl.textContent = formatClock(showData?.projectedEndAt || showData?.plannedEndBaselineAt);
    offsetEl.textContent = showData?.offsetSeconds == null ? "-" : `${showData.offsetSeconds > 0 ? "+" : ""}${formatOffset(showData.offsetSeconds)}`;
    statusEl.textContent = offsetStatus;
    statusEl.className = `confidence-status ${offsetStatus.toLowerCase().replaceAll(" ", "-")}`;

    currentTitleEl.textContent = current?.title || "-";
    liveIndicatorEl.classList.toggle("is-live", isLive);
    liveIndicatorEl.querySelector("span:last-child").textContent = isLive ? "LIVE" : "STANDBY";
    elapsedEl.textContent = elapsed == null ? "-" : formatDuration(elapsed);
    if (elapsed == null) {
      overUnderEl.textContent = "-";
      applyExpired(overUnderEl, false);
    } else {
      const diff = elapsed - planned;
      overUnderEl.textContent = `${diff > 0 ? "+" : diff < 0 ? "-" : ""}${formatDuration(Math.abs(diff))}`;
      applyExpired(overUnderEl, diff > 0);
    }

    estimatedEndEl.textContent = formatClock(estimatedEnd);
    applyExpired(estimatedEndEl, endExpired);

    nextTitleEl.textContent = next?.title || "-";
    estimatedStartEl.textContent = formatClock(estimatedEnd);
    countdownEl.textContent = countdownSeconds == null ? "-" : formatDuration(countdownSeconds);
    applyExpired(countdownEl, countdownExpired);

    recommendationEl.textContent = recommendation;
    recommendationEl.className = `confidence-recommendation ${recommendationTone(recommendation)}`;
    targetEndEl.textContent = `Target end: ${formatClock(getTargetEndAt(showData))}`;
  }

  subscribeShow((data) => {
    showData = data;
    renderConfidence();
  });
  subscribeItems((list) => {
    items = list;
    renderConfidence();
  });

  setInterval(renderConfidence, 1000);
  renderConfidence();
}

document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  if (document.getElementById("confidenceRoot")) initConfidenceView();
  else if (document.getElementById("operatorTime")) initOperatorView();
  else initOpenView();
});
