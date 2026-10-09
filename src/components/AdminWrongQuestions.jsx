import React, { useMemo, useState } from "react";

export function AdminWrongQuestions({
  isFetching,
  filteredList,
  subjectList,
  examBank = {},
  searchTerm,
  setSearchTerm,
  subjectFilter,
  setSubjectFilter,
  examFilter,
  setExamFilter,
  onRefresh,
  onBackHome,
  onDeleteOne,
}) {
  const [studentFilter, setStudentFilter] = useState("ALL");

  // State phân trang
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

  // 1. Lấy danh sách đề thi dựa trên môn học
  const availableExams = useMemo(() => {
    if (subjectFilter === "ALL") {
      return Object.values(examBank).flat();
    }
    return examBank[subjectFilter] || [];
  }, [subjectFilter, examBank]);

  // 2. Lọc câu sai theo Đề thi
  const listAfterExamFilter = useMemo(() => {
    if (examFilter === "ALL") return filteredList;
    return filteredList.filter(
      (item) => String(item.exam_id) === String(examFilter),
    );
  }, [filteredList, examFilter]);

  // 3. Trích xuất danh sách Học viên có câu sai
  const availableStudents = useMemo(() => {
    const map = new Map();
    listAfterExamFilter.forEach((item) => {
      if (item.agent_code && !map.has(item.agent_code)) {
        map.set(item.agent_code, {
          agentCode: item.agent_code,
          name: item.student_name || "Học viên",
        });
      }
    });
    return Array.from(map.values());
  }, [listAfterExamFilter]);

  // 4. Lọc theo Nút Học viên được chọn
  const finalFilteredList = useMemo(() => {
    if (studentFilter === "ALL") return listAfterExamFilter;
    return listAfterExamFilter.filter(
      (item) => item.agent_code === studentFilter,
    );
  }, [listAfterExamFilter, studentFilter]);

  // Phân trang
  const pageCount = Math.max(1, Math.ceil(finalFilteredList.length / pageSize));
  const paginatedList = useMemo(() => {
    const start = (page - 1) * pageSize;
    return finalFilteredList.slice(start, start + pageSize);
  }, [finalFilteredList, page, pageSize]);

  function handleSelectStudentTag(agentCode) {
    setStudentFilter(agentCode);
    setSearchTerm("");
    setPage(1);
  }

  function handleSearchChange(e) {
    setSearchTerm(e.target.value);
    setStudentFilter("ALL");
    setPage(1);
  }

  // Component thanh phân trang dùng chung
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
          finalFilteredList.length,
        )} / ${finalFilteredList.length} câu sai`}
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
            ADMIN CMS • KHÔI PHỤC & ÔN TẬP
          </span>
          <h1>Ngân Hàng Câu Sai Của Học Viên</h1>
          <p>
            Xem chi tiết các câu làm sai của học viên (Đã tự động gộp trùng
            lặp).
          </p>
        </div>
        <button className="secondary-btn" onClick={onBackHome}>
          ← Trang chủ
        </button>
      </div>

      {/* Bộ lọc */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "12px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          placeholder="🔍 Tìm mã đại lý, tên học viên, câu hỏi..."
          value={searchTerm}
          onChange={handleSearchChange}
          style={{
            padding: "10px 14px",
            borderRadius: "10px",
            border: "1px solid #ccc",
            flex: 1,
            minWidth: "220px",
          }}
        />

        <select
          value={subjectFilter}
          onChange={(e) => {
            setSubjectFilter(e.target.value);
            setExamFilter("ALL");
            setStudentFilter("ALL");
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
          value={examFilter}
          onChange={(e) => {
            setExamFilter(e.target.value);
            setStudentFilter("ALL");
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
          className="secondary-btn"
          onClick={() => {
            setStudentFilter("ALL");
            onRefresh();
          }}
        >
          🔄 Làm mới
        </button>
      </div>

      {/* Nút lọc Học viên (Quick Tags) */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "16px",
          flexWrap: "wrap",
          alignItems: "center",
          background: "#f9fbf9",
          padding: "10px 14px",
          borderRadius: "12px",
          border: "1px dashed #c8e6c9",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: "bold",
            color: "#555",
            marginRight: "4px",
          }}
        >
          👤 Lọc theo Học viên:
        </span>

        <button
          onClick={() => handleSelectStudentTag("ALL")}
          style={{
            padding: "5px 12px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "bold",
            border: "1px solid",
            cursor: "pointer",
            background: studentFilter === "ALL" ? "#00a758" : "#fff",
            color: studentFilter === "ALL" ? "#fff" : "#444",
            borderColor: studentFilter === "ALL" ? "#00a758" : "#ccc",
          }}
        >
          Tất cả ({listAfterExamFilter.length})
        </button>

        {availableStudents.map((st) => {
          const isSelected = studentFilter === st.agentCode;
          const count = listAfterExamFilter.filter(
            (i) => i.agent_code === st.agentCode,
          ).length;

          return (
            <button
              key={st.agentCode}
              onClick={() => handleSelectStudentTag(st.agentCode)}
              style={{
                padding: "5px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "bold",
                border: "1px solid",
                cursor: "pointer",
                background: isSelected ? "#e65100" : "#fff",
                color: isSelected ? "#fff" : "#2e7d32",
                borderColor: isSelected ? "#e65100" : "#a5d6a7",
              }}
            >
              {st.name} ({st.agentCode}) • {count} câu
            </button>
          );
        })}
      </div>

      {isFetching ? (
        <p>Đang tải dữ liệu câu sai từ Database...</p>
      ) : finalFilteredList.length === 0 ? (
        <p>Không tìm thấy dữ liệu câu sai phù hợp.</p>
      ) : (
        <>
          {/* ✨ THANH PHÂN TRANG ĐẶT PHÍA TRÊN CÂU HỎI ĐẦU TIÊN */}
          {renderPaginationBar({
            marginBottom: "16px",
            borderBottom: "1px solid #e0e0e0",
            paddingBottom: "16px",
          })}

          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {paginatedList.map((item) => (
              <div
                key={item.id}
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
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        background: "#e8f5e9",
                        color: "#2e7d32",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      👤 Đại Lý: {item.student_name || "N/A"} ({item.agent_code}
                      )
                    </span>
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
                      📚 Môn: {item.subject_name || "Môn thi"} • 📄{" "}
                      {item.exam_name}
                    </span>

                    {item.wrong_count > 1 && (
                      <span
                        style={{
                          background: "#ffebee",
                          color: "#c62828",
                          border: "1px solid #ef9a9a",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "800",
                        }}
                      >
                        ⚠️ Làm sai {item.wrong_count} lần
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <small style={{ color: "#888" }}>
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString("vi-VN")
                        : ""}
                    </small>
                    <button
                      className="danger-btn"
                      style={{ padding: "4px 8px", fontSize: "11px" }}
                      onClick={() => onDeleteOne(item.id)}
                    >
                      🗑️ Xóa
                    </button>
                  </div>
                </div>

                <h3 style={{ fontSize: "16px", marginBottom: "12px" }}>
                  {item.question_text}
                </h3>

                <div className="options">
                  {(item.options || []).map((opt, oIdx) => {
                    const isUserAns = item.user_answer === oIdx;
                    const isCorrectAns = item.correct_answer === oIdx;

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
                            ✗ Học viên chọn sai
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

          {/* THANH PHÂN TRANG Ở PHÍA DƯỚI BÊN DƯỚI DƯỚI BÁN TRANG */}
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
