"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TbClockBolt } from "react-icons/tb";
import { TbActivity } from "react-icons/tb";
import { GoGraph } from "react-icons/go";
import { TbAdjustmentsBolt } from "react-icons/tb";
import { BiLineChart } from "react-icons/bi";


export default function Sidebar() {
  const pathname = usePathname();

  const linkClasses = (path: string) =>
    `block rounded px-3 py-2 transition
     ${
       pathname === path
         ? "font-semibold text-gray-800 bg-gray-300"       // active: bold
         : "text-gray-800 hover:bg-gray-200" // inactive: gray, white on hover
     }`;

  return (
    <aside className="w-64 bg-gray-100 text-gray-800 flex flex-col border-r border-gray-200">
      <div className="text-center p-6 text-base font-semibold  border-b border-gray-200">
        Not-a-Smart Charger App
      </div>

      <nav className="flex-1 p-4 space-y-1">
        <Link href="/" className={`${linkClasses("/")} flex text-sm items-center gap-2`}>
          <TbAdjustmentsBolt/>Home
        </Link>

        <Link href="/live_consumption" className={`${linkClasses("/live_consumption")} flex text-sm items-center gap-2`}>
          <TbActivity/>Live Consumption
        </Link>

        <Link
          href="/historical_consumption"
          className={`${linkClasses("/historical_consumption")} flex text-sm items-center gap-2`}
        >
          <BiLineChart className="text-base"/>Historical Consumption
        </Link>

      </nav>

      <div className="p-4 border-t border-gray-200 text-sm text-gray-400">
        © 2025
      </div>
    </aside>
  );
}

