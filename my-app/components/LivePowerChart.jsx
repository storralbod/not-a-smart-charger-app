"use client";

import { useEffect, useRef, useState } from "react";
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

export default function LivePowerChart() {
  const [dataPoints, setDataPoints] = useState([]);
  const wsRef = useRef(null);

  /* Initial load */
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/power?hours=24")
      .then((res) => res.json())
      .then((points) => {
        setDataPoints(
          points.map((p) => ({
            x: new Date(p.timestamp),
            y: p.power,
          }))
        );
      });
  }, []);

  /* WebSocket updates */
  useEffect(() => {
    wsRef.current = new WebSocket("ws://127.0.0.1:8000/ws/power");

    wsRef.current.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      const newPoint = {
        x: new Date(msg.timestamp),
        y: msg.power,
      };

      setDataPoints((prev) => {
        const now = Date.now();
        return [...prev, newPoint].filter(
          (p) => now - p.x.getTime() <= 12 * 60 * 60 * 1000
        );
      });
    };

    return () => wsRef.current?.close();
  }, []);

  const data = {
    datasets: [
      {
        label: "Power (W)",
        data: dataPoints,
        tension: 0.05,
        borderWidth: 2,

        // no dots
        pointRadius: 0,
        pointHoverRadius: 0,

        borderColor: "#06b6d4",
        fill: true,

        // 🌫 soft gradient fill
        backgroundColor: (ctx) => {
          const { chart } = ctx;
          const { ctx: canvas, chartArea } = chart;
          if (!chartArea) return null;

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

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
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
          label: (ctx) => ` ${ctx.parsed.y.toLocaleString()} W`,
        },
      },
    },
    scales: {
      x: {
        type: "time",
        grid: {
          color: "#f1f1f1f1",
          drawBorder: false,
        },
        ticks: {
          color: "#6b7280",
          font: { size: 10 },
        },
      },
      y: {
        position: "right",
        beginAtZero: true,
        grid: {
          color: "#f1f1f1f1",
          drawBorder: false,
        },
        ticks: {
          color: "#6b7280",
          font: { size: 10 },
          callback: (v) => `${v.toLocaleString()} W`,
        },
      },
    },
  };

  return (
      <Line data={data} options={options} />
  );
}
