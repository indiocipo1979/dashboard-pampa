import React from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

const GaugeKPI = ({ value = 0, label = "KPI", min = 0, max = 100, units = "%", green = 70, yellow = 40 }) => {
  // Determinar color según valor
  let pathColor = "#3fc380"; // verde
  if (value < yellow) pathColor = "#e74c3c"; // rojo
  else if (value < green) pathColor = "#f7ca18"; // amarillo

  // Formatear valor como porcentaje con 1 decimal
  const formattedValue = `${Number(value).toLocaleString("es-AR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}${units}`;

  return (
    <div className="w-[120px] mx-auto text-center flex flex-col items-center">
      <div className="w-full">
        <CircularProgressbar
          value={value}
          minValue={min}
          maxValue={max}
          text={formattedValue}
          styles={buildStyles({
            pathColor,
            textColor: '#0f172a', // slate-900
            trailColor: '#f1f5f9', // slate-100
            textSize: '1.5rem',
            pathTransitionDuration: 0.5,
          })}
        />
      </div>
      <div className="mt-2 font-black text-[13px] text-slate-700 uppercase tracking-wide leading-tight">{label}</div>
    </div>
  );
};

export default GaugeKPI;
