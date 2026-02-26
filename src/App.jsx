import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, ComposedChart, ReferenceLine
} from 'recharts';
import { 
  LayoutDashboard, TrendingUp, DollarSign, Store, Calendar, RefreshCcw, LogOut, ChevronRight, ChevronLeft, FileText, ArrowRight, Wallet, AlertTriangle, CheckCircle, HelpCircle, Activity, Scale, Filter, BarChart2, PieChart as PieIcon, Sliders, Banknote, Users, ArrowLeftRight, CreditCard, PiggyBank, Landmark, Briefcase, PlusCircle, Clock, AlertOctagon, Search, Trash2, Edit, Save, X, UserCog, User, Upload, Loader, Download, MinusCircle, ThumbsUp, Eye, List
} from 'lucide-react';
import DonutKPI from './components/DonutKPI';

// FIREBASE IMPORTS
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, updateDoc, doc, query, orderBy, writeBatch } from 'firebase/firestore';

/**
 * FIAMBRERIAS PAMPA - DASHBOARD INTEGRAL v11.0
 * Feature: Cuenta Corriente Real (Clearing de Pagos).
 * - Nuevo Botón "Cargar Pago".
 * - Lógica FIFO: Los pagos (iniciales + sueltos) cancelan deuda antigua.
 * - KPI IVA Compras separado.
 */

// --- CONFIGURACIÓN FIREBASE OFUSCADA ---
const REVERSED_KEY = "oKOPUQnl6XSFUpPsPfejfREkzXTPG4RyVADySazIA";
const getRealKey = () => REVERSED_KEY.split('').reverse().join('');

const firebaseConfig = {
  apiKey: getRealKey(),
  authDomain: "pampa-gestion-b9cd2.firebaseapp.com",
  projectId: "pampa-gestion-b9cd2",
  storageBucket: "pampa-gestion-b9cd2.firebasestorage.app",
  messagingSenderId: "303967063415",
  appId: "1:303967063415:web:14aafc465de7904b5b2572"
};

// Inicialización Segura
let appFirebase, auth, db;
try {
  appFirebase = initializeApp(firebaseConfig);
  auth = getAuth(appFirebase);
  db = getFirestore(appFirebase);
} catch (e) {
  console.error("Error inicializando Firebase:", e);
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];
const LOGO_URL = "https://raw.githubusercontent.com/indiocipo1979/dashboard-pampa/813294c2178aefbd20bf295d6968254b5d248790/logo_pampa.png";

// --- ESTILOS INYECTADOS ---
const Styles = () => (
  <style>{`
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
  `}</style>
);

// --- HELPERS BLINDADOS ---

// Mapa de meses para parsear abreviaturas (Español e Inglés)
const MONTH_MAP = {
  'ENE': 0, 'JAN': 0, 'ENERO': 0,
  'FEB': 1, 'FEBRERO': 1,
  'MAR': 2, 'MARZO': 2,
  'ABR': 3, 'APR': 3, 'ABRIL': 3,
  'MAY': 4, 'MAYO': 4,
  'JUN': 5, 'JUNIO': 5,
  'JUL': 6, 'JULIO': 6,
  'AGO': 7, 'AUG': 7, 'AGOSTO': 7,
  'SEP': 8, 'SET': 8, 'SEPTIEMBRE': 8, 'SETIEMBRE': 8,
  'OCT': 9, 'OCTUBRE': 9,
  'NOV': 10, 'NOVIEMBRE': 10,
  'DIC': 11, 'DEC': 11, 'DICIEMBRE': 11
};

// Parser inteligente de fechas
const parseSmartDate = (dateStr) => {
  if (!dateStr) return null;

  if (dateStr instanceof Date) {
    return isNaN(dateStr.getTime()) ? null : dateStr;
  }

  if (typeof dateStr !== 'string') {
    dateStr = String(dateStr);
  }
  
  // 1. Try ISO/Standard first (e.g. 2026-02-09 or 2026/02/09)
  // Si ya es un formato compatible con Date, lo usamos.
  // Agregamos T12:00:00 para evitar problemas de timezone si es solo fecha
  let isoDate = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T12:00:00');
  if (!isNaN(isoDate.getTime())) return isoDate;

  // 2. Limpieza para formatos de texto (17-dic-25, 23/ene/26)
  const clean = dateStr.toString().trim().toUpperCase().replace(/[/.]/g, '-');
  const parts = clean.split('-');

  if (parts.length === 3) {
      let day, monthIdx, year;
      
      // Caso DD-MMM-YY o DD-MMM-YYYY (ej: 17-DIC-25)
      if (isNaN(parseInt(parts[1])) && MONTH_MAP.hasOwnProperty(parts[1])) {
          day = parseInt(parts[0]);
          monthIdx = MONTH_MAP[parts[1]];
          year = parseInt(parts[2]);
      } 
      // Caso DD-MM-YYYY (ej: 09-02-2026) que falló en paso 1
      else if (!isNaN(parseInt(parts[1]))) {
           day = parseInt(parts[0]);
           monthIdx = parseInt(parts[1]) - 1;
           year = parseInt(parts[2]);
      }

      if (day && monthIdx !== undefined && year) {
          if (year < 100) year += 2000; // Asumir siglo 21 para 2 dígitos
          return new Date(year, monthIdx, day, 12, 0, 0);
      }
  }
  
  return null;
}

// Formateador Unificado para Visualización (dd/MM/yyyy)
const formatDate = (dateInput) => {
    const d = parseSmartDate(dateInput);
    if (!d) return dateInput; // Si falla, devuelve original
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Formateador para Períodos (Mes Año)
const formatPeriod = (periodStr) => {
  if (!periodStr || periodStr === 'Acumulado') return 'Acumulado';
  
  const cleanStr = periodStr.toString().trim().toUpperCase();
  const parts = cleanStr.split(/[-/ ]/);
  
  let year, month;
  
  if (parts.length === 2) {
    const p1 = parts[0];
    const p2 = parts[1];
    const n1 = parseInt(p1);
    const n2 = parseInt(p2);
    
    // LÓGICA 1: Formatos Numéricos (2025-12 o 12-2025)
    if (!isNaN(n1) && !isNaN(n2)) {
      if (n1 > 1000 && n2 >= 1 && n2 <= 12) { year = n1; month = n2 - 1; } 
      else if (n2 > 1000 && n1 >= 1 && n1 <= 12) { year = n2; month = n1 - 1; }
    } 
    // LÓGICA 2: Formatos de Texto (OCT-25)
    else {
      if (MONTH_MAP.hasOwnProperty(p1) && !isNaN(n2)) {
        month = MONTH_MAP[p1];
        year = n2 < 100 ? 2000 + n2 : n2;
      }
    }
    
    if (year !== undefined && month !== undefined) {
      const date = new Date(year, month, 2);
      const monthName = date.toLocaleString('es-AR', { month: 'long' });
      return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
    }
  }
  return cleanStr;
};

const cleanMonto = (val) => {
  if (typeof val === 'number') return val;
  if (val === undefined || val === null) return 0;
  let str = String(val).trim().replace(/[^0-9.,-]/g, '');
  if (str === '' || str === '-') return 0;
  if (str.includes(',') && str.includes('.')) {
      if (str.lastIndexOf(',') > str.lastIndexOf('.')) str = str.replace(/\./g, '').replace(',', '.');
      else str = str.replace(/,/g, '');
  } else if (str.includes(',')) str = str.replace(',', '.');
  else if (str.includes('.')) {
      const parts = str.split('.');
      if (parts.length > 1 && parts[parts.length-1].length !== 2) str = str.replace(/\./g, '');
  }
  const res = parseFloat(str);
  return isNaN(res) ? 0 : res;
};

const formatCurrency = (val) => {
  const parsed = cleanMonto(val);
  const num = Math.abs(parsed) < 0.005 ? 0 : parsed;
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

const formatPercent = (val, decimals = 1) => {
  const num = cleanMonto(val);
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
};

const formatInputDate = (dateInput) => {
  const d = parseSmartDate(dateInput);
  if (!d) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Componentes UI
const KPICard = ({ title, value, icon: Icon, color, detail, subtext, valueClass }) => (
  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-all h-full">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-2xl ${color} bg-opacity-10`}><Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} /></div>
      {detail && <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 uppercase tracking-tighter">{detail}</span>}
    </div>
    <div>
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
      <h3 className={`text-2xl font-black mt-1 ${valueClass || 'text-slate-800'}`}>{value}</h3>
      {subtext && <p className="text-[10px] text-slate-500 mt-2 font-medium bg-slate-50 p-2 rounded-lg leading-snug">{subtext}</p>}
    </div>
  </div>
);

const GaugeCard = ({ title, value, max = 100, suffix = '' }) => {
  const numValue = Math.max(0, Math.min(parseFloat(value) || 0, max));
  const rotation = -90 + ((numValue / max) * 180);
  const colors = ['#ef4444', '#f59e0b', '#10b981']; 
  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center justify-between h-full relative hover:shadow-md">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 z-10 w-full text-center">{title}</h3>
      <div className="relative w-48 h-24">
        <svg viewBox="0 0 100 55" className="w-full h-full overflow-visible">
          <path d="M 10 50 A 40 40 0 0 1 28 17" fill="none" stroke={colors[0]} strokeWidth="8" strokeLinecap="round" />
          <path d="M 34 13 A 40 40 0 0 1 66 13" fill="none" stroke={colors[1]} strokeWidth="8" strokeLinecap="round" />
          <path d="M 72 17 A 40 40 0 0 1 90 50" fill="none" stroke={colors[2]} strokeWidth="8" strokeLinecap="round" />
          <g transform={`rotate(${rotation} 50 50)`} style={{ transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)' }}>
             <line x1="50" y1="50" x2="50" y2="5" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
             <circle cx="50" cy="50" r="3" fill="#334155" stroke="white" strokeWidth="1.5" />
          </g>
        </svg>
        <div className="absolute bottom-0 left-2 text-[9px] font-bold text-slate-300">0{suffix}</div>
        <div className="absolute bottom-0 right-2 text-[9px] font-bold text-slate-300">{max}{suffix}</div>
      </div>
      <div className="text-center -mt-6 z-20 relative"><span className="text-3xl font-black text-slate-800 bg-white/80 px-2 rounded-lg backdrop-blur-sm">{value}{suffix}</span></div>
    </div>
  );
};

const TabButton = ({ active, label, icon: Icon, onClick }) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${active ? 'bg-slate-800 text-white shadow-lg shadow-slate-300 transform scale-105' : 'bg-white text-slate-400 hover:bg-slate-50'}`}>
    <Icon size={18} /> {label}
  </button>
);

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [userRole, setUserRole] = useState(null); 
  const [currentTab, setCurrentTab] = useState('economico');
  const [showModuleSelector, setShowModuleSelector] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
   
  const [selectedBranch, setSelectedBranch] = useState('Todas');
  const [selectedMonth, setSelectedMonth] = useState('Acumulado');

  // Estados Firebase
  const [proveedores, setProveedores] = useState([]);
  const [facturas, setFacturas] = useState([]);
  const [pagos, setPagos] = useState([]); // Nueva colección
  const [salesStats, setSalesStats] = useState([]);
  const [proveedoresSubTab, setProveedoresSubTab] = useState('operaciones'); // Default a Operaciones
   
  // Modales
  const [showProvModal, setShowProvModal] = useState(false);
  const [showFacturaModal, setShowFacturaModal] = useState(false);
  const [showPagoModal, setShowPagoModal] = useState(false); // Nuevo Modal Pago
  const [editingProv, setEditingProv] = useState(null);
  const [savingProv, setSavingProv] = useState(false); // Used in render, ensuring state exists
  const [saving, setSaving] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [savingFactura, setSavingFactura] = useState(false);
  const [showInvoiceImportModal, setShowInvoiceImportModal] = useState(false);
  const [invoiceImportText, setInvoiceImportText] = useState('');
  const [showSalesImportModal, setShowSalesImportModal] = useState(false);
  const [salesImportText, setSalesImportText] = useState('');
  const [savingSalesImport, setSavingSalesImport] = useState(false);
  const [deletingSalesImport, setDeletingSalesImport] = useState(false);
  const [selectedSalesPeriodKey, setSelectedSalesPeriodKey] = useState(null);
  const [provFilterId, setProvFilterId] = useState('Todas');
  
  // ESTADOS PARA FILTROS EN OPERACIONES
  const [opsFilterProvider, setOpsFilterProvider] = useState('');
  const [opsFilterDateFrom, setOpsFilterDateFrom] = useState(''); // NEW: Fecha Desde
  const [opsFilterDateTo, setOpsFilterDateTo] = useState('');     // NEW: Fecha Hasta
  const [opsFilterInvoiceNumber, setOpsFilterInvoiceNumber] = useState('');
  const [opsPage, setOpsPage] = useState(1);
  const OPS_ITEMS_PER_PAGE = 10;
   
  // Estado para edición de factura
  const [editingFactura, setEditingFactura] = useState(null);
  const [editingPago, setEditingPago] = useState(null);

  // Estado para visualización de CUENTA CORRIENTE
  const [selectedAccountProvider, setSelectedAccountProvider] = useState(null);
  const [accountsSearch, setAccountsSearch] = useState('');
  const [dashboardCalendarMonth, setDashboardCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // ESTADOS PARA EL MODAL DE EXPORTACIÓN
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportConfig, setExportConfig] = useState({
    providerId: '', // '' = Todos
    dateFrom: '',
    dateTo: ''
  });

  const invoiceFileInputRef = useRef(null);
  const salesFileInputRef = useRef(null);

  // Estado para formateo de importes en formulario de factura
  const [newInvoiceData, setNewInvoiceData] = useState({ totalAmount: '', taxAmount: '', initialPayment: '' });

  useEffect(() => {
    if (!showFacturaModal) return;
    setNewInvoiceData({
      totalAmount: editingFactura ? formatCurrency(editingFactura.totalAmount) : '',
      taxAmount: editingFactura ? formatCurrency(editingFactura.taxes) : '',
      initialPayment: editingFactura ? formatCurrency(editingFactura.partialPayment) : ''
    });
  }, [showFacturaModal, editingFactura]);

  const handleInvoiceAmountChange = (field, value) => {
    setNewInvoiceData(prev => ({ ...prev, [field]: value }));
  };

  const handleInvoiceAmountBlur = (field) => {
    setNewInvoiceData(prev => {
      const raw = String(prev[field] ?? '').trim();
      if (!raw) return { ...prev, [field]: '' };
      return { ...prev, [field]: formatCurrency(cleanMonto(raw)) };
    });
  };

  // --- PREVENIR SALIDA ACCIDENTAL (BOTÓN ATRÁS) ---
  useEffect(() => {
    if (isLoggedIn) {
      window.history.pushState(null, document.title, window.location.href);
      const handlePopState = (event) => {
        window.history.pushState(null, document.title, window.location.href);
      };
      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isLoggedIn]);

  const connectFirebase = async () => {
    if (!auth) return;
    try { await signInAnonymously(auth); } catch (e) { console.error("Error auth:", e); }
  };

  const fetchData = async (targetTab) => {
    setLoading(true);
    setError(null);

    if (targetTab === 'proveedores') {
      if (!db) { setError("Falta config Firebase"); setLoading(false); return; }
      try {
        const provSnap = await getDocs(query(collection(db, 'proveedores'), orderBy('name')));
        setProveedores(provSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) || []);
        
        // Obtenemos facturas y pagos sin ordenar en query para hacerlo en memoria con el parser inteligente
        const factSnap = await getDocs(collection(db, 'facturas'));
        setFacturas(factSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) || []);

        try {
           const pagosSnap = await getDocs(collection(db, 'pagos'));
           setPagos(pagosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) || []);
        } catch (e) { setPagos([]); }

      } catch (err) { console.error(err); setError("Error base de datos"); } 
      finally { setLoading(false); }
    } else {
      const sheetParam = targetTab === 'financiero' ? 'financiero' : 'ebitda';
      try {
        if (targetTab === 'economico' && db) {
          try {
            const statsSnap = await getDocs(collection(db, 'estadisticas_ventas'));
            setSalesStats(statsSnap.docs.map(item => ({ id: item.id, ...item.data() })) || []);
          } catch (e) {
            setSalesStats([]);
          }
        }

        // TIMEOUT SAFETY: Si la API no responde en 10s, cancela y evita loop infinito
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000));
        const res = await Promise.race([fetch(`/api/get-data?sheet=${sheetParam}`), timeoutPromise]);
        
        if (!res.ok) throw new Error("Error del servidor");
        const rawData = await res.json();
        if (!rawData || !Array.isArray(rawData)) { setData([]); return; }
        
        const formatted = rawData.map(item => ({
          ...item,
          Monto: cleanMonto(item.Monto),
          Entrada: cleanMonto(item.Entrada),
          Salida: cleanMonto(item.Salida),
          Mes: String(item.Mes || item.Fecha || '').trim(),
          Sucursal: String(item.Sucursal || 'Global').trim(),
          Concepto: String(item.Concepto || '').trim(),
          Subconcepto: String(item.Subconcepto || '').trim(),
          Tipo: String(item.Tipo || '').trim(),
          Cuenta: String(item['Cuenta Origen'] || item.Cuenta || '').trim(),
          Origen: String(item.Origen || '').trim()
        }));
        setData(formatted);
      } catch (err) { setError(`Fallo conexión`); setData([]); } 
      finally { setLoading(false); }
    }
  };

  useEffect(() => {
    if (isLoggedIn && !showModuleSelector) {
      if (currentTab === 'proveedores' || currentTab === 'economico') connectFirebase();
      fetchData(currentTab);
      if (currentTab !== 'proveedores') { setSelectedBranch('Todas'); setSelectedMonth('Acumulado'); }
    }
  }, [currentTab, isLoggedIn, showModuleSelector]);

  // Reset pagination on filter change
  useEffect(() => {
    setOpsPage(1);
  }, [opsFilterProvider, opsFilterDateFrom, opsFilterDateTo, opsFilterInvoiceNumber]);

  const handleLogin = (e) => {
    e.preventDefault();
    const passInput = password.trim();
    if (passInput === 'Pampa2026') {
      setUserRole('gerente');
      setCurrentTab('economico');
      setIsLoggedIn(true);
      setShowModuleSelector(true);
    } 
    else if (passInput === 'PampaCarga') {
      setUserRole('admin');
      setCurrentTab('proveedores');
      setProveedoresSubTab('operaciones');
      setIsLoggedIn(true);
      setShowModuleSelector(true);
    } 
    else { alert("Contraseña incorrecta."); }
  };

  const handleSelectModule = (tabKey) => {
    if (userRole !== 'gerente' && tabKey !== 'proveedores') return;
    setCurrentTab(tabKey);
    if (tabKey === 'proveedores') setProveedoresSubTab('operaciones');
    setShowModuleSelector(false);
  };

  // --- ACTIONS ---
  const handleSaveProveedor = async (e) => {
    e.preventDefault();
    if (!db || savingProv) return;
    setSavingProv(true);
    const formData = new FormData(e.target);
    const name = formData.get('name').trim();
    const isDuplicate = proveedores.some(p => {
      if (editingProv && p.id === editingProv.id) return false;
      return p.name.toLowerCase() === name.toLowerCase();
    });
    if (isDuplicate) { alert(`⚠️ Proveedor "${name}" ya existe.`); setSavingProv(false); return; }
    const newProv = { name, phone: formData.get('phone'), cuit: formData.get('cuit'), address: formData.get('address') };
    try {
      if (editingProv) await updateDoc(doc(db, 'proveedores', editingProv.id), newProv);
      else await addDoc(collection(db, 'proveedores'), newProv);
      setShowProvModal(false); setEditingProv(null); fetchData('proveedores');
    } catch (err) { alert("Error al guardar"); } finally { setSavingProv(false); }
  };

  const handleBulkImport = async () => {
    if (!db || !importText.trim()) return;
    setSavingProv(true);
    const lines = importText.split('\n');
    let count = 0;
    for (let line of lines) {
       const p = line.split(',');
       if(p[0]) { try { await addDoc(collection(db, 'proveedores'), { name: p[0].trim(), phone: p[1]||'', cuit: p[2]||'', address: p[3]||'' }); count++; } catch(e){} }
    }
    setSavingProv(false); setShowImportModal(false); setImportText(''); fetchData('proveedores'); alert(`Importados: ${count}`);
  };

  const handleBulkImportFacturas = async (rawText) => {
    const sourceText = (rawText ?? invoiceImportText).trim();
    if (!db || !sourceText) return;
    setSavingFactura(true);
    const { docsToWrite, skippedCount: skippedInitial } = parseInvoiceImport(sourceText);
    let skippedCount = skippedInitial;

    let addedCount = 0;
    const batchSize = 400;
    for (let i = 0; i < docsToWrite.length; i += batchSize) {
      const batch = writeBatch(db);
      const slice = docsToWrite.slice(i, i + batchSize);
      slice.forEach(data => {
        const ref = doc(collection(db, 'facturas'));
        batch.set(ref, data);
      });
      try {
        await batch.commit();
        addedCount += slice.length;
      } catch (e) {
        skippedCount += slice.length;
      }
    }

    setSavingFactura(false); setShowInvoiceImportModal(false); setInvoiceImportText(''); fetchData('proveedores');
    alert(`Importadas: ${addedCount}${skippedCount ? ` | Omitidas: ${skippedCount}` : ''}`);
  };

  const handleInvoiceFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setInvoiceImportText(text);
      const ok = confirm(`Se cargo el archivo "${file.name}". ¿Queres importar ahora?`);
      if (ok) await handleBulkImportFacturas(text);
    } catch (err) {
      alert('No se pudo leer el archivo.');
    } finally {
      if (invoiceFileInputRef.current) invoiceFileInputRef.current.value = '';
    }
  };

  const handleDeleteAllFacturas = async () => {
    if (!db || savingFactura) return;
    if (!confirm('Esto borrara TODAS las facturas. ¿Continuar?')) return;
    setSavingFactura(true);
    try {
      const snap = await getDocs(collection(db, 'facturas'));
      let deleted = 0;
      const docs = snap.docs;
      const batchSize = 400;
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = writeBatch(db);
        const slice = docs.slice(i, i + batchSize);
        slice.forEach(d => batch.delete(d.ref));
        await batch.commit();
        deleted += slice.length;
      }
      fetchData('proveedores');
      alert(`Facturas borradas: ${deleted}`);
    } catch (e) {
      alert('Error al borrar facturas');
    } finally {
      setSavingFactura(false);
    }
  };

  const parseInvoiceImport = (rawText) => {
    const lines = rawText.split('\n');
    const providerByName = new Map(
      proveedores
        .filter(p => p?.name)
        .map(p => [p.name.trim().toLowerCase(), p.id])
    );
    const parsedLines = [];
    const docsToWrite = [];
    let skippedCount = 0;
    const looksLikeDate = (value) => !!parseSmartDate(value);

    lines.forEach((line, idx) => {
      if (!line.trim()) return;
      let parts = line.split('\t');
      if (parts.length < 2) parts = line.split(';');
      if (parts.length < 2) parts = line.split(',');
      parts = parts.map(p => (p ?? '').trim());

      let payload = null;
      let reason = '';

      if (parts.length >= 8 && !looksLikeDate(parts[1])) {
        // Formato anterior: Fecha, Proveedor, Nro, Detalle, Neto, Impuesto, Pago, Vencimiento
        const net = cleanMonto(parts[4]);
        const tax = cleanMonto(parts[5]);
        const paid = cleanMonto(parts[6]);
        const providerName = parts[1];
        const providerId = providerByName.get(providerName.toLowerCase()) || 'unknown';
        payload = {
          invoiceDate: parts[0],
          dueDate: parts[7] || parts[0],
          providerId,
          providerName,
          invoiceNumber: parts[2],
          description: parts[3],
          netAmount: net,
          taxes: tax,
          totalAmount: net + tax,
          partialPayment: paid,
          status: 'Importado'
        };
      } else if (parts.length >= 7) {
        // Formato nuevo: Fecha, Vencimiento, Proveedor, Nro Factura, Detalle, Total Fac., IVA
        const invoiceDate = parts[0];
        const dueDate = parts[1] || parts[0];
        const providerName = parts[2];
        const invoiceNumber = parts[3];
        const description = parts[4];
        const total = cleanMonto(parts[5]);
        const tax = cleanMonto(parts[6]);
        const net = Math.max(total - tax, 0);
        const providerId = providerByName.get(providerName.toLowerCase()) || 'unknown';
        payload = {
          invoiceDate,
          dueDate,
          providerId,
          providerName,
          invoiceNumber,
          description,
          netAmount: net,
          taxes: tax,
          totalAmount: total,
          partialPayment: 0,
          status: 'Importado'
        };
      } else {
        reason = 'Columnas insuficientes';
      }

      if (payload) {
        docsToWrite.push(payload);
        parsedLines.push({ index: idx + 1, line, status: 'ok', reason: '' });
      } else {
        skippedCount++;
        parsedLines.push({ index: idx + 1, line, status: 'error', reason: reason || 'Formato invalido' });
      }
    });

    return { docsToWrite, skippedCount, parsedLines };
  };

  const invoiceImportPreview = useMemo(() => {
    if (!invoiceImportText.trim()) return { docsToWrite: [], skippedCount: 0, parsedLines: [] };
    return parseInvoiceImport(invoiceImportText);
  }, [invoiceImportText, proveedores]);

  const splitCsvLikeLine = (line) => {
    if (line.includes('\t')) return line.split('\t').map(part => part.trim());
    if (line.includes(';')) return line.split(';').map(part => part.trim());
    return line.split(',').map(part => part.trim());
  };

  const normalizeTextToken = (value) => {
    return String(value || '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase();
  };

  const WEEKDAY_ALIASES = {
    Lunes: ['LUNES', 'LUN'],
    Martes: ['MARTES', 'MAR'],
    Miércoles: ['MIERCOLES', 'MIER', 'MIE'],
    Jueves: ['JUEVES', 'JUE'],
    Viernes: ['VIERNES', 'VIE'],
    Sábado: ['SABADO', 'SAB'],
    Domingo: ['DOMINGO', 'DOM']
  };

  const weekdayFromHeaderCell = (cellValue) => {
    const normalizedCell = normalizeTextToken(cellValue);
    if (!normalizedCell) return null;

    for (const [weekday, aliases] of Object.entries(WEEKDAY_ALIASES)) {
      if (aliases.some(alias => normalizedCell === alias || normalizedCell.startsWith(alias))) {
        return weekday;
      }
    }

    return null;
  };

  const normalizePeriodFromText = (rawText) => {
    const betweenDateMatch = rawText.match(/Entre\s+(\d{2})\/(\d{2})\/(\d{4})/i);
    if (betweenDateMatch) {
      const month = betweenDateMatch[2];
      const year = betweenDateMatch[3];
      const date = new Date(Number(year), Number(month) - 1, 1);
      const monthName = date.toLocaleString('es-AR', { month: 'long' });
      return {
        periodKey: `${year}-${month}`,
        periodLabel: `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`
      };
    }

    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear());
    const monthName = now.toLocaleString('es-AR', { month: 'long' });
    return {
      periodKey: `${year}-${month}`,
      periodLabel: `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`
    };
  };

  const parseStarposSalesImport = (rawText, fileName = '') => {
    const source = String(rawText || '').trim();
    if (!source) return { ok: false, error: 'Archivo vacío.' };

    const lines = source
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);

    const filterLine = lines.find(line => /Filtro:/i.test(line) && /Sucursal/i.test(line)) || '';
    const branchMatch = filterLine.match(/Sucursal\s+(.+)$/i);
    const branch = branchMatch ? branchMatch[1].trim() : 'Sucursal no identificada';

    const { periodKey, periodLabel } = normalizePeriodFromText(filterLine || source);

    const findLine = (needle) => lines.find(line => line.toUpperCase().includes(needle.toUpperCase())) || '';
    const extractMoneyValues = (line) => {
      const moneyTokens = line.match(/-?\$?\s*\d[\d\.]*,\d+/g) || [];
      return moneyTokens.map(token => cleanMonto(token.replace('$', '').trim()));
    };

    const totalLine = findLine('Monto Total');
    const ticketsLine = findLine('Cant. comp');
    const avgLine = findLine('Comp. promedio');

    const totalSalesValues = extractMoneyValues(totalLine);
    const avgTicketValues = extractMoneyValues(avgLine);
    const ticketCountMatches = ticketsLine.match(/\[(\d+)\]/g) || [];

    let totalSales = totalSalesValues.length ? totalSalesValues[totalSalesValues.length - 1] : 0;
    const avgTicket = avgTicketValues.length ? avgTicketValues[avgTicketValues.length - 1] : 0;
    const ticketsCount = ticketCountMatches.length
      ? Number(ticketCountMatches[ticketCountMatches.length - 1].replace(/[^0-9]/g, ''))
      : 0;

    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const dayTotals = dayNames.reduce((acc, day) => ({ ...acc, [day]: 0 }), {});

    const parseWeekdayValuesFromRow = (rowCells, dayIndexes) => {
      const values = {};
      let numericCells = 0;

      dayNames.forEach(day => {
        const dayIdx = dayIndexes[day];
        if (dayIdx === undefined || dayIdx >= rowCells.length) return;

        const rawValue = String(rowCells[dayIdx] || '').trim();
        if (/\d/.test(rawValue)) numericCells += 1;
        values[day] = cleanMonto(rawValue);
      });

      return { values, numericCells };
    };

    const totalLineIndex = lines.findIndex(line => /Monto\s*Total/i.test(line));
    const dayHeaderCandidates = lines
      .map((line, index) => {
        const headerCells = splitCsvLikeLine(line);
        const dayIndexes = {};
        let found = 0;

        headerCells.forEach((cell, cellIndex) => {
          const weekday = weekdayFromHeaderCell(cell);
          if (!weekday || dayIndexes[weekday] !== undefined) return;
          dayIndexes[weekday] = cellIndex;
          found += 1;
        });

        return { index, dayIndexes, found };
      })
      .filter(item => item.found >= 5);

    let selectedDayHeader = null;
    let selectedTotalsFromRow = null;
    if (dayHeaderCandidates.length > 0) {
      const scoredCandidates = dayHeaderCandidates.map(candidate => {
        const maxRowsToScan = Math.min(lines.length, candidate.index + 150);
        let bestMatch = null;

        for (let i = candidate.index + 1; i < maxRowsToScan; i += 1) {
          const rawLine = lines[i];
          const rowCells = splitCsvLikeLine(rawLine);
          const rowLabel = normalizeTextToken(rowCells[0] || '');

          if (!rowCells.length || rowCells.length <= 1) continue;

          const looksLikeTotalRow = rowLabel.includes('MONTOTOTAL') || rowLabel === 'TOTAL' || rowLabel.startsWith('TOTALGENERAL');
          if (!looksLikeTotalRow) continue;

          const { values, numericCells } = parseWeekdayValuesFromRow(rowCells, candidate.dayIndexes);
          if (numericCells < 5) continue;

          const weeklySum = dayNames.reduce((acc, day) => acc + Math.max(0, cleanMonto(values[day])), 0);
          const diff = totalSales > 0 ? Math.abs(weeklySum - totalSales) : 0;

          const score = {
            rowIndex: i,
            values,
            weeklySum,
            diff,
            relativeDiff: totalSales > 0 ? diff / totalSales : 0
          };

          if (!bestMatch) {
            bestMatch = score;
            continue;
          }

          if (score.diff < bestMatch.diff) {
            bestMatch = score;
            continue;
          }

          if (score.diff === bestMatch.diff && score.rowIndex < bestMatch.rowIndex) {
            bestMatch = score;
          }
        }

        return {
          candidate,
          bestMatch,
          distanceToTotal: totalLineIndex >= 0 ? Math.abs(candidate.index - totalLineIndex) : Number.MAX_SAFE_INTEGER
        };
      });

      const withTotalRows = scoredCandidates.filter(item => item.bestMatch);
      if (withTotalRows.length > 0) {
        const bestCandidate = withTotalRows.reduce((best, current) => {
          if (!best) return current;

          if (current.bestMatch.diff < best.bestMatch.diff) return current;
          if (current.bestMatch.diff > best.bestMatch.diff) return best;

          if (current.bestMatch.relativeDiff < best.bestMatch.relativeDiff) return current;
          if (current.bestMatch.relativeDiff > best.bestMatch.relativeDiff) return best;

          return current.distanceToTotal < best.distanceToTotal ? current : best;
        }, null);

        selectedDayHeader = bestCandidate.candidate;
        selectedTotalsFromRow = bestCandidate.bestMatch.values;
      }

      if (!selectedDayHeader && totalLineIndex >= 0) {
        const candidatesBeforeTotal = dayHeaderCandidates.filter(item => item.index <= totalLineIndex);
        if (candidatesBeforeTotal.length) {
          selectedDayHeader = candidatesBeforeTotal.reduce((best, current) => {
            if (!best) return current;
            const bestDistance = totalLineIndex - best.index;
            const currentDistance = totalLineIndex - current.index;
            return currentDistance < bestDistance ? current : best;
          }, null);
        }
      }

      if (!selectedDayHeader) selectedDayHeader = dayHeaderCandidates[0];
    }

    if (selectedDayHeader) {
      const maxRowsToScan = Math.min(lines.length, selectedDayHeader.index + 120);
      let loadedFromTotalRow = false;
      if (selectedTotalsFromRow) {
        dayNames.forEach(day => {
          dayTotals[day] = selectedTotalsFromRow[day] || 0;
        });
        loadedFromTotalRow = true;
      }

      if (!loadedFromTotalRow) {
      let emptyDataStreak = 0;

      for (let i = selectedDayHeader.index + 1; i < maxRowsToScan; i += 1) {
        const rawLine = lines[i];
        const rowCells = splitCsvLikeLine(rawLine);
        const rowLabel = normalizeTextToken(rowCells[0] || '');

        if (!rowCells.length || rowCells.length <= 1) {
          emptyDataStreak += 1;
          if (emptyDataStreak >= 2) break;
          continue;
        }

        if (rowLabel.startsWith('TOTAL')) break;

        if (/Cant\.?\s*comp|Comp\.?\s*promedio|Ticket\s*promedio|Filtro:/i.test(rawLine)) {
          break;
        }

        let parsedValuesInRow = 0;
        dayNames.forEach(day => {
          const dayIdx = selectedDayHeader.dayIndexes[day];
          if (dayIdx === undefined || dayIdx >= rowCells.length) return;

          const value = cleanMonto(rowCells[dayIdx]);
          if (Math.abs(value) > 0) {
            dayTotals[day] += value;
            parsedValuesInRow += 1;
          }
        });

        emptyDataStreak = parsedValuesInRow === 0 ? emptyDataStreak + 1 : 0;
        if (emptyDataStreak >= 3) break;
      }
      }
    }

    const weekSumFromDays = dayNames.reduce((acc, day) => acc + Math.max(0, cleanMonto(dayTotals[day])), 0);

    if (totalSalesValues.length > 0 && weekSumFromDays > 0) {
      totalSales = totalSalesValues.reduce((best, current) => {
        const bestDiff = Math.abs(best - weekSumFromDays);
        const currentDiff = Math.abs(current - weekSumFromDays);
        return currentDiff < bestDiff ? current : best;
      }, totalSalesValues[0]);
    } else if (totalSales <= 0 && weekSumFromDays > 0) {
      totalSales = weekSumFromDays;
    }

    const bestDayEntry = Object.entries(dayTotals).sort((a, b) => b[1] - a[1])[0];
    const bestWeekday = bestDayEntry && bestDayEntry[1] > 0 ? bestDayEntry[0] : 'Sin datos';

    const normalizeHourLabel = (value) => {
      const raw = String(value || '').trim();
      if (!raw) return null;

      const normalized = raw
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .replace(/\./g, ':');

      const amPmMatch = normalized.match(/\b(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b/i);
      if (amPmMatch) {
        let hour = Number(amPmMatch[1]);
        const minute = Number(amPmMatch[2] || '0');
        const marker = amPmMatch[3].toUpperCase();
        if (hour >= 1 && hour <= 12 && minute >= 0 && minute <= 59) {
          if (marker === 'PM' && hour !== 12) hour += 12;
          if (marker === 'AM' && hour === 12) hour = 0;
          return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        }
      }

      const rangeMatch = normalized.match(/(\d{1,2})(?::(\d{2}))?\s*(?:HS?|H)?\s*(?:-|A|AL|\/|HASTA)\s*(\d{1,2})(?::(\d{2}))?\s*(?:HS?|H)?/i);
      if (rangeMatch) {
        const h1 = Number(rangeMatch[1]);
        const m1 = Number(rangeMatch[2] || '0');
        const h2 = Number(rangeMatch[3]);
        const m2 = Number(rangeMatch[4] || '0');
        if (h1 >= 0 && h1 <= 23 && h2 >= 0 && h2 <= 23 && m1 >= 0 && m1 <= 59 && m2 >= 0 && m2 <= 59) {
          return `${String(h1).padStart(2, '0')}:${String(m1).padStart(2, '0')}-${String(h2).padStart(2, '0')}:${String(m2).padStart(2, '0')}`;
        }
      }

      const withHsMatch = normalized.match(/\b(\d{1,2})(?::(\d{2}))?\s*(?:HS|H)\b/i);
      if (withHsMatch) {
        const hour = Number(withHsMatch[1]);
        const minute = Number(withHsMatch[2] || '0');
        if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
          return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        }
      }

      const singleMatch = normalized.match(/(^|\s)(\d{1,2})(?::(\d{2}))?(\s|$)/);
      if (singleMatch) {
        const hour = Number(singleMatch[2]);
        const minute = Number(singleMatch[3] || '0');
        if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
          return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        }
      }

      return null;
    };

    let bestHour = 'Sin datos';
    const hourlyTotals = {};
    const looksLikeBestHourLabel = (value) => {
      const token = normalizeTextToken(value);
      if (!token) return false;
      const hasHour = token.includes('HORA') || token.includes('HORARIO') || token.includes('FRANJA') || token.includes('TRAMO');
      const hasStrength = token.includes('PICO') || token.includes('FUERTE') || token.includes('MAX') || token.includes('MAYOR') || token.includes('MAS') || token.includes('VENTA');
      return hasHour && hasStrength;
    };

    for (let i = 0; i < lines.length && bestHour === 'Sin datos'; i += 1) {
      const line = lines[i];
      const cells = splitCsvLikeLine(line);

      if (/hora\s+m[aá]s\s+fuerte|hora\s+pico|franja\s+horaria\s+fuerte|tramo\s+horario\s+pico|m[aá]xima\s+hora/i.test(line)) {
        const directHour = normalizeHourLabel(line);
        if (directHour) {
          bestHour = directHour;
          break;
        }
      }

      for (let cellIndex = 0; cellIndex < cells.length && bestHour === 'Sin datos'; cellIndex += 1) {
        if (!looksLikeBestHourLabel(cells[cellIndex])) continue;

        const directCellHour = normalizeHourLabel(cells[cellIndex]);
        if (directCellHour) {
          bestHour = directCellHour;
          break;
        }

        const neighbors = [cells[cellIndex + 1], cells[cellIndex + 2], cells[cellIndex - 1], line];
        const neighborHour = neighbors
          .map(value => normalizeHourLabel(value))
          .find(Boolean);

        if (neighborHour) {
          bestHour = neighborHour;
          break;
        }
      }
    }

    if (bestHour === 'Sin datos') {
      const hourHeaderCandidates = lines
        .map((line, index) => {
          const cells = splitCsvLikeLine(line);
          let hourIdx = -1;
          let valueIdx = -1;

          cells.forEach((cell, cellIndex) => {
            const token = normalizeTextToken(cell);
            if (hourIdx === -1 && token.includes('HORA')) hourIdx = cellIndex;
            if (valueIdx === -1 && (token.includes('MONTO') || token.includes('VENTA') || token.includes('TOTAL') || token.includes('IMPORTE'))) {
              valueIdx = cellIndex;
            }
          });

          if (hourIdx < 0 || valueIdx < 0 || hourIdx === valueIdx) return null;
          return { index, hourIdx, valueIdx };
        })
        .filter(Boolean);

      for (const header of hourHeaderCandidates) {
        let matchedRows = 0;
        let nonHourStreak = 0;
        const maxRowsToScan = Math.min(lines.length, header.index + 120);

        for (let i = header.index + 1; i < maxRowsToScan; i += 1) {
          const rowCells = splitCsvLikeLine(lines[i]);
          if (rowCells.length <= Math.max(header.hourIdx, header.valueIdx)) {
            if (matchedRows > 0) nonHourStreak += 1;
            if (nonHourStreak >= 3) break;
            continue;
          }

          const hourLabel = normalizeHourLabel(rowCells[header.hourIdx]);
          if (!hourLabel) {
            if (matchedRows > 0) nonHourStreak += 1;
            if (nonHourStreak >= 3) break;
            continue;
          }

          const amount = cleanMonto(rowCells[header.valueIdx]);
          if (Math.abs(amount) > 0) {
            hourlyTotals[hourLabel] = (hourlyTotals[hourLabel] || 0) + amount;
          }

          matchedRows += 1;
          nonHourStreak = 0;
        }

        if (Object.keys(hourlyTotals).length > 0) break;
      }

      const bestHourEntry = Object.entries(hourlyTotals).sort((a, b) => b[1] - a[1])[0];
      if (bestHourEntry && bestHourEntry[1] > 0) bestHour = bestHourEntry[0];
    }

    if (totalSales <= 0 && avgTicket <= 0 && ticketsCount <= 0) {
      return { ok: false, error: 'No se encontraron métricas válidas en el archivo.' };
    }

    return {
      ok: true,
      docId: `${branch.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${periodKey}`,
      data: {
        source: 'starpos-market',
        sourceFile: fileName || 'manual',
        branch,
        periodKey,
        periodLabel,
        totalSales,
        ticketsCount,
        avgTicket,
        weekdayTotals: dayTotals,
        bestWeekday,
        hourlyTotals,
        bestHour,
        importedAt: new Date().toISOString()
      }
    };
  };

  const handleImportSalesStats = async (rawText, fileName = '') => {
    const source = (rawText ?? salesImportText).trim();
    if (!db || !source) return;

    setSavingSalesImport(true);
    try {
      const parsed = parseStarposSalesImport(source, fileName);
      if (!parsed.ok) {
        alert(parsed.error || 'No se pudo interpretar el archivo.');
        return;
      }

      const dayOrder = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
      const weekdayTotals = parsed?.data?.weekdayTotals || {};
      const weeklySum = dayOrder.reduce((acc, day) => acc + cleanMonto(weekdayTotals[day]), 0);
      const dayBreakdown = dayOrder
        .map(day => `${day.slice(0, 3)}: ${formatCurrency(cleanMonto(weekdayTotals[day]))}`)
        .join(' | ');

      const continueImport = confirm(
        `Vista previa de importación:\n\n` +
        `Sucursal: ${parsed.data.branch}\n` +
        `Período: ${parsed.data.periodLabel} (${parsed.data.periodKey})\n` +
        `Día más fuerte: ${parsed.data.bestWeekday || 'Sin datos'}\n` +
        `Hora más fuerte: ${parsed.data.bestHour || 'Sin datos'}\n` +
        `Suma semana: ${formatCurrency(weeklySum)}\n` +
        `Monto total: ${formatCurrency(parsed.data.totalSales)}\n\n` +
        `${dayBreakdown}\n\n` +
        `¿Guardar en Firebase?`
      );

      if (!continueImport) return;

      const batch = writeBatch(db);
      const targetRef = doc(collection(db, 'estadisticas_ventas'), parsed.docId);
      batch.set(targetRef, parsed.data);
      await batch.commit();

      setShowSalesImportModal(false);
      setSalesImportText('');
      await fetchData('economico');
      alert(`Importación OK: ${parsed.data.branch} - ${parsed.data.periodLabel}`);
    } catch (e) {
      alert('No se pudo guardar en Firebase.');
    } finally {
      setSavingSalesImport(false);
    }
  };

  const handleSalesFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setSalesImportText(text);
      const ok = confirm(`Se cargó "${file.name}". ¿Importar ahora al módulo Económico?`);
      if (ok) await handleImportSalesStats(text, file.name);
    } catch (err) {
      alert('No se pudo leer el archivo.');
    } finally {
      if (salesFileInputRef.current) salesFileInputRef.current.value = '';
    }
  };

  const handleDeleteSelectedSalesStats = async () => {
    if (!db || !selectedSalesStats || deletingSalesImport) return;

    const periodText = `${selectedSalesStats.periodLabel || selectedSalesStats.periodKey || 'Período desconocido'}`;
    const branchText = `${selectedSalesStats.branch || 'Sucursal no identificada'}`;
    const ok = confirm(`Se eliminará la importación de StarPOS para ${branchText} - ${periodText}. ¿Continuar?`);
    if (!ok) return;

    try {
      setDeletingSalesImport(true);
      const docId = selectedSalesStats.id || `${String(selectedSalesStats.branch || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${selectedSalesStats.periodKey}`;
      await deleteDoc(doc(collection(db, 'estadisticas_ventas'), docId));
      setSelectedSalesPeriodKey(null);
      await fetchData('economico');
      alert(`Importación eliminada: ${branchText} - ${periodText}`);
    } catch (e) {
      alert('No se pudo eliminar la importación seleccionada.');
    } finally {
      setDeletingSalesImport(false);
    }
  };

  const salesStatsSeries = useMemo(() => {
    const source = Array.isArray(salesStats) ? salesStats : [];
    return [...source]
      .filter(item => item?.periodKey)
      .sort((a, b) => String(a.periodKey).localeCompare(String(b.periodKey)));
  }, [salesStats]);

  const selectedSalesStats = useMemo(() => {
    if (!salesStatsSeries.length) return null;

    if (selectedSalesPeriodKey) {
      const chosen = salesStatsSeries.find(item => item.periodKey === selectedSalesPeriodKey);
      if (chosen) return chosen;
    }

    return salesStatsSeries[salesStatsSeries.length - 1];
  }, [salesStatsSeries, selectedSalesPeriodKey]);

  const selectedBestHour = useMemo(() => {
    if (!selectedSalesStats) return 'Sin datos';
    if (selectedSalesStats.bestHour) return selectedSalesStats.bestHour;

    const hourlySource = selectedSalesStats.hourlyTotals;
    if (!hourlySource || typeof hourlySource !== 'object') return 'Sin datos';

    const bestEntry = Object.entries(hourlySource)
      .map(([hour, total]) => [hour, cleanMonto(total)])
      .sort((a, b) => b[1] - a[1])[0];

    return bestEntry && bestEntry[1] > 0 ? bestEntry[0] : 'Sin datos';
  }, [selectedSalesStats]);

  const salesTrendData = useMemo(() => {
    return salesStatsSeries.map(item => {
      const keyMatch = String(item.periodKey || '').match(/(\d{4})-(\d{2})/);
      let periodShort = item.periodLabel || item.periodKey || '';

      if (keyMatch) {
        const year = Number(keyMatch[1]);
        const month = Number(keyMatch[2]);
        const date = new Date(year, month - 1, 1);
        const shortMonth = date.toLocaleString('es-AR', { month: 'short' }).replace('.', '');
        periodShort = `${shortMonth.charAt(0).toUpperCase() + shortMonth.slice(1)} ${year}`;
      }

      return {
        periodKey: item.periodKey,
        period: item.periodLabel || item.periodKey,
        periodShort,
        ticketPromedio: cleanMonto(item.avgTicket),
        tickets: cleanMonto(item.ticketsCount)
      };
    });
  }, [salesStatsSeries]);

  const handleSalesDotClick = (periodKey) => {
    if (!periodKey) return;
    setSelectedSalesPeriodKey(periodKey);
  };

  const renderSalesDot = (props) => {
    const { cx, cy, payload } = props;
    if (typeof cx !== 'number' || typeof cy !== 'number') return null;
    const isSelected = selectedSalesPeriodKey === payload?.periodKey;

    return (
      <g
        onClick={(event) => {
          event.stopPropagation();
          handleSalesDotClick(payload?.periodKey);
        }}
        style={{ cursor: 'pointer' }}
      >
        <circle cx={cx} cy={cy} r={isSelected ? 7 : 5} fill="#fff" stroke="#7c3aed" strokeWidth={isSelected ? 3 : 2} />
      </g>
    );
  };

  const handleAddFactura = async (e) => {
    e.preventDefault();
    if (!db || savingFactura) return;
    setSavingFactura(true);
    const formData = new FormData(e.target);
    const provId = formData.get('providerId');
    const prov = proveedores.find(p => p.id === provId);
    
    // Lógica Actualizada: Usamos Importe Final como la deuda total.
    const total = cleanMonto(formData.get('totalAmount'));
    const tax = cleanMonto(formData.get('taxAmount'));
    const initialPayment = cleanMonto(formData.get('initialPayment'));
    // Neto es implícito (Total - IVA), no necesitamos guardarlo si no queremos, pero lo guardamos para consistencia.
    const net = total - tax;
    
    const factData = {
        invoiceDate: formData.get('invoiceDate'),
        dueDate: formData.get('dueDate'),
        providerId: provId,
        providerName: prov ? prov.name : 'Desconocido',
        invoiceNumber: formData.get('invoiceNumber'),
        description: formData.get('description'),
        netAmount: net, 
        taxes: tax,
        totalAmount: total, 
        partialPayment: initialPayment,
    };

    try { 
        if (editingFactura) {
            // Modo Edición
            await updateDoc(doc(db, 'facturas', editingFactura.id), factData);
        } else {
            // Modo Creación
            await addDoc(collection(db, 'facturas'), { ...factData, status: 'Pendiente' }); 
        }
        fetchData('proveedores'); 
        setNewInvoiceData({ totalAmount: '', taxAmount: '', initialPayment: '' }); 
        setShowFacturaModal(false);
        setEditingFactura(null);
    } 
    catch (e) { alert("Error al guardar"); } 
    finally { setSavingFactura(false); }
  };

  const handleAddPago = async (e) => {
    e.preventDefault();
    if (!db || saving) return;
    setSaving(true);
    const formData = new FormData(e.target);
    const provId = formData.get('providerId');
    const prov = proveedores.find(p => p.id === provId);

    const nuevoPago = {
        date: formData.get('date'),
        providerId: provId,
        providerName: prov ? prov.name : 'Desconocido',
        amount: cleanMonto(formData.get('amount')),
        method: formData.get('method'),
        description: formData.get('description'),
        type: 'payment' // Marker para distinguir
    };

    try { 
        if (editingPago) {
            await updateDoc(doc(db, 'pagos', editingPago.id), nuevoPago);
        } else {
            await addDoc(collection(db, 'pagos'), nuevoPago); 
        }
        fetchData('proveedores'); 
        setShowPagoModal(false);
        setEditingPago(null);
    } 
    catch (e) { alert("Error al guardar pago"); } 
    finally { setSaving(false); }
  };

  const handleDeletePago = async (id) => {
    if (!confirm("¿Borrar pago?")) return;
    try { await deleteDoc(doc(db, 'pagos', id)); fetchData('proveedores'); } catch(e){ console.error(e); }
  };

  const handleDeleteFactura = async (id) => {
    if (!confirm("¿Borrar factura?")) return;
    try { await deleteDoc(doc(db, 'facturas', id)); fetchData('proveedores'); } catch(e){ console.error(e); }
  };

  const handleDeleteProveedor = async (id) => {
    if (!confirm("¿Borrar proveedor?")) return;
    try { await deleteDoc(doc(db, 'proveedores', id)); fetchData('proveedores'); } catch(e){ console.error(e); }
  };

  // --- LÓGICA DE EXPORTACIÓN AVANZADA ---
  const handleRunExport = (e) => {
    e.preventDefault();
    if (!proveedoresStats?.facturasCalculadas) return;

    let dataToExport = proveedoresStats.facturasCalculadas;

    // Filtro por Proveedor
    if (exportConfig.providerId) {
        dataToExport = dataToExport.filter(f => f.providerId === exportConfig.providerId);
    }
    
    // Filtrado de fechas usando el Timestamp inteligente
    if (exportConfig.dateFrom) {
        const fromTs = new Date(exportConfig.dateFrom + 'T00:00:00').getTime();
        dataToExport = dataToExport.filter(f => f.rawDateTs >= fromTs);
    }

    if (exportConfig.dateTo) {
        const toTs = new Date(exportConfig.dateTo + 'T23:59:59').getTime();
        dataToExport = dataToExport.filter(f => f.rawDateTs <= toTs);
    }

    if (dataToExport.length === 0) {
        alert("No hay datos que coincidan con los filtros seleccionados.");
        return;
    }

    // Configuración para Excel en Español (Latam)
    const SEPARATOR = ";"; 
    
    // Helper para formatear números para Excel (1000.50 -> 1000,50)
    // BLINDAJE: Si es NaN, devuelve 0,00
    const fmtNum = (num) => {
        if (!num && num !== 0) return "0,00";
        if (isNaN(num)) return "0,00";
        return num.toFixed(2).replace('.', ',');
    };

    // Encabezados
    const headers = [
        "Fecha", 
        "Vencimiento", 
        "Proveedor", 
        "Nro Factura", 
        "Detalle", 
        "Total Fac.", 
        "IVA", 
        "Pagado (Imputado)", 
        "Saldo Gral", 
        "Estado"
    ];

    // Construcción del contenido CSV
    const csvRows = [];
    csvRows.push(headers.join(SEPARATOR));

    dataToExport.forEach(f => {
        const row = [
            formatDate(f.invoiceDate),
            f.dueDate ? formatDate(f.dueDate) : '-',
            `"${f.providerName}"`, // Comillas para proteger textos con separadores
            `"${f.invoiceNumber}"`,
            `"${f.description || ''}"`,
            fmtNum(f.total),
            fmtNum(f.taxes),
            fmtNum(f.paidAllocated),
            fmtNum(f.debt),
            f.computedStatus
        ];
        csvRows.push(row.join(SEPARATOR));
    });

    const csvString = csvRows.join("\n");
    const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); 
    link.setAttribute("href", url); 
    
    // Nombre del archivo dinámico
    const provName = exportConfig.providerId 
        ? (proveedores.find(p => p.id === exportConfig.providerId)?.name || 'Proveedor').replace(/\s+/g, '_')
        : 'Todos';
    const dateRange = exportConfig.dateFrom ? `_desde_${exportConfig.dateFrom}` : '';
    
    link.setAttribute("download", `Reporte_Pampa_${provName}${dateRange}.csv`);
    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link);
    
    setShowExportModal(false);
  };

  const openEditModal = (prov) => { setEditingProv(prov); setShowProvModal(true); };
  const openNewModal = () => { setEditingProv(null); setShowProvModal(true); };

  // --- MEMOS DE CÁLCULO ---
  const economicStats = useMemo(() => {
    if (currentTab !== 'economico') return null;
    const filtered = data.filter(d => (selectedBranch === 'Todas' || d.Sucursal === selectedBranch) && (selectedMonth === 'Acumulado' || d.Mes === selectedMonth));
    const sum = (tipo) => filtered.filter(r => r.Concepto?.toLowerCase().includes(tipo)).reduce((a, b) => a + Math.abs(b.Monto || 0), 0);
    const ventasNetas = sum('venta') - sum('comision');
    const margenBruto = ventasNetas - sum('cmv');
    const totalGastos = sum('gasto');
    const ebitda = margenBruto - totalGastos;
    const margenPct = ventasNetas > 0 ? (ebitda/ventasNetas)*100 : 0;
    const pesoGastos = ventasNetas > 0 ? (sum('gasto')/ventasNetas)*100 : 0;
    const margenBrutoPct = ventasNetas > 0 ? (margenBruto/ventasNetas)*100 : 0;
    const ratio = ventasNetas > 0 ? margenBruto / ventasNetas : 0;
    const puntoEquilibrio = ratio > 0 ? totalGastos / ratio : 0;
    return { ventasNetas, ebitda, margenPct, totalGastos, margenBruto, puntoEquilibrio, pesoGastosFijos: pesoGastos, margenBrutoPct };
  }, [data, selectedBranch, selectedMonth, currentTab]);

  const financialStats = useMemo(() => {
    if (currentTab !== 'financiero') return null;
    const filtered = data.filter(d => selectedMonth === 'Acumulado' || d.Mes === selectedMonth);
    const calc = (t) => filtered.filter(r => r.Tipo?.toLowerCase().includes(t)).reduce((a,b) => a + (b.Entrada||0) - (b.Salida||0), 0);
    return { 
        resultadoOperativo: calc('operativo'), cajaComprometida: calc('comprometida'), 
        cajaLibreReal: calc('operativo')+calc('comprometida'), personalNeto: calc('personal'),
        financiamientoNeto: calc('financiamiento'), dependenciaFinanciera: calc('financiamiento')-calc('aporte'),
        cajaRealFinal: calc('operativo')+calc('comprometida')+calc('personal')+calc('financiamiento')
    };
  }, [data, selectedMonth, currentTab]);

  const chartData = useMemo(() => {
    if (currentTab === 'economico' && economicStats) {
      const waterfall = [
        { name: '1. Ingresos', valor: economicStats.ventasNetas, base: 0, fill: '#3b82f6', label: 'Ventas' },
        { name: '2. Mercadería', valor: (economicStats.ventasNetas - economicStats.margenBruto), base: Math.max(0, economicStats.margenBruto), fill: '#f97316', label: '- Costo' },
        { name: '3. Margen', valor: economicStats.margenBruto, base: 0, fill: '#6366f1', label: '= Margen' },
        { name: '4. Gastos', valor: economicStats.totalGastos, base: Math.max(0, economicStats.ebitda), fill: '#ef4444', label: '- Gastos' },
        { name: '5. EBITDA', valor: economicStats.ebitda, base: 0, fill: '#10b981', label: '= Resultado' }
      ];
      
      const branchData = data.filter(d => selectedBranch === 'Todas' || d.Sucursal === selectedBranch);
      const allMonths = [...new Set(branchData.map(d => d.Mes))].filter(Boolean).sort();

      const trend = allMonths.map(month => {
          const monthData = branchData.filter(d => d.Mes === month);
          const sum = (tipo) => monthData.filter(r => r.Concepto?.toLowerCase().includes(tipo)).reduce((a, b) => a + Math.abs(b.Monto || 0), 0);
          const ventas = sum('venta') - sum('comision');
          const cmv = sum('cmv');
          const gastos = sum('gasto');
          const margen = ventas - cmv;
          const ebitda = margen - gastos;
          const ratio = ventas > 0 ? margen / ventas : 0;
          const equilibrio = ratio > 0 ? gastos / ratio : 0;
          return {
              name: formatPeriod(month), 
              rawMonth: month,
              ventas,
              equilibrio,
              ebitda
          };
      });
      return { trend, waterfall };
    }
    return null;
  }, [data, economicStats, currentTab, selectedBranch]);

  // --- KPI PROVEEDORES (LÓGICA CLEARING/FIFO) ---
  const proveedoresStats = useMemo(() => {
    if (currentTab !== 'proveedores') return null;
    
    // 1. Agrupar Todo por Proveedor
    const facturasPorProv = {};
    const pagosPorProv = {};

    facturas.forEach(f => {
      const key = f.providerId || 'unknown';
      if (!facturasPorProv[key]) facturasPorProv[key] = [];
      facturasPorProv[key].push(f);
    });

    // Sumar pagos sueltos (de la nueva colección)
    pagos.forEach(p => {
      const key = p.providerId || 'unknown';
      if (!pagosPorProv[key]) pagosPorProv[key] = 0;
      pagosPorProv[key] += cleanMonto(p.amount);
    });

    let todasLasFacturasCalculadas = [];
    let totalIvaCompras = 0;
    let totalCreditoGlobal = 0; // Acumulador de saldos a favor
    let resumenCuentas = [];

    Object.keys(facturasPorProv).forEach(provId => {
       const grupoFacturas = facturasPorProv[provId];
       const provName = grupoFacturas[0]?.providerName || 'Desconocido';
       
       // !!! IMPORTANT: Ordenar usando el parser inteligente para que sea cronológico real
       grupoFacturas.sort((a, b) => {
           const dA = parseSmartDate(a.invoiceDate);
           const dB = parseSmartDate(b.invoiceDate);
           return (dA && dB) ? dA - dB : 0;
       });

       let billetera = pagosPorProv[provId] || 0;
       let deudaTotalProveedor = 0;

       // CORRECCIÓN CRÍTICA: USAR cleanMonto en LUGAR DE parseFloat PARA EVITAR NaN CON COMAS
       grupoFacturas.forEach(f => {
          billetera += cleanMonto(f.partialPayment);
          totalIvaCompras += cleanMonto(f.taxes);
          
          let totalFac = cleanMonto(f.totalAmount);
          if (!totalFac) totalFac = cleanMonto(f.netAmount) + cleanMonto(f.taxes);
          deudaTotalProveedor += totalFac;
       });

       const grupoProcesado = grupoFacturas.map(f => {
          const net = cleanMonto(f.netAmount);
          const tax = cleanMonto(f.taxes);
          let total = net + tax;
          if (f.totalAmount) total = cleanMonto(f.totalAmount); 
          
          // Pre-calcular Timestamp para filtros rápidos
          const dateObj = parseSmartDate(f.invoiceDate);
          const rawDateTs = dateObj ? dateObj.getTime() : 0;

          // Aplicar Clearing
          let imputado = 0;
          if (billetera >= total) {
              imputado = total;
              billetera -= total;
          } else if (billetera > 0) {
              imputado = billetera;
              billetera = 0;
          }
           
          const saldo = total - imputado;
          let computedStatus = 'Pendiente';
          if (saldo <= 0.5) computedStatus = 'Pagado'; 
          else if (imputado > 0) computedStatus = 'Parcial';

          return { ...f, total, paidAllocated: imputado, debt: saldo, computedStatus, rawDateTs };
       });

       let saldoFinalProveedor = 0;
       if (billetera > 0) {
           totalCreditoGlobal += billetera;
           saldoFinalProveedor = -billetera; 
       } else {
           saldoFinalProveedor = grupoProcesado.reduce((acc, f) => acc + f.debt, 0);
       }

       resumenCuentas.push({
           id: provId,
           name: provName,
           balance: saldoFinalProveedor, 
           lastMov: grupoFacturas[grupoFacturas.length - 1]?.invoiceDate || '-'
       });

       todasLasFacturasCalculadas = [...todasLasFacturasCalculadas, ...grupoProcesado];
    });

    // Ordenar globalmente por fecha descendente
    todasLasFacturasCalculadas.sort((a, b) => b.rawDateTs - a.rawDateTs);
    
    const totalDeuda = todasLasFacturasCalculadas.reduce((acc, f) => acc + f.debt, 0);
    // Filtrar vencidos usando parser inteligente
    const now = new Date();
    const vencido = todasLasFacturasCalculadas.filter(f => {
        if (f.debt <= 0.5) return false;
        const dueDate = parseSmartDate(f.dueDate);
        return dueDate && dueDate < now;
    }).reduce((acc, f) => acc + f.debt, 0);
    
    // Top 5 Deudores
    const provDebt = {};
    todasLasFacturasCalculadas.forEach(f => {
       if(f.debt > 0.5) provDebt[f.providerName] = (provDebt[f.providerName] || 0) + f.debt;
    });
    const topDeudores = Object.entries(provDebt).map(([name, saldo]) => ({ nombre: name, saldo })).sort((a,b) => b.saldo - a.saldo).slice(0,5);

    // Vencimientos
    const vencimientosSemana = [
      { name: 'Vencido', deuda: vencido, fill: '#ef4444' },
      { name: 'A Vencer', deuda: totalDeuda - vencido, fill: '#f59e0b' }
    ];

    return { totalDeuda, totalIvaCompras, totalCreditoGlobal, vencido, topDeudores, vencimientosSemana, facturasCalculadas: todasLasFacturasCalculadas, resumenCuentas };
  }, [facturas, pagos, currentTab]);

  // Derived state for operations table
  const opsTableData = useMemo(() => {
    if (!proveedoresStats?.facturasCalculadas) return { currentData: [], totalPages: 0, totalCount: 0 };
    const invoiceNumberQuery = opsFilterInvoiceNumber.trim().toLowerCase();

    const paymentRows = pagos.map(p => {
      const dateObj = parseSmartDate(p.date);
      const rawDateTs = dateObj ? dateObj.getTime() : 0;
      return {
        id: `pago-${p.id}`,
        rowType: 'pago',
        paymentId: p.id,
        payment: p,
        method: p.method,
        invoiceDate: p.date,
        dueDate: null,
        providerId: p.providerId,
        providerName: p.providerName,
        invoiceNumber: p.method || 'Pago',
        description: p.description || 'Pago',
        total: cleanMonto(p.amount),
        taxes: 0,
        debt: 0,
        computedStatus: 'Pago',
        rawDateTs
      };
    });

    const combinedRows = [...proveedoresStats.facturasCalculadas, ...paymentRows];

    const filtered = combinedRows.filter(f => {
        const matchProv = opsFilterProvider ? f.providerId === opsFilterProvider : true;
        const matchInvoiceNumber = invoiceNumberQuery
          ? String(f.invoiceNumber || '').toLowerCase().includes(invoiceNumberQuery)
          : true;
        
        let matchDate = true;
        if (f.rawDateTs) {
            if (opsFilterDateFrom) {
                const fromTs = new Date(opsFilterDateFrom + 'T00:00:00').getTime();
                matchDate = matchDate && (f.rawDateTs >= fromTs);
            }
            if (opsFilterDateTo) {
                const toTs = new Date(opsFilterDateTo + 'T23:59:59').getTime();
                matchDate = matchDate && (f.rawDateTs <= toTs);
            }
        } else if (opsFilterDateFrom || opsFilterDateTo) {
            matchDate = false; // Si no hay fecha válida y se filtra por fecha, excluir
        }
        
        return matchProv && matchDate && matchInvoiceNumber;
    });

    filtered.sort((a, b) => (b.rawDateTs || 0) - (a.rawDateTs || 0));
    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / OPS_ITEMS_PER_PAGE);
    const currentData = filtered.slice((opsPage - 1) * OPS_ITEMS_PER_PAGE, opsPage * OPS_ITEMS_PER_PAGE);

    return { currentData, totalPages, totalCount };
  }, [proveedoresStats, pagos, opsFilterProvider, opsFilterDateFrom, opsFilterDateTo, opsFilterInvoiceNumber, opsPage]);

  const selectedProviderSummary = useMemo(() => {
    if (!opsFilterProvider || !proveedoresStats?.facturasCalculadas) return null;

    const items = proveedoresStats.facturasCalculadas.filter(f => f.providerId === opsFilterProvider);
    if (items.length === 0) return null;

    const providerName = items[0]?.providerName || proveedores.find(p => p.id === opsFilterProvider)?.name || 'Proveedor';
    const totalFacturado = items.reduce((acc, f) => acc + cleanMonto(f.total), 0);
    const totalIva = items.reduce((acc, f) => acc + cleanMonto(f.taxes), 0);
    const saldoFinal = proveedoresStats.resumenCuentas?.find(acc => acc.id === opsFilterProvider)?.balance ??
      items.reduce((acc, f) => acc + cleanMonto(f.debt), 0);
    const totalPagado = totalFacturado - saldoFinal;

    return { providerName, totalFacturado, totalPagado, saldoFinal, totalIva };
  }, [opsFilterProvider, proveedoresStats, proveedores]);

  // --- LÓGICA CUENTA CORRIENTE (LEDGER) ---
  const getProviderLedger = (providerId) => {
      // 1. Obtener Facturas (Debe)
      const provInvoices = facturas.filter(f => f.providerId === providerId).map(f => ({
          id: f.id,
          date: f.invoiceDate,
          type: 'Factura',
          description: `${f.invoiceNumber} - ${f.description || ''}`,
          debe: cleanMonto(f.totalAmount),
          haber: 0,
          rawDate: parseSmartDate(f.invoiceDate) || new Date(0) // Safe Date
      }));

      // 2. Obtener Pagos Sueltos (Haber)
      const provPayments = pagos.filter(p => p.providerId === providerId).map(p => ({
          id: p.id,
          date: p.date,
          type: 'Pago',
          description: `${p.method} - ${p.description || ''}`,
          debe: 0,
          haber: cleanMonto(p.amount),
          rawDate: parseSmartDate(p.date) || new Date(0)
      }));

      // 3. Obtener Pagos Iniciales de Facturas (Haber)
      const initialPayments = facturas.filter(f => f.providerId === providerId && cleanMonto(f.partialPayment) > 0).map(f => ({
          id: `init-${f.id}`,
          date: f.invoiceDate,
          type: 'Pago Inicial',
          description: `Entrega fac. ${f.invoiceNumber}`,
          debe: 0,
          haber: cleanMonto(f.partialPayment),
          rawDate: parseSmartDate(f.invoiceDate) || new Date(0)
      }));

      // 4. Unificar y Ordenar Cronológicamente
      const transactions = [...provInvoices, ...provPayments, ...initialPayments].sort((a, b) => a.rawDate - b.rawDate);

      // 5. Calcular Saldo Acumulado
      let runningBalance = 0;
      return transactions.map(t => {
          runningBalance += (t.debe - t.haber);
          return { ...t, balance: runningBalance };
      });
  };

  const selectedProviderName = useMemo(() => {
    if (!selectedAccountProvider) return '';
    return proveedores.find(p => p.id === selectedAccountProvider)?.name || 'Proveedor';
  }, [selectedAccountProvider, proveedores]);

  const selectedProviderLedger = useMemo(() => {
    if (!selectedAccountProvider) return [];
    return getProviderLedger(selectedAccountProvider);
  }, [selectedAccountProvider, facturas, pagos]);

  const selectedProviderAccountSummary = useMemo(() => {
    if (!selectedProviderLedger.length) {
      return { totalDebe: 0, totalHaber: 0, saldoFinal: 0, movimientos: 0 };
    }
    const totalDebe = selectedProviderLedger.reduce((acc, mov) => acc + cleanMonto(mov.debe), 0);
    const totalHaber = selectedProviderLedger.reduce((acc, mov) => acc + cleanMonto(mov.haber), 0);
    const saldoFinal = selectedProviderLedger[selectedProviderLedger.length - 1]?.balance || 0;
    return {
      totalDebe,
      totalHaber,
      saldoFinal,
      movimientos: selectedProviderLedger.length
    };
  }, [selectedProviderLedger]);

  const ivaComprasMesActual = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return (facturas || []).reduce((acc, factura) => {
      const invoiceDate = parseSmartDate(factura?.invoiceDate);
      if (!invoiceDate) return acc;
      if (invoiceDate.getMonth() !== currentMonth || invoiceDate.getFullYear() !== currentYear) return acc;
      return acc + cleanMonto(factura?.taxes);
    }, 0);
  }, [facturas]);

  const etiquetaMesActual = useMemo(() => {
    const now = new Date();
    const monthName = now.toLocaleString('es-AR', { month: 'long' });
    return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${now.getFullYear()}`;
  }, []);

  const debtDecisionBuckets = useMemo(() => {
    const source = proveedoresStats?.facturasCalculadas || [];
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dayMs = 24 * 60 * 60 * 1000;

    const buckets = [
      { key: 'vencido', label: 'Vencido', deuda: 0, fill: '#ef4444' },
      { key: 'd7', label: '0-7 días', deuda: 0, fill: '#f97316' },
      { key: 'd15', label: '8-15 días', deuda: 0, fill: '#f59e0b' },
      { key: 'd30', label: '16-30 días', deuda: 0, fill: '#eab308' },
      { key: 'd60', label: '31-60 días', deuda: 0, fill: '#22c55e' },
      { key: 'd60plus', label: '60+ días', deuda: 0, fill: '#14b8a6' }
    ];

    source.forEach(item => {
      const debt = cleanMonto(item?.debt);
      if (debt <= 0.5) return;
      const dueDateObj = parseSmartDate(item?.dueDate);
      if (!dueDateObj) return;

      const dueDate = new Date(dueDateObj.getFullYear(), dueDateObj.getMonth(), dueDateObj.getDate());
      const daysToDue = Math.floor((dueDate - todayStart) / dayMs);

      if (daysToDue < 0) buckets[0].deuda += debt;
      else if (daysToDue <= 7) buckets[1].deuda += debt;
      else if (daysToDue <= 15) buckets[2].deuda += debt;
      else if (daysToDue <= 30) buckets[3].deuda += debt;
      else if (daysToDue <= 60) buckets[4].deuda += debt;
      else buckets[5].deuda += debt;
    });

    const total = buckets.reduce((acc, b) => acc + b.deuda, 0);
    const urgente = buckets[0].deuda + buckets[1].deuda;
    const cortoPlazo = buckets[2].deuda + buckets[3].deuda;
    const largoPlazo = buckets[4].deuda + buckets[5].deuda;

    return { buckets, total, urgente, cortoPlazo, largoPlazo };
  }, [proveedoresStats]);

  const cuentasCardsData = useMemo(() => {
    const source = proveedoresStats?.resumenCuentas || [];
    const query = accountsSearch.trim().toLowerCase();
    const filtered = query
      ? source.filter(acc => String(acc.name || '').toLowerCase().includes(query))
      : source;

    return [...filtered].sort((a, b) => cleanMonto(b.balance) - cleanMonto(a.balance));
  }, [proveedoresStats, accountsSearch]);

  const cuentasSummary = useMemo(() => {
    const total = cuentasCardsData.length;
    const conDeuda = cuentasCardsData.filter(acc => cleanMonto(acc.balance) > 0.5).length;
    const alDia = cuentasCardsData.filter(acc => Math.abs(cleanMonto(acc.balance)) <= 0.5).length;
    const aFavor = cuentasCardsData.filter(acc => cleanMonto(acc.balance) < -0.5).length;
    return { total, conDeuda, alDia, aFavor };
  }, [cuentasCardsData]);

  const dashboardDebtCalendar = useMemo(() => {
    const monthStart = new Date(dashboardCalendarMonth.getFullYear(), dashboardCalendarMonth.getMonth(), 1);
    const monthEnd = new Date(dashboardCalendarMonth.getFullYear(), dashboardCalendarMonth.getMonth() + 1, 0);
    const daysInMonth = monthEnd.getDate();
    const weekStartOffset = (monthStart.getDay() + 6) % 7;
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const pendingItems = (proveedoresStats?.facturasCalculadas || [])
      .filter(f => cleanMonto(f.debt) > 0.5)
      .map(f => {
        const dueDateObj = parseSmartDate(f.dueDate);
        if (!dueDateObj) return null;
        const dueDate = new Date(dueDateObj.getFullYear(), dueDateObj.getMonth(), dueDateObj.getDate());
        return {
          id: f.id,
          providerName: f.providerName || 'Proveedor',
          invoiceNumber: f.invoiceNumber || '-',
          description: f.description || '',
          amount: cleanMonto(f.debt),
          dueDate
        };
      })
      .filter(Boolean);

    const monthlyItems = pendingItems
      .filter(item => item.dueDate >= monthStart && item.dueDate <= monthEnd)
      .sort((a, b) => a.dueDate - b.dueDate);

    const dayMap = new Map();
    monthlyItems.forEach(item => {
      const key = item.dueDate.getDate();
      if (!dayMap.has(key)) dayMap.set(key, []);
      dayMap.get(key).push(item);
    });

    const cells = [];
    for (let i = 0; i < weekStartOffset; i++) cells.push(null);

    for (let day = 1; day <= daysInMonth; day++) {
      const items = dayMap.get(day) || [];
      const amount = items.reduce((acc, item) => acc + item.amount, 0);
      const cellDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
      const isOverdue = amount > 0.5 && cellDate < todayStart;
      const isToday = cellDate.getTime() === todayStart.getTime();
      cells.push({ day, items, amount, isOverdue, isToday });
    }

    return { monthStart, monthlyItems, cells };
  }, [proveedoresStats, dashboardCalendarMonth]);

  const branches = ['Todas', ...new Set(data.map(d => d.Sucursal))].filter(Boolean);
  const months = ['Acumulado', ...new Set(data.map(d => d.Mes))].filter(Boolean).sort().reverse();

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Styles />
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 text-center border-b-8 border-amber-500">
          <div className="flex justify-center mb-8"><img src={LOGO_URL} alt="Logo" className="h-32 object-contain" /></div>
          <h2 className="text-3xl font-black text-slate-800 mb-2 uppercase">Fiambrerías Pampa</h2>
          <form onSubmit={handleLogin} className="space-y-4 mt-8">
            <input type="password" placeholder="Contraseña" className="w-full px-6 py-4 rounded-2xl border-2 text-center" onChange={(e) => setPassword(e.target.value)} />
            <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black">INGRESAR</button>
          </form>
        </div>
      </div>
    );
  }

  if (showModuleSelector) {
    const moduleOptions = [
      { key: 'economico', label: 'Económico', icon: BarChart2 },
      { key: 'financiero', label: 'Flujo de Fondos', icon: Banknote },
      { key: 'proveedores', label: 'Proveedores', icon: Briefcase }
    ];

    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <Styles />
        <div className="w-full max-w-5xl bg-white rounded-[2.5rem] shadow-xl border border-slate-200 p-8 md:p-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="h-14 w-14 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center overflow-hidden">
              <img src={LOGO_URL} alt="Logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ingreso</p>
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 uppercase">Elegí un módulo</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {moduleOptions.map(option => {
              const Icon = option.icon;
              const blocked = userRole !== 'gerente' && option.key !== 'proveedores';
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => handleSelectModule(option.key)}
                  disabled={blocked}
                  className={`rounded-3xl border p-8 text-left transition-all ${blocked ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed' : 'bg-slate-900 border-slate-900 hover:bg-slate-800 hover:shadow-md text-white'}`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${blocked ? 'bg-slate-100' : 'bg-white/10 text-white'}`}>
                    <Icon size={26} />
                  </div>
                  <p className="text-lg font-black uppercase tracking-wide">{option.label}</p>
                  <p className={`text-xs font-bold uppercase mt-2 ${blocked ? 'text-slate-400' : 'text-slate-200'}`}>{blocked ? 'Solo gerente' : 'Entrar'}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-20 font-sans text-slate-900">
      <Styles />
      <nav className="bg-white border-b border-slate-100 h-20 px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center overflow-hidden"><img src={LOGO_URL} alt="Logo" className="h-full w-full object-contain" /></div>
          <h1 className="font-black text-lg tracking-tighter uppercase leading-none hidden sm:block">{userRole === 'gerente' ? 'PANEL GERENCIAL' : 'MÓDULO DE CARGA'}</h1>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          {userRole === 'gerente' && (
            <>
              <TabButton active={currentTab === 'economico'} label="Económico" icon={BarChart2} onClick={() => setCurrentTab('economico')} />
              <TabButton active={currentTab === 'financiero'} label="Flujo de Fondos" icon={Banknote} onClick={() => setCurrentTab('financiero')} />
            </>
          )}
          <TabButton active={currentTab === 'proveedores'} label="Proveedores" icon={Briefcase} onClick={() => setCurrentTab('proveedores')} />
        </div>
        <div className="flex gap-4 items-center">
          <span className="text-[10px] font-bold uppercase bg-slate-100 px-3 py-1 rounded-full text-slate-500 flex items-center gap-1">
             {userRole === 'gerente' ? <UserCog size={14}/> : <User size={14}/>} {userRole}
          </span>
          <button onClick={() => fetchData(currentTab)} className="p-3 bg-slate-50 rounded-2xl hover:bg-slate-100"><RefreshCcw size={20}/></button>
          <button onClick={() => { setIsLoggedIn(false); setUserRole(null); setShowModuleSelector(false); }} className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl text-xs font-bold">SALIR</button>
        </div>
      </nav>

      {/* --- LOADER GLOBAL --- */}
      {loading && (
        <div className="fixed inset-0 bg-white/80 z-50 flex flex-col items-center justify-center backdrop-blur-sm animate-fade-in">
           <Loader className="w-10 h-10 text-slate-800 animate-spin mb-4" />
           <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Cargando Datos...</p>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-8 mt-10 space-y-10 animate-fade-in">
        
        {/* FILTROS COMUNES */}
        {userRole === 'gerente' && currentTab !== 'proveedores' && (
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-4 pl-2">
              <div className="bg-amber-100 p-2 rounded-xl text-amber-600"><Sliders size={20} /></div>
              <h3 className="font-black text-sm uppercase tracking-widest text-slate-600">Panel de Control: {currentTab.toUpperCase()}</h3>
            </div>
            <div className="flex flex-wrap gap-6">
              {currentTab === 'economico' && (
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Sucursal</label>
                  <div className="relative">
                    <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <select className="w-full bg-slate-50 hover:bg-slate-100 transition-colors px-12 py-4 rounded-2xl font-black text-slate-700 uppercase outline-none appearance-none" value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
                      {branches.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90" size={20} />
                  </div>
                </div>
              )}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Período</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <select className="w-full bg-slate-50 hover:bg-slate-100 transition-colors px-12 py-4 rounded-2xl font-black text-slate-700 uppercase outline-none appearance-none" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                    {months.map(m => (<option key={m} value={m}>{formatPeriod(m)}</option>))}
                  </select>
                  <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90" size={20} />
                </div>
              </div>

            </div>
          </div>
        )}

        {/* --- VISTA ECONÓMICA --- */}
        {currentTab === 'economico' && economicStats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <KPICard title="Ventas Netas" value={formatCurrency(economicStats.ventasNetas)} icon={TrendingUp} color="bg-blue-600" detail="Ingresos Reales" valueClass={economicStats.ventasNetas < 0 ? "text-red-600" : "text-slate-800"} />
              <KPICard title="Punto de Equilibrio" value={formatCurrency(economicStats.puntoEquilibrio)} icon={Scale} color="bg-purple-500" detail="Meta Mensual" />
              <KPICard title="Margen Bruto" value={formatCurrency(economicStats.margenBruto)} icon={Wallet} color="bg-indigo-500" detail="Contribución" valueClass={economicStats.margenBruto < 0 ? "text-red-600" : "text-slate-800"} />
              <KPICard title="Gastos Fijos" value={formatCurrency(economicStats.totalGastos)} icon={FileText} color="bg-red-600" detail="Estructura" />
              <KPICard title="EBITDA" value={formatCurrency(economicStats.ebitda)} icon={DollarSign} color="bg-emerald-600" detail="Resultado" valueClass={economicStats.ebitda < 0 ? "text-red-600" : "text-emerald-600"} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <DonutKPI label="Margen Bruto %" value={economicStats.margenBrutoPct} units="%" max={70} green={50} yellow={30} />
              <DonutKPI label="Margen EBITDA %" value={economicStats.margenPct} units="%" max={30} green={20} yellow={10} />
              <DonutKPI label="Cobertura Punto de Equilibrio" value={economicStats.puntoEquilibrio > 0 ? (economicStats.ventasNetas / economicStats.puntoEquilibrio) * 100 : 0} units="%" max={200} green={120} yellow={80} />
              <DonutKPI label="Peso Gastos Fijos s/Venta" value={economicStats.pesoGastosFijos} units="%" max={60} green={40} yellow={25} />
            </div>
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
                <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2"><List size={16}/> Ticket Promedio</h3>
                <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 flex-wrap md:justify-end w-full md:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowSalesImportModal(true)}
                    className="w-full xs:w-auto px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 flex items-center justify-center gap-1.5"
                  >
                    <Upload size={12} /> Subir
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSelectedSalesStats}
                    disabled={deletingSalesImport || !selectedSalesStats}
                    className="w-full xs:w-auto px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    {deletingSalesImport ? <Loader className="animate-spin" size={12} /> : <Trash2 size={12} />} Eliminar
                  </button>
                </div>
              </div>

              {!selectedSalesStats ? (
                <div className="border border-dashed border-slate-200 rounded-2xl p-6 text-center">
                  <p className="text-xs font-bold uppercase text-slate-500">Sin importaciones StarPOS todavía</p>

                </div>
              ) : (
                <>
                  <p className="text-sm md:text-base font-black uppercase tracking-wide text-slate-700 mb-3">Sucursal Mengelle</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <KPICard title="Ticket Promedio" value={formatCurrency(selectedSalesStats.avgTicket)} icon={DollarSign} color="bg-purple-600" detail="Sucursal Mengelle" subtext={selectedSalesStats.periodLabel} valueClass="text-3xl text-slate-800" />
                    <KPICard title="Cantidad Tickets" value={new Intl.NumberFormat('es-AR').format(cleanMonto(selectedSalesStats.ticketsCount))} icon={FileText} color="bg-blue-600" detail="Sucursal Mengelle" subtext={selectedSalesStats.periodLabel} valueClass="text-3xl text-slate-800" />
                    <KPICard title="Día más fuerte" value={selectedSalesStats.bestWeekday || 'Sin datos'} icon={TrendingUp} color="bg-emerald-600" detail="Sucursal Mengelle" subtext={selectedSalesStats.periodLabel} valueClass="text-3xl text-slate-800" />
                  </div>
                  {salesStatsSeries.length > 0 && (
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={salesTrendData} margin={{ top: 10, right: 44, left: 10, bottom: 10 }}>
                          <defs>
                            <linearGradient id="ticketGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.03} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="periodShort" axisLine={false} tickLine={false} interval={0} minTickGap={0} tickMargin={10} padding={{ left: 8, right: 20 }} tick={{ fontSize: 11, fontWeight: 900, fill: '#64748b' }} />
                          <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} tickFormatter={(value) => `${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(value)}`} width={70} />
                          <Tooltip
                            contentStyle={{ borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(2,6,23,0.08)' }}
                            labelStyle={{ fontWeight: 800, color: '#334155' }}
                            formatter={(value, name) => name === 'ticketPromedio' ? [formatCurrency(value), 'Ticket Promedio'] : [new Intl.NumberFormat('es-AR').format(value), 'Cantidad Tickets']}
                          />
                          <Legend formatter={(value) => value === 'ticketPromedio' ? 'Ticket Promedio' : 'Cantidad Tickets'} />
                          <Area yAxisId="left" type="monotone" dataKey="ticketPromedio" stroke="#7c3aed" strokeWidth={3} fill="url(#ticketGradient)" dot={renderSalesDot} activeDot={renderSalesDot} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              )}
            </div>
            {chartData && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 h-[450px]">
                    <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-6 flex items-center gap-2"><Scale size={16}/> Punto de Equilibrio vs Ventas</h3>
                    <ResponsiveContainer width="100%" height="80%">
                      <ComposedChart data={chartData.trend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#cbd5e1'}} dy={10} />
                        <Tooltip contentStyle={{borderRadius: '16px', border: 'none'}} formatter={(value) => formatCurrency(value)} />
                        <Legend />
                        <Bar dataKey="ventas" name="Ventas Reales" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                        <Line type="monotone" dataKey="equilibrio" name="Meta (Equilibrio)" stroke="#ef4444" strokeWidth={3} strokeDasharray="5 5" dot={{r: 4, fill: '#ef4444'}} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 h-[450px]">
                    <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-6 flex items-center gap-2"><Activity size={16}/> Evolución del EBITDA</h3>
                    <ResponsiveContainer width="100%" height="80%">
                      <ComposedChart data={chartData.trend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#cbd5e1'}} dy={10} />
                        <Tooltip contentStyle={{borderRadius: '16px', border: 'none'}} formatter={(value) => formatCurrency(value)} />
                        <Legend />
                        <Bar dataKey="ventas" name="Ventas (Contexto)" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={20} />
                        <Line type="monotone" dataKey="ebitda" name="EBITDA" stroke="#10b981" strokeWidth={4} dot={{r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff'}} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
            )}
            {chartData && (
                <div className="grid grid-cols-1 gap-8">
                  <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 h-[450px]">
                    <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-6 flex items-center gap-2"><BarChart2 size={16}/> Cascada de Resultados (P&L)</h3>
                    <ResponsiveContainer width="100%" height="80%">
                      <BarChart data={chartData.waterfall}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} interval={0} />
                        <Tooltip cursor={{fill: 'transparent'}} content={({ active, payload }) => { if (active && payload && payload.length) { const data = payload[0].payload; return ( <div className="bg-white p-4 rounded-xl shadow-lg border"><p className="font-bold text-slate-500 text-xs">{data.label}</p><p className="font-black text-lg text-slate-800">{formatCurrency(data.valor)}</p></div> ); } return null; }} />
                        <Bar dataKey="base" stackId="a" fill="transparent" />
                        <Bar dataKey="valor" stackId="a" radius={[6, 6, 6, 6]}>
                          {chartData.waterfall.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
            )}
          </>
        )}

        {/* --- VISTA FINANCIERA --- */}
        {userRole === 'gerente' && currentTab === 'financiero' && financialStats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard title="Resultado Operativo" value={formatCurrency(financialStats.resultadoOperativo)} icon={Activity} color="bg-blue-600" detail="1" subtext="Operaciones del mes" valueClass={financialStats.resultadoOperativo < 0 ? "text-red-600" : "text-slate-800"} />
              <KPICard title="Caja Comprometida" value={formatCurrency(financialStats.cajaComprometida)} icon={AlertTriangle} color="bg-orange-500" detail="2" subtext="Deuda vieja pagada" valueClass={financialStats.cajaComprometida < 0 ? "text-red-600" : "text-slate-800"} />
              <KPICard title="CAJA LIBRE REAL" value={formatCurrency(financialStats.cajaLibreReal)} icon={Wallet} color={financialStats.cajaLibreReal >= 0 ? "bg-emerald-600" : "bg-red-600"} detail="3" subtext="Operativo + Comprometido" valueClass={financialStats.cajaLibreReal < 0 ? "text-red-600" : "text-slate-800"} />
              <KPICard title="Financiamiento Neto" value={formatCurrency(financialStats.financiamientoNeto)} icon={CreditCard} color={financialStats.financiamientoNeto >= 0 ? "bg-indigo-600" : "bg-red-600"} detail="4" subtext="Préstamos - Pagos" valueClass={financialStats.financiamientoNeto < 0 ? "text-red-600" : "text-slate-800"} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <KPICard title="Retiros Personales" value={formatCurrency(financialStats.personalNeto)} icon={Users} color="bg-purple-600" detail="5" subtext="Salidas Personales" valueClass={financialStats.personalNeto < 0 ? "text-red-600" : "text-slate-800"} />
              <KPICard title="Caja Real Final" value={formatCurrency(financialStats.cajaRealFinal)} icon={PiggyBank} color={financialStats.cajaRealFinal >= 0 ? "bg-emerald-600" : "bg-red-600"} detail="6" subtext="Bolsillo del Mes" valueClass={financialStats.cajaRealFinal < 0 ? "text-red-600" : "text-slate-800"} />
              <KPICard title="Dependencia Financiera" value={formatCurrency(financialStats.dependenciaFinanciera)} icon={Landmark} color={financialStats.dependenciaFinanciera < 0 ? "bg-red-600" : "bg-slate-800"} detail="7" subtext="Aportes + Financiamiento" valueClass={financialStats.dependenciaFinanciera < 0 ? "text-red-600" : "text-slate-800"} />
            </div>
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 h-[450px]">
              <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-6 flex items-center gap-2"><BarChart2 size={16}/> Explicación de la Caja del Mes</h3>
              <ResponsiveContainer width="100%" height="80%">
                <BarChart data={[
                  { name: 'R. Operativo', valor: financialStats.resultadoOperativo, base: 0, fill: '#3b82f6', label: 'Resultado Operativo' },
                  { name: 'Comprometido', valor: financialStats.cajaComprometida, base: Math.max(0, financialStats.resultadoOperativo), fill: '#f97316', label: '+ Caja Comprometida' },
                  { name: 'Caja Libre', valor: financialStats.cajaLibreReal, base: 0, fill: '#10b981', label: '= Caja Libre Real' },
                  { name: 'Personal', valor: financialStats.personalNeto, base: Math.max(0, financialStats.cajaLibreReal), fill: '#ec4899', label: '+ Personal (Neto)' },
                  { name: 'Financiamiento', valor: financialStats.financiamientoNeto, base: Math.max(0, financialStats.cajaLibreReal + financialStats.personalNeto), fill: '#8b5cf6', label: '+ Financiamiento Neto' },
                  { name: 'Caja Final', valor: financialStats.cajaRealFinal, base: 0, fill: financialStats.cajaRealFinal >= 0 ? '#14b8a6' : '#ef4444', label: '= Caja Real Final' }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} />
                  <YAxis hide />
                  <Tooltip cursor={{fill: 'transparent'}} content={({ active, payload }) => { 
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-4 rounded-xl shadow-lg border">
                          <p className="font-bold text-slate-500 text-xs">{data.label}</p>
                          <p className={`font-black text-lg ${data.valor < 0 ? 'text-red-600' : 'text-slate-800'}`}>{formatCurrency(data.valor)}</p>
                        </div>
                      );
                    }
                    return null; 
                  }} />
                  <Bar dataKey="base" stackId="a" fill="transparent" />
                  <Bar dataKey="valor" stackId="a" radius={[6, 6, 6, 6]}>
                    <Cell fill="#3b82f6" />
                    <Cell fill="#f97316" />
                    <Cell fill="#10b981" />
                    <Cell fill="#ec4899" />
                    <Cell fill="#8b5cf6" />
                    <Cell fill={financialStats.cajaRealFinal >= 0 ? '#14b8a6' : '#ef4444'} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* --- VISTA PROVEEDORES --- */}
        {currentTab === 'proveedores' && (
          <div className="space-y-6">
            <div className="flex gap-4 mb-4">
              <button onClick={() => setProveedoresSubTab('operaciones')} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase ${proveedoresSubTab === 'operaciones' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500'}`}>Carga de Facturas</button>
              <button onClick={() => setProveedoresSubTab('cuentas')} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase ${proveedoresSubTab === 'cuentas' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500'}`}>Ctas Corrientes</button>
              <button onClick={() => setProveedoresSubTab('base')} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase ${proveedoresSubTab === 'base' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500'}`}>Base Proveedores</button>
              {userRole === 'gerente' && <button onClick={() => setProveedoresSubTab('dashboard')} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase ${proveedoresSubTab === 'dashboard' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500'}`}>Indicadores</button>}
            </div>
             
            {/* NUEVA VISTA: CUENTAS CORRIENTES */}
            {proveedoresSubTab === 'cuentas' && (
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                 <div className="flex flex-col gap-5 mb-6">
                   <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                     <h3 className="font-black text-sm uppercase tracking-widest text-slate-600 flex items-center gap-2"><List size={18}/> Estado de Cuentas</h3>
                     <div className="relative w-full md:max-w-xs">
                       <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                       <input
                         type="text"
                         value={accountsSearch}
                         onChange={(e) => setAccountsSearch(e.target.value)}
                         placeholder="Buscar proveedor..."
                         className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-slate-300"
                       />
                     </div>
                   </div>

                   <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                     <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                       <p className="text-[10px] font-bold uppercase text-slate-400">Proveedores</p>
                       <p className="text-lg font-black text-slate-700">{cuentasSummary.total}</p>
                     </div>
                     <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                       <p className="text-[10px] font-bold uppercase text-red-400">Con Deuda</p>
                       <p className="text-lg font-black text-red-600">{cuentasSummary.conDeuda}</p>
                     </div>
                     <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                       <p className="text-[10px] font-bold uppercase text-emerald-500">Al Día</p>
                       <p className="text-lg font-black text-emerald-700">{cuentasSummary.alDia}</p>
                     </div>
                     <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                       <p className="text-[10px] font-bold uppercase text-amber-500">A Favor</p>
                       <p className="text-lg font-black text-amber-600">{cuentasSummary.aFavor}</p>
                     </div>
                   </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cuentasCardsData.map(acc => (
                        <div key={acc.id} className="border border-slate-200 p-4 rounded-2xl hover:shadow-md transition-all bg-white">
                            <div className="flex items-start justify-between mb-3">
                                <h4 className="font-black text-slate-700 text-lg leading-tight">{acc.name}</h4>
                                <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase ${acc.balance > 0.5 ? 'bg-red-100 text-red-600' : acc.balance < -0.5 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-700'}`}>
                                  {acc.balance > 0.5 ? 'Debe' : acc.balance < -0.5 ? 'A favor' : 'Al día'}
                                </span>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold">Saldo Actual</p>
                                <p className={`text-3xl font-black ${acc.balance > 0.5 ? 'text-red-500' : acc.balance < -0.5 ? 'text-amber-500' : 'text-emerald-600'}`}>
                                    {formatCurrency(acc.balance)}
                                </p>
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] text-slate-400 uppercase font-bold">Último mov.</p>
                                <p className="text-xs font-bold text-slate-600">{acc.lastMov ? formatDate(acc.lastMov) : '-'}</p>
                              </div>
                              <button
                                onClick={() => setSelectedAccountProvider(acc.id)}
                                className="w-full mt-1 bg-slate-800 text-white py-2.5 rounded-xl text-[11px] font-bold uppercase hover:bg-slate-700 flex items-center justify-center gap-2"
                              >
                                <Eye size={14} /> Ver Extracto
                              </button>
                            </div>
                        </div>
                    ))}
                 </div>
                 {cuentasCardsData.length === 0 && (
                  <div className="mt-6 p-6 border border-dashed border-slate-200 rounded-2xl text-center text-xs font-bold uppercase text-slate-400">
                    No se encontraron proveedores con ese criterio.
                  </div>
                 )}

                 {/* MODAL DETALLE CUENTA CORRIENTE */}
                 {selectedAccountProvider && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl w-full max-w-5xl h-[86vh] shadow-2xl flex flex-col animate-fade-in border border-slate-100">
                            <div className="p-6 border-b border-slate-100 bg-slate-50 rounded-t-3xl">
                              <div className="flex justify-between items-start gap-4 mb-4">
                                  <div>
                                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Cuenta Corriente</p>
                                      <h3 className="font-black text-2xl text-slate-800 leading-tight mt-1">{selectedProviderName}</h3>
                                  </div>
                                  <button onClick={() => setSelectedAccountProvider(null)} className="p-2 hover:bg-slate-200 rounded-full"><X size={20}/></button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div className="bg-white border border-slate-100 rounded-xl p-3">
                                  <p className="text-[10px] text-slate-400 font-bold uppercase">Movimientos</p>
                                  <p className="text-lg font-black text-slate-700">{selectedProviderAccountSummary.movimientos}</p>
                                </div>
                                <div className="bg-white border border-slate-100 rounded-xl p-3">
                                  <p className="text-[10px] text-slate-400 font-bold uppercase">Total Debe</p>
                                  <p className="text-lg font-black text-red-500">{formatCurrency(selectedProviderAccountSummary.totalDebe)}</p>
                                </div>
                                <div className="bg-white border border-slate-100 rounded-xl p-3">
                                  <p className="text-[10px] text-slate-400 font-bold uppercase">Total Haber</p>
                                  <p className="text-lg font-black text-emerald-600">{formatCurrency(selectedProviderAccountSummary.totalHaber)}</p>
                                </div>
                                <div className="bg-white border border-slate-100 rounded-xl p-3">
                                  <p className="text-[10px] text-slate-400 font-bold uppercase">Saldo Final</p>
                                  <p className={`text-lg font-black ${selectedProviderAccountSummary.saldoFinal > 0.5 ? 'text-red-600' : selectedProviderAccountSummary.saldoFinal < -0.5 ? 'text-amber-500' : 'text-emerald-600'}`}>
                                    {formatCurrency(selectedProviderAccountSummary.saldoFinal)}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex-1 overflow-auto p-6 bg-white">
                              {selectedProviderLedger.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-slate-400 font-bold uppercase text-xs tracking-wider">
                                  Sin movimientos para este proveedor
                                </div>
                              ) : (
                                <table className="w-full text-left text-xs border-separate border-spacing-0">
                                    <thead className="sticky top-0 z-10">
                                        <tr className="text-slate-500 uppercase tracking-wider">
                                            <th className="p-3 bg-slate-50 border-y border-slate-100">Fecha</th>
                                            <th className="p-3 bg-slate-50 border-y border-slate-100">Tipo</th>
                                            <th className="p-3 bg-slate-50 border-y border-slate-100">Comprobante</th>
                                            <th className="p-3 bg-slate-50 border-y border-slate-100 text-right">Debe</th>
                                            <th className="p-3 bg-slate-50 border-y border-slate-100 text-right">Haber</th>
                                            <th className="p-3 bg-slate-50 border-y border-slate-100 text-right">Saldo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="font-mono">
                                        {selectedProviderLedger.map((mov, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 border-b border-slate-100">
                                                <td className="p-3 text-slate-500">{formatDate(mov.date)}</td>
                                                <td className="p-3">
                                                  <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase ${mov.type === 'Factura' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {mov.type}
                                                  </span>
                                                </td>
                                                <td className="p-3 font-bold text-slate-700">{mov.description}</td>
                                                <td className="p-3 text-right text-red-500">{mov.debe > 0 ? formatCurrency(mov.debe) : '-'}</td>
                                                <td className="p-3 text-right text-emerald-500">{mov.haber > 0 ? formatCurrency(mov.haber) : '-'}</td>
                                                <td className={`p-3 text-right font-black ${mov.balance > 0.5 ? 'text-red-600' : mov.balance < -0.5 ? 'text-amber-500' : 'text-emerald-600'}`}>
                                                    {formatCurrency(mov.balance)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                              )}
                            </div>
                            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-3xl flex justify-between items-center">
                                <p className="text-xs text-slate-400 font-bold uppercase">Fin del Extracto</p>
                                <button onClick={() => setSelectedAccountProvider(null)} className="text-xs font-bold uppercase text-slate-600 hover:text-slate-800">Cerrar</button>
                            </div>
                        </div>
                    </div>
                 )}
              </div>
            )}

            {userRole === 'gerente' && proveedoresSubTab === 'dashboard' && proveedoresStats && (
              <>
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <KPICard title="Deuda Total" value={formatCurrency(proveedoresStats.totalDeuda)} icon={Wallet} color="bg-slate-800" detail="A Pagar" subtext="Saldo Pendiente" />
                  <KPICard title="Saldo a Favor" value={formatCurrency(proveedoresStats.totalCreditoGlobal)} icon={ThumbsUp} color="bg-blue-600" detail="Crédito" subtext="Pagos anticipados" />
                  <KPICard title="Vencido" value={formatCurrency(proveedoresStats.vencido)} icon={AlertOctagon} color="bg-red-600" detail="Urgente" subtext="Deuda vencida" />
                  {/* KPI DE IVA COMPRAS DEL MES ACTUAL */}
                  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between">
                     <div className="flex justify-between items-start mb-4">
                       <div className="p-3 rounded-2xl bg-purple-100 text-purple-600 bg-opacity-10"><DollarSign className="w-6 h-6"/></div>
                     </div>
                     <div>
                       <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">IVA Compras Mes</p>
                       <h3 className="text-2xl font-black text-purple-600 mt-1">{formatCurrency(ivaComprasMesActual)}</h3>
                       <p className="text-[10px] text-slate-500 mt-2 font-medium bg-slate-50 p-2 rounded-lg leading-snug">Acumulado de {etiquetaMesActual}</p>
                     </div>
                  </div>
               </div>

               <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 mb-8">
                 <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                   <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2"><BarChart2 size={16}/> Mapa de Deuda por Vencimiento</h3>
                   <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase">
                     <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700">Urgente: {formatCurrency(debtDecisionBuckets.urgente)}</span>
                     <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">Corto Plazo: {formatCurrency(debtDecisionBuckets.cortoPlazo)}</span>
                     <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">Largo Plazo: {formatCurrency(debtDecisionBuckets.largoPlazo)}</span>
                   </div>
                 </div>
                 <div className="h-[280px]">
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={debtDecisionBuckets.buckets}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                       <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 900, fill: '#64748b' }} />
                       <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(value) => formatCurrency(value)} width={90} />
                       <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} formatter={(value) => formatCurrency(value)} />
                       <Bar dataKey="deuda" radius={[8, 8, 0, 0]} barSize={42}>
                         {debtDecisionBuckets.buckets.map((entry, index) => (
                           <Cell key={`debt-cell-${index}`} fill={entry.fill} />
                         ))}
                       </Bar>
                     </BarChart>
                   </ResponsiveContainer>
                 </div>
                 <p className="text-[10px] text-slate-500 font-bold uppercase mt-3">Total en análisis: {formatCurrency(debtDecisionBuckets.total)} · Priorizar Vencido y 0-7 días.</p>
               </div>

               {/* Gráficos de proveedores (Top Deudores y Calendario) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                    <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-6 flex items-center gap-2"><Briefcase size={16}/> Top Deudores</h3>
                    <div className="space-y-3">
                      {proveedoresStats.topDeudores.map((p, i) => (
                        <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border-b border-slate-50 last:border-0">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500 text-xs">{p.nombre.substring(0,2).toUpperCase()}</div>
                            <div>
                              <p className="font-bold text-sm text-slate-700">{p.nombre}</p>
                            </div>
                          </div>
                          <p className="font-black text-slate-800">{formatCurrency(p.saldo)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                   <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2"><Calendar size={16}/> Almanaque de Vencimientos</h3>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setDashboardCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <p className="text-xs font-black text-slate-700 min-w-[130px] text-center uppercase">
                            {dashboardDebtCalendar.monthStart.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
                          </p>
                          <button
                            onClick={() => setDashboardCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-1 mb-2 text-[9px] font-bold uppercase text-slate-400 px-1">
                        <div className="text-center">Lun</div>
                        <div className="text-center">Mar</div>
                        <div className="text-center">Mié</div>
                        <div className="text-center">Jue</div>
                        <div className="text-center">Vie</div>
                        <div className="text-center">Sáb</div>
                        <div className="text-center">Dom</div>
                      </div>

                      <div className="grid grid-cols-7 gap-1 mb-3">
                        {dashboardDebtCalendar.cells.map((cell, idx) => (
                          <div
                            key={idx}
                            className={`min-h-[44px] rounded-lg border p-1.5 ${
                              !cell ? 'border-transparent bg-transparent' :
                              cell.isOverdue ? 'bg-red-50 border-red-200' :
                              cell.amount > 0.5 ? 'bg-amber-50 border-amber-200' :
                              cell.isToday ? 'bg-slate-50 border-slate-300' : 'bg-white border-slate-100'
                            }`}
                          >
                            {cell && (
                              <>
                                <p className={`text-[10px] font-black ${cell.isOverdue ? 'text-red-600' : 'text-slate-600'}`}>{cell.day}</p>
                                {cell.amount > 0.5 && (
                                  <p className={`text-[9px] font-black leading-tight ${cell.isOverdue ? 'text-red-600' : 'text-amber-700'}`}>
                                    {formatCurrency(cell.amount)}
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-slate-100 pt-3 space-y-2">
                        {dashboardDebtCalendar.monthlyItems.length === 0 ? (
                          <p className="text-[10px] font-bold uppercase text-slate-400 text-center mt-4">Sin deudas a vencer en este mes</p>
                        ) : (
                          dashboardDebtCalendar.monthlyItems.map(item => {
                            const today = new Date();
                            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                            const isOverdue = item.dueDate < todayStart;
                            return (
                              <div key={`due-${item.id}`} className={`rounded-xl border px-3 py-3 ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs font-black text-slate-700 truncate">{item.providerName}</p>
                                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {isOverdue ? 'Vencida' : 'A vencer'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                  <p className="text-xs text-slate-600 font-bold">Fac. {item.invoiceNumber} · {formatDate(item.dueDate)}</p>
                                  <p className={`text-sm font-black ${isOverdue ? 'text-red-600' : 'text-slate-700'}`}>{formatCurrency(item.amount)}</p>
                                </div>
                                {isOverdue && (
                                  <p className="mt-2 text-[11px] font-black uppercase tracking-wide text-red-700 bg-red-100 border border-red-200 rounded-lg px-2 py-1 text-center">
                                    Vencida y no pagada
                                  </p>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                   </div>
                </div>
              </>
            )}

            {proveedoresSubTab === 'base' && (
              <>
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-sm uppercase tracking-widest text-slate-600">Base de Proveedores</h3>
                    <div className="flex gap-2">
                        <button className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-700 flex items-center gap-2" onClick={() => setShowImportModal(true)}>
                           {savingProv ? <Loader className="animate-spin" size={14}/> : <Upload size={14}/>} Importar Lista
                        </button>
                        <button className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-600 flex items-center gap-2" onClick={openNewModal}>
                           {savingProv ? <Loader className="animate-spin" size={14}/> : <PlusCircle size={14}/>} Agregar
                        </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider">
                          <th className="p-3">Nombre</th>
                          <th className="p-3">Teléfono</th>
                          <th className="p-3">CUIT</th>
                          <th className="p-3">Dirección</th>
                          <th className="p-3 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {/* SAFE RENDER: (proveedores || []) */}
                        {(proveedores || []).map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="p-3 font-bold text-slate-700">{p.name}</td>
                            <td className="p-3 text-slate-500">{p.phone}</td>
                            <td className="p-3 text-slate-500">{p.cuit}</td>
                            <td className="p-3 text-slate-500">{p.address}</td>
                            <td className="p-3 text-center flex justify-center gap-3">
                               <button onClick={() => openEditModal(p)} className="text-blue-500 hover:text-blue-700"><Edit size={16}/></button>
                               <button onClick={() => handleDeleteProveedor(p.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(!proveedores || proveedores.length === 0) && (
                        <div className="p-8 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">
                            {loading ? "Cargando..." : "No hay proveedores registrados."}
                        </div>
                    )}
                  </div>
                </div>

                {/* MODAL AGREGAR/EDITAR PROVEEDOR */}
                {showProvModal && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-fade-in">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-lg text-slate-800 uppercase">{editingProv ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
                        <button onClick={() => setShowProvModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
                      </div>
                      <form onSubmit={handleSaveProveedor} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input name="name" defaultValue={editingProv?.name} placeholder="Nombre" className="bg-slate-50 p-3 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 w-full" required />
                        <input name="phone" defaultValue={editingProv?.phone} placeholder="Teléfono" className="bg-slate-50 p-3 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 w-full" />
                        <input name="cuit" defaultValue={editingProv?.cuit} placeholder="CUIT" className="bg-slate-50 p-3 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 w-full" />
                        <input name="address" defaultValue={editingProv?.address} placeholder="Dirección" className="bg-slate-50 p-3 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 w-full" />
                        <button type="submit" disabled={savingProv} className="md:col-span-2 bg-slate-800 text-white p-3 rounded-xl text-xs font-bold hover:bg-slate-700 flex justify-center items-center gap-2 disabled:opacity-50">
                           {savingProv ? <Loader className="animate-spin" size={16}/> : <Save size={16} />} 
                           {savingProv ? 'Guardando...' : (editingProv ? 'Guardar Cambios' : 'Crear Proveedor')}
                        </button>
                      </form>
                    </div>
                  </div>
                )}
                 {showImportModal && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-fade-in">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-black text-lg text-slate-800 uppercase">Importar Masiva</h3>
                        <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
                      </div>
                      <p className="text-xs text-slate-500 mb-4">Copia y pega tu lista de Excel aquí. Formato esperado por línea: <br/><strong>Nombre, Teléfono, CUIT, Dirección</strong></p>
                      <textarea 
                        className="w-full h-40 bg-slate-50 p-4 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 mb-4 font-mono"
                        placeholder="Ejemplo:&#10;Lácteos del Sur, 299123456, 3011111111, Ruta 22&#10;Panificadora, 299654321, 3022222222, Centro"
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                      />
                      <button onClick={handleBulkImport} disabled={savingProv} className="w-full bg-slate-800 text-white p-3 rounded-xl text-xs font-bold hover:bg-slate-700 flex justify-center items-center gap-2 disabled:opacity-50">
                          {savingProv ? <Loader className="animate-spin" size={16}/> : <Upload size={16} />} 
                          {savingProv ? 'Procesando...' : 'Procesar Importación'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {proveedoresSubTab === 'operaciones' && (
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                  <div className="flex flex-col gap-6 mb-6">
                    <div className="flex justify-between items-center">
                      {/* EASTER EGG TRIGGER */}
                      <div className="flex items-center gap-4">
                        <h3 
                          onDoubleClick={() => setShowInvoiceImportModal(true)}
                          className="font-black text-sm uppercase tracking-widest text-slate-600 cursor-pointer select-none hover:text-slate-800 transition-colors"
                          title="Doble clic para importar"
                        >
                          Transacciones
                        </h3>
                        <button 
                            onClick={() => {
                              setExportConfig({
                                providerId: opsFilterProvider || '',
                                dateFrom: opsFilterDateFrom || '',
                                dateTo: opsFilterDateTo || ''
                              });
                              setShowExportModal(true);
                            }} 
                            className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 hover:bg-green-200"
                        >
                          <Download size={12} /> Exportar Excel
                        </button>
                      </div>
                      <div className="flex gap-2">
                        {/* BOTÓN NUEVO: Cargar Pago (Separado) */}
                        <button onClick={() => { setEditingPago(null); setShowPagoModal(true); }} className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-600 flex items-center gap-2"><Banknote size={14} /> Registrar Pago</button>
                        <button onClick={() => { setEditingFactura(null); setShowFacturaModal(true); }} className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-700 flex items-center gap-2"><PlusCircle size={14} /> Cargar Factura</button>
                      </div>
                    </div>

                    {/* BARRA DE FILTROS */}
                    <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase">
                            <Filter size={16} /> Buscar:
                        </div>
                        <select 
                            value={opsFilterProvider} 
                            onChange={e => setOpsFilterProvider(e.target.value)}
                            className="bg-white p-2.5 rounded-xl text-xs outline-none border border-slate-200 font-bold text-slate-600 min-w-[200px]"
                        >
                            <option value="">Todos los Proveedores</option>
                            {proveedores.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <input
                          type="text"
                          value={opsFilterInvoiceNumber}
                          onChange={e => setOpsFilterInvoiceNumber(e.target.value)}
                          placeholder="Nro Factura"
                          className="bg-white p-2.5 rounded-xl text-xs outline-none border border-slate-200 font-bold text-slate-600 min-w-[160px]"
                        />
                        <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-slate-200">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Desde:</label>
                            <input 
                                type="date" 
                                value={opsFilterDateFrom} 
                                onChange={e => setOpsFilterDateFrom(e.target.value)}
                                className="bg-transparent p-1.5 text-xs outline-none font-bold text-slate-600 uppercase"
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-slate-200">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Hasta:</label>
                            <input 
                                type="date" 
                                value={opsFilterDateTo} 
                                onChange={e => setOpsFilterDateTo(e.target.value)}
                                className="bg-transparent p-1.5 text-xs outline-none font-bold text-slate-600 uppercase"
                            />
                        </div>
                        {(opsFilterProvider || opsFilterDateFrom || opsFilterDateTo || opsFilterInvoiceNumber) && (
                            <button 
                            onClick={() => { setOpsFilterProvider(''); setOpsFilterDateFrom(''); setOpsFilterDateTo(''); setOpsFilterInvoiceNumber(''); }} 
                                className="ml-auto text-red-500 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors text-xs font-bold flex items-center gap-1"
                            >
                                <X size={14} /> Limpiar
                            </button>
                        )}
                    </div>
                  </div>

                  {selectedProviderSummary && (
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Resumen de Cuenta</p>
                          <h4 className="text-lg font-black text-slate-700">{selectedProviderSummary.providerName}</h4>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl p-4 border border-slate-100">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Total Deuda</p>
                          <p className="text-lg font-black text-slate-800">{formatCurrency(selectedProviderSummary.totalFacturado)}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-slate-100">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Total Pagado</p>
                          <p className="text-lg font-black text-emerald-600">{formatCurrency(selectedProviderSummary.totalPagado)}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-slate-100">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Saldo Final</p>
                          <p className={`text-lg font-black ${selectedProviderSummary.saldoFinal > 0.5 ? 'text-red-500' : selectedProviderSummary.saldoFinal < -0.5 ? 'text-amber-500' : 'text-emerald-600'}`}>
                            {formatCurrency(selectedProviderSummary.saldoFinal)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                <div className="overflow-x-auto">
                   <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider">
                        <th className="p-3">Fecha</th>
                        <th className="p-3">Vencimiento</th>
                        <th className="p-3">Proveedor</th>
                        <th className="p-3">Nro Factura</th>
                        <th className="p-3">Detalle</th>
                        <th className="p-3 text-right">Total Fac.</th>
                        <th className="p-3 text-right">IVA</th>
                        <th className="p-3 text-right">Saldo Pendiente</th>
                        <th className="p-3 text-center">Estado</th>
                        <th className="p-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {opsTableData.currentData.map((f) => {
                        const isPayment = f.rowType === 'pago';
                        return (
                          <tr key={f.id} className="hover:bg-slate-50">
                            <td className="p-3 text-slate-500">{formatDate(f.invoiceDate)}</td>
                            <td className="p-3 text-slate-500">{!isPayment && f.dueDate ? formatDate(f.dueDate) : 'sin dato'}</td>
                            <td className="p-3 font-bold text-slate-700">{f.providerName}</td>
                            <td className="p-3 text-slate-500">{isPayment ? (f.method || f.invoiceNumber || 'Pago') : f.invoiceNumber}</td>
                            <td className="p-3 text-slate-500">{isPayment ? (f.description || 'Pago') : f.description}</td>
                            <td className="p-3 text-right font-mono text-slate-600">{formatCurrency(f.total)}</td>
                            <td className="p-3 text-right font-mono text-slate-400">{isPayment ? '-' : formatCurrency(f.taxes || 0)}</td>
                            <td className={`p-3 text-right font-mono font-black 
                              ${isPayment ? 'text-emerald-500' :
                                f.debt > 0.5 ? 'text-red-500' : // Debe (Positivo para deuda en contexto visual)
                                f.debt < -0.5 ? 'text-amber-500' : // A Favor (Negativo o crédito)
                                'text-emerald-500' // Pagado (Cero)
                              }`}>
                               {isPayment ? '-' : formatCurrency(f.debt)}
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase 
                                ${isPayment ? 'bg-emerald-100 text-emerald-600' :
                                  f.computedStatus === 'Pagado' ? 'bg-emerald-100 text-emerald-600' : 
                                  f.computedStatus === 'Parcial' ? 'bg-amber-100 text-amber-700' : 
                                  'bg-red-100 text-red-600'}`}>
                                {isPayment ? 'Pago' : f.computedStatus === 'Pagado' ? 'Pagado' : f.computedStatus === 'Parcial' ? 'Parcial' : 'Debe'}
                              </span>
                            </td>
                             <td className="p-3 text-center flex justify-center gap-2">
                               {isPayment ? (
                                 <>
                                   <button onClick={() => { setEditingPago(f.payment); setShowPagoModal(true); }} className="text-blue-500 hover:text-blue-700 p-1 bg-blue-50 rounded-lg"><Edit size={16}/></button>
                                   <button onClick={() => handleDeletePago(f.paymentId)} className="text-red-500 hover:text-red-700 p-1 bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                 </>
                               ) : (
                                 <>
                                   <button onClick={() => { setEditingFactura(f); setShowFacturaModal(true); }} className="text-blue-500 hover:text-blue-700 p-1 bg-blue-50 rounded-lg"><Edit size={16}/></button>
                                   <button onClick={() => handleDeleteFactura(f.id)} className="text-red-500 hover:text-red-700 p-1 bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                 </>
                               )}
                            </td>
                          </tr>
                        );
                      })}
                        {opsTableData.totalCount === 0 && <tr><td colSpan="10" className="p-4 text-center text-slate-400">No hay facturas cargadas.</td></tr>}
                    </tbody>
                   </table>
                </div>

                {/* PAGINATION CONTROLS */}
                {opsTableData.totalCount > 0 && (
                  <div className="flex justify-between items-center mt-4 px-2">
                    <span className="text-xs text-slate-400 font-bold uppercase">
                      Mostrando {opsTableData.currentData.length} de {opsTableData.totalCount} registros
                    </span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setOpsPage(p => Math.max(1, p - 1))}
                        disabled={opsPage === 1}
                        className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <span className="text-xs font-black text-slate-600">
                        Página {opsPage} de {opsTableData.totalPages || 1}
                      </span>
                      <button 
                        onClick={() => setOpsPage(p => Math.min(opsTableData.totalPages, p + 1))}
                        disabled={opsPage === opsTableData.totalPages || opsTableData.totalPages === 0}
                        className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                )}

                {/* MODAL EXPORTACION PROLIJA */}
                {showExportModal && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-fade-in">
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h3 className="font-black text-lg text-slate-800 uppercase">Exportar Excel</h3>
                          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Proveedores - Transacciones</p>
                        </div>
                        <button onClick={() => setShowExportModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
                      </div>

                      <form onSubmit={handleRunExport} className="grid grid-cols-1 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Proveedor</label>
                          <select
                            value={exportConfig.providerId}
                            onChange={(e) => setExportConfig(prev => ({ ...prev, providerId: e.target.value }))}
                            className="bg-slate-50 p-3 rounded-xl text-xs w-full outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">Todos los Proveedores</option>
                            {proveedores.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Desde</label>
                            <input
                              type="date"
                              value={exportConfig.dateFrom}
                              onChange={(e) => setExportConfig(prev => ({ ...prev, dateFrom: e.target.value }))}
                              className="bg-slate-50 p-3 rounded-xl text-xs w-full outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Hasta</label>
                            <input
                              type="date"
                              value={exportConfig.dateTo}
                              onChange={(e) => setExportConfig(prev => ({ ...prev, dateTo: e.target.value }))}
                              className="bg-slate-50 p-3 rounded-xl text-xs w-full outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setExportConfig({ providerId: '', dateFrom: '', dateTo: '' })}
                            className="text-slate-500 hover:text-slate-700 text-xs font-bold uppercase"
                          >
                            Limpiar filtros
                          </button>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setShowExportModal(false)}
                              className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-200"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 flex items-center gap-2"
                            >
                              <Download size={14} /> Exportar
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
                 
                 {/* MODAL NUEVA FACTURA (REDISEÑADO PROLIJO) */}
                 {showFacturaModal && (
                   <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                     {/* SE CAMBIÓ max-w-lg a max-w-2xl PARA DAR MÁS ANCHO A LOS INPUTS */}
                     <div className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl animate-fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-lg text-slate-800 uppercase">{editingFactura ? 'EDITAR FACTURA' : 'NUEVA FACTURA'}</h3>
                            <button onClick={() => setShowFacturaModal(false)}><X size={20}/></button>
                        </div>
                        <form onSubmit={handleAddFactura} className="grid grid-cols-1 md:grid-cols-6 gap-4">
                           {/* HEADER DATOS FACTURA - FILA 1 */}
                           <div className="flex flex-col gap-1 md:col-span-3">
                             <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Proveedor</label>
                             <select name="providerId" defaultValue={editingFactura?.providerId} className="bg-slate-50 p-3 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 w-full" required>
                                 <option value="">Seleccionar...</option>
                                 {proveedores.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                             </select>
                           </div>
                           <div className="flex flex-col gap-1 md:col-span-3">
                             <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nro Factura</label>
                             <input name="invoiceNumber" defaultValue={editingFactura?.invoiceNumber} placeholder="Nro Factura" className="bg-slate-50 p-3 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 w-full" required />
                           </div>

                           {/* FILA 2 - FECHAS */}
                           <div className="flex flex-col gap-1 md:col-span-3">
                             <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Fecha Factura</label>
                             <input name="invoiceDate" type="date" min="2000-01-01" max="2100-12-31" defaultValue={formatInputDate(editingFactura?.invoiceDate)} className="bg-slate-50 p-3 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 w-full" required />
                           </div>
                           <div className="flex flex-col gap-1 md:col-span-3">
                             <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Fecha Vencimiento</label>
                             <input name="dueDate" type="date" min="2000-01-01" max="2100-12-31" defaultValue={formatInputDate(editingFactura?.dueDate)} placeholder="Vencimiento" className="bg-slate-50 p-3 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 w-full" />
                           </div>
                           
                           {/* DESCRIPCIÓN FULL WIDTH (FILA 3) */}
                           <div className="flex flex-col gap-1 md:col-span-6">
                             <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Descripción / Detalle</label>
                             <input name="description" defaultValue={editingFactura?.description} placeholder="Opcional..." className="bg-slate-50 p-3 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 w-full" />
                           </div>
                           
                           {/* BLOQUE DE IMPORTES REDISEÑADO (FILA 4) */}
                           <div className="flex flex-col gap-1 md:col-span-2">
                             <label className="text-[10px] font-black text-slate-800 uppercase ml-1">Importe Final c/ IVA</label>
                             <div className="relative">
                                 <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-800"/>
                                 <input 
                                   name="totalAmount" 
                                   type="text" 
                                   inputMode="decimal"
                                   pattern="[0-9.,-]*"
                                   value={newInvoiceData.totalAmount}
                                   onChange={e => handleInvoiceAmountChange('totalAmount', e.target.value)}
                                   onBlur={() => handleInvoiceAmountBlur('totalAmount')}
                                   placeholder="0,00" 
                                   className="bg-slate-100 pl-8 p-3 rounded-xl text-lg font-black text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 w-full" 
                                   required 
                                 />
                              </div>
                           </div>
                           
                           <div className="flex flex-col gap-1 md:col-span-2">
                             <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Monto IVA</label>
                             <div className="relative">
                                 <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                                 <input 
                                   name="taxAmount" 
                                   type="text" 
                                   inputMode="decimal"
                                   pattern="[0-9.,-]*"
                                   value={newInvoiceData.taxAmount}
                                   onChange={e => handleInvoiceAmountChange('taxAmount', e.target.value)}
                                   onBlur={() => handleInvoiceAmountBlur('taxAmount')}
                                   placeholder="0,00" 
                                   className="bg-white border border-slate-200 pl-8 p-3 rounded-xl text-base font-bold text-slate-500 outline-none focus:ring-2 focus:ring-emerald-500 w-full" 
                                 />
                              </div>
                           </div>
                           
                           <div className="flex flex-col gap-1 md:col-span-2">
                             <label className="text-[10px] font-bold text-emerald-600 uppercase ml-1">Pago Inicial</label>
                             <div className="relative">
                                 <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600"/>
                                 <input 
                                   name="initialPayment" 
                                   type="text" 
                                   inputMode="decimal"
                                   pattern="[0-9.,-]*"
                                   value={newInvoiceData.initialPayment}
                                   onChange={e => handleInvoiceAmountChange('initialPayment', e.target.value)}
                                   onBlur={() => handleInvoiceAmountBlur('initialPayment')}
                                   placeholder="0,00" 
                                   className="bg-emerald-50 pl-8 p-3 rounded-xl text-base font-black text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-600 w-full" 
                                 />
                              </div>
                           </div>
                           
                           <button type="submit" disabled={savingFactura} className="md:col-span-6 bg-slate-900 text-white p-4 rounded-xl text-sm font-bold hover:bg-slate-800 flex justify-center items-center gap-2 disabled:opacity-50 mt-2 shadow-lg shadow-slate-200 transition-all hover:-translate-y-0.5">
                             {savingFactura ? <Loader className="animate-spin" size={18} /> : <Save size={18} />}
                             {savingFactura ? 'Guardando...' : (editingFactura ? 'Guardar Cambios' : 'Guardar Factura')}
                           </button>
                        </form>
                     </div>
                   </div>
                )}

                {/* MODAL REGISTRAR PAGO (NUEVO BOTÓN) */}
                {showPagoModal && (
                   <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                     <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-fade-in border-l-8 border-emerald-500">
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="font-black text-lg text-emerald-800 uppercase">{editingPago ? 'Editar Pago' : 'Registrar Pago'}</h3>
                          <button onClick={() => { setShowPagoModal(false); setEditingPago(null); }}><X size={20}/></button>
                        </div>
                        <form onSubmit={handleAddPago} className="grid grid-cols-1 gap-4">
                           <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Proveedor</label>
                                <select name="providerId" defaultValue={editingPago?.providerId || ''} className="bg-slate-50 p-3 rounded-xl text-xs w-full outline-none focus:ring-2 focus:ring-emerald-500" required>
                                  <option value="">Seleccionar Proveedor...</option>
                                  {proveedores.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </select>
                           </div>

                           <div className="grid grid-cols-2 gap-4">
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Fecha de Pago</label>
                                <input name="date" type="date" defaultValue={formatInputDate(editingPago?.date)} className="bg-slate-50 p-3 rounded-xl text-xs w-full outline-none focus:ring-2 focus:ring-emerald-500" required />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-emerald-600 uppercase ml-1">Monto</label>
                                <div className="relative">
                                  <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600"/>
                                  <input 
                                    name="amount" 
                                    type="text" 
                                    inputMode="decimal"
                                    pattern="[0-9.,-]*"
                                    defaultValue={editingPago ? formatCurrency(editingPago.amount) : ''}
                                    placeholder="0,00" 
                                    className="bg-emerald-50 pl-8 p-3 rounded-xl text-lg w-full font-black text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500" 
                                    required 
                                  />
                                </div>
                              </div>
                           </div>

                           <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tipo de Pago</label>
                                <select name="method" defaultValue={editingPago?.method || 'Transferencia'} className="bg-slate-50 p-3 rounded-xl text-xs w-full outline-none focus:ring-2 focus:ring-emerald-500" required>
                                  <option value="Transferencia">Transferencia</option>
                                  <option value="Cheque">Cheque</option>
                                  <option value="Efectivo">Efectivo</option>
                              </select>
                           </div>

                           <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Detalles / Nota</label>
                              <input name="description" defaultValue={editingPago?.description} placeholder="Nro de comprobante, banco, observaciones..." className="bg-slate-50 p-3 rounded-xl text-xs w-full outline-none focus:ring-2 focus:ring-emerald-500" />
                           </div>

                           <button type="submit" disabled={saving} className="bg-emerald-600 text-white p-3 rounded-xl text-xs font-bold w-full hover:bg-emerald-700 transition-colors mt-2 shadow-lg shadow-emerald-200">
                             {saving ? <Loader className="animate-spin mx-auto" size={16}/> : (editingPago ? 'Guardar Cambios' : 'Confirmar Pago')}
                           </button>
                        </form>
                     </div>
                   </div>
                )}
              </div>
            )}

            {/* MODAL IMPORTACIÓN MASIVA FACTURAS (EASTER EGG) */}
            {showInvoiceImportModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-fade-in">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-black text-lg text-slate-800 uppercase">Importar Facturas</h3>
                    <button onClick={() => setShowInvoiceImportModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">Pegar datos de Excel (TABs) o CSV. Orden:<br/><strong>Fecha, Vencimiento, Proveedor, Nro Factura, Detalle, Total Fac., IVA</strong></p>
                  <textarea 
                    className="w-full h-40 bg-slate-50 p-4 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 mb-4 font-mono"
                    placeholder="2025-10-01	2025-11-01	Coca Cola	001-123	Pack 6	1210	210"
                    value={invoiceImportText}
                    onChange={(e) => setInvoiceImportText(e.target.value)}
                  />
                  <input
                    ref={invoiceFileInputRef}
                    type="file"
                    accept=".csv,.txt,.tsv"
                    className="hidden"
                    onChange={handleInvoiceFileSelect}
                  />
                  <button
                    type="button"
                    onClick={() => invoiceFileInputRef.current?.click()}
                    className="w-full mb-4 bg-slate-100 text-slate-700 p-3 rounded-xl text-xs font-bold hover:bg-slate-200 flex justify-center items-center gap-2"
                  >
                    Subir archivo para importar
                  </button>
                  {invoiceImportText.trim() && (
                    <div className="mb-4">
                      <div className="flex items-center gap-3 text-[10px] font-bold uppercase mb-2">
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">Validas: {invoiceImportPreview.docsToWrite.length}</span>
                        <span className="text-red-700 bg-red-50 px-2 py-1 rounded-lg">Invalidas: {invoiceImportPreview.skippedCount}</span>
                      </div>
                      <div className="max-h-36 overflow-auto rounded-xl border border-slate-100 bg-slate-50">
                        {invoiceImportPreview.parsedLines.map(item => (
                          <div key={`${item.index}-${item.line}`} className={`flex items-center gap-2 px-3 py-2 text-[10px] font-mono ${item.status === 'ok' ? 'text-emerald-700 bg-emerald-50/60' : 'text-red-700 bg-red-50/60'}`}>
                            <span className="font-black w-8">#{item.index}</span>
                            <span className="truncate flex-1">{item.line}</span>
                            {item.status === 'error' && <span className="font-bold">{item.reason}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <button onClick={handleBulkImportFacturas} disabled={savingFactura} className="w-full bg-slate-800 text-white p-3 rounded-xl text-xs font-bold hover:bg-slate-700 flex justify-center items-center gap-2 disabled:opacity-50">
                      {savingFactura ? <Loader className="animate-spin" size={16}/> : <Upload size={16} />} 
                      {savingFactura ? 'Procesando...' : 'Importar Facturas'}
                  </button>
                  <button onClick={handleDeleteAllFacturas} disabled={savingFactura} className="w-full mt-3 bg-red-50 text-red-700 p-3 rounded-xl text-xs font-bold hover:bg-red-100 flex justify-center items-center gap-2 disabled:opacity-50">
                      Borrar todas las facturas
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {showSalesImportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl animate-fade-in border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-lg text-slate-800 uppercase">Importar CSV StarPOS (Económico)</h3>
                <button onClick={() => setShowSalesImportModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Subí el archivo tal cual exporta StarPOS. El importador detecta período, sucursal, ticket promedio, cantidad de tickets y día más fuerte para guardarlo en Firebase.
              </p>

              <textarea
                className="w-full h-56 bg-slate-50 p-4 rounded-xl text-xs outline-none focus:ring-2 focus:ring-slate-500 mb-4 font-mono"
                placeholder="Pegá aquí el contenido del CSV de StarPOS..."
                value={salesImportText}
                onChange={(e) => setSalesImportText(e.target.value)}
              />

              <input
                ref={salesFileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={handleSalesFileSelect}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => salesFileInputRef.current?.click()}
                  className="w-full bg-slate-100 text-slate-700 p-3 rounded-xl text-xs font-bold hover:bg-slate-200 flex justify-center items-center gap-2"
                >
                  <Upload size={15} /> Subir archivo StarPOS
                </button>
                <button
                  onClick={() => handleImportSalesStats()}
                  disabled={savingSalesImport || !salesImportText.trim()}
                  className="w-full bg-slate-800 text-white p-3 rounded-xl text-xs font-bold hover:bg-slate-700 flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {savingSalesImport ? <Loader className="animate-spin" size={16} /> : <Save size={16} />}
                  {savingSalesImport ? 'Importando...' : 'Guardar en Firebase'}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;

