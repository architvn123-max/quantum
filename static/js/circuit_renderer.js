/**
 * Quantum Circuit Dynamic SVG & Canvas Renderer
 * Visualizes 2-qubit quantum circuit with interactive gates and pulsating wires
 */
const CircuitRenderer = {
  renderSVG(containerId, theta0, theta1) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const width = 640;
    const height = 180;
    const t0Str = (theta0 || 0).toFixed(3);
    const t1Str = (theta1 || 0).toFixed(3);

    const svg = `
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="max-height: 220px; font-family: 'JetBrains Mono', monospace;">
        <defs>
          <linearGradient id="gateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1e293b" />
            <stop offset="100%" stop-color="#0f172a" />
          </linearGradient>
          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <!-- Background grid subtle -->
        <rect width="${width}" height="${height}" fill="transparent" rx="10"/>

        <!-- Qubit Labels -->
        <text x="35" y="45" fill="#f8fafc" font-size="13" font-weight="700">q[0]</text>
        <text x="35" y="60" fill="#94a3b8" font-size="10">|0⟩ (Att)</text>

        <text x="35" y="115" fill="#f8fafc" font-size="13" font-weight="700">q[1]</text>
        <text x="35" y="130" fill="#94a3b8" font-size="10">|0⟩ (Study)</text>

        <!-- Quantum Wires -->
        <line x1="85" y1="45" x2="560" y2="45" stroke="rgba(56, 189, 248, 0.5)" stroke-width="2"/>
        <line x1="85" y1="115" x2="560" y2="115" stroke="rgba(139, 92, 246, 0.5)" stroke-width="2"/>

        <!-- Classical Register Wire -->
        <line x1="85" y1="160" x2="560" y2="160" stroke="#475569" stroke-width="1.5"/>
        <line x1="85" y1="164" x2="560" y2="164" stroke="#475569" stroke-width="1.5"/>
        <text x="35" y="165" fill="#64748b" font-size="11">c: 2</text>

        <!-- Gate 1: Ry(theta0) on Q0 -->
        <g class="circuit-gate-group" transform="translate(130, 20)">
          <rect width="105" height="50" rx="8" fill="url(#gateGrad)" stroke="#00f5d4" stroke-width="1.8" filter="url(#neonGlow)"/>
          <text x="52" y="24" fill="#00f5d4" font-size="12" font-weight="bold" text-anchor="middle">Ry(θ_att)</text>
          <text x="52" y="40" fill="#f8fafc" font-size="10" text-anchor="middle">${t0Str} rad</text>
        </g>

        <!-- Gate 2: Ry(theta1) on Q1 -->
        <g class="circuit-gate-group" transform="translate(130, 90)">
          <rect width="105" height="50" rx="8" fill="url(#gateGrad)" stroke="#38bdf8" stroke-width="1.8"/>
          <text x="52" y="24" fill="#38bdf8" font-size="12" font-weight="bold" text-anchor="middle">Ry(θ_std)</text>
          <text x="52" y="40" fill="#f8fafc" font-size="10" text-anchor="middle">${t1Str} rad</text>
        </g>

        <!-- CNOT Entanglement Connection -->
        <g class="cnot-group">
          <!-- Vertical entanglement line -->
          <line x1="310" y1="45" x2="310" y2="115" stroke="#8b5cf6" stroke-width="2.5" stroke-dasharray="3,3"/>
          <!-- Control Dot on Q0 -->
          <circle cx="310" cy="45" r="7" fill="#8b5cf6" filter="url(#neonGlow)"/>
          <!-- Target Target Cross on Q1 -->
          <circle cx="310" cy="115" r="14" fill="none" stroke="#8b5cf6" stroke-width="2.2"/>
          <line x1="310" y1="104" x2="310" y2="126" stroke="#8b5cf6" stroke-width="2.2"/>
          <line x1="299" y1="115" x2="321" y2="115" stroke="#8b5cf6" stroke-width="2.2"/>
          <text x="310" y="148" fill="#a78bfa" font-size="9" text-anchor="middle">CNOT Entangler</text>
        </g>

        <!-- Measurement Gate Q0 -->
        <g transform="translate(420, 25)">
          <rect width="45" height="40" rx="6" fill="#1e293b" stroke="#94a3b8" stroke-width="1.5"/>
          <!-- Dial arc & needle -->
          <path d="M 12 30 A 13 13 0 0 1 33 30" fill="none" stroke="#94a3b8" stroke-width="1.2"/>
          <line x1="22.5" y1="30" x2="30" y2="18" stroke="#00f5d4" stroke-width="1.5"/>
          <line x1="22.5" y1="40" x2="22.5" y2="135" stroke="#64748b" stroke-width="1.2" stroke-dasharray="2,2"/>
          <text x="22.5" y="15" fill="#f8fafc" font-size="8" text-anchor="middle">M_0</text>
        </g>

        <!-- Measurement Gate Q1 -->
        <g transform="translate(490, 95)">
          <rect width="45" height="40" rx="6" fill="#1e293b" stroke="#94a3b8" stroke-width="1.5"/>
          <path d="M 12 30 A 13 13 0 0 1 33 30" fill="none" stroke="#94a3b8" stroke-width="1.2"/>
          <line x1="22.5" y1="30" x2="30" y2="18" stroke="#38bdf8" stroke-width="1.5"/>
          <line x1="22.5" y1="40" x2="22.5" y2="65" stroke="#64748b" stroke-width="1.2" stroke-dasharray="2,2"/>
          <text x="22.5" y="15" fill="#f8fafc" font-size="8" text-anchor="middle">M_1</text>
        </g>
      </svg>
    `;
    container.innerHTML = svg;
  }
};

window.CircuitRenderer = CircuitRenderer;
