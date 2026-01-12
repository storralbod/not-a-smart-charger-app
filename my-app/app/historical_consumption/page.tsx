"use client";

import { useEffect, useState } from "react";
import { FaHandHoldingDollar } from "react-icons/fa6";
import { PiHandCoinsFill, PiHandCoinsBold } from "react-icons/pi";
import { TbChartHistogram } from "react-icons/tb";
import { TbCoinEuro } from "react-icons/tb";
import { Zap } from "lucide-react";
import HistoricPowerChart from "../../components/HistoricPowerChart";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type MonthlyCost = {
  year: number;
  month: number;
  total_cost: number;
};

type MonthlyConsumption = {
  timestamp: string;
  power: number;
};

export default function HistoricCostsPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [data, setData] = useState<MonthlyCost[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCost, setTotalCost] = useState(0);
  const [totalConsumption, setTotalConsumption] = useState(0);
  const hasDates = Boolean(startDate && endDate);

  useEffect(() => {
    const fetchCosts = async () => {
      if (!startDate || !endDate) return;

      setLoading(true);

      try {
        const res_cost = await fetch(
          //`http://localhost:8000/api/get_historic_cost?start_dt=${startDate}&end_dt=${endDate}`
          `https://not-a-smart-charger-app.onrender.com/api/get_historic_cost?start_dt=${startDate}&end_dt=${endDate}`
        );
        const total_cost_json: MonthlyCost[] = await res_cost.json();
        setData(total_cost_json);

        // calculate total cost for cards
        const total = total_cost_json.reduce((sum, item) => sum + item.total_cost, 0);
        setTotalCost(total);

        const res_consumption = await fetch(
          //`http://localhost:8000/api/get_historic_power?start_dt=${startDate}&end_dt=${endDate}`
          `https://not-a-smart-charger-app.onrender.com/get_historic_power?start_dt=${startDate}&end_dt=${endDate}`
        );
        const total_consumption_json: MonthlyConsumption[] = await res_consumption.json();

        // calculate total consumption for cards
        const total_consumption = total_consumption_json.reduce((sum, item) => sum + item.power, 0);
        setTotalConsumption(total_consumption/1e3);

      } catch (err) {
        console.error("Failed to fetch data", err);
        setData([]);
        setTotalCost(0);
      } finally {
        setLoading(false);
      }
    };

    fetchCosts();
  }, [startDate, endDate]);

  const formattedData = data.map((item) => ({
    ...item,
    label: `${item.year}-${String(item.month).padStart(2, "0")}`,
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Date inputs */}
      <div className="flex justify-center gap-4 items-end">
        <div>
          <label className="block text-sm text-gray-600">Start date</label>
            <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600">End date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300"
          />
        </div>
       </div>

       {!hasDates && !loading && (
        <div className="flex items-center justify-center h-72 rounded-xl border border-dashed border-gray-300 bg-gray-50">
            <div className="text-center space-y-3">
            <div className="mx-auto h-10 w-10 rounded-full bg-cyan-100 flex items-center justify-center">
                <TbChartHistogram className="text-cyan-600 text-xl" />
            </div>

            <p className="text-sm font-medium text-gray-700">
                Select a date range
            </p>

            <p className="text-xs text-gray-500 max-w-xs">
                Choose a start and end date to visualize your energy cost and
                consumption history.
            </p>
            </div>
        </div>
        )}


        {loading && <p className="text-gray-500">Loading…</p>}

        {hasDates && !loading && formattedData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 flex flex-col">
            <span className="flex gap-2 text-sm text-gray-500"> <PiHandCoinsBold/>Total Cost</span>
            <span className="text-2xl font-bold text-gray-800">€{totalCost.toFixed(2)}</span>
            </div>
            <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 flex flex-col">
            <span className="flex gap-2 text-sm text-gray-500"><Zap size={16}/> Total Power</span>
            <span className="text-2xl font-bold text-gray-800">
                {totalConsumption.toFixed(2)}kWh
            </span>
            </div>
        </div>
        )}

      {hasDates && !loading && formattedData.length > 0 && (
        <ResponsiveContainer width="100%" height={175}>
          <BarChart
            data={formattedData}
            margin={{ top: 20, right: 20, bottom: 20, left: 0 }}
          >
            <XAxis
              dataKey="label"
              tick={{ fill: "#6b7280", fontSize: 12 }}
              axisLine={{ stroke: "#e5e7eb" }}
              tickLine={false}
            />

            <YAxis
              orientation="right"
              width={45} 
              tick={{ fill: "#6b7280", fontSize: 12 }}
              axisLine={{ stroke: "#e5e7eb" }}
              tickLine={false}
              tickFormatter={(v) => `€${v.toLocaleString()}`}
            />

            <Tooltip
              cursor={{ fill: "rgba(6,182,212,0.1)" }}
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                color: "#374151",
                fontSize: 12,
              }}
              formatter={(value) => {
                if (typeof value !== "number") return ["–", "Cost"];
                return [`€${value.toFixed(2)}`, "Cost"];
              }}
            />

            <Bar dataKey="total_cost" radius={[4, 4, 0, 0]} fill="#06b6d4" maxBarSize={48} />

          </BarChart>
        </ResponsiveContainer>
      )}
      {startDate && endDate && (
        <div className="h-32 w-full">
            <HistoricPowerChart
                startDate={startDate}
                endDate={endDate}
            />
        </div>
        )}
    </div>
  );
}
