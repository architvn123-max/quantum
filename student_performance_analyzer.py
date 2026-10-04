import math
import matplotlib.pyplot as plt
from qiskit import QuantumCircuit

try:
    from qiskit_aer import AerSimulator
    _sim = AerSimulator()
    _probe = QuantumCircuit(1, 1)
    _probe.measure(0, 0)
    _sim.run(_probe, shots=1).result()

    def run_circuit(qc, shots=1024):
        job = _sim.run(qc, shots=shots)
        return job.result().get_counts()

    simulator_name = "Qiskit AerSimulator"
except Exception:
    from qiskit.primitives import StatevectorSampler
    _sampler = StatevectorSampler()

    def run_circuit(qc, shots=1024):
        job = _sampler.run([qc], shots=shots)
        pub_result = job.result()[0]
        return pub_result.data.c.get_counts()

    simulator_name = "Qiskit StatevectorSampler (Built-in)"


def get_students_from_user():
    """
    Interactively prompts the user to input student records.
    Validates:
      - Number of students (positive integer)
      - Student name (non-empty string)
      - Attendance percentage (0 to 100)
      - Study hours per week (non-negative number)
    """
    print("=" * 65)
    print("                   STUDENT DATA ENTRY")
    print("=" * 65)

    while True:
        try:
            raw_count = input("Enter the number of students to evaluate: ").strip()
            num_students = int(raw_count)
            if num_students > 0:
                break
            print("[!] Please enter a positive integer greater than 0.\n")
        except ValueError:
            print("[!] Invalid input. Please enter a valid integer.\n")

    student_list = []
    for i in range(1, num_students + 1):
        print(f"\n--- Student #{i} ---")
        while True:
            name = input("  Student Name: ").strip()
            if name:
                break
            print("  [!] Name cannot be empty. Please enter a valid name.")

        while True:
            try:
                attendance_in = float(input(f"  Attendance % for {name} (0-100): ").strip())
                if 0 <= attendance_in <= 100:
                    attendance = int(attendance_in) if attendance_in.is_integer() else attendance_in
                    break
                print("  [!] Attendance must be between 0 and 100.")
            except ValueError:
                print("  [!] Please enter a valid number for attendance.")

        while True:
            try:
                study_in = float(input(f"  Weekly study hours for {name} (0-20+): ").strip())
                if study_in >= 0:
                    study_hours = int(study_in) if study_in.is_integer() else study_in
                    break
                print("  [!] Study hours must be 0 or greater.")
            except ValueError:
                print("  [!] Please enter a valid number for study hours.")

        student_list.append({
            "name": name,
            "attendance": attendance,
            "study_hours": study_hours
        })

    print("\n" + "=" * 65 + "\n")
    return student_list


def encode_to_angle(value, max_value):
    normalized = min(max(value / max_value, 0.0), 1.0)
    theta = normalized * math.pi
    return theta


def build_student_circuit(attendance, study_hours):
    qc = QuantumCircuit(2, 2)
    theta_attendance = encode_to_angle(attendance, max_value=100)
    theta_study = encode_to_angle(study_hours, max_value=20)
    qc.ry(theta_attendance, 0)
    qc.ry(theta_study, 1)
    qc.cx(0, 1)
    qc.measure([0, 1], [0, 1])
    return qc


def analyze_student(student, shots=1024):
    qc = build_student_circuit(student["attendance"], student["study_hours"])
    counts = run_circuit(qc, shots=shots)
    fail_counts = counts.get('00', 0)
    pass_counts = shots - fail_counts
    pass_probability = (pass_counts / shots) * 100.0
    status = "PASS" if pass_probability >= 50.0 else "FAIL"

    return {
        "name": student["name"],
        "attendance": student["attendance"],
        "study_hours": student["study_hours"],
        "pass_probability": round(pass_probability, 1),
        "status": status,
        "counts": counts
    }


def run_evaluation(student_list):
    name_col_width = max(12, max(len(s["name"]) for s in student_list))
    total_width = name_col_width + 48

    print("=" * total_width)
    print("      STUDENT PERFORMANCE ANALYZER (QUANTUM POWERED)".center(total_width))
    print("=" * total_width)
    print(f"{'Student':<{name_col_width}} | {'Attendance':<10} | {'Study Hours':<11} | {'Pass Prob':<10} | {'Result'}")
    print("-" * total_width)

    results = []
    for student in student_list:
        res = analyze_student(student)
        results.append(res)
        print(f"{res['name']:<{name_col_width}} | {res['attendance']:>8}%  | {res['study_hours']:>9} hrs | {res['pass_probability']:>8.1f}% | {res['status']}")

    print("=" * total_width)
    return results


def plot_results(results):
    names = [r["name"] for r in results]
    probs = [r["pass_probability"] for r in results]
    colors = ['#2ecc71' if r["status"] == "PASS" else '#e74c3c' for r in results]

    plt.figure(figsize=(9, 5.5))
    bars = plt.bar(names, probs, color=colors, width=0.55, edgecolor='black', linewidth=1.2)
    plt.axhline(50, color='gray', linestyle='--', linewidth=1.5, label='Pass Threshold (50%)')

    for bar, prob in zip(bars, probs):
        yval = bar.get_height()
        plt.text(bar.get_x() + bar.get_width() / 2.0, yval + 1.5, f"{prob:.1f}%", 
                 ha='center', va='bottom', fontweight='bold', fontsize=10)

    plt.ylim(0, 110)
    plt.title("Quantum Student Performance Analyzer - Pass Probability", fontsize=14, fontweight='bold', pad=15)
    plt.xlabel("Student Name", fontsize=12, labelpad=10)
    plt.ylabel("Pass Probability (%)", fontsize=12, labelpad=10)
    plt.grid(axis='y', linestyle=':', alpha=0.6)
    plt.legend(loc='upper right')
    plt.tight_layout()
    plt.savefig("student_performance_chart.png", dpi=150)
    print("\n[INFO] Bar chart saved as 'student_performance_chart.png'!")
    plt.show()


if __name__ == "__main__":
    print(f"[INFO] Active Simulator: {simulator_name}\n")
    students = get_students_from_user()
    analysis_results = run_evaluation(students)
    print(f"\n[INFO] Example 2-Qubit Quantum Circuit ({students[0]['name']}):")
    sample_circuit = build_student_circuit(students[0]["attendance"], students[0]["study_hours"])
    print(sample_circuit.draw(output='text'))
    plot_results(analysis_results)
