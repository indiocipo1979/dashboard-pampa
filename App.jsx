import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  LayoutDashboard, TrendingUp, DollarSign, Percent, Store, Calendar, RefreshCcw, LogOut, ChevronRight, FileText, ArrowRight, Wallet
} from 'lucide-react';

/**
 * PAMPA FIAMBRES - DASHBOARD DE GESTIÓN ESTRATÉGICA
 * Configuración: Libro Diario (Mes, Sucursal, Concepto, Subconcepto, Monto)
 * Contraseña Maestra: Pampa2026
 */

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// Componente para las tarjetas de indicadores (KPIs)
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
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Filtros de navegación
  const [selectedBranch, setSelectedBranch] = useState('Todas');
  const [selectedMonth, setSelectedMonth] = useState('Acumulado');

  // Función para obtener datos desde la API (Netlify Function)
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/.netlify/functions/get-data');
      if (!res.ok) throw new Error("Error al conectar con Google Sheets");
      const rawData = await res.json();
      
      // Limpieza y formateo de datos
      const formatted = rawData.map(item => ({
        ...item,
        Monto: parseFloat(String(item.Monto || 0).replace(/[$.]/g, '').replace(',', '.')) || 0,
        Mes: String(item.Mes || '').trim(),
        Sucursal: String(item.Sucursal || '').trim(),
        Concepto: String(item.Concepto || '').trim(),
        Subconcepto: String(item.Subconcepto || '').trim()
      }));

      setData(formatted);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message);
      // Fallback a datos de ejemplo en caso de error de conexión para previsualización
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
      alert("Contraseña incorrecta. Intenta nuevamente con Pampa2026.");
    }
  };

  // --- MOTOR DE CÁLCULO DE EBITDA ---
  const stats = useMemo(() => {
    const filtered = data.filter(d => {
      const b = selectedBranch === 'Todas' || d.Sucursal === selectedBranch;
      const m = selectedMonth === 'Acumulado' || d.Mes === selectedMonth;
      return b && m;
    });

    const matches = (val, search) => val.toLowerCase().includes(search.toLowerCase());

    // Agrupar por categorías de subconcepto
    const efectivo = filtered.filter(d => matches(d.Subconcepto, 'efectivo')).reduce((a, b) => a + b.Monto, 0);
    const posnet = filtered.filter(d => matches(d.Subconcepto, 'posnet')).reduce((a, b) => a + b.Monto, 0);
    const comisiones = filtered.filter(d => matches(d.Subconcepto, 'comision')).reduce((a, b) => a + b.Monto, 0);
    const cmv = filtered.filter(d => matches(d.Subconcepto, 'cmv')).reduce((a, b) => a + b.Monto, 0);

    // Identificar gastos operativos (Egresos que no son CMV ni Comisiones)
    const egresosOperativos = filtered.filter(d => {
      const isEgreso = matches(d.Concepto, 'egreso') || matches(d.Concepto, 'gasto');
      const isDirect = matches(d.Subconcepto, 'cmv') || matches(d.Subconcepto, 'comision');
      return isEgreso && !isDirect;
    });

    const totalGastosFijos = egresosOperativos.reduce((a, b) => a + b.Monto, 0);
    const ventasBrutas = efectivo + posnet;
    const ventasNetas = ventasBrutas - comisiones;
    const ebitda = ventasNetas - cmv - totalGastosFijos;
    const margenPct = ventasNetas > 0 ? (ebitda / ventasNetas) * 100 : 0;

    return { ventasNetas, ebitda, margenPct, totalGastosFijos, efectivo, posnet, comisiones };
  }, [data, selectedBranch, selectedMonth]);

  const branches = ['Todas', ...new Set(data.map(d => d.Sucursal))].filter(Boolean);
  const months = ['Acumulado', ...new Set(data.map(d => d.Mes))].filter(Boolean).sort().reverse();

  const formatCurrency = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);

  // Pantalla de Login
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 text-center border-b-8 border-amber-500">
          <div className="bg-amber-500 w-20 h-20 rounded-3xl mx-auto mb-8 flex items-center justify-center text-white shadow-xl shadow-amber-500/20 rotate-3">
            <LayoutDashboard size={40} className="-rotate-3" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tighter">PAMPA</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-10">Tablero Estratégico</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              placeholder="Contraseña Maestra"
              className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-amber-500 outline-none text-center font-black text-lg transition-all"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-slate-800 transition-all flex items-center justify-center gap-2 group">
              ACCEDER <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-20 font-sans text-slate-900">
      {/* Barra de Navegación */}
      <nav className="bg-white border-b border-slate-100 h-20 px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-amber-500 p-2 rounded-xl text-white font-black text-xl shadow-lg shadow-amber-500/20">P</div>
          <h1 className="font-black text-lg tracking-tighter uppercase leading-none hidden sm:block">Pampa Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={fetchData} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-400">
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setIsLoggedIn(false)} className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-lg shadow-slate-900/10">SALIR</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 mt-10 space-y-10">
        
        {/* Filtros */}
        <div className="flex flex-wrap gap-4">
          <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
            <Store size={18} className="text-slate-300" />
            <select className="font-black text-xs uppercase outline-none bg-transparent cursor-pointer" value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
            <Calendar size={18} className="text-slate-300" />
            <select className="font-black text-xs uppercase outline-none bg-transparent cursor-pointer" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              {months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* Indicadores Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard title="Ventas Netas" value={formatCurrency(stats.ventasNetas)} icon={TrendingUp} color="bg-blue-600" detail="Ingresos Reales" subtext={`Comisiones: ${formatCurrency(stats.comisiones)}`} />
          <KPICard title="EBITDA" value={formatCurrency(stats.ebitda)} icon={DollarSign} color="bg-emerald-600" detail="Caja Operativa" subtext="Utilidad Final" />
          <KPICard title="Margen EBITDA" value={`${stats.margenPct.toFixed(1)}%`} icon={Percent} color="bg-amber-600" detail="Rendimiento" subtext="Meta: > 20%" />
          <KPICard title="Gastos Fijos" value={formatCurrency(stats.totalGastosFijos)} icon={FileText} color="bg-red-600" detail="Estructura" subtext="Costos Operativos" />
        </div>

        {/* Gráficos de Análisis */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Evolución Temporal */}
          <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 h-[450px]">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-10">Evolución Mensual</h3>
            <ResponsiveContainer width="100%" height="80%">
              <AreaChart data={getEvolution(data)}>
                <defs>
                  <linearGradient id="colorNetas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#cbd5e1'}} dy={10} />
                <YAxis hide />
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
                <Area type="monotone" dataKey="ventas" name="Ventas" stroke="#3b82f6" strokeWidth={4} fill="url(#colorNetas)" />
                <Area type="monotone" dataKey="ebitda" name="EBITDA" stroke="#10b981" strokeWidth={4} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Mix de Cobros */}
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 h-[450px]">
            <h3 className="font-black text-slate-800 mb-10 uppercase text-xs tracking-widest">Mix de Ventas</h3>
            <ResponsiveContainer width="100%" height="70%">
              <PieChart>
                <Pie data={[{name: 'Efectivo', value: stats.efectivo}, {name: 'Posnet', value: stats.posnet}]} innerRadius={70} outerRadius={90} paddingAngle={10} dataKey="value">
                  <Cell fill="#10b981" />
                  <Cell fill="#3b82f6" />
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px', fontWeight: 'bold'}} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-slate-50 rounded-2xl flex items-center gap-3">
              <Wallet className="text-amber-500" size={20} />
              <p className="text-xs font-black text-slate-600 uppercase">
                {stats.efectivo > stats.posnet ? 'Lidera el Efectivo' : 'Lidera el Posnet'}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Función para procesar datos del gráfico de evolución
const getEvolution = (data) => {
  const months = [...new Set(data.map(d => d.Mes))].filter(Boolean).sort();
  const matches = (val, search) => val.toLowerCase().includes(search.toLowerCase());

  return months.map(m => {
    const period = data.filter(d => d.Mes === m);
    const vBrutas = period.filter(d => matches(d.Subconcepto, 'efectivo') || matches(d.Subconcepto, 'posnet')).reduce((a, b) => a + b.Monto, 0);
    const comisiones = period.filter(d => matches(d.Subconcepto, 'comision')).reduce((a, b) => a + b.Monto, 0);
    const cmv = period.filter(d => matches(d.Subconcepto, 'cmv')).reduce((a, b) => a + b.Monto, 0);
    const vNetas = vBrutas - comisiones;
    
    const gastos = period.filter(d => {
      const isEgreso = matches(d.Concepto, 'egreso') || matches(d.Concepto, 'gasto');
      const isDirect = matches(d.Subconcepto, 'cmv') || matches(d.Subconcepto, 'comision');
      return isEgreso && !isDirect;
    }).reduce((a, b) => a + b.Monto, 0);

    return { name: m, ventas: vNetas, ebitda: vNetas - cmv - gastos };
  });
};

const mockData = [
  { Mes: '2024-01', Sucursal: 'Centro', Concepto: 'Ingreso', Subconcepto: 'Efectivo', Monto: 150000 },
];

export default App;