// js/dashboard.js
import { masterData, formatNumberRp, privacyHidden } from './utils.js';

export function renderDashboard() {
  if (!masterData) {
    console.log("masterData not available yet");
    return;
  }
  
  // Cek apakah elemen DOM sudah ada
  const totalWeddingEl = document.getElementById("totalWedding");
  if (!totalWeddingEl) {
    console.log("Dashboard elements not ready yet");
    return;
  }
  
  const settings = masterData.settings || { weddingTarget: 50000000 };
  const targetWed = settings.weddingTarget;
  let wA = 0, wB = 0, inc = 0, exp = 0;
  const finances = masterData.finances ? Object.entries(masterData.finances) : [];
  
  finances.forEach(([id, f]) => {
    if (f.type === "wedding") {
      if (f.user === "FACHMI") wA += f.amt;
      else wB += f.amt;
    }
    if (f.type === "in") inc += f.amt;
    if (f.type === "out") exp += f.amt;
  });
  
  const totalWed = wA + wB;
  const percent = targetWed > 0 ? Math.min(100, (totalWed / targetWed) * 100) : 0;
  
  // Update elemen Dashboard dengan pengecekan null
  const totalWeddingElement = document.getElementById("totalWedding");
  if (totalWeddingElement) totalWeddingElement.innerHTML = formatNumberRp(totalWed);
  
  const targetWeddingAmountEl = document.getElementById("targetWeddingAmount");
  if (targetWeddingAmountEl) targetWeddingAmountEl.innerHTML = formatNumberRp(targetWed);
  
  const weddingProgressFillEl = document.getElementById("weddingProgressFill");
  if (weddingProgressFillEl) weddingProgressFillEl.style.width = `${percent}%`;
  
  const weddingPercentTextEl = document.getElementById("weddingPercentText");
  if (weddingPercentTextEl) weddingPercentTextEl.innerHTML = `${Math.round(percent)}%`;
  
  const savingsAEl = document.getElementById("savingsA");
  if (savingsAEl) savingsAEl.innerHTML = formatNumberRp(wA);
  
  const savingsBEl = document.getElementById("savingsB");
  if (savingsBEl) savingsBEl.innerHTML = formatNumberRp(wB);
  
  const totalIncomeEl = document.getElementById("totalIncome");
  if (totalIncomeEl) totalIncomeEl.innerHTML = formatNumberRp(inc);
  
  const totalExpenseEl = document.getElementById("totalExpense");
  if (totalExpenseEl) totalExpenseEl.innerHTML = formatNumberRp(exp);
  
  // Data untuk statistik
  const visions = masterData.visions ? Object.entries(masterData.visions) : [];
  const plansArray = masterData.plans ? Object.entries(masterData.plans) : [];
  const totalP = plansArray.length;
  const doneP = plansArray.filter(p => p[1].progress >= 100).length;
  const targetPlanCount = plansArray.filter(p => p[1].targetDate && p[1].targetDate !== "").length;
  const percentDone = totalP > 0 ? Math.round((doneP / totalP) * 100) : 0;
  
  // Update statistik cards
  const totalSharedEl = document.getElementById("totalShared");
  if (totalSharedEl) totalSharedEl.innerHTML = visions.length;
  
  const totalPlansEl = document.getElementById("totalPlans");
  if (totalPlansEl) totalPlansEl.innerHTML = totalP;
  
  const totalDoneEl = document.getElementById("totalDone");
  if (totalDoneEl) {
    totalDoneEl.innerHTML = `${percentDone}%`;
    // Tambahkan warna berdasarkan persentase
    if (percentDone === 100 && totalP > 0) {
      totalDoneEl.classList.add("text-success");
      totalDoneEl.classList.remove("text-warning", "text-danger");
    } else if (percentDone >= 50) {
      totalDoneEl.classList.add("text-warning");
      totalDoneEl.classList.remove("text-success", "text-danger");
    } else if (percentDone > 0) {
      totalDoneEl.classList.add("text-danger");
      totalDoneEl.classList.remove("text-success", "text-warning");
    }
  }
  
  const targetPlanCountEl = document.getElementById("targetPlanCount");
  if (targetPlanCountEl) targetPlanCountEl.innerHTML = targetPlanCount;
  
  // Log untuk debugging
  console.log("Dashboard updated:", { totalPlans: totalP, completedPlans: doneP, percentDone: percentDone });
}

export function updateCharts(weddingHistory, totalPlansDone, totalPlansAll, weddingChart, plansChart) {
  const weddingChartEl = document.getElementById('weddingTrendChart');
  const plansChartEl = document.getElementById('plansProgressChart');
  
  if (!weddingChartEl || !plansChartEl) {
    console.log("Chart elements not ready yet");
    return { weddingChart, plansChart };
  }
  
  // Chart 1: Progres tabungan (line chart)
  if (weddingChart) weddingChart.destroy();
  const ctx = weddingChartEl.getContext('2d');
  if (!ctx) return { weddingChart, plansChart };
  
  const newWeddingChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: weddingHistory.labels || [],
      datasets: [{ 
        label: 'Tabungan Nikah (Rp Juta)', 
        data: weddingHistory.values || [], 
        borderColor: '#6366f1', 
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.3, 
        fill: true,
        pointBackgroundColor: '#6366f1',
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: { 
      responsive: true, 
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              return `Tabungan: ${context.raw} Juta`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Juta Rupiah'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Bulan'
          }
        }
      }
    }
  });
  
  // Chart 2: Progress rencana (line chart - progress over time)
  if (plansChart) plansChart.destroy();
  const ctx2 = plansChartEl.getContext('2d');
  if (!ctx2) return { weddingChart: newWeddingChart, plansChart };
  
  // Ambil data plans dari window.masterData atau masterData
  const data = window.masterData || masterData;
  const plans = data?.plans || {};
  const plansArray = Object.entries(plans);
  
  // Hitung progress kumulatif berdasarkan tanggal target
  const plansWithDate = plansArray.filter(p => p[1].targetDate && p[1].targetDate !== "");
  plansWithDate.sort((a, b) => new Date(a[1].targetDate) - new Date(b[1].targetDate));
  
  let cumulativeProgress = 0;
  const planLabels = [];
  const planProgressData = [];
  
  plansWithDate.forEach(([id, plan]) => {
    // Buat label yang lebih pendek untuk tampilan
    let label = plan.text;
    if (label.length > 20) {
      label = label.substring(0, 18) + '...';
    }
    planLabels.push(label);
    cumulativeProgress += plan.progress || 0;
    planProgressData.push(cumulativeProgress);
  });
  
  // Jika tidak ada rencana dengan target date, tampilkan data dari semua rencana
  let finalLabels = planLabels;
  let finalData = planProgressData;
  
  if (plansWithDate.length === 0 && plansArray.length > 0) {
    // Tampilkan semua rencana tanpa urutan tanggal
    plansArray.forEach(([id, plan]) => {
      let label = plan.text;
      if (label.length > 20) {
        label = label.substring(0, 18) + '...';
      }
      finalLabels.push(label);
      finalData.push(plan.progress || 0);
    });
  }
  
  if (finalLabels.length === 0) {
    finalLabels = ['Belum ada rencana'];
    finalData = [0];
  }
  
  const newPlansChart = new Chart(ctx2, {
    type: 'line',
    data: {
      labels: finalLabels,
      datasets: [{ 
        label: 'Progress Rencana (%)', 
        data: finalData, 
        borderColor: '#10b981', 
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.3, 
        fill: true,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: { 
      responsive: true, 
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              return `Progress: ${context.raw}%`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: Math.max(100, Math.max(...finalData) + 10),
          title: {
            display: true,
            text: 'Progress (%)'
          },
          ticks: {
            callback: function(value) {
              return value + '%';
            }
          }
        },
        x: {
          title: {
            display: true,
            text: plansWithDate.length > 0 ? 'Rencana (berdasarkan target tanggal)' : 'Rencana'
          },
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            autoSkip: true,
            maxTicksLimit: 8
          }
        }
      }
    }
  });
  
  console.log("Charts updated:", { 
    weddingDataPoints: weddingHistory.labels?.length || 0, 
    plansDataPoints: finalLabels.length 
  });
  
  return { weddingChart: newWeddingChart, plansChart: newPlansChart };
}

// Export ke window untuk akses global
window.renderDashboard = renderDashboard;
window.updateCharts = updateCharts;
