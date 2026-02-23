import React from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

const DonutKPI = ({ value = 0, max = 100, label = "KPI", units = "%", green = 70, yellow = 40 }) => {
  const absValue = Math.abs(value);
  let pathColor = "#10b981"; // verde
  if (absValue < yellow) pathColor = "#ef4444"; // rojo
  else if (absValue < green) pathColor = "#f59e0b"; // amarillo

  const displayValue = `${value < 0 ? '-' : ''}${absValue.toLocaleString("es-AR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}${units}`;

  return (
    <div className="w-[90px] sm:w-[110px] mx-auto flex flex-col items-center">
      <div className="w-full">
        <CircularProgressbar
          value={absValue}
          maxValue={max}
          text={displayValue}
          strokeWidth={10}
          styles={buildStyles({
            pathColor,
            textColor: value < 0 ? '#dc2626' : '#0f172a',
            trailColor: '#f1f5f9',
            textSize: '1.1rem',
            pathTransitionDuration: 0.5,
          })}
        />
      </div>
      <div className="mt-2 font-black text-[12px] sm:text-[13px] text-slate-700 uppercase tracking-wide leading-tight text-center break-words max-w-[90px] sm:max-w-[110px]">{label}</div>
    </div>
  );
};

export default DonutKPI;
