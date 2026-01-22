import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, ComposedChart, ReferenceLine
} from 'recharts';
import { 
  LayoutDashboard, TrendingUp, DollarSign, Percent, Store, Calendar, RefreshCcw, LogOut, ChevronRight, FileText, ArrowRight, Wallet, AlertTriangle, CheckCircle, HelpCircle, Activity, Scale, Filter, BarChart2, PieChart as PieIcon
} from 'lucide-react';

/**
 * FIAMBRERIAS PAMPA - DASHBOARD DE GESTIÓN ESTRATÉGICA
 * Versión: Gráficos Avanzados & Rebranding con Logo
 */

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

// URL del Logo (Tomada de tu repositorio GitHub)
const LOGO_URL = "https://raw.githubusercontent.com/indiocipo1979/dashboard-pampa/813294c2178aefbd20bf295d6968254b5d248790/logo_pampa.png";

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

// Componente Semáforo de Gestión
const TrafficLightCard = ({ title, value, threshold, type = 'higherIsBetter', suffix = '' }) => {
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
  } else { 
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

  // --- LÓGICA DE NEGOCIO ---
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
    
    const ventasNetas = ventasBrutas - totalComis;
    const margenBruto = ventasNetas - totalCmv;
    const ebitda = margenBruto - totalGastos;
    
    const margenPct = ventasNetas > 0 ? (ebitda / ventasNetas) * 100 : 0;
    const ratioContribucion = ventasNetas > 0 ? (margenBruto / ventasNetas) : 0;
    const puntoEquilibrio = ratioContribucion > 0 ? (totalGastos / ratioContribucion) : 0;
    const pesoGastosFijos = ventasNetas > 0 ? (totalGastos / ventasNetas) * 100 : 0;

    return { 
      ventasNetas, ebitda, margenPct, totalGastos, margenBruto, puntoEquilibrio, pesoGastosFijos,
      buckets, ventasBrutas, totalCmv, totalComis
    };
  }, [data, selectedBranch, selectedMonth]);

  // Datos para Gráfico de Cascada
  const waterfallData = useMemo(() => {
    if (!audit) return [];
    return [
      { name: 'Ingresos', valor: audit.ventasNetas, base: 0, fill: '#3b82f6', label: 'Ventas Netas' },
      { name: 'Mercadería', valor: audit.totalCmv, base: audit.margenBruto, fill: '#f97316', label: '- Costo Mercadería' },
      { name: 'Gastos', valor: audit.totalGastos, base: audit.ebitda, fill: '#ef4444', label: '- Gastos Fijos' },
      { name: 'EBITDA', valor: audit.ebitda, base: 0, fill: '#10b981', label: '= Resultado' }
    ];
  }, [audit]);

  // Datos para Gráfico "Top 5 Gastos"
  const expensesData = useMemo(() => {
    if (!audit) return [];
    const grouped = audit.buckets.gastos.reduce((acc, curr) => {
      const key = curr.Subconcepto || 'Varios';
      acc[key] = (acc[key] || 0) + curr.Monto;
      return acc;
    }, {});
    
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Solo Top 5
  }, [audit]);

  // Datos para Gráfico "Comparativa Sucursales"
  const branchData = useMemo(() => {
    if (selectedBranch !== 'Todas') return []; // Solo útil cuando vemos todas
    const branches = [...new Set(data.map(d => d.Sucursal))].filter(Boolean);
    
    return branches.map(b => {
      const filtered = data.filter(d => d.Sucursal === b && (selectedMonth === 'Acumulado' || d.Mes === selectedMonth));
      
      const sumByConcept = (term) => filtered.filter(r => r.Concepto.toLowerCase().includes(term)).reduce((acc, curr) => acc + curr.Monto, 0);
      
      const vBrutas = sumByConcept('venta') + sumByConcept('ingreso');
      const comis = sumByConcept('comision');
      const cmv = sumByConcept('cmv') + sumByConcept('costo');
      const gastos = filtered.filter(r => {
        const con = r.Concepto.toLowerCase();
        return (con.includes('gasto') || con.includes('egreso')) && !con.includes('cmv') && !con.includes('costo') && !con.includes('comision');
      }).reduce((acc, curr) => acc + curr.Monto, 0);

      const ebitda = (vBrutas - comis) - cmv - gastos;
      return { name: b, ventas: vBrutas - comis, ebitda };
    }).sort((a, b) => b.ventas - a.ventas);
  }, [data, selectedMonth, selectedBranch]);

  const branches = ['Todas', ...new Set(data.map(d => d.Sucursal))].filter(Boolean);
  const months = ['Acumulado', ...new Set(data.map(d => d.Mes))].filter(Boolean).sort().reverse();
  const formatCurrency = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);

  const chartData = useMemo(() => processChartData(data), [data]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 text-center border-b-8 border-amber-500">
          <div className="flex justify-center mb-8">
            <img src={LOGO_URL} alt="Logo Pampa" className="h-32 object-contain drop-shadow-xl" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tighter uppercase">Fiambrerías Pampa</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-10">Acceso Gerencial</p>
          <form onSubmit={handleLogin} className="space-y-4 mt-8">
            <input type="password" placeholder="Contraseña" className="w-full px-6 py-4 rounded-2xl border-2 text-center" onChange={(e) => setPassword(e.target.value)} />
            <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black">INGRESAR AL SISTEMA</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-20 font-sans text-slate-900">
      <nav className="bg-white border-b border-slate-100 h-20 px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center overflow-hidden">
            <img src={LOGO_URL} alt="Logo" className="h-full w-full object-contain" />
          </div>
          <h1 className="font-black text-lg tracking-tighter uppercase leading-none hidden sm:block">FIAMBRERIAS PAMPA</h1>
        </div>
        <div className="flex gap-4">
          <button onClick={fetchData} className="p-3 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors"><RefreshCcw size={20}/></button>
          <button onClick={() => setIsLoggedIn(false)} className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl text-xs font-bold hover:bg-slate-800 transition-colors">SALIR</button>
        </div>
      </nav>

      {usingMockData && <div className="bg-red-50 p-4 text-center text-red-600 font-bold">⚠️ MODO PRUEBA (Error de conexión: {error})</div>}

      <main className="max-w-7xl mx-auto px-8 mt-10 space-y-10">
        
        {/* --- FILTROS GRANDES --- */}
        <div className="flex flex-wrap gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 items-center">
          <div className="flex items-center gap-2 text-slate-400">
            <Filter size={24} />
            <span className="font-black text-sm uppercase tracking-widest">Filtrar:</span>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-2">Sucursal</label>
            <div className="relative">
              <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <select 
                className="w-full bg-slate-50 hover:bg-slate-100 transition-colors px-12 py-4 rounded-2xl font-black text-slate-700 uppercase outline-none cursor-pointer appearance-none border-2 border-transparent focus:border-amber-500"
                value={selectedBranch} 
                onChange={(e) => setSelectedBranch(e.target.value)}
              >
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90" size={20} />
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-2">Período</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <select 
                className="w-full bg-slate-50 hover:bg-slate-100 transition-colors px-12 py-4 rounded-2xl font-black text-slate-700 uppercase outline-none cursor-pointer appearance-none border-2 border-transparent focus:border-amber-500"
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {months.map(m => {
                  let label = m;
                  if (m !== 'Acumulado') {
                    try {
                      // Normalizamos separadores reemplazando barras por guiones para manejar 2025/10
                      const normalized = m.replace(/\//g, '-'); 
                      const parts = normalized.split('-');
                      
                      if (parts.length === 2) {
                        const p1 = parseInt(parts[0]);
                        const p2 = parseInt(parts[1]);
                        
                        let year, month;
                        // Heurística simple: Si el primer número es > 12, es el año (2025-10)
                        if (p1 > 12) {
                           year = p1;
                           month = p2;
                        } else {
                           month = p1;
                           year = p2;
                        }

                        if (!isNaN(year) && !isNaN(month)) {
                          const date = new Date(year, month - 1, 10);
                          const monthName = date.toLocaleDateString('es-ES', { month: 'long' });
                          label = `${monthName} ${year}`;
                        }
                      }
                    } catch (e) {}
                  }
                  return (
                    <option key={m} value={m}>
                      {label.charAt(0).toUpperCase() + label.slice(1)}
                    </option>
                  );
                })}
              </select>
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90" size={20} />
            </div>
          </div>
        </div>

        {/* --- KPI CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard title="Ventas Netas" value={formatCurrency(audit.ventasNetas)} icon={TrendingUp} color="bg-blue-600" detail="Ingresos Reales" />
          <KPICard title="Punto de Equilibrio" value={formatCurrency(audit.puntoEquilibrio)} icon={Scale} color="bg-purple-500" detail="Meta Mensual" subtext="Para no perder dinero" />
          <KPICard title="Margen Bruto" value={formatCurrency(audit.margenBruto)} icon={Wallet} color="bg-indigo-500" detail="Contribución" />
          <KPICard title="Gastos Fijos" value={formatCurrency(audit.totalGastos)} icon={FileText} color="bg-red-600" detail="Estructura" />
          <KPICard title="EBITDA" value={formatCurrency(audit.ebitda)} icon={DollarSign} color="bg-emerald-600" detail="Resultado" />
        </div>

        {/* --- SEMÁFOROS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <TrafficLightCard title="Salud del Margen EBITDA" value={audit.margenPct.toFixed(1)} suffix="%" threshold={{ green: 15, yellow: 8 }} type="higherIsBetter" />
          <TrafficLightCard title="Cobertura Punto de Equilibrio" value={audit.puntoEquilibrio > 0 ? ((audit.ventasNetas / audit.puntoEquilibrio) * 100).toFixed(0) : 0} suffix="%" threshold={{ green: 100, yellow: 90 }} type="higherIsBetter" />
          <TrafficLightCard title="Peso Gastos Fijos s/Venta" value={audit.pesoGastosFijos.toFixed(1)} suffix="%" threshold={{ green: 30, yellow: 40 }} type="lowerIsBetter" />
        </div>

        {/* --- GRÁFICOS NIVEL 1: TENDENCIA & CASCADA --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 h-[450px]">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-2 flex items-center gap-2"><Activity size={16}/> Tendencia & Equilibrio</h3>
            <p className="text-xs text-slate-400 mb-6">Línea Punteada = Meta de ventas para cubrir costos.</p>
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

          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 h-[450px]">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-6 flex items-center gap-2"><BarChart2 size={16}/> Cascada de Resultados (P&L)</h3>
            <ResponsiveContainer width="100%" height="80%">
              <BarChart data={waterfallData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} interval={0} />
                <YAxis hide />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  content={({ payload, label }) => {
                    if (payload && payload.length > 0) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100">
                          <p className="text-xs font-bold text-slate-400 mb-1">{data.label}</p>
                          <p className="text-lg font-black text-slate-800">{formatCurrency(data.valor)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="base" stackId="a" fill="transparent" />
                <Bar dataKey="valor" stackId="a" radius={[6, 6, 6, 6]}>
                  {waterfallData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>

        {/* --- GRÁFICOS NIVEL 2: GASTOS & SUCURSALES --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Top Gastos */}
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 h-[400px]">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-6 flex items-center gap-2"><ArrowRight size={16} className="rotate-45"/> Top 5 Gastos Fijos</h3>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart layout="vertical" data={expensesData}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                <Tooltip cursor={{fill: '#f8fafc'}} formatter={(val) => formatCurrency(val)} contentStyle={{borderRadius: '12px'}} />
                <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Comparativa Sucursales */}
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 h-[400px] lg:col-span-2">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-6 flex items-center gap-2"><Store size={16}/> Comparativa de Rendimiento</h3>
            {branchData.length > 0 ? (
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={branchData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 900, fill: '#94a3b8'}} />
                  <YAxis hide />
                  <Tooltip cursor={{fill: '#f8fafc'}} formatter={(val) => formatCurrency(val)} contentStyle={{borderRadius: '16px'}} />
                  <Legend />
                  <Bar dataKey="ventas" name="Ventas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ebitda" name="EBITDA" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold uppercase">Selecciona "Todas" las sucursales para comparar</div>
            )}
          </div>

        </div>

        {/* --- AUDITORÍA --- */}
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
    const sumByConcept = (term) => period.filter(r => r.Concepto.toLowerCase().includes(term)).reduce((a, b) => a + b.Monto, 0);
    const ventasBrutas = sumByConcept('venta') + sumByConcept('ingreso');
    const comisiones = sumByConcept('comision');
    const cmv = sumByConcept('cmv') + sumByConcept('costo');
    const gastos = period.filter(r => {
      const con = r.Concepto.toLowerCase();
      return (con.includes('gasto') || con.includes('egreso')) && !con.includes('cmv') && !con.includes('costo') && !con.includes('comision');
    }).reduce((a, b) => a + b.Monto, 0);

    const ventasNetas = ventasBrutas - comisiones;
    const margenBruto = ventasNetas - cmv;
    const ebitda = margenBruto - gastos;
    const ratio = ventasNetas > 0 ? (margenBruto / ventasNetas) : 0;
    const equilibrio = ratio > 0 ? (gastos / ratio) : 0;

    return { name: m, ventas: ventasNetas, ebitda: Math.max(0, ebitda), ganancia: ebitda, cmv, gastos, equilibrio };
  });
};

const mockData = [{ Mes: '2024-01', Sucursal: 'Centro', Concepto: 'Ingreso', Subconcepto: 'Efectivo', Monto: 100000 }];
const root = createRoot(document.getElementById('root'));
root.render(<App />);

export default App;
