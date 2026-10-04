# 🎓 Quantum Student Performance Analyzer

A beginner-friendly practical project demonstrating how to use **Quantum Computing (Qiskit)** to evaluate whether a student passes or fails based on two metrics:
1. **Attendance** (0% to 100%)
2. **Study Hours** (0 to 20 hours per week)

---

## 📌 1. Project Concept & Quantum Intuition

### Why Quantum Computing for this task?
In classical computing, we usually just write a linear formula like `score = 0.4 * attendance + 0.6 * study`. 

In Quantum Computing:
- Instead of fixed numbers, we map real-world metrics into **qubit rotation angles** (known as **Angle Encoding**).
- We use an **$R_y$ rotation gate**:
  - Rotating by $\theta = 0$ leaves the qubit in state $|0\rangle$ (0% probability of success).
  - Rotating by $\theta = \pi$ moves the qubit into state $|1\rangle$ (100% probability of success).
- We use a **CNOT gate (Controlled-NOT)** to **entangle** the attendance qubit with the study qubit. In education, attendance and independent study aren't isolated; high attendance reinforces study habits and vice versa!
- When we run the circuit on the simulator, the system collapses into one of 4 possible states: `'00'`, `'01'`, `'10'`, or `'11'`.
- `'00'` represents the ground state (both metrics failed to achieve excitation). Any outcome containing a `1` means the student reached passing proficiency in at least one quantum dimension.

$$\text{Pass Probability} = 100\% - P('00')$$

---

## 🚀 2. Quick Setup Instructions

Install dependencies:

```bash
pip install -r requirements.txt
```

*(Includes `qiskit`, `qiskit-aer`, `matplotlib`, and `flask`)*

---

## 🌐 3. Launching the Web Application

To run the interactive web application dashboard:

```bash
python app.py
```

Open your browser and navigate to:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

### Web Application Highlights:
- **⚡ Live Quantum Lab**: Real-time sliders for attendance (0–100%) and weekly study hours (0–25 hrs) with zero-latency preview, radial pass probability gauge, $|00\rangle, |01\rangle, |10\rangle, |11\rangle$ state breakdown bars, and dynamic circuit schematic (SVG and Qiskit ASCII).
- **👥 Classroom Studio (Batch Evaluation)**: Manage cohorts, evaluate multiple students simultaneously using Qiskit, edit attendance and study time inline, add/delete students, and export results to CSV or download custom Matplotlib chart reports.
- **📊 Interactive Analytics**: Cohort pass probability bar chart with the 50% pass boundary line, and a 2D Attendance vs. Study quadrant scatter matrix.
- **📖 Quantum Theory Guide**: Step-by-step mathematical explanation of Angle Encoding ($R_y$), CNOT entanglement, superposition collapse, and classical comparison.

---

## 💻 4. Running the CLI Script Directly

You can also run the original interactive terminal version:

```bash
python student_performance_analyzer.py
```


The program will interactively prompt you to enter the student data:
1. **Number of students** to evaluate (e.g., 3)
2. For each student:
   - **Student Name**
   - **Attendance Percentage** (0% to 100%)
   - **Weekly Study Hours** (0+ hrs)

---

## 📊 4. Expected Output

### Console Interaction & Output:
```text
[INFO] Active Simulator: Qiskit StatevectorSampler (Built-in)

=================================================================
                   STUDENT DATA ENTRY
=================================================================
Enter the number of students to evaluate: 3

--- Student #1 ---
  Student Name: Alice
  Attendance % for Alice (0-100): 95
  Weekly study hours for Alice (0-20+): 18

--- Student #2 ---
  Student Name: Diana
  Attendance % for Diana (0-100): 45
  Weekly study hours for Diana (0-20+): 4

--- Student #3 ---
  Student Name: Evan
  Attendance % for Evan (0-100): 20
  Weekly study hours for Evan (0-20+): 1

=================================================================

============================================================
       STUDENT PERFORMANCE ANALYZER (QUANTUM POWERED)       
============================================================
Student      | Attendance | Study Hours | Pass Prob  | Result
------------------------------------------------------------
Alice        |       95%  |        18 hrs |    100.0% | PASS
Diana        |       45%  |         4 hrs |     38.4% | FAIL
Evan         |       20%  |         1 hrs |      6.2% | FAIL
============================================================
```

### Circuit Diagram (Qiskit text representation):
```text
     ┌───────────┐     ┌─┐   
q_0: ┤ Ry(2.984) ├──■──┤M├───
     ├───────────┤┌─┴─┐└╥┘┌─┐
q_1: ┤ Ry(2.827) ├┤ X ├─╫─┤M│
     └───────────┘└───┘ ║ └╥┘
c: 2/═══════════════════╩══╩═
                        0  1 
```

### Visualization:
A Matplotlib window opens and automatically saves `student_performance_chart.png`, showing a clean bar chart with green bars for passing students, red for failing students, and a dashed line at the 50% threshold.
