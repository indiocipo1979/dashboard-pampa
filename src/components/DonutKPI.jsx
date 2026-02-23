import React from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

const DonutKPI = ({ value = 0, max = 100, label = "KPI", units = "%", green = 70, yellow = 40 }) => {
  // Permitir negativos y formatear igual que el resto de la plantilla
  let pathColor = "#10b981"; // verde
  const absValue = Math.abs(value);
  if (absValue < yellow) pathColor = "#ef4444"; // rojo
  else if (absValue < green) pathColor = "#f59e0b"; // amarillo

  // Formato consistente con el resto de la plantilla
  const displayValue = `${value < 0 ? '-' : ''}${absValue.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${units}`;

  // Usar un overlay para el número con clases Tailwind igual a los KPIs superiores
  return (
    <div className="w-[130px] sm:w-[160px] mx-auto flex flex-col items-center">
      <div className="relative w-full flex items-center justify-center">
        <CircularProgressbar
          value={absValue > max ? max : absValue}
          maxValue={max}
          text={" "} // Eliminar el texto interno de la librería
          strokeWidth={12}
          styles={buildStyles({
            pathColor,
            textColor: 'transparent',
            trailColor: '#f1f5f9',
            textSize: '1.15rem',
            pathTransitionDuration: 0.5,
            fontFamily: 'Montserrat, Arial, sans-serif',
            fontWeight: 800,
          })}
        />
        <span className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-black font-sans text-2xl sm:text-3xl ${value < 0 ? 'text-red-600' : 'text-slate-800'} select-none`}>{displayValue}</span>
      </div>
      <div className="mt-2 font-black text-[13px] sm:text-[15px] text-slate-700 uppercase tracking-wide leading-tight text-center break-words max-w-[120px] sm:max-w-[140px]">{label}</div>
    </div>
  );
};

export default DonutKPI;
