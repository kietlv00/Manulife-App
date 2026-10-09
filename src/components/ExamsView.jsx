import React from "react";

export function ExamsView({
  subjectInfo,
  currentStudent,
  isFetching,
  currentExamList,
  isAdmin,
  onResetHome,
  onExamClick,
  onOpenEditExam,
  onDeleteExam,
}) {
  return (
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
        <button className="secondary-btn" onClick={() => onResetHome(false)}>
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
              <div className="exam-no">{String(i + 1).padStart(2, "0")}</div>
              <div
                className="exam-content"
                onClick={() => onExamClick(exam)}
                style={{ cursor: "pointer" }}
              >
                <strong>{exam.name}</strong>
                <span>
                  {exam.questions?.length || 0} câu • {exam.duration || 60} phút
                </span>
              </div>

              {isAdmin && (
                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    className="ghost-btn"
                    style={{ padding: "5px 8px" }}
                    onClick={() => onOpenEditExam(exam)}
                  >
                    ✏️
                  </button>
                  <button
                    className="danger-btn"
                    style={{ padding: "5px 8px" }}
                    onClick={() => onDeleteExam(exam.id)}
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
  );
}
