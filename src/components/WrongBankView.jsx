import React, { useMemo, useState } from "react";

export function WrongBankView({
  currentStudent,
  wrongQuestionsBank,
  subjectList,
  examBank = {},
  onStartWrongPractice,
  onClearWrongBank,
  onResetHome,
}) {
  const [selectedSubject, setSelectedSubject] = useState("ALL");
  const [selectedExam, setSelectedExam] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

  const availableExams = useMemo(() => {
    if (selectedSubject === "ALL") {
      return Object.values(examBank).flat();
    }
    return examBank[selectedSubject] || [];
  }, [selectedSubject, examBank]);

  const filteredList = useMemo(() => {
    return wrongQuestionsBank.filter((item) => {
      const matchSub =
        selectedSubject === "ALL" || item.subjectId === selectedSubject;
      const matchExam =
        selectedExam === "ALL" || String(item.examId) === String(selectedExam);
      const term = searchTerm.trim().toLowerCase();
      const matchSearch =
        !term ||
        [item.questionText, item.examName, item.subjectName]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(term));

      return matchSub && matchExam && matchSearch;
    });
  }, [wrongQuestionsBank, selectedSubject, selectedExam, searchTerm]);

  const pageCount = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const paginatedList = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, page, pageSize]);

  // Component phân trang dùng chung
  const renderPaginationBar = (customStyle = {}) => (
    <div
      className="stats-pagination"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 0",
        ...customStyle,
      }}
    >
      <label className="stats-page-size">
        Hiển thị:
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
          style={{ marginLeft: "8px" }}
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size} câu / trang
            </option>
          ))}
        </select>
      </label>

      <span>
        {`${(page - 1) * pageSize + 1}–${Math.min(
          page * pageSize,
          filteredList.length,
        )} / ${filteredList.length} câu sai`}
      </span>

      <div>
        <button
          className="secondary-btn"
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          ← Trước
        </button>
        <span className="stats-page-number" style={{ margin: "0 8px" }}>
          {page} / {pageCount}
        </span>
        <button
          className="secondary-btn"
          disabled={page >= pageCount}
          onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
        >
          Sau →
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow" style={{ color: "#e65100" }}>
            KHO TỰ ÔN TẬP
          </span>
          <h1>Ngân Hàng Câu Sai Của Bạn</h1>
          <p>
            Đại lý: <b>{currentStudent?.name}</b> ({currentStudent?.agentCode})
            • Tổng cộng {wrongQuestionsBank.length} câu đã từng làm chưa chính
            xác.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            className="primary-btn"
            style={{ background: "#e65100" }}
            onClick={onStartWrongPractice}
          >
            🎯 Ôn lại ngay ({filteredList.length} câu)
          </button>
          <button className="secondary-btn" onClick={onResetHome}>
            ← Trang chủ
          </button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "20px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          placeholder="🔍 Tìm kiếm câu hỏi, đề thi..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
          style={{
            padding: "10px 14px",
            borderRadius: "10px",
            border: "1px solid #ccc",
            flex: 1,
            minWidth: "220px",
          }}
        />

        <select
          value={selectedSubject}
          onChange={(e) => {
            setSelectedSubject(e.target.value);
            setSelectedExam("ALL");
            setPage(1);
          }}
          style={{
            padding: "10px 14px",
            borderRadius: "10px",
            border: "1px solid #ccc",
          }}
        >
          <option value="ALL">Tất cả môn học</option>
          {subjectList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          value={selectedExam}
          onChange={(e) => {
            setSelectedExam(e.target.value);
            setPage(1);
          }}
          style={{
            padding: "10px 14px",
            borderRadius: "10px",
            border: "1px solid #ccc",
            maxWidth: "220px",
          }}
        >
          <option value="ALL">Tất cả đề thi</option>
          {availableExams.map((exam) => (
            <option key={exam.id} value={String(exam.id)}>
              {exam.name}
            </option>
          ))}
        </select>

        <button
          className="danger-btn"
          style={{ padding: "10px 14px", fontSize: "13px" }}
          onClick={onClearWrongBank}
        >
          🗑️ Ẩn danh sách
        </button>
      </div>

      {filteredList.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            background: "#fff",
            borderRadius: "12px",
            border: "1px solid #eee",
          }}
        >
          <p style={{ fontSize: "16px", color: "#666" }}>
            🎉 Không tìm thấy câu hỏi sai nào phù hợp với bộ lọc!
          </p>
        </div>
      ) : (
        <>
          {/* ✨ THANH PHÂN TRANG PHÍA TRÊN */}
          {renderPaginationBar({
            marginBottom: "16px",
            borderBottom: "1px solid #e0e0e0",
            paddingBottom: "16px",
          })}

          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {paginatedList.map((item, idx) => (
              <div
                key={item.dbId || idx}
                className="question-card"
                style={{ borderLeft: "6px solid #e65100" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px",
                    flexWrap: "wrap",
                    gap: "8px",
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
                    📚 Môn: {item.subjectName} • 📄 {item.examName}
                  </span>
                  <small style={{ color: "#888" }}>
                    Lần sai gần nhất: {item.savedAt}
                  </small>
                </div>

                <h3 style={{ fontSize: "16px", marginBottom: "12px" }}>
                  {(page - 1) * pageSize + idx + 1}. {item.questionText}
                </h3>

                <div className="options">
                  {(item.options || []).map((opt, oIdx) => {
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
                            style={{
                              color: "#d32f2f",
                              fontWeight: "bold",
                              fontSize: "12px",
                            }}
                          >
                            ✗ Bạn chọn câu này
                          </span>
                        )}
                        {isCorrectAns && (
                          <span
                            style={{
                              color: "#2e7d32",
                              fontWeight: "bold",
                              fontSize: "12px",
                            }}
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

          {/* THANH PHÂN TRANG PHÍA DƯỚI */}
          {renderPaginationBar({
            marginTop: "24px",
            paddingTop: "16px",
            borderTop: "1px solid #e0e0e0",
          })}
        </>
      )}
    </div>
  );
}
