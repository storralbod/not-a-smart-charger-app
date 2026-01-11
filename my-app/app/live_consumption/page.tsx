//import LivePowerChart from "../../components/LivePowerChart";

//export default function Home() {
 // return (
 //   <div>
 //     <h1>Live Power Dashboard</h1>
 //     <LivePowerChart />
 //   </div>
//  );
//}

"use client";
import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import LivePowerChart from "../../components/LivePowerChart";
import ChargingClock from "../../components/ChargingClock";
import StopButton from "../../components/StopButton";
import { buildChargingSchedule } from "./chargingSchedule";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hoursParam = searchParams.get("hours");
  const socParam = searchParams.get("soc");
  const pickUpFromUrl =
    hoursParam !== null ? Number(hoursParam) : null;
  const socFromUrl =
    socParam !== null ? Number(socParam) : null;
  const [pick_up_hour, setPickUpHour] = useState<number | null>(null);
  const [soc, setSoc] = useState<number | null>(null);
  const [chargingHours, setChargingHours] = useState<number[]>([]);
  const [stopped, setStopped] = useState(false);
  const startChargeParam = searchParams.get("start_charge_timestamp");
  const startChargeFromUrl = startChargeParam 
  const [start_charge_timestamp, setStartChargeTimestamp] = useState<string | null>(null);
  const sessionStartHour =
    start_charge_timestamp != null
      ? new Date(start_charge_timestamp)
      : null;
  
  const [chargingStatus, setChargingStatus] = useState<"charging" | "standby" | "idle">("idle");
  const [now, setNow] = useState(new Date());

  const statusColors = {
    charging: "bg-green-500 shadow-[0_0_4px_rgba(52,211,153,0.9)]",
    standby: "bg-yellow-500 shadow-[0_0_4px_rgba(251,191,36,0.9)]",
    idle: "bg-red-500 shadow-[0_0_4px_rgba(244,63,94,0.9)]",
  };

  const statusColorsTransparent = {
    charging: "bg-green-500/20",
    standby: "bg-yellow-500/20",
    idle: "bg-red-500/20",
  };

  const clearChargingSession = () => {
    localStorage.removeItem("hours");
    localStorage.removeItem("soc");

    setChargingHours([]);
    setPickUpHour(null);
    setSoc(null);

    router.replace("/live_consumption")
  };

  const handleStop = () => {
    setStopped(true);
    setChargingStatus("idle");
    clearChargingSession();
  };


  useEffect(() => {
    if (pickUpFromUrl !== null && socFromUrl !== null && startChargeFromUrl) {
      setPickUpHour(pickUpFromUrl);
      setSoc(socFromUrl);
      setStartChargeTimestamp(startChargeFromUrl);

      localStorage.setItem("hours", String(pickUpFromUrl));
      localStorage.setItem("soc", String(socFromUrl));
      localStorage.setItem("start_charge_timestamp", startChargeFromUrl);
    } else {
      const storedPickUp = localStorage.getItem("hours");
      const storedSoc = localStorage.getItem("soc");
      const storedStartCharge = localStorage.getItem("start_charge_timestamp");

      if (storedPickUp && storedSoc && storedStartCharge) {
        setPickUpHour(Number(storedPickUp));
        setSoc(Number(storedSoc));
        setStartChargeTimestamp(storedStartCharge);
      }
    }
  }, [pickUpFromUrl, socFromUrl, startChargeFromUrl]);


  useEffect(() => {
    if (pick_up_hour == null || soc == null) return;

    const fetchSchedule = async () => {
      const res = await fetch(
        `http://localhost:8000/api/charging_schedule` +
        `?start_charge_timestamp=${encodeURIComponent(start_charge_timestamp!)}` +
        `&hours=${pick_up_hour}` +
        `&soc=${soc}`
      );
      const data = await res.json();
      console.log(data.charging_hours)
      setChargingHours(data.charging_hours);
    };

    fetchSchedule();
  }, [pick_up_hour, soc]);

  useEffect(() => {
    if (pick_up_hour == null || sessionStartHour == null) return;

    const pickup = sessionStartHour;

    pickup.setHours(pick_up_hour, 0, 0, 0);

    // if pickup is earlier than start, it means next day
    if (pickup <= sessionStartHour) {
      pickup.setDate(pickup.getDate() + 1);
    }

    const timeoutMs = pickup.getTime() - sessionStartHour.getTime();

    if (timeoutMs <= 0) return;

    const timeout = setTimeout(clearChargingSession, timeoutMs);

    return () => clearTimeout(timeout);
  }, [pick_up_hour, start_charge_timestamp]);


  const sessionHours =
    sessionStartHour !== null && pick_up_hour !== null
      ? buildSessionHours(sessionStartHour.getHours(), pick_up_hour)
      : [];
   
  const currentHour = now.getHours();    
  const schedule = useMemo(() => {
    if (sessionStartHour === null) return {};
    return buildChargingSchedule(chargingHours, currentHour, sessionStartHour.getHours());
  }, [chargingHours, currentHour, sessionStartHour]);

  const [countdown, setCountdown] = useState<string>("00:00:00");

  useEffect(() => {
    if (pick_up_hour == null || sessionStartHour == null) return;

    const pickup = new Date(sessionStartHour);
    pickup.setHours(pick_up_hour, 0, 0, 0);
    if (pickup < sessionStartHour) {
      pickup.setDate(pickup.getDate() + 1);
    }
    
    const interval = setInterval(() => {
      const now = new Date();
      const diff = pickup.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown("00:00:00");
        clearInterval(interval); 
        return;
      }

      const hours = Math.floor(diff / 1000 / 3600);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setCountdown(
        `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [pick_up_hour, sessionStartHour]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000); // update every second (safe + synced)

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (stopped) {
      setChargingStatus("idle");
      return; // don’t overwrite with standby/charging
    }
    if (chargingHours.length === 0) {
      setChargingStatus("standby");
      return;
    }

    const currentHour = now.getHours();

    if (chargingHours.includes(currentHour)) {
      setChargingStatus("charging");
    } else {
      setChargingStatus("standby");
    }
  }, [now, chargingHours]);


  const currentTimeFormatted = `${now
    .getHours()
    .toString()
    .padStart(2, "0")}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;

  console.log(sessionHours, typeof sessionHours[0]);
  console.log(chargingHours)
  console.log(schedule)
  console.log(sessionStartHour)
  return (
    <div className="p-6 space-y-6 bg-grey-100 rounded-xl">


      <div className="border border-gray-300 bg-gray-100 rounded-xl p-1 ">
        <div className="flex items-center justify-between">

        {/* LEFT SPACE (fills available area) */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            
            {/* STATUS */}
            <div className="flex items-center gap-3 text-xs font-semibold uppercase  text-gray-600">
              <span>Status</span>

              <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full ${
                    chargingStatus === "charging"
                      ? statusColors.charging
                      : statusColorsTransparent.charging
                  }`}
                />
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full ${
                    chargingStatus === "standby"
                      ? statusColors.standby
                      : statusColorsTransparent.standby
                  }`}
                />
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full ${
                    chargingStatus === "idle"
                      ? statusColors.idle
                      : statusColorsTransparent.idle
                  }`}
                />
              </div>
            </div>

            {/* Labels + Numbers */}
            <div className="flex items-center gap-6">

              {/* TIME column */}
              <div className="flex flex-col items-center">
                <span className="text-xs tracking-wider text-gray-600">
                  Time
                </span>
                <span className="text-sm font-mono text-gray-800">
                  {currentTimeFormatted}
                </span>
              </div>

              {/* Vertical divider */}
              <div className="w-px bg-gray-300 self-stretch" />

              {/* COUNTDOWN column */}
              <div className="flex flex-col items-center">
                <span className="text-xs tracking-wider text-gray-600">
                  Countdown
                </span>
                <span className="text-sm font-mono text-gray-800">
                  {countdown}
                </span>
              </div>

            </div>


            {/* STOP BUTTON */}
            <StopButton onStop={handleStop} disabled={stopped}/>
          </div>
        </div>

        {/* RIGHT: CLOCK (right-aligned) */}
        <div className="flex-shrink-0">
          <ChargingClock
            schedule={schedule}
            sessionHours={sessionHours}
          />
        </div>


        </div>
      </div>


    <div className="bg-gray-100 border border-gray-300 rounded-xl p-6 h-80">
      <LivePowerChart />
    </div>

    </div>
  );
}


function buildSessionHours(currentHour: number, pickUpHour: number): number[] {
  const hours: number[] = [];

  let h = currentHour;
  while (h !== pickUpHour) {
    hours.push(h);
    h = (h + 1) % 24;
  }

  return hours;
}