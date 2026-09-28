import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { extractTextFromFile, parseExamContent } from "./parser";
import { supabase } from "./supabase";

function App() {
  const [isDragging, setIsDragging] = useState(false);

  // Hàm xử lý file chung (cho cả Click chọn file & Kéo thả file)
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

  const [confirmModal, setConfirmModal] = useState(null);

  const [toast, setToast] = useState(null);

  function notify(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

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
  const [answers, setAnswers] = useState({}); // Dạng { [indexQuestion]: indexOption }
  const [current, setCurrent] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(60 * 60);
  const [result, setResult] = useState(null);

  // Khôi phục quyền Admin từ LocalStorage
  const [isAdmin, setIsAdmin] = useState(
    () => localStorage.getItem("MANULIFE_ADMIN") === "true",
  );
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");

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

  async function handleLogin() {
    if (!adminUser || !adminPass)
      return notify("Vui lòng nhập tài khoản và mật khẩu!", "error");

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", adminUser.trim())
        .eq("password", adminPass.trim())
        .single();

      if (error || !data) {
        notify("Tài khoản hoặc mật khẩu không chính xác!", "error");
      } else {
        setIsAdmin(true);
        localStorage.setItem("MANULIFE_ADMIN", "true");
        setShowLoginModal(false);
        setAdminUser("");
        setAdminPass("");
        notify("Đăng nhập Admin thành công!");
      }
    } catch (err) {
      notify("Lỗi xác thực: " + err.message, "error");
    }
  }

  function handleLogout() {
    setIsAdmin(false);
    localStorage.removeItem("MANULIFE_ADMIN");
    notify("Đã đăng xuất tài khoản Admin.");
    window.location.href = "/";
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

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

  // Xóa Đề Thi vĩnh viễn trên Supabase
  async function handleDeleteExam(examId) {
    setConfirmModal({
      title: "Xác nhận xóa đề thi?",
      message:
        "Bạn có chắc chắn muốn xóa vĩnh viễn đề thi này khỏi Database không?",
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

  // Chọn đáp án cực nhạy theo vị trí chỉ số (index) câu hỏi
  function handleSelectOption(optIdx) {
    setAnswers((prev) => ({
      ...prev,
      [current]: optIdx,
    }));
  }

  function finishExam(auto = false) {
    const score = questions.reduce((sum, q, idx) => {
      return sum + (answers[idx] === q.answer ? 1 : 0);
    }, 0);

    setResult({
      score,
      total: questions.length,
      auto,
      timeUsed: (selectedExam.duration || 60) * 60 - secondsLeft,
    });
    setScreen("result");
  }

  function resetHome() {
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
        <div className="brand" onClick={resetHome}>
          <div className="brand-mark">M</div>
          <div>
            <div className="brand-title">ÔN THI THÔNG MINH</div>
            <div className="brand-sub">Hệ thống Luyện Đề Trực Tuyến</div>
          </div>
        </div>
        <div className="topbar-actions">
          {isAdmin ? (
            <>
              <span className="admin-badge">👑 Admin</span>
              <button
                className="import-btn"
                onClick={() => setShowImportModal(true)}
              >
                <span>➕</span> Import Đề
              </button>
              <button className="ghost-btn" onClick={handleLogout}>
                Đăng xuất
              </button>
            </>
          ) : (
            <button
              className="secondary-btn"
              onClick={() => setShowLoginModal(true)}
            >
              🔒 Đăng nhập Admin
            </button>
          )}
          {screen !== "home" && (
            <button className="ghost-btn" onClick={resetHome}>
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
                <p>Chọn một đề thi để bắt đầu luyện tập trực tiếp.</p>
              </div>
              <button className="secondary-btn" onClick={resetHome}>
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
                      onClick={() => startExam(exam)}
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

        {/* Màn hình Thi thử: Chọn Đáp án cực nhạy */}
        {screen === "exam" && currentQuestion && (
          <div className="exam-page">
            <div className="exam-header">
              <div>
                <span className="eyebrow">{subjectInfo?.name}</span>
                <h1>{selectedExam?.name}</h1>
              </div>
              <div className={`timer ${secondsLeft < 300 ? "danger" : ""}`}>
                ⏱ {formattedTime}
              </div>
            </div>

            <div
              style={{ margin: "15px 0 8px", fontSize: "13px", color: "#666" }}
            >
              Câu {current + 1} / {questions.length}
            </div>
            <div
              style={{
                height: "6px",
                background: "#e0ede8",
                borderRadius: "10px",
                overflow: "hidden",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  width: `${((current + 1) / questions.length) * 100}%`,
                  height: "100%",
                  background: "#00a758",
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
                onClick={() => setCurrent((c) => c - 1)}
              >
                ← Câu trước
              </button>
              <button className="finish-btn" onClick={() => finishExam(false)}>
                Nộp bài ngay
              </button>
              {current < questions.length - 1 ? (
                <button
                  className="primary-btn"
                  onClick={() => setCurrent((c) => c + 1)}
                >
                  Câu tiếp →
                </button>
              ) : (
                <button
                  className="primary-btn"
                  onClick={() => finishExam(false)}
                >
                  Hoàn tất →
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
                  className="secondary-btn"
                  onClick={() => startExam(selectedExam)}
                >
                  ↻ Làm lại đề này
                </button>
                <button
                  className="primary-btn"
                  onClick={() => setScreen("exams")}
                >
                  Chọn đề khác →
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal Đăng nhập Admin */}
      {showLoginModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "400px" }}>
            <div className="modal-header">
              <h2>🔒 Đăng Nhập Quản Trị</h2>
              <button
                className="close-btn"
                onClick={() => setShowLoginModal(false)}
              >
                ✕
              </button>
            </div>
            {/* Sử dụng thẻ form để bắt sự kiện Enter tự động Submit */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
            >
              <div className="modal-body">
                <div className="form-group">
                  <label>Tên đăng nhập:</label>
                  <input
                    type="text"
                    value={adminUser}
                    onChange={(e) => setAdminUser(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Mật khẩu:</label>
                  <input
                    type="password"
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowLoginModal(false)}
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

      {/* Modal Xác Nhận (Confirm Dialog Custom) */}
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
                className="danger-btn"
                onClick={() => {
                  const action = confirmModal.onConfirm;
                  setConfirmModal(null);
                  if (action) action();
                }}
              >
                Xác nhận xóa
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
