import io
import math
import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from flask import Flask, render_template, request, jsonify, send_file, send_from_directory
import qiskit

from student_performance_analyzer import (
    build_student_circuit,
    run_circuit,
    encode_to_angle,
    simulator_name
)

app = Flask(__name__, static_folder='static', template_folder='templates')

def calculate_exact_probabilities(attendance, study_hours):
    """
    Calculates exact analytical quantum state probabilities for the 2-qubit circuit:
    Initial: |00>
    Ry(theta_att) on Qubit 0
    Ry(theta_study) on Qubit 1
    CNOT(0 -> 1)
    """
    theta_0 = encode_to_angle(attendance, max_value=100)
    theta_1 = encode_to_angle(study_hours, max_value=20)

    c0 = math.cos(theta_0 / 2.0)
    s0 = math.sin(theta_0 / 2.0)
    c1 = math.cos(theta_1 / 2.0)
    s1 = math.sin(theta_1 / 2.0)

    # Before CNOT:
    # |00>: c0 * c1
    # |01>: c0 * s1
    # |10>: s0 * c1
    # |11>: s0 * s1

    # After CNOT (control = Qubit 0, target = Qubit 1):
    # If Q0 is 0: target stays unchanged -> |00> stays |00>, |01> stays |01>
    # If Q0 is 1: target flips -> |10> becomes |11>, |11> becomes |10>
    # Note: In Qiskit standard measurement bitstring order is 'q1 q0'
    # State '00': Q1=0, Q0=0 -> amplitude c0 * c1
    # State '01': Q1=0, Q0=1 -> amplitude s0 * s1 (since |11> flipped to Q1=0, Q0=1)
    # State '10': Q1=1, Q0=0 -> amplitude c0 * s1 (since |01> has Q1=1, Q0=0)
    # State '11': Q1=1, Q0=1 -> amplitude s0 * c1 (since |10> flipped to Q1=1, Q0=1)

    p_00 = (c0 * c1) ** 2
    p_01 = (s0 * s1) ** 2
    p_10 = (c0 * s1) ** 2
    p_11 = (s0 * c1) ** 2

    # Verification: sum equals 1.0
    total = p_00 + p_01 + p_10 + p_11
    if total > 0:
        p_00 /= total
        p_01 /= total
        p_10 /= total
        p_11 /= total

    exact_pass_prob = (1.0 - p_00) * 100.0

    return {
        "theta_0_rad": round(theta_0, 4),
        "theta_0_deg": round(math.degrees(theta_0), 2),
        "theta_1_rad": round(theta_1, 4),
        "theta_1_deg": round(math.degrees(theta_1), 2),
        "p_00": round(p_00 * 100.0, 2),
        "p_01": round(p_01 * 100.0, 2),
        "p_10": round(p_10 * 100.0, 2),
        "p_11": round(p_11 * 100.0, 2),
        "exact_pass_probability": round(exact_pass_prob, 2)
    }

def analyze_single_student_full(name, attendance, study_hours, shots=1024):
    attendance = float(attendance)
    study_hours = float(study_hours)
    shots = int(shots) if shots else 1024

    qc = build_student_circuit(attendance, study_hours)
    counts = run_circuit(qc, shots=shots)
    fail_counts = counts.get('00', 0)
    pass_counts = shots - fail_counts
    simulated_pass_prob = (pass_counts / shots) * 100.0

    exact = calculate_exact_probabilities(attendance, study_hours)
    circuit_text = str(qc.draw(output='text'))

    # Classical linear benchmark for comparison
    norm_att = min(max(attendance / 100.0, 0.0), 1.0)
    norm_study = min(max(study_hours / 20.0, 0.0), 1.0)
    classical_score = (0.5 * norm_att + 0.5 * norm_study) * 100.0

    status = "PASS" if simulated_pass_prob >= 50.0 else "FAIL"

    return {
        "name": name,
        "attendance": attendance,
        "study_hours": study_hours,
        "shots": shots,
        "pass_probability": round(simulated_pass_prob, 1),
        "status": status,
        "counts": {
            "00": counts.get("00", 0),
            "01": counts.get("01", 0),
            "10": counts.get("10", 0),
            "11": counts.get("11", 0)
        },
        "exact": exact,
        "classical_score": round(classical_score, 1),
        "circuit_text": circuit_text
    }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/info', methods=['GET'])
def get_info():
    return jsonify({
        "simulator_name": simulator_name,
        "qiskit_version": getattr(qiskit, '__version__', '2.x'),
        "qubit_count": 2,
        "gates": ["Ry (Angle Encoding)", "CNOT (Entanglement)", "Measurement"]
    })

@app.route('/api/analyze', methods=['POST'])
def analyze():
    data = request.get_json(force=True)
    name = data.get("name", "Student").strip() or "Student"
    attendance = float(data.get("attendance", 75))
    study_hours = float(data.get("study_hours", 10))
    shots = int(data.get("shots", 1024))

    result = analyze_single_student_full(name, attendance, study_hours, shots)
    return jsonify(result)

@app.route('/api/batch', methods=['POST'])
def batch_analyze():
    data = request.get_json(force=True)
    students = data.get("students", [])
    shots = int(data.get("shots", 1024))

    results = []
    pass_count = 0
    total_att = 0.0
    total_study = 0.0
    total_pass_prob = 0.0

    for s in students:
        name = str(s.get("name", "Student")).strip() or "Student"
        att = float(s.get("attendance", 0))
        study = float(s.get("study_hours", 0))

        res = analyze_single_student_full(name, att, study, shots)
        results.append(res)

        if res["status"] == "PASS":
            pass_count += 1
        total_att += att
        total_study += study
        total_pass_prob += res["pass_probability"]

    count = len(results)
    stats = {
        "total_students": count,
        "pass_count": pass_count,
        "fail_count": count - pass_count,
        "pass_rate": round((pass_count / count * 100.0), 1) if count > 0 else 0,
        "avg_attendance": round((total_att / count), 1) if count > 0 else 0,
        "avg_study_hours": round((total_study / count), 1) if count > 0 else 0,
        "avg_pass_probability": round((total_pass_prob / count), 1) if count > 0 else 0,
        "top_performer": max(results, key=lambda x: x["pass_probability"])["name"] if count > 0 else None,
        "at_risk_count": sum(1 for r in results if r["pass_probability"] < 50.0)
    }

    return jsonify({
        "results": results,
        "statistics": stats
    })

@app.route('/api/presets', methods=['GET'])
def get_presets():
    presets = {
        "default_class": [
            {"name": "Alice Johnson", "attendance": 95, "study_hours": 18},
            {"name": "Bob Smith", "attendance": 82, "study_hours": 12},
            {"name": "Charlie Davis", "attendance": 65, "study_hours": 9},
            {"name": "Diana Prince", "attendance": 45, "study_hours": 4},
            {"name": "Evan Wright", "attendance": 20, "study_hours": 1},
            {"name": "Fiona Gallagher", "attendance": 88, "study_hours": 6},
            {"name": "George Miller", "attendance": 35, "study_hours": 16},
            {"name": "Hannah Abbott", "attendance": 92, "study_hours": 15}
        ],
        "borderline_cohort": [
            {"name": "Jordan Bell", "attendance": 55, "study_hours": 7},
            {"name": "Taylor Swift", "attendance": 48, "study_hours": 9},
            {"name": "Morgan Freeman", "attendance": 50, "study_hours": 6},
            {"name": "Riley Vance", "attendance": 42, "study_hours": 11}
        ],
        "extreme_disparity": [
            {"name": "Bookworm Blake", "attendance": 15, "study_hours": 20},
            {"name": "Present Paula", "attendance": 98, "study_hours": 1},
            {"name": "Ghost Hunter", "attendance": 5, "study_hours": 0},
            {"name": "Zen Master", "attendance": 100, "study_hours": 20}
        ]
    }
    return jsonify(presets)

@app.route('/api/export-chart', methods=['POST'])
def export_chart():
    data = request.get_json(force=True)
    results = data.get("results", [])
    if not results:
        return jsonify({"error": "No results provided"}), 400

    names = [r["name"] for r in results]
    probs = [r["pass_probability"] for r in results]
    colors = ['#10b981' if r["status"] == "PASS" else '#f43f5e' for r in results]

    plt.figure(figsize=(10, 5.5), facecolor='#0f172a')
    ax = plt.subplot(111)
    ax.set_facecolor('#1e293b')

    bars = ax.bar(names, probs, color=colors, width=0.55, edgecolor='#38bdf8', linewidth=1.2)
    ax.axhline(50, color='#facc15', linestyle='--', linewidth=1.8, label='Pass Threshold (50%)')

    for bar, prob in zip(bars, probs):
        yval = bar.get_height()
        ax.text(bar.get_x() + bar.get_width() / 2.0, yval + 2, f"{prob:.1f}%", 
                ha='center', va='bottom', fontweight='bold', fontsize=10, color='#ffffff')

    ax.set_ylim(0, 115)
    ax.set_title("Quantum Student Performance Analyzer - Batch Evaluation", fontsize=15, fontweight='bold', pad=15, color='#f8fafc')
    ax.set_xlabel("Student Name", fontsize=12, labelpad=10, color='#cbd5e1')
    ax.set_ylabel("Quantum Pass Probability (%)", fontsize=12, labelpad=10, color='#cbd5e1')
    ax.tick_params(colors='#94a3b8')
    ax.grid(axis='y', linestyle=':', alpha=0.3, color='#94a3b8')
    legend = ax.legend(loc='upper right', facecolor='#1e293b', edgecolor='#334155')
    for text in legend.get_texts():
        text.set_color("#f8fafc")

    plt.xticks(rotation=20, ha='right')
    plt.tight_layout()

    img_buffer = io.BytesIO()
    plt.savefig(img_buffer, format='png', dpi=160, facecolor='#0f172a')
    plt.close()
    img_buffer.seek(0)

    return send_file(img_buffer, mimetype='image/png', as_attachment=True, download_name='quantum_performance_chart.png')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"[*] Starting Quantum Student Performance Web Application on http://127.0.0.1:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
