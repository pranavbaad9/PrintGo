import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File, AlertCircle } from 'lucide-react';
import axios from 'axios';

const UploadPage = ({ setJobData }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: false
  });

  const handleUpload = async () => {
    if (!file) return;
    
    setIsUploading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:5000/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        setJobData(prev => ({ ...prev, file: response.data.file }));
        navigate('/settings');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ width: '100%', maxWidth: '600px' }}>
      <div className="glass-panel text-center">
        <h2 className="text-2xl mb-2"><span className="gradient-text">Upload Document</span></h2>
        <p className="text-muted mb-4">Supported formats: PDF, DOCX, PPTX, JPG, PNG (Max 50MB)</p>
        
        {!file ? (
          <div {...getRootProps()} className={`upload-zone ${isDragActive ? 'active' : ''}`}>
            <input {...getInputProps()} />
            <UploadCloud className="upload-icon mx-auto" />
            <p className="text-xl font-bold mt-2">
              {isDragActive ? "Drop the file here..." : "Drag & drop file here"}
            </p>
            <p className="text-muted mt-2">or click to browse</p>
          </div>
        ) : (
          <div className="upload-zone p-4" style={{ padding: '2rem' }}>
            <File className="upload-icon mx-auto" style={{ color: 'var(--primary-color)' }} />
            <h3 className="font-bold mt-2 text-xl truncate">{file.name}</h3>
            <p className="text-muted mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
            <div className="flex gap-4 justify-center mt-4">
              <button 
                className="btn" 
                onClick={() => setFile(null)}
                disabled={isUploading}
              >
                Change File
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleUpload}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-lg flex align-center justify-center gap-2" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error-color)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadPage;
