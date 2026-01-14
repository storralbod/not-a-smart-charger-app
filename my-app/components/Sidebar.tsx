"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { TbClockBolt } from "react-icons/tb";
import { TbActivity } from "react-icons/tb";
import { GoGraph } from "react-icons/go";
import { TbAdjustmentsBolt } from "react-icons/tb";
import { BiLineChart } from "react-icons/bi";
import { useEffect, useState } from "react";


export default function Sidebar() {
  const pathname = usePathname();

  const linkClasses = (path: string) =>
    `block rounded px-3 py-2 transition
     ${
       pathname === path
         ? "font-semibold text-gray-800 bg-gray-300"       // active: bold
         : "text-gray-800 hover:bg-gray-200" // inactive: gray, white on hover
     }`;
  
  const [sidebar_extended, setExtended] = useState<boolean>(false)

  return (
    <aside className={`${sidebar_extended ? "w-64" : "w-18"} bg-gray-100 text-gray-800 flex flex-col border-r border-gray-200`}>
      <div className="relative text-center p-6 text-base font-semibold  border-b border-gray-200">
        {sidebar_extended && "Not-a-Smart Charger App"} 
            <button
              onClick={() => setExtended(prev => !prev)}
              className="
                absolute
                top-1/2
                right-0
                translate-x-1/2
                -translate-y-1/2
                w-6 h-6
                rounded-full
                bg-white
                border border-gray-300
                flex items-center justify-center
                text-gray-600
                hover:bg-gray-200
                transition
              "
            >
               {sidebar_extended ? "<" : ">"}
          </button>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        <Link href="/" className={`${linkClasses("/")} flex text-sm items-center ${
            sidebar_extended ? "gap-2 justify-start" : "justify-center"
          }`}>
            <TbAdjustmentsBolt />{sidebar_extended && <span>Home</span>}
        </Link>

        <Link href="/live_consumption" className={`${linkClasses("/live_consumption")} flex text-sm items-center ${
            sidebar_extended ? "gap-2 justify-start" : "justify-center"
          }`}>
             <TbActivity />{sidebar_extended && <span>Live Consumption</span>}
        </Link>

        <Link
          href="/historical_consumption"
          className={`${linkClasses("/historical_consumption")} flex text-sm items-center ${
            sidebar_extended ? "gap-2 justify-start" : "justify-center"
          }`}
        >
          <BiLineChart className="text-base"/>{sidebar_extended && <span>Historical Consumption</span>}
        </Link>

      </nav>

      <div className="p-4 border-t border-gray-200 text-sm text-gray-400">
        © 2025
      </div>
    </aside>
  );
}

