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

  return (
    <div className="w-[130px] sm:w-[160px] mx-auto flex flex-col items-center">
      <div className="w-full">
        <CircularProgressbar
          value={absValue > max ? max : absValue}
          maxValue={max}
          text={displayValue}
          strokeWidth={12}
          styles={buildStyles({
            pathColor,
            textColor: value < 0 ? '#dc2626' : '#0f172a',
            trailColor: '#f1f5f9',
            textSize: '1.15rem',
            pathTransitionDuration: 0.5,
            fontFamily: 'Montserrat, Arial, sans-serif',
            fontWeight: 800,
          })}
        />
      </div>
      <div className="mt-2 font-black text-[13px] sm:text-[15px] text-slate-700 uppercase tracking-wide leading-tight text-center break-words max-w-[120px] sm:max-w-[140px]">{label}</div>
    </div>
  );
};

export default DonutKPI;
