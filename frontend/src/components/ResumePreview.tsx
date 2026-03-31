import React, { useState, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface ResumePreviewProps {
  url: string;
  skills: string[];
}

const ResumePreview: React.FC<ResumePreviewProps> = ({ url, skills }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [showHighlights, setShowHighlights] = useState<boolean>(true);

  // Normalize skills for matching
  const normalizedSkills = useMemo(() => {
    return skills.map(skill => skill.trim()).filter(skill => skill.length > 0);
  }, [skills]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  // Custom text renderer to inject highlight spans
  const makeTextRenderer = (item: { str: string }) => {
    if (!showHighlights || normalizedSkills.length === 0) {
      return item.str;
    }

    const text = item.str;
    let parts: (string | React.ReactNode)[] = [text];

    // Simple multi-skill highlight logic
    // We iterate over normalized skills and split the text parts by each
    normalizedSkills.forEach(skill => {
      const newParts: (string | React.ReactNode)[] = [];
      const regex = new RegExp(`(${escapeRegExp(skill)})`, 'gi');

      parts.forEach(part => {
        if (typeof part === 'string') {
          const split = part.split(regex);
          split.forEach((subPart, i) => {
            if (i % 2 === 1) { // Match group
              newParts.push(
                <span 
                  key={`${skill}-${i}-${Math.random()}`}
                  className="bg-yellow-300 text-slate-900 px-1 rounded shadow-sm border border-yellow-400 font-bold"
                >
                  {subPart}
                </span>
              );
            } else if (subPart) {
              newParts.push(subPart);
            }
          });
        } else {
          newParts.push(part);
        }
      });
      parts = newParts;
    });

    // In modern react-pdf, we can return React elements from customTextRenderer
    // as it renders within the text layer's text element.
    return (
      <>
        {parts.map((p, i) => <React.Fragment key={i}>{p}</React.Fragment>)}
      </>
    );
  };

  // Helper for regex safety
  function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-100 shadow-sm">
        <div className="flex items-center space-x-2">
           <button 
             onClick={() => setShowHighlights(!showHighlights)}
             className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
               showHighlights 
               ? 'bg-yellow-100 text-yellow-800 border-yellow-300 shadow-inner' 
               : 'bg-slate-50 text-slate-500 border-slate-200'
             }`}
           >
             {showHighlights ? '✨ Highlights ON' : 'Highlights OFF'}
           </button>
           
           <div className="h-4 w-px bg-slate-200 mx-2" />
           
           <div className="flex items-center space-x-2">
             <button 
               disabled={pageNumber <= 1}
               onClick={() => setPageNumber(pageNumber - 1)}
               className="p-1 rounded-md bg-slate-100 text-slate-600 disabled:opacity-30 hover:bg-slate-200 transition-colors"
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
             </button>
             <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
               Page {pageNumber} of {numPages}
             </span>
             <button 
               disabled={pageNumber >= numPages}
               onClick={() => setPageNumber(pageNumber + 1)}
               className="p-1 rounded-md bg-slate-100 text-slate-600 disabled:opacity-30 hover:bg-slate-200 transition-colors"
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
             </button>
           </div>
        </div>

        <div className="flex items-center space-x-2">
           <button onClick={() => setScale(s => Math.max(s - 0.1, 0.5))} className="p-1 rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path></svg>
           </button>
           <span className="text-xs font-bold text-slate-500 min-w-[40px] text-center">{Math.round(scale * 100)}%</span>
           <button onClick={() => setScale(s => Math.min(s + 0.1, 2.0))} className="p-1 rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
           </button>
        </div>
      </div>

      {/* PDF Scroller */}
      <div className="flex-1 overflow-auto bg-slate-100 p-6 flex flex-col items-center custom-scrollbar">
        <div className="bg-white rounded-lg shadow-2xl border border-slate-300 transition-all duration-300">
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-sm font-bold text-indigo-600 animate-pulse">Initializing PDF Vision Layer...</p>
              </div>
            }
            error={
              <div className="p-10 text-center">
                <p className="text-red-500 font-bold">Failed to load resume document.</p>
              </div>
            }
          >
            <Page 
              pageNumber={pageNumber} 
              scale={scale}
              customTextRenderer={makeTextRenderer as any}
              renderAnnotationLayer={true}
              renderTextLayer={true}
              className="transition-all duration-500 rounded font-sans"
            />
          </Document>
        </div>
      </div>
      
      {/* Scroll indicator if multi-page */}
      {numPages > 1 && (
        <div className="px-6 py-2 bg-slate-50 border-t border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
           Scroll up/down or use pages to navigate
        </div>
      )}
    </div>
  );
};

export default ResumePreview;
