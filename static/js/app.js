/**
 * Quantum Student Performance Analyzer - Main UI Controller
 */

// Application State
const State = {
  currentTab: 'lab',
  currentStudent: {
    name: 'Alice Johnson',
    attendance: 85,
    study_hours: 14,
    shots: 1024
  },
  roster: [
    { name: "Alice Johnson", attendance: 95, study_hours: 18, pass_probability: 100.0, status: "PASS" },
    { name: "Bob Smith", attendance: 82, study_hours: 12, pass_probability: 97.4, status: "PASS" },
    { name: "Charlie Davis", attendance: 65, study_hours: 9, pass_probability: 86.2, status: "PASS" },
    { name: "Diana Prince", attendance: 45, study_hours: 4, pass_probability: 44.8, status: "FAIL" },
    { name: "Evan Wright", attendance: 20, study_hours: 1, pass_probability: 8.5, status: "FAIL" },
    { name: "Fiona Gallagher", attendance: 88, study_hours: 6, pass_probability: 96.1, status: "PASS" },
    { name: "George Miller", attendance: 35, study_hours: 16, pass_probability: 91.0, status: "PASS" },
    { name: "Hannah Abbott", attendance: 92, study_hours: 15, pass_probability: 99.8, status: "PASS" }
  ],
  stats: null,
  activeCircuitView: 'svg', // 'svg' or 'ascii'
  isEvaluatingBatch: false
};

// ==========================================================================
// Ambient Quantum Particle Canvas
// ==========================================================================
function initQuantumBackground() {
  const canvas = document.getElementById('quantum-bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width, height;
  let particles = [];

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  const particleCount = Math.min(Math.floor(window.innerWidth / 25), 45);
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      radius: Math.random() * 2 + 1,
      color: Math.random() > 0.5 ? '#00f5d4' : '#38bdf8',
      alpha: Math.random() * 0.5 + 0.2
    });
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    // Draw connecting lines between nearby particles (entanglement mesh)
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 130) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(56, 189, 248, ${0.12 * (1 - dist / 130)})`;
          ctx.lineWidth = 0.8;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    // Draw particles
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    ctx.globalAlpha = 1.0;
    requestAnimationFrame(render);
  }
  render();
}

// ==========================================================================
// Toast Notifications
// ==========================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'quantum-toast';
  const icon = type === 'success' ? '✨' : type === 'warning' ? '⚠️' : '⚛️';
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// ==========================================================================
// Tab Switching
// ==========================================================================
function setupNavigation() {
  const tabBtns = document.querySelectorAll('.nav-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      if (!target) return;

      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
      });

      const activePane = document.getElementById(`tab-${target}`);
      if (activePane) {
        activePane.classList.add('active');
      }

      State.currentTab = target;

      if (target === 'analytics') {
        renderAnalyticsCharts();
      }
    });
  });
}

// ==========================================================================
// Tab 1: Interactive Quantum Lab UI & Real-Time Reactivity
// ==========================================================================
let labSyncDebounceTimer = null;

function setupLabControls() {
  const attSlider = document.getElementById('lab-attendance');
  const studySlider = document.getElementById('lab-study');
  const studentNameInput = document.getElementById('lab-student-name');
  const shotsSelect = document.getElementById('lab-shots');
  const btnRunAnalysis = document.getElementById('btn-run-lab-analysis');

  if (!attSlider || !studySlider) return;

  function onSliderInput() {
    const att = parseFloat(attSlider.value);
    const study = parseFloat(studySlider.value);
    const name = studentNameInput.value.trim() || 'Student';
    const shots = parseInt(shotsSelect.value) || 1024;

    State.currentStudent = { name, attendance: att, study_hours: study, shots };

    // Update Pill Labels
    document.getElementById('val-attendance').textContent = `${att}%`;
    document.getElementById('val-study').textContent = `${study} hrs`;

    // Fast instant local update (zero lag)
    const localResult = QuantumEngine.simulateClientSide(att, study);
    updateLabUI(localResult);

    // Debounced Qiskit Server Sync (300ms)
    clearTimeout(labSyncDebounceTimer);
    labSyncDebounceTimer = setTimeout(async () => {
      const serverResult = await QuantumEngine.analyzeServer(name, att, study, shots);
      updateLabUI(serverResult);
    }, 300);
  }

  attSlider.addEventListener('input', onSliderInput);
  studySlider.addEventListener('input', onSliderInput);
  studentNameInput.addEventListener('input', onSliderInput);
  shotsSelect.addEventListener('change', onSliderInput);

  if (btnRunAnalysis) {
    btnRunAnalysis.addEventListener('click', async () => {
      btnRunAnalysis.disabled = true;
      btnRunAnalysis.innerHTML = '⚛️ Simulating Circuit...';
      const res = await QuantumEngine.analyzeServer(
        State.currentStudent.name,
        State.currentStudent.attendance,
        State.currentStudent.study_hours,
        State.currentStudent.shots
      );
      updateLabUI(res);
      btnRunAnalysis.disabled = false;
      btnRunAnalysis.innerHTML = '<span>⚡</span> Run Full Qiskit Circuit';
      showToast(`Simulation complete for ${res.name}: ${res.pass_probability}% (${res.status})`, 'success');
    });
  }

  // Presets
  setupPresetChips();

  // Circuit View Toggler (SVG / ASCII)
  const btnViewSvg = document.getElementById('btn-circuit-svg');
  const btnViewAscii = document.getElementById('btn-circuit-ascii');
  if (btnViewSvg && btnViewAscii) {
    btnViewSvg.addEventListener('click', () => {
      btnViewSvg.classList.add('active');
      btnViewAscii.classList.remove('active');
      document.getElementById('circuit-svg-container').style.display = 'block';
      document.getElementById('circuit-ascii-container').style.display = 'none';
      State.activeCircuitView = 'svg';
    });
    btnViewAscii.addEventListener('click', () => {
      btnViewAscii.classList.add('active');
      btnViewSvg.classList.remove('active');
      document.getElementById('circuit-svg-container').style.display = 'none';
      document.getElementById('circuit-ascii-container').style.display = 'block';
      State.activeCircuitView = 'ascii';
    });
  }

  // Initial trigger
  onSliderInput();
}

function setupPresetChips() {
  const chips = document.querySelectorAll('.preset-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const name = chip.dataset.name;
      const att = parseFloat(chip.dataset.att);
      const study = parseFloat(chip.dataset.study);

      document.getElementById('lab-student-name').value = name;
      document.getElementById('lab-attendance').value = att;
      document.getElementById('lab-study').value = study;

      document.getElementById('lab-attendance').dispatchEvent(new Event('input'));
      showToast(`Loaded preset profile: ${name}`);
    });
  });
}

function updateLabUI(data) {
  if (!data) return;

  // Angles Display
  const theta0Rad = data.exact ? data.exact.p_00 !== undefined ? (data.exact.theta_0_rad || (data.attendance / 100 * Math.PI)) : (data.theta_0_rad || 0) : 0;
  const theta1Rad = data.exact ? data.exact.p_00 !== undefined ? (data.exact.theta_1_rad || (Math.min(data.study_hours / 20, 1) * Math.PI)) : (data.theta_1_rad || 0) : 0;

  const theta0El = document.getElementById('angle-theta0');
  const theta1El = document.getElementById('angle-theta1');
  if (theta0El) theta0El.textContent = `θ_att = ${theta0Rad.toFixed(2)} rad (${(theta0Rad * 180 / Math.PI).toFixed(0)}°)`;
  if (theta1El) theta1El.textContent = `θ_study = ${theta1Rad.toFixed(2)} rad (${(theta1Rad * 180 / Math.PI).toFixed(0)}°)`;

  // Outcome Gauge
  const prob = data.pass_probability;
  const isPass = data.status === "PASS";

  const gaugeProbEl = document.getElementById('lab-gauge-val');
  if (gaugeProbEl) gaugeProbEl.textContent = `${prob.toFixed(1)}`;

  const gaugeProgress = document.getElementById('lab-gauge-progress');
  if (gaugeProgress) {
    // Circle circumference for r=50 is ~314.159
    const circumference = 2 * Math.PI * 50;
    const offset = circumference - (prob / 100) * circumference;
    gaugeProgress.style.strokeDasharray = `${circumference}`;
    gaugeProgress.style.strokeDashoffset = `${offset}`;
    gaugeProgress.style.stroke = isPass ? '#10b981' : '#f43f5e';
  }

  // Outcome Badge & Narrative
  const badgeEl = document.getElementById('lab-outcome-badge');
  if (badgeEl) {
    badgeEl.className = `outcome-status-badge ${isPass ? 'pass' : 'fail'}`;
    badgeEl.textContent = isPass ? '🎉 PASSING PREDICTION' : '⚠️ AT-RISK / FAIL PREDICTION';
  }

  const narrativeEl = document.getElementById('lab-outcome-narrative');
  if (narrativeEl) {
    if (isPass) {
      narrativeEl.innerHTML = `Student <strong>${data.name || 'Student'}</strong> demonstrates a <strong>${prob.toFixed(1)}%</strong> quantum pass likelihood. Entanglement between attendance (${data.attendance || State.currentStudent.attendance}%) and study (${data.study_hours || State.currentStudent.study_hours} hrs) generates positive superposition excitation.`;
    } else {
      narrativeEl.innerHTML = `Student <strong>${data.name || 'Student'}</strong> falls below the 50% pass boundary (estimated <strong>${prob.toFixed(1)}%</strong>). Ground state |00⟩ dominates the measurement manifold; consider boosting attendance or weekly study time.`;
    }
  }

  // Classical vs Quantum Score Comparison
  const quantumProbComp = document.getElementById('comp-val-quantum');
  const classicalScoreComp = document.getElementById('comp-val-classical');
  if (quantumProbComp) quantumProbComp.textContent = `${prob.toFixed(1)}%`;
  if (classicalScoreComp) {
    const classScore = data.classical_score !== undefined ? data.classical_score : 
      (0.5 * (State.currentStudent.attendance) + 0.5 * Math.min(State.currentStudent.study_hours / 20 * 100, 100));
    classicalScoreComp.textContent = `${classScore.toFixed(1)}%`;
  }

  // Quantum State Bars (|00>, |01>, |10>, |11>)
  const p00 = data.exact ? data.exact.p_00 : (data.counts ? (data.counts["00"] / 10.24) : 25);
  const p01 = data.exact ? data.exact.p_01 : (data.counts ? (data.counts["01"] / 10.24) : 25);
  const p10 = data.exact ? data.exact.p_10 : (data.counts ? (data.counts["10"] / 10.24) : 25);
  const p11 = data.exact ? data.exact.p_11 : (data.counts ? (data.counts["11"] / 10.24) : 25);

  updateStateBar('00', p00);
  updateStateBar('01', p01);
  updateStateBar('10', p10);
  updateStateBar('11', p11);

  // Render SVG Circuit
  CircuitRenderer.renderSVG('circuit-svg-container', theta0Rad, theta1Rad);

  // ASCII Circuit
  const asciiEl = document.getElementById('circuit-ascii-code');
  if (asciiEl) {
    asciiEl.textContent = data.circuit_text || QuantumEngine.generateAsciiCircuit(theta0Rad, theta1Rad);
  }
}

function updateStateBar(stateKet, percent) {
  const val = Math.max(0, Math.min(100, percent || 0));
  const fillEl = document.getElementById(`bar-fill-${stateKet}`);
  const tagEl = document.getElementById(`bar-val-${stateKet}`);
  if (fillEl) fillEl.style.width = `${val}%`;
  if (tagEl) tagEl.textContent = `${val.toFixed(1)}%`;
}

// ==========================================================================
// Tab 2: Classroom Roster Studio
// ==========================================================================
function setupRosterStudio() {
  const btnAddStudent = document.getElementById('btn-open-add-modal');
  const btnBatchEvaluate = document.getElementById('btn-batch-evaluate');
  const btnExportCsv = document.getElementById('btn-export-csv');
  const btnExportChart = document.getElementById('btn-download-chart');
  const selectCohort = document.getElementById('select-cohort-preset');

  renderRosterTable();
  updateRosterMetrics();

  if (btnAddStudent) {
    btnAddStudent.addEventListener('click', () => {
      document.getElementById('modal-add-student').classList.add('active');
    });
  }

  // Modal Close
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCancelAdd = document.getElementById('btn-cancel-add');
  [btnCloseModal, btnCancelAdd].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        document.getElementById('modal-add-student').classList.remove('active');
      });
    }
  });

  // Modal Submit Add
  const formAdd = document.getElementById('form-add-student');
  if (formAdd) {
    formAdd.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('new-student-name').value.trim();
      const att = parseFloat(document.getElementById('new-student-att').value);
      const study = parseFloat(document.getElementById('new-student-study').value);

      if (!name) return;

      const sim = QuantumEngine.simulateClientSide(att, study);
      State.roster.push({
        name,
        attendance: att,
        study_hours: study,
        pass_probability: sim.pass_probability,
        status: sim.status
      });

      renderRosterTable();
      updateRosterMetrics();
      document.getElementById('modal-add-student').classList.remove('active');
      formAdd.reset();
      showToast(`Added ${name} to roster`, 'success');
    });
  }

  // Batch Simulation
  if (btnBatchEvaluate) {
    btnBatchEvaluate.addEventListener('click', async () => {
      btnBatchEvaluate.disabled = true;
      btnBatchEvaluate.innerHTML = '⚛️ Evaluating Batch with Qiskit...';

      const res = await QuantumEngine.batchAnalyzeServer(State.roster);
      if (res && res.results) {
        State.roster = res.results.map(r => ({
          name: r.name,
          attendance: r.attendance,
          study_hours: r.study_hours,
          pass_probability: r.pass_probability,
          status: r.status,
          exact: r.exact,
          counts: r.counts
        }));
        State.stats = res.statistics;
        renderRosterTable();
        updateRosterMetrics();
        showToast(`Evaluated ${State.roster.length} students with Qiskit! Class Pass Rate: ${res.statistics.pass_rate}%`, 'success');
      }

      btnBatchEvaluate.disabled = false;
      btnBatchEvaluate.innerHTML = '<span>⚡</span> Evaluate All with Qiskit';
    });
  }

  // Presets Selection
  if (selectCohort) {
    selectCohort.addEventListener('change', async () => {
      const cohortKey = selectCohort.value;
      const presets = await QuantumEngine.fetchPresets();
      if (presets[cohortKey]) {
        State.roster = presets[cohortKey].map(s => {
          const sim = QuantumEngine.simulateClientSide(s.attendance, s.study_hours);
          return {
            name: s.name,
            attendance: s.attendance,
            study_hours: s.study_hours,
            pass_probability: sim.pass_probability,
            status: sim.status
          };
        });
        renderRosterTable();
        updateRosterMetrics();
        showToast(`Loaded ${cohortKey.replace('_', ' ')} roster (${State.roster.length} students)`);
      }
    });
  }

  // Export CSV
  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', () => {
      exportRosterToCsv();
    });
  }

  // Export Matplotlib Chart Image
  if (btnExportChart) {
    btnExportChart.addEventListener('click', async () => {
      btnExportChart.disabled = true;
      btnExportChart.innerHTML = '⏳ Generating Chart...';
      try {
        const response = await fetch('/api/export-chart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ results: State.roster })
        });
        if (!response.ok) throw new Error('Chart generation failed');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'quantum_student_performance_chart.png';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        showToast('Downloaded Matplotlib Chart report!', 'success');
      } catch (err) {
        console.error(err);
        showToast('Failed to export server chart, rendering client version instead.', 'warning');
      }
      btnExportChart.disabled = false;
      btnExportChart.innerHTML = '<span>📊</span> Download Chart Report';
    });
  }
}

function renderRosterTable() {
  const tbody = document.getElementById('roster-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  State.roster.forEach((student, index) => {
    const tr = document.createElement('tr');

    const initials = student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'ST';
    const isPass = student.status === "PASS";

    tr.innerHTML = `
      <td>
        <div class="student-identity-cell">
          <div class="student-avatar">${initials}</div>
          <span class="student-name-text">${student.name}</span>
        </div>
      </td>
      <td>
        <input type="number" min="0" max="100" class="table-input" value="${student.attendance}" 
               data-index="${index}" data-field="attendance"> %
      </td>
      <td>
        <input type="number" min="0" max="40" class="table-input" value="${student.study_hours}" 
               data-index="${index}" data-field="study_hours"> hrs
      </td>
      <td>
        <div class="prob-meter-cell">
          <div class="prob-bar-mini">
            <div class="prob-fill-mini" style="width: ${student.pass_probability}%; background: ${isPass ? '#10b981' : '#f43f5e'}"></div>
          </div>
          <span style="font-family: var(--font-mono); font-size: 0.85rem; font-weight: 600;">${student.pass_probability.toFixed(1)}%</span>
        </div>
      </td>
      <td>
        <span class="status-pill ${isPass ? 'pass' : 'fail'}">${isPass ? 'PASS' : 'FAIL'}</span>
      </td>
      <td style="text-align: right;">
        <button class="btn-secondary" style="padding: 0.35rem 0.65rem; font-size: 0.78rem; margin-right: 6px;" onclick="loadStudentIntoLab(${index})">
          Inspect in Lab
        </button>
        <button class="btn-icon-danger" onclick="deleteStudentFromRoster(${index})" title="Delete student">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
            <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
          </svg>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Attach table input listeners
  tbody.querySelectorAll('.table-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.index);
      const field = e.target.dataset.field;
      const val = parseFloat(e.target.value) || 0;

      State.roster[idx][field] = val;
      const sim = QuantumEngine.simulateClientSide(State.roster[idx].attendance, State.roster[idx].study_hours);
      State.roster[idx].pass_probability = sim.pass_probability;
      State.roster[idx].status = sim.status;

      renderRosterTable();
      updateRosterMetrics();
    });
  });
}

window.loadStudentIntoLab = function(index) {
  const student = State.roster[index];
  if (!student) return;

  document.getElementById('lab-student-name').value = student.name;
  document.getElementById('lab-attendance').value = student.attendance;
  document.getElementById('lab-study').value = student.study_hours;

  document.getElementById('lab-attendance').dispatchEvent(new Event('input'));

  // Switch to Lab tab
  document.querySelector('.nav-tab-btn[data-tab="lab"]').click();
  showToast(`Loaded ${student.name} into Quantum Lab`);
};

window.deleteStudentFromRoster = function(index) {
  const removed = State.roster.splice(index, 1)[0];
  renderRosterTable();
  updateRosterMetrics();
  showToast(`Removed ${removed.name} from roster`);
};

function updateRosterMetrics() {
  const count = State.roster.length;
  if (count === 0) return;

  const passCount = State.roster.filter(s => s.status === "PASS").length;
  const passRate = (passCount / count * 100).toFixed(1);
  const avgAtt = (State.roster.reduce((a, s) => a + s.attendance, 0) / count).toFixed(1);
  const avgStudy = (State.roster.reduce((a, s) => a + s.study_hours, 0) / count).toFixed(1);

  const statTotal = document.getElementById('stat-total-students');
  const statPassRate = document.getElementById('stat-pass-rate');
  const statAvgAtt = document.getElementById('stat-avg-att');
  const statAvgStudy = document.getElementById('stat-avg-study');

  if (statTotal) statTotal.textContent = count;
  if (statPassRate) statPassRate.textContent = `${passRate}%`;
  if (statAvgAtt) statAvgAtt.textContent = `${avgAtt}%`;
  if (statAvgStudy) statAvgStudy.textContent = `${avgStudy}h`;
}

function exportRosterToCsv() {
  if (State.roster.length === 0) {
    showToast('No students to export!', 'warning');
    return;
  }

  let csvContent = 'data:text/csv;charset=utf-8,Student Name,Attendance %,Weekly Study Hours,Quantum Pass Probability %,Status\n';
  State.roster.forEach(s => {
    csvContent += `"${s.name}",${s.attendance},${s.study_hours},${s.pass_probability.toFixed(1)},${s.status}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'quantum_students_roster.csv');
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast('Exported roster to CSV', 'success');
}

// ==========================================================================
// Tab 3: Interactive Analytics & Charts
// ==========================================================================
function renderAnalyticsCharts() {
  renderPassProbChart();
  renderQuadrantScatter();
}

function renderPassProbChart() {
  const canvas = document.getElementById('chart-pass-bars');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio || 600;
  canvas.height = 320 * window.devicePixelRatio || 320;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const w = rect.width;
  const h = 320;
  ctx.clearRect(0, 0, w, h);

  const paddingLeft = 50;
  const paddingBottom = 60;
  const paddingTop = 30;
  const paddingRight = 20;

  const chartW = w - paddingLeft - paddingRight;
  const chartH = h - paddingTop - paddingBottom;

  const data = State.roster;
  if (data.length === 0) return;

  // Background Grid Lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.font = '10px JetBrains Mono';
  ctx.fillStyle = '#64748b';

  for (let p = 0; p <= 100; p += 25) {
    const y = paddingTop + chartH - (p / 100) * chartH;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(w - paddingRight, y);
    ctx.stroke();
    ctx.fillText(`${p}%`, 15, y + 3);
  }

  // 50% Pass Threshold Line
  const y50 = paddingTop + chartH - 0.5 * chartH;
  ctx.beginPath();
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.moveTo(paddingLeft, y50);
  ctx.lineTo(w - paddingRight, y50);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#facc15';
  ctx.fillText('50% Threshold', w - paddingRight - 85, y50 - 6);

  // Bars
  const barGap = 12;
  const totalBarWidth = (chartW - barGap * (data.length - 1)) / data.length;
  const barWidth = Math.max(16, Math.min(totalBarWidth, 48));

  data.forEach((student, i) => {
    const barX = paddingLeft + i * (chartW / data.length) + (chartW / data.length - barWidth) / 2;
    const barHeight = (student.pass_probability / 100) * chartH;
    const barY = paddingTop + chartH - barHeight;

    const isPass = student.status === "PASS";
    const gradient = ctx.createLinearGradient(0, barY, 0, paddingTop + chartH);
    if (isPass) {
      gradient.addColorStop(0, '#10b981');
      gradient.addColorStop(1, 'rgba(16, 185, 129, 0.4)');
    } else {
      gradient.addColorStop(0, '#f43f5e');
      gradient.addColorStop(1, 'rgba(244, 63, 94, 0.4)');
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, [4, 4, 0, 0]);
    ctx.fill();

    // Value text on bar
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 10px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.fillText(`${student.pass_probability.toFixed(0)}%`, barX + barWidth / 2, barY - 6);

    // Student Name label below
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Plus Jakarta Sans';
    ctx.save();
    ctx.translate(barX + barWidth / 2, paddingTop + chartH + 15);
    ctx.rotate(-Math.PI / 4);
    ctx.textAlign = 'right';
    const shortName = student.name.split(' ')[0];
    ctx.fillText(shortName, 0, 0);
    ctx.restore();
  });
}

function renderQuadrantScatter() {
  const canvas = document.getElementById('chart-quadrant-scatter');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio || 400;
  canvas.height = 320 * window.devicePixelRatio || 320;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const w = rect.width;
  const h = 320;
  ctx.clearRect(0, 0, w, h);

  const pad = 40;
  const chartW = w - pad * 2;
  const chartH = h - pad * 2;

  // Background quadrant shading
  ctx.fillStyle = 'rgba(16, 185, 129, 0.05)';
  ctx.fillRect(pad + chartW / 2, pad, chartW / 2, chartH / 2); // High Att, High Study

  ctx.fillStyle = 'rgba(244, 63, 94, 0.05)';
  ctx.fillRect(pad, pad + chartH / 2, chartW / 2, chartH / 2); // Low Att, Low Study

  // Center Crosshairs
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, pad + chartH / 2);
  ctx.lineTo(pad + chartW, pad + chartH / 2);
  ctx.moveTo(pad + chartW / 2, pad);
  ctx.lineTo(pad + chartW / 2, pad + chartH);
  ctx.stroke();

  // Axis Labels
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px Plus Jakarta Sans';
  ctx.textAlign = 'center';
  ctx.fillText('Attendance (0% → 100%)', pad + chartW / 2, h - 10);

  ctx.save();
  ctx.translate(14, pad + chartH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Study Hours (0h → 20h+)', 0, 0);
  ctx.restore();

  // Plot student dots
  State.roster.forEach(student => {
    const normX = Math.min(Math.max(student.attendance / 100, 0), 1);
    const normY = Math.min(Math.max(student.study_hours / 20, 0), 1);

    const x = pad + normX * chartW;
    const y = pad + chartH - normY * chartH;

    const isPass = student.status === "PASS";
    const color = isPass ? '#10b981' : '#f43f5e';

    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '9px Plus Jakarta Sans';
    ctx.textAlign = 'center';
    ctx.fillText(student.name.split(' ')[0], x, y - 9);
  });
}

// Window resize re-renders charts
window.addEventListener('resize', () => {
  if (State.currentTab === 'analytics') {
    renderAnalyticsCharts();
  }
});

// ==========================================================================
// Initialization
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initQuantumBackground();
  setupNavigation();
  setupLabControls();
  setupRosterStudio();
});
