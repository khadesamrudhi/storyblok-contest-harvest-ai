import React, { useState } from "react";
import { StoryblokAPI } from "../services/api";

export default function Integrations() {
  const [spaceId, setSpaceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const onSync = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      // Do NOT send any secrets from the frontend.
      // Backend should read secure Storyblok token from its own .env
      const { data } = await StoryblokAPI.syncContent({
        spaceId,
        skipAssets: true,
      });
      setResult(data);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Integrations</h1>
      <p className="text-gray-600 mb-6">
        Connect Storyblok without exposing keys in the browser. The backend will
        use its secure token.
      </p>

      <div className="p-5 rounded-xl border border-gray-200 bg-white max-w-xl">
        <label className="block text-sm font-medium mb-2">
          Storyblok Space ID
        </label>
        <input
          type="text"
          value={spaceId}
          onChange={(e) => setSpaceId(e.target.value)}
          placeholder="e.g. 123456"
          className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
        <div className="mt-4">
          <button
            onClick={onSync}
            disabled={loading || !spaceId}
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Syncing…" : "Sync Content to Storyblok"}
          </button>
        </div>

        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
        {result && (
          <div className="mt-3 p-3 rounded-lg bg-blue-50 text-blue-900 text-sm">
            <pre className="whitespace-pre-wrap break-words">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
