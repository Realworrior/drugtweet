import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import { MessageCircle, ChevronRight, ChevronLeft, Sparkles, Save } from "lucide-react";
import { getTweets, saveAnnotation } from "../../utils/api";
import { extractEntities, getDrugCount, getDiseaseCount } from "../../../data/medical_dictionaries";
import type { DetectedEntity } from "../../../data/medical_dictionaries";
import { getAppSettings } from "./Settings";

export default function Annotation() {
  const [tweets, setTweets] = useState<any[]>([]);
  const [currentTweetIndex, setCurrentTweetIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedDrug, setSelectedDrug] = useState<string | null>(null);
  const [selectedDisease, setSelectedDisease] = useState<string | null>(null);
  const [relation, setRelation] = useState<string>("treats");
  const [entities, setEntities] = useState<DetectedEntity[]>([]);
  const [saving, setSaving] = useState(false);
  const [appSettings, setAppSettings] = useState(getAppSettings());
  const [nerWorker, setNerWorker] = useState<Worker | null>(null);
  const [nerModelLoading, setNerModelLoading] = useState(false);
  const [nerProgress, setNerProgress] = useState<any>(null);

  useEffect(() => {
    setAppSettings(getAppSettings());
  }, []);

  useEffect(() => {
    loadTweets();
    
    // Initialize WebWorker for Transformers.js
    const worker = new Worker(new URL('../../utils/nerWorker.ts', import.meta.url), {
      type: 'module'
    });
    
    worker.postMessage({ type: 'INIT' });
    setNerModelLoading(true);
    
    worker.addEventListener('message', (e) => {
      if (e.data.type === 'PROGRESS') {
        setNerProgress(e.data.data);
      } else if (e.data.type === 'INIT_COMPLETE') {
        setNerModelLoading(false);
      }
    });
    
    setNerWorker(worker);
    
    return () => {
      worker.terminate();
    };
  }, []);

  useEffect(() => {
    if (tweets.length > 0) {
      const processEntities = async () => {
        const text = tweets[currentTweetIndex].text;
        let detected: DetectedEntity[] = [];

        // 1. Try HF API if configured
        if (appSettings.nerApiKey) {
          try {
            const response = await fetch("https://api-inference.huggingface.co/models/d4data/biomedical-ner-all", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${appSettings.nerApiKey}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ inputs: text })
            });

            if (response.ok) {
              const result = await response.json();
              if (Array.isArray(result)) {
                detected = result
                  .filter((r: any) => ["Medication", "Sign_symptom", "Disease_disorder", "Diagnostic_procedure"].includes(r.entity_group))
                  .map((r: any) => ({
                    text: r.word.replace(/^##/, ''),
                    type: r.entity_group === "Medication" ? "drug" : "disease",
                    startIndex: r.start,
                    endIndex: r.end,
                    confidence: r.score || 0.99
                  }));
              }
            }
          } catch (err) {
            console.warn("NER API error", err);
          }
        }

        // 2. Fallback to Local Browser ML Model (Transformers.js)
        if (detected.length === 0 && nerWorker && !nerModelLoading) {
          try {
            detected = await new Promise((resolve) => {
              const listener = (e: MessageEvent) => {
                if (e.data.type === 'EXTRACTION_COMPLETE') {
                  nerWorker.removeEventListener('message', listener);
                  resolve(e.data.data);
                } else if (e.data.type === 'ERROR') {
                  nerWorker.removeEventListener('message', listener);
                  resolve([]);
                }
              };
              nerWorker.addEventListener('message', listener);
              nerWorker.postMessage({ type: 'EXTRACT', text });
            });
          } catch (err) {
            console.warn("Local NER Worker error", err);
          }
        }

        // 3. Final Fallback to local dictionary
        if (detected.length === 0) {
          detected = extractEntities(text);
        }

        detected = detected.filter(e => (e.confidence * 100) >= appSettings.confidenceThreshold);
        setEntities(detected);
        setSelectedDrug(null);
        setSelectedDisease(null);
      };
      
      processEntities();
    }
  }, [currentTweetIndex, tweets, appSettings.confidenceThreshold, appSettings.nerApiKey]);

  const loadTweets = async () => {
    setLoading(true);
    const { data, error } = await getTweets();
    
    if (error) {
      toast.error(`Failed to load tweets: ${error}`);
      setLoading(false);
      return;
    }

    if (data && data.tweets.length > 0) {
      setTweets(data.tweets);
      const detected = extractEntities(data.tweets[0].text);
      setEntities(detected);
    } else {
      toast.info("No tweets found. Please collect some data first.");
    }
    setLoading(false);
  };

  const handleSaveAnnotation = async () => {
    if (!selectedDrug || !selectedDisease) {
      toast.error("Please select both a drug and a disease");
      return;
    }

    setSaving(true);
    const currentTweet = tweets[currentTweetIndex];
    const annotation = {
      id: Date.now().toString(),
      tweetId: currentTweet.id,
      tweetText: currentTweet.text,
      subject: selectedDrug,
      subjectType: "Drug",
      relation: relation === "treats" ? "Treats" : relation === "causes" ? "Causes" : "No Relation",
      object: selectedDisease,
      objectType: "Disease",
    };

    const { error } = await saveAnnotation(annotation);
    setSaving(false);

    if (error) {
      toast.error(`Failed to save annotation: ${error}`);
    } else {
      toast.success("Annotation saved successfully! ✅");
      
      // Reset selections
      setSelectedDrug(null);
      setSelectedDisease(null);
      setRelation("treats");
      
      // Move to next tweet
      if (currentTweetIndex < tweets.length - 1) {
        setCurrentTweetIndex(currentTweetIndex + 1);
      }
    }
  };

  // Auto-Save Effect
  useEffect(() => {
    if (appSettings.autoSave && selectedDrug && selectedDisease && relation && !saving) {
      const timer = setTimeout(() => {
        handleSaveAnnotation();
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDrug, selectedDisease, relation, appSettings.autoSave]);

  const highlightText = () => {
    if (tweets.length === 0) return "";
    let text = tweets[currentTweetIndex].text;

    if (!appSettings.autoHighlight) return text;
    
    // Sort entities by position (reverse) to replace from end to start
    const sortedEntities = [...entities].sort((a, b) => b.startIndex - a.startIndex);
    
    sortedEntities.forEach((entity) => {
      const color = entity.type === "drug" 
        ? "bg-green-100 text-green-700 border-green-300" 
        : "bg-red-100 text-red-700 border-red-300";
      const isSelected = 
        (entity.type === "drug" && selectedDrug === entity.text) ||
        (entity.type === "disease" && selectedDisease === entity.text);
      const selectedStyle = isSelected ? "ring-2 ring-offset-1 ring-blue-500 shadow-md" : "";
      
      const before = text.substring(0, entity.startIndex);
      const after = text.substring(entity.endIndex);
      
      text = `${before}<span class="px-2 py-0.5 rounded-full border ${color} ${selectedStyle} cursor-pointer inline-block mx-0.5 text-sm font-medium transition-all hover:shadow-sm" data-entity="${entity.text}" data-type="${entity.type}">${entity.text}</span>${after}`;
    });
    
    return text;
  };

  const handleEntityClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const entityText = target.getAttribute("data-entity");
    const entityType = target.getAttribute("data-type");
    
    if (entityText && entityType) {
      if (entityType === "drug") {
        setSelectedDrug(entityText);
      } else if (entityType === "disease") {
        setSelectedDisease(entityText);
      }
    }
  };

  const goToNextTweet = () => {
    if (currentTweetIndex < tweets.length - 1) {
      setCurrentTweetIndex(currentTweetIndex + 1);
    }
  };

  const goToPreviousTweet = () => {
    if (currentTweetIndex > 0) {
      setCurrentTweetIndex(currentTweetIndex - 1);
    }
  };

  const drugEntities = entities.filter(e => e.type === "drug");
  const diseaseEntities = entities.filter(e => e.type === "disease");

  if (loading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tweets...</p>
        </div>
      </div>
    );
  }

  if (tweets.length === 0) {
    return (
      <div className="p-6 md:p-8">
        <div>
          <h2 className="text-3xl font-semibold text-gray-900">Annotation Interface</h2>
          <p className="text-gray-600 mt-1">Annotate relationships between drugs and diseases</p>
        </div>
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No tweets available</h3>
            <p className="text-gray-500">Please go to Data Collection to fetch some tweets first.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-semibold text-gray-900">Annotation Interface</h2>
          <p className="text-gray-600 mt-1">Annotate relationships between drugs and diseases</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">
            Tweet {currentTweetIndex + 1} of {tweets.length}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1 text-xs text-gray-400 mt-1">
            <Sparkles className="w-3 h-3" />
            {nerModelLoading 
              ? `Loading ML NER Model (${Math.round((nerProgress?.progress || 0))}%)`
              : `NER: ${getDrugCount()} dictionary drugs, ${getDiseaseCount()} diseases`}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-2">
        <Button
          onClick={goToPreviousTweet}
          disabled={currentTweetIndex === 0}
          variant="outline"
          size="sm"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </Button>
        <Button
          onClick={goToNextTweet}
          disabled={currentTweetIndex === tweets.length - 1}
          variant="outline"
          size="sm"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Tweet Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Tweet
          </CardTitle>
          <CardDescription>
            Click on highlighted entities to select them for annotation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p 
              className="text-lg leading-relaxed break-words whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: highlightText() }}
              onClick={handleEntityClick}
            />
          </div>
          <div className="mt-4 flex gap-2 text-sm">
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full border border-green-300">
              Drug ({drugEntities.length} found)
            </span>
            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full border border-red-300">
              Disease ({diseaseEntities.length} found)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Entity Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className={selectedDrug ? "border-green-300 shadow-sm" : ""}>
          <CardHeader>
            <CardTitle className="text-green-700">Select Drug Entity</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={selectedDrug || ""} onValueChange={setSelectedDrug}>
              <div className="space-y-2">
                {drugEntities.map((entity) => (
                  <div key={entity.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={entity.text} id={`drug-${entity.id}`} />
                    <Label htmlFor={`drug-${entity.id}`} className="cursor-pointer flex items-center gap-2">
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm border border-green-300">
                        {entity.text}
                      </span>
                      <span className="text-xs text-gray-400">
                        {Math.round(entity.confidence * 100)}%
                      </span>
                    </Label>
                  </div>
                ))}
                {drugEntities.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No drug entities detected in this tweet</p>
                )}
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <Card className={selectedDisease ? "border-red-300 shadow-sm" : ""}>
          <CardHeader>
            <CardTitle className="text-red-700">Select Disease Entity</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={selectedDisease || ""} onValueChange={setSelectedDisease}>
              <div className="space-y-2">
                {diseaseEntities.map((entity) => (
                  <div key={entity.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={entity.text} id={`disease-${entity.id}`} />
                    <Label htmlFor={`disease-${entity.id}`} className="cursor-pointer flex items-center gap-2">
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm border border-red-300">
                        {entity.text}
                      </span>
                      <span className="text-xs text-gray-400">
                        {Math.round(entity.confidence * 100)}%
                      </span>
                    </Label>
                  </div>
                ))}
                {diseaseEntities.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No disease entities detected in this tweet</p>
                )}
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      </div>

      {/* Relationship Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Relationship</CardTitle>
          <CardDescription>Define the relationship between the selected drug and disease</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={relation} onValueChange={setRelation}>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="treats" id="treats" />
                <Label htmlFor="treats" className="cursor-pointer">
                  <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50 text-sm px-3 py-1">
                    ✓ Treats
                  </Badge>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="causes" id="causes" />
                <Label htmlFor="causes" className="cursor-pointer">
                  <Badge variant="outline" className="text-orange-700 border-orange-300 bg-orange-50 text-sm px-3 py-1">
                    ⚠ Causes (Side Effect)
                  </Badge>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no_relation" id="no_relation" />
                <Label htmlFor="no_relation" className="cursor-pointer">
                  <Badge variant="outline" className="text-gray-700 border-gray-300 bg-gray-50 text-sm px-3 py-1">
                    ✗ No Relation
                  </Badge>
                </Label>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Preview and Save */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Annotation Preview</CardTitle>
          <CardDescription className="text-blue-700">
            Review the Subject → Relation → Object triplet before saving
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-lg mb-4 flex-wrap">
            {selectedDrug ? (
              <span className="px-4 py-2 bg-green-500 text-white rounded-full font-medium shadow-sm">
                {selectedDrug}
              </span>
            ) : (
              <span className="px-4 py-2 bg-gray-300 text-gray-600 rounded-full">
                Select Drug
              </span>
            )}
            <span className="text-gray-500">—</span>
            <span className={`font-medium ${
              relation === "treats" ? "text-blue-700" : 
              relation === "causes" ? "text-orange-700" : "text-gray-700"
            }`}>
              {relation === "treats" ? "Treats" : relation === "causes" ? "Causes (Side Effect)" : "No Relation"}
            </span>
            <span className="text-gray-500">→</span>
            {selectedDisease ? (
              <span className="px-4 py-2 bg-red-500 text-white rounded-full font-medium shadow-sm">
                {selectedDisease}
              </span>
            ) : (
              <span className="px-4 py-2 bg-gray-300 text-gray-600 rounded-full">
                Select Disease
              </span>
            )}
          </div>
          <Button
            onClick={handleSaveAnnotation}
            disabled={!selectedDrug || !selectedDisease || saving}
            className="bg-blue-500 hover:bg-blue-600 w-full md:w-auto gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Annotation"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
