import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import { CompetitorAPI, ScrapingAPI } from "../services/api";
import { Skeleton } from "../components/Skeleton";

export default function Competitors() {
  const qc = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["competitors", { page: 1 }],
    queryFn: async () => {
      const { data } = await CompetitorAPI.list();
      return Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];
    },
    staleTime: 30_000,
    retry: 1,
  });

  if (isError) {
    toast.error(error?.message || "Failed to load competitors");
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Competitor Analysis</h1>
        <button
          onClick={async () => {
            const url = window.prompt(
              "Enter competitor URL (e.g., https://github.com/khadesamrudhi)"
            );
            if (!url) return;
            try {
              await ScrapingAPI.enqueue({
                type: "competitor_website",
                url,
                options: {},
              });
              toast.success("Scrape started");
              setTimeout(
                () => qc.invalidateQueries({ queryKey: ["competitors"] }),
                1200
              );
            } catch (e) {
              toast.error(e?.message || "Failed to enqueue scrape");
            }
          }}
          className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 shadow-sm"
        >
          + New Competitor
        </button>
      </div>

      <p className="text-gray-600 mb-4">
        Monitor strategies and engagement to discover gaps you can own.
      </p>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              <Skeleton className="h-5 w-1/2 rounded mb-2" />
              <Skeleton className="h-3 w-full rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Competitor Cards */}
      {!isLoading && (
        <div className="grid md:grid-cols-2 gap-4">
          {data?.map((c, i) => (
            <motion.div
              key={c.id || c._id || c.domain || i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="p-5 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-transform hover:scale-[1.02] cursor-pointer"
            >
              {/* Avatar / Logo */}
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                  {c.name?.[0] || c.domain?.[0] || "C"}
                </div>
                <div>
                  <div className="font-semibold text-gray-800">
                    {c.name || c.domain || "Competitor"}
                  </div>
                  <div className="text-xs text-gray-400">
                    {c.addedAt ? new Date(c.addedAt).toLocaleDateString() : "—"}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="text-gray-600 text-sm mb-2">
                {c.description || c.note || "No description available."}
              </div>

              {/* Quick Action */}
              {c.domain && (
                <a
                  href={c.domain.startsWith("http") ? c.domain : `https://${c.domain}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 text-sm font-medium hover:underline"
                >
                  Visit Website →
                </a>
              )}
            </motion.div>
          ))}

          {/* Empty State */}
          {data?.length === 0 && (
            <div className="col-span-2 text-center py-12">
              <div className="text-gray-400 text-lg mb-2">
                🚀 No competitors yet
              </div>
              <p className="text-sm text-gray-500">
                Start by adding your first competitor to track insights.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
