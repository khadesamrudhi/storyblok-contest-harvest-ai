import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { TrendAPI } from "../services/api";
import { Skeleton } from "../components/Skeleton";

export default function Trends() {
  const [analysisResults, setAnalysisResults] = useState([]);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["trends-latest"],
    queryFn: async () => {
      const { data } = await TrendAPI.latest();
      return Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : [];
    },
    staleTime: 30_000,
    retry: 1,
  });

  if (isError) toast.error(error?.message || "Failed to load trends");

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Trend-Powered Suggestions</h1>
        <button
          onClick={async () => {
            try {
              const res = await TrendAPI.analyze({
                save: true,
                sources: ["reddit", "google_trends"],
                geo: "US",
                category: "general",
                limit: 20,
              });
              const trends =
                res?.data?.result?.trends || res?.data?.trends || [];
              setAnalysisResults(Array.isArray(trends) ? trends : []);
              if (Array.isArray(trends) && trends.length > 0) {
                toast.success("Trend analysis complete");
              } else {
                toast("No trends found. Try again or change sources.", {
                  icon: "ℹ️",
                });
              }
              setTimeout(() => {
                refetch();
              }, 300);
            } catch (e) {
              toast.error(e?.message || "Failed to start analysis");
            }
          }}
          className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
        >
          Analyze Trends
        </button>
      </div>
      <p className="text-gray-600 mb-4">
        Identify emerging trends before they peak. Predict longevity and
        engagement potential.
      </p>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-gray-200 bg-white"
            >
              <Skeleton className="h-5 w-2/3 rounded mb-2" />
              <Skeleton className="h-3 w-full rounded" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="space-y-3">
          {(analysisResults?.length ? analysisResults : data)?.map((t) => (
            <div
              key={t.id || t._id || t.topic || t.keyword}
              className="p-4 rounded-xl border border-gray-200 bg-white"
            >
              <div className="font-semibold">
                {t.title || t.topic || t.keyword || "Trend"}
              </div>
              <div className="text-sm text-gray-600">
                {t.summary ||
                  t.description ||
                  t.formatted_traffic ||
                  "No summary"}
              </div>
            </div>
          ))}
          {!analysisResults?.length && data?.length === 0 && (
            <div className="text-sm text-gray-500">No trends yet.</div>
          )}
          {analysisResults?.length > 0 && (
            <div className="text-xs text-gray-500">
              Showing unsaved analysis results. Click again to refresh.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
