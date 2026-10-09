import { useEffect, useMemo, useState } from "react";
import { extractTextFromFile, parseExamContent } from "./parser";
import { supabase } from "./supabase";
import { shuffle } from "./utils/helpers";

import { useUiState } from "./hooks/useUiState";
import { useAuthState } from "./hooks/useAuthState";
import { useExamFlow } from "./hooks/useExamFlow";
import { useAdminStatsState } from "./hooks/useAdminStatsState";
import { useImportState } from "./hooks/useImportState";

import {
  fetchExamsFromSupabase,
  handleAddSubject,
  handleDeleteSubject,
  handleDeleteExam,
  handleSaveExamEdits,
  handleSaveImport,
} from "./services/examService";
import {
  loadWrongBankFromSupabase,
  saveWrongQuestionsToSupabase,
  fetchAdminWrongQuestions,
  handleDeleteWrongQuestionAdmin,
} from "./services/wrongBankService";
import {
  handleSaveStudentInfo,
  handleAdminLogin,
  fetchAdminStats,
} from "./services/authAndStatsService";

export function useAppLogic() {
  const ui = useUiState();
  const auth = useAuthState();
  const importState = useImportState();

  const [subjectList, setSubjectList] = useState([
    {
      id: "mit",
      name: "MIT",
      subtitle: "Ôn thi MIT",
      icon: "🎯",
      color: "green",
    },
    {
      id: "lien-ket",
      name: "Liên kết đơn vị",
      subtitle: "Ôn thi Liên kết đơn vị",
      icon: "🔗",
      color: "blue",
    },
  ]);
  const [examBank, setExamBank] = useState({});
  const [isFetching, setIsFetching] = useState(true);

  const [wrongQuestionsBank, setWrongQuestionsBank] = useState([]);
  const [selectedWrongSubject, setSelectedWrongSubject] = useState("ALL");
  const [isWrongPracticeMode, setIsWrongPracticeMode] = useState(false);

  const [adminWrongExamFilter, setAdminWrongExamFilter] = useState("ALL");
  const [adminWrongQuestions, setAdminWrongQuestions] = useState([]);
  const [adminWrongSearch, setAdminWrongSearch] = useState("");
  const [adminWrongSubjectFilter, setAdminWrongSubjectFilter] = useState("ALL");
  const [isFetchingWrongBank, setIsFetchingWrongBank] = useState(false);
  const [reviewFilter, setReviewFilter] = useState("all");

  const examFlow = useExamFlow({
    screen: ui.screen,
    setScreen: ui.setScreen,
    setConfirmModal: ui.setConfirmModal,
    executeSubmitCallback: finishExam,
  });

  const stats = useAdminStatsState({ subjectList });

  useEffect(() => {
    loadWrongBankFromSupabase({
      currentStudent: auth.currentStudent,
      subjectList,
      setWrongQuestionsBank,
    });
  }, [ui.screen, auth.currentStudent]);

  useEffect(() => {
    fetchExamsFromSupabase({ setSubjectList, setExamBank, setIsFetching });
  }, []);

  function refreshExams() {
    return fetchExamsFromSupabase({
      setSubjectList,
      setExamBank,
      setIsFetching,
    });
  }

  function refreshAdminWrong() {
    return fetchAdminWrongQuestions({
      subjectList,
      setIsFetchingWrongBank,
      setAdminWrongQuestions,
      setScreen: ui.setScreen,
      notify: ui.notify,
    });
  }

  function startExam(exam) {
    if (!exam.questions || !exam.questions.length)
      return ui.notify("Đề thi này chưa có câu hỏi!", "error");

    examFlow.setSelectedExam(exam);
    const mappedQuestions = exam.questions.map((q, idx) => ({
      ...q,
      originalIndex: idx,
    }));

    examFlow.setQuestions(shuffle(mappedQuestions));
    examFlow.setAnswers({});
    examFlow.setCurrent(0);
    examFlow.setSecondsLeft((exam.duration || 60) * 60);
    examFlow.setResult(null);
    ui.setScreen("exam");
  }

  function handleExamClick(exam) {
    if (!auth.currentStudent) {
      examFlow.setPendingExam(exam);
      auth.setShowStudentModal(true);
      return;
    }
    startExam(exam);
  }

  function finishExam(auto = false) {
    if (auto) return executeSubmit();

    const answered = Object.keys(examFlow.answers).length;
    const unAnswered = examFlow.questions.length - answered;

    ui.setConfirmModal({
      title: "Xác nhận nộp bài thi?",
      message: `Bạn đã hoàn thành ${answered}/${examFlow.questions.length} câu hỏi.${unAnswered > 0 ? ` (Còn ${unAnswered} câu chưa trả lời)` : ""} Bạn có chắc chắn muốn nộp bài ngay bây giờ?`,
      confirmText: "Nộp bài ngay",
      danger: false,
      onConfirm: () => executeSubmit(),
    });
  }

  async function executeSubmit() {
    const score = examFlow.questions.reduce(
      (sum, q, idx) => sum + (examFlow.answers[idx] === q.answer ? 1 : 0),
      0,
    );
    const timeUsed =
      (examFlow.selectedExam.duration || 60) * 60 - examFlow.secondsLeft;
    const isPassed = score / examFlow.questions.length >= 0.7;

    const subInfo = subjectList.find((x) => x.id === examFlow.subject);
    saveWrongQuestionsToSupabase({
      examQuestions: examFlow.questions,
      userAnswers: examFlow.answers,
      examObj: examFlow.selectedExam,
      currentStudent: auth.currentStudent,
      reloadWrongBank: () =>
        loadWrongBankFromSupabase({
          currentStudent: auth.currentStudent,
          subjectList,
          setWrongQuestionsBank,
        }),
    });

    if (auth.currentStudent) {
      try {
        await supabase.from("exam_results").insert([
          {
            agent_code: auth.currentStudent.agentCode,
            student_name: auth.currentStudent.name,
            exam_id: examFlow.selectedExam.id,
            exam_name: examFlow.selectedExam.name,
            subject_id: subInfo?.id || examFlow.selectedExam.subject,
            score,
            total: examFlow.questions.length,
            time_used: timeUsed,
            passed: isPassed,
          },
        ]);
      } catch (err) {
        console.error("Lỗi ghi kết quả thi:", err);
      }
    }

    examFlow.setResult({
      score,
      total: examFlow.questions.length,
      auto: false,
      timeUsed,
    });
    ui.setScreen("result");
  }

  function processFile(file) {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext !== "docx" && ext !== "pdf") {
      return ui.notify("Chỉ hỗ trợ định dạng file .docx hoặc .pdf!", "error");
    }

    importState.setIsLoading(true);
    importState.setImportError("");

    extractTextFromFile(file)
      .then((fileData) => {
        const res = parseExamContent(fileData);
        const qList = res.questions || [];
        if (!qList.length) {
          importState.setImportError(
            "Không tìm thấy câu hỏi hợp lệ trong file!",
          );
        } else {
          importState.setParsedQuestions(qList);
          importState.setImportTitle(
            res.title || file.name.replace(/\.[^/.]+$/, ""),
          );
        }
      })
      .catch((err) =>
        importState.setImportError("Lỗi đọc file: " + err.message),
      )
      .finally(() => importState.setIsLoading(false));
  }

  const filteredAdminWrongQuestions = useMemo(() => {
    const term = adminWrongSearch.trim().toLowerCase();
    return adminWrongQuestions.filter((item) => {
      const matchText = [
        item.agent_code,
        item.student_name,
        item.exam_name,
        item.question_text,
      ]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(term));

      const matchSub =
        adminWrongSubjectFilter === "ALL" ||
        item.subject_id === adminWrongSubjectFilter;
      return matchText && matchSub;
    });
  }, [adminWrongQuestions, adminWrongSearch, adminWrongSubjectFilter]);

  const subjectInfo = subjectList.find((x) => x.id === examFlow.subject);
  const currentExamList = examBank[examFlow.subject] || [];
  const answeredCount = Object.keys(examFlow.answers).length;

  return {
    state: {
      screen: ui.screen,
      toast: ui.toast,
      confirmModal: ui.confirmModal,
      isDragging: ui.isDragging,
      isAdmin: auth.isAdmin,
      currentStudent: auth.currentStudent,
      showStudentModal: auth.showStudentModal,
      showAdminLoginModal: auth.showAdminLoginModal,
      studentNameInput: auth.studentNameInput,
      agentCodeInput: auth.agentCodeInput,
      adminUsernameInput: auth.adminUsernameInput,
      adminPasswordInput: auth.adminPasswordInput,
      subjectList,
      examBank,
      isFetching,
      subject: examFlow.subject,
      selectedExam: examFlow.selectedExam,
      questions: examFlow.questions,
      answers: examFlow.answers,
      current: examFlow.current,
      secondsLeft: examFlow.secondsLeft,
      result: examFlow.result,
      pendingExam: examFlow.pendingExam,
      formattedTime: examFlow.formattedTime,
      wrongQuestionsBank,
      selectedWrongSubject,
      isWrongPracticeMode,
      adminWrongExamFilter,
      adminWrongQuestions,
      adminWrongSearch,
      adminWrongSubjectFilter,
      isFetchingWrongBank,
      reviewFilter,
      adminResults: stats.adminResults,
      searchAgentFilter: stats.searchAgentFilter,
      isFetchingStats: stats.isFetchingStats,
      statsPage: stats.statsPage,
      statsPageSize: stats.statsPageSize,
      statsPeriod: stats.statsPeriod,
      STATS_PAGE_SIZE_OPTIONS: stats.STATS_PAGE_SIZE_OPTIONS,
      periodAdminResults: stats.periodAdminResults,
      filteredAdminResults: stats.filteredAdminResults,
      statsPageCount: stats.statsPageCount,
      paginatedAdminResults: stats.paginatedAdminResults,
      subjectStats: stats.subjectStats,
      passedCount: stats.passedCount,
      passRate: stats.passRate,
      weeklyStats: stats.weeklyStats,
      showImportModal: importState.showImportModal,
      importSubject: importState.importSubject,
      importTitle: importState.importTitle,
      importDuration: importState.importDuration,
      parsedQuestions: importState.parsedQuestions,
      isLoading: importState.isLoading,
      importError: importState.importError,
      openAccordion: importState.openAccordion,
      showSubjectModal: importState.showSubjectModal,
      newSubName: importState.newSubName,
      newSubSub: importState.newSubSub,
      editingExam: importState.editingExam,
      showQuestionGridModal: importState.showQuestionGridModal,
      filteredAdminWrongQuestions,
      subjectInfo,
      currentExamList,
      answeredCount,
    },
    setters: {
      setScreen: ui.setScreen,
      setConfirmModal: ui.setConfirmModal,
      setIsDragging: ui.setIsDragging,
      setIsAdmin: auth.setIsAdmin,
      setCurrentStudent: auth.setCurrentStudent,
      setShowStudentModal: auth.setShowStudentModal,
      setShowAdminLoginModal: auth.setShowAdminLoginModal,
      setStudentNameInput: auth.setStudentNameInput,
      setAgentCodeInput: auth.setAgentCodeInput,
      setAdminUsernameInput: auth.setAdminUsernameInput,
      setAdminPasswordInput: auth.setAdminPasswordInput,
      setSubject: examFlow.setSubject,
      setSelectedExam: examFlow.setSelectedExam,
      setQuestions: examFlow.setQuestions,
      setAnswers: examFlow.setAnswers,
      setCurrent: examFlow.setCurrent,
      setPendingExam: examFlow.setPendingExam,
      setSelectedWrongSubject,
      setIsWrongPracticeMode,
      setAdminWrongExamFilter,
      setAdminWrongQuestions,
      setAdminWrongSearch,
      setAdminWrongSubjectFilter,
      setReviewFilter,
      setSearchAgentFilter: stats.setSearchAgentFilter,
      setStatsPage: stats.setStatsPage,
      setStatsPageSize: stats.setStatsPageSize,
      setStatsPeriod: stats.setStatsPeriod,
      setShowImportModal: importState.setShowImportModal,
      setImportSubject: importState.setImportSubject,
      setImportTitle: importState.setImportTitle,
      setImportDuration: importState.setImportDuration,
      setParsedQuestions: importState.setParsedQuestions,
      setOpenAccordion: importState.setOpenAccordion,
      setShowSubjectModal: importState.setShowSubjectModal,
      setNewSubName: importState.setNewSubName,
      setNewSubSub: importState.setNewSubSub,
      setEditingExam: importState.setEditingExam,
      setShowQuestionGridModal: importState.setShowQuestionGridModal,
    },
    handlers: {
      notify: ui.notify,
      refreshExams,
      refreshAdminWrong,
      handleViewStudentWrongQuestions: (agentCode) => {
        setAdminWrongSearch(agentCode);
        setAdminWrongSubjectFilter("ALL");
        setAdminWrongExamFilter("ALL");
        refreshAdminWrong();
      },
      startExam,
      handleExamClick,
      finishExam,
      resetHome: examFlow.resetHome,
      processFile,
      onSaveStudentInfo: () =>
        handleSaveStudentInfo({
          studentNameInput: auth.studentNameInput,
          agentCodeInput: auth.agentCodeInput,
          setCurrentStudent: auth.setCurrentStudent,
          setShowStudentModal: auth.setShowStudentModal,
          pendingExam: examFlow.pendingExam,
          setPendingExam: examFlow.setPendingExam,
          startExam,
          notify: ui.notify,
        }),
      onAdminLogin: () =>
        handleAdminLogin({
          adminUsernameInput: auth.adminUsernameInput,
          adminPasswordInput: auth.adminPasswordInput,
          setIsAdmin: auth.setIsAdmin,
          setShowAdminLoginModal: auth.setShowAdminLoginModal,
          setAdminUsernameInput: auth.setAdminUsernameInput,
          setAdminPasswordInput: auth.setAdminPasswordInput,
          notify: ui.notify,
        }),
      onAdminLogout: () => {
        auth.setIsAdmin(false);
        localStorage.removeItem("MANULIFE_ADMIN");
        ui.setScreen("home");
        ui.notify("Đã đăng xuất quyền Admin!");
      },
      onFetchStats: () =>
        fetchAdminStats({
          setIsFetchingStats: stats.setIsFetchingStats,
          setAdminResults: stats.setAdminResults,
          setScreen: ui.setScreen,
          notify: ui.notify,
        }),
      onDeleteSubject: (subId, subName, e) => {
        e.stopPropagation();
        ui.setConfirmModal({
          title: "Xác nhận xóa môn học?",
          message: `Xóa môn "${subName}" sẽ tự động xóa toàn bộ các đề thi thuộc môn này. Hành động này không thể hoàn tác!`,
          confirmText: "Xóa môn học",
          danger: true,
          onConfirm: () =>
            handleDeleteSubject({
              subId,
              subName,
              refreshExams,
              notify: ui.notify,
            }),
        });
      },
      onDeleteExam: (examId) => {
        ui.setConfirmModal({
          title: "Xác nhận xóa đề thi?",
          message:
            "Bạn có chắc chắn muốn xóa vĩnh viễn đề thi này khỏi Database không?",
          confirmText: "Xóa đề thi",
          danger: true,
          onConfirm: () =>
            handleDeleteExam({ examId, refreshExams, notify: ui.notify }),
        });
      },
      onSaveExamEdits: () =>
        handleSaveExamEdits({
          editingExam: importState.editingExam,
          refreshExams,
          setScreen: ui.setScreen,
          notify: ui.notify,
        }),
      onSaveImport: () =>
        handleSaveImport({
          importTitle: importState.importTitle,
          parsedQuestions: importState.parsedQuestions,
          importSubject: importState.importSubject,
          importDuration: importState.importDuration,
          refreshExams,
          setShowImportModal: importState.setShowImportModal,
          setParsedQuestions: importState.setParsedQuestions,
          setImportTitle: importState.setImportTitle,
          setIsLoading: importState.setIsLoading,
          notify: ui.notify,
        }),
      onAddSubject: () =>
        handleAddSubject({
          newSubName: importState.newSubName,
          newSubSub: importState.newSubSub,
          setShowSubjectModal: importState.setShowSubjectModal,
          setNewSubName: importState.setNewSubName,
          setNewSubSub: importState.setNewSubSub,
          refreshExams,
          notify: ui.notify,
        }),
      onDeleteWrongQuestionAdmin: (id) => {
        ui.setConfirmModal({
          title: "Xóa vĩnh viễn câu sai này?",
          message:
            "Hành động này sẽ xóa vĩnh viễn dữ liệu câu sai khỏi Database!",
          confirmText: "Xóa vĩnh viễn",
          danger: true,
          onConfirm: () =>
            handleDeleteWrongQuestionAdmin({
              id,
              refreshAdminWrong,
              notify: ui.notify,
            }),
        });
      },
    },
  };
}
