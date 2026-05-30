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
  query,
  orderBy,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const SHOW_ID = "main";
const PLAN_WITH_INTERMISSION = "withIntermission";
const PLAN_SKIP_INTERMISSION = "skipIntermission";
const DEFAULT_PLAN = PLAN_WITH_INTERMISSION;

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

function displayStatus(status) {
  const s = String(status || "").toLowerCase();
  if (s === "blue") return "ON DECK";
  return s ? s.toUpperCase() : "-";
}

function planLabel(plan) {
  return plan === PLAN_SKIP_INTERMISSION ? "SKIP INTERMISSION" : "WITH INTERMISSION";
}

function planForShow(showData) {
  return showData?.intermissionPlan === PLAN_SKIP_INTERMISSION ? PLAN_SKIP_INTERMISSION : PLAN_WITH_INTERMISSION;
}

function isActiveForPlan(item, plan) {
  return item?.branch === "core" || item?.branch === plan;
}

function planOrder(item, plan) {
  return plan === PLAN_SKIP_INTERMISSION ? item.orderSkipIntermission : item.orderWithIntermission;
}

function activeItemsForPlan(items, plan) {
  return [...items]
    .filter((item) => isActiveForPlan(item, plan))
    .sort((a, b) => (planOrder(a, plan) || 9999) - (planOrder(b, plan) || 9999));
}

function hasBranchItemStarted(items) {
  return items.some((item) => item.branch !== "core" && normalizeTimestamp(item.actualStartAt));
}

function captainsText(item) {
  const captains = Array.isArray(item?.captains) ? item.captains.filter(Boolean) : [];
  return captains.length ? captains.join(", ") : "-";
}

function openCaptainsLine(item) {
  const text = captainsText(item);
  return text === "-" ? "" : `Captains: ${text}`;
}

function activeOrderById(items, plan) {
  const map = new Map();
  activeItemsForPlan(items, plan).forEach((item, idx) => map.set(item.id, idx + 1));
  return map;
}

function computeRemainingSeconds(items, plan) {
  return activeItemsForPlan(items, plan)
    .filter((item) => item.status !== "done")
    .reduce((sum, item) => sum + (item.plannedSeconds || 0), 0);
}

function computeProjectedTiming(showData, items, plan = planForShow(showData)) {
  const remainingSeconds = computeRemainingSeconds(items, plan);
  const now = new Date();
  const projectedEndAt = new Date(now.getTime() + remainingSeconds * 1000);
  const baseline = normalizeTimestamp(showData?.plannedEndBaselineAt) || projectedEndAt;
  const offsetSeconds = Math.round((projectedEndAt - baseline) / 1000);
  return { projectedEndAt, offsetSeconds };
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
    seedIndex,
    status: "queued",
    actualStartAt: null,
    actualEndAt: null,
  }));
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
  const currentId = live?.id || backstage?.id || "opening-remarks";
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
  const initialItems = buildInitialItems();
  const plannedEndBaselineAt = new Date(now.getTime() + computeRemainingSeconds(initialItems, DEFAULT_PLAN) * 1000);
  const baseShow = {
    status: "stopped",
    holdMessage: "",
    currentItemId: "opening-remarks",
    intermissionPlan: DEFAULT_PLAN,
    intermissionDecisionLocked: false,
    plannedEndBaselineAt,
    projectedEndAt: plannedEndBaselineAt,
    offsetSeconds: 0,
    updatedAt: serverTimestamp(),
  };
  const normalized = normalizeQueueForPlan(initialItems, baseShow, DEFAULT_PLAN);
  normalized.items.forEach((item, index) => batch.set(itemRefByIndex(index), item));
  batch.set(showRef, { ...normalized.show, projectedEndAt: plannedEndBaselineAt, offsetSeconds: 0, updatedAt: serverTimestamp() });
  await batch.commit();
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

  let showData = null;
  let items = [];
  let lastSnapshot = null;
  let actionInFlight = false;

  function activeSorted() {
    return activeItemsForPlan(items, planForShow(showData));
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
        intermissionPlan: planForShow(showData),
        intermissionDecisionLocked: !!showData?.intermissionDecisionLocked,
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
    const orderMap = activeOrderById(items, planForShow(showData));
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
        <td>${captainsText(item)}</td>
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

  function renderNowRunningStatus(statusRaw) {
    const s = String(statusRaw || "").toLowerCase();
    if (s === "live") currentStatusEl.innerHTML = `<span class="live-badge"><span class="live-dot"></span>LIVE</span>`;
    else currentStatusEl.textContent = displayStatus(s);
  }

  function renderPlanCard() {
    const plan = planForShow(showData);
    const locked = !!showData?.intermissionDecisionLocked || hasBranchItemStarted(items);
    if (planLabelEl) planLabelEl.textContent = planLabel(plan);
    if (lockStatusEl) {
      lockStatusEl.textContent = locked ? "LOCKED" : "UNLOCKED";
      lockStatusEl.className = `decision-status ${locked ? "locked" : "unlocked"}`;
    }
    if (keepIntermissionBtn) {
      keepIntermissionBtn.disabled = locked || plan === PLAN_WITH_INTERMISSION;
      keepIntermissionBtn.classList.toggle("selected", plan === PLAN_WITH_INTERMISSION);
    }
    if (skipIntermissionBtn) {
      skipIntermissionBtn.disabled = locked || plan === PLAN_SKIP_INTERMISSION;
      skipIntermissionBtn.classList.toggle("selected", plan === PLAN_SKIP_INTERMISSION);
    }
  }

  function renderShow() {
    if (!showData) return;
    const plan = planForShow(showData);
    const { current, backstage, deck } = currentSet();

    operatorProjectedEndEl.textContent = formatClock(showData.projectedEndAt);
    operatorOffsetEl.textContent = showData.offsetSeconds == null ? "-" : `${showData.offsetSeconds > 0 ? "+" : ""}${formatOffset(showData.offsetSeconds)}`;
    applyOffsetSignal(operatorOffsetEl, showData.offsetSeconds);

    const statusText = showData.status?.toUpperCase() || "-";
    operatorShowStatusEl.textContent = statusText;
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

    currentCaptainsEl.textContent = captainsText(current);
    backstageCaptainsEl.textContent = captainsText(backstage);
    deckCaptainsEl.textContent = captainsText(deck);

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
  }

  function safeRun(fn) {
    return fn().catch((error) => {
      alert(error?.message || String(error));
    });
  }

  async function commitItemAndShowState(nextItems, nextShow) {
    const plan = planForShow(nextShow);
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
    const plan = planForShow(showData);
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
    const locked = showData.intermissionDecisionLocked || currentItem.branch !== "core" || hasBranchItemStarted(nextItems);
    const nextShow = {
      ...showData,
      status: showData.status === "hold" ? "hold" : "running",
      intermissionDecisionLocked: locked,
    };
    items = nextItems;
    showData = nextShow;
    renderShow();
    renderRunTable();
    await commitItemAndShowState(nextItems, nextShow);
  }

  async function endCurrentItemFast() {
    if (!showData) throw new Error("Show not initialized. Click Init Show / Reset first.");
    if (!Array.isArray(items) || !items.length) throw new Error("Items not loaded yet. Try again in a moment.");
    const plan = planForShow(showData);
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
      intermissionDecisionLocked: showData.intermissionDecisionLocked || liveItem.branch !== "core" || hasBranchItemStarted(baseItems),
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
    await commitItemAndShowState(normalized.items, nextShow);
  }

  async function setIntermissionPlan(plan) {
    if (!showData) throw new Error("Show not initialized. Click Init Show / Reset first.");
    const locked = !!showData.intermissionDecisionLocked || hasBranchItemStarted(items);
    if (locked) throw new Error("Intermission decision is locked because a branch-only item has started.");
    const nextShowBase = { ...showData, intermissionPlan: plan, intermissionDecisionLocked: false };
    const normalized = normalizeQueueForPlan(items, nextShowBase, plan);
    await commitItemAndShowState(normalized.items, normalized.show);
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
    if (!confirm("Reset the show? This will overwrite all data.")) return;
    await initShow();
  }));

  keepIntermissionBtn?.addEventListener("click", () => safeRun(() => setIntermissionPlan(PLAN_WITH_INTERMISSION)));
  skipIntermissionBtn?.addEventListener("click", () => safeRun(() => setIntermissionPlan(PLAN_SKIP_INTERMISSION)));

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
        const normalized = normalizeQueueForPlan(items, nextShowBase, planForShow(showData));
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
    renderShow();
    renderRunTable();
  });
  subscribeItems((list) => {
    items = list;
    renderShow();
    renderRunTable();
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
    const plan = planForShow(showData);
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
        const capLine = openCaptainsLine(item);
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
    if (liveCaptainsEl) liveCaptainsEl.textContent = openCaptainsLine(anchor);
    if (backstageTitleEl) backstageTitleEl.textContent = cache.backstage?.title || "-";
    if (backstagePerformersEl) backstagePerformersEl.textContent = typeLine(cache.backstage);
    if (backstageCaptainsEl) backstageCaptainsEl.textContent = openCaptainsLine(cache.backstage);
    if (blueTitleEl) blueTitleEl.textContent = cache.deck?.title || "-";
    if (bluePerformersEl) bluePerformersEl.textContent = typeLine(cache.deck);
    if (blueCaptainsEl) blueCaptainsEl.textContent = openCaptainsLine(cache.deck);
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

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("operatorTime")) initOperatorView();
  else initOpenView();
});
