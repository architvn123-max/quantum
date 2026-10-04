/**
 * Quantum Engine: Client-side Analytical Simulation & Server Bridge
 * Provides immediate zero-latency feedback on slider drag, with automatic Qiskit simulator sync.
 */
const QuantumEngine = {
  // Analytical exact state probabilities (Ry -> Ry -> CNOT -> Measure)
  simulateClientSide(attendance, studyHours) {
    const normAtt = Math.min(Math.max(attendance / 100.0, 0.0), 1.0);
    const normStudy = Math.min(Math.max(studyHours / 20.0, 0.0), 1.0);

    const theta0 = normAtt * Math.PI;
    const theta1 = normStudy * Math.PI;

    const c0 = Math.cos(theta0 / 2.0);
    const s0 = Math.sin(theta0 / 2.0);
    const c1 = Math.cos(theta1 / 2.0);
    const s1 = Math.sin(theta1 / 2.0);

    // After CNOT (control = Qubit 0, target = Qubit 1)
    // Measurement bitstring 'q1 q0':
    const p00 = Math.pow(c0 * c1, 2);
    const p01 = Math.pow(s0 * s1, 2);
    const p10 = Math.pow(c0 * s1, 2);
    const p11 = Math.pow(s0 * c1, 2);

    const total = p00 + p01 + p10 + p11 || 1.0;
    const norm_p00 = p00 / total;
    const norm_p01 = p01 / total;
    const norm_p10 = p10 / total;
    const norm_p11 = p11 / total;

    const passProb = (1.0 - norm_p00) * 100.0;
    const classical = (0.5 * normAtt + 0.5 * normStudy) * 100.0;

    return {
      theta_0_rad: theta0,
      theta_0_deg: (theta0 * 180 / Math.PI),
      theta_1_rad: theta1,
      theta_1_deg: (theta1 * 180 / Math.PI),
      pass_probability: parseFloat(passProb.toFixed(1)),
      status: passProb >= 50.0 ? "PASS" : "FAIL",
      classical_score: parseFloat(classical.toFixed(1)),
      counts: {
        "00": Math.round(norm_p00 * 1024),
        "01": Math.round(norm_p01 * 1024),
        "10": Math.round(norm_p10 * 1024),
        "11": Math.round(norm_p11 * 1024)
      },
      exact: {
        p_00: parseFloat((norm_p00 * 100).toFixed(2)),
        p_01: parseFloat((norm_p01 * 100).toFixed(2)),
        p_10: parseFloat((norm_p10 * 100).toFixed(2)),
        p_11: parseFloat((norm_p11 * 100).toFixed(2)),
        exact_pass_probability: parseFloat(passProb.toFixed(2))
      }
    };
  },

  // API Call: Analyze Single Student via Qiskit Backend
  async analyzeServer(name, attendance, studyHours, shots = 1024) {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, attendance, study_hours: studyHours, shots })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.warn('Backend unavailable, falling back to local QuantumEngine math:', err);
      const local = this.simulateClientSide(attendance, studyHours);
      local.name = name;
      local.shots = shots;
      local.circuit_text = this.generateAsciiCircuit(local.theta_0_rad, local.theta_1_rad);
      return local;
    }
  },

  // API Call: Batch Analysis
  async batchAnalyzeServer(students, shots = 1024) {
    try {
      const response = await fetch('/api/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students, shots })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.warn('Backend unavailable for batch, calculating locally:', err);
      const results = students.map(s => {
        const sim = this.simulateClientSide(s.attendance, s.study_hours);
        sim.name = s.name;
        sim.attendance = s.attendance;
        sim.study_hours = s.study_hours;
        return sim;
      });
      const passCount = results.filter(r => r.status === "PASS").length;
      return {
        results,
        statistics: {
          total_students: results.length,
          pass_count: passCount,
          fail_count: results.length - passCount,
          pass_rate: parseFloat((passCount / results.length * 100).toFixed(1)),
          avg_attendance: parseFloat((results.reduce((a, c) => a + c.attendance, 0) / results.length).toFixed(1)),
          avg_study_hours: parseFloat((results.reduce((a, c) => a + c.study_hours, 0) / results.length).toFixed(1)),
          avg_pass_probability: parseFloat((results.reduce((a, c) => a + c.pass_probability, 0) / results.length).toFixed(1)),
          top_performer: results.reduce((prev, current) => (prev.pass_probability > current.pass_probability) ? prev : current).name,
          at_risk_count: results.filter(r => r.pass_probability < 50).length
        }
      };
    }
  },

  // API Call: Presets
  async fetchPresets() {
    try {
      const res = await fetch('/api/presets');
      return await res.json();
    } catch (e) {
      return {
        default_class: [
          { name: "Alice Johnson", attendance: 95, study_hours: 18 },
          { name: "Bob Smith", attendance: 82, study_hours: 12 },
          { name: "Charlie Davis", attendance: 65, study_hours: 9 },
          { name: "Diana Prince", attendance: 45, study_hours: 4 },
          { name: "Evan Wright", attendance: 20, study_hours: 1 },
          { name: "Fiona Gallagher", attendance: 88, study_hours: 6 },
          { name: "George Miller", attendance: 35, study_hours: 16 },
          { name: "Hannah Abbott", attendance: 92, study_hours: 15 }
        ]
      };
    }
  },

  // ASCII Circuit Generator (Matching Qiskit's format)
  generateAsciiCircuit(theta0, theta1) {
    const t0Str = theta0.toFixed(3);
    const t1Str = theta1.toFixed(3);
    return `     ┌───────────┐     ┌─┐   \n` +
           `q_0: ┤ Ry(${t0Str}) ├──■──┤M├───\n` +
           `     ├───────────┤┌─┴─┐└╥┘┌─┐\n` +
           `q_1: ┤ Ry(${t1Str}) ├┤ X ├─╫─┤M│\n` +
           `     └───────────┘└───┘ ║ └╥┘\n` +
           `c: 2/═══════════════════╩══╩═\n` +
           `                        0  1 `;
  }
};

window.QuantumEngine = QuantumEngine;
