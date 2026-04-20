// js/app.js
import { db, ref, onValue, set, update, push, remove } from './firebase-config.js';
import { masterData, setMasterData, showNotif, togglePrivacy, setCurrentUser } from './utils.js';
import { handleLogin, updateCloudPassword, resetPassword, confirmLogout, handleLogout } from './auth.js';
import { renderDashboard, updateCharts } from './dashboard.js';
import { savePlan, renderBoardPlans, updatePlan, deletePlanItem, addSubPlan, togglePlan, openEditPlan, deletePlanItemById, deleteSubPlan } from './planning.js';
import { saveFinance, saveWeddingTarget, editFinance, renderFinances } from './financial.js';
import { saveVision, renderVisions, toggleLike, addComment, openCommentModal, renderComments } from './vision.js';

// Global variables
let weddingChart = null;
let plansChart = null;
window.currentDeletePlanId = null;
window.currentCommentVid = null;
window.editFinanceId = null;
window.pendingDelete = { path: null, id: null };

// Load components
async function loadComponents() {
  try {
    const sidebarResp = await fetch('components/sidebar.html');
    const sidebarHtml = await sidebarResp.text();
    const sidebarContainer = document.getElementById('sidebar-container');
    if (sidebarContainer) sidebarContainer.innerHTML = sidebarHtml;
    
    const bottomNavResp = await fetch('components/navbar.html');
    const bottomNavHtml = await bottomNavResp.text();
    const bottomNavContainer = document.getElementById('bottom-nav-container');
    if (bottomNavContainer) bottomNavContainer.innerHTML = bottomNavHtml;
    
    const modalsResp = await fetch('components/modals.html');
    const modalsHtml = await modalsResp.text();
    const modalsContainer = document.getElementById('modals-container');
    if (modalsContainer) modalsContainer.innerHTML = modalsHtml;
    
    const loginResp = await fetch('components/login.html');
    const loginHtml = await loginResp.text();
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) loginScreen.innerHTML = loginHtml;
    
    const contentResp = await fetch('components/content.html');
    const contentHtml = await contentResp.text();
    const appContent = document.getElementById('app-content');
    if (appContent) appContent.innerHTML = contentHtml;
    
    attachEventListeners();
  } catch (error) {
    console.error('Error loading components:', error);
  }
  // Di dalam fungsi loadComponents, setelah attachEventListeners, tambahkan:
if (window.initMoodSelector) window.initMoodSelector();
if (window.setupFilterListeners) window.setupFilterListeners();
  if (window.initCoupleChat) window.initCoupleChat();
      if (window.initBackupRestore) window.initBackupRestore();
      if (window.checkAchievements) window.checkAchievements();
      if (window.initOfflineMode) window.initOfflineMode();
}

function attachEventListeners() {
  const darkFab = document.getElementById("darkModeFab");
  if (darkFab) {
    initDarkMode(darkFab);
    darkFab.onclick = () => toggleDarkMode(darkFab);
  }
  
  const menuToggle = document.getElementById("menuToggleHp");
  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      const sidebar = document.getElementById("app-sidebar");
      if (sidebar) sidebar.classList.toggle("open");
    });
  }
  
  const fType = document.getElementById("fType");
  if (fType) {
    fType.addEventListener("change", (e) => {
      const div = document.getElementById("targetWeddingField");
      if (div) div.style.display = e.target.value === "wedding" ? "block" : "none";
    });
  }
  
  const financeFilter = document.getElementById("financeFilter");
  if (financeFilter) {
    financeFilter.addEventListener("change", () => {
      if (window.renderFinances) window.renderFinances();
    });
  }
  
  const privacyToggleDash = document.getElementById("privacyToggleDash");
  const privacyToggleFinance = document.getElementById("privacyToggleFinance");
  
  if (privacyToggleDash) {
    privacyToggleDash.addEventListener("click", () => {
      togglePrivacy();
    });
  }
  if (privacyToggleFinance) {
    privacyToggleFinance.addEventListener("click", () => {
      togglePrivacy();
    });
  }
  
  const forgotPassLink = document.getElementById("forgotPassLink");
  if (forgotPassLink) {
    forgotPassLink.addEventListener("click", (e) => {
      e.preventDefault();
      const modalEl = document.getElementById("forgotPassModal");
      if (modalEl) new bootstrap.Modal(modalEl).show();
    });
  }
  
  document.querySelectorAll(".nav-link, .bottom-nav-item").forEach(el => {
    el.addEventListener("click", () => {
      const page = el.getAttribute("data-page");
      if (page) showPage(page);
    });
  });
  
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  if (confirmDeleteBtn) {
    confirmDeleteBtn.onclick = async () => {
      if (window.pendingDelete && window.pendingDelete.path && window.pendingDelete.id) {
        const { path, id } = window.pendingDelete;
        try {
          const dbRef = ref(db, `data/${path}/${id}`);
          await remove(dbRef);
          showNotif("Data berhasil dihapus");
          if (window.renderAll) window.renderAll();
        } catch (err) {
          console.error(err);
          showNotif("Gagal hapus data: " + err.message, true);
        }
      }
      const modal = bootstrap.Modal.getInstance(document.getElementById("confirmDeleteModal"));
      if (modal) modal.hide();
      window.pendingDelete = { path: null, id: null };
    };
  }
  
  const confirmLogoutBtn = document.getElementById("confirmLogoutBtn");
  if (confirmLogoutBtn) {
    confirmLogoutBtn.onclick = () => {
      handleLogout();
    };
  }
}

function initDarkMode(btn) {
  const saved = localStorage.getItem("darkMode");
  if (saved === "enabled") {
    document.body.classList.add("dark");
    btn.innerHTML = '<i class="bi bi-brightness-high-fill fs-5"></i>';
  } else {
    document.body.classList.remove("dark");
    btn.innerHTML = '<i class="bi bi-moon-stars fs-5"></i>';
  }
}

function toggleDarkMode(btn) {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  localStorage.setItem("darkMode", isDark ? "enabled" : "disabled");
  btn.innerHTML = isDark ? '<i class="bi bi-brightness-high-fill fs-5"></i>' : '<i class="bi bi-moon-stars fs-5"></i>';
}

function showPage(pageId) {
  document.querySelectorAll("section").forEach(s => s.style.display = "none");
  const pageElement = document.getElementById(`${pageId}-page`);
  if (pageElement) pageElement.style.display = "block";
  
  document.querySelectorAll(".nav-link, .bottom-nav-item").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(`[data-page="${pageId}"]`).forEach(el => el.classList.add("active"));
  
  if (window.innerWidth <= 768) {
    const sidebar = document.getElementById("app-sidebar");
    if (sidebar) sidebar.classList.remove("open");
  }
  
  if (pageId === "financial") {
    const typeSelect = document.getElementById("fType");
    const targetField = document.getElementById("targetWeddingField");
    if (typeSelect && targetField) {
      targetField.style.display = typeSelect.value === "wedding" ? "block" : "none";
    }
  }
}

export function setupAppSession(u) {
  const loginScreen = document.getElementById("login-screen");
  const sidebar = document.getElementById("app-sidebar");
  const appContent = document.getElementById("app-content");
  
  if (loginScreen) loginScreen.style.display = "none";
  if (sidebar) sidebar.style.display = "flex";
  if (appContent) appContent.style.display = "block";
  
  const badge = document.getElementById("activeUserBadge");
  if (badge) {
    badge.innerText = u;
    badge.className = `badge rounded-pill mb-1 ${u === "FACHMI" ? "badge-fachmi" : "badge-azizah"}`;
  }
  
  const userGreet = document.getElementById("userGreet");
  if (userGreet) userGreet.innerText = u;
  
  if (window.innerWidth <= 768 && sidebar) sidebar.classList.remove("open");

  if (window.initCoupleChat) {
      console.log("Initializing chat...");
      window.initCoupleChat();
    }
    if (window.checkAchievements) {
      console.log("Checking achievements...");
      window.checkAchievements();
    }
  renderAll();
  showPage('dashboard');
}

function renderAll() {
  if (!masterData) return;
  
  if (window.renderDashboard) window.renderDashboard();
  if (window.renderVisions) window.renderVisions();
  if (window.renderFinances) window.renderFinances();
  
  const plansArray = masterData.plans ? Object.entries(masterData.plans) : [];
  if (window.renderBoardPlans) window.renderBoardPlans(plansArray);
  
  const finances = masterData.finances ? Object.entries(masterData.finances) : [];
  let weddingHistoryMap = new Map();
  finances.forEach(([id, f]) => {
    if (f.type === "wedding" && f.date) {
      let month = f.date.substring(0, 7);
      weddingHistoryMap.set(month, (weddingHistoryMap.get(month) || 0) + f.amt);
    }
  });
  
  const sortedMonths = Array.from(weddingHistoryMap.keys()).sort();
  let cumulative = 0;
  const labels = [], values = [];
  sortedMonths.forEach(month => {
    cumulative += weddingHistoryMap.get(month);
    labels.push(month);
    values.push(cumulative / 1e6);
  });
  
  const totalPlans = plansArray.length;
  const totalPlansDone = plansArray.filter(p => p[1].progress >= 100).length;
  const charts = updateCharts({ labels, values }, totalPlansDone, totalPlans, weddingChart, plansChart);
  weddingChart = charts.weddingChart;
  plansChart = charts.plansChart;
  
  checkPlanReminders();
}

function checkPlanReminders() {
  if (!masterData) return;
  const plans = masterData.plans || {};
  const today = new Date();
  Object.entries(plans).forEach(([id, p]) => {
    if (p.targetDate && p.progress < 100) {
      const target = new Date(p.targetDate);
      const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
      if (diffDays === 3 || diffDays === 1) {
        if (Notification.permission === "granted") {
          new Notification("📅 Pengingat Rencana", { body: `"${p.text}" tinggal ${diffDays} hari lagi!` });
        }
      }
    }
  });
}

// Firebase realtime listener
onValue(ref(db, "data/"), (snapshot) => {
  const data = snapshot.val() || { visions: {}, plans: {}, finances: {}, settings: {}, comments: {}, likes: {} };
  setMasterData(data);
  
  if (!data.auth) {
    set(ref(db, "data/auth"), { FACHMI: "gokil223", AZIZAH: "1234" });
  }
  if (!data.settings?.weddingTarget) {
    set(ref(db, "data/settings"), { weddingTarget: 50000000 });
  }
  
  if (sessionStorage.getItem("progrowth_user")) {
    renderAll();
  }
});

// Tambahkan setelah Firebase listener
let lastDataHash = "";

onValue(ref(db, "data/"), (snapshot) => {
  const data = snapshot.val() || {};
  const newDataHash = JSON.stringify(data).length;
  
  if (lastDataHash && lastDataHash !== newDataHash && sessionStorage.getItem("progrowth_user")) {
    // Ada perubahan data dari device lain
    showNotif("📱 Data telah diperbarui dari perangkat lain", false);
  }
  lastDataHash = newDataHash;
  
  // ... existing code
});

// Global functions exposure
window.setupAppSession = setupAppSession;
window.handleLogin = handleLogin;
window.saveVision = saveVision;
window.savePlan = savePlan;
window.saveFinance = saveFinance;
window.saveWeddingTarget = saveWeddingTarget;
window.updateCloudPassword = updateCloudPassword;
window.resetPassword = resetPassword;
window.confirmLogout = confirmLogout;
window.handleLogout = handleLogout;
window.updatePlan = updatePlan;
window.deletePlanItem = deletePlanItem;
window.addSubPlan = addSubPlan;
window.togglePlan = togglePlan;
window.openEditPlan = openEditPlan;
window.deletePlanItemById = deletePlanItemById;
window.deleteSubPlan = deleteSubPlan;
window.editFinance = editFinance;
window.openCommentModal = openCommentModal;
window.addComment = addComment;
window.toggleLike = toggleLike;
window.showPage = showPage;
window.renderAll = renderAll;
window.renderDashboard = renderDashboard;
window.renderFinances = renderFinances;
window.renderVisions = renderVisions;
window.renderBoardPlans = renderBoardPlans;
window.togglePrivacy = togglePrivacy;
window.confirmDelete = (path, id) => {
  window.pendingDelete = { path, id };
  const modalEl = document.getElementById("confirmDeleteModal");
  if (modalEl) new bootstrap.Modal(modalEl).show();
};
window.deleteItem = (path, id) => window.confirmDelete(path, id);
window.applyWeddingReco = async () => {
  const items = ["💍 Persiapan Lamaran", "🏨 Booking Venue", "💄 MUA & Busana", "📸 Dokumentasi", "🎤 MC & Entertainment"];
  for (let t of items) {
    await push(ref(db, "data/plans"), { text: t, cat: "💍 Menikah", targetDate: "", progress: 0, done: false, sub: {} });
  }
  showNotif("Rekomendasi wedding ditambahkan!");
  if (window.renderAll) window.renderAll();
};
window.applyTravelReco = async () => {
  const items = ["✈️ Cari Tiket", "🏨 Booking Hotel", "🗺️ Itinerary", "📱 Travel Insurance", "🍴 Cari Kuliner"];
  for (let t of items) {
    await push(ref(db, "data/plans"), { text: t, cat: "✈️ Liburan", targetDate: "", progress: 0, done: false, sub: {} });
  }
  showNotif("Rekomendasi liburan ditambahkan!");
  if (window.renderAll) window.renderAll();
};
window.hideToast = () => {
  const toast = document.getElementById("customToast");
  if (toast) toast.style.display = "none";
};

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadComponents().then(() => {
    const savedUser = sessionStorage.getItem("progrowth_user");
    if (savedUser) {
      setCurrentUser(savedUser);
      setupAppSession(savedUser);
    }
  });
});
