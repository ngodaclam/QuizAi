import React, { useState, useEffect } from "react";
import { Plus, Upload, Trash2, FileText, FileSpreadsheet, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import documentService from "../../services/documentService";
import Spinner from "../../components/common/Spinner";
import Button from "../../components/common/Button";
import DocumentCard from "../../components/documents/DocumentCard";
import ImportFlashcardsModal from "../../components/flashcards/ImportFlashcardsModal";

const DocumentListPage = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelFile, setExcelFile] = useState(null);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await documentService.getDocuments();
      setDocuments(res.data);
    } catch (error) {
      toast.error("Failed to fetch documents.");
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setUploadFile(null);
    if (file) {
      if (/\.xlsx$/i.test(file.name)) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error("File Excel không được vượt quá 5 MB.");
          e.target.value = "";
          return;
        }
        setExcelFile(file);
        setIsUploadModalOpen(false);
        setIsExcelModalOpen(true);
        return;
      }
      if (!/\.pdf$/i.test(file.name)) {
        toast.error("Vui lòng chọn file PDF hoặc Excel .xlsx.");
        e.target.value = "";
        return;
      }
      setUploadFile(file);
      setUploadTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!uploadFile || !uploadTitle) {
      toast.error("Please provide a title and select a file.");
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("title", uploadTitle);

    try {
      await documentService.uploadDocument(formData);
      toast.success("Document uploaded successfully.");
      setIsUploadModalOpen(false);
      setUploadFile(null);
      setUploadTitle("");
      fetchDocuments();
    } catch (error) {
      toast.error(error.message || "Failed to upload document.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteRequest = (doc) => {
    setSelectedDoc(doc);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedDoc) return;

    setDeleting(true);
    try {
      await documentService.deleteDocument(selectedDoc._id);
      toast.success(`Document "${selectedDoc.title}" deleted successfully.`);
      setDocuments((prev) => prev.filter((doc) => doc._id !== selectedDoc._id));
      setIsDeleteModalOpen(false);
      setSelectedDoc(null);
    } catch (error) {
      toast.error(error.message || "Failed to delete document.");
    } finally {
      setDeleting(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <Spinner />
        </div>
      );
    }

    if (documents.length === 0) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-linear-to-br from-slate-100 to-slate-200 shadow-lg shadow-slate-200/50 mb-6">
              <FileText
                className="w-10 h-10 text-slate-400"
                strokeWidth={1.5}
              />
            </div>
            <h3 className="text-xl font-medium text-slate-900 tracking-tight mb-2">
              No Documents Yet
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Tải PDF hoặc import Excel có câu hỏi và đáp án để bắt đầu học.
            </p>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:from-emerald-600 hover:to-teal-600 hover:shadow-xl hover:shadow-emerald-500/30 text-sm transition-all duration-200 active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Upload Document
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {documents?.map((doc) => (
          <DocumentCard
            key={doc._id}
            document={doc}
            onDelete={handleDeleteRequest}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px, transparent_1px)] bg-size-[16px_16px] opacity-30 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-2xl font-medium text-slate-900 tracking-tight mb-2">
              My Documents
            </h1>
            <p className="text-slate-500 text-sm">
              PDF và Excel · Import câu hỏi, tự tạo bài trắc nghiệm
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => { setExcelFile(null); setIsExcelModalOpen(true); }} variant="secondary">
              <FileSpreadsheet className="h-4 w-4" />
              Import Excel
            </Button>
            {documents.length > 0 && (
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              variant="primary"
              size="md"
              className="cursor-pointer"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Upload Document
            </Button>
            )}
          </div>
        </div>

        {renderContent()}
      </div>

      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-2xl shadow-slate-900/20 p-8">
            {/* Close Button */}
            <button
              onClick={() => { if (!uploading) setIsUploadModalOpen(false); }}
              disabled={uploading}
              className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
            {/* Modal Header */}
            <div className="mb-6">
              <h2 className="text-xl font-medium text-slate-900 tracking-tight">
                Upload New Document
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Tải PDF hoặc import Excel để tạo bài trắc nghiệm
              </p>
            </div>
            <button type="button" disabled={uploading} onClick={() => { setExcelFile(null); setIsUploadModalOpen(false); setIsExcelModalOpen(true); }}
              className="flex w-full items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left mb-5 hover:bg-emerald-100 disabled:opacity-50">
              <FileSpreadsheet className="w-5 h-5 shrink-0 text-emerald-700 mt-0.5" />
              <span><span className="block text-sm font-semibold text-emerald-900">Import Excel câu hỏi & đáp án</span><span className="block text-xs text-emerald-800 mt-1">AI tự thêm 3 đáp án nhiễu cho từng câu hỏi</span></span>
            </button>
            {/* Form */}
            <form onSubmit={handleUpload} className="space-y-5">
              {/* Title Input */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Document Title
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  required
                  className="w-full h-12 px-4 border-2 border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 placeholder:text-slate-400 text-sm font-medium focus:border-emerald-500 focus:bg-white focus:shadow-lg focus:shadow-emerald-500/30 focus:outline-none transition-all duration-200"
                  placeholder="Enter document title"
                />
              </div>
              {/* File Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  PDF hoặc Excel
                </label>
                <div className="relative border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all duration-200">
                  <input
                    type="file"
                    id="file-upload"
                    accept=".pdf,.xlsx"
                    disabled={uploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={handleFileChange}
                  />
                  <div className="flex flex-col items-center justify-center py-10 px-6">
                    <div className="w-14 h-14 mb-3 rounded-xl bg-linear-to-r from-emerald-100 to-teal-100 flex items-center justify-center mb-4">
                      <Upload
                        className="w-7 h-7 text-emerald-600"
                        strokeWidth={2}
                      />
                    </div>
                    <p className="text-sm font-medium text-slate-700 mb-1">
                      {uploadFile ? (
                        <span className="text-emerald-600">
                          {uploadFile.name}
                        </span>
                      ) : (
                        <>
                          <span className="text-emerald-600">
                            Click to upload
                          </span>{" "}
                          or drag and drop
                        </>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">PDF tối đa 10 MB · Excel .xlsx tối đa 5 MB</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={uploading}
                  className="flex-1 h-11 px-4 border-2 border-slate-200 rounded-xl bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 h-11 px-4 bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {uploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Uploading...
                    </span>
                  ) : (
                    "Upload"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isExcelModalOpen && (
        <ImportFlashcardsModal mode="document" initialFile={excelFile}
          onClose={() => { setIsExcelModalOpen(false); setExcelFile(null); }}
          onImported={(importedDocument) => {
            setIsExcelModalOpen(false);
            setExcelFile(null);
            navigate(`/documents/${importedDocument._id}`);
          }} />
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md p-8 bg-white/95 rounded-2xl backdrop-blur-xl border border-slate-200/60 shadow-2xl shadow-slate-900/20 ">
            {/* Close Button */}
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
            {/* Modal Header */}
            <div className="mb-6">
              <div className="w-12 h-12 rounded-xl bg-linear-to-r from-red-100 to-red-200 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-600" strokeWidth={2} />
              </div>
              <h2 className="text-xl font-medium text-slate-900 tracking-tight">
                Confirm Deletion
              </h2>
            </div>
            {/* Content */}
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to delete this document:{" "}
              <span className="font-semibold text-slate-900">
                {selectedDoc?.title}
              </span>{" "}
              ? This action is irreversible.
            </p>
            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                className="flex-1 h-11 px-4 border-2 border-slate-200 rounded-xl bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 h-11 px-4 bg-linear-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {deleting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting:{" "}
                  </span>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentListPage;
