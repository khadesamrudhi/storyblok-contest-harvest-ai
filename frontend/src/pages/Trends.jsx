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
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-3xl font-extrabold text-gray-900">
          Trend-Powered Suggestions
        </h1>
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
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
        >
          Analyze Trends
        </button>
      </div>

      <p className="text-gray-600 mb-6 text-lg">
        Identify emerging trends before they peak. Predict longevity and
        engagement potential.
      </p>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl border border-gray-200 bg-white shadow-sm animate-pulse"
            >
              <Skeleton className="h-6 w-2/3 rounded mb-3" />
              <Skeleton className="h-4 w-full rounded" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="space-y-4">
          {(analysisResults?.length ? analysisResults : data)?.map((t) => (
            <div
              key={t.id || t._id || t.topic || t.keyword}
              className="p-5 rounded-2xl border border-gray-200 bg-white shadow hover:shadow-lg transition-shadow duration-200"
            >
              <div className="font-bold text-lg text-gray-900 mb-1">
                {t.title || t.topic || t.keyword || "Trend"}
              </div>
              <div className="text-sm text-gray-600">
                {t.summary || t.description || t.formatted_traffic || "No summary"}
              </div>
            </div>
          ))}

          {!analysisResults?.length && data?.length === 0 && (
            <div className="text-sm text-gray-500">No trends yet.</div>
          )}

          {analysisResults?.length > 0 && (
            <div className="text-xs text-gray-500 mt-2">
              Showing unsaved analysis results. Click again to refresh.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
