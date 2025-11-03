import React from 'react';
import { FileText, Globe, BookOpen } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <header className="w-full flex justify-between items-center p-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">AI</span>
          </div>
          <span className="font-semibold text-gray-800">Student Helper</span>
        </div>
        <div className="flex gap-3">
          <a 
            href="/login" 
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Sign In
          </a>
          <a 
            href="/login" 
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign Up
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center text-center px-6 py-16">
        {/* Hero Section */}
        <div className="max-w-4xl mb-16">
          <h1 className="text-5xl font-bold text-blue-600 mb-6 leading-tight">
            AI-Assisted Student Helper
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Revolutionize your study experience with our AI-powered tool. Chat with your PDFs, get instant answers, and streamline your learning process.
          </p>
          <a 
            href="/login" 
            className="bg-gray-800 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-gray-900 transition-colors"
          >
            Get Started
          </a>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl">
          {/* PDF Processing */}
          <div className="bg-blue-100 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-blue-200 rounded-xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-blue-800 mb-3">
              PDF Processing
            </h3>
            <p className="text-blue-700 text-sm leading-relaxed">
              Upload your PDF documents and extract text information for instant access and analysis.
            </p>
          </div>

          {/* AI-Powered Chat */}
          <div className="bg-green-100 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-green-200 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Globe className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-green-800 mb-3">
              AI-Powered Chat
            </h3>
            <p className="text-green-700 text-sm leading-relaxed">
              Engage in intelligent conversations with your uploaded documents using advanced AI technology.
            </p>
          </div>

          {/* Streamlined Learning */}
          <div className="bg-purple-100 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-purple-200 rounded-xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-purple-800 mb-3">
              Streamlined Learning
            </h3>
            <p className="text-purple-700 text-sm leading-relaxed">
              Simplify your study workflow and enhance your understanding of complex topics.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-gray-500 text-sm py-8">
        © 2024. All AI-Assisted Student Helper Rights. All rights reserved.
      </footer>
    </div>
  );
}