"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  schedule: Record<number, HourStatus>;
  sessionHours: number[];
};
type HourStatus = "past" | "current" | "future" | "none";

const SIZE = 175;
const CENTER = SIZE / 2;
const RADIUS = 70;
const CIRCLE_RADIUS = 7;

export default function ChargingClock({ schedule, sessionHours }: Props) {
  const anglePerHour = (2 * Math.PI) / 24;
  const requestRef = useRef<number | null>(null);
  const startHour = sessionHours[0];
  const endHour = sessionHours[sessionHours.length-1]+1; // include full last hour 
  const [pulseProgress, setPulseProgress] = useState(0);

  useEffect(() => {
    const animate = () => {
      setPulseProgress((prev) => (prev + 0.015) % 1);
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  function renderHourStripes() {
    const stripes = [];
    const radius = RADIUS;
    for (let i = 0; i < 24; i++) {
      const angle = -Math.PI / 2 + i * anglePerHour;
      const lineLength = i % 6 === 0 ? 12 : 6;
      const x1 = CENTER + (radius - lineLength - 10) * Math.cos(angle);
      const y1 = CENTER + (radius - lineLength - 10) * Math.sin(angle);
      const x2 = CENTER + (radius - 10) * Math.cos(angle);
      const y2 = CENTER + (radius - 10) * Math.sin(angle);
      stripes.push(
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#d1d5db"
          strokeWidth={1}
        />
      );
    }
    return stripes;
  }

  return (
    <svg width={SIZE} height={SIZE}>


      {/* Hour stripes */}
      {renderHourStripes()}

      {/* Base thin grey arcs */}
      {Array.from({ length: 24 }).map((_, hour) => {
        const startAngle = -Math.PI / 2 + hour * anglePerHour;
        const endAngle = startAngle + anglePerHour;
        const path = describeArc(CENTER, CENTER, RADIUS, startAngle, endAngle);

        return (
        <path
        key={`base-${hour}`}
        d={path}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={5}
        strokeLinecap="round"
        />
        );
      })}

    {/* Session window (single continuous arc) */}
      {sessionHours.length > 0 && (() => {
        const startHour = sessionHours[0];
        const endHour = sessionHours[sessionHours.length - 1] + 1;

        const startAngle = -Math.PI / 2 + startHour * anglePerHour;
        const endAngle = -Math.PI / 2 + endHour * anglePerHour;

        const path = describeArc(
            CENTER,
            CENTER,
            RADIUS,
            startAngle,
            endAngle
        );

        return (
            <g>
            {/* Outline */}
            <path
                d={path}
                fill="none"
                stroke="#9ca3af"
                strokeWidth={14}
                strokeLinecap="round"
            />

            {/* Main arc */}
            <path
                d={path}
                fill="none"
                stroke={"#e5e7eb"}
                strokeWidth={10}
                strokeLinecap="round"
            />
            </g>
        );
      })()}


      {/* Charging arcs */}
      {/* Session hour arcs */}
      {sessionHours.map((hour) => {
        const status: HourStatus = schedule[hour] ?? "none";

        const startAngle = -Math.PI / 2 + hour * anglePerHour;
        const endAngle = startAngle + anglePerHour;
        const path = describeArc(CENTER, CENTER, RADIUS, startAngle, endAngle);

        let stroke = "#e5e7eb04"; // default gray for "none"

        if (status === "future" || status === "current") {
          stroke = "#86dda6ff";
        }
        
        if (status === "past" ) {
          stroke = "#16a34a";
        }

        return (
          <path
            key={`session-hour-${hour}`}
            d={path}
            fill="none"
            stroke={stroke}
            strokeWidth={10}
            strokeLinecap="round"
          />
        );
      })}



      {/* Circles for session hours */}
      {/*sessionHours.map((hour) => {
        const angle = -Math.PI / 2 + hour * anglePerHour;
        const x = CENTER + RADIUS * Math.cos(angle);
        const y = CENTER + RADIUS * Math.sin(angle);
        const status = schedule[hour] ?? "none";
        const { stroke } = styleFor(hour, status, sessionHours);
        return <circle key={hour} cx={x} cy={y} r={CIRCLE_RADIUS} fill={stroke} />;
      })*/}

      {/* Flowing pulse for current hours */}
      {sessionHours.map((hour) => {
        const status = schedule[hour];
        if (status !== "current") return null;

        const startHourAngle = -Math.PI / 2 + hour * anglePerHour;
        const pulseWidth = 0.15 * anglePerHour; // 15% of hour arc
        const pulseStart = startHourAngle + pulseProgress * anglePerHour;
        const pulseEnd = pulseStart + pulseWidth;

        const pulsePath = describeArc(CENTER, CENTER, RADIUS, pulseStart, pulseEnd);

        return (
          <path
            key={`pulse-${hour}`}
            d={pulsePath}
            fill="none"
            stroke="#16a34a"
            strokeWidth={10}
            strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 4px #16a34a)" }}
          />
        );
      })}

      {/* Global clock numbers */}
      {[0, 6, 12, 18].map((h) => {
        const angle = -Math.PI / 2 + h * anglePerHour;
        const x = CENTER + (RADIUS - 30) * Math.cos(angle);
        const y = CENTER + (RADIUS - 30) * Math.sin(angle);
        return (
          <text
            key={h}
            x={x}
            y={y + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="14"
            fontWeight="bold"
          >
            {h}
          </text>
        );
      })}
    </svg>
  );
}

// Arc path helper
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = { x: cx + r * Math.cos(startAngle), y: cy + r * Math.sin(startAngle) };
  const end = { x: cx + r * Math.cos(endAngle), y: cy + r * Math.sin(endAngle) };

  // Determine if the arc should be greater than 180°
  let deltaAngle = endAngle - startAngle;
  if (deltaAngle < 0) deltaAngle += 2 * Math.PI;
  const largeArcFlag = deltaAngle > Math.PI ? 1 : 0;

  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}


