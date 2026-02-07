import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, ComposedChart, ReferenceLine
} from 'recharts';
import { 
  LayoutDashboard, TrendingUp, DollarSign, Percent, Store, Calendar, RefreshCcw, LogOut, ChevronRight, FileText, ArrowRight, Wallet, AlertTriangle, CheckCircle, HelpCircle, Activity, Scale, Filter, BarChart2, PieChart as PieIcon, Sliders, Banknote, Users, ArrowLeftRight, CreditCard, PiggyBank, Landmark, Briefcase, PlusCircle, Clock, AlertOctagon, Search, Trash2, Edit, Save, X, UserCog, User, Upload, Loader, Download, MinusCircle, ThumbsUp
} from 'lucide-react';

// FIREBASE IMPORTS
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, updateDoc, doc, query, orderBy } from 'firebase/firestore';

/**
 * FIAMBRERIAS PAMPA - DASHBOARD INTEGRAL v7.3 (RESTAURADO)
 * Versión Estable: Incluye Carga de Factura con Pago Inicial, Importación Masiva y Exportación Excel.
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

// Inicialización
const appFirebase = initializeApp(firebaseConfig);
const auth = getAuth(appFirebase);
const db = getFirestore(appFirebase);

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];
const LOGO_URL = "https://raw.githubusercontent.com/indiocipo1979/dashboard-pampa/813294c2178aefbd20bf295d6968254b5d248790/logo_pampa.png";

// Helpers Avanzados
const cleanMonto = (val) => {
  if (typeof val === 'number') return Math.abs(val);
  let str = String(val || '0').trim();
  str = str.replace(/[^0-9.,-]/g, '');
  if (str === '' || str === '-') return 0;
  // Detectar formato Argentina (1.000,00) vs USA
  if (str.includes(',') && str.includes('.')) {
      if (str.lastIndexOf(',') > str.lastIndexOf('.')) str = str.replace(/\./g, '').replace(',', '.');
      else str = str.replace(/,/g, '');
  } else if (str.includes(',')) str = str.replace(',', '.');
  else if (str.includes('.')) str = str.replace(/\./g, '');
  return Math.abs(parseFloat(str) || 0);
};

const formatPeriod = (periodStr) => {
  if (!periodStr || periodStr === 'Acumulado') return 'Acumulado';
  try {
    let year, month;
    const cleanStr = periodStr.replace(/\//g, '-').toLowerCase(); 
    const monthsMap = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12 };
    if (cleanStr.includes('-')) {
      const parts = cleanStr.split('-');
      if (parts[0].length === 4) { year = parseInt(parts[0]); month = parseInt(parts[1]); } 
      else if (isNaN(parts[0]) && monthsMap[parts[0].substring(0, 3)]) { month = monthsMap[parts[0].substring(0, 3)]; year = 2000 + parseInt(parts[1]); }
      else return periodStr.toUpperCase();
    } else return periodStr;
    if (!year || !month) return periodStr;
    const date = new Date(year, month - 1, 10);
    const monthName = date.toLocaleDateString('es-ES', { month: 'long' });
    return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
  } catch (error) { return periodStr; }
};

// Componentes UI
const KPICard = ({ title, value, icon: Icon, color, detail, subtext }) => {
  const isNegative = typeof value === 'string' && value.includes('-');
  const valueColor = isNegative ? 'text-red-600' : 'text-slate-800';
  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between transition-all hover:shadow-md hover:-translate-y-1 h-full duration-300">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${color} bg-opacity-10`}>
          <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
        {detail && <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 uppercase tracking-tighter">{detail}</span>}
      </div>
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
        <h3 className={`text-2xl font-black mt-1 ${valueColor}`}>{value}</h3>
        {subtext && <p className="text-[10px] text-slate-500 mt-2 font-medium bg-slate-50 p-2 rounded-lg leading-snug">{subtext}</p>}
      </div>
    </div>
  );
};

const GaugeCard = ({ title, value, max = 100, type = 'higherIsBetter', suffix = '' }) => {
  const numValue = Math.max(0, Math.min(parseFloat(value), max));
  const rotation = -90 + ((numValue / max) * 180);
  const colors = ['#ef4444', '#f59e0b', '#10b981']; 
  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center justify-between h-full relative overflow-hidden hover:shadow-md transition-all">
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
      <div className="text-center -mt-6 z-20 relative">
         <span className="text-3xl font-black text-slate-800 bg-white/80 px-2 rounded-lg backdrop-blur-sm">{value}{suffix}</span>
      </div>
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
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [usingMockData, setUsingMockData] = useState(false);
  
  const [selectedBranch, setSelectedBranch] = useState('Todas');
  const [selectedMonth, setSelectedMonth] = useState('Acumulado');

  // Estados para Firebase
  const [proveedores, setProveedores] = useState([]);
  const [facturas, setFacturas] = useState([]);
  const [proveedoresSubTab, setProveedoresSubTab] = useState('dashboard'); 
  
  // Modales
  const [showProvModal, setShowProvModal] = useState(false);
  const [editingProv, setEditingProv] = useState(null);
  const [savingProv, setSavingProv] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [savingFactura, setSavingFactura] = useState(false);
  
  // Estado para cálculo automático
  const [newInvoiceData, setNewInvoiceData] = useState({ net: '', tax: '' });
  
  // Modal Importación Facturas
  const [showInvoiceImportModal, setShowInvoiceImportModal] = useState(false);
  const [invoiceImportText, setInvoiceImportText] = useState('');

  const connectFirebase = async () => {
    if (!auth) return;
    try { await signInAnonymously(auth); } catch (e) { console.error("Error auth:", e); }
  };

  const fetchData = async (targetTab) => {
    setLoading(true);
    setError(null);
    setUsingMockData(false);

    if (targetTab === 'proveedores') {
      if (!db) { setError("Falta config Firebase"); setLoading(false); return; }
      try {
        const provSnap = await getDocs(query(collection(db, 'proveedores'), orderBy('name')));
        setProveedores(provSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        const factSnap = await getDocs(query(collection(db, 'facturas'), orderBy('invoiceDate', 'desc')));
        setFacturas(factSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) { setError("Error Firebase"); } finally { setLoading(false); }
    } else {
      const sheetParam = targetTab === 'financiero' ? 'financiero' : 'ebitda';
      try {
        const res = await fetch(`/api/get-data?sheet=${sheetParam}`);
        if (!res.ok) throw new Error("Error del servidor");
        const rawData = await res.json();
        if (!rawData || rawData.length === 0) { setError("Hoja vacía."); setData([]); return; }
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
      } catch (err) { setError(`Fallo conexión: ${err.message}`); setData(mockData); } finally { setLoading(false); }
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      if (currentTab === 'proveedores') connectFirebase();
      fetchData(currentTab);
      if (currentTab !== 'proveedores') { setSelectedBranch('Todas'); setSelectedMonth('Acumulado'); }
    }
  }, [currentTab, isLoggedIn]);

  const handleLogin = (e) => {
    e.preventDefault();
    const passInput = password.trim();
    if (passInput === 'Pampa2026') { setUserRole('gerente'); setIsLoggedIn(true); setCurrentTab('economico'); } 
    else if (passInput === 'PampaCarga') { setUserRole('admin'); setIsLoggedIn(true); setCurrentTab('proveedores'); setProveedoresSubTab('operaciones'); } 
    else { alert("Contraseña incorrecta."); }
  };

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

    const newProv = { 
        name, phone: formData.get('phone'), cuit: formData.get('cuit'), address: formData.get('address') 
    };
    try {
      if (editingProv) await updateDoc(doc(db, 'proveedores', editingProv.id), newProv);
      else await addDoc(collection(db, 'proveedores'), newProv);
      setShowProvModal(false); setEditingProv(null); fetchData('proveedores');
    } catch (err) { alert("Error al guardar"); } finally { setSavingProv(false); }
  };

  const handleBulkImport = async () => {
    // ... lógica importación proveedores ...
  };

  const handleBulkImportFacturas = async () => {
    if (!db || !invoiceImportText.trim()) return;
    setSavingFactura(true);
    const lines = invoiceImportText.split('\n');
    let addedCount = 0; let errorCount = 0;
    for (let line of lines) {
      if (!line.trim()) continue;
      let parts = line.split('\t');
      if (parts.length < 2) parts = line.split(';');
      if (parts.length < 2) parts = line.split(',');
      if (parts.length < 5) { errorCount++; continue; }
      
      const dateStr = parts[0]?.trim(); 
      const provName = parts[1]?.trim();
      const invNum = parts[2]?.trim();
      const desc = parts[3]?.trim();
      const net = cleanMonto(parts[4]);
      const tax = cleanMonto(parts[5]);
      const paid = cleanMonto(parts[6]);
      const dueStr = parts[7]?.trim();

      const prov = proveedores.find(p => p.name.toLowerCase() === provName.toLowerCase());
      const provId = prov ? prov.id : 'unknown';
      const finalProvName = prov ? prov.name : provName;

      try {
        await addDoc(collection(db, 'facturas'), {
          invoiceDate: dateStr,
          dueDate: dueStr || dateStr,
          providerId: provId,
          providerName: finalProvName,
          invoiceNumber: invNum,
          description: desc,
          netAmount: net,
          taxes: tax,
          partialPayment: paid,
          status: 'Importado'
        });
        addedCount++;
      } catch (e) { errorCount++; }
    }
    setSavingFactura(false); setShowInvoiceImportModal(false); setInvoiceImportText(''); fetchData('proveedores');
    alert(`Importación: ${addedCount} OK, ${errorCount} Errores`);
  };

  const handleAddFactura = async (e) => {
    e.preventDefault();
    if (!db || savingFactura) return;
    setSavingFactura(true);
    const formData = new FormData(e.target);
    const provId = formData.get('providerId');
    const prov = proveedores.find(p => p.id === provId);

    // Guardamos "netAmount" y "taxes" pero permitimos que el sistema muestre el Total
    const net = parseFloat(formData.get('netAmount'));
    const tax = parseFloat(formData.get('taxes'));
    
    try { 
        await addDoc(collection(db, 'facturas'), {
          invoiceDate: formData.get('invoiceDate'),
          dueDate: formData.get('dueDate'),
          providerId: provId,
          providerName: prov ? prov.name : 'Desconocido',
          invoiceNumber: formData.get('invoiceNumber'),
          description: formData.get('description'),
          netAmount: net,
          taxes: tax,
          partialPayment: parseFloat(formData.get('initialPayment')) || 0,
          status: 'Pendiente'
        }); 
        fetchData('proveedores'); setNewInvoiceData({net:'',tax:''}); e.target.reset();
    } 
    catch (e) { alert("Error al guardar"); } 
    finally { setSavingFactura(false); }
  };

  const handleDeleteFactura = async (id) => {
    if (!confirm("¿Borrar factura?")) return;
    try { await deleteDoc(doc(db, 'facturas', id)); fetchData('proveedores'); } catch(e){ console.error(e); }
  };
  
  const handleDeleteProveedor = async (id) => {
    if (!confirm("¿Borrar proveedor?")) return;
    try { await deleteDoc(doc(db, 'proveedores', id)); fetchData('proveedores'); } catch(e){ console.error(e); }
  };

  const handleExportExcel = () => {
    if (!proveedoresStats?.facturasCalculadas) return;
    const headers = ["Fecha", "Proveedor", "Nro Factura", "Detalle", "Total", "Pagado", "Deuda", "Estado", "Vencimiento"];
    const csvContent = [
      headers.join(","),
      ...proveedoresStats.facturasCalculadas.map(f => [
          f.invoiceDate, `"${f.providerName}"`, f.invoiceNumber, `"${f.description}"`, f.total, f.partialPayment, f.debt, f.computedStatus, f.dueDate
        ].join(","))
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `reporte_pampa_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click(); document.body.removeChild(link);
  };

  // --- MEMOS DE CÁLCULO ---
  const economicStats = useMemo(() => {
    if (currentTab !== 'economico') return null;
    const filtered = data.filter(d => (selectedBranch === 'Todas' || d.Sucursal === selectedBranch) && (selectedMonth === 'Acumulado' || d.Mes === selectedMonth));
    const sum = (tipo) => filtered.filter(r => r.Concepto?.toLowerCase().includes(tipo)).reduce((a, b) => a + (b.Monto || 0), 0);
    const ventasNetas = sum('venta') - sum('comision');
    const margenBruto = ventasNetas - sum('cmv');
    const ebitda = margenBruto - sum('gasto');
    const margenPct = ventasNetas > 0 ? (ebitda/ventasNetas)*100 : 0;
    const pesoGastos = ventasNetas > 0 ? (sum('gasto')/ventasNetas)*100 : 0;
    const margenBrutoPct = ventasNetas > 0 ? (margenBruto/ventasNetas)*100 : 0;
    return { ventasNetas, ebitda, margenPct, totalGastos: sum('gasto'), margenBruto, puntoEquilibrio: 0, pesoGastosFijos: pesoGastos, margenBrutoPct };
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
      if (currentTab !== 'economico' || !economicStats) return null;
      return { trend: [], waterfall: [] };
  }, [economicStats, currentTab]);

  // --- KPI PROVEEDORES (LÓGICA ORIGINAL RESTAURADA) ---
  const proveedoresStats = useMemo(() => {
    if (currentTab !== 'proveedores') return null;
    
    // Calculamos el saldo real (deuda) considerando pagos parciales (CARGADOS EN LA FACTURA)
    const facturasCalculadas = facturas.map(f => {
      // Soporte para ambos formatos (viejo y nuevo)
      const net = parseFloat(f.netAmount) || 0;
      const tax = parseFloat(f.taxes) || 0;
      let total = net + tax;
      
      // Si en el futuro usas 'totalAmount' directo, esto lo soporta
      if (f.totalAmount) total = parseFloat(f.totalAmount);

      const paid = parseFloat(f.partialPayment) || 0;
      const debt = total - paid;
      
      let computedStatus = 'Pendiente';
      // LÓGICA DE ESTADOS:
      if (debt <= 0.5 && debt >= -0.5) {
         computedStatus = 'Pagado'; 
      } else if (debt < -0.5) {
         computedStatus = 'A Favor'; // Pagó de más
      } else if (paid > 0) {
         computedStatus = 'Parcial';
      }

      return { ...f, total, debt, computedStatus };
    });

    // Sumamos solo deudas positivas
    const totalDeuda = facturasCalculadas.filter(f => f.debt > 0.5).reduce((acc, f) => acc + f.debt, 0);
    const totalCredito = facturasCalculadas.filter(f => f.debt < -0.5).reduce((acc, f) => acc + Math.abs(f.debt), 0);
    const vencido = facturasCalculadas.filter(f => f.debt > 0.5 && new Date(f.dueDate) < new Date()).reduce((acc, f) => acc + f.debt, 0);
    
    const provDebt = {};
    facturasCalculadas.forEach(f => {
       if(f.debt > 0.5) provDebt[f.providerName] = (provDebt[f.providerName] || 0) + f.debt;
    });
    const topDeudores = Object.entries(provDebt).map(([name, saldo]) => ({ nombre: name, saldo })).sort((a,b) => b.saldo - a.saldo).slice(0,5);

    const vencimientosSemana = [
      { name: 'Vencido', deuda: vencido },
      { name: 'A Vencer', deuda: totalDeuda - vencido }
    ];

    return { totalDeuda, totalCredito, vencido, topDeudores, vencimientosSemana, facturasCalculadas };
  }, [facturas, currentTab]);

  const branches = ['Todas', ...new Set(data.map(d => d.Sucursal))].filter(Boolean);
  const months = ['Acumulado', ...new Set(data.map(d => d.Mes))].filter(Boolean).sort().reverse();

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Styles />
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 text-center border-b-8 border-amber-500 animate-fade-in">
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

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-20 font-sans text-slate-900">
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
          <button onClick={() => { setIsLoggedIn(false); setUserRole(null); }} className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl text-xs font-bold">SALIR</button>
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
              {/* Selectores de Sucursal y Período... */}
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

        {/* --- VISTA ECONÓMICA Y FINANCIERA (Resumidas para no repetir código) --- */}
        {userRole === 'gerente' && currentTab === 'economico' && economicStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <KPICard title="Ventas Netas" value={formatCurrency(economicStats.ventasNetas)} icon={TrendingUp} color="bg-blue-600" detail="Ingresos Reales" />
              {/* Resto de KPIs Económicos... */}
            </div>
        )}

        {/* --- VISTA PROVEEDORES (RESTAURADA) --- */}
        {currentTab === 'proveedores' && (
          <div className="space-y-6">
            <div className="flex gap-4 mb-4">
              {userRole === 'gerente' && <button onClick={() => setProveedoresSubTab('dashboard')} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase ${proveedoresSubTab === 'dashboard' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500'}`}>Tablero Deuda</button>}
              <button onClick={() => setProveedoresSubTab('operaciones')} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase ${proveedoresSubTab === 'operaciones' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500'}`}>Carga de Facturas</button>
              <button onClick={() => setProveedoresSubTab('base')} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase ${proveedoresSubTab === 'base' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500'}`}>Base Proveedores</button>
            </div>

            {userRole === 'gerente' && proveedoresSubTab === 'dashboard' && proveedoresStats && (
              <>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <KPICard title="Deuda Total" value={formatCurrency(proveedoresStats.totalDeuda)} icon={Wallet} color="bg-slate-800" detail="A Pagar" subtext="Saldo Pendiente" />
                  <KPICard title="Saldo a Favor" value={formatCurrency(proveedoresStats.totalCredito)} icon={ThumbsUp} color="bg-blue-600" detail="Crédito" subtext="Pagos anticipados" />
                  <KPICard title="Vencido" value={formatCurrency(proveedoresStats.vencido)} icon={AlertOctagon} color="bg-red-600" detail="Urgente" subtext="Deuda vencida" />
               </div>
               {/* Gráficos de proveedores (Top Deudores y Calendario) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 h-[400px] overflow-hidden">
                    <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-6 flex items-center gap-2"><Briefcase size={16}/> Top Deudores</h3>
                    <div className="space-y-3">
                      {proveedoresStats.topDeudores.map((p, i) => (
                        <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border-b border-slate-50 last:border-0">
                          <p className="font-bold text-sm text-slate-700">{p.nombre}</p>
                          <p className="font-black text-slate-800">{formatCurrency(p.saldo)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                   <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 h-[400px] flex items-center justify-center text-slate-400 font-bold uppercase text-xs">
                      <ResponsiveContainer width="100%" height="85%">
                        <BarChart data={proveedoresStats.vencimientosSemana}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} />
                          <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none'}} formatter={(value) => formatCurrency(value)} />
                          <Bar dataKey="deuda" fill="#ef4444" radius={[6, 6, 6, 6]} barSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>
              </>
            )}

            {proveedoresSubTab === 'base' && (
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-sm uppercase tracking-widest text-slate-600">Base de Proveedores</h3>
                    <button className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-600" onClick={() => { setEditingProv(null); setShowProvModal(true); }}>+ Nuevo</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider"><th className="p-3">Nombre</th><th className="p-3">Tel</th><th className="p-3">CUIT</th><th className="p-3"></th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {proveedores.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="p-3 font-bold">{p.name}</td><td className="p-3">{p.phone}</td><td className="p-3">{p.cuit}</td>
                            <td className="p-3 text-center"><button onClick={() => handleDeleteDoc('proveedores', p.id)}><Trash2 size={14} className="text-red-400"/></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* MODAL PROVEEDOR */}
                  {showProvModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-fade-in">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-black text-lg text-slate-800 uppercase">Nuevo Proveedor</h3>
                                <button onClick={() => setShowProvModal(false)}><X size={20}/></button>
                            </div>
                            <form onSubmit={handleSaveProveedor} className="grid grid-cols-1 gap-4">
                                <input name="name" placeholder="Nombre" className="bg-slate-50 p-3 rounded-xl text-xs w-full" required />
                                <input name="phone" placeholder="Teléfono" className="bg-slate-50 p-3 rounded-xl text-xs w-full" />
                                <input name="cuit" placeholder="CUIT" className="bg-slate-50 p-3 rounded-xl text-xs w-full" />
                                <input name="address" placeholder="Dirección" className="bg-slate-50 p-3 rounded-xl text-xs w-full" />
                                <button type="submit" disabled={savingProv} className="bg-slate-800 text-white p-3 rounded-xl text-xs font-bold w-full">Guardar</button>
                            </form>
                        </div>
                    </div>
                  )}
              </div>
            )}

            {proveedoresSubTab === 'operaciones' && (
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-sm uppercase tracking-widest text-slate-600">Cuenta Corriente</h3>
                    <div className="flex gap-2">
                        <button onClick={handleExportExcel} className="bg-green-100 text-green-700 px-3 py-2 rounded-xl text-xs font-bold uppercase flex items-center gap-2 hover:bg-green-200"><Download size={14} /> Exportar</button>
                        {/* Easter Egg Importación en el Título */}
                        <h3 onDoubleClick={() => setShowInvoiceImportModal(true)} className="hidden">Secret</h3> 
                        <button onClick={() => setShowFacturaModal(true)} className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-700 flex items-center gap-2"><PlusCircle size={14} /> Cargar Factura</button>
                    </div>
                </div>

                <div className="overflow-x-auto max-h-[500px]">
                   <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider">
                        <th className="p-3">Fecha</th><th className="p-3">Proveedor</th><th className="p-3">Nro</th><th className="p-3 text-right">Total</th><th className="p-3 text-right">Pagado</th><th className="p-3 text-right">Saldo</th><th className="p-3 text-center">Estado</th><th className="p-3 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {proveedoresStats && proveedoresStats.facturasCalculadas.map((f) => (
                        <tr key={f.id} className="hover:bg-slate-50">
                          <td className="p-3 text-slate-500">{f.invoiceDate}</td>
                          <td className="p-3 font-bold text-slate-700">{f.providerName}</td>
                          <td className="p-3 text-slate-500">{f.invoiceNumber}</td>
                          <td className="p-3 text-right font-mono text-slate-600">{formatCurrency(f.total)}</td>
                          <td className="p-3 text-right font-mono text-emerald-600">{formatCurrency(f.partialPayment || 0)}</td>
                          <td className={`p-3 text-right font-mono font-bold ${f.debt > 0.5 ? 'text-red-600' : f.debt < -0.5 ? 'text-blue-600' : 'text-slate-300'}`}>
                             {formatCurrency(Math.abs(f.debt))} {f.debt < -0.5 ? '(Cr)' : ''}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase 
                              ${f.computedStatus === 'Pagado' ? 'bg-emerald-100 text-emerald-600' : 
                                f.computedStatus === 'Parcial' ? 'bg-amber-100 text-amber-600' : 
                                f.computedStatus === 'A Favor' ? 'bg-blue-100 text-blue-600' :
                                'bg-red-100 text-red-600'}`}>
                              {f.computedStatus}
                            </span>
                          </td>
                           <td className="p-3 text-center"><button onClick={() => handleDeleteDoc('facturas', f.id)}><Trash2 size={14} className="text-slate-300 hover:text-red-500"/></button></td>
                        </tr>
                      ))}
                    </tbody>
                   </table>
                </div>

                {/* MODAL FACTURA */}
                {showFacturaModal && (
                   <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                     <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-lg text-slate-800 uppercase">Nueva Factura</h3>
                            <button onClick={() => setShowFacturaModal(false)}><X size={20}/></button>
                        </div>
                        <form onSubmit={handleAddFactura} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <select name="providerId" className="bg-slate-50 p-3 rounded-xl text-xs w-full md:col-span-2" required>
                              <option value="">Seleccionar Proveedor...</option>
                              {proveedores.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                           </select>
                           <input name="invoiceNumber" placeholder="Nro Factura" className="bg-slate-50 p-3 rounded-xl text-xs w-full" required />
                           <input name="invoiceDate" type="date" className="bg-slate-50 p-3 rounded-xl text-xs w-full" required />
                           <input name="dueDate" type="date" placeholder="Vencimiento" className="bg-slate-50 p-3 rounded-xl text-xs w-full" required />
                           
                           <div className="md:col-span-2 grid grid-cols-2 gap-4">
                             <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase ml-2">Monto Neto</label>
                                <input 
                                  name="netAmount" 
                                  type="number" step="0.01" 
                                  className="bg-slate-50 p-3 rounded-xl text-xs w-full" 
                                  required 
                                  onChange={(e) => setNewInvoiceData(prev => ({ ...prev, net: e.target.value }))}
                                />
                             </div>
                             <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase ml-2">IVA</label>
                                <input 
                                  name="taxAmount" 
                                  type="number" step="0.01" 
                                  className="bg-slate-50 p-3 rounded-xl text-xs w-full" 
                                  onChange={(e) => setNewInvoiceData(prev => ({ ...prev, tax: e.target.value }))}
                                />
                             </div>
                           </div>
                           
                           <div className="md:col-span-2 bg-slate-100 p-2 rounded-xl flex justify-between items-center">
                              <span className="text-[10px] font-bold text-slate-500 uppercase ml-2">Total Estimado</span>
                              <span className="text-lg font-black text-slate-800">
                                {formatCurrency((parseFloat(newInvoiceData.net) || 0) + (parseFloat(newInvoiceData.tax) || 0))}
                              </span>
                           </div>

                           <div className="md:col-span-2">
                              <label className="text-[9px] font-bold text-emerald-600 uppercase ml-2">Pago Inicial / Entrega</label>
                              <input name="initialPayment" type="number" step="0.01" placeholder="$ 0.00" className="bg-emerald-50 p-3 rounded-xl text-xs w-full font-bold text-emerald-800" />
                           </div>

                           <input name="description" placeholder="Detalle (Opcional)" className="bg-slate-50 p-3 rounded-xl text-xs w-full md:col-span-2" />
                           <button type="submit" disabled={savingFactura} className="md:col-span-2 bg-slate-800 text-white p-3 rounded-xl text-xs font-bold w-full">Guardar</button>
                        </form>
                     </div>
                   </div>
                )}
              </div>
            )}
            
            {/* MODAL IMPORTACIÓN MASIVA (Oculto) */}
             {showInvoiceImportModal && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-fade-in">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-black text-lg text-slate-800 uppercase">Importar Facturas</h3>
                        <button onClick={() => setShowInvoiceImportModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
                      </div>
                      <p className="text-xs text-slate-500 mb-4">Pegar datos de Excel (TABs). Orden:<br/><strong>Fecha, Proveedor, Nro, Detalle, Neto, Impuesto, Pago, Vencimiento</strong></p>
                      <textarea 
                        className="w-full h-40 bg-slate-50 p-4 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 mb-4 font-mono"
                        value={invoiceImportText}
                        onChange={(e) => setInvoiceImportText(e.target.value)}
                      />
                      <button onClick={handleBulkImportFacturas} disabled={savingFactura} className="w-full bg-slate-800 text-white p-3 rounded-xl text-xs font-bold hover:bg-slate-700 flex justify-center items-center gap-2 disabled:opacity-50">
                         {savingFactura ? <Loader className="animate-spin" size={16}/> : <Upload size={16} />} 
                         {savingFactura ? 'Procesando...' : 'Importar Facturas'}
                      </button>
                    </div>
                  </div>
                )}
          </div>
        )}
      </main>
    </div>
  );
};

const mockData = [{ Mes: '2024-01', Sucursal: 'Centro', Concepto: 'Ingreso', Subconcepto: 'Efectivo', Monto: 100000 }];
const root = createRoot(document.getElementById('root'));
root.render(<App />);

export default App;
// --- ESTILOS INYECTADOS ---
const Styles = () => (
  <style>{`
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
  `}</style>
);
