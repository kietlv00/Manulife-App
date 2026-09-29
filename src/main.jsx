import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { extractTextFromFile, parseExamContent } from "./parser";
import { supabase } from "./supabase";

function App() {
  // 1. STATE CƠ BẢN
  const [screen, setScreen] = useState("home");
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
  const [subject, setSubject] = useState(null);
  const [selectedExam, setSelectedExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(60 * 60);
  const [result, setResult] = useState(null);

  // Ngân hàng câu sai
  const [wrongQuestionsBank, setWrongQuestionsBank] = useState([]);
  const [selectedWrongSubject, setSelectedWrongSubject] = useState("ALL");
  const [isWrongPracticeMode, setIsWrongPracticeMode] = useState(false);

  const [reviewFilter, setReviewFilter] = useState("all");
  const [isDragging, setIsDragging] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [toast, setToast] = useState(null);

  // QUẢN LÝ QUYỀN ADMIN VÀ THÔNG TIN HỌC VIÊN
  const [isAdmin, setIsAdmin] = useState(
    () => localStorage.getItem("MANULIFE_ADMIN") === "true",
  );
  const [currentStudent, setCurrentStudent] = useState(() => {
    const saved = localStorage.getItem("MANULIFE_STUDENT");
    return saved ? JSON.parse(saved) : null;
  });

  // Modal Học viên (Mã số đại lý) & Admin Modal
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [studentNameInput, setStudentNameInput] = useState("");
  const [agentCodeInput, setAgentCodeInput] = useState("");
  const [pendingExam, setPendingExam] = useState(null);

  // Admin Login Inputs
  const [adminUsernameInput, setAdminUsernameInput] = useState("");
  const [adminPasswordInput, setAdminPasswordInput] = useState("");

  // Admin Statistics State
  const [adminResults, setAdminResults] = useState([]);
  const [searchAgentFilter, setSearchAgentFilter] = useState("");
  const [isFetchingStats, setIsFetchingStats] = useState(false);
  const [statsPage, setStatsPage] = useState(1);
  const [statsPageSize, setStatsPageSize] = useState(10);
  const [statsPeriod, setStatsPeriod] = useState("month");
  const STATS_PAGE_SIZE_OPTIONS = [10, 50, 100];
  const [examBank, setExamBank] = useState({});
  const [isFetching, setIsFetching] = useState(true);

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
  const answeredCount = Object.keys(answers).length;

  useEffect(() => {
    loadWrongBank();
  }, [screen]);

  function loadWrongBank() {
    try {
      const data = JSON.parse(
        localStorage.getItem("WRONG_QUESTIONS_BANK") || "[]",
      );
      setWrongQuestionsBank(data);
    } catch (err) {
      setWrongQuestionsBank([]);
    }
  }

  function startWrongQuestionsPractice() {
    const filtered =
      selectedWrongSubject === "ALL"
        ? wrongQuestionsBank
        : wrongQuestionsBank.filter(
            (q) => q.subjectId === selectedWrongSubject,
          );

    if (!filtered.length) {
      return notify("Không có câu hỏi sai nào trong mục này!", "error");
    }

    const customExam = {
      id: "wrong_practice_" + Date.now(),
      name: `Ôn Luyện Câu Sai (${filtered.length} câu)`,
      duration: Math.max(10, Math.ceil(filtered.length * 1.5)),
      questions: filtered.map((item) => ({
        text: item.questionText,
        options: item.options,
        answer: item.correctAnswer,
        metaSubject: item.subjectName,
        metaExam: item.examName,
      })),
    };

    setIsWrongPracticeMode(true);
    startExam(customExam);
  }

  function clearWrongQuestionsBank() {
    setConfirmModal({
      title: "Xóa toàn bộ câu hỏi sai?",
      message:
        "Bạn có chắc muốn xóa lịch sử các câu làm sai trên thiết bị này không?",
      confirmText: "Xóa sạch",
      danger: true,
      onConfirm: () => {
        localStorage.removeItem("WRONG_QUESTIONS_BANK");
        setWrongQuestionsBank([]);
        notify("Đã xóa sạch ngân hàng câu sai!");
      },
    });
  }

  function processFile(file) {
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();
    if (ext !== "docx" && ext !== "pdf") {
      return notify("Chỉ hỗ trợ định dạng file .docx hoặc .pdf!", "error");
    }

    setIsLoading(true);
    setImportError("");

    extractTextFromFile(file)
      .then((fileData) => {
        const res = parseExamContent(fileData);
        const qList = res.questions || [];
        if (!qList.length) {
          setImportError("Không tìm thấy câu hỏi hợp lệ trong file!");
        } else {
          setParsedQuestions(qList);
          setImportTitle(res.title || file.name.replace(/\.[^/.]+$/, ""));
        }
      })
      .catch((err) => setImportError("Lỗi đọc file: " + err.message))
      .finally(() => setIsLoading(false));
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    processFile(file);
  }

  function handleDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }

  function notify(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    fetchExamsFromSupabase();
  }, []);

  async function fetchExamsFromSupabase() {
    setIsFetching(true);
    try {
      const { data: subData } = await supabase.from("subjects").select("*");
      if (subData && subData.length > 0) {
        setSubjectList(subData);
      }

      const { data: examData, error } = await supabase
        .from("exams")
        .select("*");
      if (error) throw error;

      const grouped = {};
      (examData || []).forEach((item) => {
        if (!grouped[item.subject]) grouped[item.subject] = [];
        grouped[item.subject].push(item);
      });
      setExamBank(grouped);
    } catch (err) {
      console.error("Lỗi lấy dữ liệu:", err.message);
    } finally {
      setIsFetching(false);
    }
  }

  // XỬ LÝ LƯU/CẬP NHẬT HỌC VIÊN QUA MÃ SỐ ĐẠI LÝ
  async function handleSaveStudentInfo() {
    if (!studentNameInput.trim() || !agentCodeInput.trim()) {
      return notify("Vui lòng nhập đầy đủ Họ tên và Mã số Đại lý!", "error");
    }

    const cleanCode = agentCodeInput.trim().toUpperCase();
    const cleanName = studentNameInput.trim();

    try {
      // Upsert vào bảng students trên Supabase
      const { error } = await supabase.from("students").upsert(
        [
          {
            agent_code: cleanCode,
            name: cleanName,
          },
        ],
        { onConflict: "agent_code" },
      );

      if (error) throw error;

      const studentObj = {
        name: cleanName,
        agentCode: cleanCode,
      };

      setCurrentStudent(studentObj);
      localStorage.setItem("MANULIFE_STUDENT", JSON.stringify(studentObj));
      setShowStudentModal(false);
      notify(`Xin chào Đại lý ${cleanName} (${cleanCode})!`);

      if (pendingExam) {
        const examToStart = pendingExam;
        setPendingExam(null);
        startExam(examToStart);
      }
    } catch (err) {
      notify("Lỗi lưu thông tin học viên: " + err.message, "error");
    }
  }

  // XỬ LÝ ĐĂNG NHẬP ADMIN
  async function handleAdminLogin() {
    if (!adminUsernameInput || !adminPasswordInput)
      return notify("Vui lòng nhập đầy đủ tài khoản và mật khẩu!", "error");

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", adminUsernameInput.trim())
        .eq("password", adminPasswordInput.trim())
        .eq("role", "admin")
        .single();

      if (error || !data) {
        return notify("Tài khoản Quản trị không chính xác!", "error");
      }

      setIsAdmin(true);
      localStorage.setItem("MANULIFE_ADMIN", "true");
      setShowAdminLoginModal(false);
      setAdminUsernameInput("");
      setAdminPasswordInput("");
      notify("Đăng nhập quyền Admin thành công!");
    } catch (err) {
      notify("Lỗi xác thực Admin: " + err.message, "error");
    }
  }

  function handleAdminLogout() {
    setIsAdmin(false);
    localStorage.removeItem("MANULIFE_ADMIN");
    setScreen("home");
    notify("Đã đăng xuất quyền Admin!");
  }

  function handleChangeStudentInfo() {
    if (currentStudent) {
      setStudentNameInput(currentStudent.name);
      setAgentCodeInput(currentStudent.agentCode);
    }
    setShowStudentModal(true);
  }

  // TẢI BÁO CÁO THỐNG KÊ CHO ADMIN
  async function fetchAdminStats() {
    setIsFetchingStats(true);

    try {
      const batchSize = 1000;
      const allResults = [];
      let from = 0;

      while (true) {
        const { data, error } = await supabase
          .from("exam_results")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, from + batchSize - 1);

        if (error) throw error;

        const batch = data || [];
        allResults.push(...batch);

        if (batch.length < batchSize) break;
        from += batchSize;
      }

      setAdminResults(allResults);
      setScreen("admin-stats");
    } catch (err) {
      notify("Lỗi lấy dữ liệu thống kê: " + err.message, "error");
    } finally {
      setIsFetchingStats(false);
    }
  }

  async function handleSaveImport() {
    if (!importTitle.trim())
      return notify("Vui lòng nhập tên đề thi!", "error");
    if (!parsedQuestions.length)
      return notify("Vui lòng chọn file đề thi!", "error");

    const newExam = {
      id: "exam_" + Date.now(),
      subject: importSubject,
      name: importTitle,
      duration: Number(importDuration) || 60,
      questions: parsedQuestions,
    };

    setIsLoading(true);
    try {
      const { error } = await supabase.from("exams").insert([newExam]);
      if (error) throw error;

      await fetchExamsFromSupabase();
      setShowImportModal(false);
      setParsedQuestions([]);
      setImportTitle("");
      notify("Lưu đề thi thành công!");
    } catch (err) {
      notify("Lỗi lưu đề thi: " + err.message, "error");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddSubject() {
    if (!newSubName.trim()) return notify("Vui lòng nhập tên môn!", "error");

    const newSub = {
      id: "sub_" + Date.now(),
      name: newSubName,
      subtitle: newSubSub || `Ôn thi ${newSubName}`,
      icon: "📚",
      color: "green",
    };

    try {
      const { error } = await supabase.from("subjects").insert([newSub]);
      if (error) throw error;

      await fetchExamsFromSupabase();
      setShowSubjectModal(false);
      setNewSubName("");
      setNewSubSub("");
      notify("Thêm môn học thành công!");
    } catch (err) {
      notify("Lỗi thêm môn: " + err.message, "error");
    }
  }

  async function handleDeleteSubject(subId, subName, e) {
    e.stopPropagation();
    setConfirmModal({
      title: "Xác nhận xóa môn học?",
      message: `Xóa môn "${subName}" sẽ tự động xóa toàn bộ các đề thi thuộc môn này trên hệ thống. Hành động này không thể hoàn tác!`,
      confirmText: "Xóa môn học",
      danger: true,
      onConfirm: async () => {
        try {
          await supabase.from("exams").delete().eq("subject", subId);
          const { error } = await supabase
            .from("subjects")
            .delete()
            .eq("id", subId);
          if (error) throw error;

          await fetchExamsFromSupabase();
          notify(`Đã xóa môn "${subName}" thành công!`);
        } catch (err) {
          notify("Lỗi xóa môn: " + err.message, "error");
        }
      },
    });
  }

  async function handleDeleteExam(examId) {
    setConfirmModal({
      title: "Xác nhận xóa đề thi?",
      message:
        "Bạn có chắc chắn muốn xóa vĩnh viễn đề thi này khỏi Database không?",
      confirmText: "Xóa đề thi",
      danger: true,
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from("exams")
            .delete()
            .eq("id", examId);
          if (error) throw error;

          await fetchExamsFromSupabase();
          notify("Đã xóa đề thi vĩnh viễn thành công!");
        } catch (err) {
          notify("Xóa thất bại: " + err.message, "error");
        }
      },
    });
  }

  function openEditExam(exam) {
    setEditingExam(JSON.parse(JSON.stringify(exam)));
    setScreen("edit-exam");
  }

  async function handleSaveExamEdits() {
    try {
      const { error } = await supabase
        .from("exams")
        .update({
          name: editingExam.name,
          duration: editingExam.duration,
          questions: editingExam.questions,
        })
        .eq("id", editingExam.id);

      if (error) throw error;
      await fetchExamsFromSupabase();
      setScreen("exams");
      notify("Cập nhật đề thi thành công!");
    } catch (err) {
      notify("Cập nhật thất bại: " + err.message, "error");
    }
  }

  useEffect(() => {
    if (screen !== "exam") return;
    if (secondsLeft <= 0) {
      finishExam(true);
      return;
    }
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [screen, secondsLeft]);

  const formattedTime = useMemo(() => {
    const m = Math.floor(secondsLeft / 60)
      .toString()
      .padStart(2, "0");
    const s = (secondsLeft % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [secondsLeft]);

  function shuffle(items) {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function handleExamClick(exam) {
    if (!currentStudent) {
      setPendingExam(exam);
      setShowStudentModal(true);
      return;
    }

    startExam(exam);
  }

  function startExam(exam) {
    if (!exam.questions || !exam.questions.length)
      return notify("Đề thi này chưa có câu hỏi!", "error");

    setSelectedExam(exam);
    setQuestions(shuffle(exam.questions));
    setAnswers({});
    setCurrent(0);
    setSecondsLeft((exam.duration || 60) * 60);
    setResult(null);
    setScreen("exam");
  }

  function handleSelectOption(optIdx) {
    setAnswers((prev) => ({
      ...prev,
      [current]: optIdx,
    }));
  }

  function handleNavigateQuestion(step) {
    setCurrent((c) => Math.min(Math.max(0, c + step), questions.length - 1));
  }

  function finishExam(auto = false) {
    if (auto) {
      executeSubmit();
      return;
    }

    const answeredCount = Object.keys(answers).length;
    const unAnsweredCount = questions.length - answeredCount;

    setConfirmModal({
      title: "Xác nhận nộp bài thi?",
      message: `Bạn đã hoàn thành ${answeredCount}/${questions.length} câu hỏi.${
        unAnsweredCount > 0 ? ` (Còn ${unAnsweredCount} câu chưa trả lời)` : ""
      } Bạn có chắc chắn muốn nộp bài ngay bây giờ?`,
      confirmText: "Nộp bài ngay",
      danger: false,
      onConfirm: () => {
        executeSubmit();
      },
    });
  }

  async function executeSubmit() {
    const score = questions.reduce((sum, q, idx) => {
      return sum + (answers[idx] === q.answer ? 1 : 0);
    }, 0);

    const timeUsed = (selectedExam.duration || 60) * 60 - secondsLeft;
    const isPassed = score / questions.length >= 0.7;

    saveWrongQuestions(questions, answers, selectedExam, subjectInfo);

    // Ghi kết quả bài thi lên Supabase cho Admin Thống kê
    if (currentStudent) {
      try {
        await supabase.from("exam_results").insert([
          {
            agent_code: currentStudent.agentCode,
            student_name: currentStudent.name,
            exam_id: selectedExam.id,
            exam_name: selectedExam.name,
            subject_id: subjectInfo?.id || selectedExam.subject,
            score: score,
            total: questions.length,
            time_used: timeUsed,
            passed: isPassed,
          },
        ]);
      } catch (err) {
        console.error("Lỗi ghi kết quả thi:", err);
      }
    }

    setResult({
      score,
      total: questions.length,
      auto: false,
      timeUsed,
    });
    setScreen("result");
  }

  function resetHome(force = false) {
    if (screen === "exam" && !force) {
      setConfirmModal({
        title: "Rời khỏi bài thi?",
        message:
          "Bài làm của bạn chưa được nộp và sẽ bị hủy nếu bạn quay về Trang chủ. Bạn có chắc chắn muốn rời đi?",
        confirmText: "Rời bài thi",
        danger: true,
        onConfirm: () => {
          doResetHome();
        },
      });
      return;
    }

    doResetHome();
  }

  function doResetHome() {
    setSubject(null);
    setSelectedExam(null);
    setQuestions([]);
    setAnswers({});
    setCurrent(0);
    setResult(null);
    setScreen("home");
  }

  const currentQuestion = questions[current];
  const subjectInfo = subjectList.find((x) => x.id === subject);
  const currentExamList = examBank[subject] || [];

  const periodAdminResults = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);

    if (statsPeriod === "last3months") {
      start.setMonth(start.getMonth() - 2);
    } else if (statsPeriod === "year") {
      start.setMonth(0);
    } else if (statsPeriod === "all") {
      return adminResults;
    }

    return adminResults.filter((row) => {
      if (!row.created_at) return false;
      const createdAt = new Date(row.created_at);
      return !Number.isNaN(createdAt.getTime()) && createdAt >= start;
    });
  }, [adminResults, statsPeriod]);

  const filteredAdminResults = useMemo(() => {
    const term = searchAgentFilter.trim().toLowerCase();

    return periodAdminResults.filter((row) =>
      [row.agent_code, row.student_name, row.exam_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [periodAdminResults, searchAgentFilter]);

  const statsPageCount = Math.max(
    1,
    Math.ceil(filteredAdminResults.length / statsPageSize),
  );

  const paginatedAdminResults = filteredAdminResults.slice(
    (statsPage - 1) * statsPageSize,
    statsPage * statsPageSize,
  );

  const subjectStats = useMemo(() => {
    const counts = new Map();

    periodAdminResults.forEach((row) => {
      const subjectId = row.subject_id || "other";
      const subjectName =
        subjectList.find((item) => item.id === subjectId)?.name || subjectId;

      counts.set(subjectName, (counts.get(subjectName) || 0) + 1);
    });

    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [periodAdminResults, subjectList]);

  const passedCount = periodAdminResults.filter((row) => row.passed).length;
  const passRate = periodAdminResults.length
    ? Math.round((passedCount / periodAdminResults.length) * 100)
    : 0;

  const weeklyStats = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));

      const key = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-");

      const weekdays = [
        "Chủ nhật",
        "Thứ 2",
        "Thứ 3",
        "Thứ 4",
        "Thứ 5",
        "Thứ 6",
        "Thứ 7",
      ];

      return {
        key,
        dateLabel: `${String(date.getDate()).padStart(2, "0")}/${String(
          date.getMonth() + 1,
        ).padStart(2, "0")}`,
        weekdayLabel: weekdays[date.getDay()],
        isToday: index === 6,
        count: 0,
      };
    });

    const dayCounts = new Map(days.map((day) => [day.key, day]));

    periodAdminResults.forEach((row) => {
      if (!row.created_at) return;

      const date = new Date(row.created_at);
      if (Number.isNaN(date.getTime())) return;

      const key = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-");

      const day = dayCounts.get(key);
      if (day) day.count += 1;
    });

    return days;
  }, [periodAdminResults]);

  useEffect(() => {
    setStatsPage(1);
  }, [searchAgentFilter, adminResults, statsPeriod]);

  function saveWrongQuestions(examQuestions, userAnswers, examObj, subInfo) {
    try {
      const existing = JSON.parse(
        localStorage.getItem("WRONG_QUESTIONS_BANK") || "[]",
      );
      const wrongList = [];

      examQuestions.forEach((q, idx) => {
        const userAns = userAnswers[idx];
        if (userAns === undefined || userAns !== q.answer) {
          wrongList.push({
            questionId: q.id || `${examObj.id}_q_${idx}_${Date.now()}`,
            subjectId: subInfo?.id || examObj.subject,
            subjectName: subInfo?.name || "Môn học",
            examId: examObj.id,
            examName: examObj.name,
            questionText: q.text,
            options: q.options,
            correctAnswer: q.answer,
            userAnswer: userAns !== undefined ? userAns : -1,
            savedAt: new Date().toLocaleDateString("vi-VN"),
          });
        }
      });

      const updatedBank = [...wrongList, ...existing];
      const uniqueBank = updatedBank.filter(
        (item, index, self) =>
          index === self.findIndex((t) => t.questionText === item.questionText),
      );

      localStorage.setItem("WRONG_QUESTIONS_BANK", JSON.stringify(uniqueBank));
    } catch (err) {
      console.error("Lỗi lưu câu sai:", err);
    }
  }

  return (
    <div className="app">
      {/* Toast Notification */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            <span>{toast.type === "error" ? "❌" : "✅"}</span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <header className="topbar">
        <div className="brand" onClick={() => resetHome(false)}>
          <div className="brand-mark">M</div>
          <div>
            <div className="brand-title">ÔN THI THÔNG MINH</div>
            <div className="brand-sub">Hệ thống Luyện Đề Trực Tuyến</div>
          </div>
        </div>
        <div className="topbar-actions">
          {/* HIỂN THỊ THÔNG TIN HỌC VIÊN HOẶC ĐĂNG NHẬP */}
          {currentStudent ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                className="admin-badge"
                style={{
                  background: "#e8f5e9",
                  color: "#2e7d32",
                  borderColor: "#c8e6c9",
                  cursor: "pointer",
                }}
                onClick={handleChangeStudentInfo}
                title="Bấm để đổi tên/mã đại lý"
              >
                👤 {currentStudent.name} ({currentStudent.agentCode})
              </span>
            </div>
          ) : (
            <button
              className="primary-btn"
              onClick={() => {
                setStudentNameInput("");
                setAgentCodeInput("");
                setShowStudentModal(true);
              }}
            >
              📝 Nhập Mã Đại Lý
            </button>
          )}

          {/* QUYỀN ADMIN */}
          {isAdmin ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button className="secondary-btn" onClick={fetchAdminStats}>
                📊 Thống Kê
              </button>
              <button
                className="import-btn"
                onClick={() => setShowImportModal(true)}
              >
                ➕ Import Đề
              </button>
              <button className="ghost-btn" onClick={handleAdminLogout}>
                Thoát Admin
              </button>
            </div>
          ) : (
            <button
              className="ghost-btn"
              style={{ fontSize: "11px", padding: "6px 10px" }}
              onClick={() => setShowAdminLoginModal(true)}
            >
              🔒 Admin
            </button>
          )}

          {screen !== "home" && (
            <button className="ghost-btn" onClick={() => resetHome(false)}>
              <span>🏠</span> Trang chủ
            </button>
          )}
        </div>
      </header>

      <main className="container">
        {screen === "home" && (
          <>
            <section className="hero">
              <div>
                <span className="eyebrow">HỆ THỐNG LUYỆN THI TRỰC TUYẾN</span>
                <h1>
                  Ôn thi hiệu quả.
                  <br />
                  <span>Học đúng – Thi chắc.</span>
                </h1>
                <p>
                  Chọn môn học bên dưới để bắt đầu làm bài thi luyện tập trực
                  tiếp.
                </p>
              </div>
              <div className="hero-card">
                <div className="hero-number">
                  {isFetching
                    ? "..."
                    : Object.values(examBank).reduce(
                        (acc, list) => acc + list.length,
                        0,
                      )}
                </div>
                <div>Đề thi sẵn có</div>
                <small>Lưu trữ đồng bộ trên hệ thống</small>
              </div>
            </section>

            {/* THẺ NGÂN HÀNG CÂU HỎI SAI */}
            {wrongQuestionsBank.length > 0 && (
              <div
                style={{
                  background: "#fff3e0",
                  border: "1px solid #ffe0b2",
                  borderRadius: "12px",
                  padding: "20px",
                  marginBottom: "24px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <div>
                    <span className="eyebrow" style={{ color: "#e65100" }}>
                      KHO TỰ ÔN TẬP TẠI MÁY
                    </span>
                    <h2 style={{ margin: "4px 0 2px", color: "#e65100" }}>
                      🔥 Ngân Hàng Câu Sai ({wrongQuestionsBank.length} câu)
                    </h2>
                    <p style={{ margin: 0, fontSize: "13px", color: "#666" }}>
                      Tổng hợp các câu bạn từng làm sai trên trình duyệt này.
                      Luyện lại để khắc sâu kiến thức!
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <button
                      className="primary-btn"
                      style={{ background: "#e65100" }}
                      onClick={() => setScreen("wrong-bank-view")}
                    >
                      📋 Xem danh sách & Chi tiết
                    </button>
                    <button
                      className="secondary-btn"
                      style={{ borderColor: "#e65100", color: "#e65100" }}
                      onClick={startWrongQuestionsPractice}
                    >
                      🎯 Ôn lại ngay
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="section-header">
              <h2 className="section-title">Danh sách Môn Ôn Thi</h2>
              {isAdmin && (
                <button
                  className="primary-btn"
                  onClick={() => setShowSubjectModal(true)}
                >
                  ➕ Thêm Môn
                </button>
              )}
            </div>

            <div className="subject-grid">
              {subjectList.map((item) => (
                <div
                  key={item.id}
                  className={`subject-card ${item.color}`}
                  onClick={() => {
                    setSubject(item.id);
                    setScreen("exams");
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <div className="subject-icon">{item.icon}</div>
                  <div className="subject-info">
                    <span>{item.subtitle}</span>
                    <strong>{item.name}</strong>
                    <small>
                      {(examBank[item.id] || []).length} đề luyện tập
                    </small>
                  </div>

                  {isAdmin ? (
                    <button
                      className="danger-btn"
                      style={{
                        padding: "5px 10px",
                        fontSize: "11px",
                        borderRadius: "8px",
                      }}
                      onClick={(e) =>
                        handleDeleteSubject(item.id, item.name, e)
                      }
                    >
                      🗑️ Xóa
                    </button>
                  ) : (
                    <div style={{ color: "#00a758", fontWeight: "bold" }}>
                      →
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {screen === "exams" && (
          <>
            <div className="page-heading">
              <div>
                <span className="eyebrow">MÔN ÔN THI</span>
                <h1>
                  {subjectInfo?.icon} {subjectInfo?.name}
                </h1>
                <p>
                  {currentStudent
                    ? `Đại lý: ${currentStudent.name} (${currentStudent.agentCode}) - Chọn đề thi để bắt đầu làm bài.`
                    : "⚠️ Hãy nhập tên & Mã đại lý để hệ thống ghi nhận kết quả."}
                </p>
              </div>
              <button
                className="secondary-btn"
                onClick={() => resetHome(false)}
              >
                Đổi môn khác
              </button>
            </div>

            <div className="exam-grid">
              {isFetching ? (
                <p>Đang tải danh sách đề thi...</p>
              ) : currentExamList.length === 0 ? (
                <p>Môn này chưa có đề thi nào.</p>
              ) : (
                currentExamList.map((exam, i) => (
                  <div key={exam.id || i} className="exam-card">
                    <div className="exam-no">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div
                      className="exam-content"
                      onClick={() => handleExamClick(exam)}
                      style={{ cursor: "pointer" }}
                    >
                      <strong>{exam.name}</strong>
                      <span>
                        {exam.questions?.length || 0} câu •{" "}
                        {exam.duration || 60} phút
                      </span>
                    </div>

                    {isAdmin && (
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button
                          className="ghost-btn"
                          style={{ padding: "5px 8px" }}
                          onClick={() => openEditExam(exam)}
                        >
                          ✏️
                        </button>
                        <button
                          className="danger-btn"
                          style={{ padding: "5px 8px" }}
                          onClick={() => handleDeleteExam(exam.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* MÀN HÌNH ADMIN THỐNG KÊ KẾT QUẢ THI CỦA HỌC VIÊN */}
        {screen === "admin-stats" && (
          <div>
            <div className="stats-page-heading">
              <div>
                <span className="eyebrow">ADMIN BÁO CÁO</span>
                <h1>Thống Kê Kết Quả Học Viên</h1>
                <p>Theo dõi kết quả làm bài theo kỳ thống kê đã chọn.</p>
              </div>

              <div className="stats-heading-actions">
                <label className="stats-period-select">
                  <span>Kỳ thống kê</span>
                  <select
                    value={statsPeriod}
                    onChange={(e) => setStatsPeriod(e.target.value)}
                  >
                    <option value="month">Tháng này</option>
                    <option value="last3months">3 tháng gần nhất</option>
                    <option value="year">Năm nay</option>
                    <option value="all">Toàn bộ thời gian</option>
                  </select>
                </label>

                <button
                  className="secondary-btn"
                  onClick={() => setScreen("home")}
                >
                  ← Trang chủ
                </button>
              </div>
            </div>

            {!isFetchingStats && periodAdminResults.length > 0 && (
              <section className="stats-dashboard">
                <article className="stats-chart-card stats-overview-card">
                  <div>
                    <span className="stats-chart-kicker">TỔNG QUAN</span>
                    <h2>Kết quả học viên</h2>
                    <p>Tổng lượt làm bài đã được ghi nhận</p>
                  </div>
                  <strong className="stats-total">
                    {periodAdminResults.length}
                  </strong>
                  <div className="stats-overview-footer">
                    <span>{passedCount} lượt đạt</span>
                    <span>
                      {periodAdminResults.length - passedCount} lượt chưa đạt
                    </span>
                  </div>
                </article>

                <article className="stats-chart-card">
                  <span className="stats-chart-kicker">TỶ LỆ ĐẠT</span>
                  <h2>Kết quả chung</h2>
                  <div
                    className="stats-donut"
                    style={{
                      background: `conic-gradient(#00a758 ${passRate}%, #edf2f0 ${passRate}% 100%)`,
                    }}
                    role="img"
                    aria-label={`Tỷ lệ đạt ${passRate}%`}
                  >
                    <div>
                      <strong>{passRate}%</strong>
                      <span>đạt</span>
                    </div>
                  </div>
                  <p className="stats-chart-caption">
                    {passedCount} trên {periodAdminResults.length} lượt làm bài
                    đạt yêu cầu
                  </p>
                </article>

                <article className="stats-chart-card stats-subject-card">
                  <span className="stats-chart-kicker">PHÂN BỐ</span>
                  <h2>Lượt làm theo môn</h2>
                  <div className="stats-bars">
                    {subjectStats.map((item) => (
                      <div className="stats-bar-row" key={item.name}>
                        <div className="stats-bar-label">
                          <span>{item.name}</span>
                          <strong>{item.count}</strong>
                        </div>
                        <div className="stats-bar-track">
                          <div
                            className="stats-bar-fill"
                            style={{
                              width: `${Math.max(
                                6,
                                (item.count /
                                  Math.max(
                                    ...subjectStats.map((stat) => stat.count),
                                  )) *
                                  100,
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="stats-chart-card stats-weekly-card">
                  <h2>Hoạt động làm bài</h2>
                  <p>Số lượt nộp bài theo từng ngày trong 7 ngày gần nhất</p>
                  <svg
                    className="stats-line-chart"
                    viewBox="0 0 600 190"
                    role="img"
                    aria-label="Số lượt làm bài trong 7 ngày gần nhất"
                  >
                    <line x1="24" y1="150" x2="576" y2="150" />
                    <line x1="24" y1="100" x2="576" y2="100" />
                    <line x1="24" y1="50" x2="576" y2="50" />
                    <polyline
                      points={weeklyStats
                        .map((day, index) => {
                          const max = Math.max(
                            1,
                            ...weeklyStats.map((item) => item.count),
                          );
                          const x = 30 + index * 90;
                          const y = 145 - (day.count / max) * 110;
                          return `${x},${y}`;
                        })
                        .join(" ")}
                    />
                    {weeklyStats.map((day, index) => {
                      const max = Math.max(
                        1,
                        ...weeklyStats.map((item) => item.count),
                      );
                      const x = 30 + index * 90;
                      const y = 145 - (day.count / max) * 110;

                      return (
                        <circle
                          key={day.key}
                          cx={x}
                          cy={y}
                          r="5"
                          aria-label={`${day.weekdayLabel}, ngày ${day.dateLabel}: ${day.count} lượt làm bài`}
                        />
                      );
                    })}
                  </svg>
                  <div className="stats-chart-axis">
                    {weeklyStats.map((day) => (
                      <span
                        key={day.key}
                        className={day.isToday ? "is-today" : ""}
                      >
                        <span className="stats-axis-date">{day.dateLabel}</span>
                        <span className="stats-axis-weekday">
                          {day.weekdayLabel}
                          {day.isToday ? " · Hôm nay" : ""}
                        </span>
                        <strong>{day.count} lượt</strong>
                      </span>
                    ))}
                  </div>
                </article>
              </section>
            )}
            {/* Bộ lọc chỉ áp dụng cho bảng kết quả bên dưới */}
            <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
              <input
                type="text"
                placeholder="🔍 Tìm mã đại lý, tên học viên hoặc đề thi..."
                value={searchAgentFilter}
                onChange={(e) => setSearchAgentFilter(e.target.value)}
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid #ccc",
                  width: "100%",
                  maxWidth: "400px",
                }}
              />
            </div>
            {isFetchingStats ? (
              <p>Đang tải dữ liệu thống kê...</p>
            ) : periodAdminResults.length === 0 ? (
              <p>Không có dữ liệu trong kỳ thống kê này.</p>
            ) : filteredAdminResults.length === 0 ? (
              <p>Không tìm thấy kết quả phù hợp với từ khóa.</p>
            ) : (
              <div className="stats-table-wrap">
                <table
                  className="stats-table"
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "14px",
                    textAlign: "left",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: "#f0f7f4",
                        borderBottom: "1px solid #e1ebe7",
                      }}
                    >
                      <th style={{ padding: "12px" }}>STT</th>
                      <th style={{ padding: "12px" }}>Mã Đại Lý</th>
                      <th style={{ padding: "12px" }}>Họ Và Tên</th>
                      <th style={{ padding: "12px" }}>Đề Thi</th>
                      <th style={{ padding: "12px" }}>Điểm Số</th>
                      <th style={{ padding: "12px" }}>Tỷ Lệ</th>
                      <th style={{ padding: "12px" }}>Thời Gian</th>
                      <th style={{ padding: "12px" }}>Trạng Thái</th>
                      <th style={{ padding: "12px" }}>Ngày Làm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAdminResults.map((row, pageIndex) => {
                      const rowNumber =
                        (statsPage - 1) * statsPageSize + pageIndex + 1;
                      const pct = row.total
                        ? Math.round((row.score / row.total) * 100)
                        : 0;
                      const mins = Math.floor((row.time_used || 0) / 60);
                      const secs = (row.time_used || 0) % 60;

                      return (
                        <tr
                          key={row.id || rowNumber}
                          style={{ borderBottom: "1px solid #f0f0f0" }}
                        >
                          <td style={{ padding: "12px" }}>{rowNumber}</td>
                          <td style={{ padding: "12px", fontWeight: "bold" }}>
                            {row.agent_code}
                          </td>
                          <td style={{ padding: "12px" }}>
                            {row.student_name}
                          </td>
                          <td style={{ padding: "12px" }}>{row.exam_name}</td>
                          <td style={{ padding: "12px", fontWeight: "bold" }}>
                            {row.score} / {row.total}
                          </td>
                          <td style={{ padding: "12px" }}>{pct}%</td>
                          <td style={{ padding: "12px" }}>
                            {mins}m {secs}s
                          </td>
                          <td style={{ padding: "12px" }}>
                            <span
                              style={{
                                padding: "4px 8px",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: "bold",
                                background: row.passed ? "#e8f5e9" : "#ffebee",
                                color: row.passed ? "#2e7d32" : "#c62828",
                              }}
                            >
                              {row.passed ? "✓ ĐẠT" : "✗ CHƯA ĐẠT"}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: "12px",
                              fontSize: "12px",
                              color: "#777",
                            }}
                          >
                            {row.created_at
                              ? new Date(row.created_at).toLocaleString("vi-VN")
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!isFetchingStats && filteredAdminResults.length > 0 && (
              <div className="stats-pagination">
                <label className="stats-page-size">
                  Số dòng mỗi trang
                  <select
                    value={statsPageSize}
                    onChange={(e) => {
                      setStatsPageSize(Number(e.target.value));
                      setStatsPage(1);
                    }}
                  >
                    {STATS_PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>

                <span>
                  {filteredAdminResults.length === 0
                    ? "Không tìm thấy kết quả phù hợp"
                    : `${(statsPage - 1) * statsPageSize + 1}–${Math.min(
                        statsPage * statsPageSize,
                        filteredAdminResults.length,
                      )} / ${filteredAdminResults.length} kết quả`}
                </span>

                <div>
                  <button
                    className="secondary-btn"
                    disabled={statsPage === 1}
                    onClick={() =>
                      setStatsPage((page) => Math.max(1, page - 1))
                    }
                  >
                    ← Trước
                  </button>
                  <span className="stats-page-number">
                    {statsPage} / {statsPageCount}
                  </span>
                  <button
                    className="secondary-btn"
                    disabled={statsPage >= statsPageCount}
                    onClick={() =>
                      setStatsPage((page) => Math.min(statsPageCount, page + 1))
                    }
                  >
                    Sau →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {screen === "edit-exam" && editingExam && (
          <div>
            <div className="page-heading">
              <div>
                <span className="eyebrow">ADMIN CMS</span>
                <h1>Chỉnh Sửa Đề Thi</h1>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="secondary-btn"
                  onClick={() => setScreen("exams")}
                >
                  Hủy bỏ
                </button>
                <button className="primary-btn" onClick={handleSaveExamEdits}>
                  💾 Lưu Thay Đổi
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: "12px" }}>
              <label>Tên Đề Thi:</label>
              <input
                type="text"
                value={editingExam.name}
                onChange={(e) =>
                  setEditingExam({ ...editingExam, name: e.target.value })
                }
              />
            </div>

            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label>Thời Gian Làm Bài (Phút):</label>
              <input
                type="number"
                value={editingExam.duration}
                onChange={(e) =>
                  setEditingExam({
                    ...editingExam,
                    duration: Number(e.target.value),
                  })
                }
              />
            </div>

            <h3>Danh Sách Câu Hỏi ({editingExam.questions.length} câu)</h3>
            {editingExam.questions.map((q, qIdx) => (
              <div key={qIdx} className="edit-q-card">
                <div className="edit-q-header">
                  <strong>Câu {qIdx + 1}</strong>
                  <button
                    className="danger-btn"
                    style={{ padding: "4px 8px", fontSize: "11px" }}
                    onClick={() =>
                      setEditingExam({
                        ...editingExam,
                        questions: editingExam.questions.filter(
                          (_, idx) => idx !== qIdx,
                        ),
                      })
                    }
                  >
                    Xóa câu
                  </button>
                </div>

                <div className="form-group">
                  <label>Nội dung câu hỏi:</label>
                  <textarea
                    rows={2}
                    value={q.text}
                    onChange={(e) => {
                      const updated = [...editingExam.questions];
                      updated[qIdx].text = e.target.value;
                      setEditingExam({ ...editingExam, questions: updated });
                    }}
                  />
                </div>

                <div className="edit-options-grid">
                  {q.options.map((opt, oIdx) => {
                    const isCorrect = q.answer === oIdx;
                    return (
                      <div
                        key={oIdx}
                        className={`edit-opt-row ${isCorrect ? "is-correct" : ""}`}
                      >
                        <input
                          type="radio"
                          name={`correct_${qIdx}`}
                          checked={isCorrect}
                          onChange={() => {
                            const updated = [...editingExam.questions];
                            updated[qIdx].answer = oIdx;
                            setEditingExam({
                              ...editingExam,
                              questions: updated,
                            });
                          }}
                        />
                        <span className="opt-label">
                          {String.fromCharCode(65 + oIdx)}.
                        </span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const updated = [...editingExam.questions];
                            updated[qIdx].options[oIdx] = e.target.value;
                            setEditingExam({
                              ...editingExam,
                              questions: updated,
                            });
                          }}
                        />
                        {isCorrect && <span className="badge">✓ Đúng</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {screen === "exam" && currentQuestion && (
          <div className="exam-page">
            <div className="exam-header">
              <div>
                <span className="eyebrow">{subjectInfo?.name}</span>
                <h1>{selectedExam?.name}</h1>
                <small style={{ color: "#666" }}>
                  Thí sinh: <b>{currentStudent?.name}</b> (Mã ĐL:{" "}
                  <b>{currentStudent?.agentCode}</b>)
                </small>
              </div>
              <div className={`timer ${secondsLeft < 300 ? "danger" : ""}`}>
                ⏱ {formattedTime}
              </div>
            </div>

            <div
              style={{
                margin: "15px 0 8px",
                fontSize: "14px",
                color: "#2e7d32",
                fontWeight: "bold",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
              onClick={() => setShowQuestionGridModal(true)}
              title="Bấm để xem danh sách toàn bộ câu hỏi"
            >
              <span>
                📋 Đã trả lời {answeredCount} / {questions.length} câu
              </span>
              <span
                style={{
                  fontSize: "12px",
                  color: "#666",
                  fontWeight: "normal",
                }}
              >
                (Bấm để mở danh sách câu)
              </span>
            </div>

            <div
              onClick={() => setShowQuestionGridModal(true)}
              style={{
                height: "8px",
                background: "#e0ede8",
                borderRadius: "10px",
                overflow: "hidden",
                marginBottom: "20px",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: `${(answeredCount / questions.length) * 100}%`,
                  height: "100%",
                  background: "#00a758",
                  transition: "width 0.3s ease",
                }}
              />
            </div>

            <div className="question-card">
              <div className="question-number">CÂU {current + 1}</div>
              <h2>{currentQuestion.text}</h2>
              <div className="options">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = answers[current] === index;
                  return (
                    <button
                      key={index}
                      type="button"
                      className={`option ${isSelected ? "selected" : ""}`}
                      onClick={() => handleSelectOption(index)}
                    >
                      <span className="option-letter">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="exam-actions">
              <button
                className="secondary-btn"
                disabled={current === 0}
                style={{
                  opacity: current === 0 ? 0.4 : 1,
                  cursor: current === 0 ? "not-allowed" : "pointer",
                }}
                onClick={() => handleNavigateQuestion(-1)}
              >
                ← Câu trước
              </button>

              <button className="finish-btn" onClick={() => finishExam(false)}>
                Nộp bài ngay
              </button>

              {current < questions.length - 1 ? (
                <button
                  className="primary-btn"
                  onClick={() => handleNavigateQuestion(1)}
                >
                  Câu tiếp →
                </button>
              ) : (
                <button
                  className="primary-btn"
                  style={{ background: "#2e7d32" }}
                  onClick={() => finishExam(false)}
                >
                  Hoàn tất & Nộp bài →
                </button>
              )}
            </div>
          </div>
        )}

        {/* UI KẾT QUẢ BÀI THI */}
        {screen === "result" &&
          result &&
          (() => {
            const PASS_PERCENTAGE = 0.7; // Chuẩn đầu ra >= 70%
            const percentage = Math.round((result.score / result.total) * 100);
            const isPassed = percentage >= PASS_PERCENTAGE * 100;
            const passQuestionsCount = Math.ceil(
              result.total * PASS_PERCENTAGE,
            );

            const minutes = Math.floor(result.timeUsed / 60);
            const seconds = result.timeUsed % 60;
            const timeFormatted = `${minutes}m ${seconds}s`;

            return (
              <div className="result-container">
                <div className="result-card-sample">
                  <div className="result-mascot">{isPassed ? "🎉" : "💪"}</div>

                  <div
                    className={`status-badge ${isPassed ? "passed" : "failed"}`}
                  >
                    {isPassed
                      ? `ĐẠT (CẦN ≥ ${PASS_PERCENTAGE * 100}%)`
                      : `CHƯA ĐẠT (CẦN ≥ ${PASS_PERCENTAGE * 100}%)`}
                  </div>

                  <h1 className="result-title">
                    {isPassed
                      ? "Chúc Mừng Bạn Đã Hoàn Thành!"
                      : "Hãy Cố Gắng Luyện Thêm!"}
                  </h1>
                  <p className="result-subtext">
                    Đại lý: <b>{currentStudent?.name}</b> (
                    {currentStudent?.agentCode}) • Đạt{" "}
                    <b>
                      {result.score}/{result.total} câu ({percentage}%)
                    </b>
                    .{" "}
                    {isPassed
                      ? "Bạn đã xuất sắc vượt qua bài kiểm tra!"
                      : "Hãy ôn lại các câu đã làm sai để đạt kết quả tốt nhất nhé!"}
                  </p>

                  <div className="result-stats-grid">
                    <div className="stat-card">
                      <span className="stat-label">Điểm số</span>
                      <strong className="stat-value">
                        {result.score} / {result.total}
                      </strong>
                    </div>

                    <div className="stat-card">
                      <span className="stat-label">Tỷ lệ chính xác</span>
                      <strong className="stat-value">{percentage}%</strong>
                    </div>

                    <div className="stat-card">
                      <span className="stat-label">Thời gian làm bài</span>
                      <strong className="stat-value">{timeFormatted}</strong>
                    </div>

                    <div className="stat-card">
                      <span className="stat-label">Chuẩn đầu ra</span>
                      <strong className="stat-value pass-criteria">
                        ≥ {passQuestionsCount}/{result.total} (
                        {PASS_PERCENTAGE * 100}%)
                      </strong>
                    </div>
                  </div>

                  <div className="result-actions-row">
                    <button
                      className="action-btn retry-btn"
                      onClick={() => startExam(selectedExam)}
                    >
                      🔄 Làm Lại Đề Này
                    </button>

                    <button
                      className="action-btn review-btn"
                      onClick={() => setScreen("review")}
                    >
                      📋 Xem Chi Tiết Đáp Án
                    </button>

                    <button
                      className="action-btn home-btn"
                      onClick={() => resetHome(false)}
                    >
                      🏠 Về Trang Chủ
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

        {screen === "review" && (
          <div className="review-container">
            <div className="page-heading">
              <div>
                <span className="eyebrow">
                  📌 {subjectInfo?.name} • {selectedExam?.name}
                </span>
                <h1>Chi Tiết Bài Làm</h1>
                <p>
                  Điểm số:{" "}
                  <b>
                    {result?.score}/{result?.total}
                  </b>{" "}
                  • Kiểm tra lại các câu đã chọn và đáp án chính xác.
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="secondary-btn"
                  onClick={() => setScreen("result")}
                >
                  ← Quay lại kết quả
                </button>
                <button
                  className="primary-btn"
                  onClick={() => setScreen("exams")}
                >
                  Chọn đề khác
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
              <button
                className={
                  reviewFilter === "all" ? "primary-btn" : "secondary-btn"
                }
                onClick={() => setReviewFilter("all")}
              >
                Tất cả câu hỏi ({questions.length})
              </button>
              <button
                className={
                  reviewFilter === "wrong" ? "primary-btn" : "secondary-btn"
                }
                style={{
                  background: reviewFilter === "wrong" ? "#d32f2f" : "",
                }}
                onClick={() => setReviewFilter("wrong")}
              >
                ❌ Câu làm sai ({questions.length - (result?.score || 0)})
              </button>
              <button
                className={
                  reviewFilter === "correct" ? "primary-btn" : "secondary-btn"
                }
                style={{
                  background: reviewFilter === "correct" ? "#2e7d32" : "",
                }}
                onClick={() => setReviewFilter("correct")}
              >
                ✅ Câu làm đúng ({result?.score || 0})
              </button>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {questions.map((q, qIdx) => {
                const userChoice = answers[qIdx];
                const isCorrect = userChoice === q.answer;

                if (reviewFilter === "wrong" && isCorrect) return null;
                if (reviewFilter === "correct" && !isCorrect) return null;

                return (
                  <div
                    key={qIdx}
                    className="question-card"
                    style={{
                      borderLeft: `6px solid ${isCorrect ? "#2e7d32" : "#d32f2f"}`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "10px",
                      }}
                    >
                      <div className="question-number">CÂU {qIdx + 1}</div>
                      <span
                        className="badge"
                        style={{
                          background: isCorrect ? "#e8f5e9" : "#ffebee",
                          color: isCorrect ? "#2e7d32" : "#c62828",
                          padding: "4px 10px",
                          fontSize: "13px",
                          fontWeight: "bold",
                        }}
                      >
                        {isCorrect
                          ? "✓ Trả lời đúng"
                          : "✗ Trả lời sai / Bỏ trống"}
                      </span>
                    </div>

                    <h3 style={{ fontSize: "16px", marginBottom: "14px" }}>
                      {q.text}
                    </h3>

                    <div className="options">
                      {q.options.map((opt, oIdx) => {
                        const isUserSelected = userChoice === oIdx;
                        const isAnswerRight = q.answer === oIdx;

                        let optClass = "option";
                        if (isUserSelected && isAnswerRight) {
                          optClass += " selected";
                        } else if (isUserSelected && !isAnswerRight) {
                          optClass += " wrong-choice";
                        } else if (isAnswerRight) {
                          optClass += " right-choice";
                        }

                        return (
                          <div
                            key={oIdx}
                            className={optClass}
                            style={{
                              cursor: "default",
                              background: isUserSelected
                                ? isAnswerRight
                                  ? "#e8f5e9"
                                  : "#ffebee"
                                : isAnswerRight
                                  ? "#e8f5e9"
                                  : "",
                              borderColor: isUserSelected
                                ? isAnswerRight
                                  ? "#2e7d32"
                                  : "#d32f2f"
                                : isAnswerRight
                                  ? "#2e7d32"
                                  : "",
                            }}
                          >
                            <span className="option-letter">
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <span style={{ flex: 1 }}>{opt}</span>

                            {/* HIỂN THỊ ĐÁP ÁN NGƯỜI DÙNG CHỌN SAI */}
                            {isUserSelected && !isAnswerRight && (
                              <span
                                style={{
                                  color: "#d32f2f",
                                  fontWeight: "bold",
                                  background: "#ffcdd2",
                                  padding: "2px 8px",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                ✖ Câu bạn đã chọn (Sai)
                              </span>
                            )}

                            {/* HIỂN THỊ ĐÁP ÁN ĐÚNG */}
                            {isAnswerRight && (
                              <span
                                style={{
                                  color: "#2e7d32",
                                  fontWeight: "bold",
                                  background: "#c8e6c9",
                                  padding: "2px 8px",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                ✓ Đáp án đúng
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {userChoice === undefined && (
                      <div
                        style={{
                          marginTop: "10px",
                          color: "#d32f2f",
                          fontSize: "13px",
                          fontWeight: "bold",
                          background: "#ffebee",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1px dashed #d32f2f",
                        }}
                      >
                        ⚠️ Bạn đã bỏ trống câu hỏi này (Chưa chọn đáp án nào).
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {screen === "wrong-bank-view" && (
          <div>
            <div className="page-heading">
              <div>
                <span className="eyebrow" style={{ color: "#e65100" }}>
                  HỆ THỐNG GHI NHỚ CÂU SAI
                </span>
                <h1>Danh Sách Câu Làm Sai ({wrongQuestionsBank.length} câu)</h1>
                <p>
                  Danh sách các câu hỏi bạn từng chọn chưa đúng để tiện xem lại
                  hoặc hỏi giảng viên.
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="secondary-btn"
                  onClick={() => resetHome(false)}
                >
                  🏠 Trang chủ
                </button>
                {wrongQuestionsBank.length > 0 && (
                  <button
                    className="danger-btn"
                    onClick={clearWrongQuestionsBank}
                  >
                    🗑️ Xóa kho câu sai
                  </button>
                )}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                marginBottom: "20px",
                alignItems: "center",
              }}
            >
              <label style={{ fontWeight: "bold", fontSize: "14px" }}>
                Lọc theo môn:
              </label>
              <select
                value={selectedWrongSubject}
                onChange={(e) => setSelectedWrongSubject(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                }}
              >
                <option value="ALL">Tất cả các môn</option>
                {subjectList.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>

              <button
                className="primary-btn"
                style={{ background: "#e65100" }}
                onClick={startWrongQuestionsPractice}
              >
                🎯 Ôn luyện{" "}
                {selectedWrongSubject === "ALL" ? "tất cả" : "môn này"}
              </button>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {wrongQuestionsBank
                .filter(
                  (q) =>
                    selectedWrongSubject === "ALL" ||
                    q.subjectId === selectedWrongSubject,
                )
                .map((item, idx) => (
                  <div
                    key={idx}
                    className="question-card"
                    style={{ borderLeft: "6px solid #e65100" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "10px",
                      }}
                    >
                      <span
                        style={{
                          background: "#fff3e0",
                          color: "#e65100",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        📚 Môn: {item.subjectName} • 📄 Đề: {item.examName}
                      </span>
                      <small style={{ color: "#888" }}>
                        Ngày lưu: {item.savedAt}
                      </small>
                    </div>

                    <h3 style={{ fontSize: "16px", marginBottom: "12px" }}>
                      <b>Câu {idx + 1}:</b> {item.questionText}
                    </h3>

                    <div className="options">
                      {item.options.map((opt, oIdx) => {
                        const isUserAns = item.userAnswer === oIdx;
                        const isCorrectAns = item.correctAnswer === oIdx;

                        return (
                          <div
                            key={oIdx}
                            className="option"
                            style={{
                              background: isUserAns
                                ? "#ffebee"
                                : isCorrectAns
                                  ? "#e8f5e9"
                                  : "",
                              borderColor: isUserAns
                                ? "#d32f2f"
                                : isCorrectAns
                                  ? "#2e7d32"
                                  : "",
                              cursor: "default",
                            }}
                          >
                            <span className="option-letter">
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <span style={{ flex: 1 }}>{opt}</span>
                            {isUserAns && (
                              <span
                                style={{ color: "#d32f2f", fontWeight: "bold" }}
                              >
                                ✗ Lần trước chọn sai
                              </span>
                            )}
                            {isCorrectAns && (
                              <span
                                style={{ color: "#2e7d32", fontWeight: "bold" }}
                              >
                                ✓ Đáp án đúng
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* MODAL POPUP DANH SÁCH CÂU HỎI */}
        {showQuestionGridModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowQuestionGridModal(false)}
          >
            <div
              className="modal-content"
              style={{ maxWidth: "520px", width: "90%" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>
                  📌 Danh Sách Câu Hỏi ({answeredCount}/{questions.length})
                </h2>
                <button
                  className="close-btn"
                  onClick={() => setShowQuestionGridModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <div
                  style={{
                    display: "flex",
                    gap: "15px",
                    marginBottom: "15px",
                    fontSize: "13px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <span
                      style={{
                        width: "14px",
                        height: "14px",
                        background: "#00a758",
                        borderRadius: "3px",
                        display: "inline-block",
                      }}
                    ></span>
                    <span>Đã làm</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <span
                      style={{
                        width: "14px",
                        height: "14px",
                        background: "#ffffff",
                        border: "1px solid #ccc",
                        borderRadius: "3px",
                        display: "inline-block",
                      }}
                    ></span>
                    <span>Chưa làm</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <span
                      style={{
                        width: "14px",
                        height: "14px",
                        background: "#e8f5e9",
                        border: "2px solid #00a758",
                        borderRadius: "3px",
                        display: "inline-block",
                      }}
                    ></span>
                    <span>Đang xem</span>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(45px, 1fr))",
                    gap: "8px",
                    maxHeight: "350px",
                    overflowY: "auto",
                    padding: "4px",
                  }}
                >
                  {questions.map((_, idx) => {
                    const isAnswered = answers[idx] !== undefined;
                    const isCurrent = current === idx;

                    let bgColor = "#ffffff";
                    let textColor = "#333333";
                    let borderColor = "#e0e0e0";

                    if (isAnswered) {
                      bgColor = "#00a758";
                      textColor = "#ffffff";
                      borderColor = "#00a758";
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setCurrent(idx);
                          setShowQuestionGridModal(false);
                        }}
                        style={{
                          height: "42px",
                          borderRadius: "8px",
                          border: isCurrent
                            ? "2px solid #000000"
                            : `1px solid ${borderColor}`,
                          background: bgColor,
                          color: textColor,
                          fontWeight:
                            isCurrent || isAnswered ? "bold" : "normal",
                          fontSize: "14px",
                          cursor: "pointer",
                          boxShadow: isCurrent ? "0 0 0 2px #00a758" : "none",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="primary-btn"
                  onClick={() => setShowQuestionGridModal(false)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL NHẬP THÔNG TIN HỌC VIÊN / MÃ SỐ ĐẠI LÝ */}
      {showStudentModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "420px" }}>
            <div className="modal-header">
              <h2>📝 Thông Tin Học Viên</h2>
              <button
                className="close-btn"
                onClick={() => {
                  setShowStudentModal(false);
                  setPendingExam(null);
                }}
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveStudentInfo();
              }}
            >
              <div className="modal-body">
                {pendingExam && (
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#e65100",
                      background: "#fff3e0",
                      padding: "10px",
                      borderRadius: "8px",
                    }}
                  >
                    📌 Vui lòng nhập thông tin để ghi nhận bài thi "
                    <b>{pendingExam.name}</b>"
                  </div>
                )}
                <div className="form-group">
                  <label>Mã Số Đại Lý (Duy nhất):</label>
                  <input
                    type="text"
                    value={agentCodeInput}
                    onChange={(e) => setAgentCodeInput(e.target.value)}
                    placeholder="Ví dụ: DL123456"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Họ Và Tên Học Viên:</label>
                  <input
                    type="text"
                    value={studentNameInput}
                    onChange={(e) => setStudentNameInput(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setShowStudentModal(false);
                    setPendingExam(null);
                  }}
                >
                  Hủy
                </button>
                <button type="submit" className="primary-btn">
                  Lưu & Làm Bài
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ĐĂNG NHẬP ADMIN */}
      {showAdminLoginModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "400px" }}>
            <div className="modal-header">
              <h2>🔒 Đăng Nhập Quản Trị</h2>
              <button
                className="close-btn"
                onClick={() => setShowAdminLoginModal(false)}
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAdminLogin();
              }}
            >
              <div className="modal-body">
                <div className="form-group">
                  <label>Tài khoản Admin:</label>
                  <input
                    type="text"
                    value={adminUsernameInput}
                    onChange={(e) => setAdminUsernameInput(e.target.value)}
                    placeholder="Tên tài khoản..."
                  />
                </div>
                <div className="form-group">
                  <label>Mật khẩu Admin:</label>
                  <input
                    type="password"
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    placeholder="Mật khẩu..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowAdminLoginModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="primary-btn">
                  Xác thực Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>➕ Import Đề Thi Mới</h2>
              <button
                className="close-btn"
                onClick={() => setShowImportModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>1. Chọn Môn Học:</label>
                <select
                  value={importSubject}
                  onChange={(e) => setImportSubject(e.target.value)}
                >
                  {subjectList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.subtitle})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>2. Tên Đề Thi:</label>
                <input
                  type="text"
                  placeholder="Tên đề hiển thị"
                  value={importTitle}
                  onChange={(e) => setImportTitle(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>3. Thời Gian Làm Bài (Phút):</label>
                <input
                  type="number"
                  value={importDuration}
                  onChange={(e) => setImportDuration(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>4. Chọn File Đề Thi (.docx hoặc .pdf):</label>
                <label
                  className={`file-upload-box ${isDragging ? "dragging" : ""}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="upload-icon">📁</div>
                  <div>
                    <b>Bấm vào đây để chọn file</b> hoặc kéo thả file vào đây
                  </div>
                  <small
                    style={{
                      color: "#777",
                      marginTop: "4px",
                      display: "block",
                    }}
                  >
                    Hỗ trợ file Word (.docx) và PDF (.pdf)
                  </small>
                  <input
                    type="file"
                    accept=".docx, .pdf"
                    onChange={handleFileSelect}
                  />
                </label>
              </div>

              {isLoading && <div className="loading">Đang đọc câu hỏi...</div>}
              {importError && <div className="error-msg">{importError}</div>}

              {parsedQuestions.length > 0 && (
                <div className="preview-container">
                  <div className="preview-header">
                    <h3>🔍 Danh sách câu hỏi ({parsedQuestions.length} câu)</h3>
                    <button
                      className="ghost-btn"
                      style={{ padding: "4px 8px", fontSize: "11px" }}
                      onClick={() =>
                        setOpenAccordion(openAccordion === "ALL" ? null : "ALL")
                      }
                    >
                      {openAccordion === "ALL" ? "Thu gọn" : "Mở rộng"}
                    </button>
                  </div>
                  <div style={{ maxHeight: "280px", overflowY: "auto" }}>
                    {parsedQuestions.map((q, idx) => {
                      const isOpen =
                        openAccordion === "ALL" || openAccordion === idx;
                      return (
                        <div key={idx} className="accordion-item">
                          <div
                            className="accordion-title"
                            onClick={() =>
                              setOpenAccordion(
                                openAccordion === idx ? null : idx,
                              )
                            }
                          >
                            <span>
                              <b>Câu {idx + 1}:</b> {q.text.substring(0, 50)}...
                            </span>
                            <span>{isOpen ? "▲" : "▼"}</span>
                          </div>
                          {isOpen && (
                            <div className="accordion-content">
                              <p style={{ margin: 0 }}>
                                <b>Nội dung:</b> {q.text}
                              </p>
                              {q.options.map((opt, oIdx) => (
                                <div
                                  key={oIdx}
                                  className={`preview-opt ${q.answer === oIdx ? "correct" : ""}`}
                                  onClick={() => {
                                    const updated = [...parsedQuestions];
                                    updated[idx].answer = oIdx;
                                    setParsedQuestions(updated);
                                  }}
                                >
                                  <span>
                                    <b>{String.fromCharCode(65 + oIdx)}.</b>{" "}
                                    {opt}
                                  </span>
                                  {q.answer === oIdx && (
                                    <span className="badge">✓ Đúng</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="secondary-btn"
                onClick={() => setShowImportModal(false)}
              >
                Hủy
              </button>
              <button
                className="primary-btn"
                disabled={!parsedQuestions.length || !importTitle || isLoading}
                onClick={handleSaveImport}
              >
                ☁️ Lưu Lên Hệ Thống
              </button>
            </div>
          </div>
        </div>
      )}

      {showSubjectModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "420px" }}>
            <div className="modal-header">
              <h2>➕ Thêm Môn Học Mới</h2>
              <button
                className="close-btn"
                onClick={() => setShowSubjectModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Tên Môn Học:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Bảo Hiểm Đầu Tư"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Mô Tả Ngắn:</label>
                <input
                  type="text"
                  placeholder="Mô tả..."
                  value={newSubSub}
                  onChange={(e) => setNewSubSub(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="secondary-btn"
                onClick={() => setShowSubjectModal(false)}
              >
                Hủy
              </button>
              <button className="primary-btn" onClick={handleAddSubject}>
                Tạo Môn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN CHUNG */}
      {confirmModal && (
        <div className="modal-overlay">
          <div className="confirm-modal-content">
            <div className="confirm-icon">⚠️</div>
            <h3>{confirmModal.title}</h3>
            <p>{confirmModal.message}</p>
            <div className="confirm-actions">
              <button
                className="secondary-btn"
                onClick={() => setConfirmModal(null)}
              >
                Hủy bỏ
              </button>
              <button
                className={
                  confirmModal.danger !== false ? "danger-btn" : "primary-btn"
                }
                onClick={() => {
                  const action = confirmModal.onConfirm;
                  setConfirmModal(null);
                  if (action) action();
                }}
              >
                {confirmModal.confirmText || "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer>
        Ôn Thi Thông Minh là nền tảng hỗ trợ luyện đề tự động.
        <small>
          © 2026 • Hệ thống có thể cần kiểm tra lại đáp án ở các trường hợp đặc
          biệt.
        </small>
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
