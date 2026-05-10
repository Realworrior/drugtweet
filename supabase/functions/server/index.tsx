import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-439764b2/health", (c) => {
  return c.json({ status: "ok" });
});

// ============ TWEETS ENDPOINTS ============

// Save collected tweets
app.post("/make-server-439764b2/tweets", async (c) => {
  try {
    const { tweets, keyword } = await c.req.json();
    
    if (!tweets || !Array.isArray(tweets)) {
      return c.json({ error: "Invalid tweets data" }, 400);
    }

    // Save each tweet with a unique key
    const timestamp = Date.now();
    for (let i = 0; i < tweets.length; i++) {
      const tweet = tweets[i];
      const key = `tweet:${timestamp}:${i}`;
      await kv.set(key, {
        ...tweet,
        keyword,
        collectedAt: new Date().toISOString(),
      });
    }

    console.log(`Successfully saved ${tweets.length} tweets with keyword: ${keyword}`);
    return c.json({ 
      success: true, 
      count: tweets.length,
      message: `Saved ${tweets.length} tweets` 
    });
  } catch (error) {
    console.error("Error saving tweets:", error);
    return c.json({ error: `Failed to save tweets: ${error.message}` }, 500);
  }
});

// Get all collected tweets
app.get("/make-server-439764b2/tweets", async (c) => {
  try {
    const tweets = await kv.getByPrefix("tweet:");
    console.log(`Retrieved ${tweets.length} tweets from database`);
    return c.json({ tweets });
  } catch (error) {
    console.error("Error fetching tweets:", error);
    return c.json({ error: `Failed to fetch tweets: ${error.message}` }, 500);
  }
});

// ============ ANNOTATIONS ENDPOINTS ============

// Save an annotation
app.post("/make-server-439764b2/annotations", async (c) => {
  try {
    const annotation = await c.req.json();
    
    if (!annotation.tweetId || !annotation.subject || !annotation.relation || !annotation.object) {
      return c.json({ error: "Missing required annotation fields" }, 400);
    }

    const key = `annotation:${annotation.id || Date.now()}`;
    await kv.set(key, {
      ...annotation,
      createdAt: new Date().toISOString(),
    });

    console.log(`Successfully saved annotation: ${key}`);
    return c.json({ success: true, message: "Annotation saved" });
  } catch (error) {
    console.error("Error saving annotation:", error);
    return c.json({ error: `Failed to save annotation: ${error.message}` }, 500);
  }
});

// Get all annotations
app.get("/make-server-439764b2/annotations", async (c) => {
  try {
    const annotations = await kv.getByPrefix("annotation:");
    console.log(`Retrieved ${annotations.length} annotations from database`);
    return c.json({ annotations });
  } catch (error) {
    console.error("Error fetching annotations:", error);
    return c.json({ error: `Failed to fetch annotations: ${error.message}` }, 500);
  }
});

// Delete an annotation
app.delete("/make-server-439764b2/annotations/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const key = `annotation:${id}`;
    
    await kv.del(key);
    console.log(`Deleted annotation: ${key}`);
    
    return c.json({ success: true, message: "Annotation deleted" });
  } catch (error) {
    console.error("Error deleting annotation:", error);
    return c.json({ error: `Failed to delete annotation: ${error.message}` }, 500);
  }
});

// Update an annotation
app.put("/make-server-439764b2/annotations/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    const key = `annotation:${id}`;
    
    // Get existing annotation
    const existing = await kv.get(key);
    if (!existing) {
      return c.json({ error: "Annotation not found" }, 404);
    }
    
    // Update annotation
    await kv.set(key, {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    
    console.log(`Updated annotation: ${key}`);
    return c.json({ success: true, message: "Annotation updated" });
  } catch (error) {
    console.error("Error updating annotation:", error);
    return c.json({ error: `Failed to update annotation: ${error.message}` }, 500);
  }
});

// ============ STATISTICS ENDPOINTS ============

// Get dashboard statistics
app.get("/make-server-439764b2/stats", async (c) => {
  try {
    const tweets = await kv.getByPrefix("tweet:");
    const annotations = await kv.getByPrefix("annotation:");
    
    // Calculate statistics
    const totalTweets = tweets.length;
    const totalAnnotations = annotations.length;
    
    // Count annotated tweets (unique tweet IDs in annotations)
    const annotatedTweetIds = new Set(annotations.map((a: any) => a.tweetId));
    const annotatedTweets = annotatedTweetIds.size;
    
    // Count entities
    const drugs = new Set();
    const diseases = new Set();
    
    annotations.forEach((annotation: any) => {
      if (annotation.subjectType === "Drug") drugs.add(annotation.subject);
      if (annotation.objectType === "Disease") diseases.add(annotation.object);
      if (annotation.subjectType === "Disease") diseases.add(annotation.subject);
      if (annotation.objectType === "Drug") drugs.add(annotation.object);
    });
    
    const stats = {
      totalTweets,
      annotatedTweets,
      totalAnnotations,
      uniqueDrugs: drugs.size,
      uniqueDiseases: diseases.size,
    };
    
    console.log("Generated statistics:", stats);
    return c.json(stats);
  } catch (error) {
    console.error("Error calculating stats:", error);
    return c.json({ error: `Failed to calculate stats: ${error.message}` }, 500);
  }
});

// ============ KNOWLEDGE GRAPH ENDPOINTS ============

// Get graph data (nodes and links)
app.get("/make-server-439764b2/graph", async (c) => {
  try {
    const annotations = await kv.getByPrefix("annotation:");
    
    // Build nodes and links from annotations
    const nodeMap = new Map();
    const linkMap = new Map();
    
    annotations.forEach((annotation: any) => {
      // Add subject node
      if (!nodeMap.has(annotation.subject)) {
        nodeMap.set(annotation.subject, {
          id: annotation.subject.toLowerCase().replace(/\s+/g, "_"),
          label: annotation.subject,
          type: annotation.subjectType === "Drug" ? "drug" : "disease",
          frequency: 0,
        });
      }
      nodeMap.get(annotation.subject).frequency++;
      
      // Add object node
      if (!nodeMap.has(annotation.object)) {
        nodeMap.set(annotation.object, {
          id: annotation.object.toLowerCase().replace(/\s+/g, "_"),
          label: annotation.object,
          type: annotation.objectType === "Drug" ? "drug" : "disease",
          frequency: 0,
        });
      }
      nodeMap.get(annotation.object).frequency++;
      
      // Add link
      const linkKey = `${annotation.subject}-${annotation.relation}-${annotation.object}`;
      if (!linkMap.has(linkKey)) {
        linkMap.set(linkKey, {
          source: annotation.subject.toLowerCase().replace(/\s+/g, "_"),
          target: annotation.object.toLowerCase().replace(/\s+/g, "_"),
          relation: annotation.relation.toLowerCase().replace(/\s+/g, "_"),
          count: 0,
        });
      }
      linkMap.get(linkKey).count++;
    });
    
    const nodes = Array.from(nodeMap.values());
    const links = Array.from(linkMap.values());
    
    console.log(`Generated graph with ${nodes.length} nodes and ${links.length} links`);
    return c.json({ nodes, links });
  } catch (error) {
    console.error("Error generating graph:", error);
    return c.json({ error: `Failed to generate graph: ${error.message}` }, 500);
  }
});

// ============ SEARCH ENDPOINTS ============

// Search annotations
app.get("/make-server-439764b2/search", async (c) => {
  try {
    const query = c.req.query("q")?.toLowerCase() || "";
    const relation = c.req.query("relation");
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");
    
    let annotations = await kv.getByPrefix("annotation:");
    
    // Apply filters
    if (query) {
      annotations = annotations.filter((a: any) => 
        a.subject?.toLowerCase().includes(query) ||
        a.object?.toLowerCase().includes(query) ||
        a.tweetText?.toLowerCase().includes(query)
      );
    }
    
    if (relation && relation !== "all") {
      annotations = annotations.filter((a: any) => a.relation === relation);
    }
    
    if (startDate) {
      annotations = annotations.filter((a: any) => 
        new Date(a.createdAt) >= new Date(startDate)
      );
    }
    
    if (endDate) {
      annotations = annotations.filter((a: any) => 
        new Date(a.createdAt) <= new Date(endDate)
      );
    }
    
    console.log(`Search returned ${annotations.length} results`);
    return c.json({ annotations });
  } catch (error) {
    console.error("Error searching annotations:", error);
    return c.json({ error: `Failed to search annotations: ${error.message}` }, 500);
  }
});

// Export data
app.get("/make-server-439764b2/export", async (c) => {
  try {
    const format = c.req.query("format") || "json";
    const annotations = await kv.getByPrefix("annotation:");
    
    if (format === "csv") {
      // Generate CSV
      const headers = ["ID", "Tweet ID", "Subject", "Subject Type", "Relation", "Object", "Object Type", "Tweet Text", "Created At"];
      const rows = annotations.map((a: any) => [
        a.id,
        a.tweetId,
        a.subject,
        a.subjectType,
        a.relation,
        a.object,
        a.objectType,
        `"${a.tweetText?.replace(/"/g, '""') || ""}"`,
        a.createdAt,
      ]);
      
      const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": 'attachment; filename="annotations.csv"',
        },
      });
    } else {
      // Return JSON
      return c.json({ annotations });
    }
  } catch (error) {
    console.error("Error exporting data:", error);
    return c.json({ error: `Failed to export data: ${error.message}` }, 500);
  }
});

Deno.serve(app.fetch);
