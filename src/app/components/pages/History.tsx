import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Edit, Trash2, Search, Download, Filter } from "lucide-react";
import { toast } from "sonner";
import { getAnnotations, deleteAnnotation, updateAnnotation, searchAnnotations, exportData } from "../../utils/api";

interface Annotation {
  id: string;
  subject: string;
  subjectType: string;
  relation: string;
  object: string;
  objectType: string;
  tweetText: string;
  createdAt: string;
}

export default function History() {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [relationFilter, setRelationFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Edit state
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editRelation, setEditRelation] = useState("");
  const [editObject, setEditObject] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    loadAnnotations();
  }, []);

  const loadAnnotations = async () => {
    setLoading(true);
    const { data, error } = await getAnnotations();
    
    if (error) {
      toast.error(`Failed to load annotations: ${error}`);
    } else if (data) {
      setAnnotations(data.annotations);
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    setLoading(true);
    const { data, error } = await searchAnnotations({
      q: searchQuery,
      relation: relationFilter !== "all" ? relationFilter : undefined,
    });
    
    if (error) {
      toast.error(`Search failed: ${error}`);
    } else if (data) {
      setAnnotations(data.annotations);
      toast.success(`Found ${data.annotations.length} results`);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await deleteAnnotation(deleteId);
    
    if (error) {
      toast.error(`Failed to delete annotation: ${error}`);
    } else {
      setAnnotations(annotations.filter((a) => a.id !== deleteId));
      toast.success("Annotation deleted successfully");
    }
    setDeleteId(null);
  };

  // Edit handlers
  const openEditDialog = (annotation: Annotation) => {
    setEditingAnnotation(annotation);
    setEditSubject(annotation.subject);
    setEditRelation(
      annotation.relation === "Treats" ? "treats" :
      annotation.relation === "Causes" ? "causes" : "no_relation"
    );
    setEditObject(annotation.object);
  };

  const handleEditSave = async () => {
    if (!editingAnnotation) return;
    if (!editSubject.trim() || !editObject.trim()) {
      toast.error("Subject and object are required");
      return;
    }

    setEditSaving(true);
    const mappedRelation = editRelation === "treats" ? "Treats" :
      editRelation === "causes" ? "Causes" : "No Relation";

    const { error } = await updateAnnotation(editingAnnotation.id, {
      subject: editSubject.trim(),
      relation: mappedRelation,
      object: editObject.trim(),
    });

    setEditSaving(false);

    if (error) {
      toast.error(`Failed to update annotation: ${error}`);
    } else {
      // Update local state
      setAnnotations(prev => prev.map(a => 
        a.id === editingAnnotation.id
          ? { ...a, subject: editSubject.trim(), relation: mappedRelation, object: editObject.trim() }
          : a
      ));
      toast.success("Annotation updated successfully");
      setEditingAnnotation(null);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    const { error } = await exportData(format);
    
    if (error) {
      toast.error(`Export failed: ${error}`);
    } else {
      toast.success(`Exported ${annotations.length} annotations as ${format.toUpperCase()}`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h2 className="text-3xl font-semibold text-gray-900">Annotation History</h2>
        <p className="text-gray-600 mt-1">View and manage all your drug-disease annotations</p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search by drug, disease, or tweet text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full"
              />
            </div>
            <div className="w-full md:w-48">
              <Select value={relationFilter} onValueChange={setRelationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by relation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Relations</SelectItem>
                  <SelectItem value="Treats">Treats</SelectItem>
                  <SelectItem value="Causes">Causes</SelectItem>
                  <SelectItem value="No Relation">No Relation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSearch} className="bg-blue-500 hover:bg-blue-600">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
            <Button onClick={loadAnnotations} variant="outline">
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export Buttons */}
      <div className="flex gap-3">
        <Button onClick={() => handleExport('json')} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export JSON
        </Button>
        <Button onClick={() => handleExport('csv')} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Annotations Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Annotations ({annotations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : annotations.length === 0 ? (
            <div className="text-center py-16">
              <Filter className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No annotations found</h3>
              <p className="text-gray-500">Create some annotations to see them here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Drug</TableHead>
                    <TableHead>Relation</TableHead>
                    <TableHead>Disease</TableHead>
                    <TableHead>Tweet</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {annotations.map((annotation) => (
                    <TableRow key={annotation.id}>
                      <TableCell>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          {annotation.subject}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          annotation.relation === "Treats"
                            ? "bg-blue-100 text-blue-700"
                            : annotation.relation === "Causes"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {annotation.relation}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                          {annotation.object}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="truncate text-sm text-gray-600">
                          {annotation.tweetText}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(annotation.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(annotation)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(annotation.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Annotation Dialog */}
      <Dialog open={editingAnnotation !== null} onOpenChange={() => setEditingAnnotation(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Annotation</DialogTitle>
            <DialogDescription>
              Modify the subject, relation, or object of this annotation.
            </DialogDescription>
          </DialogHeader>
          
          {editingAnnotation && (
            <div className="space-y-4 py-4">
              {/* Source tweet preview */}
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600 italic">
                "{editingAnnotation.tweetText}"
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-subject">Drug (Subject)</Label>
                <Input
                  id="edit-subject"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  placeholder="Enter drug name"
                />
              </div>

              <div className="space-y-2">
                <Label>Relation</Label>
                <RadioGroup value={editRelation} onValueChange={setEditRelation}>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="treats" id="edit-treats" />
                      <Label htmlFor="edit-treats" className="cursor-pointer text-blue-700 font-medium">
                        Treats
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="causes" id="edit-causes" />
                      <Label htmlFor="edit-causes" className="cursor-pointer text-orange-700 font-medium">
                        Causes
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no_relation" id="edit-no-relation" />
                      <Label htmlFor="edit-no-relation" className="cursor-pointer text-gray-700 font-medium">
                        No Relation
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-object">Disease (Object)</Label>
                <Input
                  id="edit-object"
                  value={editObject}
                  onChange={(e) => setEditObject(e.target.value)}
                  placeholder="Enter disease name"
                />
              </div>

              {/* Preview */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Label className="text-xs text-blue-700 mb-2 block">Preview</Label>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-medium">
                    {editSubject || "..."}
                  </span>
                  <span className="text-gray-500">→</span>
                  <span className={`text-sm font-medium ${
                    editRelation === "treats" ? "text-blue-700" :
                    editRelation === "causes" ? "text-orange-700" : "text-gray-700"
                  }`}>
                    {editRelation === "treats" ? "Treats" :
                     editRelation === "causes" ? "Causes" : "No Relation"}
                  </span>
                  <span className="text-gray-500">→</span>
                  <span className="px-3 py-1 bg-red-500 text-white rounded-full text-sm font-medium">
                    {editObject || "..."}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAnnotation(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={editSaving || !editSubject.trim() || !editObject.trim()}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {editSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Annotation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this annotation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
