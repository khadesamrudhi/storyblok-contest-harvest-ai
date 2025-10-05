import React, { useMemo, useState } from "react";
import { InsightAPI } from "../services/api";

export default function Insights() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const onPredict = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data } = await InsightAPI.predict({ content: input });
      setResult(data);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const parsed = useMemo(() => {
    if (!result) return null;
    const payload = result?.prediction || result?.result || result;
    if (typeof payload !== "object" || payload === null) return null;

    const engagement = Number(
      payload.engagement || payload.engagement_score || payload.engagementScore || payload["Engagement score"]
    );
    const readability = Number(
      payload.readability || payload.readability_score || payload.readabilityScore || payload["Readability score"]
    );
    const seo = Number(
      payload.seo || payload.seo_potential || payload.seoPotential || payload["SEO potential"]
    );
    const social = Number(
      payload.social || payload.social_sharing || payload.socialSharing || payload["Social sharing likelihood"]
    );

    const strengths = payload.strengths || payload.key_strengths || payload["Key strengths"] || [];
    const improvements = payload.improvements || payload.areas_for_improvement || payload["Areas for improvement"] || [];
    const audience = payload.audience || payload.target_audience || payload["Target audience fit"] || "";

    const coerceList = (v) =>
      Array.isArray(v) ? v : typeof v === "string" ? v.split(/\n|\./).map(s => s.trim()).filter(Boolean) : [];

    return {
      engagement: isFinite(engagement) ? engagement : null,
      readability: isFinite(readability) ? readability : null,
      seo: isFinite(seo) ? seo : null,
      social: isFinite(social) ? social : null,
      strengths: coerceList(strengths),
      improvements: coerceList(improvements),
      audience: typeof audience === "string" ? audience : JSON.stringify(audience),
    };
  }, [result]);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Content Performance Predictor</h1>
        <p className="text-gray-600 text-lg">
          Analyze structure, keywords, and timing; get optimization suggestions before publishing.
        </p>
      </div>

      <div className="space-y-4">
        <textarea
          className="w-full rounded-2xl border border-gray-300 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
          rows={6}
          placeholder="Paste draft content or outline..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />

        <div>
          <button
            onClick={onPredict}
            disabled={loading || !input.trim()}
            className="px-5 py-2 rounded-2xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md hover:shadow-lg"
          >
            {loading ? "Predicting…" : "Predict Performance"}
          </button>
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        {parsed && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Engagement" value={parsed.engagement} />
            <MetricCard label="Readability" value={parsed.readability} />
            <MetricCard label="SEO Potential" value={parsed.seo} />
            <MetricCard label="Social Sharing" value={parsed.social} />
          </div>
        )}

        {parsed && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ListCard title="Key Strengths" items={parsed.strengths} />
            <ListCard title="Areas for Improvement" items={parsed.improvements} />
          </div>
        )}

        {parsed && parsed.audience && (
          <div className="p-4 rounded-2xl border border-gray-200 bg-white shadow-sm text-sm">
            <div className="font-semibold mb-1">Target Audience Fit</div>
            <div className="text-gray-700">{parsed.audience}</div>
          </div>
        )}

        {result && (
          <details className="p-4 rounded-2xl border border-gray-200 bg-white shadow-sm text-sm">
            <summary className="cursor-pointer select-none font-medium">Raw prediction JSON</summary>
            <pre className="whitespace-pre-wrap break-words mt-2">{JSON.stringify(result, null, 2)}</pre>
          </details>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value }) {
  const display = value === null || value === undefined || Number.isNaN(value)
    ? "—"
    : Number(value).toFixed(1);
  const pctWidth = Math.max(0, Math.min(100, (Number(value) || 0) * 10));

  return (
    <div className="p-4 rounded-2xl border border-gray-200 bg-white shadow hover:shadow-lg transition-shadow">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className="text-2xl font-bold mb-2">{display}</div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-2 bg-blue-600 rounded-full transition-all duration-500"
          style={{ width: `${pctWidth}%` }}
        />
      </div>
    </div>
  );
}

function ListCard({ title, items }) {
  return (
    <div className="p-4 rounded-2xl border border-gray-200 bg-white shadow hover:shadow-lg transition-shadow">
      <div className="font-semibold mb-2">{title}</div>
      {items?.length ? (
        <ul className="list-disc ml-5 space-y-1 text-sm text-gray-700">
          {items.map((it, idx) => (
            <li key={`${title}-${idx}`}>
              {typeof it === "string" ? it : JSON.stringify(it)}
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-gray-500 text-sm">No items</div>
      )}
    </div>
  );
}
