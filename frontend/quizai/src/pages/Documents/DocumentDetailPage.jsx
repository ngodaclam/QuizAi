import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import documentService from "../../services/documentService";
import Spinner from "../../components/common/Spinner";
import toast from "react-hot-toast";
import { ArrowLeft, ExternalLink } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Tabs from "../../components/common/Tabs";
import ChatInterface from "../../components/chat/ChatInterface";
import AIActions from "../../components/ai/AIActions";
import FlashcardManager from "../../components/flashcards/FlashcardManager";
import QuizManager from "../../components/quizzes/QuizManager";
import ExcelDocumentContent, { ExcelQuizStatus } from "../../components/documents/ExcelDocumentContent";

const DocumentDetailPage = () => {
  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Content");
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState("");
  const [pollError, setPollError] = useState("");
  const isExcel = document?.fileType === "excel";
  const generationStatus = document?.quizGeneration?.status;

  useEffect(() => {
    let cancelled = false;
    const fetchDocumentDetails = async () => {
      setLoading(true);
      try {
        const res = await documentService.getDocumentById(id);
        if (!cancelled) {
          setDocument(res.data);
          setActiveTab("Content");
          setRetryError("");
          setPollError("");
        }
      } catch (error) {
        if (!cancelled) {
          setDocument(null);
          toast.error("Failed to fetch document details.");
        }
        console.error("Error fetching document:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchDocumentDetails();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!isExcel || !["pending", "processing"].includes(generationStatus)) return;
    let cancelled = false;
    let timer;
    const poll = async () => {
      try {
        const res = await documentService.getDocumentById(id);
        if (cancelled) return;
        setDocument(res.data);
        setPollError("");
        if (!["pending", "processing"].includes(res.data.quizGeneration?.status)) return;
      } catch {
        if (cancelled) return;
        setPollError("Chưa cập nhật được tiến độ. Đang tự kết nối lại...");
      }
      timer = window.setTimeout(poll, 4000);
    };
    timer = window.setTimeout(poll, 2000);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [id, isExcel, generationStatus]);

  const retryGeneration = async () => {
    setRetrying(true);
    setRetryError("");
    try {
      setDocument(await documentService.retryQuiz(id));
      setPollError("");
    } catch (error) {
      setRetryError(error.message);
    } finally {
      setRetrying(false);
    }
  };

  const refreshDocument = async () => {
    try {
      const res = await documentService.getDocumentById(id);
      setDocument(res.data);
    } catch {
      toast.error("Không thể cập nhật trạng thái tài liệu. Vui lòng tải lại trang.");
    }
  };

  const getPdfUrl = () => {
    const url = document?.url || document?.filePath;
    if (!url) return null;

    if (url.startsWith("http://") || url.startsWith("https://")) {
      if (url.includes("res.cloudinary.com")) {
        return url;
      }
      return null;
    }

    return null;
  };

  const renderContent = () => {
    if (loading) {
      return <Spinner />;
    }
    if (isExcel) return <ExcelDocumentContent key={id} document={document} />;
    const pdfUrl = getPdfUrl();
    if (!pdfUrl) {
      return (
        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm">
          <div className="p-4">
            {document?.status === "processing" ? (
              <div className="text-sm text-gray-700">
                PDF is still processing. Please wait a moment and refresh.
              </div>
            ) : (
              <div className="text-sm text-gray-700">PDF not available.</div>
            )}
          </div>
        </div>
      );
    }
    return (
      <div className="bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm">
        <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-300">
          <span className="text-sm font-medium text-gray-700 ">
            Document Viewer
          </span>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
          >
            <ExternalLink size={16} />
            Open in New Tab
          </a>
        </div>
        <div className="bg-gray-100 p-1">
          <iframe
            src={pdfUrl}
            className="w-full h-[70vh] bg-white rounded border border-gray-300 "
            title="PDF Viewer"
            frameBorder="0"
            style={{ colorScheme: "light" }}
            width="100%"
            height="600px"
          />
        </div>
      </div>
    );
  };

  const renderChat = () => {
    return <ChatInterface />;
  };

  const renderAIActions = () => {
    return <AIActions />;
  };

  const renderFlashcardsTabs = () => {
    return <FlashcardManager documentId={id} />;
  };

  const renderQuizzesTab = () => {
    return <QuizManager documentId={id} isExcel={isExcel} generationStatus={generationStatus}
      refreshKey={document?.quizGeneration?.quizId || generationStatus} onQuizDeleted={isExcel ? refreshDocument : undefined} />;
  };

  const tabs = isExcel ? [
    { name: "Content", label: "Nội dung", content: renderContent() },
    { name: "Quizzes", label: "Trắc nghiệm", content: renderQuizzesTab() },
  ] : [
    { name: "Content", label: "Content", content: renderContent() },
    { name: "Chat", label: "Chat", content: renderChat() },
    { name: "AI Actions", label: "AI Actions", content: renderAIActions() },
    {
      name: "Flashcards",
      label: "Flashcards",
      content: renderFlashcardsTabs(),
    },
    { name: "Quizzes", label: "Quizzes", content: renderQuizzesTab() },
  ];

  if (loading) {
    return <Spinner />;
  }

  if (!document) {
    return <div className="text-center p-8">Document not found</div>;
  }

  return (
    <div className={activeTab === "Chat" ? "flex h-full min-h-0 flex-col" : ""}>
      <div className="mb-3 shrink-0">
        <Link
          to="/documents"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors duration-200"
        >
          <ArrowLeft size={16} />
          Back to Documents
        </Link>
      </div>
      {activeTab === "Chat" ? <h1 className="mb-3 shrink-0 truncate text-lg font-semibold text-slate-900" title={document.title}>{document.title}</h1> : <PageHeader title={document.title} />}
      {isExcel && <ExcelQuizStatus document={document} onRetry={retryGeneration} retrying={retrying} retryError={retryError} />}
      {pollError && <p role="status" className="mb-4 text-sm text-amber-700">{pollError}</p>}
      <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} fillHeight={activeTab === "Chat"} />
    </div>
  );
};

export default DocumentDetailPage;
