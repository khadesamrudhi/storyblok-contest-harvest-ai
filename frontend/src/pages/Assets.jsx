import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import { AssetAPI, ScrapingAPI } from "../services/api";
import { Skeleton } from "../components/Skeleton";
import { Download, Link as LinkIcon, ExternalLink } from "lucide-react";

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
      {/* Header */}
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
          className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 shadow-sm"
        >
           Import Assets
        </button>
      </div>

      <p className="text-gray-600 mb-4">
        Collect, filter, and export visuals that elevate your content.
      </p>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="p-3 rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              <Skeleton className="aspect-video w-full rounded mb-2" />
              <Skeleton className="h-4 w-2/3 rounded mb-1" />
              <Skeleton className="h-3 w-full rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Asset Cards */}
      {!isLoading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.map((a, i) => (
            <motion.div
              key={a.id || a._id || a.url || i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="p-3 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all"
            >
              {/* Thumbnail with preview fallback */}
              <div className="relative aspect-video bg-gray-100 rounded mb-2 overflow-hidden group">
                {(a.thumb || a.url) ? (
                  <img
                    src={a.thumb || a.url}
                    alt={a.alt || "asset"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                    No preview
                  </div>
                )}

                {/* Hover actions */}
                {a.url && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                    {/* Open in new tab */}
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 bg-white rounded-full shadow hover:bg-gray-100"
                    >
                      <ExternalLink className="w-4 h-4 text-gray-700" />
                    </a>

                    {/* Copy link */}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(a.url);
                        toast.success("Copied link to clipboard");
                      }}
                      className="p-2 bg-white rounded-full shadow hover:bg-gray-100"
                    >
                      <LinkIcon className="w-4 h-4 text-gray-700" />
                    </button>

                    {/* Download */}
                    <a
                      href={a.url}
                      download
                      className="p-2 bg-white rounded-full shadow hover:bg-gray-100"
                    >
                      <Download className="w-4 h-4 text-gray-700" />
                    </a>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="text-sm font-medium truncate">
                {a.title || a.alt || "Asset"}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {a.url || a.source || "—"}
              </div>
            </motion.div>
          ))}

          {/* Empty State */}
          {data?.length === 0 && (
            <div className="col-span-3 text-center py-12">
              <div className="text-gray-400 text-lg mb-2">📂 No assets yet</div>
              <p className="text-sm text-gray-500">
                Start importing to build your asset library.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
