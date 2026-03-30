import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CandidatesSection from './CandidatesSection';

interface JobDescription {
  id?: number;
  title: string;
  requiredSkills: string;
  minExperience: number;
  description: string;
}

interface RankedCandidate {
  candidateName: string;
  resumeId: number;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
}

interface Resume {
  id: number;
  applicantName: string;
  email: string;
  phone: string;
  skills: string;
  experienceYears: number;
  uploadedAt: string;
}

const API_BASE = 'http://localhost:8080/api/v1';

export default function Dashboard() {
  const [jobForm, setJobForm] = useState({
    title: '',
    requiredSkills: '',
    minExperience: 0,
    description: '',
  });
  
  const [isSubmittingJob, setIsSubmittingJob] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);
  
  const [rankedCandidates, setRankedCandidates] = useState<RankedCandidate[]>([]);
  const [isFetchingRankings, setIsFetchingRankings] = useState(false);
  
  const [allCandidates, setAllCandidates] = useState<Resume[]>([]);
  const [isFetchingCandidates, setIsFetchingCandidates] = useState(false);

  useEffect(() => {
    fetchAllCandidates();
  }, []);

  const fetchAllCandidates = async () => {
    setIsFetchingCandidates(true);
    try {
      const response = await axios.get(`${API_BASE}/resumes`);
      setAllCandidates(response.data);
    } catch (error) {
      console.error('Failed to fetch candidates', error);
    } finally {
      setIsFetchingCandidates(false);
    }
  };

  const handleJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingJob(true);
    setJobError(null);
    setRankedCandidates([]);

    try {
      // 1. Create Job
      const jobResponse = await axios.post<JobDescription>(`${API_BASE}/jobs`, jobForm);
      const createdJob = jobResponse.data;

      if (createdJob.id) {
        // 2. Fetch Ranking
        setIsFetchingRankings(true);
        const rankingResponse = await axios.get<RankedCandidate[]>(`${API_BASE}/candidates/rank/${createdJob.id}`);
        setRankedCandidates(rankingResponse.data);
      }
    } catch (error) {
      console.error(error);
      setJobError("Failed to create job or fetch rankings. Please try again.");
    } finally {
      setIsSubmittingJob(false);
      setIsFetchingRankings(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-up">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Job Form & Candidate List */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* Job Creation Form */}
          <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-100 transition hover:shadow-lg">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
              <svg className="w-6 h-6 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              Create New Job
            </h2>
            
            <form onSubmit={handleJobSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Job Title</label>
                <input 
                  required type="text" 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition" 
                  placeholder="e.g. Senior Frontend Engineer"
                  value={jobForm.title} onChange={e => setJobForm({...jobForm, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Required Skills</label>
                <input 
                  required type="text" 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition" 
                  placeholder="e.g. React, TypeScript, Tailwind"
                  value={jobForm.requiredSkills} onChange={e => setJobForm({...jobForm, requiredSkills: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Min Experience (Years)</label>
                <input 
                  required type="number" step="0.5" 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition" 
                  value={jobForm.minExperience} onChange={e => setJobForm({...jobForm, minExperience: parseFloat(e.target.value)})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition min-h-[100px]" 
                  placeholder="Briefly describe the role..."
                  value={jobForm.description} onChange={e => setJobForm({...jobForm, description: e.target.value})}
                ></textarea>
              </div>

              {jobError && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg font-medium border border-red-100">
                  {jobError}
                </div>
              )}

              <button 
                type="submit" 
                disabled={isSubmittingJob}
                className={`w-full py-3 rounded-lg text-white font-semibold transition shadow-md hover:shadow-lg flex justify-center items-center ${isSubmittingJob ? 'bg-indigo-400 cursor-wait' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'}`}
              >
                {isSubmittingJob ? (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : 'Create & Rank Candidates'}
              </button>
            </form>
          </div>

          {/* All Candidates List */}
          <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-100 transition hover:shadow-lg flex flex-col h-[500px]">
             <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
               All Uploaded Resumes
             </h2>
             <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar space-y-3">
                {isFetchingCandidates ? (
                  <div className="flex justify-center py-10"><svg className="animate-spin h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>
                ) : allCandidates.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">No candidates uploaded yet.</p>
                ) : (
                  allCandidates.map(c => (
                    <div key={c.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition cursor-default">
                      <div className="font-semibold text-slate-800">{c.applicantName || 'Unnamed'}</div>
                      <div className="text-xs text-slate-500 flex justify-between mt-1">
                        <span>{c.experienceYears} Yrs Exp</span>
                        <span className="truncate ml-2 text-right">{c.email}</span>
                      </div>
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Ranked Candidates */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-md border border-slate-100 min-h-[820px] transition hover:shadow-lg">
             <div className="flex justify-between items-end mb-6 border-b border-slate-100 pb-4">
                <h2 className="text-2xl font-extrabold text-slate-800 flex items-center">
                  <svg className="w-7 h-7 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  Ranked Match Results
                </h2>
                {rankedCandidates.length > 0 && (
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                    {rankedCandidates.length} Candidates Found
                  </span>
                )}
             </div>

             {isFetchingRankings ? (
               <div className="h-full flex flex-col items-center justify-center py-32 space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-indigo-200 border-dashed rounded-full animate-spin"></div>
                    <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                  </div>
                  <p className="text-indigo-600 font-semibold animate-pulse">Running AI Ranking Algorithm...</p>
               </div>
             ) : rankedCandidates.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center py-32 text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                    <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                  </div>
                  <h3 className="text-lg font-medium text-slate-600 max-w-sm">Create a job description on the left to see ranked candidates here.</h3>
               </div>
             ) : (
               <div className="space-y-6">
                 {rankedCandidates.map((candidate, idx) => (
                   <div key={candidate.resumeId} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                      
                      {/* Top Rank Badge */}
                      {idx === 0 && (
                        <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-bl-lg shadow-sm">
                          Top Match
                        </div>
                      )}

                      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-slate-800">{candidate.candidateName}</h3>
                          <p className="text-sm text-slate-500 mt-1">Candidate ID: #{candidate.resumeId}</p>
                        </div>
                        
                        {/* Score Display */}
                        <div className="mt-4 md:mt-0 flex flex-col items-center bg-slate-50 p-3 rounded-xl border border-slate-100 min-w-[120px]">
                           <span className="text-2xl font-black text-indigo-600 mb-1">{candidate.score}%</span>
                           <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                             <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${candidate.score}%` }}></div>
                           </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {/* Matched Skills */}
                        <div className="bg-green-50/50 p-4 rounded-xl border border-green-100/50">
                           <h4 className="text-xs font-bold text-green-800 uppercase tracking-wider mb-2 flex items-center">
                             <svg className="w-4 h-4 mr-1 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                             Matched Skills
                           </h4>
                           <div className="flex flex-wrap gap-2">
                              {candidate.matchedSkills && candidate.matchedSkills.length > 0 ? (
                                candidate.matchedSkills.map(skill => (
                                  <span key={skill} className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-md border border-green-200 shadow-sm">
                                    {skill}
                                  </span>
                                ))
                              ) : (
                                <span className="text-sm text-slate-400">None</span>
                              )}
                           </div>
                        </div>

                        {/* Missing Skills */}
                        <div className="bg-red-50/50 p-4 rounded-xl border border-red-100/50">
                           <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider mb-2 flex items-center">
                             <svg className="w-4 h-4 mr-1 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                             Missing Skills
                           </h4>
                           <div className="flex flex-wrap gap-2">
                              {candidate.missingSkills && candidate.missingSkills.length > 0 ? (
                                candidate.missingSkills.map(skill => (
                                  <span key={skill} className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-md border border-red-200 shadow-sm">
                                    {skill}
                                  </span>
                                ))
                              ) : (
                                <span className="text-sm text-slate-400">None</span>
                              )}
                           </div>
                        </div>
                      </div>

                   </div>
                 ))}
               </div>
             )}
          </div>
        </div>

      </div>

      {/* New Candidate UI Section from prompt */}
      <CandidatesSection />

    </div>
  );
}
