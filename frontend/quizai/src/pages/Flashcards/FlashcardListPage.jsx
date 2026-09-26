import React, { useState, useEffect } from "react";
import flashcardService from "../../services/flashcardService";
import PageHeader from "../../components/common/PageHeader";
import Spinner from "../../components/common/Spinner";
import EmptyState from "../../components/common/EmptyState";
import FlashcardSetCard from "../Flashcards/FlashcardSetCard";
import toast from "react-hot-toast";
import Modal from "../../components/common/Modal";
import Button from "../../components/common/Button";
import ImportFlashcardsModal from "../../components/flashcards/ImportFlashcardsModal";
import { Upload } from "lucide-react";

const FlashcardListPage = () => {
  const [flashcardSets, setFlashcardSets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [setToDelete, setSetToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  useEffect(() => {
    const fetchFlashcardSets = async () => {
      setLoading(true);
      try {
        const response = await flashcardService.getAllFlashcardSets();
        setFlashcardSets(response.data || []);
      } catch (error) {
        toast.error("Failed to fetch flashcard sets");
        console.error("Error fetching flashcard sets:", error);
        setFlashcardSets([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFlashcardSets();
  }, []);

  const fetchFlashcardSets = async () => {
    setLoading(true);
    try {
      const response = await flashcardService.getAllFlashcardSets();
      setFlashcardSets(response.data || []);
    } catch (error) {
      toast.error("Failed to fetch flashcard sets");
      console.error("Error fetching flashcard sets:", error);
      setFlashcardSets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestDelete = (flashcardSet) => {
    setSetToDelete(flashcardSet);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!setToDelete?._id) return;
    setDeleting(true);
    try {
      await flashcardService.deleteFlashcardSet(setToDelete._id);
      toast.success("Flashcard set deleted successfully.");
      setIsDeleteModalOpen(false);
      setSetToDelete(null);
      await fetchFlashcardSets();
    } catch (error) {
      toast.error(error?.message || "Failed to delete flashcard set.");
    } finally {
      setDeleting(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return <Spinner />;
    }

    if (flashcardSets.length === 0) {
      return (
        <EmptyState
          title="No flashcard sets found"
          description="Import câu hỏi và đáp án từ Excel hoặc tạo flashcard từ tài liệu PDF để bắt đầu học."
        />
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {flashcardSets.map((set) => (
          <FlashcardSetCard
            key={set._id}
            flashcardSet={set}
            onRequestDelete={handleRequestDelete}
          />
        ))}
      </div>
    );
  };

  return (
    <div>
      <PageHeader title="Flashcards" subtitle="Ôn tập câu hỏi từ tài liệu và file Excel của bạn." />
      <div className="flex justify-end mb-5">
        <Button onClick={() => setIsImportOpen(true)}><Upload size={18} /> Import Excel</Button>
      </div>
      {renderContent()}
      {isImportOpen && <ImportFlashcardsModal onClose={() => setIsImportOpen(false)} onImported={() => {
        setIsImportOpen(false);
        fetchFlashcardSets();
      }} />}

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (deleting) return;
          setIsDeleteModalOpen(false);
          setSetToDelete(null);
        }}
        title="Confirm Delete Flashcard Set"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Are you sure you want to delete this flashcard set? This action
            cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSetToDelete(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600 active:bg-red-700 focus:ring-red-500"
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FlashcardListPage;
