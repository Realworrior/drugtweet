import { projectId, publicAnonKey } from '../../../utils/supabase/info';

const API_BASE_URL = projectId
  ? `https://${projectId}.supabase.co/functions/v1/make-server-439764b2`
  : '';

// ============ REQUEST TIMEOUT ============
// All Supabase calls will abort after this many ms
const REQUEST_TIMEOUT_MS = 5000;

function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

// ============ LOCAL STORAGE DB ============
// All data is stored locally first and read back instantly.
// Supabase writes happen fire-and-forget in the background.

const LS_TWEETS = 'drugkg_tweets';
const LS_ANNOTATIONS = 'drugkg_annotations';

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full — ignore
  }
}

// ============ FIRE-AND-FORGET SUPABASE SYNC ============
// We write to supabase in the background and don't block the UI.
async function syncToSupabase(endpoint: string, options: RequestInit) {
  if (!API_BASE_URL) return; // no cloud sync configured
  try {
    await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${publicAnonKey}`,
        ...(options.headers as Record<string, string>),
      },
    });
  } catch {
    // silently ignore — local data is the source of truth
  }
}

// ============ TWEETS API ============

export async function saveTweets(tweets: any[], keyword: string) {
  // Save locally first — instant
  const existing: any[] = lsGet(LS_TWEETS, []);
  const withKeyword = tweets.map((t) => ({
    ...t,
    keyword,
    collectedAt: new Date().toISOString(),
  }));
  // Deduplicate by id
  const ids = new Set(withKeyword.map((t) => t.id));
  const merged = [...existing.filter((t) => !ids.has(t.id)), ...withKeyword];
  lsSet(LS_TWEETS, merged);

  // Sync to Supabase in background
  syncToSupabase('/tweets', {
    method: 'POST',
    body: JSON.stringify({ tweets, keyword }),
  });

  return { data: { success: true, count: tweets.length } };
}

export async function getTweets(): Promise<{ data?: { tweets: any[] }; error?: string }> {
  const local: any[] = lsGet(LS_TWEETS, []);

  // Try Supabase with timeout
  if (!API_BASE_URL) return { data: { tweets: local } };
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/tweets`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${publicAnonKey}`,
      },
    });
    if (!response.ok) return { data: { tweets: local } };
    const data = await response.json();
    
    // Merge local and remote
    const remote = data.tweets || [];
    const mergedMap = new Map();
    local.forEach((t: any) => mergedMap.set(t.id, t));
    remote.forEach((t: any) => mergedMap.set(t.id, t));
    
    const merged = Array.from(mergedMap.values());
    if (merged.length > 0) lsSet(LS_TWEETS, merged);
    
    return { data: { tweets: merged } };
  } catch {
    return { data: { tweets: local } };
  }
}

// ============ ANNOTATIONS API ============

export async function saveAnnotation(annotation: any) {
  // Save locally first
  const existing: any[] = lsGet(LS_ANNOTATIONS, []);
  const withTs = { ...annotation, createdAt: annotation.createdAt || new Date().toISOString() };
  lsSet(LS_ANNOTATIONS, [...existing, withTs]);

  // Sync to Supabase in background
  syncToSupabase('/annotations', {
    method: 'POST',
    body: JSON.stringify(annotation),
  });

  return { data: { success: true } };
}

export async function getAnnotations(): Promise<{ data?: { annotations: any[] }; error?: string }> {
  const local: any[] = lsGet(LS_ANNOTATIONS, []);

  if (!API_BASE_URL) return { data: { annotations: local } };
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/annotations`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${publicAnonKey}`,
      },
    });
    if (!response.ok) return { data: { annotations: local } };
    const data = await response.json();
    
    // Merge local and remote
    const remote = data.annotations || [];
    const mergedMap = new Map();
    local.forEach((a: any) => mergedMap.set(a.id, a));
    remote.forEach((a: any) => mergedMap.set(a.id, a));
    
    const merged = Array.from(mergedMap.values());
    if (merged.length > 0) lsSet(LS_ANNOTATIONS, merged);
    
    return { data: { annotations: merged } };
  } catch {
    return { data: { annotations: local } };
  }
}

export async function updateAnnotation(id: string, updates: any) {
  // Update locally
  const existing: any[] = lsGet(LS_ANNOTATIONS, []);
  const updated = existing.map((a) =>
    a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
  );
  lsSet(LS_ANNOTATIONS, updated);

  // Sync to Supabase in background
  syncToSupabase(`/annotations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });

  return { data: { success: true } };
}

export async function deleteAnnotation(id: string) {
  // Delete locally
  const existing: any[] = lsGet(LS_ANNOTATIONS, []);
  lsSet(LS_ANNOTATIONS, existing.filter((a) => a.id !== id));

  // Sync to Supabase in background
  syncToSupabase(`/annotations/${id}`, { method: 'DELETE' });

  return { data: { success: true } };
}

// ============ STATISTICS API ============
// Computed locally from annotations — no network call needed.

export async function getStats() {
  const tweets: any[] = lsGet(LS_TWEETS, []);
  const annotations: any[] = lsGet(LS_ANNOTATIONS, []);

  const drugs = new Set<string>();
  const diseases = new Set<string>();
  const annotatedTweetIds = new Set<string>();

  annotations.forEach((a) => {
    annotatedTweetIds.add(a.tweetId);
    if (a.subjectType === 'Drug') drugs.add(a.subject);
    if (a.objectType === 'Disease') diseases.add(a.object);
    if (a.subjectType === 'Disease') diseases.add(a.subject);
    if (a.objectType === 'Drug') drugs.add(a.object);
  });

  return {
    data: {
      totalTweets: tweets.length,
      annotatedTweets: annotatedTweetIds.size,
      totalAnnotations: annotations.length,
      uniqueDrugs: drugs.size,
      uniqueDiseases: diseases.size,
    },
  };
}

// ============ KNOWLEDGE GRAPH API ============
// Computed locally from annotations — fully instant, no network call.

export async function getGraphData() {
  const annotations: any[] = lsGet(LS_ANNOTATIONS, []);

  const nodeMap = new Map<string, any>();
  const linkMap = new Map<string, any>();

  annotations.forEach((annotation) => {
    const subjectId = annotation.subject.toLowerCase().replace(/\s+/g, '_');
    const objectId = annotation.object.toLowerCase().replace(/\s+/g, '_');

    if (!nodeMap.has(annotation.subject)) {
      nodeMap.set(annotation.subject, {
        id: subjectId,
        label: annotation.subject,
        type: annotation.subjectType === 'Drug' ? 'drug' : 'disease',
        frequency: 0,
      });
    }
    nodeMap.get(annotation.subject).frequency++;

    if (!nodeMap.has(annotation.object)) {
      nodeMap.set(annotation.object, {
        id: objectId,
        label: annotation.object,
        type: annotation.objectType === 'Drug' ? 'drug' : 'disease',
        frequency: 0,
      });
    }
    nodeMap.get(annotation.object).frequency++;

    const relation = annotation.relation.toLowerCase().replace(/\s+/g, '_');
    const linkKey = `${subjectId}-${relation}-${objectId}`;
    if (!linkMap.has(linkKey)) {
      linkMap.set(linkKey, {
        source: subjectId,
        target: objectId,
        relation,
        count: 0,
      });
    }
    linkMap.get(linkKey).count++;
  });

  return {
    data: {
      nodes: Array.from(nodeMap.values()),
      links: Array.from(linkMap.values()),
    },
  };
}

// ============ SEARCH API ============
// Computed locally — instant.

export async function searchAnnotations(params: {
  q?: string;
  relation?: string;
  startDate?: string;
  endDate?: string;
}) {
  let annotations: any[] = lsGet(LS_ANNOTATIONS, []);
  const query = params.q?.toLowerCase() || '';

  if (query) {
    annotations = annotations.filter(
      (a) =>
        a.subject?.toLowerCase().includes(query) ||
        a.object?.toLowerCase().includes(query) ||
        a.tweetText?.toLowerCase().includes(query)
    );
  }

  if (params.relation && params.relation !== 'all') {
    annotations = annotations.filter((a) => a.relation === params.relation);
  }

  if (params.startDate) {
    annotations = annotations.filter(
      (a) => new Date(a.createdAt) >= new Date(params.startDate!)
    );
  }

  if (params.endDate) {
    annotations = annotations.filter(
      (a) => new Date(a.createdAt) <= new Date(params.endDate!)
    );
  }

  return { data: { annotations } };
}

// ============ EXPORT API ============

export async function exportData(format: 'json' | 'csv' = 'json') {
  const annotations: any[] = lsGet(LS_ANNOTATIONS, []);

  if (format === 'csv') {
    const headers = [
      'ID', 'Tweet ID', 'Subject', 'Subject Type',
      'Relation', 'Object', 'Object Type', 'Tweet Text', 'Created At',
    ];
    const rows = annotations.map((a) => [
      a.id, a.tweetId, a.subject, a.subjectType,
      a.relation, a.object, a.objectType,
      `"${(a.tweetText || '').replace(/"/g, '""')}"`,
      a.createdAt,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'annotations.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } else {
    const blob = new Blob([JSON.stringify(annotations, null, 2)], {
      type: 'application/json',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'annotations.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  return { data: { success: true } };
}
