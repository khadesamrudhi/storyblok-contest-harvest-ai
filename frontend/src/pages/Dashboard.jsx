import React from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { CompetitorAPI, AssetAPI, TrendAPI } from "../services/api";

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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">
        Unified Intelligence Dashboard
      </h1>
      <p className="text-gray-600 mb-6">
        Real-time scraping and analysis results across your content operations.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="p-4 rounded-xl border border-gray-200 bg-white"
          >
            <div className="text-3xl font-bold">{c.value}</div>
            <div className="text-gray-500">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-5 rounded-xl border border-gray-200 bg-white">
        <div className="font-semibold mb-2">Live analytics preview</div>
        <div className="h-40 rounded-md bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center text-blue-700 font-semibold">
          Coming soon: sockets-powered updates
        </div>
      </div>
    </div>
  );
}
