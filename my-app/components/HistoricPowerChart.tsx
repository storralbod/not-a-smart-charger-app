"use client";

import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
  type ScriptableContext,
} from "chart.js";
import "chartjs-adapter-date-fns";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  TimeScale,
  Tooltip,
  Legend,
  Filler
);

/* ---------- Types ---------- */

type Props = {
  startDate: string;
  endDate: string;
};

type PowerPoint = {
  x: Date;
  y: number;
};

type ApiPoint = {
  timestamp: string;
  power: number;
};

/* ---------- Component ---------- */

export default function HistoricPowerChart({
  startDate,
  endDate,
}: Props) {
  const [dataPoints, setDataPoints] = useState<PowerPoint[]>([]);

  /* Fetch historic power when dates change */
  useEffect(() => {
    if (!startDate || !endDate) return;

    fetch(
      //`http://localhost:8000/api/get_historic_power?start_dt=${startDate}&end_dt=${endDate}`
      `https://not-a-smart-charger-app.onrender.com/api/get_historic_power?start_dt=${startDate}&end_dt=${endDate}`
    )
      .then((res) => res.json())
      .then((points: ApiPoint[]) => {
        setDataPoints(
          points.map((p) => ({
            x: new Date(p.timestamp),
            y: p.power,
          }))
        );
      });
  }, [startDate, endDate]);

  /* ---------- Chart Data ---------- */

  const data = {
    datasets: [
      {
        label: "Power (W)",
        data: dataPoints,
        tension: 0.05,
        borderWidth: 2,

        pointRadius: 0,
        pointHoverRadius: 0,

        borderColor: "#06b6d4",
        fill: true,

        backgroundColor: (
          ctx: ScriptableContext<"line">
        ) => {
          const { chart } = ctx;
          const { ctx: canvas, chartArea } = chart;
          if (!chartArea) return undefined;

          const gradient = canvas.createLinearGradient(
            0,
            chartArea.top,
            0,
            chartArea.bottom
          );

          gradient.addColorStop(0, "rgba(6, 182, 212, 0.30)");
          gradient.addColorStop(1, "rgba(6, 182, 212, 0)");

          return gradient;
        },
      },
    ],
  };

  /* ---------- Chart Options ---------- */

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,

    interaction: {
      mode: "index",
      intersect: false,
    },

    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#ffffff",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        titleColor: "#111827",
        bodyColor: "#374151",
        displayColors: false,
        callbacks: {
          label: (ctx) => {
            const y = ctx.parsed.y;
            return y !== null
              ? ` ${y.toLocaleString()} Wh`
              : "";
          },
        },
      },
    },

    scales: {
      x: {
        type: "time",
        grid: {
          display: false,
        },
        border: {
          display: true,
          color: "#e5e7eb"
        },
        ticks: {
          color: "#6e7583ff",
          font: { size: 12 },
        },
      },
      y: {
        position: "right",
        beginAtZero: true,
        grid: {
          display: false,
        },
        border: {
          display: true,
          color: "#e5e7eb"
        },
        ticks: {
          color: "#6e7583ff",
          font: { size: 12 },
          callback: (v) =>
            typeof v === "number"
              ? `${v.toLocaleString()} Wh`
              : v,
        },
      },
    },
  };

  return <Line data={data} options={options} />;
}
