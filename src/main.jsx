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

  const [isAdmin, setIsAdmin] = useState(
    () => localStorage.getItem("MANULIFE_ADMIN") === "true",
  );
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("MANULIFE_USER");
    return saved ? JSON.parse(saved) : null;
  });

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginMode, setLoginMode] = useState("user");
  const [pendingExam, setPendingExam] = useState(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");

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
    const handleBeforeUnload = () => {};
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [currentUser]);

  // 2. TỰ ĐỘNG BẢO VỆ MÀN HÌNH LÀM BÀI/KẾT QUẢ/KHO CÂU SAI
  // Chỉ tự động điều hướng nếu người dùng CHƯA ĐĂNG NHẬP mà cố tình vào các màn hình bảo vệ
  useEffect(() => {
    if (
      (screen === "exam" ||
        screen === "result" ||
        screen === "wrong-bank-view") &&
      !currentUser
    ) {
      resetHome(true);
    }
  }, [screen, currentUser]);

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
    startExam(customExam, currentUser);
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

  async function verifyUserSession() {
    if (!currentUser) {
      notify("Vui lòng đăng nhập để tiếp tục!", "error");
      processLogout();
      return false;
    }

    try {
      const { data, error } = await supabase
        .from("users")
        .select("session_id")
        .eq("username", currentUser.username)
        .single();

      if (error || !data) return true;

      if (data.session_id && data.session_id !== currentUser.sessionId) {
        notify(
          "Tài khoản của bạn đã được đăng nhập từ một thiết bị khác!",
          "error",
        );
        processLogout();
        return false;
      }
      return true;
    } catch (err) {
      return true;
    }
  }

  async function handleLogin() {
    if (!usernameInput || !passwordInput)
      return notify("Vui lòng nhập tài khoản và mật khẩu!", "error");

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", usernameInput.trim())
        .eq("password", passwordInput.trim())
        .single();

      if (error || !data) {
        return notify("Tài khoản hoặc mật khẩu không chính xác!", "error");
      }

      const SESSION_TIMEOUT = 10 * 60 * 1000;

      if (data.session_id) {
        const parts = data.session_id.split("_");
        const lastActiveTime = Number(parts[1]);
        const now = Date.now();

        if (lastActiveTime && now - lastActiveTime < SESSION_TIMEOUT) {
          return notify(
            "Tài khoản này đang được đăng nhập ở nơi khác! Vui lòng chờ thiết bị đó đăng xuất hoặc hết phiên.",
            "error",
          );
        }
      }

      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

      const { error: updateError } = await supabase
        .from("users")
        .update({ session_id: newSessionId })
        .eq("username", data.username);

      if (updateError) {
        return notify(
          "Không thể lưu phiên đăng nhập: " + updateError.message,
          "error",
        );
      }

      if (loginMode === "admin") {
        setIsAdmin(true);
        localStorage.setItem("MANULIFE_ADMIN", "true");
        notify("Đăng nhập Admin thành công!");
      } else {
        notify("Đăng nhập thành công!");
      }

      const userObj = {
        username: data.username,
        name: data.name || data.username,
        role: data.role || (loginMode === "admin" ? "admin" : "user"),
        sessionId: newSessionId,
      };

      setCurrentUser(userObj);
      localStorage.setItem("MANULIFE_USER", JSON.stringify(userObj));

      setShowLoginModal(false);
      setUsernameInput("");
      setPasswordInput("");

      if (pendingExam) {
        const examToStart = pendingExam;
        setPendingExam(null);
        startExam(examToStart, userObj);
      }
    } catch (err) {
      notify("Lỗi xác thực: " + err.message, "error");
    }
  }

  async function refreshSessionTimestamp() {
    if (!currentUser) return;

    const newSessionId = `session_${Date.now()}_${currentUser.sessionId.split("_")[2] || "active"}`;

    await supabase
      .from("users")
      .update({ session_id: newSessionId })
      .eq("username", currentUser.username);

    const updatedUser = { ...currentUser, sessionId: newSessionId };
    setCurrentUser(updatedUser);
    localStorage.setItem("MANULIFE_USER", JSON.stringify(updatedUser));
  }

  useEffect(() => {
    if (screen !== "exam" || !currentUser) return;

    const interval = setInterval(
      () => {
        refreshSessionTimestamp();
      },
      2 * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, [screen, currentUser]);

  // HÀM XỬ LÝ ĐĂNG XUẤT CÓ BẢO VỆ KHI ĐANG LÀM BÀI
  function handleLogout() {
    if (screen === "exam") {
      setConfirmModal({
        title: "Xác nhận đăng xuất?",
        message:
          "Bạn đang trong quá trình làm bài thi. Đăng xuất lúc này sẽ hủy bỏ kết quả bài làm hiện tại!",
        confirmText: "Đăng xuất & Hủy bài",
        danger: true,
        onConfirm: async () => {
          await processLogout();
        },
      });
      return;
    }

    processLogout();
  }

  async function processLogout() {
    if (currentUser) {
      await supabase
        .from("users")
        .update({ session_id: null })
        .eq("username", currentUser.username);
    }

    setIsAdmin(false);
    setCurrentUser(null);
    localStorage.removeItem("MANULIFE_ADMIN");
    localStorage.removeItem("MANULIFE_USER");

    resetHome(true);
    notify("Đã đăng xuất tài khoản!");
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

  async function handleExamClick(exam) {
    if (!currentUser) {
      notify("Bạn cần đăng nhập tài khoản trước khi vào thi!", "error");
      setPendingExam(exam);
      setLoginMode("user");
      setShowLoginModal(true);
      return;
    }

    const isValid = await verifyUserSession();
    if (!isValid) return;

    startExam(exam, currentUser);
  }

  function startExam(exam, user) {
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

  async function handleNavigateQuestion(step) {
    const isValid = await verifyUserSession();
    if (!isValid) return;

    setCurrent((c) => Math.min(Math.max(0, c + step), questions.length - 1));
  }

  async function finishExam(auto = false) {
    if (auto) {
      executeSubmit();
      return;
    }

    const isValid = await verifyUserSession();
    if (!isValid) return;

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

  function executeSubmit() {
    const score = questions.reduce((sum, q, idx) => {
      return sum + (answers[idx] === q.answer ? 1 : 0);
    }, 0);

    saveWrongQuestions(questions, answers, selectedExam, subjectInfo);

    setResult({
      score,
      total: questions.length,
      auto: false,
      timeUsed: (selectedExam.duration || 60) * 60 - secondsLeft,
    });
    setScreen("result");
  }

  // HÀM VỀ TRANG CHỦ CÓ HỎI XÁC NHẬN NẾU ĐANG THI
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
          {currentUser ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                className="admin-badge"
                style={{
                  background: "#e8f5e9",
                  color: "#2e7d32",
                  borderColor: "#c8e6c9",
                }}
              >
                👤 {currentUser.name || currentUser.username}{" "}
                {isAdmin ? "(Admin)" : ""}
              </span>
              {isAdmin && (
                <button
                  className="import-btn"
                  onClick={() => setShowImportModal(true)}
                >
                  <span>➕</span> Import Đề
                </button>
              )}
              <button className="ghost-btn" onClick={handleLogout}>
                Đăng xuất
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="primary-btn"
                onClick={() => {
                  setLoginMode("user");
                  setShowLoginModal(true);
                }}
              >
                🔑 Đăng nhập
              </button>
              <button
                className="secondary-btn"
                onClick={() => {
                  setLoginMode("admin");
                  setShowLoginModal(true);
                }}
              >
                🔒 Admin
              </button>
            </div>
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

            {/* THẺ NGÂN HÀNG CÂU HỎI SAI - CHỈ HIỂN THỊ KHIN ĐÃ ĐĂNG NHẬP VÀ CÓ CÂU SAI */}
            {currentUser && wrongQuestionsBank.length > 0 && (
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
                  {currentUser
                    ? "Chọn một đề thi để bắt đầu luyện tập trực tiếp."
                    : "⚠️ Vui lòng đăng nhập để bắt đầu làm bài thi."}
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
                  Thí sinh: <b>{currentUser?.name || currentUser?.username}</b>
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

        {screen === "result" && result && (
          <div className="result-container">
            <div className="result-card-main">
              <div style={{ fontSize: "36px" }}>
                {result.score / result.total >= 0.75 ? "🎉" : "📚"}
              </div>
              <span className="eyebrow">KẾT QUẢ BÀI THI CỦA BẠN</span>

              <div className="score-circle">
                <strong>{result.score}</strong>
                <span>/ {result.total} CÂU</span>
              </div>

              <h3 style={{ margin: "8px 0 4px" }}>
                {result.score / result.total >= 0.75
                  ? "Chúc mừng! Bạn đã ĐẠT bài thi."
                  : "Cần cố gắng thêm ở lần sau!"}
              </h3>
              <p style={{ color: "#666", fontSize: "13px" }}>
                Thí sinh: <b>{currentUser?.name || currentUser?.username}</b> •
                Tỷ lệ trả lời chính xác:{" "}
                <b>{Math.round((result.score / result.total) * 100)}%</b>
              </p>

              <div className="result-stats-row">
                <div className="stat-box">
                  <strong style={{ color: "#00a758" }}>{result.score}</strong>
                  <span>Câu đúng</span>
                </div>
                <div className="stat-box">
                  <strong style={{ color: "#e53935" }}>
                    {result.total - result.score}
                  </strong>
                  <span>Câu sai</span>
                </div>
                <div className="stat-box">
                  <strong>
                    {Math.floor(result.timeUsed / 60)}' {result.timeUsed % 60}s
                  </strong>
                  <span>Thời gian</span>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  className="primary-btn"
                  style={{ background: "#0288d1" }}
                  onClick={() => setScreen("review")}
                >
                  🔍 Xem lại bài làm
                </button>
                <button
                  className="secondary-btn"
                  onClick={() => startExam(selectedExam, currentUser)}
                >
                  ↻ Làm lại đề này
                </button>
                <button
                  className="secondary-btn"
                  onClick={() => setScreen("exams")}
                >
                  Chọn đề khác →
                </button>
              </div>
            </div>
          </div>
        )}

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
                            {isUserSelected && !isAnswerRight && (
                              <span
                                style={{ color: "#d32f2f", fontWeight: "bold" }}
                              >
                                ✗ Bạn chọn
                              </span>
                            )}
                            {isAnswerRight && (
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

        {/* MODAL POPUP DANH SÁCH CÂU HỎI (1 - N) */}
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
                        onClick={async () => {
                          const isValid = await verifyUserSession();
                          if (isValid) {
                            setCurrent(idx);
                            setShowQuestionGridModal(false);
                          }
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

      {/* Modal Đăng Nhập */}
      {showLoginModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "400px" }}>
            <div className="modal-header">
              <h2>
                {loginMode === "admin"
                  ? "🔒 Đăng Nhập Quản Trị"
                  : "🔑 Đăng Nhập Tài Khoản"}
              </h2>
              <button
                className="close-btn"
                onClick={() => {
                  setShowLoginModal(false);
                  setPendingExam(null);
                }}
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
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
                    📌 Bạn cần đăng nhập để bắt đầu làm bài thi "
                    <b>{pendingExam.name}</b>"
                  </div>
                )}
                <div className="form-group">
                  <label>Tên đăng nhập:</label>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Nhập tên tài khoản..."
                  />
                </div>
                <div className="form-group">
                  <label>Mật khẩu:</label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Nhập mật khẩu..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setShowLoginModal(false);
                    setPendingExam(null);
                  }}
                >
                  Hủy
                </button>
                <button type="submit" className="primary-btn">
                  Đăng nhập
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

      {/* MODAL XÁC NHẬN CHUNG (DÙNG CHO XÓA, NỘP BÀI, RỜI BÀI, ĐĂNG XUẤT) */}
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
