import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Activity, TrendingUp, Database, CheckCircle, BarChart3, PieChart as PieIcon } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "../ui/button";
import { useEffect, useState } from "react";
import { getStats, getAnnotations, getGraphData } from "../../utils/api";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";

const RELATION_COLORS: Record<string, string> = {
  "Treats": "#3b82f6",
  "Causes": "#f97316",
  "No Relation": "#9ca3af",
};

const ENTITY_COLORS = ["#22c55e", "#ef4444", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899"];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalTweets: 0,
    annotatedTweets: 0,
    totalAnnotations: 0,
    uniqueDrugs: 0,
    uniqueDiseases: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentAnnotations, setRecentAnnotations] = useState<any[]>([]);
  const [relationDistribution, setRelationDistribution] = useState<any[]>([]);
  const [topEntities, setTopEntities] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
    loadRecentAnnotations();
    loadGraphData();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    const { data, error } = await getStats();
    if (data) {
      setStats(data);
    } else {
      console.error("Failed to load stats:", error);
    }
    setLoading(false);
  };

  const loadRecentAnnotations = async () => {
    const { data } = await getAnnotations();
    if (data && data.annotations) {
      const annotations = data.annotations;
      
      // Get last 5 annotations
      setRecentAnnotations(annotations.slice(-5).reverse());

      // Calculate relation distribution
      const relationCounts: Record<string, number> = {};
      annotations.forEach((a: any) => {
        const rel = a.relation || "Unknown";
        relationCounts[rel] = (relationCounts[rel] || 0) + 1;
      });
      setRelationDistribution(
        Object.entries(relationCounts).map(([name, value]) => ({ name, value }))
      );
    }
  };

  const loadGraphData = async () => {
    const { data } = await getGraphData();
    if (data && data.nodes) {
      // Get top 10 entities by frequency
      const sorted = [...data.nodes]
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 10)
        .map(node => ({
          name: node.label,
          frequency: node.frequency,
          type: node.type,
        }));
      setTopEntities(sorted);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return date.toLocaleDateString();
  };

  const statCards = [
    {
      title: "Total Tweets",
      value: loading ? "..." : stats.totalTweets,
      icon: Database,
      color: "bg-blue-500",
    },
    {
      title: "Annotated Tweets",
      value: loading ? "..." : stats.annotatedTweets,
      icon: CheckCircle,
      color: "bg-green-500",
    },
    {
      title: "Total Annotations",
      value: loading ? "..." : stats.totalAnnotations,
      icon: Activity,
      color: "bg-purple-500",
    },
    {
      title: "Unique Drugs",
      value: loading ? "..." : stats.uniqueDrugs,
      icon: TrendingUp,
      color: "bg-orange-500",
    },
    {
      title: "Unique Diseases",
      value: loading ? "..." : stats.uniqueDiseases,
      icon: TrendingUp,
      color: "bg-red-500",
    },
  ];

  // Progress percentage
  const annotationProgress = stats.totalTweets > 0
    ? Math.round((stats.annotatedTweets / stats.totalTweets) * 100)
    : 0;

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div>
        <h2 className="text-3xl font-semibold text-gray-900">Dashboard</h2>
        <p className="text-gray-600 mt-1">Overview of your drug-disease knowledge graph system</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm text-gray-600">{stat.title}</CardTitle>
                <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Annotation Progress */}
      {stats.totalTweets > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">Annotation Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${annotationProgress}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                {annotationProgress}% ({stats.annotatedTweets}/{stats.totalTweets})
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Relation Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieIcon className="w-5 h-5" />
              Relation Distribution
            </CardTitle>
            <CardDescription>Breakdown of annotation relationship types</CardDescription>
          </CardHeader>
          <CardContent>
            {relationDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={relationDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {relationDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={RELATION_COLORS[entry.name] || ENTITY_COLORS[index % ENTITY_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400">
                No annotation data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Entities Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Top Entities
            </CardTitle>
            <CardDescription>Most frequently mentioned drugs and diseases</CardDescription>
          </CardHeader>
          <CardContent>
            {topEntities.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topEntities} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [value, "Frequency"]}
                    labelFormatter={(label: string) => `Entity: ${label}`}
                  />
                  <Bar dataKey="frequency" radius={[0, 4, 4, 0]}>
                    {topEntities.map((entry, index) => (
                      <Cell
                        key={`bar-${index}`}
                        fill={entry.type === "drug" ? "#22c55e" : "#ef4444"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400">
                No entity data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started with common tasks</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => navigate('/data-collection')} className="bg-blue-500 hover:bg-blue-600">
            Collect New Data
          </Button>
          <Button onClick={() => navigate('/annotation')} variant="outline">
            Annotate Tweets
          </Button>
          <Button onClick={() => navigate('/knowledge-graph')} variant="outline">
            View Knowledge Graph
          </Button>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Annotations</CardTitle>
          <CardDescription>Latest relationships added to the knowledge graph</CardDescription>
        </CardHeader>
        <CardContent>
          {recentAnnotations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No annotations yet. Start annotating tweets to see them here.
            </div>
          ) : (
            <div className="space-y-3">
              {recentAnnotations.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      {item.subject}
                    </span>
                    <span className="text-gray-500">—</span>
                    <span className={`text-sm font-medium ${
                      item.relation === "Treats" ? "text-blue-600" :
                      item.relation === "Causes" ? "text-orange-600" : "text-gray-600"
                    }`}>
                      {item.relation}
                    </span>
                    <span className="text-gray-500">→</span>
                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                      {item.object}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">{formatDate(item.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}