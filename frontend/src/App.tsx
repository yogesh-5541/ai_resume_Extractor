import { useState, useRef } from 'react'
import { resumeService } from './services/resumeService'
import Dashboard from './Dashboard'
import ResumePreview from './components/ResumePreview'

interface ExtractedCandidate {
// ... existing interface ...
  name?: string;
  email?: string;
  phone?: string;
  skills?: string[];
  experienceYears?: number;
  status?: string;
}

function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'dashboard'>('upload');
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<ExtractedCandidate | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    // PDF only
    if (file.type !== 'application/pdf') {
      setMessage({ text: 'Only PDF files are supported for preview. Please upload a PDF.', type: 'error' });
      return;
    }

    // Immediately generate preview URL — no backend needed
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const newPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(newPreviewUrl);
    setUploadedFileName(file.name);

    setIsLoading(true);
    setProgress(0);
    setMessage(null);
    setCandidate(null);

    try {
      const result = await resumeService.uploadFile(file, (progressEvent) => {
        const pct = progressEvent.total
          ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
          : 0;
        setProgress(pct);
      });

      setMessage({ text: result.message || 'Resume parsed successfully!', type: 'success' });

      // Extract structured data from response
      if (result.structuredData) {
        setCandidate(result.structuredData);
      }
    } catch (error) {
      console.error(error);
      setMessage({ text: 'Upload failed. Ensure the Spring Boot backend is running.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsHovered(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsHovered(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHovered(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
      e.dataTransfer.clearData();
    }
  };
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
      e.target.value = '';
    }
  };

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setUploadedFileName(null);
    setCandidate(null);
    setMessage(null);
    setProgress(0);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/70 border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600">
                AI Resume Insight
              </span>
            </div>
            <div className="hidden sm:flex items-center space-x-4">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => { setActiveTab('upload'); handleReset(); }}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition shadow-md hover:shadow-lg ${activeTab === 'upload' ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
              >
                Upload Resume
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Content ── */}
      {activeTab === 'dashboard' ? (
        <Dashboard />
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
              Hire smarter with{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">
                AI precision
              </span>
            </h1>
            <p className="max-w-2xl text-lg text-slate-500 mx-auto">
              Upload a PDF resume, get an instant preview and AI-extracted candidate details side by side.
            </p>
          </div>

          {/* Toast */}
          {message && (
            <div className={`mb-8 p-4 rounded-xl text-center font-semibold max-w-2xl mx-auto border transition-all duration-300 ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {/* ── Upload Zone (shown only before a file is selected) ── */}
          {!previewUrl && (
            <div className="flex justify-center mb-10">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf"
                onChange={handleFileInputChange}
              />
              <div
                onClick={() => !isLoading && fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`w-full max-w-2xl p-14 border-2 border-dashed rounded-3xl text-center transition-all duration-300 flex flex-col items-center justify-center ${
                  isLoading
                    ? 'cursor-wait opacity-80 border-blue-400 bg-blue-50'
                    : isHovered
                    ? 'cursor-pointer border-blue-500 bg-blue-50 shadow-xl scale-[1.02]'
                    : 'cursor-pointer border-slate-300 bg-white shadow-md hover:shadow-lg hover:border-slate-400'
                }`}
              >
                <div className={`p-4 rounded-full mb-4 transition-colors ${isHovered ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-1">
                  Click or drag a PDF resume here
                </h3>
                <p className="text-sm text-slate-500">Only PDF files are supported</p>
              </div>
            </div>
          )}

          {/* ── Upload Progress (compact, shown after file chosen while loading) ── */}
          {isLoading && (
            <div className="mb-8 max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-blue-700 animate-pulse">
                  ⚙️ AI is extracting candidate data…
                </span>
                <span className="text-sm font-bold text-blue-600">{progress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* ── Split Layout: Details (left) + PDF Preview (right) ── */}
          {previewUrl && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 transition-all duration-500 animate-fade-in">

              {/* ── LEFT: Extracted Candidate Details ── */}
              <div className="flex flex-col gap-6">

                {/* File header + reset */}
                <div className="flex items-center justify-between bg-white rounded-2xl px-5 py-4 border border-slate-200 shadow-sm">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{uploadedFileName}</p>
                      <p className="text-xs text-slate-400">PDF Document</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { handleReset(); fileInputRef.current?.click(); }}
                    className="ml-4 flex-shrink-0 text-xs font-semibold text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-200 transition-all"
                  >
                    Upload New
                  </button>
                </div>

                {/* Candidate Card — skeleton while loading, data when done */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1">
                  <div className="px-6 py-5 border-b border-slate-100 flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                    <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest">
                      Extracted Candidate Details
                    </h2>
                  </div>

                  {isLoading ? (
                    /* Skeleton loader */
                    <div className="p-6 space-y-5 animate-pulse">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className="flex items-center space-x-4">
                          <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                            <div className="h-4 bg-slate-100 rounded w-2/3"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : candidate ? (
                    <div className="p-6 space-y-5">

                      {/* Status badge */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center text-indigo-600 font-extrabold text-xl border border-indigo-200">
                            {candidate.name ? candidate.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div>
                            <p className="text-lg font-bold text-slate-800">{candidate.name || 'Unknown'}</p>
                            <p className="text-sm text-slate-400">{candidate.email || 'No email found'}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 text-xs font-black uppercase tracking-widest rounded-full ${
                          candidate.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-red-100 text-red-700 border border-red-200'
                        }`}>
                          {candidate.status || 'PARSED'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Phone */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Phone</p>
                          <p className="text-sm font-semibold text-slate-700">{candidate.phone || '—'}</p>
                        </div>

                        {/* Experience */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Experience</p>
                          <p className="text-sm font-semibold text-slate-700">
                            {candidate.experienceYears != null ? `${candidate.experienceYears} yrs` : '—'}
                          </p>
                        </div>
                      </div>

                      {/* Skills */}
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Skills</p>
                        {candidate.skills && candidate.skills.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {candidate.skills.map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-white text-slate-700 text-xs font-bold rounded-lg border border-slate-200 shadow-sm hover:-translate-y-0.5 transition-transform"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400 italic">No skills detected</p>
                        )}
                      </div>

                      {/* Upload another button */}
                      <button
                        onClick={() => { handleReset(); setTimeout(() => fileInputRef.current?.click(), 100); }}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold shadow-md hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
                      >
                        + Upload Another Resume
                      </button>
                    </div>
                  ) : (
                    <div className="p-10 text-center text-slate-400">
                      <p className="text-sm">AI extraction pending…</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── RIGHT: PDF Preview ── */}
              <div className="flex flex-col">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
                  <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-red-400"></div>
                      <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Resume Preview</h2>
                    </div>
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      Open full screen
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>

                  <div className="flex-1 min-h-[620px] bg-slate-50 flex flex-col">
                    <ResumePreview 
                      url={previewUrl} 
                      skills={candidate?.skills || []} 
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ── Empty-state placeholder (before any upload) ── */}
          {!previewUrl && !isLoading && (
            <div className="max-w-2xl mx-auto mt-4 text-center">
              <div className="inline-flex items-center space-x-2 text-slate-400 bg-white border border-slate-200 px-5 py-3 rounded-full shadow-sm text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>Upload a PDF resume to see an instant preview here</span>
              </div>
            </div>
          )}

        </main>
      )}
    </div>
  )
}

export default App
