// Eduardo Martins — SOC Console (standalone polished)
// Adds: Quantum Simulator + Ambiente Check projects, CTF gallery, MITRE-tagged packet stream,
//       expanded tweaks (accent / density / animations), mobile responsive.

const { useState, useEffect, useRef, useMemo } = React;

// ============ Tweaks defaults ============
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#ff3b30",
  "density": "comfortable",
  "animations": true
}/*EDITMODE-END*/;

const ACCENT_PALETTE = [
  { name: "Red Team",  value: "#ff3b30" },
  { name: "Matrix",    value: "#3effa0" },
  { name: "Amber",     value: "#ffb020" },
  { name: "Ice",       value: "#5ecbff" },
];

// ============ Hooks ============
function useTyped(text, speed = 35, startDelay = 0, enabled = true) {
  const [out, setOut] = useState(enabled ? "" : text);
  useEffect(() => {
    if (!enabled) { setOut(text); return; }
    let i = 0; let t;
    const start = setTimeout(() => {
      t = setInterval(() => {
        i++;
        setOut(text.slice(0, i));
        if (i >= text.length) clearInterval(t);
      }, speed);
    }, startDelay);
    return () => { clearTimeout(start); clearInterval(t); };
  }, [text, speed, startDelay, enabled]);
  return out;
}

function useReveal(ref, threshold = 0.15) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return visible;
}

function Reveal({ children, delay = 0, as: Tag = "div", style, className, animations = true }) {
  const ref = useRef(null);
  const visible = useReveal(ref);
  const shown = !animations || visible;
  return (
    <Tag ref={ref} className={className}
      style={{
        ...style,
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(14px)",
        transition: animations ? `opacity .7s ${delay}ms ease, transform .7s ${delay}ms cubic-bezier(.2,.7,.2,1)` : "none",
      }}>
      {children}
    </Tag>
  );
}

// ============ Packet stream w/ TCP flags + MITRE ============
function usePacketStream(maxRows = 14, speed = 600, enabled = true) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    if (!enabled) return;
    const protos = ["TCP", "UDP", "ICMP", "TLS", "DNS", "HTTP", "SSH"];
    const scenarios = [
      { v: "ALLOW", color: "#71c778", flags: "ACK",      mitre: null },
      { v: "ALLOW", color: "#71c778", flags: "PSH/ACK",  mitre: null },
      { v: "ALLOW", color: "#71c778", flags: "SYN/ACK",  mitre: null },
      { v: "ALLOW", color: "#71c778", flags: "FIN/ACK",  mitre: null },
      { v: "WATCH", color: "#d9a84a", flags: "SYN",      mitre: "T1046" },
      { v: "WATCH", color: "#d9a84a", flags: "FIN",      mitre: "T1595.001" },
      { v: "WATCH", color: "#d9a84a", flags: "NULL",     mitre: "T1595.001" },
      { v: "BLOCK", color: "#e8443e", flags: "SYN-flood",mitre: "T1499.002" },
      { v: "BLOCK", color: "#e8443e", flags: "ICMP-flood",mitre: "T1498.001" },
      { v: "BLOCK", color: "#e8443e", flags: "DNS-tun",  mitre: "T1071.004" },
      { v: "BLOCK", color: "#e8443e", flags: "ARP-spoof",mitre: "T1557.002" },
    ];
    const rand = (a, b) => Math.floor(a + Math.random() * (b - a));
    const pick = (arr) => arr[rand(0, arr.length)];
    const gen = () => {
      const s = scenarios[rand(0, scenarios.length)];
      return {
        id: Math.random().toString(36).slice(2, 8),
        time: new Date().toISOString().slice(11, 19),
        src: `${rand(10, 245)}.${rand(0, 255)}.${rand(0, 255)}.${rand(1, 254)}`,
        dst: `10.0.${rand(0, 255)}.${rand(1, 254)}`,
        proto: pick(protos),
        port: pick([22, 53, 80, 443, 3389, 8080, 5432]),
        bytes: rand(64, 15000),
        flags: s.flags,
        verdict: { label: s.v, color: s.color },
        mitre: s.mitre,
      };
    };
    setRows(Array.from({ length: 6 }, gen));
    const t = setInterval(() => setRows(prev => [gen(), ...prev].slice(0, maxRows)), speed);
    return () => clearInterval(t);
  }, [enabled, speed, maxRows]);
  return rows;
}

// ============ World map ============
const GEO_NODES = [
  { name: "São Paulo",  code: "BR", x: 33,  y: 70,  threat: 0.3 },
  { name: "New York",   code: "US", x: 26,  y: 42,  threat: 0.5 },
  { name: "Frankfurt",  code: "DE", x: 52,  y: 38,  threat: 0.6 },
  { name: "Moscow",     code: "RU", x: 60,  y: 32,  threat: 0.9 },
  { name: "Beijing",    code: "CN", x: 78,  y: 42,  threat: 0.85 },
  { name: "Tokyo",      code: "JP", x: 86,  y: 46,  threat: 0.4 },
  { name: "Sydney",     code: "AU", x: 88,  y: 78,  threat: 0.2 },
  { name: "Lagos",      code: "NG", x: 51,  y: 62,  threat: 0.55 },
  { name: "Amsterdam",  code: "NL", x: 49,  y: 36,  threat: 0.35 },
  { name: "Singapore",  code: "SG", x: 77,  y: 62,  threat: 0.5 },
];

function GeoMap({ nodes = GEO_NODES, accent = "#e8443e", muted = "#1a1d24", base = "#07090c", animate = true, height = 320 }) {
  const dots = useMemo(() => {
    const arr = [];
    for (let x = 0; x < 100; x += 2.2) {
      for (let y = 20; y < 90; y += 2.2) {
        const n = Math.sin(x * 0.12) * Math.cos(y * 0.18) + Math.sin(x * 0.07 + y * 0.09) * 0.8;
        const land =
          (x > 20 && x < 40 && y > 35 && y < 82 && n > -0.3) ||
          (x > 42 && x < 62 && y > 30 && y < 70 && n > -0.2) ||
          (x > 62 && x < 92 && y > 30 && y < 78 && n > -0.1);
        if (land && Math.random() > 0.2) arr.push({ x, y });
      }
    }
    return arr;
  }, []);
  const origin = nodes[0];

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height, display: "block", background: base }}>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r="0.35" fill={muted} opacity="0.7" />
      ))}
      {nodes.slice(1).map((n, i) => {
        const mx = (origin.x + n.x) / 2;
        const my = (origin.y + n.y) / 2 - Math.abs(n.x - origin.x) * 0.15;
        return (
          <g key={i}>
            <path d={`M ${origin.x} ${origin.y} Q ${mx} ${my} ${n.x} ${n.y}`}
              stroke={accent} strokeWidth="0.15" fill="none" opacity={0.25 + n.threat * 0.4}/>
            {animate && (
              <circle r="0.4" fill={accent} style={{ filter: `drop-shadow(0 0 1px ${accent})` }}>
                <animateMotion dur={`${3 + i * 0.3}s`} repeatCount="indefinite"
                  path={`M ${origin.x} ${origin.y} Q ${mx} ${my} ${n.x} ${n.y}`}/>
              </circle>
            )}
          </g>
        );
      })}
      {nodes.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r={i === 0 ? 1.1 : 0.7}
            fill={i === 0 ? accent : n.threat > 0.7 ? accent : "#d0d0d0"}
            opacity={i === 0 ? 1 : 0.8}/>
          {i === 0 && animate && (
            <circle cx={n.x} cy={n.y} r="1.1" fill="none" stroke={accent} strokeWidth="0.15">
              <animate attributeName="r" from="1.1" to="4" dur="2s" repeatCount="indefinite"/>
              <animate attributeName="opacity" from="0.8" to="0" dur="2s" repeatCount="indefinite"/>
            </circle>
          )}
        </g>
      ))}
    </svg>
  );
}

// ============ Data ============
const PROFILE = {
  name: "Eduardo Martins Barbosa",
  role: "Pentester Jr. & IDS Developer",
  location: "Jundiaí, SP — Brasil",
  email: "eduardo.dev.barbosa@gmail.com",
  github: "github.com/EduardoMartins-Dev",
  linkedin: "linkedin.com/in/eduardo-martins3",
  quote: "The quieter you become, the more you are able to hear.",
};

const SKILLS = [
  { cat: "Offensive",          items: ["Metasploit Framework", "Reconnaissance & OSINT", "Vulnerability Exploitation", "Reverse Engineering", "Web Exploitation", "CTF Competitions"] },
  { cat: "Network & Infra",    items: ["TCP/IP · DNS · Firewalls", "Linux Hardening", "Windows Server", "Traffic Analysis", "IDS Development", "Promiscuous Capture"] },
  { cat: "Development",        items: ["C11 (low-level)", "Python", "Java · PHP · Bash", "SQL (PostgreSQL/Firebird)", "Docker · Azure DevOps", "Git / GitHub"] },
  { cat: "Security & Compliance", items: ["SIEM · Log Analysis", "Vulnerability Management", "NIST Framework", "Incident Response", "SOC Operations", "IAM"] },
];

const CERTS = [
  { issuer: "Hackers Hive", name: "Metasploit Framework Expert", date: "Dez 2025", hot: true },
  { issuer: "IBSEC", name: "Segurança em Linux", date: "Jan 2026" },
  { issuer: "IBSEC", name: "Analista SOC", date: "Dez 2025" },
  { issuer: "IBSEC", name: "Fundamentos em Cibersegurança", date: "Dez 2025" },
  { issuer: "IBSEC", name: "Fundamentos em Redes", date: "Jan 2025" },
  { issuer: "Cisco", name: "Junior Cybersecurity Analyst", date: "Jan 2026" },
  { issuer: "Cisco", name: "Networking Devices & Config", date: "Dez 2025" },
  { issuer: "Google", name: "Foundations of Cybersecurity", date: "Set 2025" },
  { issuer: "Google", name: "Play it Safe: Manage Risks", date: "Jan 2025" },
  { issuer: "Google", name: "Connect and Protect", date: "Jan 2025" },
  { issuer: "Google", name: "Tools of the Trade: Linux & SQL", date: "Jan 2025" },
];

const EXPERIENCE = [
  {
    role: "Estagiário em Suporte e Implantação",
    company: "Fagron Technologies",
    loc: "Jundiaí, SP",
    date: "Set 2025 — Atual",
    active: true,
    details: [
      "Gestão de Identidade e Acessos (IAM) — onboarding de clientes no ERP.",
      "Incident Response via Azure DevOps: triagem, RCA e documentação.",
      "Automação com Power Automate; manutenção de Firebird DBs.",
    ],
  },
  {
    role: "Aprendiz — Qualidade",
    company: "Plascar",
    loc: "Jundiaí, SP",
    date: "Dez 2024 — Ago 2025",
    details: [
      "Auditoria de qualidade e análise de conformidade.",
      "Dashboards em Excel para monitoramento de KPIs.",
    ],
  },
];

const PROJECT_NTA = {
  name: "Network Traffic Analyzer",
  sub: "IDS de alto desempenho — Arquitetura Agent/Server",
  desc: "Sistema de Detecção de Intrusão escrito em C11, inspirado no Zabbix Agent/Server. Captura em modo promíscuo, detecção de anomalias em tempo real, telemetria via RabbitMQ, visualização em Grafana + InfluxDB. Cross-platform Linux e Windows (Npcap).",
  tags: ["C11", "Python", "RabbitMQ", "InfluxDB", "Grafana", "Docker", "IDS", "libpcap"],
  repo: "github.com/EduardoMartins-Dev/Network-Traffic-Analyzer",
  roadmap: [
    { v: "v1.0",  name: "Foundation & Capture",        status: "done",    desc: "libpcap em modo promíscuo, filtros BPF, parsing Ethernet→IP→TCP/UDP via aritmética de ponteiros." },
    { v: "v2.0",  name: "Messaging & IDS Core",        status: "done",    desc: "RabbitMQ async via librabbitmq, cJSON, Port Scan + ICMP Flood detection, InfluxDB + Grafana." },
    { v: "v3.0",  name: "Agent/Server Architecture",   status: "done",    desc: "Config 100% via env vars, TLS/SSL AMQP, filas duráveis, cross-platform Linux + Windows (Npcap)." },
    { v: "v4.0",  name: "Advanced IDS Engine",         status: "done",    desc: "SYN Flood, Stealth Scans, DNS Tunneling, ARP Spoofing, Brute Force, DDoS + EWMA baseline + Kill Chain + 14 técnicas MITRE ATT&CK." },
    { v: "v4.1",  name: "PCAP Replay & Test Framework",status: "done",    desc: "Flags --replay/--expect, dataset CICIDS2017, CI/CD via GitHub Actions com badge de IDS Score." },
    { v: "v5.0",  name: "Multi-Threading & Performance",status: "done",   desc: "4 threads (captura/análise/publish/métricas), ring buffer lock-free SPSC via C11 stdatomic. 85k → 350k+ pps." },
    { v: "v5.1",  name: "Windows Validation",          status: "planned", desc: "Compilar v4+v5 com MinGW-w64, validar Npcap + multi-thread, pthreads-w32 ou _beginthreadex." },
    { v: "v6.0",  name: "Produção, IaC & Observability",status: "planned",desc: "Hetzner VPS via Terraform, Nginx + Let's Encrypt, subdomínios grafana/rabbitmq/docs, alertas Telegram." },
    { v: "v7.0",  name: "AI Narrator (LLM em C)",      status: "planned", desc: "libcurl + cJSON → Groq API. Roteamento Llama 8B/Qwen 32B/Llama 70B por score, prompt caching, batch API." },
    { v: "v8.0",  name: "Multi-Agent & Elastic Ingestion",status: "planned",desc: "nta-server em C, thread pool adaptativo, RabbitMQ cluster 3 nodes + quorum queues, mTLS por agente." },
    { v: "v9.0",  name: "Threat Intelligence",         status: "planned", desc: "MaxMind GeoIP2 offline, AbuseIPDB, WHOIS via socket TCP nativo, IoC matching com hashtable + TTL 24h." },
    { v: "v10.0", name: "High Performance",            status: "planned", desc: "AF_PACKET TPACKET_V3 zero-copy, PF_RING para NICs Intel, NUMA-aware pinning. 1Gbps+ sem packet loss." },
  ],
};

const PROJECTS_OTHER = [
  {
    name: "Quantum Circuit Simulator",
    sub: "Simulador quântico em Python",
    desc: "Simulador de circuitos quânticos em Python puro com vetor de estado em NumPy. Suporta Hadamard, Pauli-X/Y/Z, Phase, CNOT e medição com colapso. Demos: Bell, GHZ, superposição. Web app via Streamlit + CLI.",
    tags: ["Python", "NumPy", "Streamlit", "Quantum"],
    repo: "github.com/EduardoMartins-Dev/Quantum-Simulator",
    icon: "Q∗",
  },
  {
    name: "Ambiente Check",
    sub: "Validador PowerShell de ambiente — Fagron",
    desc: "Script PowerShell para coleta e validação de ambiente em deploys ERP. Roda via TLS in-memory ou pendrive offline. Audita SO, CPU, RAM, disco, .NET, Firebird, latência e link. Gera briefing pronto para ticket.",
    tags: ["PowerShell", "IAM", "Deploy", "Audit"],
    repo: "github.com/EduardoMartins-Dev/ambiente-check",
    icon: "PS",
  },
];

const CTF_GALLERY = [
  { img: "img/ctf/gdb.jpeg",    title: "GDB SESSION",    caption: "Breakpoints + register manipulation para dump dos valores esperados de check()" },
  { img: "img/ctf/solver.jpeg", title: "SOLVE.PY",       caption: "Brute-force do seed libc.rand() char a char via Python ctypes" },
  { img: "img/ctf/flag.jpeg",   title: "FLAG CAPTURED",  caption: "HTB{r4nd_1s_v3ry_pr3d1ct4bl3} — desafio rev_flagcasino" },
];

const CTF_STATS = {
  event: "NahamCon CTF 2025",
  dates: "Dez 17–18, 2025",
  team: "N00bye",
  rank: 204,
  teams: 855,
  players: 1677,
  points: 300,
  topPct: 24,
  cats: ["Web Exploitation", "Cryptography", "Reverse Engineering", "Forensics", "OSINT"],
};

// ============ Tweaks panel ============
function TweaksPanel({ tweaks, update, onClose }) {
  return (
    <div className="tweaks-panel">
      <style>{`
        .tweaks-panel {
          position: fixed; right: 20px; bottom: 20px; z-index: 9999;
          width: 290px;
          background: #0f1115; color: #dbe1ec;
          border: 1px solid #2a3140;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 11px;
          box-shadow: 0 16px 40px rgba(0,0,0,0.5);
        }
        .tw-head {
          display: flex; justify-content: space-between; align-items: center;
          padding: 10px 14px; border-bottom: 1px solid #2a3140;
          letter-spacing: 0.22em; font-size: 10px; color: #8d98b0;
        }
        .tw-head button {
          background: none; border: 0; color: #8d98b0;
          cursor: pointer; font-size: 16px; line-height: 1;
        }
        .tw-body { padding: 14px;}
        .tw-section { margin-bottom: 14px;}
        .tw-section:last-child { margin-bottom: 0;}
        .tw-label {
          display: block; letter-spacing: 0.18em; font-size: 9px;
          color: #6b7489; margin-bottom: 8px; text-transform: uppercase;
        }
        .tw-row { display: flex; gap: 6px; flex-wrap: wrap;}
        .tw-chip {
          flex: 1; min-width: 0;
          padding: 6px 8px;
          background: #141821; border: 1px solid #2a3140;
          color: #dbe1ec; font: inherit; cursor: pointer;
          letter-spacing: 0.1em; text-align: center;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .tw-chip:hover { border-color: var(--accent);}
        .tw-chip.active { background: var(--accent); color: #0a0b0d; border-color: var(--accent); font-weight: 700;}
        .tw-swatch-row { display: flex; gap: 8px;}
        .tw-swatch {
          flex: 1; aspect-ratio: 1.6;
          border: 2px solid transparent;
          cursor: pointer;
          position: relative;
        }
        .tw-swatch.active { border-color: #fff;}
        .tw-toggle {
          display: flex; justify-content: space-between; align-items: center;
          padding: 8px 0; cursor: pointer;
        }
        .tw-toggle input { accent-color: var(--accent);}
      `}</style>
      <div className="tw-head">
        <span>THEME · CONFIG</span>
        <button onClick={onClose} aria-label="Close">×</button>
      </div>
      <div className="tw-body">
        <div className="tw-section">
          <span className="tw-label">Accent</span>
          <div className="tw-swatch-row">
            {ACCENT_PALETTE.map(p => (
              <div key={p.value}
                className={`tw-swatch ${tweaks.accent === p.value ? 'active' : ''}`}
                style={{ background: p.value }}
                title={p.name}
                onClick={() => update({ accent: p.value })}/>
            ))}
          </div>
        </div>
        <div className="tw-section">
          <span className="tw-label">Density</span>
          <div className="tw-row">
            <button className={`tw-chip ${tweaks.density === 'comfortable' ? 'active' : ''}`}
              onClick={() => update({ density: 'comfortable' })}>COMFORTABLE</button>
            <button className={`tw-chip ${tweaks.density === 'dense' ? 'active' : ''}`}
              onClick={() => update({ density: 'dense' })}>DENSE</button>
          </div>
        </div>
        <div className="tw-section">
          <span className="tw-label">Animations</span>
          <label className="tw-toggle">
            <span style={{ color: tweaks.animations ? "#dbe1ec" : "#6b7489" }}>
              {tweaks.animations ? "ON · Live telemetry" : "OFF · Static"}
            </span>
            <input type="checkbox" checked={tweaks.animations}
              onChange={e => update({ animations: e.target.checked })}/>
          </label>
        </div>
      </div>
    </div>
  );
}

// ============ Main page ============
function SOCHome({ accent = "#ff3b30", density = "comfortable", animations = true }) {
  const [clock, setClock] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const rows = usePacketStream(12, 700, animations);
  const typedCmd = useTyped("nmap -sV --script=vuln target.local", 38, 400, animations);

  const kpis = [
    { l: "PKT/S", v: "85,412", d: "▲ 12.4%", ok: true },
    { l: "DROPPED", v: "0.02%", d: "nominal", ok: true },
    { l: "ALERTS / 24H", v: "37", d: "3 critical", ok: false },
    { l: "NODES", v: "10", d: "global", ok: true },
    { l: "UPTIME", v: "99.97%", d: "v5.0-stable", ok: true },
  ];
  const hist = useMemo(() => Array.from({ length: 24 }, (_, i) => {
    const base = 0.3 + 0.5 * Math.sin(i * 0.6) + 0.2 * Math.sin(i * 0.3 + 1);
    return Math.max(0.1, Math.min(1, base + Math.random() * 0.2));
  }), []);

  // density tokens
  const dPad      = density === "dense" ? 12 : 16;
  const dGap      = density === "dense" ? 8  : 12;
  const dHeroH    = density === "dense" ? 26 : 30;

  return (
    <div className="soc-root" style={{ "--accent": accent, "--accent-soft": accent + "22", "--gap": dGap + "px", "--pad": dPad + "px" }}>
      <style>{`
        .soc-root {
          --bg: #0a0b0d;
          --panel: #101216;
          --panel-2: #141821;
          --line: #1e232d;
          --line-2: #2a3140;
          --text: #dbe1ec;
          --muted: #6b7489;
          --muted-2: #8d98b0;
          --green: #4ade80;
          --amber: #fbbf24;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          background: var(--bg);
          color: var(--text);
          min-height: 100vh;
          width: 100%;
          overflow-x: hidden;
          position: relative;
        }
        .soc-root::before {
          content: "";
          position: fixed; inset: 0;
          background:
            radial-gradient(ellipse at 20% 0%, color-mix(in oklch, var(--accent) 10%, transparent), transparent 55%),
            radial-gradient(ellipse at 100% 100%, rgba(100,120,255,0.04), transparent 55%);
          pointer-events: none; z-index: 0;
        }
        .soc-grid {
          position: fixed; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none; z-index: 0;
        }
        .soc-wrap {
          position: relative; z-index: 2;
          padding: var(--pad);
          display: grid;
          gap: var(--gap);
          max-width: 1640px;
          margin: 0 auto;
        }
        /* TOP BAR */
        .soc-topbar {
          display: grid;
          grid-template-columns: 260px 1fr auto;
          align-items: center;
          gap: 16px;
          background: var(--panel);
          border: 1px solid var(--line);
          padding: 10px 14px;
          font-size: 11px;
          letter-spacing: 0.12em;
          position: sticky; top: 12px; z-index: 10;
          backdrop-filter: blur(6px);
        }
        .soc-logo { font-weight: 700; letter-spacing: 0.2em; display: flex; align-items: center; gap: 10px;}
        .soc-logo .brkt { color: var(--accent);}
        .soc-logo .tag {
          font-size: 9px; background: var(--accent-soft); color: var(--accent);
          padding: 2px 6px; letter-spacing: 0.2em; border: 1px solid var(--accent);
        }
        .soc-nav { display: flex; justify-content: center; gap: 2px; flex-wrap: wrap;}
        .soc-nav a {
          color: var(--muted-2); text-decoration: none;
          padding: 6px 12px;
          border: 1px solid transparent;
          letter-spacing: 0.18em; font-size: 10px;
          transition: all .15s ease;
        }
        .soc-nav a:hover { color: var(--text); border-color: var(--line-2); background: var(--panel-2);}
        .soc-nav a.active { color: var(--accent); border-color: var(--accent);}
        .soc-meta { display: flex; gap: 16px; color: var(--muted-2); font-size: 10px; align-items: center;}
        .soc-meta b { color: var(--text); font-weight: 500;}
        .soc-live { display: inline-flex; align-items: center; gap: 6px; color: var(--accent);}
        .soc-live::before {
          content: ""; width: 6px; height: 6px; border-radius: 6px; background: var(--accent);
          animation: pulse-soc 1.4s infinite;
        }
        @keyframes pulse-soc { 0%,100% { opacity: 1;} 50% { opacity: 0.2;}}

        /* HERO */
        .soc-hero { display: grid; grid-template-columns: 1.5fr 1fr; gap: var(--gap);}
        .panel { background: var(--panel); border: 1px solid var(--line); position: relative; transition: border-color .2s ease;}
        .panel-head {
          display: flex; justify-content: space-between; align-items: center;
          padding: 8px 14px;
          border-bottom: 1px solid var(--line);
          font-size: 10px; letter-spacing: 0.2em; color: var(--muted-2);
          text-transform: uppercase;
          gap: 8px;
        }
        .panel-head .idx { color: var(--accent); margin-right: 10px; font-weight: 700;}

        .op-card { display: grid; grid-template-columns: 140px 1fr; gap: 20px; padding: 20px;}
        .op-avatar {
          aspect-ratio: 1; border: 1px solid var(--line-2); background: var(--panel-2);
          display: flex; align-items: center; justify-content: center;
          position: relative; overflow: hidden;
        }
        .op-avatar img { width: 100%; height: 100%; object-fit: cover; filter: grayscale(1) contrast(1.1) brightness(0.9);}
        .op-avatar::after {
          content: ""; position: absolute; inset: 0;
          background: linear-gradient(180deg, transparent 60%, var(--accent-soft));
          mix-blend-mode: overlay;
        }
        .op-corners::before, .op-corners::after,
        .op-corners > .c1, .op-corners > .c2 {
          content: ""; position: absolute; width: 10px; height: 10px;
          border: 1.5px solid var(--accent);
        }
        .op-corners::before { top: -1px; left: -1px; border-right: 0; border-bottom: 0;}
        .op-corners::after { top: -1px; right: -1px; border-left: 0; border-bottom: 0;}
        .op-corners > .c1 { bottom: -1px; left: -1px; border-right: 0; border-top: 0;}
        .op-corners > .c2 { bottom: -1px; right: -1px; border-left: 0; border-top: 0;}

        .op-body { font-size: 12px; color: var(--muted-2);}
        .op-id { font-size: 10px; letter-spacing: 0.25em; color: var(--accent); margin-bottom: 8px;}
        .op-name {
          font-family: 'Inter', sans-serif;
          font-size: ${dHeroH * 1.5}px; font-weight: 700; letter-spacing: -0.03em;
          color: var(--text); margin: 0 0 4px; line-height: 1;
        }
        .op-role { font-size: 12px; color: var(--muted-2); letter-spacing: 0.12em; margin-bottom: 18px;}
        .op-field {
          display: grid; grid-template-columns: 90px 1fr;
          font-size: 11px; padding: 5px 0;
          border-bottom: 1px dashed var(--line);
        }
        .op-field dt { color: var(--muted);}
        .op-field dd { margin: 0; color: var(--text);}
        .op-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 12px;}
        .op-tag {
          font-size: 9px; letter-spacing: 0.2em;
          padding: 3px 8px; border: 1px solid var(--line-2); color: var(--muted-2);
        }
        .op-tag.red { border-color: var(--accent); color: var(--accent);}

        /* Terminal */
        .term {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px; line-height: 1.8;
          color: #c8d1e4; padding: 14px 16px; background: #080a0e;
        }
        .term .prompt { color: var(--green);}
        .term .out { color: var(--muted-2); padding-left: 14px;}
        .term .r { color: var(--accent);}
        .term .g { color: var(--green);}
        .term .a { color: var(--amber);}
        .term .cursor {
          display: inline-block; width: 7px; height: 13px;
          background: var(--green); vertical-align: middle;
          animation: blink 1s step-start infinite;
        }
        @keyframes blink { 50% { opacity: 0; }}

        /* KPIs */
        .kpi-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: var(--gap);}
        .kpi {
          background: var(--panel); border: 1px solid var(--line);
          padding: 14px 16px; position: relative;
          transition: border-color .2s ease;
        }
        .kpi:hover { border-color: var(--accent);}
        .kpi-l { font-size: 10px; letter-spacing: 0.22em; color: var(--muted); margin-bottom: 6px;}
        .kpi-v {
          font-family: 'Inter', sans-serif;
          font-size: 30px; font-weight: 700; letter-spacing: -0.02em; color: var(--text);
          line-height: 1;
        }
        .kpi-d { font-size: 10px; margin-top: 6px; letter-spacing: 0.12em;}
        .kpi-d.ok { color: var(--green);}
        .kpi-d.bad { color: var(--accent);}
        .kpi-spark {
          position: absolute; bottom: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, var(--accent), transparent);
        }

        /* Main ops grid */
        .soc-main { display: grid; grid-template-columns: 2fr 1fr; gap: var(--gap);}
        .soc-map-panel { display: flex; flex-direction: column;}
        .soc-map-panel .map-wrap { background: #07090c; flex: 1;}

        /* Stream */
        .stream-row {
          display: grid;
          grid-template-columns: 70px 1.4fr 1.4fr 60px 60px 80px 90px 90px;
          gap: 6px;
          font-size: 10px;
          padding: 5px 14px;
          border-bottom: 1px dashed var(--line);
          font-family: 'JetBrains Mono', monospace;
          align-items: center;
        }
        .stream-row.head { color: var(--muted); letter-spacing: 0.15em; border-bottom: 1px solid var(--line-2);}
        .stream-row .verdict { font-weight: 700; letter-spacing: 0.1em;}
        .stream-row .mitre { color: var(--accent); font-size: 9px; letter-spacing: 0.08em;}
        .stream-row:hover { background: var(--panel-2);}
        .stream-wrap { max-height: 360px; overflow: hidden;}
        .stream-row.enter { animation: slideIn .3s ease;}
        @keyframes slideIn { from { opacity: 0; transform: translateY(-4px);} to { opacity: 1; transform: none;}}

        /* histogram */
        .hist { display: flex; align-items: end; gap: 3px; height: 60px; padding: 14px;}
        .hist .bar { flex: 1; background: var(--accent); opacity: 0.7; border-top: 1px solid var(--text);}

        /* Roadmap */
        .road { display: flex; flex-direction: column; max-height: 540px; overflow: auto;}
        .road-item {
          padding: 10px 14px;
          border-bottom: 1px solid var(--line);
          display: grid; grid-template-columns: 52px 1fr auto;
          gap: 10px; font-size: 11px; align-items: baseline;
          transition: background .15s ease;
        }
        .road-item:last-child { border-bottom: 0;}
        .road-item.active { background: var(--accent-soft); border-left: 2px solid var(--accent);}
        .road-item:hover { background: var(--panel-2);}
        .road-v { font-weight: 700; letter-spacing: 0.08em;}
        .road-s { font-size: 9px; letter-spacing: 0.2em;}
        .road-s.done { color: var(--green);}
        .road-s.active { color: var(--accent);}
        .road-s.planned { color: var(--muted); opacity: 0.7;}
        .road-name { color: var(--text);}

        /* NTA detail panel */
        .nta-detail { display: grid; grid-template-columns: 1.2fr 1fr; gap: var(--gap);}
        .nta-shot { border: 1px solid var(--line); background: #07090c; padding: 6px;}
        .nta-shot img { width: 100%; height: auto; display: block; filter: contrast(1.05);}
        .nta-shot .cap { font-size: 10px; color: var(--muted); padding: 8px 4px 4px; letter-spacing: 0.15em;}
        .nta-summary { padding: 20px;}
        .nta-summary h3 { font-family: 'Inter', sans-serif; font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 6px;}
        .nta-summary .sub { font-size: 11px; color: var(--accent); letter-spacing: 0.18em; margin-bottom: 14px;}
        .nta-summary p { font-size: 12px; color: var(--muted-2); line-height: 1.7; margin: 0 0 14px;}
        .tag-row { display: flex; flex-wrap: wrap; gap: 5px;}
        .tag {
          font-size: 9px; letter-spacing: 0.18em; padding: 3px 8px;
          border: 1px solid var(--line-2); color: var(--muted-2);
        }

        /* Other projects */
        .proj-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--gap);}
        .proj-card { padding: 22px; transition: border-color .2s ease, transform .2s ease;}
        .proj-card:hover { border-color: var(--accent); transform: translateY(-2px);}
        .proj-icon {
          width: 48px; height: 48px; border: 1px solid var(--accent);
          color: var(--accent); display: flex; align-items: center; justify-content: center;
          font-family: 'JetBrains Mono', monospace; font-size: 16px; font-weight: 700;
          letter-spacing: 0.05em; margin-bottom: 16px;
        }
        .proj-card h4 { font-family: 'Inter', sans-serif; font-size: 22px; font-weight: 700; letter-spacing: -0.015em; margin: 0 0 4px;}
        .proj-card .sub { font-size: 11px; color: var(--accent); letter-spacing: 0.15em; margin-bottom: 12px;}
        .proj-card p { font-size: 12px; color: var(--muted-2); line-height: 1.6; margin: 0 0 14px;}
        .proj-repo {
          display: flex; align-items: center; gap: 6px;
          font-size: 10px; color: var(--muted); letter-spacing: 0.1em;
          margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--line);
        }
        .proj-repo a { color: var(--text); text-decoration: none;}
        .proj-repo a:hover { color: var(--accent);}

        /* Skills */
        .soc-skills { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--gap);}
        .skill-panel { padding: 16px;}
        .skill-panel h4 {
          margin: 0 0 12px; font-size: 11px; letter-spacing: 0.22em;
          color: var(--accent); font-family: 'JetBrains Mono', monospace;
        }
        .skill-panel ul { margin: 0; padding: 0; list-style: none;}
        .skill-panel li {
          font-size: 12px; padding: 6px 0;
          border-bottom: 1px dashed var(--line);
          color: var(--text); display: flex; justify-content: space-between;
        }
        .skill-panel li:last-child { border-bottom: 0;}
        .skill-panel li::before { content: "▸"; color: var(--accent); margin-right: 8px;}

        /* Experience */
        .exp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--gap);}
        .exp-card { padding: 20px;}
        .exp-card h3 { font-family: 'Inter', sans-serif; font-size: 22px; font-weight: 700; letter-spacing: -0.015em; margin: 0 0 4px; color: var(--text);}
        .exp-sub { font-size: 11px; color: var(--muted-2); letter-spacing: 0.1em; margin-bottom: 10px;}
        .exp-sub .dot { color: var(--accent); margin: 0 6px;}
        .exp-card ul { margin: 10px 0 0; padding: 0; list-style: none;}
        .exp-card li { font-size: 12px; padding: 5px 0 5px 14px; position: relative; line-height: 1.5;}
        .exp-card li::before { content: "■"; position: absolute; left: 0; color: var(--accent); font-size: 8px; top: 8px;}

        /* CTF gallery */
        .ctf-gallery {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--gap);
          padding: 16px;
        }
        .ctf-shot {
          border: 1px solid var(--line-2);
          background: #07090c;
          overflow: hidden;
          transition: transform .25s ease, border-color .2s ease;
        }
        .ctf-shot:hover { transform: translateY(-2px); border-color: var(--accent);}
        .ctf-shot .label {
          padding: 8px 12px; border-bottom: 1px solid var(--line);
          display: flex; justify-content: space-between;
          font-size: 9px; letter-spacing: 0.22em; color: var(--accent);
        }
        .ctf-shot img {
          width: 100%; height: 220px; object-fit: cover; display: block;
          filter: contrast(1.1) brightness(0.95);
        }
        .ctf-shot .cap {
          padding: 10px 12px; font-size: 10px;
          color: var(--muted-2); line-height: 1.5;
        }

        /* Bottom row */
        .soc-row { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: var(--gap);}
        .cert-list { max-height: 360px; overflow: auto;}
        .cert-row {
          display: grid; grid-template-columns: 70px 1fr auto; gap: 10px;
          padding: 8px 14px; font-size: 11px;
          border-bottom: 1px solid var(--line); align-items: center;
        }
        .cert-row:hover { background: var(--panel-2);}
        .cert-row.hot { background: var(--accent-soft);}
        .cert-row.hot .cert-n { color: var(--accent); font-weight: 700;}
        .cert-i { font-size: 9px; letter-spacing: 0.2em; color: var(--muted);}
        .cert-n { color: var(--text); font-size: 11px;}
        .cert-d { font-size: 9px; color: var(--muted); letter-spacing: 0.15em;}

        .ctf-hero { padding: 20px;}
        .ctf-rank { font-family: 'Inter', sans-serif; font-size: 56px; font-weight: 700; letter-spacing: -0.03em; color: var(--accent); line-height: 1;}
        .ctf-rank small { font-size: 16px; color: var(--muted); font-weight: 400; letter-spacing: 0;}
        .ctf-label { font-size: 11px; color: var(--muted-2); letter-spacing: 0.12em; margin-top: 8px;}
        .ctf-bar { height: 4px; background: var(--panel-2); margin-top: 12px; overflow: hidden;}
        .ctf-bar > div { height: 100%; background: linear-gradient(90deg, var(--accent), transparent); width: 24%;}
        .ctf-stats-row { display: flex; gap: 16px; margin-top: 12px; font-size: 10px; letter-spacing: 0.15em; color: var(--muted-2);}
        .ctf-stats-row b { color: var(--text); font-weight: 600; display: block; font-size: 16px; font-family: 'Inter', sans-serif;}

        .contact-card { padding: 20px;}
        .contact-card h3 { font-family: 'Inter', sans-serif; font-size: 22px; font-weight: 700; letter-spacing: -0.015em; margin: 0 0 10px; color: var(--text);}
        .contact-card p { font-size: 11px; color: var(--muted-2); line-height: 1.6; margin: 0 0 16px;}
        .contact-links a {
          display: flex; justify-content: space-between; align-items: center;
          padding: 9px 0; border-bottom: 1px solid var(--line);
          color: var(--text); text-decoration: none; font-size: 11px; letter-spacing: 0.1em;
          transition: color .15s ease;
        }
        .contact-links a:hover { color: var(--accent);}
        .contact-links a::after { content: "→"; color: var(--muted);}
        .contact-links a:hover::after { color: var(--accent);}

        .soc-footer {
          display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px;
          padding: 10px 14px;
          background: var(--panel);
          border: 1px solid var(--line);
          font-size: 9px; letter-spacing: 0.25em; color: var(--muted);
        }

        /* RESPONSIVE */
        @media (max-width: 1100px) {
          .soc-topbar { grid-template-columns: 1fr; gap: 8px;}
          .soc-nav { justify-content: flex-start;}
          .soc-meta { justify-content: flex-start; flex-wrap: wrap;}
          .soc-hero { grid-template-columns: 1fr;}
          .kpi-row { grid-template-columns: repeat(3, 1fr);}
          .soc-main { grid-template-columns: 1fr;}
          .nta-detail { grid-template-columns: 1fr;}
          .soc-skills { grid-template-columns: repeat(2, 1fr);}
          .exp-grid { grid-template-columns: 1fr;}
          .proj-grid { grid-template-columns: 1fr;}
          .soc-row { grid-template-columns: 1fr;}
          .ctf-gallery { grid-template-columns: 1fr;}
          .stream-row {
            grid-template-columns: 60px 1fr 60px 70px 80px;
          }
          .stream-row .h-dst, .stream-row .dst,
          .stream-row .h-bytes, .stream-row .bytes { display: none;}
        }
        @media (max-width: 640px) {
          .op-card { grid-template-columns: 1fr; gap: 14px;}
          .op-avatar { width: 100px; aspect-ratio: 1;}
          .op-name { font-size: 36px;}
          .kpi-row { grid-template-columns: repeat(2, 1fr);}
          .soc-skills { grid-template-columns: 1fr;}
          .ctf-rank { font-size: 44px;}
        }
      `}</style>
      <div className="soc-grid"/>
      <div className="soc-wrap">
        <div className="soc-topbar">
          <div className="soc-logo">
            <span className="brkt">[</span>EMB<span className="brkt">]</span>
            <span style={{ color: "var(--muted-2)"}}>/ SOC-CONSOLE</span>
            <span className="tag">v5.0</span>
          </div>
          <nav className="soc-nav">
            <a href="#overview" className="active">OVERVIEW</a>
            <a href="#ops">NTA / OPS</a>
            <a href="#projects">PROJECTS</a>
            <a href="#skills">SKILLS</a>
            <a href="#certs">CERTS</a>
            <a href="#exp">EXPERIENCE</a>
            <a href="#ctf">CTF</a>
            <a href="#contact">COMMS</a>
          </nav>
          <div className="soc-meta">
            <span><b>{clock.toISOString().slice(11,19)}</b> UTC</span>
            <span>2026.04.24</span>
            <span className="soc-live">LIVE</span>
          </div>
        </div>

        {/* HERO */}
        <div className="soc-hero" id="overview">
          <div className="panel op-corners">
            <span className="c1"/><span className="c2"/>
            <div className="panel-head"><span><span className="idx">§01</span>OPERATOR IDENTITY</span><span>EMB-1677</span></div>
            <div className="op-card">
              <div className="op-avatar op-corners">
                <span className="c1"/><span className="c2"/>
                <img src="img/profile.jpeg" alt="EMB" onError={(e)=>{e.target.style.display='none';}}/>
              </div>
              <div className="op-body">
                <div className="op-id">// OPERATOR · TIER-3 · ACTIVE</div>
                <Reveal animations={animations}>
                  <h1 className="op-name">Eduardo Martins<br/>Barbosa.</h1>
                </Reveal>
                <div className="op-role">PENTESTER JR · IDS DEVELOPER · CTF OPERATIVE</div>
                <dl style={{ margin: 0 }}>
                  <div className="op-field"><dt>LOC</dt><dd>{PROFILE.location}</dd></div>
                  <div className="op-field"><dt>ALIGN</dt><dd>Red Team / Offensive Security</dd></div>
                  <div className="op-field"><dt>EMPL</dt><dd>Fagron Technologies — IAM / DFIR</dd></div>
                  <div className="op-field"><dt>PROJ</dt><dd>Network Traffic Analyzer (IDS in C11)</dd></div>
                </dl>
                <div className="op-tags">
                  <span className="op-tag red">METASPLOIT EXPERT</span>
                  <span className="op-tag">LINUX HARDENING</span>
                  <span className="op-tag">REVERSE ENG</span>
                  <span className="op-tag">IAM / SOC</span>
                  <span className="op-tag red">NAHAMCON TOP 24%</span>
                </div>
              </div>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><span><span className="idx">§02</span>TERMINAL · root@kali</span><span>PID 4077</span></div>
            <div className="term">
              <div><span className="prompt">root@kali</span>:<span style={{color:'#6ca0ff'}}>~/ops</span># <span>whoami</span></div>
              <div className="out">eduardo.martins · red-team · operational</div>
              <div><span className="prompt">root@kali</span>:<span style={{color:'#6ca0ff'}}>~/ops</span># <span>cat role.txt</span></div>
              <div className="out">{'>'} Pentester Jr · IDS Developer · Exploit Dev</div>
              <div><span className="prompt">root@kali</span>:<span style={{color:'#6ca0ff'}}>~/ops</span># <span>{typedCmd}</span></div>
              <div className="out">Starting Nmap 7.94SVN at 2026-04-24 14:22 -03</div>
              <div className="out"><span className="g">OPEN</span>  22/tcp   ssh       OpenSSH 9.2</div>
              <div className="out"><span className="g">OPEN</span>  80/tcp   http      nginx 1.24</div>
              <div className="out"><span className="g">OPEN</span>  443/tcp  https     nginx 1.24 (TLS 1.3)</div>
              <div className="out"><span className="a">FILT</span>  3389/tcp rdp       <span className="a">[firewall]</span></div>
              <div className="out"><span className="r">CVE-2024-4577</span> php-cgi RCE · <span className="r">CRITICAL</span></div>
              <div className="out"><span className="r">CVE-2023-38408</span> openssh agent · <span className="a">MEDIUM</span></div>
              <div><span className="prompt">root@kali</span>:<span style={{color:'#6ca0ff'}}>~/ops</span># <span className="cursor"/></div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="kpi-row">
          {kpis.map((k, i) => (
            <div key={i} className="kpi">
              <div className="kpi-l">{k.l}</div>
              <div className="kpi-v">{k.v}</div>
              <div className={`kpi-d ${k.ok ? 'ok' : 'bad'}`}>{k.d}</div>
              {!k.ok && <div className="kpi-spark"/>}
            </div>
          ))}
        </div>

        {/* NTA detail */}
        <div className="nta-detail" id="ops">
          <div className="panel">
            <div className="panel-head">
              <span><span className="idx">§03</span>NETWORK TRAFFIC ANALYZER · DASHBOARD</span>
              <span style={{ color: "var(--accent)"}}>v5.0 · STABLE</span>
            </div>
            <div style={{ padding: 16 }}>
              <div className="nta-shot">
                <img src="img/grafana-dashboard.jpeg" alt="Grafana dashboard"/>
                <div className="cap">// GRAFANA · PROD — GEOIP · BLACKLIST · THROUGHPUT · TRAFFIC CLASSIFICATION</div>
              </div>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><span><span className="idx">§03b</span>PROJECT BRIEF</span><span>C11 · IDS</span></div>
            <div className="nta-summary">
              <h3>{PROJECT_NTA.name}</h3>
              <div className="sub">{PROJECT_NTA.sub}</div>
              <p>{PROJECT_NTA.desc}</p>
              <div className="tag-row">
                {PROJECT_NTA.tags.map((t, i) => <span key={i} className="tag">{t}</span>)}
              </div>
              <div className="proj-repo">
                <span style={{ color: "var(--accent)"}}>›</span>
                <a href={`https://${PROJECT_NTA.repo}`} target="_blank" rel="noopener noreferrer">{PROJECT_NTA.repo}</a>
              </div>
            </div>
          </div>
        </div>

        {/* MAP + ROADMAP */}
        <div className="soc-main">
          <div className="panel soc-map-panel">
            <div className="panel-head">
              <span><span className="idx">§04</span>NTA TELEMETRY · GEOIP SURVEILLANCE</span>
              <span style={{ color: "var(--accent)"}}>● 3 ACTIVE THREATS</span>
            </div>
            <div className="map-wrap">
              <GeoMap animate={animations} accent={accent} height={300}/>
            </div>
            <div className="hist">
              {hist.map((h, i) => <div key={i} className="bar" style={{ height: `${h * 100}%`, opacity: 0.3 + h * 0.6 }}/>)}
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><span><span className="idx">§05</span>ROADMAP / NTA</span><span>v1 → v10</span></div>
            <div className="road">
              {PROJECT_NTA.roadmap.map((r, i) => (
                <div key={i} className={`road-item ${r.status}`} title={r.desc}>
                  <span className="road-v">{r.v}</span>
                  <span className="road-name">{r.name}</span>
                  <span className={`road-s ${r.status}`}>
                    {r.status === 'done' ? '✓ DONE' : r.status === 'active' ? '● DEV' : '○ PLAN'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PACKET STREAM */}
        <div className="panel">
          <div className="panel-head">
            <span><span className="idx">§06</span>PACKET STREAM · REAL-TIME</span>
            <span style={{ color: animations ? "var(--green)" : "var(--muted)"}}>
              {animations ? "CAPTURE ACTIVE" : "PAUSED"}
            </span>
          </div>
          <div className="stream-wrap">
            <div className="stream-row head">
              <span>TIME</span>
              <span>SRC</span>
              <span className="h-dst">DST</span>
              <span>PROTO</span>
              <span>PORT</span>
              <span>FLAGS</span>
              <span className="h-bytes">BYTES</span>
              <span>VERDICT</span>
            </div>
            {rows.map((r) => (
              <div key={r.id} className="stream-row enter">
                <span style={{ color: "var(--muted)"}}>{r.time}</span>
                <span>{r.src}</span>
                <span className="dst">{r.dst}</span>
                <span style={{ color: "var(--muted-2)"}}>{r.proto}</span>
                <span>{r.port}</span>
                <span style={{ color: r.mitre ? "var(--accent)" : "var(--muted-2)" }}>{r.flags}</span>
                <span className="bytes" style={{ color: "var(--muted-2)"}}>{r.bytes}</span>
                <span>
                  <span className="verdict" style={{ color: r.verdict.color }}>{r.verdict.label}</span>
                  {r.mitre && <div className="mitre">{r.mitre}</div>}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* OTHER PROJECTS */}
        <div id="projects">
          <div className="panel" style={{ borderBottom: 0, marginBottom: -1}}>
            <div className="panel-head"><span><span className="idx">§07</span>SUPPORTING PROJECTS</span><span>2 REPOS</span></div>
          </div>
          <div className="proj-grid">
            {PROJECTS_OTHER.map((p, i) => (
              <div key={i} className="panel proj-card">
                <div className="proj-icon">{p.icon}</div>
                <h4>{p.name}</h4>
                <div className="sub">{p.sub}</div>
                <p>{p.desc}</p>
                <div className="tag-row">
                  {p.tags.map((t, j) => <span key={j} className="tag">{t}</span>)}
                </div>
                <div className="proj-repo">
                  <span style={{ color: "var(--accent)"}}>›</span>
                  <a href={`https://${p.repo}`} target="_blank" rel="noopener noreferrer">{p.repo}</a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SKILLS */}
        <div className="soc-skills" id="skills">
          {SKILLS.map((s, i) => (
            <div key={i} className="panel skill-panel">
              <div className="panel-head" style={{ margin: "-16px -16px 12px"}}>
                <span><span className="idx">§0{8+i}</span>{s.cat.toUpperCase()}</span>
                <span style={{ color: "var(--muted)"}}>{s.items.length} ITEMS</span>
              </div>
              <ul>{s.items.map((it, j) => <li key={j}>{it}</li>)}</ul>
            </div>
          ))}
        </div>

        {/* EXPERIENCE */}
        <div className="exp-grid" id="exp">
          {EXPERIENCE.map((e, i) => (
            <div key={i} className="panel exp-card">
              <div className="panel-head" style={{ margin: "-20px -20px 16px"}}>
                <span><span className="idx">§1{2+i}</span>FIELD · {e.active ? "CURRENT" : "PREVIOUS"}</span>
                <span style={{ color: e.active ? "var(--accent)" : "var(--muted)"}}>{e.date.toUpperCase()}</span>
              </div>
              <h3>{e.role}</h3>
              <div className="exp-sub">{e.company.toUpperCase()}<span className="dot">·</span>{e.loc.toUpperCase()}</div>
              <ul>{e.details.map((d, j) => <li key={j}>{d}</li>)}</ul>
            </div>
          ))}
        </div>

        {/* CTF GALLERY */}
        <div className="panel" id="ctf">
          <div className="panel-head">
            <span><span className="idx">§14</span>CTF WRITE-UP · rev_flagcasino · NAHAMCON 2025</span>
            <span style={{ color: "var(--accent)"}}>REVERSE ENGINEERING</span>
          </div>
          <div className="ctf-gallery">
            {CTF_GALLERY.map((s, i) => (
              <a key={i} href={s.img} target="_blank" rel="noopener noreferrer" className="ctf-shot" style={{ textDecoration: "none", display: "block"}}>
                <div className="label">
                  <span>{s.title}</span>
                  <span style={{ color: "var(--muted)"}}>0{i+1}</span>
                </div>
                <img src={s.img} alt={s.title}/>
                <div className="cap">{s.caption}</div>
              </a>
            ))}
          </div>
        </div>

        {/* CERTS + CTF + CONTACT */}
        <div className="soc-row">
          <div className="panel" id="certs">
            <div className="panel-head"><span><span className="idx">§15</span>CREDENTIALS / {CERTS.length}</span><span>SORTED</span></div>
            <div className="cert-list">
              {CERTS.map((c, i) => (
                <div key={i} className={`cert-row ${c.hot ? 'hot' : ''}`}>
                  <span className="cert-i">{c.issuer.toUpperCase()}</span>
                  <span className="cert-n">{c.name}</span>
                  <span className="cert-d">{c.date}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><span><span className="idx">§16</span>CTF RECORD</span><span style={{ color: "var(--accent)"}}>TOP {CTF_STATS.topPct}%</span></div>
            <div className="ctf-hero">
              <div className="ctf-rank">#{CTF_STATS.rank}<small> / {CTF_STATS.teams}</small></div>
              <div className="ctf-label">{CTF_STATS.event} · {CTF_STATS.dates.toUpperCase()} · TEAM {CTF_STATS.team}</div>
              <div className="ctf-bar"><div/></div>
              <div className="ctf-stats-row">
                <span><b>{CTF_STATS.points}</b>POINTS</span>
                <span><b>{CTF_STATS.players}</b>PLAYERS</span>
                <span><b>5</b>CATEGORIES</span>
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 14 }}>
                {CTF_STATS.cats.map((c, i) => (
                  <span key={i} className="tag">{c.toUpperCase()}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="panel" id="contact">
            <div className="panel-head"><span><span className="idx">§17</span>SECURE COMMS</span><span className="soc-live">OPEN</span></div>
            <div className="contact-card">
              <h3>Open a channel.</h3>
              <p>Red Team, IDS collab, ofensiva ou pesquisa em segurança. Jundiaí, SP — remoto.</p>
              <div className="contact-links">
                <a href={`mailto:${PROFILE.email}`}>{PROFILE.email}</a>
                <a href={`https://${PROFILE.linkedin}`} target="_blank" rel="noopener noreferrer">{PROFILE.linkedin}</a>
                <a href={`https://${PROFILE.github}`} target="_blank" rel="noopener noreferrer">{PROFILE.github}</a>
              </div>
            </div>
          </div>
        </div>

        <div className="soc-footer">
          <span>SYSTEM © 2026 EMB · NODE BR-SAO-01</span>
          <span>BUILD {clock.toISOString().slice(0,10).replace(/-/g,'.')} · v5.0-stable</span>
          <span>"{PROFILE.quote.toUpperCase()}"</span>
        </div>
      </div>
    </div>
  );
}

// ============ App + Theme switcher (public + editor) ============
const LS_KEY = "emb-soc-theme";

function loadTheme() {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || "null");
    if (saved && typeof saved === "object") return { ...TWEAK_DEFAULTS, ...saved };
  } catch (e) {}
  return TWEAK_DEFAULTS;
}

function App() {
  const [tweaks, setTweaks] = useState(loadTheme);
  const [open, setOpen] = useState(false);
  const [inEditor, setInEditor] = useState(false);

  // Editor protocol — keeps in-editor sync working too
  useEffect(() => {
    const onMsg = (e) => {
      const d = e.data;
      if (!d || typeof d !== "object") return;
      if (d.type === "__activate_edit_mode") { setOpen(true); setInEditor(true); }
      if (d.type === "__deactivate_edit_mode") { setOpen(false); setInEditor(false); }
    };
    window.addEventListener("message", onMsg);
    if (window.parent !== window) {
      window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    }
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const update = (patch) => {
    setTweaks(t => {
      const next = { ...t, ...patch };
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch (e) {}
      return next;
    });
    if (window.parent !== window) {
      window.parent.postMessage({ type: "__edit_mode_set_keys", edits: patch }, "*");
    }
  };

  return (
    <>
      <SOCHome
        accent={tweaks.accent}
        density={tweaks.density}
        animations={tweaks.animations !== false}
      />

      {/* Floating theme button — always visible on public site */}
      {!open && (
        <button
          aria-label="Theme"
          onClick={() => setOpen(true)}
          style={{
            position: "fixed", right: 20, bottom: 20, zIndex: 9998,
            width: 44, height: 44,
            background: "#0f1115", color: tweaks.accent,
            border: `1px solid ${tweaks.accent}`,
            cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
            fontSize: 18, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            transition: "transform .15s ease",
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.08)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}>
          ◐
        </button>
      )}

      {open && (
        <TweaksPanel
          tweaks={tweaks}
          update={update}
          onClose={() => {
            setOpen(false);
            if (inEditor) {
              window.parent.postMessage({ type: "__edit_mode_dismissed"}, "*");
            }
          }}
        />
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
