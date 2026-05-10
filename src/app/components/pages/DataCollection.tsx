import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Separator } from "../ui/separator";
import { Textarea } from "../ui/textarea";
import { Search, Loader2, MessageCircle, Upload, Database, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { saveTweets } from "../../utils/api";
import tweetsDataset from "../../../data/tweets_dataset.json";
import { containsDrug, containsDisease } from "../../../data/medical_dictionaries";
import { getAppSettings } from "./Settings";

type Tweet = {
  id: string;
  text: string;
  user?: string;
  timestamp?: string;
};

export default function DataCollection() {
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [useRealData, setUseRealData] = useState(false);
  const [realTweetsInput, setRealTweetsInput] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualTweet, setManualTweet] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Levenshtein distance for fuzzy matching (handles typos like "asprin" → "aspirin")
  const levenshtein = (a: string, b: string): number => {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
      Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++)
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    return dp[m][n];
  };

  // Search bundled dataset with fuzzy matching
  const searchBundledDataset = (query: string): Tweet[] => {
    const terms = query.toLowerCase().split(/[\s,+]+/).filter(Boolean);
    
    return (tweetsDataset as Tweet[]).filter(tweet => {
      const textLower = tweet.text.toLowerCase();
      const tweetWords = textLower.split(/\W+/).filter(Boolean);

      return terms.some(term => {
        // Exact substring match first
        if (textLower.includes(term)) return true;
        // Fuzzy match: check each word in the tweet against the search term
        // Allow edit distance ≤ 2 for words with 4+ characters
        if (term.length >= 4) {
          return tweetWords.some(word =>
            word.length >= 4 && levenshtein(term, word) <= 2
          );
        }
        return false;
      });
    });
  };

  // Parse real tweet data (from paste or file)
  const parseRealTweets = (input: string): Tweet[] => {
    const lines = input.split("\n").filter(l => l.trim());
    
    // Try JSON parse first
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any, i: number) => ({
          id: item.id || `real-${Date.now()}-${i}`,
          text: item.text || item.full_text || item.content || String(item),
          user: item.user?.screen_name || item.user || item.author || `@user${i}`,
          timestamp: item.created_at || item.timestamp || new Date().toISOString(),
        }));
      }
    } catch {
      // Not JSON — treat as line-separated tweets
    }

    // Line-separated text
    return lines.map((line, i) => ({
      id: `real-${Date.now()}-${i}`,
      text: line.trim(),
      user: `@imported_user`,
      timestamp: new Date().toISOString(),
    }));
  };

  const handleSearch = async () => {
    if (!keyword.trim()) {
      toast.error("Please enter a keyword");
      return;
    }

    setLoading(true);

    if (useRealData && realTweetsInput.trim()) {
      // Parse and filter real data input
      const allParsed = parseRealTweets(realTweetsInput);
      const terms = keyword.toLowerCase().split(/[\s,+]+/).filter(Boolean);
      const filtered = allParsed.filter(t => 
        terms.some(term => t.text.toLowerCase().includes(term))
      );
      
      setTweets(filtered.length > 0 ? filtered : allParsed);
      
      // Save to database
      const { error } = await saveTweets(filtered.length > 0 ? filtered : allParsed, keyword);
      setLoading(false);

      if (error) {
        toast.error(`Failed to save tweets: ${error}`);
      } else {
        toast.success(`Imported ${filtered.length > 0 ? filtered.length : allParsed.length} tweets for "${keyword}"`);
      }
    } else {
      // Try real Twitter API if configured
      const settings = getAppSettings();
      if (settings.twitterApiKey) {
        try {
          const response = await fetch(`https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(keyword)}&max_results=10`, {
            headers: { Authorization: `Bearer ${settings.twitterApiKey}` }
          });
          if (response.ok) {
            const json = await response.json();
            if (json.data && json.data.length > 0) {
              const liveTweets = json.data.map((t: any) => ({
                id: `live-${t.id}`,
                text: t.text,
                user: "@live_user",
                timestamp: new Date().toISOString()
              }));
              setTweets(liveTweets);
              await saveTweets(liveTweets, keyword);
              setLoading(false);
              toast.success(`Fetched ${liveTweets.length} live tweets from X API for "${keyword}"`);
              return;
            }
          } else {
            toast.warning("X API returned an error. Falling back to local dataset.");
          }
        } catch (err) {
          toast.warning("Network/CORS error with X API. Falling back to local dataset.");
        }
      }

      // Search bundled dataset fallback
      setTimeout(async () => {
        const results = searchBundledDataset(keyword);
        setTweets(results);

        const { error } = await saveTweets(results, keyword);
        setLoading(false);

        if (error) {
          toast.error(`Failed to save tweets: ${error}`);
        } else if (results.length === 0) {
          toast.info(`No tweets found for "${keyword}". Try common drug or disease names.`);
        } else {
          toast.success(`Found ${results.length} tweets for "${keyword}"`);
        }
      }, 800);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRealTweetsInput(content);
      toast.success(`Loaded ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    };
    reader.readAsText(file);
  };

  const handleAddManualTweet = () => {
    if (!manualTweet.trim()) return;
    
    const newTweet: Tweet = {
      id: `manual-${Date.now()}`,
      text: manualTweet.trim(),
      user: "@manual_entry",
      timestamp: new Date().toISOString(),
    };

    setTweets(prev => [newTweet, ...prev]);
    setManualTweet("");
    toast.success("Tweet added manually");
  };

  const handleRemoveTweet = (id: string) => {
    setTweets(prev => prev.filter(t => t.id !== id));
  };

  const handleSaveAll = async () => {
    if (tweets.length === 0) {
      toast.error("No tweets to save");
      return;
    }

    setLoading(true);
    const { error } = await saveTweets(tweets, keyword || "manual");
    setLoading(false);

    if (error) {
      toast.error(`Failed to save: ${error}`);
    } else {
      toast.success(`Saved ${tweets.length} tweets to database`);
    }
  };

  // Highlight drug/disease entities in tweet text
  const highlightEntities = (text: string) => {
    // Simple inline highlighting for preview
    let result = text;
    const entities: Array<{ text: string; type: string }> = [];

    // We'll just detect and mark, not use full NER here for performance
    const words = text.split(/\b/);
    return text; // Return plain text — highlighting is done in Annotation page
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h2 className="text-3xl font-semibold text-gray-900">Data Collection</h2>
        <p className="text-gray-600 mt-1">Fetch tweets containing drug and disease mentions</p>
      </div>

      {/* Data Source Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Data Source
          </CardTitle>
          <CardDescription>
            Choose between the bundled tweet dataset or import your own real data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium">
                {useRealData ? "Real Data Mode" : "Bundled Dataset Mode"}
              </Label>
              <p className="text-sm text-gray-500">
                {useRealData
                  ? "Import tweets from Twitter/X API export, CSV, or paste raw text"
                  : "Search through 210+ curated tweets with drug-disease mentions"
                }
              </p>
            </div>
            <Switch
              checked={useRealData}
              onCheckedChange={setUseRealData}
            />
          </div>

          {useRealData && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label>Import Tweet Data</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Upload File (JSON/CSV/TXT)
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.csv,.txt,.jsonl"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                <Textarea
                  placeholder={"Paste tweets here (one per line, or JSON array)...\n\nExample:\nAspirin helped my headache today\nMetformin side effects are rough\n\nOr paste a JSON array:\n[{\"text\": \"...\", \"user\": \"@handle\"}, ...]"}
                  value={realTweetsInput}
                  onChange={(e) => setRealTweetsInput(e.target.value)}
                  className="min-h-[120px] font-mono text-sm"
                />
                {realTweetsInput && (
                  <p className="text-xs text-green-600">
                    ✓ Data loaded ({realTweetsInput.split("\n").filter(l => l.trim()).length} lines)
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Enter Keywords
          </CardTitle>
          <CardDescription>
            {useRealData
              ? "Filter your imported data by keyword"
              : "Search the bundled dataset (e.g., 'Aspirin', 'diabetes', 'headache')"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="e.g., Aspirin + Headache"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button
              onClick={handleSearch}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 min-w-[140px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Fetching...
                </>
              ) : (
                "Fetch Tweets"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Manual Tweet Entry */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add Tweet Manually
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowManualInput(!showManualInput)}
            >
              {showManualInput ? "Hide" : "Show"}
            </Button>
          </div>
        </CardHeader>
        {showManualInput && (
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Type or paste a tweet text..."
                value={manualTweet}
                onChange={(e) => setManualTweet(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddManualTweet()}
                className="flex-1"
              />
              <Button
                onClick={handleAddManualTweet}
                disabled={!manualTweet.trim()}
                variant="outline"
              >
                Add
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Status */}
      {tweets.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-green-600">
            <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
            <span className="font-medium">
              Status: ✅ {tweets.length} Tweets Retrieved
            </span>
          </div>
          <Button
            onClick={handleSaveAll}
            disabled={loading}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Database className="w-4 h-4" />
            Save All to Database
          </Button>
        </div>
      )}

      {/* Tweets List */}
      {tweets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Tweets ({tweets.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {tweets.map((tweet) => (
                <div
                  key={tweet.id}
                  className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow group"
                >
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-gray-800 break-words whitespace-pre-wrap">{tweet.text}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 md:gap-3 text-xs text-gray-500">
                        <span>{tweet.user || `@user`}</span>
                        <span>•</span>
                        <span>
                          {tweet.timestamp
                            ? new Date(tweet.timestamp).toLocaleDateString()
                            : "Just now"}
                        </span>
                        {containsDrug(tweet.text) && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                            Drug mention
                          </span>
                        )}
                        {containsDisease(tweet.text) && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
                            Disease mention
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveTweet(tweet.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {tweets.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No tweets yet</h3>
            <p className="text-gray-500 mb-4">Enter keywords and click "Fetch Tweets" to get started</p>
            <p className="text-sm text-gray-400">
              {useRealData
                ? "Toggle off 'Real Data Mode' to search the bundled dataset"
                : `Bundled dataset contains 210+ tweets • Try: "Aspirin", "diabetes", "headache"`
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}