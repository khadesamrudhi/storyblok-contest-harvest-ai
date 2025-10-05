import React from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import { CompetitorAPI, AssetAPI, TrendAPI } from "../services/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function Dashboard() {
  const competitorsQuery = useQuery({
    queryKey: ["competitors-count"],
    queryFn: async () => {
      const { data } = await CompetitorAPI.list();
      const list = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];
      return list.length;
    },
    staleTime: 30_000,
    retry: 1,
  });

  const assetsQuery = useQuery({
    queryKey: ["assets-count"],
    queryFn: async () => {
      const { data } = await AssetAPI.list();
      const list = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];
      return list.length;
    },
    staleTime: 30_000,
    retry: 1,
  });

  const trendsQuery = useQuery({
    queryKey: ["trends-count"],
    queryFn: async () => {
      const { data } = await TrendAPI.latest();
      const list = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];
      return list.length;
    },
    staleTime: 30_000,
    retry: 1,
  });

  const isError =
    competitorsQuery.isError || assetsQuery.isError || trendsQuery.isError;
  if (isError) {
    toast.error("Some dashboard data failed to load");
  }

  const cards = [
    { label: "Competitors", value: competitorsQuery.data ?? "—" },
    { label: "Assets", value: assetsQuery.data ?? "—" },
    { label: "Trends", value: trendsQuery.data ?? "—" },
    { label: "Predictions", value: "—" },
  ];

  // Dummy chart data (replace with API data if available)
  const chartData = [
    { name: "Mon", value: 12 },
    { name: "Tue", value: 18 },
    { name: "Wed", value: 25 },
    { name: "Thu", value: 20 },
    { name: "Fri", value: 30 },
  ];

  return (
    <div>
      <h1 className="text-3xl font-extrabold mb-4 text-gray-800">
        Unified Intelligence Dashboard
      </h1>
      <p className="text-gray-600 mb-6">
        Real-time scraping and analysis results across your content operations.
      </p>

      {/* Cards Section */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((c) => (
          <motion.div
            key={c.label}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
            className="p-6 rounded-2xl shadow-md border border-gray-200 bg-gradient-to-br from-white to-gray-50 hover:shadow-xl"
          >
            <div className="text-4xl font-bold text-blue-600">{c.value}</div>
            <div className="text-gray-500">{c.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Chart Section */}
      <div className="mt-10 p-6 rounded-2xl border border-gray-200 shadow-sm bg-white">
        <div className="font-semibold mb-4 text-gray-700">
          Live Analytics Preview
        </div>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#4F46E5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
