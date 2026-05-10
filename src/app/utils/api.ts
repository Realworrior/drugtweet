import { projectId, publicAnonKey } from '../../../utils/supabase/info';

const DB_URL = projectId
  ? `https://${projectId}.supabase.co/rest/v1/kv_store_439764b2`
  : '';

// ============ REQUEST TIMEOUT ============
const REQUEST_TIMEOUT_MS = 5000;

function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

// ============ LOCAL STORAGE DB ============
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
  } catch {}
}

// ============ SUPABASE DB SYNC ============
async function dbUpsert(records: {key: string, value: any}[]) {
  if (!DB_URL) return;
  try {
    await fetchWithTimeout(DB_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: publicAnonKey,
        Authorization: `Bearer ${publicAnonKey}`,
        Prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify(records)
    });
  } catch {}
}

async function dbGetPrefix(prefix: string) {
  if (!DB_URL) return [];
  try {
    const response = await fetchWithTimeout(`${DB_URL}?key=like.${prefix}*&select=value`, {
      headers: {
        apikey: publicAnonKey,
        Authorization: `Bearer ${publicAnonKey}`
      }
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.map((d: any) => d.value);
  } catch {
    return [];
  }
}

async function dbDelete(key: string) {
  if (!DB_URL) return;
  try {
    await fetchWithTimeout(`${DB_URL}?key=eq.${key}`, {
      method: 'DELETE',
      headers: {
        apikey: publicAnonKey,
        Authorization: `Bearer ${publicAnonKey}`
      }
    });
  } catch {}
}

// ============ TWEETS API ============

export async function saveTweets(tweets: any[], keyword: string) {
  const existing: any[] = lsGet(LS_TWEETS, []);
  const withKeyword = tweets.map((t) => ({
    ...t,
    keyword,
    collectedAt: new Date().toISOString(),
  }));
  
  const ids = new Set(withKeyword.map((t) => t.id));
  const merged = [...existing.filter((t) => !ids.has(t.id)), ...withKeyword];
  lsSet(LS_TWEETS, merged);

  // Sync to DB
  const timestamp = Date.now();
  const records = withKeyword.map((t, i) => ({
    key: `tweet:${timestamp}:${i}`,
    value: t
  }));
  dbUpsert(records);

  return { data: { success: true, count: tweets.length } };
}

export async function getTweets(): Promise<{ data?: { tweets: any[] }; error?: string }> {
  const local: any[] = lsGet(LS_TWEETS, []);
  
  if (!DB_URL) return { data: { tweets: local } };
  
  const remote = await dbGetPrefix('tweet:');
  const mergedMap = new Map();
  local.forEach((t: any) => mergedMap.set(t.id, t));
  remote.forEach((t: any) => mergedMap.set(t.id, t));
  
  const merged = Array.from(mergedMap.values());
  if (merged.length > 0) lsSet(LS_TWEETS, merged);
  
  return { data: { tweets: merged } };
}

// ============ ANNOTATIONS API ============

export async function saveAnnotation(annotation: any) {
  const existing: any[] = lsGet(LS_ANNOTATIONS, []);
  const withTs = { ...annotation, createdAt: annotation.createdAt || new Date().toISOString() };
  lsSet(LS_ANNOTATIONS, [...existing, withTs]);

  const id = annotation.id || Date.now().toString();
  dbUpsert([{ key: `annotation:${id}`, value: withTs }]);

  return { data: { success: true } };
}

export async function getAnnotations(): Promise<{ data?: { annotations: any[] }; error?: string }> {
  const local: any[] = lsGet(LS_ANNOTATIONS, []);

  if (!DB_URL) return { data: { annotations: local } };
  
  const remote = await dbGetPrefix('annotation:');
  const mergedMap = new Map();
  local.forEach((a: any) => mergedMap.set(a.id, a));
  remote.forEach((a: any) => mergedMap.set(a.id, a));
  
  const merged = Array.from(mergedMap.values());
  if (merged.length > 0) lsSet(LS_ANNOTATIONS, merged);
  
  return { data: { annotations: merged } };
}

export async function updateAnnotation(id: string, updates: any) {
  const existing: any[] = lsGet(LS_ANNOTATIONS, []);
  let fullAnnotation = null;
  const updated = existing.map((a) => {
    if (a.id === id) {
      fullAnnotation = { ...a, ...updates, updatedAt: new Date().toISOString() };
      return fullAnnotation;
    }
    return a;
  });
  lsSet(LS_ANNOTATIONS, updated);

  if (fullAnnotation) {
    dbUpsert([{ key: `annotation:${id}`, value: fullAnnotation }]);
  }

  return { data: { success: true } };
}

export async function deleteAnnotation(id: string) {
  const existing: any[] = lsGet(LS_ANNOTATIONS, []);
  lsSet(LS_ANNOTATIONS, existing.filter((a) => a.id !== id));

  dbDelete(`annotation:${id}`);

  return { data: { success: true } };
}

// ============ STATISTICS API ============

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
