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
      payload.engagement ||
        payload.engagement_score ||
        payload.engagementScore ||
        payload["Engagement score"]
    );
    const readability = Number(
      payload.readability ||
        payload.readability_score ||
        payload.readabilityScore ||
        payload["Readability score"]
    );
    const seo = Number(
      payload.seo ||
        payload.seo_potential ||
        payload.seoPotential ||
        payload["SEO potential"]
    );
    const social = Number(
      payload.social ||
        payload.social_sharing ||
        payload.socialSharing ||
        payload["Social sharing likelihood"]
    );

    const strengths =
      payload.strengths ||
      payload.key_strengths ||
      payload["Key strengths"] ||
      [];
    const improvements =
      payload.improvements ||
      payload.areas_for_improvement ||
      payload["Areas for improvement"] ||
      [];
    const audience =
      payload.audience ||
      payload.target_audience ||
      payload["Target audience fit"] ||
      "";

    const coerceList = (v) =>
      Array.isArray(v)
        ? v
        : typeof v === "string"
          ? v
              .split(/\n|\./)
              .map((s) => s.trim())
              .filter(Boolean)
          : [];

    return {
      engagement: isFinite(engagement) ? engagement : null,
      readability: isFinite(readability) ? readability : null,
      seo: isFinite(seo) ? seo : null,
      social: isFinite(social) ? social : null,
      strengths: coerceList(strengths),
      improvements: coerceList(improvements),
      audience:
        typeof audience === "string" ? audience : JSON.stringify(audience),
    };
  }, [result]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Content Performance Predictor</h1>
      <p className="text-gray-600 mb-4">
        Analyze structure, keywords, and timing; get optimization suggestions
        before publishing.
      </p>

      <div className="space-y-3">
        <textarea
          className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          rows={6}
          placeholder="Paste draft content or outline..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <div>
          <button
            onClick={onPredict}
            disabled={loading}
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Predicting…" : "Predict Performance"}
          </button>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        {parsed && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <MetricCard label="Engagement" value={parsed.engagement} />
            <MetricCard label="Readability" value={parsed.readability} />
            <MetricCard label="SEO Potential" value={parsed.seo} />
            <MetricCard label="Social Sharing" value={parsed.social} />
          </div>
        )}

        {parsed && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ListCard title="Key Strengths" items={parsed.strengths} />
            <ListCard
              title="Areas for Improvement"
              items={parsed.improvements}
            />
          </div>
        )}

        {parsed && parsed.audience && (
          <div className="p-4 rounded-xl border border-gray-200 bg-white text-sm">
            <div className="font-semibold mb-1">Target Audience Fit</div>
            <div className="text-gray-700">{parsed.audience}</div>
          </div>
        )}

        {result && (
          <details className="p-4 rounded-xl border border-gray-200 bg-white text-sm">
            <summary className="cursor-pointer select-none">
              Raw prediction JSON
            </summary>
            <pre className="whitespace-pre-wrap break-words mt-2">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value }) {
  const display =
    value === null || value === undefined || Number.isNaN(value)
      ? "—"
      : Number(value).toFixed(1);
  const pctWidth = Math.max(0, Math.min(100, (Number(value) || 0) * 10));
  return (
    <div className="p-4 rounded-xl border border-gray-200 bg-white">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-2xl font-semibold">{display}</div>
      <div className="h-2 bg-gray-200 rounded mt-2">
        <div
          className="h-2 bg-blue-600 rounded"
          style={{ width: `${pctWidth}%` }}
        />
      </div>
    </div>
  );
}

function ListCard({ title, items }) {
  return (
    <div className="p-4 rounded-xl border border-gray-200 bg-white">
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
        <div className="text-sm text-gray-500">No items</div>
      )}
    </div>
  );
}
