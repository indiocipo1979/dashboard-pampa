import React from "react";
import { PieChart, Pie, Cell } from "recharts";

// Gauge tipo velocímetro con Recharts
const GaugeKPIRecharts = ({ value = 0, max = 100, label = "KPI", units = "%", green = 70, yellow = 40 }) => {
  // Normalizar valor
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  // Mostrar el signo dentro del gauge y asegurar que el porcentaje no se corte
  const displayValue = `${absValue.toLocaleString("es-AR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}${units}`;
  // Definir colores de rango
  let color = "#10b981"; // verde
  if (absValue < yellow) color = "#ef4444"; // rojo
  else if (absValue < green) color = "#f59e0b"; // amarillo

  // Datos para el gauge (arco)
  const gaugeValue = Math.max(0, Math.min(absValue, max));
  const data = [
    { value: gaugeValue, color },
    { value: max - gaugeValue, color: "#f1f5f9" }, // gris claro
  ];

  // Ángulo del gauge (de -135° a 135°)
  const startAngle = 225;
  const endAngle = -45;

  return (
    <div className="w-[140px] sm:w-[160px] mx-auto text-center flex flex-col items-center">
      <div className="relative w-full flex items-center justify-center" style={{ height: 80 }}>
        <PieChart width={140} height={80}>
          <Pie
            data={data}
            startAngle={startAngle}
            endAngle={endAngle}
            innerRadius={38}
            outerRadius={60}
            dataKey="value"
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((entry, idx) => (
              <Cell key={`cell-${idx}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
        <span className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-black font-sans text-[1.1rem] sm:text-[1.25rem] md:text-[1.5rem] leading-none tracking-tight select-none whitespace-nowrap ${isNegative ? 'text-red-600' : 'text-slate-900'}`}
          style={{ maxWidth: '95%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {isNegative ? '-' : ''}{displayValue}
        </span>
      </div>
      <div className="mt-1 font-black text-[12px] sm:text-[13px] text-slate-700 uppercase tracking-wide leading-tight text-center break-words max-w-[120px] sm:max-w-[140px]">{label}</div>
    </div>
  );
};

export default GaugeKPIRecharts;
