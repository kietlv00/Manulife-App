import React from "react";

export function Modals({
  showStudentModal,
  setShowStudentModal,
  agentCodeInput,
  setAgentCodeInput,
  studentNameInput,
  setStudentNameInput,
  handleSaveStudentInfo,
  pendingExam,
  setPendingExam,
  showAdminLoginModal,
  setShowAdminLoginModal,
  adminUsernameInput,
  setAdminUsernameInput,
  adminPasswordInput,
  setAdminPasswordInput,
  handleAdminLogin,
  showImportModal,
  setShowImportModal,
  importSubject,
  setImportSubject,
  importTitle,
  setImportTitle,
  importDuration,
  setImportDuration,
  subjectList,
  isDragging,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleFileSelect,
  isLoading,
  importError,
  parsedQuestions,
  setParsedQuestions,
  openAccordion,
  setOpenAccordion,
  handleSaveImport,
  showSubjectModal,
  setShowSubjectModal,
  newSubName,
  setNewSubName,
  newSubSub,
  setNewSubSub,
  handleAddSubject,
  confirmModal,
  setConfirmModal,
  showQuestionGridModal,
  setShowQuestionGridModal,
  questions,
  answers,
  current,
  setCurrent,
  answeredCount,
}) {
  return (
    <>
      {/* MODAL HỌC VIÊN */}
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

      {/* MODAL ADMIN LOGIN */}
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
                    placeholder=""
                  />
                </div>
                <div className="form-group">
                  <label>Mật khẩu Admin:</label>
                  <input
                    type="password"
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    placeholder=""
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

      {/* MODAL IMPORT ĐỀ */}
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
              {importError && (
                <div
                  className="error-msg"
                  style={{ color: "red", marginTop: "8px" }}
                >
                  {importError}
                </div>
              )}

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
                                  className={`preview-opt ${
                                    q.answer === oIdx ? "correct" : ""
                                  }`}
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

      {/* MODAL THÊM MÔN HỌC */}
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
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddSubject();
              }}
            >
              <div className="modal-body">
                <div className="form-group">
                  <label>Tên Môn Học:</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Bảo Hiểm Đầu Tư"
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    required
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
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowSubjectModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="primary-btn">
                  Tạo Môn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CÂU HỎI GRID */}
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
                          ? "2px solid #000"
                          : "1px solid #e0e0e0",
                        background: isAnswered ? "#00a758" : "#ffffff",
                        color: isAnswered ? "#ffffff" : "#333333",
                        fontWeight: isCurrent || isAnswered ? "bold" : "normal",
                        cursor: "pointer",
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
    </>
  );
}
