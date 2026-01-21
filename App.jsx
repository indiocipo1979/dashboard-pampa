import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, ComposedChart, ReferenceLine
} from 'recharts';
import { 
  LayoutDashboard, TrendingUp, DollarSign, Percent, Store, Calendar, RefreshCcw, LogOut, ChevronRight, FileText, ArrowRight, Wallet, AlertTriangle, CheckCircle, HelpCircle, Activity, Scale
} from 'lucide-react';

/**
 * PAMPA FIAMBRES - DASHBOARD DE GESTIÓN ESTRATÉGICA
 * Versión: Análisis Financiero, Punto de Equilibrio y Semáforos
 */

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// Componente KPI Clásico
const KPICard = ({ title, value, icon: Icon, color, detail, subtext }) => (
  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between transition-all hover:shadow-md h-full">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-2xl ${color} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
      {detail && (
        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 uppercase tracking-tighter">
          {detail}
        </span>
      )}
    </div>
    <div>
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
      <h3 className="text-2xl font-black text-slate-800 mt-1">{value}</h3>
      {subtext && <p className="text-[10px] text-slate-400 mt-1 font-medium">{subtext}</p>}
    </div>
  </div>
);

// Nuevo Componente: Semáforo de Gestión
const TrafficLightCard = ({ title, value, threshold, type = 'higherIsBetter', suffix = '' }) => {
  // Lógica del semáforo
  let statusColor = 'bg-slate-100 text-slate-500';
  let statusIcon = HelpCircle;
  let statusText = 'Neutro';

  const numValue = parseFloat(value);
  
  if (type === 'higherIsBetter') {
    if (numValue >= threshold.green) {
      statusColor = 'bg-emerald-100 text-emerald-700';
      statusIcon = CheckCircle;
      statusText = 'Saludable';
    } else if (numValue >= threshold.yellow) {
      statusColor = 'bg-amber-100 text-amber-700';
      statusIcon = AlertTriangle;
      statusText = 'Atención';
    } else {
      statusColor = 'bg-red-100 text-red-700';
      statusIcon = AlertTriangle;
      statusText = 'Crítico';
    }
  } else { // lowerIsBetter (ej: Gastos Fijos)
    if (numValue <= threshold.green) {
      statusColor = 'bg-emerald-100 text-emerald-700';
      statusIcon = CheckCircle;
      statusText = 'Óptimo';
    } else if (numValue <= threshold.yellow) {
      statusColor = 'bg-amber-100 text-amber-700';
      statusIcon = AlertTriangle;
      statusText = 'Cuidado';
    } else {
      statusColor = 'bg-red-100 text-red-700';
      statusIcon = AlertTriangle;
      statusText = 'Excesivo';
    }
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

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [usingMockData, setUsingMockData] = useState(false);
  
  const [selectedBranch, setSelectedBranch] = useState('Todas');
  const [selectedMonth, setSelectedMonth] = useState('Acumulado');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setUsingMockData(false);
    try {
      const res = await fetch('/.netlify/functions/get-data');
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Error del servidor (${res.status}): ${errorText}`);
      }
      const rawData = await res.json();
      if (!rawData || rawData.length === 0) {
        setError("Hoja vacía o sin datos.");
        setUsingMockData(true);
        setData(mockData);
        return;
      }
      const formatted = rawData.map(item => ({
        ...item,
        Monto: Math.abs(parseFloat(String(item.Monto || 0).replace(/[$.]/g, '').replace(',', '.')) || 0),
        Mes: String(item.Mes || '').trim(),
        Sucursal: String(item.Sucursal || '').trim(),
        Concepto: String(item.Concepto || '').trim(),
        Subconcepto: String(item.Subconcepto || '').trim()
      }));
      setData(formatted);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(`Fallo de conexión: ${err.message}`);
      setUsingMockData(true);
      setData(mockData);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'Pampa2026') {
      setIsLoggedIn(true);
      fetchData();
    } else {
      alert("Contraseña incorrecta.");
    }
  };

  // --- LÓGICA CENTRAL DE NEGOCIO ---
  const audit = useMemo(() => {
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

    const ventasBrutas = sum(buckets.ventas);
    const totalComis = sum(buckets.comisiones);
    const totalCmv = sum(buckets.cmv);
    const totalGastos = sum(buckets.gastos);
    
    // Fórmulas de Negocio
    const ventasNetas = ventasBrutas - totalComis;
    const margenBruto = ventasNetas - totalCmv; // Contribución Marginal en $
    const ebitda = margenBruto - totalGastos;
    
    const margenPct = ventasNetas > 0 ? (ebitda / ventasNetas) * 100 : 0;
    
    // Cálculo Punto de Equilibrio (Break Even Point)
    // PE ($) = Costos Fijos / (Margen Contribución / Ventas Netas)
    const ratioContribucion = ventasNetas > 0 ? (margenBruto / ventasNetas) : 0;
    const puntoEquilibrio = ratioContribucion > 0 ? (totalGastos / ratioContribucion) : 0;

    // Ratios para semáforos
    const pesoGastosFijos = ventasNetas > 0 ? (totalGastos / ventasNetas) * 100 : 0;

    return { 
      ventasNetas, ebitda, margenPct, totalGastos, margenBruto, puntoEquilibrio, pesoGastosFijos,
      buckets, ventasBrutas, totalCmv, totalComis
    };
  }, [data, selectedBranch, selectedMonth]);

  const branches = ['Todas', ...new Set(data.map(d => d.Sucursal))].filter(Boolean);
  const months = ['Acumulado', ...new Set(data.map(d => d.Mes))].filter(Boolean).sort().reverse();
  const formatCurrency = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);

  const chartData = useMemo(() => processChartData(data), [data]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 text-center border-b-8 border-amber-500">
          <h2 className="text-3xl font-black text-slate-800 mb-2">PAMPA</h2>
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
        <h1 className="font-black text-lg">Pampa Dashboard</h1>
        <div className="flex gap-4">
          <button onClick={fetchData} className="p-3 bg-slate-50 rounded-2xl"><RefreshCcw size={20}/></button>
          <button onClick={() => setIsLoggedIn(false)} className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl text-xs font-bold">SALIR</button>
        </div>
      </nav>

      {usingMockData && <div className="bg-red-50 p-4 text-center text-red-600 font-bold">⚠️ MODO PRUEBA (Error de conexión: {error})</div>}

      <main className="max-w-7xl mx-auto px-8 mt-10 space-y-10">
        <div className="flex flex-wrap gap-4">
          <select className="bg-white px-5 py-3 rounded-2xl shadow-sm font-bold text-xs uppercase" value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
            {branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select className="bg-white px-5 py-3 rounded-2xl shadow-sm font-bold text-xs uppercase" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* --- TARJETAS KPIs --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard title="Ventas Netas" value={formatCurrency(audit.ventasNetas)} icon={TrendingUp} color="bg-blue-600" detail="Ingresos Reales" />
          <KPICard title="Punto de Equilibrio" value={formatCurrency(audit.puntoEquilibrio)} icon={Scale} color="bg-purple-500" detail="Meta Mensual" subtext="Para no perder dinero" />
          <KPICard title="Margen Bruto" value={formatCurrency(audit.margenBruto)} icon={Wallet} color="bg-indigo-500" detail="Contribución" />
          <KPICard title="Gastos Fijos" value={formatCurrency(audit.totalGastos)} icon={FileText} color="bg-red-600" detail="Estructura" />
          <KPICard title="EBITDA" value={formatCurrency(audit.ebitda)} icon={DollarSign} color="bg-emerald-600" detail="Resultado" />
        </div>

        {/* --- SEMÁFOROS DE GESTIÓN --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <TrafficLightCard 
            title="Salud del Margen EBITDA" 
            value={audit.margenPct.toFixed(1)} 
            suffix="%" 
            threshold={{ green: 15, yellow: 8 }} // Verde > 15%, Amarillo > 8%
            type="higherIsBetter"
          />
          <TrafficLightCard 
            title="Cobertura Punto de Equilibrio" 
            value={audit.puntoEquilibrio > 0 ? ((audit.ventasNetas / audit.puntoEquilibrio) * 100).toFixed(0) : 0} 
            suffix="%" 
            threshold={{ green: 100, yellow: 90 }} // Verde si cubrimos el 100% de costos
            type="higherIsBetter"
          />
          <TrafficLightCard 
            title="Peso Gastos Fijos s/Venta" 
            value={audit.pesoGastosFijos.toFixed(1)} 
            suffix="%" 
            threshold={{ green: 30, yellow: 40 }} // Verde si es bajo (<30%)
            type="lowerIsBetter"
          />
        </div>

        {/* --- GRÁFICOS ESTRATÉGICOS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Gráfico 1: Ventas vs Punto de Equilibrio */}
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 h-[450px]">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-2">Tendencia & Equilibrio</h3>
            <p className="text-xs text-slate-400 mb-6">Línea Punteada = Cuánto deberías haber vendido para cubrir costos.</p>
            <ResponsiveContainer width="100%" height="80%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#cbd5e1'}} dy={10} />
                <YAxis hide />
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="ventas" name="Ventas Reales" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                <Line type="monotone" dataKey="equilibrio" name="Punto de Equilibrio" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                <Line type="monotone" dataKey="ebitda" name="EBITDA" stroke="#10b981" strokeWidth={3} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico 2: Estructura de Costos (En qué se va la plata) */}
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 h-[450px]">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-6">Composición del Negocio</h3>
            <ResponsiveContainer width="100%" height="80%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#cbd5e1'}} dy={10} />
                <YAxis hide />
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none'}} />
                <Area type="monotone" dataKey="cmv" name="Costo Mercadería" stackId="1" stroke="transparent" fill="#f97316" />
                <Area type="monotone" dataKey="gastos" name="Gastos Fijos" stackId="1" stroke="transparent" fill="#ef4444" />
                <Area type="monotone" dataKey="ganancia" name="Margen Neto (EBITDA)" stackId="1" stroke="transparent" fill="#10b981" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

        </div>

        {/* --- AUDITORÍA (Mantenemos por seguridad) --- */}
        <div className="bg-slate-100 p-6 rounded-[2rem] opacity-70">
          <div className="flex justify-between items-center cursor-pointer">
            <h3 className="font-black text-slate-500 uppercase text-xs">Auditoría de Datos (Debug)</h3>
            <span className="text-[10px] bg-slate-200 px-2 py-1 rounded text-slate-500">{audit.buckets.ignorados.length} ignorados</span>
          </div>
          {audit.buckets.ignorados.length > 0 && (
            <div className="mt-4 space-y-1">
              {audit.buckets.ignorados.slice(0, 5).map((r, i) => (
                <div key={i} className="text-[10px] text-red-500 font-mono">Ignorado: {r.Concepto} - {r.Subconcepto} ({r.Monto})</div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
};

// --- PROCESAMIENTO DE GRÁFICOS ---
const processChartData = (data) => {
  const months = [...new Set(data.map(d => d.Mes))].filter(Boolean).sort();
  
  return months.map(m => {
    const period = data.filter(d => d.Mes === m);
    
    // Sumatorias Mensuales
    const sumByConcept = (term) => period.filter(r => r.Concepto.toLowerCase().includes(term)).reduce((a, b) => a + b.Monto, 0);
    const sumSpecific = (term) => period.filter(r => r.Concepto.toLowerCase().includes(term)).reduce((a, b) => a + b.Monto, 0);

    const ventasBrutas = sumByConcept('venta') + sumByConcept('ingreso');
    const comisiones = sumByConcept('comision');
    const cmv = sumByConcept('cmv') + sumByConcept('costo');
    
    // Gastos Fijos (Egreso que no es ni CMV ni Comisiones)
    const gastos = period.filter(r => {
      const con = r.Concepto.toLowerCase();
      return (con.includes('gasto') || con.includes('egreso')) && !con.includes('cmv') && !con.includes('costo') && !con.includes('comision');
    }).reduce((a, b) => a + b.Monto, 0);

    const ventasNetas = ventasBrutas - comisiones;
    const margenBruto = ventasNetas - cmv;
    const ebitda = margenBruto - gastos;

    // Cálculo Punto de Equilibrio Mensual
    const ratio = ventasNetas > 0 ? (margenBruto / ventasNetas) : 0;
    const equilibrio = ratio > 0 ? (gastos / ratio) : 0;

    return { 
      name: m, 
      ventas: ventasNetas, 
      ebitda: Math.max(0, ebitda), // Para visualizar mejor en stacked area
      ganancia: ebitda, // Valor real para tooltip
      cmv, 
      gastos, 
      equilibrio 
    };
  });
};

const mockData = [{ Mes: '2024-01', Sucursal: 'Centro', Concepto: 'Ingreso', Subconcepto: 'Efectivo', Monto: 100000 }];
const root = createRoot(document.getElementById('root'));
root.render(<App />);

export default App;
