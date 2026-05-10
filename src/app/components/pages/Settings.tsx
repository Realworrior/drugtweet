import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Separator } from "../ui/separator";
import { toast } from "sonner";
import { useState, useEffect } from "react";

interface AppSettings {
  twitterApiKey: string;
  nerApiKey: string;
  autoSave: boolean;
  autoHighlight: boolean;
  confidenceThreshold: number;
  showRelationLabels: boolean;
  enablePhysics: boolean;
  nodeSize: number;
  emailNotifications: boolean;
  browserNotifications: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  twitterApiKey: "",
  nerApiKey: "",
  autoSave: true,
  autoHighlight: true,
  confidenceThreshold: 80,
  showRelationLabels: true,
  enablePhysics: true,
  nodeSize: 30,
  emailNotifications: false,
  browserNotifications: true,
};

const SETTINGS_KEY = "drugdisease_app_settings";

export function getAppSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {
    // fallback
  }
  return DEFAULT_SETTINGS;
}

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const stored = getAppSettings();
    setSettings(stored);
  }, []);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      setHasChanges(false);
      toast.success("Settings saved successfully!");
    } catch {
      toast.error("Failed to save settings");
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    setHasChanges(false);
    toast.success("Settings reset to defaults");
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl">
      <div>
        <h2 className="text-3xl font-semibold text-gray-900">Settings</h2>
        <p className="text-gray-600 mt-1">Manage your application preferences</p>
      </div>

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>Configure external API connections for real data mode</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="twitter-api">Twitter/X API Key</Label>
            <Input
              id="twitter-api"
              type="password"
              placeholder="Enter your Twitter API key (optional for real data mode)"
              value={settings.twitterApiKey}
              onChange={(e) => updateSetting("twitterApiKey", e.target.value)}
            />
            <p className="text-xs text-gray-500">Required only when using Real Data mode in Data Collection</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ner-api">NER API Key (Optional)</Label>
            <Input
              id="ner-api"
              type="password"
              placeholder="Enter an external NER API key (optional)"
              value={settings.nerApiKey}
              onChange={(e) => updateSetting("nerApiKey", e.target.value)}
            />
            <p className="text-xs text-gray-500">For external BioBERT/NER API integration. Leave blank to use built-in dictionary NER.</p>
          </div>
        </CardContent>
      </Card>

      {/* Annotation Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Annotation Settings</CardTitle>
          <CardDescription>Customize annotation behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-save annotations</Label>
              <p className="text-sm text-gray-500">Automatically save annotations without confirmation</p>
            </div>
            <Switch
              checked={settings.autoSave}
              onCheckedChange={(checked) => updateSetting("autoSave", checked)}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Highlight entities automatically</Label>
              <p className="text-sm text-gray-500">Use NER to auto-highlight drugs and diseases</p>
            </div>
            <Switch
              checked={settings.autoHighlight}
              onCheckedChange={(checked) => updateSetting("autoHighlight", checked)}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="confidence">Minimum confidence threshold (%)</Label>
            <Input
              id="confidence"
              type="number"
              min="0"
              max="100"
              value={settings.confidenceThreshold}
              onChange={(e) => updateSetting("confidenceThreshold", Number(e.target.value))}
              className="w-32"
            />
            <p className="text-sm text-gray-500">Minimum confidence score for entity recognition (0-100)</p>
          </div>
        </CardContent>
      </Card>

      {/* Graph Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Graph Settings</CardTitle>
          <CardDescription>Configure graph visualization preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show relationship labels</Label>
              <p className="text-sm text-gray-500">Display labels on graph edges</p>
            </div>
            <Switch
              checked={settings.showRelationLabels}
              onCheckedChange={(checked) => updateSetting("showRelationLabels", checked)}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable physics simulation</Label>
              <p className="text-sm text-gray-500">Use force-directed layout for graph</p>
            </div>
            <Switch
              checked={settings.enablePhysics}
              onCheckedChange={(checked) => updateSetting("enablePhysics", checked)}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="node-size">Default node size</Label>
            <Input
              id="node-size"
              type="number"
              min="10"
              max="50"
              value={settings.nodeSize}
              onChange={(e) => updateSetting("nodeSize", Number(e.target.value))}
              className="w-32"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Manage notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email notifications</Label>
              <p className="text-sm text-gray-500">Receive email updates for new annotations</p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => updateSetting("emailNotifications", checked)}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Browser notifications</Label>
              <p className="text-sm text-gray-500">Show browser notifications for system events</p>
            </div>
            <Switch
              checked={settings.browserNotifications}
              onCheckedChange={(checked) => updateSetting("browserNotifications", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={handleReset}>Reset to Defaults</Button>
        <Button
          onClick={handleSave}
          className="bg-blue-500 hover:bg-blue-600"
          disabled={!hasChanges}
        >
          {hasChanges ? "Save Changes" : "Saved ✓"}
        </Button>
      </div>
    </div>
  );
}
