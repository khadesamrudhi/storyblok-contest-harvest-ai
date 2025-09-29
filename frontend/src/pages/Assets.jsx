import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { AssetAPI, ScrapingAPI } from "../services/api";
import { Skeleton } from "../components/Skeleton";

export default function Assets() {
  const qc = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["assets", { page: 1 }],
    queryFn: async () => {
      const { data } = await AssetAPI.list();
      return Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : [];
    },
    staleTime: 30_000,
    retry: 1,
  });

  if (isError) toast.error(error?.message || "Failed to load assets");

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Asset Harvester</h1>
        <button
          onClick={async () => {
            const url = window.prompt("Enter page URL for asset discovery");
            if (!url) return;
            try {
              await ScrapingAPI.enqueue({
                type: "asset_discovery",
                url,
                options: {},
              });
              toast.success("Asset discovery started");
              setTimeout(
                () => qc.invalidateQueries({ queryKey: ["assets"] }),
                1500
              );
            } catch (e) {
              toast.error(e?.message || "Failed to start asset discovery");
            }
          }}
          className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
        >
          Import
        </button>
      </div>
      <p className="text-gray-600 mb-4">
        Collect, filter, and export visuals that elevate your content.
      </p>

      {isLoading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="p-3 rounded-xl border border-gray-200 bg-white"
            >
              <Skeleton className="aspect-video w-full rounded mb-2" />
              <Skeleton className="h-4 w-2/3 rounded mb-1" />
              <Skeleton className="h-3 w-full rounded" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.map((a) => (
            <div
              key={a.id || a._id || a.url}
              className="p-3 rounded-xl border border-gray-200 bg-white"
            >
              <div className="aspect-video bg-gray-100 rounded mb-2 overflow-hidden">
                {a.thumb ? (
                  <img
                    src={a.thumb}
                    alt={a.alt || "asset"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                    No preview
                  </div>
                )}
              </div>
              <div className="text-sm font-medium truncate">
                {a.title || a.alt || "Asset"}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {a.url || a.source || "—"}
              </div>
            </div>
          ))}
          {data?.length === 0 && (
            <div className="text-sm text-gray-500">No assets yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
