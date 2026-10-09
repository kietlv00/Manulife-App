import { useState } from "react";

export function useImportState() {
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSubject, setImportSubject] = useState("mit");
  const [importTitle, setImportTitle] = useState("");
  const [importDuration, setImportDuration] = useState(60);
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const [openAccordion, setOpenAccordion] = useState(null);

  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [newSubName, setNewSubName] = useState("");
  const [newSubSub, setNewSubSub] = useState("");
  const [editingExam, setEditingExam] = useState(null);
  const [showQuestionGridModal, setShowQuestionGridModal] = useState(false);

  return {
    showImportModal,
    setShowImportModal,
    importSubject,
    setImportSubject,
    importTitle,
    setImportTitle,
    importDuration,
    setImportDuration,
    parsedQuestions,
    setParsedQuestions,
    isLoading,
    setIsLoading,
    importError,
    setImportError,
    openAccordion,
    setOpenAccordion,
    showSubjectModal,
    setShowSubjectModal,
    newSubName,
    setNewSubName,
    newSubSub,
    setNewSubSub,
    editingExam,
    setEditingExam,
    showQuestionGridModal,
    setShowQuestionGridModal,
  };
}
