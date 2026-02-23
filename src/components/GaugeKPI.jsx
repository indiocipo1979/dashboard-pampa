import React from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

const GaugeKPI = ({ value = 0, label = "KPI", min = 0, max = 100, units = "%", green = 70, yellow = 40 }) => {
  // Determinar color según valor
  let pathColor = "#3fc380"; // verde
  if (value < yellow) pathColor = "#e74c3c"; // rojo
  else if (value < green) pathColor = "#f7ca18"; // amarillo

  return (
    <div style={{ width: 120, margin: "0 auto", textAlign: "center" }}>
      <CircularProgressbar
        value={value}
        minValue={min}
        maxValue={max}
        text={`${value}${units}`}
        styles={buildStyles({
          pathColor,
          textColor: "#222",
          trailColor: "#eee",
          textSize: "20px",
          pathTransitionDuration: 0.5,
        })}
      />
      <div style={{ marginTop: 8, fontWeight: 600, fontSize: 14 }}>{label}</div>
    </div>
  );
};

export default GaugeKPI;
