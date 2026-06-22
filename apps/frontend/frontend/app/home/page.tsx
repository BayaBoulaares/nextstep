"use client";

import { useState, useEffect, useRef } from "react";
import {
  Server, Database, Globe, Shield, HardDrive, Network,
  Lock, CheckCircle2, Users, Activity, Cloud, Cpu, Box,
  ArrowRight, ChevronRight, Zap, BarChart3, Phone, Mail,
  MapPin, Menu, X, Star, Quote, ExternalLink, Wifi,
  MonitorCheck, Headphones, Award, Wrench, Building2,
  TrendingUp, RefreshCw, Eye, Settings2, GitBranch,
  HeartHandshake, ShieldCheck, Layers, BookOpen, ChevronDown,
  MessageSquare, FileText, PlayCircle, LifeBuoy, Rocket, Key,
  Search, Package, HelpCircle, ChevronUp,
} from "lucide-react";

// ─── FONT INJECTION ────────────────────────────────────────────────────────────
function useFonts() {
  useEffect(() => {
    if (document.getElementById("ns-fonts")) return;
    const link = document.createElement("link");
    link.id = "ns-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600&display=swap";
    document.head.appendChild(link);

    const style = document.createElement("style");
    style.id = "ns-base-styles";
    style.textContent = `
      :root {
        --font-display: 'Plus Jakarta Sans', system-ui, sans-serif;
        --font-body:    'Inter', system-ui, sans-serif;
      }
      body { font-family: var(--font-body); -webkit-font-smoothing: antialiased; }
      h1, h2, h3, h4, .font-display { font-family: var(--font-display); }

      .btn {
        display: inline-flex; align-items: center; gap: 8px;
        font-family: var(--font-display);
        font-weight: 700; letter-spacing: -0.01em;
        border: none; cursor: pointer;
        transition: all 0.18s cubic-bezier(.4,0,.2,1);
        white-space: nowrap; text-decoration: none;
      }
      .btn:focus-visible { outline: 3px solid #0A7FCF; outline-offset: 3px; }

      .btn-primary {
        background: linear-gradient(160deg, #1A8FDF 0%, #0A7FCF 60%, #0069B4 100%);
        color: #fff;
        box-shadow: 0 4px 16px rgba(10,127,207,.32), 0 1px 4px rgba(0,0,0,.08);
        border-radius: 12px; padding: 11px 22px; font-size: 14px;
      }
      .btn-primary:hover {
        background: linear-gradient(160deg, #0A7FCF 0%, #0069B4 60%, #004F8A 100%);
        box-shadow: 0 6px 22px rgba(10,127,207,.45), 0 2px 6px rgba(0,0,0,.10);
        transform: translateY(-1.5px);
      }
      .btn-primary:active { transform: translateY(0); box-shadow: 0 2px 8px rgba(10,127,207,.3); }
      .btn-primary svg { transition: transform .18s ease; }
      .btn-primary:hover svg { transform: translateX(3px); }
      .btn-primary-lg { padding: 13px 28px; font-size: 15px; border-radius: 14px; }

      .btn-outline {
        background: transparent; color: #0D1B2A;
        border: 1.5px solid #CBD5E1; border-radius: 12px;
        padding: 10px 22px; font-size: 14px;
        box-shadow: 0 1px 3px rgba(0,0,0,.04);
      }
      .btn-outline:hover {
        border-color: #0A7FCF; color: #0A7FCF;
        background: #EFF6FF; transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(10,127,207,.12);
      }
      .btn-outline-lg { padding: 12px 26px; font-size: 15px; border-radius: 14px; }

      .btn-ghost {
        background: transparent; color: rgba(255,255,255,.82);
        border: 1.5px solid rgba(255,255,255,.25); border-radius: 12px;
        padding: 10px 22px; font-size: 14px;
      }
      .btn-ghost:hover { background: rgba(255,255,255,.12); color: #fff; border-color: rgba(255,255,255,.5); }

      .btn-white {
        background: #fff; color: #0A7FCF; border-radius: 12px;
        padding: 11px 26px; font-size: 15px;
        box-shadow: 0 6px 24px rgba(0,0,0,.18);
        border: 1.5px solid rgba(255,255,255,.8);
      }
      .btn-white:hover { background: #EFF6FF; transform: translateY(-1.5px); box-shadow: 0 10px 30px rgba(0,0,0,.22); }

      .btn-full { width: 100%; justify-content: center; padding: 14px 24px; font-size: 15px; border-radius: 13px; }

      .card-hover {
        transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
      }
      .card-hover:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 30px rgba(10,127,207,.08);
        border-color: rgba(10,127,207,.25) !important;
      }

      @keyframes floatA { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
      @keyframes floatB { 0%,100%{transform:translateY(-4px)} 50%{transform:translateY(4px)} }
      .float-a { animation: floatA 4.5s ease-in-out infinite; }
      .float-b { animation: floatB 5.5s ease-in-out infinite; }

      .eyebrow {
        display: flex; align-items: center; gap: 12px;
        font-size: 11px; font-weight: 800; letter-spacing: .2em;
        text-transform: uppercase; color: #0A7FCF;
        font-family: var(--font-display);
      }
      .eyebrow-line { height: 1px; width: 40px; background: #0A7FCF; }

      /* Guide accordion */
      .guide-tab { transition: all .22s cubic-bezier(.4,0,.2,1); }
      .guide-content { overflow: hidden; transition: max-height .35s cubic-bezier(.4,0,.2,1), opacity .25s ease; }
    `;
    document.head.appendChild(style);
  }, []);
}

// ─── DATA ──────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: "Accueil", href: "#hero" },
  { label: "Solutions", href: "#solutions", sub: ["Cloud", "Infrastructure", "Cybersécurité", "Supervision"] },
  { label: "Notre entreprise", href: "#about" },
  { label: "Partenaires", href: "#partners" },
  { label: "Guide client", href: "#guide" },
  { label: "Contact", href: "#contact" },
];

const KEY_FIGURES = [
  { value: "2012",   label: "Année de création",             icon: BookOpen },
  { value: "700+",   label: "Clients satisfaits",            icon: Users },
  { value: "50+",    label: "Certifications & technologies", icon: Award },
  { value: "10+",    label: "Partenaires stratégiques",      icon: HeartHandshake },
  { value: "100+",   label: "Ingénieurs certifiés",          icon: Wrench },
  { value: "1800+",  label: "Projets déployés",              icon: GitBranch },
];

const SOLUTIONS = [
  {
    icon: Cloud, title: "Cloud & Infrastructure",
    desc: "IaaS sur OpenShift 4 : VMs KubeVirt, bases PostgreSQL managées, stockage objet S3/MinIO. Provisionnement automatisé via Terraform et Fabric8 sans manipulation YAML.",
    tags: ["KubeVirt", "OpenShift", "Terraform"], color: "#0A7FCF", bg: "#EFF6FF",
    items: ["Housing & IaaS", "Virtual Data Center", "Haute disponibilité"],
  },
  {
    icon: Network, title: "Réseau & Interconnexion",
    desc: "Namespaces OpenShift isolés par tenant. NetworkPolicies, load-balancing, routes DNS personnalisées. Gestion QoS et supervision réseau intégrée avec les solutions Cisco.",
    tags: ["Cisco", "NetworkPolicy", "DNS"], color: "#0891B2", bg: "#ECFEFF",
    items: ["Réseaux locaux & VLANs", "Interconnexions sécurisées", "Supervision réseau"],
  },
  {
    icon: Shield, title: "Cybersécurité & IAM",
    desc: "SSO Keycloak, RBAC granulaire, MFA, audit logs complets. Solutions Fortinet et WALLIX pour le périmètre et la gestion des accès. Certifications ISO-9001 et ISO-27001.",
    tags: ["Fortinet", "WALLIX", "ISO-27001"], color: "#DC2626", bg: "#FEF2F2",
    items: ["SSO & identité", "Périmètre & VPN", "Audit & conformité"],
  },
  {
    icon: MonitorCheck, title: "Supervision & Monitoring",
    desc: "Métriques temps réel via Prometheus/Thanos. Tableaux de bord, alertes, KPIs de consommation. Service Desk intégré avec gestion de parc complète 24/7/365.",
    tags: ["Prometheus", "Thanos", "PromQL"], color: "#059669", bg: "#ECFDF5",
    items: ["Monitoring Prometheus", "Alertes & KPIs", "Service Desk 24/7"],
  },
  {
    icon: HardDrive, title: "Stockage & Sauvegarde",
    desc: "Stockage objet compatible S3 via MinIO. CloudNativePG pour PostgreSQL managé. Sauvegardes automatiques Veeam, restauration ponctuelle, PRA avec RTO/RPO garantis.",
    tags: ["Veeam", "Dell EMC", "S3"], color: "#D97706", bg: "#FFFBEB",
    items: ["Stockage objet S3", "BDD managées", "PRA & Backup Veeam"],
  },
  {
    icon: Layers, title: "Intégration & DevOps",
    desc: "Pipelines CI/CD, déploiement continu via Fabric8. Gestion multi-tenant avec isolation namespace. API REST Spring Boot pour orchestration programmatique.",
    tags: ["Fabric8", "Spring Boot", "CI/CD"], color: "#7C3AED", bg: "#F5F3FF",
    items: ["CI/CD pipelines", "API management", "Multi-tenant"],
  },
];

// ─── REAL PARTNERS from nextstep-it.com ──────────────────────────────────────
const PARTNERS = [
  { name: "Cisco",            abbr: "CI", color: "#049fd9", category: "Réseau" },
  { name: "Dell Technologies",abbr: "DL", color: "#007DB8", category: "Infrastructure" },
  { name: "VMware",           abbr: "VM", color: "#607078", category: "Virtualisation" },
  { name: "Veeam",            abbr: "VE", color: "#00B336", category: "Backup" },
  { name: "Fortinet",         abbr: "FT", color: "#EE3124", category: "Sécurité" },
  { name: "WALLIX",           abbr: "WX", color: "#003087", category: "IAM" },
  { name: "Huawei Cloud",     abbr: "HW", color: "#CF0A2C", category: "Cloud" },
  { name: "Inetum",           abbr: "IN", color: "#6B21A8", category: "Digital" },
  { name: "Tunisie Telecom",  abbr: "TT", color: "#009B77", category: "Opérateur" },
  { name: "Microsoft",        abbr: "MS", color: "#00A4EF", category: "Cloud" },
];

const TEAM_VALUES = [
  { icon: Eye,          title: "Vision claire",      desc: "Concevoir, déployer et maintenir des solutions cloud adaptées à vos besoins métier depuis 2012." },
  { icon: HeartHandshake, title: "Engagement client", desc: "Plus de 700 clients satisfaits dans les secteurs bancaire, santé, télécom et administrations publiques." },
  { icon: ShieldCheck,  title: "Qualité certifiée",  desc: "ISO-9001 et ISO-27001. 50+ certifications dans les domaines cloud, réseau et sécurité." },
  { icon: Zap,          title: "Réactivité 24/7",     desc: "Nos ingénieurs et techniciens certifiés interviennent en conception, intégration et maintenance à toute heure." },
];

// ─── CLIENT GUIDE DATA ────────────────────────────────────────────────────────
const GUIDE_CATEGORIES = [
  {
    id: "decouverte",
    icon: Search,
    label: "Découverte",
    color: "#0A7FCF",
    bg: "#EFF6FF",
    title: "Explorer nos solutions",
    subtitle: "Comprendre ce que NextStep peut faire pour vous",
    steps: [
      {
        q: "Comment identifier la solution adaptée à mon besoin ?",
        a: "Parcourez notre catalogue de 6 domaines (Cloud, Réseau, Cybersécurité, Supervision, Stockage, DevOps). Chaque fiche détaille les technologies employées et les cas d'usage typiques. Notre équipe commerciale organise également des sessions de découverte gratuites de 30 minutes pour affiner votre besoin.",
        icon: Package,
      },
      {
        q: "Puis-je obtenir une démonstration avant de m'engager ?",
        a: "Oui, systématiquement. Nos ingénieurs avant-vente préparent une démonstration personnalisée sur votre environnement cible. Elle inclut une présentation de l'interface client, un déploiement en direct d'une VM ou d'une base de données, et une simulation de monitoring.",
        icon: PlayCircle,
      },
      {
        q: "NextStep intervient-il dans mon secteur d'activité ?",
        a: "NextStep accompagne des clients dans la banque, la santé, le pétrole, les télécoms et les administrations publiques. Nos architectures sont conformes aux exigences réglementaires tunisiennes et supportent les contraintes de souveraineté des données.",
        icon: Building2,
      },
    ],
  },
  {
    id: "demarrage",
    icon: Rocket,
    label: "Démarrage",
    color: "#059669",
    bg: "#ECFDF5",
    title: "Lancer votre projet",
    subtitle: "De la signature au premier déploiement",
    steps: [
      {
        q: "Quel est le processus d'onboarding ?",
        a: "Après signature du contrat, un ingénieur projet est assigné sous 48h. Il conduit un atelier technique (2–4h) pour cartographier votre infrastructure existante, définir les namespaces, les politiques réseau et les droits RBAC. Votre environnement est opérationnel en 5 jours ouvrés.",
        icon: Key,
      },
      {
        q: "Comment accéder à mon espace cloud ?",
        a: "L'accès se fait via notre portail web sécurisé par authentification SSO Keycloak avec MFA obligatoire. Vous recevez par email sécurisé vos identifiants initiaux et un guide de première connexion. L'interface est disponible depuis n'importe quel navigateur moderne, sans VPN requis.",
        icon: Lock,
      },
      {
        q: "Peut-on migrer notre infrastructure existante ?",
        a: "Oui. Notre équipe Migration propose un plan en 3 phases : audit de l'existant, plan de migration avec RTO/RPO définis, et bascule progressive avec rollback garanti. Les migrations VMware vers notre IaaS sont réalisées avec zéro interruption via Veeam Replication.",
        icon: RefreshCw,
      },
    ],
  },
  {
    id: "gestion",
    icon: Settings2,
    label: "Gestion quotidienne",
    color: "#7C3AED",
    bg: "#F5F3FF",
    title: "Gérer vos ressources",
    subtitle: "Opérations, supervision et optimisation au quotidien",
    steps: [
      {
        q: "Comment surveiller mes ressources en temps réel ?",
        a: "Le tableau de bord intègre des métriques Prometheus avec graphiques PromQL, alertes configurables par seuil et par email/SMS. Vous visualisez la consommation CPU, mémoire, stockage et réseau par ressource et par période. Des rapports mensuels PDF sont générés automatiquement.",
        icon: BarChart3,
      },
      {
        q: "Comment ajouter ou supprimer des ressources ?",
        a: "Depuis le portail, sélectionnez votre service, choisissez la configuration souhaitée et confirmez. Le provisionnement est automatique via Terraform et Fabric8 — comptez moins de 2 minutes pour une VM, moins de 3 minutes pour une base de données managée. La suppression déclenche une confirmation de sécurité et une note de crédit prorata.",
        icon: Package,
      },
      {
        q: "Comment gérer les accès de mon équipe ?",
        a: "L'interface RBAC de votre espace permet de créer des rôles (Admin, Viewer, Operator), d'inviter des collaborateurs par email et de définir des permissions par ressource. Chaque action est tracée dans les audit logs conservés 12 mois conformément à ISO-27001.",
        icon: Users,
      },
    ],
  },
  {
    id: "support",
    icon: LifeBuoy,
    label: "Support & aide",
    color: "#D97706",
    bg: "#FFFBEB",
    title: "Obtenir de l'aide",
    subtitle: "Canaux de support et ressources disponibles",
    steps: [
      {
        q: "Comment contacter le support technique ?",
        a: "Trois canaux sont disponibles : le ticketing intégré au portail (réponse garantie < 4h en heures ouvrées), le chat en direct (8h–20h du lundi au samedi), et la ligne téléphonique dédiée pour les incidents critiques (P1) disponible 24/7/365. Les tickets P1 déclenchent une escalade automatique vers un ingénieur senior.",
        icon: Headphones,
      },
      {
        q: "Où trouver la documentation et les tutoriels ?",
        a: "La base de connaissance NextStep regroupe plus de 200 articles, guides de démarrage rapide et vidéos tutorielles classés par service. Elle est accessible depuis le portail via le menu Aide. Des webinaires mensuels gratuits couvrent les nouvelles fonctionnalités et les bonnes pratiques.",
        icon: BookOpen,
      },
      {
        q: "Que faire en cas d'incident de production ?",
        a: "Ouvrez un ticket P1 depuis le portail ou appelez la hotline 24/7. Un ingénieur de garde prend en charge l'incident en moins de 15 minutes. Vous recevez des mises à jour d'avancement toutes les 30 minutes jusqu'à résolution. Un rapport post-mortem est fourni sous 48h avec les actions correctives.",
        icon: HelpCircle,
      },
    ],
  },
];

// ─── ANIMATED COUNTER ──────────────────────────────────────────────────────────
function AnimatedCounter({ target, duration = 1800 }: { target: string; duration?: number }) {
  const [display, setDisplay] = useState("0");
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const num = parseInt(target.replace(/[^0-9]/g, ""), 10);
    if (!num) { setDisplay(target); return; }
    const suffix = target.replace(/[0-9]/g, "").trim();
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          setDisplay(Math.floor(ease * num).toLocaleString("fr") + suffix);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{display}</span>;
}

// ─── HERO DASHBOARD VISUAL ────────────────────────────────────────────────────
function HeroDashboard() {
  const [uptime] = useState(99.97);
  const bars = [42, 68, 55, 80, 63, 91, 74, 88, 52, 77, 95, 69];

  return (
    <div className="relative flex items-center justify-center lg:justify-end">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 60% at 60% 50%, rgba(10,127,207,.1) 0%, transparent 75%)" }}
      />
      <div
        className="float-a relative z-10 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-[#0A7FCF]/10 p-5 w-72"
        style={{ boxShadow: "0 20px 60px rgba(10,127,207,.12), 0 4px 16px rgba(0,0,0,.06)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#0A7FCF] flex items-center justify-center">
              <Cloud className="w-4 h-4 text-white" />
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "#0D1B2A" }}>
              Cloud Portal
            </span>
          </div>
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full" style={{ fontFamily: "var(--font-display)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            En ligne
          </span>
        </div>

        <div className="mb-4 p-3 rounded-xl bg-[#F8FAFC] border border-slate-100">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5" style={{ fontFamily: "var(--font-display)" }}>Disponibilité (30j)</p>
          <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, color: "#0D1B2A", lineHeight: 1.1 }}>
            {uptime}%
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#0A7FCF] to-[#059669]" style={{ width: `${uptime}%` }} />
          </div>
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider" style={{ fontFamily: "var(--font-display)" }}>Utilisation CPU</p>
            <p className="text-[10px] font-bold text-[#0A7FCF]" style={{ fontFamily: "var(--font-display)" }}>12 nœuds</p>
          </div>
          <div className="flex items-end gap-0.5 h-10">
            {bars.map((h, i) => (
              <div key={i} className="flex-1 rounded-sm" style={{
                height: `${h}%`,
                background: i === bars.length - 1 ? "linear-gradient(to top, #0A7FCF, #1A8FDF)" : `rgba(10,127,207,${0.2 + (h / 100) * 0.5})`,
              }} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "VMs", value: "12", icon: Server, color: "#0A7FCF" },
            { label: "DBs", value: "6",  icon: Database, color: "#059669" },
            { label: "S3", value: "3 To", icon: HardDrive, color: "#D97706" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex flex-col items-center p-2 rounded-xl bg-[#F8FAFC] border border-slate-100">
              <Icon className="w-4 h-4 mb-1" style={{ color }} />
              <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14, color: "#0D1B2A" }}>{value}</p>
              <p className="text-[9px] font-semibold text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="float-b absolute -left-4 top-16 z-20 flex items-center gap-2.5 bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 shadow-lg" style={{ boxShadow: "0 8px 30px rgba(0,0,0,.08)" }}>
        <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        </div>
        <div>
          <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, color: "#0D1B2A" }}>Déploiement réussi</p>
          <p className="text-[10px] text-slate-400 font-medium">nginx · tenant-baya · 1m32s</p>
        </div>
      </div>

      <div className="float-a absolute -right-2 bottom-20 z-20 flex items-center gap-2.5 bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 shadow-lg" style={{ boxShadow: "0 8px 30px rgba(0,0,0,.08)", animationDelay: "1.2s" }}>
        <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] flex items-center justify-center shrink-0">
          <TrendingUp className="w-4 h-4 text-[#0A7FCF]" />
        </div>
        <div>
          <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, color: "#0D1B2A" }}>-38% de coûts infra</p>
          <p className="text-[10px] text-slate-400 font-medium">vs cloud public · ce trimestre</p>
        </div>
      </div>

      <div className="float-b absolute left-8 -bottom-6 z-20 flex items-center gap-2 bg-[#003F7A] rounded-xl px-3 py-2 shadow-lg" style={{ animationDelay: ".8s" }}>
        <Lock className="w-3.5 h-3.5 text-[#60A5FA]" />
        <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 11, color: "#fff" }}>SSO Keycloak actif</p>
      </div>
    </div>
  );
}

// ─── NAVBAR ───────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "#fff" : "rgba(255,255,255,.92)",
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${scrolled ? "#E1E7EF" : "rgba(225,231,239,.6)"}`,
        boxShadow: scrolled ? "0 2px 20px rgba(0,0,0,.06)" : "none",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-[70px] flex items-center justify-between">
        <a href="#" className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1A8FDF 0%, #003F7A 100%)", boxShadow: "0 4px 14px rgba(10,127,207,.3)" }}>
            <Cloud className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 18, color: "#0D1B2A", letterSpacing: "-0.02em" }}>
              Next<span style={{ color: "#0A7FCF" }}>Step</span>
            </span>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 9, color: "#94A3B8", fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", marginTop: -2 }}>
              Partenaire technologique
            </p>
          </div>
        </a>

        <nav className="hidden lg:flex items-center gap-0.5">
          {NAV_ITEMS.map((item) => (
            <div key={item.label} className="relative"
              onMouseEnter={() => item.sub && setActiveDropdown(item.label)}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <a
                href={item.href}
                className="flex items-center gap-1 px-4 py-2 rounded-lg transition-colors"
                style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "#56697D" }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#0A7FCF"; (e.currentTarget as HTMLAnchorElement).style.background = "#EFF6FF"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#56697D"; (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
              >
                {item.label}
                {item.sub && <ChevronDown className="w-3.5 h-3.5 opacity-60" />}
              </a>
              {item.sub && activeDropdown === item.label && (
                <div className="absolute top-full left-0 mt-1.5 w-48 bg-white rounded-2xl py-2 z-50" style={{ border: "1px solid #E1E7EF", boxShadow: "0 16px 40px rgba(0,0,0,.1), 0 2px 8px rgba(0,0,0,.06)" }}>
                  {item.sub.map((s) => (
                    <a key={s} href="#solutions" className="block px-4 py-2.5 transition-colors"
                      style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13, color: "#56697D" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#0A7FCF"; (e.currentTarget as HTMLAnchorElement).style.background = "#EFF6FF"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#56697D"; (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
                    >{s}</a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <button className="btn" style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "#56697D", padding: "8px 14px", borderRadius: 8 }}
            onMouseEnter={e => (e.currentTarget.style.color = "#0A7FCF")}
            onMouseLeave={e => (e.currentTarget.style.color = "#56697D")}
          >Connexion</button>
          <button className="btn btn-primary" style={{ fontSize: 14, padding: "10px 20px" }}>
            Démarrer gratuitement <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <button className="lg:hidden p-2 rounded-lg transition-colors" style={{ color: "#56697D" }} onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-slate-100 px-6 py-5 space-y-1 shadow-xl">
          {NAV_ITEMS.map((item) => (
            <a key={item.label} href={item.href} className="block px-3 py-2.5 rounded-xl transition-colors"
              style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "#56697D" }}
              onClick={() => setMobileOpen(false)}
            >{item.label}</a>
          ))}
          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
            <button className="btn btn-outline btn-full" style={{ fontFamily: "var(--font-display)" }}>Connexion</button>
            <button className="btn btn-primary btn-full" style={{ fontFamily: "var(--font-display)" }}>Démarrer gratuitement</button>
          </div>
        </div>
      )}
    </header>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section id="hero" className="relative pt-[70px] min-h-screen flex items-center bg-white overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(#0A7FCF15 1.5px, transparent 1.5px)", backgroundSize: "28px 28px" }} />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#F8FAFC] to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-[650px] h-[650px] pointer-events-none" style={{ background: "radial-gradient(ellipse at top right, rgba(10,127,207,.07) 0%, transparent 70%)" }} />

      <div className="relative max-w-7xl mx-auto px-6 py-24 w-full">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(2.2rem, 4vw, 3.5rem)", lineHeight: 1.06, letterSpacing: "-0.03em", color: "#0D1B2A" }}>
                Votre partenaire cloud{" "}
                <span style={{ color: "#0A7FCF" }}>de confiance</span>
                {" "}en Tunisie
              </h1>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 17, lineHeight: 1.7, color: "#56697D", maxWidth: 480 }}>
                Depuis 2012, NextStep conseille et accompagne les entreprises dans la mise en œuvre de leurs projets IT — conception, intégration, développement et maintenance.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="btn btn-primary btn-primary-lg">
                Découvrir nos solutions <ArrowRight className="w-4 h-4" />
              </button>
              <button className="btn btn-outline btn-outline-lg">
                Notre entreprise <Building2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-6 pt-2">
              {[
                { icon: Award,       text: "ISO-9001 & ISO-27001" },
                { icon: Users,       text: "700+ clients satisfaits" },
                { icon: ShieldCheck, text: "1er fournisseur cloud certifié TN" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5 text-[#0A7FCF]" />
                  </div>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 12, color: "#56697D" }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
          <HeroDashboard />
        </div>
      </div>
    </section>
  );
}

// ─── KEY FIGURES ──────────────────────────────────────────────────────────────
function KeyFigures() {
  return (
    <section className="bg-[#003F7A] py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-white/10 rounded-2xl overflow-hidden">
          {KEY_FIGURES.map(({ value, label, icon: Icon }) => (
            <div key={label} className="bg-[#003F7A] px-6 py-8 text-center group transition-colors duration-200 hover:bg-[#0A7FCF]/25">
              <Icon className="w-7 h-7 text-[#60A5FA] mx-auto mb-3 transition-colors group-hover:text-white" />
              <p style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 28, color: "#fff", letterSpacing: "-0.03em" }}>
                <AnimatedCounter target={value} />
              </p>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "#93C5FD", fontWeight: 500, marginTop: 6, lineHeight: 1.4 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── ABOUT STRIP ──────────────────────────────────────────────────────────────
function AboutStrip() {
  return (
    <section id="about" className="bg-[#F8FAFC] py-20 px-6 border-b border-slate-200">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-6">
          <div className="eyebrow"><span />Notre entreprise</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(1.8rem,3vw,2.6rem)", lineHeight: 1.1, letterSpacing: "-0.025em", color: "#0D1B2A" }}>
            Nous simplifions la technologie<br />
            <span style={{ color: "#0A7FCF" }}>pour vous faire avancer</span>
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 15.5, lineHeight: 1.75, color: "#56697D" }}>
            Fondée en 2012, NextStep est aujourd'hui l'un des principaux fournisseurs de cloud en Tunisie. Nos experts interviennent dans les phases de conception, d'intégration, de développement et de maintenance de vos projets IT.
          </p>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 15.5, lineHeight: 1.75, color: "#56697D" }}>
            Première entreprise tunisienne à décrocher le certificat national de fournisseur de services cloud, NextStep accompagne plus de 700 clients dans les secteurs bancaire, santé, pétrole, télécom et administrations publiques.
          </p>
          <button className="btn btn-primary">En savoir plus <ArrowRight className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {TEAM_VALUES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card-hover bg-white rounded-2xl border border-slate-200 p-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "#EFF6FF" }}>
                <Icon className="w-5 h-5 text-[#0A7FCF]" />
              </div>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 13, color: "#0D1B2A", marginBottom: 4 }}>{title}</h3>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 12.5, lineHeight: 1.6, color: "#56697D" }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── SOLUTIONS ────────────────────────────────────────────────────────────────
function Solutions() {
  const [active, setActive] = useState(0);
  const sol = SOLUTIONS[active];

  return (
    <section id="solutions" className="bg-white py-20 px-6">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="max-w-2xl">
          <div className="eyebrow mb-4"><span />Solutions & Services</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(1.8rem,3vw,2.5rem)", letterSpacing: "-0.025em", color: "#0D1B2A", lineHeight: 1.1 }}>
            Des solutions complètes pour votre infrastructure cloud
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 15.5, lineHeight: 1.7, color: "#56697D", marginTop: 10 }}>
            Six domaines d'expertise, orchestrés sur OpenShift, accessibles depuis une interface unifiée.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            {SOLUTIONS.map(({ icon: Icon, title, color }, i) => {
              const isActive = active === i;
              return (
                <button key={title} onClick={() => setActive(i)} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13.5, background: isActive ? "linear-gradient(135deg, #1A8FDF 0%, #0A7FCF 100%)" : "#F8FAFC", color: isActive ? "#fff" : "#475569", border: `1.5px solid ${isActive ? "transparent" : "#E1E7EF"}`, boxShadow: isActive ? "0 4px 14px rgba(10,127,207,.3)" : "none", transform: isActive ? "translateX(2px)" : "none" }}
                >
                  <Icon className="w-5 h-5 shrink-0" style={{ color: isActive ? "#fff" : color }} />
                  {title}
                  <ChevronRight className="w-4 h-4 ml-auto opacity-50" style={{ display: isActive ? "block" : undefined }} />
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-2 rounded-2xl border border-slate-200 p-8 space-y-6" style={{ background: "#F8FAFC" }}>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: sol.bg }}>
                <sol.icon className="w-7 h-7" style={{ color: sol.color }} />
              </div>
              <div>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 20, color: "#0D1B2A", letterSpacing: "-0.02em" }}>{sol.title}</h3>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {sol.tags.map((t) => (
                    <span key={t} className="px-2.5 py-1 rounded-full text-[11px] font-bold border" style={{ fontFamily: "var(--font-display)", borderColor: "#D1D9E0", color: "#6B7A8D", background: "#fff" }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 15, lineHeight: 1.75, color: "#56697D" }}>{sol.desc}</p>
            <div className="grid grid-cols-3 gap-3">
              {sol.items.map((item) => (
                <div key={item} className="card-hover bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: sol.color }} />
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, color: "#475569" }}>{item}</span>
                </div>
              ))}
            </div>
            <button className="btn btn-primary">Déployer ce service <ArrowRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── PARTNERS (real data) ─────────────────────────────────────────────────────
function Partners() {
  return (
    <section id="partners" className="bg-white py-20 px-6 border-b border-slate-200">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="text-center">
          <div className="eyebrow justify-center mb-3"><span className="eyebrow-line" />Partenaires technologiques<span className="eyebrow-line" /></div>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(1.6rem,3vw,2.3rem)", letterSpacing: "-0.025em", color: "#0D1B2A" }}>
            10+ partenaires stratégiques & technologiques
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 15, lineHeight: 1.7, color: "#56697D", maxWidth: 520, margin: "10px auto 0" }}>
            Nos solutions s'appuient sur les leaders mondiaux de l'IT pour garantir performance, sécurité et pérennité à vos projets.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {PARTNERS.map(({ name, abbr, color, category }) => (
            <div key={name} className="card-hover group bg-[#F8FAFC] border border-slate-200 rounded-2xl p-5 flex flex-col items-center gap-3 cursor-pointer">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-md transition-transform duration-200 group-hover:scale-110"
                style={{ fontFamily: "var(--font-display)", background: color }}
              >{abbr}</div>
              <div className="text-center">
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 11.5, color: "#6B7A8D", display: "block", lineHeight: 1.4 }} className="group-hover:text-[#0A7FCF]">{name}</span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 10, fontWeight: 600, color: "#94A3B8" }}>{category}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Partnership highlights */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { logo: "TT", color: "#009B77", name: "Tunisie Telecom", desc: "Partenariat IaaS pour Virtual Data Centers et solutions de sauvegarde PRA managées 24/7." },
            { logo: "IN", color: "#6B21A8", name: "Inetum (ex-Gfi)", desc: "Alliance pour une offre cloud locale pérenne et sécurisée au service des organisations publiques et privées." },
            { logo: "WX", color: "#003087", name: "WALLIX", desc: "Solutions PAM et cybersécurité pour la gestion des accès privilégiés et la protection des données sensibles." },
          ].map(({ logo, color, name, desc }) => (
            <div key={name} className="card-hover bg-[#F8FAFC] border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-black" style={{ fontFamily: "var(--font-display)", background: color }}>{logo}</div>
                <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14, color: "#0D1B2A" }}>{name}</p>
              </div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 13, lineHeight: 1.65, color: "#56697D" }}>{desc}</p>
            </div>
          ))}
        </div>

        {/* Certs */}
        <div className="rounded-2xl bg-[#F8FAFC] border border-slate-200 p-6 flex flex-wrap items-center justify-center gap-8">
          {[
            { label: "ISO-9001",   desc: "Qualité de service" },
            { label: "ISO-27001",  desc: "Sécurité de l'information" },
            { label: "Cert. Cloud TN", desc: "1er fournisseur certifié" },
          ].map(({ label, desc }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#EFF6FF] border-2 border-[#0A7FCF]/30 flex items-center justify-center">
                <Award className="w-4 h-4 text-[#0A7FCF]" />
              </div>
              <div>
                <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 13, color: "#0D1B2A" }}>{label}</p>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#56697D" }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CLIENT GUIDE (replaces HowItWorks) ───────────────────────────────────────
function ClientGuide() {
  const [activeCategory, setActiveCategory] = useState("decouverte");
  const [openStep, setOpenStep] = useState<number | null>(0);

  const cat = GUIDE_CATEGORIES.find(c => c.id === activeCategory)!;

  return (
    <section id="guide" className="bg-[#F8FAFC] border-y border-slate-200 py-20 px-6">
      <div className="max-w-7xl mx-auto space-y-14">
        <div className="text-center max-w-2xl mx-auto">
          <div className="eyebrow justify-center mb-3">
            <span className="eyebrow-line" />Guide client<span className="eyebrow-line" />
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(1.7rem,3vw,2.4rem)", letterSpacing: "-0.025em", color: "#0D1B2A" }}>
            Tout ce que vous devez savoir
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 15.5, lineHeight: 1.7, color: "#56697D", marginTop: 10 }}>
            Réponses claires aux questions les plus fréquentes, organisées par étape de votre parcours client.
          </p>
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-3 justify-center">
          {GUIDE_CATEGORIES.map((c) => {
            const isActive = activeCategory === c.id;
            const Icon = c.icon;
            return (
              <button
                key={c.id}
                onClick={() => { setActiveCategory(c.id); setOpenStep(0); }}
                className="flex items-center gap-2.5 px-5 py-3 rounded-2xl transition-all"
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: 13.5,
                  background: isActive ? c.color : "#fff",
                  color: isActive ? "#fff" : "#475569",
                  border: `1.5px solid ${isActive ? c.color : "#E1E7EF"}`,
                  boxShadow: isActive ? `0 4px 16px ${c.color}40` : "0 1px 4px rgba(0,0,0,.04)",
                  transform: isActive ? "translateY(-1px)" : "none",
                }}
              >
                <Icon className="w-4 h-4" />
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Content area */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left — category info */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: cat.bg }}>
                <cat.icon className="w-7 h-7" style={{ color: cat.color }} />
              </div>
              <div>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 18, color: "#0D1B2A", letterSpacing: "-0.02em" }}>{cat.title}</h3>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 13.5, lineHeight: 1.65, color: "#56697D", marginTop: 6 }}>{cat.subtitle}</p>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <p style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 800, color: "#94A3B8", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 8 }}>
                  {cat.steps.length} questions dans cette section
                </p>
                {cat.steps.map((step, i) => (
                  <button
                    key={i}
                    onClick={() => setOpenStep(openStep === i ? null : i)}
                    className="flex items-center gap-2 w-full py-1.5 text-left transition-colors"
                  >
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: openStep === i ? cat.color : "#CBD5E1" }} />
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 12.5, fontWeight: openStep === i ? 700 : 600, color: openStep === i ? cat.color : "#6B7A8D" }}>
                      {step.q.length > 48 ? step.q.slice(0, 48) + "…" : step.q}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Need more help */}
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center space-y-3">
              <Headphones className="w-8 h-8 text-[#0A7FCF] mx-auto" />
              <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 13, color: "#0D1B2A" }}>Besoin d'aide personnalisée ?</p>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "#56697D", lineHeight: 1.6 }}>Nos ingénieurs répondent en moins de 4h en heures ouvrées.</p>
              <button className="btn btn-primary" style={{ fontSize: 13, padding: "9px 18px", width: "100%", justifyContent: "center" }}>
                Contacter le support <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right — accordion Q&A */}
          <div className="lg:col-span-2 space-y-3">
            {cat.steps.map((step, i) => {
              const isOpen = openStep === i;
              const StepIcon = step.icon;
              return (
                <div
                  key={i}
                  className="guide-tab bg-white rounded-2xl border overflow-hidden"
                  style={{ borderColor: isOpen ? cat.color : "#E1E7EF", boxShadow: isOpen ? `0 4px 20px ${cat.color}18` : "none" }}
                >
                  <button
                    onClick={() => setOpenStep(isOpen ? null : i)}
                    className="w-full flex items-center gap-4 px-6 py-5 text-left"
                  >
                    <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center transition-colors" style={{ background: isOpen ? cat.color : cat.bg }}>
                      <StepIcon className="w-4 h-4" style={{ color: isOpen ? "#fff" : cat.color }} />
                    </div>
                    <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14.5, color: "#0D1B2A", flex: 1, lineHeight: 1.4 }}>{step.q}</p>
                    <div className="shrink-0 transition-transform" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                      <ChevronDown className="w-5 h-5" style={{ color: isOpen ? cat.color : "#94A3B8" }} />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-6 pt-0">
                      <div className="ml-[52px] pl-4 border-l-2" style={{ borderColor: cat.color + "40" }}>
                        <p style={{ fontFamily: "var(--font-body)", fontSize: 14.5, lineHeight: 1.8, color: "#475569" }}>{step.a}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── CTA BANNER ───────────────────────────────────────────────────────────────
function CTABanner() {
  return (
    <section className="bg-[#F8FAFC] py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="relative rounded-3xl p-12 text-center overflow-hidden" style={{ background: "linear-gradient(140deg, #0A7FCF 0%, #0069B4 45%, #003F7A 100%)", boxShadow: "0 24px 60px rgba(10,127,207,.35), 0 4px 16px rgba(0,0,0,.08)" }}>
          <div className="absolute inset-0 pointer-events-none opacity-[.06]" style={{ backgroundImage: "radial-gradient(white 1.5px, transparent 1.5px)", backgroundSize: "20px 20px" }} />
          <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/5" />
          <div className="relative space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mx-auto border border-white/25">
              <Cloud className="w-7 h-7 text-white" />
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(1.6rem,3vw,2.2rem)", letterSpacing: "-0.025em", color: "#fff" }}>
              Prêt à déployer votre première ressource ?
            </h2>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 16, lineHeight: 1.7, color: "rgba(219,234,254,.9)", maxWidth: 480, margin: "0 auto" }}>
              Créez votre espace cloud en 30 secondes. Nos experts vous accompagnent dans toutes les phases de votre projet — sans engagement.
            </p>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <button className="btn btn-white" style={{ fontSize: 15 }}>Créer mon espace cloud <ArrowRight className="w-4 h-4" /></button>
              <button className="btn btn-ghost" style={{ fontSize: 15 }}>Contacter un expert <ExternalLink className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── CONTACT ──────────────────────────────────────────────────────────────────
function Contact() {
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 16px", borderRadius: 12,
    border: "1.5px solid #E1E7EF", background: "#fff",
    fontSize: 14, fontFamily: "var(--font-body)", color: "#0D1B2A",
    outline: "none", transition: "border-color .2s, box-shadow .2s",
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 800,
    color: "#94A3B8", letterSpacing: ".12em", textTransform: "uppercase",
    display: "block", marginBottom: 6,
  };

  return (
    <section id="contact" className="bg-white border-t border-slate-200 py-20 px-6">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="max-w-2xl">
          <div className="eyebrow mb-4"><span className="eyebrow-line" />Contactez-nous</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(1.8rem,3vw,2.5rem)", letterSpacing: "-0.025em", color: "#0D1B2A", lineHeight: 1.1 }}>
            Discutons de votre projet
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 15.5, lineHeight: 1.7, color: "#56697D", marginTop: 10 }}>
            Notre équipe d'ingénieurs certifiés est disponible pour vous accompagner.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            {[
              { icon: Mail,   title: "Email",     val: "contact@nextstep-it.com", sub: "Réponse sous 24h" },
              { icon: Phone,  title: "Téléphone", val: "+216 70 25 82 00",         sub: "Lun–Ven 8h–18h" },
              { icon: MapPin, title: "Adresse",   val: "Charguia 1, Tunis",        sub: "Rue Énergie Solaire 2035" },
            ].map(({ icon: Icon, title, val, sub }) => (
              <div key={title} className="flex gap-4 items-start">
                <div className="w-11 h-11 rounded-xl bg-[#EFF6FF] flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-[#0A7FCF]" />
                </div>
                <div>
                  <p style={{ fontFamily: "var(--font-display)", fontSize: 10, fontWeight: 800, color: "#94A3B8", letterSpacing: ".12em", textTransform: "uppercase" }}>{title}</p>
                  <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "#0D1B2A", marginTop: 2 }}>{val}</p>
                  <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#94A3B8" }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-2 rounded-2xl border border-slate-200 p-8 space-y-5" style={{ background: "#F8FAFC" }}>
            <div className="grid sm:grid-cols-2 gap-4">
              {["Nom complet", "Email professionnel"].map((p) => (
                <div key={p}>
                  <label style={labelStyle}>{p}</label>
                  <input placeholder={p} style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = "#0A7FCF"; e.target.style.boxShadow = "0 0 0 3px rgba(10,127,207,.12)"; }}
                    onBlur={e => { e.target.style.borderColor = "#E1E7EF"; e.target.style.boxShadow = "none"; }}
                  />
                </div>
              ))}
            </div>
            <div>
              <label style={labelStyle}>Sujet</label>
              <select style={inputStyle}
                onFocus={e => { e.target.style.borderColor = "#0A7FCF"; e.target.style.boxShadow = "0 0 0 3px rgba(10,127,207,.12)"; }}
                onBlur={e => { e.target.style.borderColor = "#E1E7EF"; e.target.style.boxShadow = "none"; }}
              >
                <option>Cloud & Infrastructure</option>
                <option>Cybersécurité & IAM</option>
                <option>Réseau & Interconnexion</option>
                <option>Support technique</option>
                <option>Partenariat</option>
                <option>Autre</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Message</label>
              <textarea rows={4} placeholder="Décrivez votre projet ou besoin…" style={{ ...inputStyle, resize: "none" }}
                onFocus={e => { e.target.style.borderColor = "#0A7FCF"; e.target.style.boxShadow = "0 0 0 3px rgba(10,127,207,.12)"; }}
                onBlur={e => { e.target.style.borderColor = "#E1E7EF"; e.target.style.boxShadow = "none"; }}
              />
            </div>
            <button className="btn btn-primary btn-full">Envoyer le message <ArrowRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: "#0D1B2A", color: "#64748B" }} className="px-6 pt-16 pb-8">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="grid md:grid-cols-5 gap-10">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1A8FDF, #003F7A)" }}>
                <Cloud className="w-5 h-5 text-white" />
              </div>
              <div>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 18, color: "#fff" }}>Next<span style={{ color: "#0A7FCF" }}>Step</span></span>
                <p style={{ fontFamily: "var(--font-display)", fontSize: 9, color: "#475569", fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", marginTop: -1 }}>Partenaire technologique</p>
              </div>
            </div>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 13.5, lineHeight: 1.7, maxWidth: 280, color: "#64748B" }}>
              Depuis 2012, NextStep conçoit, déploie et maintient des solutions cloud. 1er fournisseur de services cloud certifié en Tunisie.
            </p>
            <div className="flex gap-2">
              {["ISO-9001", "ISO-27001"].map((c) => (
                <span key={c} className="px-2.5 py-1 rounded-full border" style={{ fontFamily: "var(--font-display)", fontSize: 10, fontWeight: 700, borderColor: "rgba(10,127,207,.35)", color: "#60A5FA" }}>{c}</span>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <p style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 900, color: "#fff", letterSpacing: ".12em", textTransform: "uppercase" }}>Solutions</p>
            {["Cloud & Infrastructure", "Réseau & Interconnexion", "Cybersécurité & IAM", "Supervision", "Stockage & Données", "DevOps"].map((l) => (
              <button key={l} style={{ display: "block", fontFamily: "var(--font-body)", fontSize: 13.5, color: "#64748B", transition: "color .2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={e => (e.currentTarget.style.color = "#64748B")}
              >{l}</button>
            ))}
          </div>

          <div className="space-y-4">
            <p style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 900, color: "#fff", letterSpacing: ".12em", textTransform: "uppercase" }}>Entreprise</p>
            {["Notre entreprise", "Équipe & certifications", "Partenaires", "Références clients", "Guide client"].map((l) => (
              <button key={l} style={{ display: "block", fontFamily: "var(--font-body)", fontSize: 13.5, color: "#64748B", transition: "color .2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={e => (e.currentTarget.style.color = "#64748B")}
              >{l}</button>
            ))}
          </div>

          <div className="space-y-4">
            <p style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 900, color: "#fff", letterSpacing: ".12em", textTransform: "uppercase" }}>Contact</p>
            <div className="space-y-3">
              {[
                { icon: Mail,   t: "contact@nextstep-it.com" },
                { icon: Phone,  t: "+216 70 25 82 00" },
                { icon: MapPin, t: "Charguia 1, Tunis, Tunisie" },
              ].map(({ icon: Icon, t }) => (
                <div key={t} className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-[#0A7FCF] shrink-0" />
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "#64748B" }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderTop: "1px solid #1E293B" }}>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#475569" }}>© 2025 NextStep IT · Tous droits réservés · Charguia 1, Tunis</p>
          <div className="flex gap-5">
            {["Confidentialité", "CGU", "Mentions légales"].map((l) => (
              <button key={l} style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#475569", transition: "color .2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={e => (e.currentTarget.style.color = "#475569")}
              >{l}</button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  useFonts();
  return (
    <div className="min-h-screen antialiased">
      <Navbar />
      <Hero />
      <KeyFigures />
      <AboutStrip />
      <Solutions />
      <Partners />
      <ClientGuide />
      <CTABanner />
      <Contact />
      <Footer />
    </div>
  );
}