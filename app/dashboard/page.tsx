'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { documentsAPI, statsAPI, authAPI, type Document, type UserStats, type User } from '@/lib/api';

import {
  BookOpen,
  MessageSquare,
  Upload,
  FileText, LogOut,
  Settings, Clock,
  BookOpenCheck,
  Brain,
  Sparkles,
  ChevronRight,
  Plus, Search,
  CreditCard,
  Trash2,
  AlertCircle
} from 'lucide-react';

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchDashboardData();
  }, [router]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Fetch user profile, documents, and stats in parallel
      const [userProfile, userDocuments, userStats] = await Promise.all([
        authAPI.getCurrentUser(),
        documentsAPI.getDocuments(),
        statsAPI.getUserStats()
      ]);

      setUser(userProfile);
      setDocuments(userDocuments);
      setStats(userStats);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        handleLogout();
      } else {
        setError('Failed to load dashboard data. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('tokenType');
    localStorage.removeItem('userId');
    router.push('/login');
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await documentsAPI.deleteDocument(documentId);
      // Refresh documents list
      const updatedDocuments = await documentsAPI.getDocuments();
      setDocuments(updatedDocuments);
      // Refresh stats
      const updatedStats = await statsAPI.getUserStats();
      setStats(updatedStats);
    } catch (err: any) {
      setError('Failed to delete document. Please try again.');
    }
  };

  const navigateToModule = (module: 'reader' | 'chat' | 'flashcard') => {
    if (module === 'reader') {
      router.push('/dashboard/pdf_Reader');
    } else if (module === 'chat') {
      router.push('/dashboard/chat_page');
    } else if (module === 'flashcard') {
      router.push('/dashboard/flashcards');
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase() || name.slice(0, 2).toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const uploadDate = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - uploadDate.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return formatDate(dateString);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">StudyMate AI</h1>
                <p className="text-sm text-gray-500">AI-Assisted Student Helper</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm">
                  {user ? getInitials(user.username) : 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.username || 'User'}! 👋
          </h2>
          <p className="text-gray-600">Here's what's happening with your document library today.</p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total Documents</p>
                    <p className="text-3xl font-bold">{stats.total_documents}</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-full">
                    <FileText className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Completed</p>
                    <p className="text-3xl font-bold">{stats.documents_by_status.completed}</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-full">
                    <BookOpenCheck className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-100 text-sm font-medium">Processing</p>
                    <p className="text-3xl font-bold">{stats.documents_by_status.processing}</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-full">
                    <Clock className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Chat Sessions</p>
                    <p className="text-3xl font-bold">{stats.total_chat_sessions}</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-full">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Module Selection */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Choose a Module</h3>

            {/* Note Taking Module */}
            <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-red-200 bg-gradient-to-r from-red-50 to-pink-50"
              onClick={() => navigateToModule('reader')}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-gradient-to-r from-red-500 to-pink-500 p-3 rounded-full group-hover:scale-110 transition-transform">
                      <BookOpenCheck className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">📖 Note Taking</h4>
                      <p className="text-gray-600 text-sm mb-3">
                        Take notes of your uploaded PDFs directly in the browser with annotation support
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <FileText className="h-3 w-3 mr-1" />
                          View PDFs
                        </span>
                        <span className="flex items-center">
                          <Plus className="h-3 w-3 mr-1" />
                          Add Notes
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-red-500 transition-colors" />
                </div>
              </CardContent>
            </Card>

            {/* PDF Chat Module */}
            <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50"
              onClick={() => navigateToModule('chat')}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-3 rounded-full group-hover:scale-110 transition-transform">
                      <Brain className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">💬 PDF Chat</h4>
                      <p className="text-gray-600 text-sm mb-3">
                        Chat with your PDFs using advanced AI technology
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          AI Chat
                        </span>
                        <span className="flex items-center">
                          <Upload className="h-3 w-3 mr-1" />
                          Upload PDFs
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </div>
              </CardContent>
            </Card>

            {/* PDF Flashcard Module */}
            <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50"
              onClick={() => navigateToModule('flashcard')}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-3 rounded-full group-hover:scale-110 transition-transform">
                      <CreditCard className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">🎴 AI Flashcards</h4>
                      <p className="text-gray-600 text-sm mb-3">
                        Generate smart flashcards from your PDF content using AI
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Brain className="h-3 w-3 mr-1" />
                          AI Generated
                        </span>
                        <span className="flex items-center">
                          <CreditCard className="h-3 w-3 mr-1" />
                          Study Cards
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Documents */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Recent Documents</h3>
              <Button variant="outline" size="sm" onClick={() => navigateToModule('chat')}>
                <Upload className="h-4 w-4 mr-2" />
                Upload New
              </Button>
            </div>

            <Card className="bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                {documents.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="bg-gray-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <FileText className="h-8 w-8 text-gray-400" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h4>
                    <p className="text-gray-600 mb-4">Upload your first PDF to get started with AI-powered analysis</p>
                    <Button onClick={() => navigateToModule('chat')} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Your First PDF
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {documents.slice(0, 5).map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="bg-red-100 p-2 rounded">
                            <FileText className="h-4 w-4 text-red-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">
                              {doc.original_filename}
                            </p>
                            <div className="flex items-center space-x-3 text-xs text-gray-500">
                              <span className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {getTimeAgo(doc.created_at)}
                              </span>
                              <span>{formatFileSize(doc.file_size)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className={`text-xs ${getStatusColor(doc.embedding_status)}`}>
                            {doc.embedding_status}
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {documents.length > 5 && (
                      <div className="text-center pt-4">
                        <Button variant="ghost" size="sm" onClick={() => navigateToModule('reader')}>
                          View All {documents.length} Documents
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <Card className="mt-8 bg-gradient-to-r from-gray-50 to-gray-100 border-0">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Sparkles className="h-5 w-5 mr-2 text-purple-600" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Get started with these common tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center space-y-2 hover:shadow-md transition-shadow"
                onClick={() => navigateToModule('chat')}
              >
                <Upload className="h-6 w-6 text-blue-600" />
                <span className="font-medium">Upload & Chat</span>
                <span className="text-xs text-gray-500 text-center">Upload new PDFs and start chatting</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center space-y-2 hover:shadow-md transition-shadow"
                onClick={() => navigateToModule('reader')}
              >
                <BookOpen className="h-6 w-6 text-green-600" />
                <span className="font-medium">Read & Annotate</span>
                <span className="text-xs text-gray-500 text-center">Open PDFs for reading and note-taking</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center space-y-2 hover:shadow-md transition-shadow"
                onClick={() => navigateToModule('flashcard')}
              >
                <CreditCard className="h-6 w-6 text-purple-600" />
                <span className="font-medium">Generate Flashcards</span>
                <span className="text-xs text-gray-500 text-center">Create study cards from your PDFs</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center space-y-2 hover:shadow-md transition-shadow"
                onClick={() => navigateToModule('reader')}
              >
                <Search className="h-6 w-6 text-indigo-600" />
                <span className="font-medium">Search Library</span>
                <span className="text-xs text-gray-500 text-center">Find specific PDFs or content</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}