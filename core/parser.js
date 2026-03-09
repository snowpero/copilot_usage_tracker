/**
 * core/parser.js
 * 웹 버전과 동일한 파싱 로직
 */

export const MODEL_META = {
  'GPT-5':            { label: 'GPT-5',           color: '#10a37f' },
  'GPT-5-mini':       { label: 'GPT-5 mini',      color: '#74aa9c' },
  'GPT-4.1':          { label: 'GPT-4.1',         color: '#1a7f5e' },
  'GPT-4o':           { label: 'GPT-4o',          color: '#0ea5e9' },
  'claude-opus':      { label: 'Claude Opus',     color: '#d97757' },
  'claude-sonnet':    { label: 'Claude Sonnet',   color: '#e8a87c' },
  'claude-haiku':     { label: 'Claude Haiku',    color: '#f4c89a' },
  'gemini-2.0-flash': { label: 'Gemini 2.0 Flash',color: '#4285f4' },
  'gemini':           { label: 'Gemini',          color: '#4285f4' },
  'o3':               { label: 'o3',              color: '#8b5cf6' },
  'o4-mini':          { label: 'o4-mini',         color: '#a78bfa' },
};

function getModelMeta(rawName) {
  if (!rawName) return { label: 'Unknown', color: '#6b7280' };
  const lower = rawName.toLowerCase();
  const key = Object.keys(MODEL_META).find(k => lower.includes(k.toLowerCase()));
  return MODEL_META[key] ?? { label: rawName, color: '#6b7280' };
}

export function parseUsageData(raw) {
  if (!raw?.usageItems?.length) {
    return { totalRequests: 0, totalCost: 0, byModel: [], timePeriod: raw?.timePeriod };
  }
  const grouped = {};
  for (const item of raw.usageItems) {
    const key = item.model ?? item.sku ?? 'Unknown';
    if (!grouped[key]) {
      grouped[key] = {
        model: key,
        meta: getModelMeta(key),
        requests: 0,
        cost: 0,
        pricePerUnit: item.pricePerUnit ?? 0,
      };
    }
    grouped[key].requests += item.grossQuantity ?? 0;
    grouped[key].cost     += item.netAmount ?? 0;
  }
  const byModel = Object.values(grouped).sort((a, b) => b.requests - a.requests);
  return {
    totalRequests: byModel.reduce((s, m) => s + m.requests, 0),
    totalCost:     byModel.reduce((s, m) => s + m.cost, 0),
    byModel,
    timePeriod: raw.timePeriod,
  };
}

export const PLAN_ALLOWANCES = {
  free: 50, pro: 300, 'pro+': 1500, business: 300, enterprise: 1000,
};

export function getAllowance(plan = 'pro') {
  return PLAN_ALLOWANCES[plan?.toLowerCase()] ?? 300;
}
