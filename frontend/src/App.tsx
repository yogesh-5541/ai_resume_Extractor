import { useState, useRef } from 'react'
import { resumeService } from './services/resumeService'
import Dashboard from './Dashboard'

function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'dashboard'>('upload');
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    // Validate file type natively in React
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setMessage({ text: "Please upload a valid PDF, DOCX, or Image file.", type: 'error' });
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setMessage(null);
    setExtractedText(null);

    try {
      // Connect to the Axios API service we created
      const result = await resumeService.uploadFile(file, (progressEvent) => {
        const percentCompleted = progressEvent.total ? Math.round((progressEvent.loaded * 100) / progressEvent.total) : 0;
        setProgress(percentCompleted);
      });
      
      setMessage({ text: result.message || "File parsed successfully!", type: 'success' });
      setExtractedText(result.extractedText);
    } catch (error) {
      console.error(error);
      setMessage({ text: "Failed to upload file. Check if Spring Boot backend is running.", type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHovered(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHovered(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHovered(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
      // Reset input value so the same file could be selected again natively
      e.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-brand-500 selection:text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/70 border-b border-slate-200 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg flex items-center justify-center transform transition hover:scale-105">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600">
                AI Resume Insight
              </span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-6">
              <button 
                onClick={() => setActiveTab('dashboard')} 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Dashboard
              </button>
              <button 
                onClick={() => setActiveTab('upload')} 
                className={`px-4 py-2 rounded-full text-sm font-semibold transition shadow-md hover:shadow-lg ${activeTab === 'upload' ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
              >
                Upload Resume
              </button>
            </div>
          </div>
        </div>
      </nav>

      {activeTab === 'dashboard' ? (
        <Dashboard />
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16 animate-fade-in-up">
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl mb-6">
            Hire smarter with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">AI precision</span>
          </h1>
          <p className="mt-4 max-w-2xl text-xl text-slate-500 mx-auto">
            Upload resumes, let our AI parse the insights, and instantly extract raw data and candidate strengths natively!
          </p>
        </div>

        {/* Message Toast */}
        {message && (
          <div className={`mb-8 p-4 rounded-lg text-center font-semibold max-w-lg mx-auto shadow-sm animate-fade-in-up ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        {/* Upload Area Component */}
        <div className="flex justify-center mb-12 relative">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".pdf,.docx,.png,.jpg,.jpeg" 
            onChange={handleFileInputChange} 
          />
          <div 
            onClick={() => !isLoading && fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-full max-w-2xl p-12 border-2 border-dashed rounded-3xl text-center transition-all duration-300 ease-out flex flex-col items-center justify-center ${
              isLoading ? 'cursor-wait opacity-80 border-blue-400 bg-blue-50' : 
              isHovered ? 'cursor-pointer border-blue-500 bg-blue-50 shadow-xl scale-[1.02]' : 'cursor-pointer border-slate-300 bg-white shadow-md'
            }`}
          >
            {isLoading ? (
              <div className="w-full flex flex-col items-center animate-fade-in-up">
                <div className="w-full max-w-md bg-slate-200 rounded-full h-3 mb-4 overflow-hidden shadow-inner">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
                <p className="text-blue-600 font-semibold animate-pulse">Uploading and Parsing... {progress}%</p>
              </div>
            ) : (
              <>
                <div className={`p-4 rounded-full mb-4 transition-colors duration-300 ${isHovered ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-1">
                  Click to drop or drag your resume here
                </h3>
                <p className="text-sm text-slate-500">Supports PDF, DOCX, and Image (PNG/JPG)</p>
              </>
            )}
          </div>
        </div>

        {/* Extracted Text Result Container */}
        {extractedText && (
          <div className="max-w-4xl mx-auto mb-20 bg-white p-8 rounded-2xl shadow-lg border border-slate-100 animate-fade-in-up">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md text-sm mr-3 border border-blue-200 shadow-sm">Extracted Result</span>
              Raw Document Text
            </h3>
            <div className="bg-slate-50 p-6 rounded-xl text-slate-700 whitespace-pre-wrap text-sm border border-slate-200 max-h-96 overflow-y-auto font-mono custom-scrollbar shadow-inner mt-4">
              {extractedText}
            </div>
          </div>
        )}
      </main>
      )}
    </div>
  )
}

export default App
