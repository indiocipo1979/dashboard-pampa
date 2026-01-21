import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  LayoutDashboard, TrendingUp, DollarSign, Percent, Store, Calendar, RefreshCcw, LogOut, ChevronRight, FileText, ArrowRight, Wallet, AlertTriangle, CheckCircle, HelpCircle
} from 'lucide-react';

/**
 * PAMPA FIAMBRES - DASHBOARD DE GESTIÓN (MODO AUDITORÍA)
 * Versión: Debugging de Cálculos
 */

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const KPICard = ({ title, value, icon: Icon, color, detail, subtext }) => (
  <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between transition-all hover:shadow-md">
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
        // Forzamos valor positivo absoluto para evitar errores de signos en el Excel
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

  // --- LÓGICA DE AUDITORÍA ---
  const audit = useMemo(() => {
    const filtered = data.filter(d => {
      const b = selectedBranch === 'Todas' || d.Sucursal === selectedBranch;
      const m = selectedMonth === 'Acumulado' || d.Mes === selectedMonth;
      return b && m;
    });

    const buckets = {
      ventas: [],
      cmv: [],
      gastos: [],
      comisiones: [],
      ignorados: []
    };

    filtered.forEach(row => {
      const sub = row.Subconcepto.toLowerCase();
      const con = row.Concepto.toLowerCase();
      
      if (sub.includes('efectivo') || sub.includes('posnet')) {
        buckets.ventas.push(row);
      } else if (sub.includes('cmv')) {
        buckets.cmv.push(row);
      } else if (sub.includes('comision')) {
        buckets.comisiones.push(row);
      } else if (con.includes('egreso') || con.includes('gasto')) {
        // Si es egreso y no es lo anterior, es Gasto Fijo
        buckets.gastos.push(row);
      } else {
        // Si no entra en nada (ej: Ingreso que no es efectivo/posnet)
        buckets.ignorados.push(row);
      }
    });

    const sum = (arr) => arr.reduce((a, b) => a + b.Monto, 0);

    const ventasBrutas = sum(buckets.ventas);
    const totalComis = sum(buckets.comisiones);
    const totalCmv = sum(buckets.cmv);
    const totalGastos = sum(buckets.gastos);
    
    const ventasNetas = ventasBrutas - totalComis;
    const ebitda = ventasNetas - totalCmv - totalGastos;
    const margenPct = ventasNetas > 0 ? (ebitda / ventasNetas) * 100 : 0;

    return { 
      ventasNetas, ebitda, margenPct, totalGastos, 
      buckets, ventasBrutas, totalCmv, totalComis,
      efectivo: sum(buckets.ventas.filter(r => r.Subconcepto.toLowerCase().includes('efectivo'))),
      posnet: sum(buckets.ventas.filter(r => r.Subconcepto.toLowerCase().includes('posnet')))
    };
  }, [data, selectedBranch, selectedMonth]);

  const branches = ['Todas', ...new Set(data.map(d => d.Sucursal))].filter(Boolean);
  const months = ['Acumulado', ...new Set(data.map(d => d.Mes))].filter(Boolean).sort().reverse();
  const formatCurrency = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard title="Ventas Brutas" value={formatCurrency(audit.ventasBrutas)} icon={TrendingUp} color="bg-blue-600" detail="Total Facturado" />
          <KPICard title="Gastos Fijos" value={formatCurrency(audit.totalGastos)} icon={FileText} color="bg-red-600" detail="Operativos" />
          <KPICard title="CMV" value={formatCurrency(audit.totalCmv)} icon={Store} color="bg-orange-500" detail="Costo Mercadería" />
          <KPICard title="EBITDA" value={formatCurrency(audit.ebitda)} icon={DollarSign} color="bg-emerald-600" detail="Resultado" />
        </div>

        {/* --- SECCIÓN DE AUDITORÍA --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
            <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2">
              <CheckCircle className="text-emerald-500" size={20}/> Qué estamos sumando
            </h3>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              <div className="mb-4">
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Ventas ({audit.buckets.ventas.length} registros)</p>
                {audit.buckets.ventas.map((r, i) => (
                  <div key={i} className="flex justify-between text-xs border-b border-slate-50 py-1">
                    <span>{r.Subconcepto} ({r.Mes})</span>
                    <span className="font-bold text-blue-600">{formatCurrency(r.Monto)}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Gastos Fijos ({audit.buckets.gastos.length} registros)</p>
                {audit.buckets.gastos.map((r, i) => (
                  <div key={i} className="flex justify-between text-xs border-b border-slate-50 py-1">
                    <span>{r.Subconcepto} ({r.Mes})</span>
                    <span className="font-bold text-red-600">{formatCurrency(r.Monto)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 border-l-8 border-l-amber-400">
            <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2">
              <HelpCircle className="text-amber-500" size={20}/> Lo que NO se sumó (Ignorados)
            </h3>
            <p className="text-sm text-slate-500 mb-4">Estos registros existen en el Excel pero el sistema no supo clasificarlos. Revisa si escribiste mal "Efectivo", "Egreso" o "CMV".</p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {audit.buckets.ignorados.length === 0 ? (
                <p className="text-emerald-600 font-bold text-sm">¡Perfecto! Todo clasificado.</p>
              ) : (
                audit.buckets.ignorados.map((r, i) => (
                  <div key={i} className="bg-amber-50 p-3 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-slate-700">{r.Concepto} / {r.Subconcepto}</p>
                      <p className="text-[10px] text-slate-400">{r.Mes} - {r.Sucursal}</p>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-600">{formatCurrency(r.Monto)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

const mockData = [{ Mes: '2024-01', Sucursal: 'Centro', Concepto: 'Ingreso', Subconcepto: 'Efectivo', Monto: 100000 }];
const root = createRoot(document.getElementById('root'));
root.render(<App />);

export default App;
