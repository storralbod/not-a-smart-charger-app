"use client";

import {useState} from "react";
import { Zap } from "lucide-react";

interface StopButtonProps {
  onStop?: () => void; // optional callback
  disabled?: boolean;
}

export default function StopButton({ onStop, disabled = false }: StopButtonProps) {

    const [stop, setStop] = useState(false)

    const handleStop = async() => {
        //const res = await fetch("http://127.0.0.1:8000/api/stop_charging", {method: "POST", headers: {"Content-Type": "application/json",}});
        const res = await fetch("https://not-a-smart-charger-app.onrender.com/api/stop_charging", {method: "POST", headers: {"Content-Type": "application/json",}});

        if (!res.ok) {
            throw new Error ("Failed to stop");
        }

        setStop(true);

        if (onStop) {
        onStop(); // call parent callback
    }
    }



    return (
        <button
            onClick={handleStop}
            disabled={stop || disabled}
            className={`
                group w-full font-mono font-bold py-3.5 rounded-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 uppercase text-xs cursor-pointer
                ${stop
                ? "bg-red-500 border border-red-800 cursor-not-allowed pointer-events-none"
                : "bg-red-500/50 border border-red-600 hover:bg-red-500/90 hover:border-red-800"}
            `}   
        >

            <Zap
                size={16}
                className={`
                transition-colors
                ${
                    stop
                    ? "text-red-800"
                    : "text-red-500 group-hover:text-red-800"
                }
                `}
            />
            <span
                className={`
                transition-colors
                ${
                    stop
                    ? "text-red-800"
                    : "text-red-500 group-hover:text-red-800"
                }
                `}
            >
                Stop
            </span>

        </button>

    );
}
