mport React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, ComposedChart, ReferenceLine
} from 'recharts';
import { 
  LayoutDashboard, TrendingUp, DollarSign, Percent, Store, Calendar, RefreshCcw, LogOut, ChevronRight, FileText, ArrowRight, Wallet, AlertTriangle, CheckCircle, HelpCircle, Activity, Scale, Filter, BarChart2, PieChart as PieIcon, Sliders, Banknote, Users, ArrowLeftRight, CreditCard, PiggyBank, Landmark
} from 'lucide-react';

/**
 * FIAMBRERIAS PAMPA - DASHBOARD INTEGRAL
 * Versión: Incluye KPI Margen Bruto % en Semáforos
 */

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];
const LOGO_URL = "https://raw.githubusercontent.com/indiocipo1979/dashboard-pampa/813294c2178aefbd20bf295d6968254b5d248790/logo_pampa.png";

// Función segura para limpiar montos
const cleanMonto = (val) => {
  if (typeof val === 'number') return Math.abs(val);
  const str = String(val || '0').trim();
  if (str === '' || str === '0') return 0;
  if (str.includes(',') && str.includes('.')) return Math.abs(parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0);
  if (str.includes(',')) return Math.abs(parseFloat(str.replace(',', '.')) || 0);
  return Math.abs(parseFloat(str) || 0);
};

// Función para formatear fechas
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

const KPICard = ({ title, value, icon: Icon, color, detail, subtext }) => (
  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between transition-all hover:shadow-md h-full">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-2xl ${color} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
      {detail && <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 uppercase tracking-tighter">{detail}</span>}
    </div>
    <div>
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
      <h3 className="text-2xl font-black text-slate-800 mt-1">{value}</h3>
      {subtext && <p className="text-[10px] text-slate-500 mt-2 font-medium bg-slate-50 p-2 rounded-lg leading-snug">{subtext}</p>}
    </div>
  </div>
);

const TrafficLightCard = ({ title, value, threshold, type = 'higherIsBetter', suffix = '' }) => {
  let statusColor = 'bg-slate-100 text-slate-500';
  let statusIcon = HelpCircle;
  let statusText = 'Neutro';
  const numValue = parseFloat(value);
  
  if (type === 'higherIsBetter') {
    if (numValue >= threshold.green) { statusColor = 'bg-emerald-100 text-emerald-700'; statusIcon = CheckCircle; statusText = 'Saludable'; }
    else if (numValue >= threshold.yellow) { statusColor = 'bg-amber-100 text-amber-700'; statusIcon = AlertTriangle; statusText = 'Atención'; }
    else { statusColor = 'bg-red-100 text-red-700'; statusIcon = AlertTriangle; statusText = 'Crítico'; }
  } else { 
    if (numValue <= threshold.green) { statusColor = 'bg-emerald-100 text-emerald-700'; statusIcon = CheckCircle; statusText = 'Óptimo'; }
    else if (numValue <= threshold.yellow) { statusColor = 'bg-amber-100 text-amber-700'; statusIcon = AlertTriangle; statusText = 'Cuidado'; }
    else { statusColor = 'bg-red-100 text-red-700'; statusIcon = AlertTriangle; statusText = 'Excesivo'; }
  }
  const Icon = statusIcon;
  return (
    <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between">
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <div className="flex items-baseline gap-1">
          <h3 className="text-xl font-black text-slate-800">{numValue}{suffix}</h3>
        </div>
      </div>
      <div className={`px-4 py-2 rounded-xl flex items-center gap-2 ${statusColor}`}>
        <Icon size={16} />
        <span className="text-[10px] font-black uppercase tracking-wide">{statusText}</span>
      </div>
    </div>
  );
};

const TabButton = ({ active, label, icon: Icon, onClick }) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${active ? 'bg-slate-800 text-white shadow-lg shadow-slate-300' : 'bg-white text-slate-400 hover:bg-slate-50'}`}>
    <Icon size={18} /> {label}
  </button>
);

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [currentTab, setCurrentTab] = useState('economico');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [usingMockData, setUsingMockData] = useState(false);
  
  const [selectedBranch, setSelectedBranch] = useState('Todas');
  const [selectedMonth, setSelectedMonth] = useState('Acumulado');

  const fetchData = async (targetTab) => {
    setLoading(true);
    setError(null);
    setUsingMockData(false);
    
    const sheetParam = targetTab === 'financiero' ? 'financiero' : 'ebitda';
    
    try {
      const res = await fetch(`/.netlify/functions/get-data?sheet=${sheetParam}`);
      if (!res.ok) throw new Error("Error del servidor");
      const rawData = await res.json();
      if (!rawData || rawData.length === 0) {
        setError("Hoja vacía o sin datos.");
        setUsingMockData(true);
        setData([]);
        return;
      }
      
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
    } catch (err) {
      console.error("Error:", err);
      setError(`Fallo de conexión: ${err.message}`);
      setUsingMockData(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchData(currentTab);
      setSelectedBranch('Todas');
      setSelectedMonth('Acumulado');
    }
  }, [currentTab, isLoggedIn]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'Pampa2026') setIsLoggedIn(true);
    else alert("Contraseña incorrecta.");
  };

  const formatCurrency = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);

  // --- LÓGICA ECONÓMICA (EBITDA) ---
  const economicStats = useMemo(() => {
    if (currentTab !== 'economico') return null;
    const filtered = data.filter(d => {
      const b = selectedBranch === 'Todas' || d.Sucursal === selectedBranch;
      const m = selectedMonth === 'Acumulado' || d.Mes === selectedMonth;
      return b && m;
    });

    const buckets = { ventas: [], cmv: [], gastos: [], comisiones: [], ignorados: [] };
    filtered.forEach(row => {
      const con = row.Concepto.toLowerCase();
      if (con.includes('venta') || con.includes('ingreso')) buckets.ventas.push(row);
      else if (con.includes('comision')) buckets.comisiones.push(row);
      else if (con.includes('cmv') || con.includes('costo') || con.includes('mercaderia')) buckets.cmv.push(row);
      else if (con.includes('gasto') || con.includes('fijo') || con.includes('estructura') || con.includes('egreso')) buckets.gastos.push(row);
      else buckets.ignorados.push(row);
    });

    const sum = (arr) => arr.reduce((a, b) => a + b.Monto, 0);
    const ventasNetas = sum(buckets.ventas) - sum(buckets.comisiones);
    const margenBruto = ventasNetas - sum(buckets.cmv);
    const ebitda = margenBruto - sum(buckets.gastos);
    const margenPct = ventasNetas > 0 ? (ebitda / ventasNetas) * 100 : 0;
    const ratioContribucion = ventasNetas > 0 ? (margenBruto / ventasNetas) : 0;
    const puntoEquilibrio = ratioContribucion > 0 ? (sum(buckets.gastos) / ratioContribucion) : 0;
    const pesoGastosFijos = ventasNetas > 0 ? (sum(buckets.gastos) / ventasNetas) * 100 : 0;
    // Cálculo nuevo para la tarjeta
    const margenBrutoPct = ventasNetas > 0 ? (margenBruto / ventasNetas) * 100 : 0;

    return { 
      ventasNetas, ebitda, margenPct, totalGastos: sum(buckets.gastos), margenBruto, puntoEquilibrio, pesoGastosFijos, margenBrutoPct,
      buckets 
    };
  }, [data, selectedBranch, selectedMonth, currentTab]);

  // --- LÓGICA FINANCIERA (CASH FLOW - Corregida v3) ---
  const financialStats = useMemo(() => {
    if (currentTab !== 'financiero') return null;
    const filtered = data.filter(d => selectedMonth === 'Acumulado' || d.Mes === selectedMonth);

    // Helper: Suma Entradas - Salidas explícitamente para un tipo
    const calcularRubro = (textoTipo) => {
      const items = filtered.filter(r => r.Tipo && r.Tipo.toLowerCase().includes(textoTipo));
      const totalEntradas = items.reduce((sum, item) => sum + (item.Entrada || 0), 0);
      const totalSalidas = items.reduce((sum, item) => sum + (item.Salida || 0), 0);
      return totalEntradas - totalSalidas; 
    };

    // 1. Resultado Operativo
    const resultadoOperativo = calcularRubro('operativo');
    
    // 2. Caja Comprometida
    const cajaComprometida = calcularRubro('comprometida'); 
    
    // 3. Caja Libre Real
    const cajaLibreReal = resultadoOperativo + cajaComprometida; 
    
    // 4. Personal
    const personalNeto = calcularRubro('personal');
    const personalSalida = filtered.filter(r => r.Tipo && r.Tipo.toLowerCase().includes('personal')).reduce((a,b) => a + (b.Salida || 0), 0);

    // 5. Financiamiento Neto
    const financiamientoNeto = calcularRubro('financiamiento'); 
    
    // 6. Aportes Neto
    const aportesNeto = calcularRubro('aporte'); 
    
    // 7. Dependencia Financiera CORREGIDA
    const dependenciaFinanciera = aportesNeto < 0 
      ? financiamientoNeto + aportesNeto 
      : financiamientoNeto - aportesNeto;

    // 8. Caja Real Final
    const cajaRealFinal = resultadoOperativo + cajaComprometida + personalNeto + financiamientoNeto;

    return { 
      resultadoOperativo, cajaComprometida, cajaLibreReal, 
      personalNeto, personalSalida,
      financiamientoNeto, aportesNeto, dependenciaFinanciera, cajaRealFinal
    };
  }, [data, selectedMonth, currentTab]);

  // --- CÁLCULO DE GRÁFICOS ---
  const chartData = useMemo(() => {
    if (currentTab === 'economico') {
      const filtered = data.filter(d => (selectedBranch === 'Todas' || d.Sucursal === selectedBranch));
      const months = [...new Set(filtered.map(d => d.Mes))].sort();
      
      const trend = months.map(m => {
        const p = filtered.filter(d => d.Mes === m);
        const sumMonto = (arr) => arr.reduce((a, b) => a + b.Monto, 0);
        const v = sumMonto(p.filter(r => r.Concepto.toLowerCase().includes('venta') || r.Concepto.toLowerCase().includes('ingreso')));
        const comis = sumMonto(p.filter(r => r.Concepto.toLowerCase().includes('comision')));
        const c = sumMonto(p.filter(r => r.Concepto.toLowerCase().includes('cmv')));
        const g = sumMonto(p.filter(r => {
           const con = r.Concepto.toLowerCase();
           return (con.includes('gasto') || con.includes('fijo')) && !con.includes('cmv') && !con.includes('comision');
        }));
        const ventasNetas = v - comis;
        const ebitda = ventasNetas - c - g;
        // Equilibrio
        const margen = ventasNetas - c;
        const ratio = ventasNetas > 0 ? margen / ventasNetas : 0;
        const equilibrio = ratio > 0 ? g / ratio : 0;
        return { name: m, ventas: ventasNetas, ebitda, equilibrio };
      });

      const stats = economicStats || { ventasNetas: 0, margenBruto: 0, totalGastos: 0, ebitda: 0, buckets: { cmv: [] } };
      const cmvTotal = stats.buckets?.cmv ? stats.buckets.cmv.reduce((a,b)=>a+b.Monto,0) : 0;

      const waterfall = [
        { name: '1. Ingresos', valor: stats.ventasNetas, base: 0, fill: '#3b82f6', label: 'Ventas Netas' },
        { name: '2. Mercadería', valor: cmvTotal, base: Math.max(0, stats.margenBruto), fill: '#f97316', label: '- Costo Mercadería' },
        { name: '3. Margen Bruto', valor: stats.margenBruto, base: 0, fill: '#6366f1', label: '= Margen Bruto' },
        { name: '4. Gastos', valor: stats.totalGastos, base: Math.max(0, stats.ebitda), fill: '#ef4444', label: '- Gastos Fijos' },
        { name: '5. EBITDA', valor: stats.ebitda, base: 0, fill: '#10b981', label: '= Resultado' }
      ];

      return { trend, waterfall };
    }
    return null;
  }, [data, selectedBranch, selectedMonth, currentTab, economicStats]);

  const branches = ['Todas', ...new Set(data.map(d => d.Sucursal))].filter(Boolean);
  const months = ['Acumulado', ...new Set(data.map(d => d.Mes))].filter(Boolean).sort().reverse();

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
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

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-20 font-sans text-slate-900">
      <nav className="bg-white border-b border-slate-100 h-20 px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center overflow-hidden">
            <img src={LOGO_URL} alt="Logo" className="h-full w-full object-contain" />
          </div>
          <h1 className="font-black text-lg tracking-tighter uppercase leading-none hidden sm:block">FIAMBRERIAS PAMPA</h1>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <TabButton active={currentTab === 'economico'} label="Económico" icon={BarChart2} onClick={() => setCurrentTab('economico')} />
          <TabButton active={currentTab === 'financiero'} label="Flujo de Fondos" icon={Banknote} onClick={() => setCurrentTab('financiero')} />
        </div>
        <div className="flex gap-4">
          <button onClick={() => fetchData(currentTab)} className="p-3 bg-slate-50 rounded-2xl hover:bg-slate-100"><RefreshCcw size={20}/></button>
          <button onClick={() => setIsLoggedIn(false)} className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl text-xs font-bold">SALIR</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 mt-10 space-y-10">
        
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

        {/* --- VISTA ECONÓMICA (EBITDA) --- */}
        {currentTab === 'economico' && economicStats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <KPICard title="Ventas Netas" value={formatCurrency(economicStats.ventasNetas)} icon={TrendingUp} color="bg-blue-600" detail="Ingresos Reales" />
              <KPICard title="Punto de Equilibrio" value={formatCurrency(economicStats.puntoEquilibrio)} icon={Scale} color="bg-purple-500" detail="Meta Mensual" />
              <KPICard title="Margen Bruto" value={formatCurrency(economicStats.margenBruto)} icon={Wallet} color="bg-indigo-500" detail="Contribución" />
              <KPICard title="Gastos Fijos" value={formatCurrency(economicStats.totalGastos)} icon={FileText} color="bg-red-600" detail="Estructura" />
              <KPICard title="EBITDA" value={formatCurrency(economicStats.ebitda)} icon={DollarSign} color="bg-emerald-600" detail="Resultado" />
            </div>

            {/* SEMÁFOROS CON NUEVO KPI */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <TrafficLightCard title="Margen Bruto %" value={economicStats.margenBrutoPct.toFixed(1)} suffix="%" threshold={{ green: 40, yellow: 30 }} type="higherIsBetter" />
              <TrafficLightCard title="Salud del Margen EBITDA" value={economicStats.margenPct.toFixed(1)} suffix="%" threshold={{ green: 15, yellow: 8 }} type="higherIsBetter" />
              <TrafficLightCard title="Cobertura Punto de Equilibrio" value={economicStats.puntoEquilibrio > 0 ? ((economicStats.ventasNetas / economicStats.puntoEquilibrio) * 100).toFixed(0) : 0} suffix="%" threshold={{ green: 100, yellow: 90 }} type="higherIsBetter" />
              <TrafficLightCard title="Peso Gastos Fijos s/Venta" value={economicStats.pesoGastosFijos.toFixed(1)} suffix="%" threshold={{ green: 30, yellow: 40 }} type="lowerIsBetter" />
            </div>

            {chartData && (
              <>
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

                <div className="grid grid-cols-1 gap-8">
                  <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 h-[450px]">
                    <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-6 flex items-center gap-2"><BarChart2 size={16}/> Cascada de Resultados (P&L)</h3>
                    <ResponsiveContainer width="100%" height="80%">
                      <BarChart data={chartData.waterfall}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} interval={0} />
                        <Tooltip cursor={{fill: 'transparent'}} content={({ payload }) => { if (payload && payload.length) return <div className="bg-white p-4 rounded-xl shadow-lg border"><p className="font-bold text-slate-500 text-xs">{payload[0].payload.label}</p><p className="font-black text-lg">{formatCurrency(payload[0].value)}</p></div>; return null; }} />
                        <Bar dataKey="base" stackId="a" fill="transparent" />
                        <Bar dataKey="valor" stackId="a" radius={[6, 6, 6, 6]}>
                          {chartData.waterfall.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* --- VISTA FINANCIERA (CASH FLOW REAL) --- */}
        {currentTab === 'financiero' && financialStats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard title="Resultado Operativo" value={formatCurrency(financialStats.resultadoOperativo)} icon={Activity} color="bg-blue-600" detail="Dinero Generado" subtext="Operaciones del mes" />
              <KPICard title="Caja Comprometida" value={formatCurrency(financialStats.cajaComprometida)} icon={AlertTriangle} color="bg-orange-500" detail="Pasivos/Cheques" subtext="Deuda vieja pagada" />
              <KPICard title="CAJA LIBRE REAL" value={formatCurrency(financialStats.cajaLibreReal)} icon={Wallet} color={financialStats.cajaLibreReal >= 0 ? "bg-emerald-600" : "bg-red-600"} detail="Disponibilidad Real" subtext="Operativo + Comprometido" />
              <KPICard title="Caja Real Final" value={formatCurrency(financialStats.cajaRealFinal)} icon={PiggyBank} color={financialStats.cajaRealFinal >= 0 ? "bg-indigo-600" : "bg-red-600"} detail="Bolsillo del Mes" subtext="Después de todo" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 1. Financiamiento Neto */}
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-800 uppercase text-xs mb-2">Financiamiento Neto</h3>
                  <p className={`text-3xl font-black ${financialStats.financiamientoNeto >= 0 ? 'text-slate-800' : 'text-red-600'}`}>{formatCurrency(financialStats.financiamientoNeto)}</p>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Préstamos - Pagos</p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600"><CreditCard size={32}/></div>
              </div>

              {/* 2. Retiros Personales */}
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-800 uppercase text-xs mb-2">Retiros Personales</h3>
                  <p className={`text-3xl font-black ${financialStats.personalNeto < 0 ? 'text-red-600' : 'text-slate-800'}`}>{formatCurrency(financialStats.personalNeto)}</p>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Salidas por Tipo "Personal"</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-2xl text-purple-600"><Users size={32}/></div>
              </div>

              {/* 3. Dependencia Financiera */}
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-800 uppercase text-xs mb-2">Dependencia Financiera</h3>
                  <p className={`text-3xl font-black ${financialStats.dependenciaFinanciera < 0 ? 'text-red-600' : 'text-slate-800'}`}>{formatCurrency(financialStats.dependenciaFinanciera)}</p>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Aportes + Financiamiento Neto</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-2xl text-blue-600"><Landmark size={32}/></div>
              </div>
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
                  <Tooltip cursor={{fill: 'transparent'}} content={({ payload }) => { if (payload && payload.length) return <div className="bg-white p-4 rounded-xl shadow-lg border"><p className="font-bold text-slate-500 text-xs">{payload[0].payload.label}</p><p className="font-black text-lg">{formatCurrency(payload[0].value)}</p></div>; return null; }} />
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
      </main>
    </div>
  );
};

const mockData = [{ Mes: '2024-01', Sucursal: 'Centro', Concepto: 'Ingreso', Subconcepto: 'Efectivo', Monto: 100000 }];
const root = createRoot(document.getElementById('root'));
root.render(<App />);

export default App;
