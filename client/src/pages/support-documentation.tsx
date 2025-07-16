import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  BookOpen, 
  FileText, 
  Video, 
  HelpCircle, 
  Plus,
  Search,
  Star,
  Clock,
  User,
  Eye,
  Bookmark,
  BookmarkIcon,
  Tag,
  Settings,
  Filter,
  Download,
  Play,
  ThumbsUp,
  ThumbsDown,
  Edit,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';

interface SupportDocument {
  id: number;
  title: string;
  slug: string;
  content: string;
  category: string;
  subcategory?: string;
  tags: string[];
  isPublished: boolean;
  authorId: string;
  viewCount: number;
  lastViewedAt?: string;
  createdAt: string;
  updatedAt: string;
  fileUrl?: string;
  videoUrl?: string;
  duration?: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  searchKeywords: string[];
}

interface SupportCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

interface SupportFeedback {
  id: number;
  documentId: number;
  userId: string;
  rating: number;
  comment?: string;
  isHelpful: boolean;
  createdAt: string;
}

export default function SupportDocumentation() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [difficulty, setDifficulty] = useState<string>('all');
  const [createDocumentOpen, setCreateDocumentOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<SupportDocument | null>(null);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch support documents
  const { data: documents = [], isLoading: documentsLoading } = useQuery<SupportDocument[]>({
    queryKey: ['/api/support/documents', selectedCategory, searchQuery, difficulty],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (searchQuery) params.append('search', searchQuery);
      if (difficulty !== 'all') params.append('difficulty', difficulty);
      return await apiRequest(`/api/support/documents?${params.toString()}`);
    },
  });

  // Fetch support categories
  const { data: categories = [] } = useQuery<SupportCategory[]>({
    queryKey: ['/api/support/categories'],
  });

  // Fetch user bookmarks
  const { data: userBookmarks = [] } = useQuery<number[]>({
    queryKey: ['/api/support/bookmarks'],
    onSuccess: (data) => setBookmarks(data),
  });

  // Create document mutation
  const createDocumentMutation = useMutation({
    mutationFn: async (documentData: Partial<SupportDocument>) => {
      return await apiRequest('/api/support/documents', 'POST', documentData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Document created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/support/documents'] });
      setCreateDocumentOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create document",
        variant: "destructive",
      });
    },
  });

  // Toggle bookmark mutation
  const toggleBookmarkMutation = useMutation({
    mutationFn: async (documentId: number) => {
      const isBookmarked = bookmarks.includes(documentId);
      if (isBookmarked) {
        return await apiRequest(`/api/support/bookmarks/${documentId}`, 'DELETE');
      } else {
        return await apiRequest('/api/support/bookmarks', 'POST', { documentId });
      }
    },
    onSuccess: (_, documentId) => {
      const isBookmarked = bookmarks.includes(documentId);
      if (isBookmarked) {
        setBookmarks(prev => prev.filter(id => id !== documentId));
        toast({ title: "Bookmark removed" });
      } else {
        setBookmarks(prev => [...prev, documentId]);
        toast({ title: "Bookmark added" });
      }
    },
  });

  // Submit feedback mutation
  const submitFeedbackMutation = useMutation({
    mutationFn: async ({ documentId, rating, comment, isHelpful }: {
      documentId: number;
      rating: number;
      comment?: string;
      isHelpful: boolean;
    }) => {
      return await apiRequest('/api/support/feedback', 'POST', {
        documentId,
        rating,
        comment,
        isHelpful,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Thank you for your feedback!",
      });
    },
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'user_manual': return <BookOpen className="h-4 w-4" />;
      case 'admin_guide': return <Settings className="h-4 w-4" />;
      case 'troubleshooting': return <HelpCircle className="h-4 w-4" />;
      case 'video_tutorial': return <Video className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !searchQuery || 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.searchKeywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    const matchesDifficulty = difficulty === 'all' || doc.difficulty === difficulty;
    
    return matchesSearch && matchesCategory && matchesDifficulty && doc.isPublished;
  });

  if (documentsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-blue-600" />
            Support Documentation
          </h1>
          <p className="text-gray-600 mt-2">
            Find user manuals, admin guides, troubleshooting help, and video tutorials
          </p>
        </div>
        <Dialog open={createDocumentOpen} onOpenChange={setCreateDocumentOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Document</DialogTitle>
            </DialogHeader>
            <CreateDocumentForm 
              onSubmit={(data) => createDocumentMutation.mutate(data)}
              isLoading={createDocumentMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search documentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="user_manual">User Manual</SelectItem>
            <SelectItem value="admin_guide">Admin Guide</SelectItem>
            <SelectItem value="troubleshooting">Troubleshooting</SelectItem>
            <SelectItem value="video_tutorial">Video Tutorial</SelectItem>
          </SelectContent>
        </Select>
        <Select value={difficulty} onValueChange={setDifficulty}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Category Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { key: 'user_manual', name: 'User Manual', count: filteredDocuments.filter(d => d.category === 'user_manual').length },
          { key: 'admin_guide', name: 'Admin Guide', count: filteredDocuments.filter(d => d.category === 'admin_guide').length },
          { key: 'troubleshooting', name: 'Troubleshooting', count: filteredDocuments.filter(d => d.category === 'troubleshooting').length },
          { key: 'video_tutorial', name: 'Video Tutorial', count: filteredDocuments.filter(d => d.category === 'video_tutorial').length }
        ].map((category) => (
          <Card 
            key={category.key} 
            className={`cursor-pointer transition-colors ${selectedCategory === category.key ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setSelectedCategory(selectedCategory === category.key ? 'all' : category.key)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getCategoryIcon(category.key)}
                  <span className="font-medium">{category.name}</span>
                </div>
                <Badge variant="outline">{category.count}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDocuments.map((doc) => (
          <Card key={doc.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getCategoryIcon(doc.category)}
                  <Badge variant="outline" className={getDifficultyColor(doc.difficulty)}>
                    {doc.difficulty}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleBookmarkMutation.mutate(doc.id)}
                  disabled={toggleBookmarkMutation.isPending}
                >
                  {bookmarks.includes(doc.id) ? (
                    <BookmarkIcon className="h-4 w-4 text-blue-600 fill-current" />
                  ) : (
                    <Bookmark className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <CardTitle className="text-lg">{doc.title}</CardTitle>
              <CardDescription>
                {doc.content.substring(0, 120)}...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {doc.viewCount} views
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(doc.updatedAt), 'MMM d, yyyy')}
                </div>
              </div>
              
              {doc.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {doc.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {doc.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{doc.tags.length - 3} more
                    </Badge>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDocument(doc)}
                  className="flex-1"
                >
                  {doc.videoUrl ? (
                    <>
                      <Play className="h-3 w-3 mr-1" />
                      Watch
                    </>
                  ) : (
                    <>
                      <FileText className="h-3 w-3 mr-1" />
                      Read
                    </>
                  )}
                </Button>
                {doc.fileUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDocuments.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No documents found</h3>
          <p className="text-gray-500">
            Try adjusting your search criteria or create a new document.
          </p>
        </div>
      )}

      {/* Document View Dialog */}
      {selectedDocument && (
        <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getCategoryIcon(selectedDocument.category)}
                {selectedDocument.title}
              </DialogTitle>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Badge className={getDifficultyColor(selectedDocument.difficulty)}>
                  {selectedDocument.difficulty}
                </Badge>
                <span>•</span>
                <span>{selectedDocument.viewCount} views</span>
                <span>•</span>
                <span>Updated {format(new Date(selectedDocument.updatedAt), 'MMM d, yyyy')}</span>
              </div>
            </DialogHeader>
            
            <div className="space-y-4">
              {selectedDocument.videoUrl && (
                <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
                  <video controls className="w-full h-full rounded-lg">
                    <source src={selectedDocument.videoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              )}
              
              <div className="prose max-w-none">
                <div dangerouslySetInnerHTML={{ __html: selectedDocument.content }} />
              </div>
              
              {selectedDocument.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedDocument.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              
              <div className="flex items-center gap-4 pt-4 border-t">
                <span className="text-sm text-gray-500">Was this helpful?</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => submitFeedbackMutation.mutate({
                    documentId: selectedDocument.id,
                    rating: 5,
                    isHelpful: true
                  })}
                >
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  Yes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => submitFeedbackMutation.mutate({
                    documentId: selectedDocument.id,
                    rating: 2,
                    isHelpful: false
                  })}
                >
                  <ThumbsDown className="h-3 w-3 mr-1" />
                  No
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function CreateDocumentForm({ 
  onSubmit, 
  isLoading 
}: { 
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'user_manual',
    subcategory: '',
    tags: '',
    difficulty: 'beginner',
    videoUrl: '',
    fileUrl: '',
    searchKeywords: '',
    isPublished: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      searchKeywords: formData.searchKeywords.split(',').map(keyword => keyword.trim()).filter(Boolean),
      slug: formData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">Category</Label>
          <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user_manual">User Manual</SelectItem>
              <SelectItem value="admin_guide">Admin Guide</SelectItem>
              <SelectItem value="troubleshooting">Troubleshooting</SelectItem>
              <SelectItem value="video_tutorial">Video Tutorial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="difficulty">Difficulty</Label>
          <Select value={formData.difficulty} onValueChange={(value) => setFormData({ ...formData, difficulty: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          rows={8}
          required
        />
      </div>

      <div>
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input
          id="tags"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          placeholder="getting-started, payroll, setup"
        />
      </div>

      <div>
        <Label htmlFor="videoUrl">Video URL (optional)</Label>
        <Input
          id="videoUrl"
          value={formData.videoUrl}
          onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
          placeholder="https://example.com/video.mp4"
        />
      </div>

      <div>
        <Label htmlFor="fileUrl">File URL (optional)</Label>
        <Input
          id="fileUrl"
          value={formData.fileUrl}
          onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
          placeholder="https://example.com/document.pdf"
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Document'}
        </Button>
      </div>
    </form>
  );
}