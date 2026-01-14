"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];
const SOC = Array.from({ length: 101 }, (_, i) => i);

export default function HomePage() {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [soc, setSoc] = useState(50);
  const router = useRouter();
  const [start, setStart] = useState(false)


  const handleSubmit = async () => {
    const startChargeTimestamp = new Date().toISOString();

    const params = new URLSearchParams({
    start_charge_timestamp: startChargeTimestamp,
    hours: hours.toString(),
    minutes: minutes.toString(),
    soc: soc.toString(),
    });

    try {
      const res = await fetch(
      //`http://localhost:8000/api/charge?${params.toString()}`,
      `https://not-a-smart-charger-app.onrender.com/api/charge?${params.toString()}`,
      {
        method: "POST",
      }
      );
      console.log("Start charging status:", res.status);
      if (!res.ok) {
        throw new Error("Failed to start charging");
      }

      setStart(true);

      localStorage.setItem("hours", String(hours));
      localStorage.setItem("soc", String(soc));
      localStorage.setItem("start_charge_timestamp", startChargeTimestamp);
      console.log("Start Charge Time:", startChargeTimestamp)
      router.push(`/live_consumption?start_charge_timestamp=${startChargeTimestamp}&hours=${hours}&soc=${soc}`);

    } catch (error) {
      console.error(error);
      alert("Failed to start charging. Please try again.");
    }

    try {
      const res = await fetch(`https://not-a-smart-charger-app-sessions.onrender.com/api/save_session?${params.toString()}`,
      {
        method: "POST",
      }
    );
    console.log("Save session to db status:", res.status)
    } catch (error) {
      console.error(error);
    }
  };


  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="w-full max-w-lg text-center">
        <h1 className="text-3xl text-gray-800 font-semibold mb-10">
          EV Charging Setup
        </h1>

        {/* CHARGING TIME */}
        <section className="mb-10">
          <h2 className="text-lg text-gray-800 font-medium mb-4">
            Pick-up Time
          </h2>

          <div className="flex justify-center gap-4">
            <PickerInput
              label="Hours"
              value={`${hours} h`}
            >
              <ScrollPicker
                values={HOURS}
                selected={hours}
                onSelect={setHours}
              />
            </PickerInput>

            <PickerInput
              label="Minutes"
              value={`${minutes} m`}
            >
              <ScrollPicker
                values={MINUTES}
                selected={minutes}
                onSelect={setMinutes}
              />
            </PickerInput>
          </div>
        </section>

        {/* SOC */}
        <section className="mb-10">
          <h2 className="text-lg text-gray-700 font-medium mb-4">
            Battery State of Charge
          </h2>

          <div className="flex justify-center">
            <PickerInput
              //label="%"
              value={`${soc} %`}
            >
              <ScrollPicker
                values={SOC}
                selected={soc}
                onSelect={setSoc}
                height="h-48"
              />
            </PickerInput>
          </div>
        </section>

        {/* SUBMIT */}
        <button
          onClick={handleSubmit}
          className={`
            group w-full font-bold py-3.5 rounded-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 uppercase text-xs cursor-pointer
            ${start
              ? "bg-green-600/90 border border-green-700 text-green-800 cursor-not-allowed pointer-events-none text-green-900"
              : "bg-green-500/50 border border-green-600 text-green-800 hover:bg-green-600/90 hover:border-green-700"}
          `}
        >
        <Zap />Start
        </button>
      </div>
    </div>
  );
}


// Scroll pick input
function PickerInput({
  label,
  value,
  children,
}: {
  label?: string;
  value: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <label className="block text-sm text-gray-500 mb-1">
        {label}
      </label>

      <div
        onClick={() => setOpen(!open)}
        className="cursor-pointer text-gray-700 border border-gray-300 rounded-lg px-4 py-3 w-28 text-center bg-white hover:border-gray-400"
      >
        {value}
      </div>

      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-2 z-20 bg-white shadow-lg rounded-lg p-2">
          {children}
        </div>
      )}
    </div>
  );
}

// Scroll component
function ScrollPicker({
  values,
  selected,
  onSelect,
  height = "h-40",
}: {
  values: number[];
  selected: number;
  onSelect: (v: number) => void;
  height?: string;
}) {
  return (
    <div
      className={`${height} w-20 overflow-y-scroll snap-y snap-mandatory scrollbar-hide`}
    >
      {values.map((v) => (
        <div
          key={v}
          onClick={() => onSelect(v)}
          className={`snap-center h-10 flex items-center justify-center cursor-pointer rounded
            ${
              v === selected
                ? "bg-gray-200 text-gray-700 font-semibold"
                : "text-gray-700 hover:bg-gray-100"
            }`}
        >
          {v.toString().padStart(2, "0")}
        </div>
      ))}
    </div>
  );
}
