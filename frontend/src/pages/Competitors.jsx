import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
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
          className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
        >
          New Competitor
        </button>
      </div>
      <p className="text-gray-600 mb-4">
        Monitor strategies and engagement to discover gaps you can own.
      </p>

      {isLoading && (
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-gray-200 bg-white"
            >
              <Skeleton className="h-5 w-1/2 rounded mb-2" />
              <Skeleton className="h-3 w-full rounded" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="grid md:grid-cols-2 gap-4">
          {data?.map((c) => (
            <div
              key={c.id || c._id || c.domain}
              className="p-4 rounded-xl border border-gray-200 bg-white"
            >
              <div className="font-semibold">
                {c.name || c.domain || "Competitor"}
              </div>
              <div className="text-gray-500 text-sm">
                {c.description || c.note || "No description"}
              </div>
            </div>
          ))}
          {data?.length === 0 && (
            <div className="text-sm text-gray-500">No competitors yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
