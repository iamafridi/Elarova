import { useState, useRef } from 'react';
import { useStore } from '../../store';
import { documentApi } from '../../services/api';
import { Upload, Trash2, FileText, Loader2, X, CheckCircle, AlertCircle } from 'lucide-react';

const DocumentsPanel = () => {
  const { sessionId, documents, addDocument, removeDocument, toggleDocuments } = useStore();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Only PDF files are allowed');
      return;
    }

    setIsUploading(true);
    try {
      const doc = await documentApi.uploadDocument(sessionId, file);
      addDocument(doc);
    } catch (error) {
      console.error('Failed to upload document:', error);
      alert('Failed to upload document');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await documentApi.deleteDocument(sessionId, docId);
      removeDocument(docId);
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('Failed to delete document');
    }
  };

  return (
    <div className="h-64 bg-white/10 backdrop-blur-md border-t border-white/20 flex flex-col">
      <div className="p-4 flex items-center justify-between border-b border-white/20">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <FileText size={18} />
          My Documents
        </h3>
        <button
          onClick={toggleDocuments}
          className="text-white/60 hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            disabled={isUploading}
          />
          <label
            htmlFor="file-upload"
            className={`flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-white/30 rounded-xl text-white/70 hover:text-white hover:border-white/50 transition-all cursor-pointer ${
              isUploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload size={18} />
                <span>Upload PDF</span>
              </>
            )}
          </label>
        </div>

        {documents.length === 0 ? (
          <div className="text-center text-white/40 py-8">
            No documents uploaded yet
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map(doc => (
              <div
                key={doc._id}
                className="flex items-center justify-between bg-white/10 p-3 rounded-xl"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileText size={18} className="text-white/70 flex-shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-white text-sm truncate">{doc.originalName}</p>
                    <div className="flex items-center gap-1 text-xs">
                      {doc.status === 'processing' && (
                        <>
                          <Loader2 size={12} className="animate-spin text-yellow-400" />
                          <span className="text-yellow-400">Processing...</span>
                        </>
                      )}
                      {doc.status === 'ready' && (
                        <>
                          <CheckCircle size={12} className="text-green-400" />
                          <span className="text-green-400">Ready</span>
                        </>
                      )}
                      {doc.status === 'error' && (
                        <>
                          <AlertCircle size={12} className="text-red-400" />
                          <span className="text-red-400">Error</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(doc._id)}
                  className="text-white/60 hover:text-red-400 transition-colors p-2"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentsPanel;
