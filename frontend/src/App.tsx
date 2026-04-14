import { useState, useRef, useCallback } from 'react'
import { resumeService } from './services/resumeService'
import Dashboard from './Dashboard'
import ResumePreview from './components/ResumePreview'

interface ExtractedCandidate {
  name?: string;
  email?: string;
  phone?: string;
  skills?: string[];
  experienceYears?: number;
  education?: string;
  currentJobTitle?: string;
  summary?: string;
  status?: string;
}

interface BatchItem {
  id: string;
  name: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
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
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Track whether a batch is actively running so tab switches don't reset it
  const batchRunningRef = useRef(false);

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

  const handleBatchFiles = async (files: File[]) => {
    const CONCURRENCY = 5;
    setMessage({ text: `Processing ${files.length} resumes (up to ${CONCURRENCY} at a time)...`, type: 'success' });
    const items: BatchItem[] = files.map(f => ({ id: Math.random().toString(), name: f.name, progress: 0, status: 'pending' }));
    setBatchItems(items);
    batchRunningRef.current = true;

    const uploadOne = async (file: File, itemId: string) => {
      setBatchItems(curr => curr.map(item => item.id === itemId ? { ...item, status: 'uploading', progress: 5 } : item));
      try {
        await resumeService.uploadFile(file, (evt) => {
          const pct = evt.total ? Math.min(90, Math.round((evt.loaded * 100) / evt.total)) : 10;
          setBatchItems(curr => curr.map(item => item.id === itemId ? { ...item, progress: pct } : item));
        });
        setBatchItems(curr => curr.map(item => item.id === itemId ? { ...item, status: 'success', progress: 100 } : item));
      } catch {
        setBatchItems(curr => curr.map(item => item.id === itemId ? { ...item, status: 'error', progress: 0 } : item));
      }
    };

    // Semaphore: keep exactly CONCURRENCY slots active at all times.
    // As soon as one finishes, the next pending file immediately fills the slot.
    let index = 0;
    const runNext = async (): Promise<void> => {
      const i = index++;
      if (i >= files.length) return;
      await uploadOne(files[i], items[i].id);
      await runNext(); // this slot is free — grab the next file immediately
    };

    // Seed the initial CONCURRENCY workers
    const workers = Array.from({ length: Math.min(CONCURRENCY, files.length) }, () => runNext());
    await Promise.allSettled(workers);

    batchRunningRef.current = false;
    setMessage({ text: `Batch complete! Go to the Dashboard to view all candidates.`, type: 'success' });
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsHovered(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsHovered(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHovered(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    if (files.length === 1) {
      handleFile(files[0]);
    } else if (files.length > 1) {
      handleBatchFiles(files);
    }
  };
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type === 'application/pdf');
    if (files.length === 1) {
      handleFile(files[0]);
    } else if (files.length > 1) {
      handleBatchFiles(files);
    }
    e.target.value = '';
  };

  const handleReset = useCallback(() => {
    // Don't reset if a batch or single upload is still in progress
    if (batchRunningRef.current || isLoading) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setUploadedFileName(null);
    setCandidate(null);
    setMessage(null);
    setProgress(0);
    setBatchItems([]);
  }, [isLoading, previewUrl]);

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-200 font-sans">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 w-full glass border-b border-white/[0.06] shadow-2xl shadow-black/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="font-bold text-lg tracking-tight grad-text">AI Resume Insight</span>
            </div>
            <div className="hidden sm:flex items-center gap-1 p-1 rounded-xl bg-white/[0.05] border border-white/[0.08]">
              <button onClick={() => { setActiveTab('upload'); if (!batchRunningRef.current && !isLoading) handleReset(); }}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'upload' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-white'}`}>
                Upload
              </button>
              <button onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-white'}`}>
                Dashboard
              </button>
              {(isLoading || batchRunningRef.current) && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 ml-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs font-medium text-amber-400">Processing…</span>
                </div>
              )}
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
          {!previewUrl && batchItems.length === 0 && (
            <div className="text-center mb-14 animate-fade-up">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                AI-Powered Resume Intelligence
              </div>
              <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-white mb-5 leading-tight">
                Hire smarter with{' '}
                <span className="grad-text">AI precision</span>
              </h1>
              <p className="max-w-xl text-lg text-slate-400 mx-auto leading-relaxed">
                Upload PDF resumes and get instant AI-extracted candidate profiles — skills, experience, education and more.
              </p>
            </div>
          )}

          {/* Toast */}
          {message && (
            <div className={`mb-8 px-5 py-3.5 rounded-2xl text-center text-sm font-semibold max-w-2xl mx-auto border animate-scale-in ${
              message.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              {message.text}
            </div>
          )}

          {/* ── Upload Zone ── */}
          {!previewUrl && batchItems.length === 0 && (
            <div className="flex justify-center mb-10 animate-fade-up delay-200">
              <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" multiple onChange={handleFileInputChange} />
              <div
                onClick={() => !isLoading && fileInputRef.current?.click()}
                onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                className={`relative w-full max-w-2xl p-16 rounded-3xl text-center flex flex-col items-center justify-center cursor-pointer overflow-hidden border-2 border-dashed transition-all duration-300 ${
                  isHovered ? 'border-indigo-500 bg-indigo-500/5 scale-[1.01]' : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                }`}
              >
                <div className={`absolute inset-0 rounded-3xl transition-opacity duration-300 pointer-events-none ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                  style={{ background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.1) 0%, transparent 70%)' }} />
                <div className={`relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300 ${isHovered ? 'bg-indigo-500/20 text-indigo-400 scale-110' : 'bg-white/[0.06] text-slate-400'}`}>
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <h3 className="relative z-10 text-xl font-bold text-white mb-2">Drop your resumes here</h3>
                <p className="relative z-10 text-sm text-slate-500 mb-8">Click to browse or drag &amp; drop · PDF only · Batch supported</p>
                <div className="relative z-10 flex items-center gap-6 text-xs text-slate-600">
                  {['AI Extraction', 'Batch Upload', 'Instant Preview'].map(f => (
                    <div key={f} className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Batch Processing View ── */}
          {batchItems.length > 0 && !previewUrl && (
            <div className="max-w-3xl mx-auto glass rounded-3xl border border-white/[0.08] p-8 animate-scale-in">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Processing {batchItems.length} Resumes</h2>
                  <div className="flex items-center gap-4 text-sm flex-wrap">
                    <span className="text-emerald-400 font-semibold">{batchItems.filter(b => b.status === 'success').length} done</span>
                    {batchItems.filter(b => b.status === 'uploading').length > 0 && (
                      <span className="text-indigo-400 font-semibold animate-pulse">{batchItems.filter(b => b.status === 'uploading').length} active</span>
                    )}
                    {batchItems.filter(b => b.status === 'error').length > 0 && (
                      <span className="text-red-400 font-semibold">{batchItems.filter(b => b.status === 'error').length} failed</span>
                    )}
                    <span className="text-slate-500">{batchItems.filter(b => b.status === 'pending').length} pending</span>
                  </div>
                </div>
                {batchItems.every(b => b.status === 'success' || b.status === 'error') && (
                  <button onClick={() => setActiveTab('dashboard')}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all hover:scale-105">
                    View Dashboard →
                  </button>
                )}
              </div>
              {/* Overall bar */}
              <div className="mb-6">
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span>Overall progress</span>
                  <span>{Math.round((batchItems.filter(b => b.status === 'success' || b.status === 'error').length / batchItems.length) * 100)}%</span>
                </div>
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${(batchItems.filter(b => b.status === 'success' || b.status === 'error').length / batchItems.length) * 100}%` }} />
                </div>
              </div>
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {batchItems.map((item, idx) => (
                  <div key={item.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${
                    item.status === 'success'   ? 'bg-emerald-500/5 border-emerald-500/15' :
                    item.status === 'error'     ? 'bg-red-500/5 border-red-500/15' :
                    item.status === 'uploading' ? 'bg-indigo-500/5 border-indigo-500/20' :
                    'bg-white/[0.02] border-white/[0.05]'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      item.status === 'success'   ? 'bg-emerald-500/20 text-emerald-400' :
                      item.status === 'error'     ? 'bg-red-500/20 text-red-400' :
                      item.status === 'uploading' ? 'bg-indigo-500/20 text-indigo-400' :
                      'bg-white/[0.06] text-slate-500'
                    }`}>
                      {item.status === 'success' ? '✓' : item.status === 'error' ? '✕' : idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-200 truncate mb-1.5">{item.name}</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${
                            item.status === 'error' ? 'bg-red-500' : item.status === 'success' ? 'bg-emerald-500' : 'bg-indigo-500'
                          }`} style={{ width: `${item.progress}%` }} />
                        </div>
                        <span className="text-xs text-slate-500 w-8 text-right">{item.progress}%</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg ${
                      item.status === 'success'   ? 'text-emerald-400 bg-emerald-500/10' :
                      item.status === 'error'     ? 'text-red-400 bg-red-500/10' :
                      item.status === 'uploading' ? 'text-indigo-400 bg-indigo-500/10 animate-pulse' :
                      'text-slate-500 bg-white/[0.04]'
                    }`}>{item.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Single upload progress bar ── */}
          {isLoading && previewUrl && (
            <div className="mb-6 max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-indigo-400 animate-pulse">⚡ AI extracting candidate data…</span>
                <span className="text-xs font-bold text-indigo-400">{progress}%</span>
              </div>
              <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* ── Split Layout ── */}
          {previewUrl && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-up">

              {/* LEFT: Candidate Details */}
              <div className="flex flex-col gap-4">
                {/* File bar */}
                <div className="flex items-center justify-between glass rounded-2xl px-4 py-3 border border-white/[0.08]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-red-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-200 truncate">{uploadedFileName}</p>
                      <p className="text-xs text-slate-500">PDF Document</p>
                    </div>
                  </div>
                  <button onClick={() => { handleReset(); fileInputRef.current?.click(); }}
                    className="ml-3 flex-shrink-0 text-xs font-semibold text-slate-400 hover:text-indigo-400 bg-white/[0.04] hover:bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-white/[0.08] hover:border-indigo-500/30 transition-all">
                    Upload New
                  </button>
                </div>

                {/* Candidate card */}
                <div className="glass rounded-3xl border border-white/[0.08] overflow-hidden flex-1">
                  <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Extracted Profile</span>
                  </div>

                  {isLoading ? (
                    <div className="p-6 space-y-5">
                      {[80, 60, 70, 50, 90].map((w, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <div className="w-9 h-9 skeleton rounded-xl flex-shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 skeleton rounded-full" style={{ width: `${w * 0.4}%` }} />
                            <div className="h-4 skeleton rounded-full" style={{ width: `${w}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : candidate ? (
                    <div className="p-6 space-y-4 animate-fade-up">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/25 flex-shrink-0">
                            {candidate.name ? candidate.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div>
                            <p className="text-lg font-bold text-white">{candidate.name || 'Unknown'}</p>
                            <p className="text-sm text-indigo-400 font-medium">{candidate.currentJobTitle || 'Candidate'}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{candidate.email || '—'}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full flex-shrink-0 ${
                          candidate.status === 'SUCCESS'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/15 text-red-400 border border-red-500/20'
                        }`}>{candidate.status || 'PARSED'}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/[0.06]">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Phone</p>
                          <p className="text-sm font-semibold text-slate-200">{candidate.phone || '—'}</p>
                        </div>
                        <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/[0.06]">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Experience</p>
                          <p className="text-sm font-semibold text-slate-200">{candidate.experienceYears != null ? `${candidate.experienceYears} yrs` : '—'}</p>
                        </div>
                      </div>

                      <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/[0.06]">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Education</p>
                        <p className="text-sm font-semibold text-slate-200">{candidate.education || 'Not specified'}</p>
                      </div>

                      {candidate.summary && (
                        <div className="bg-indigo-500/[0.06] rounded-2xl p-4 border border-indigo-500/15">
                          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">Summary</p>
                          <p className="text-sm text-slate-300 leading-relaxed italic">"{candidate.summary}"</p>
                        </div>
                      )}

                      <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/[0.06]">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Skills</p>
                        {candidate.skills && candidate.skills.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {candidate.skills.map((skill, idx) => (
                              <span key={idx}
                                className="px-2.5 py-1 bg-white/[0.05] text-slate-300 text-xs font-semibold rounded-lg border border-white/[0.08] hover:bg-indigo-500/10 hover:border-indigo-500/20 hover:text-indigo-300 transition-all cursor-default">
                                {skill}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 italic">No skills detected</p>
                        )}
                      </div>

                      <button onClick={() => { handleReset(); setTimeout(() => fileInputRef.current?.click(), 100); }}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-bold shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02]">
                        + Upload Another Resume
                      </button>
                    </div>
                  ) : (
                    <div className="p-10 text-center text-slate-500">
                      <p className="text-sm">AI extraction pending…</p>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: PDF Preview */}
              <div className="flex flex-col">
                <div className="glass rounded-3xl border border-white/[0.08] overflow-hidden flex-1 flex flex-col">
                  <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Resume Preview</span>
                    </div>
                    <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                      Full screen
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                  <div className="flex-1 min-h-[620px] bg-[#080c18] flex flex-col">
                    <ResumePreview url={previewUrl} skills={candidate?.skills || []} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Empty hint */}
          {!previewUrl && !isLoading && batchItems.length === 0 && (
            <div className="max-w-2xl mx-auto mt-2 text-center animate-fade-up delay-400">
              <p className="text-xs text-slate-600">Supports PDF · Single or batch · Up to 5 processed simultaneously</p>
            </div>
          )}

        </main>
      )}
    </div>
  )
}
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
                onClick={() => { setActiveTab('upload'); if (!batchRunningRef.current && !isLoading) handleReset(); }}
                className={`relative px-4 py-2 rounded-full text-sm font-semibold transition shadow-md hover:shadow-lg ${activeTab === 'upload' ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
              >
                Upload Resume
                {(isLoading || batchRunningRef.current) && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-pulse border-2 border-white" title="Processing in progress..." />
                )}
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
          {!previewUrl && batchItems.length === 0 && (
            <div className="flex justify-center mb-10">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf"
                multiple
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
                  Click or drag one or multiple PDF resumes here
                </h3>
                <p className="text-sm text-slate-500">Supports batch uploading (PDF only)</p>
              </div>
            </div>
          )}

          {/* ── Batch Upload View ── */}
          {batchItems.length > 0 && !previewUrl && (
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Batch Processing {batchItems.length} Resumes</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    <span className="text-emerald-600 font-semibold">{batchItems.filter(b => b.status === 'success').length} done</span>
                    {batchItems.filter(b => b.status === 'uploading').length > 0 && (
                      <span className="text-blue-500 font-semibold ml-3 animate-pulse">
                        {batchItems.filter(b => b.status === 'uploading').length} processing
                      </span>
                    )}
                    {batchItems.filter(b => b.status === 'error').length > 0 && (
                      <span className="text-red-500 font-semibold ml-3">{batchItems.filter(b => b.status === 'error').length} failed</span>
                    )}
                    <span className="text-slate-400 ml-3">{batchItems.filter(b => b.status === 'pending').length} pending</span>
                  </p>
                </div>
                 {batchItems.every(b => b.status === 'success' || b.status === 'error') && (
                    <button onClick={() => setActiveTab('dashboard')} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md transition-all">
                       View Dashboard
                    </button>
                 )}
              </div>
              <div className="space-y-4 max-h-[500px] overflow-y-auto px-2 custom-scrollbar">
                 {batchItems.map((item, idx) => (
                    <div key={item.id} className="flex items-center p-4 bg-slate-50 border border-slate-200 rounded-xl relative overflow-hidden">
                       <span className="w-8 h-8 flex-shrink-0 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center font-bold text-sm mr-4 z-10">{idx + 1}</span>
                       <div className="flex-1 min-w-0 z-10">
                          <p className="font-semibold text-slate-800 truncate">{item.name}</p>
                          <div className="mt-2 flex items-center space-x-3">
                             <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div className={`h-full transition-all duration-300 ${item.status === 'error' ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${item.progress}%` }}></div>
                             </div>
                             <span className="text-xs font-bold w-10 text-right text-slate-500">{item.progress}%</span>
                          </div>
                          <p className={`text-xs mt-1 font-semibold ${item.status === 'success' ? 'text-emerald-600' : item.status === 'error' ? 'text-red-500' : item.status === 'uploading' ? 'text-blue-500 animate-pulse' : 'text-slate-400'}`}>
                            {item.status.toUpperCase()}
                          </p>
                       </div>
                       
                       {/* Background color block for success/error indication */}
                       <div className={`absolute top-0 right-0 bottom-0 w-2 ${item.status === 'success' ? 'bg-emerald-500' : item.status === 'error' ? 'bg-red-500' : 'bg-transparent'}`}></div>
                    </div>
                 ))}
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
                            <p className="text-sm font-medium text-indigo-600">{candidate.currentJobTitle || 'Candidate'}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{candidate.email || 'No email found'}</p>
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
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col justify-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Phone</p>
                          <p className="text-sm font-semibold text-slate-700">{candidate.phone || '—'}</p>
                        </div>

                        {/* Experience */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col justify-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Experience</p>
                          <p className="text-sm font-semibold text-slate-700">
                            {candidate.experienceYears != null ? `${candidate.experienceYears} yrs` : '—'}
                          </p>
                        </div>
                      </div>

                      {/* Education */}
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Education</p>
                        <p className="text-sm font-semibold text-slate-700">{candidate.education || 'Not specified'}</p>
                      </div>

                      {/* Summary */}
                      {candidate.summary && (
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Professional Summary</p>
                          <p className="text-sm text-slate-600 leading-relaxed italic">"{candidate.summary}"</p>
                        </div>
                      )}

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
