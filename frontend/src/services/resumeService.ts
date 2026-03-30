import apiClient from './apiClient';

export interface ResumeData {
  applicantName: string;
  email: string;
}

export const resumeService = {
  createResume: async (data: ResumeData) => {
    const response = await apiClient.post('/resumes', data);
    return response.data;
  },
  uploadFile: async (file: File, onProgress?: (progressEvent: any) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/resumes/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress,
    });
    return response.data;
  }
};
