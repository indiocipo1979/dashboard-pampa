import React from "react";
import { PieChart, Pie, Cell } from "recharts";

// Gauge tipo velocímetro con Recharts
const GaugeKPIRecharts = ({ value = 0, max = 100, label = "KPI", units = "%", green = 70, yellow = 40 }) => {
  // Normalizar valor
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  const displayValue = `${isNegative ? '-' : ''}${absValue.toLocaleString("es-AR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}${units}`;
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
    <div className="w-[120px] mx-auto text-center flex flex-col items-center">
      <PieChart width={120} height={80}>
        <Pie
          data={data}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={38}
          outerRadius={55}
          dataKey="value"
          stroke="none"
        >
          {data.map((entry, idx) => (
            <Cell key={`cell-${idx}`} fill={entry.color} />
          ))}
        </Pie>
      </PieChart>
      <div className={`-mt-10 mb-2 font-black text-3xl leading-tight tracking-tight select-none font-sans ${isNegative ? 'text-red-600' : 'text-slate-900'}`}>{displayValue}</div>
      <div className="font-black text-[13px] text-slate-700 uppercase tracking-wide leading-tight">{label}</div>
    </div>
  );
};

export default GaugeKPIRecharts;
