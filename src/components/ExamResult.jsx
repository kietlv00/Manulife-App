import React from "react";

export function ExamResult({
  result,
  currentStudent,
  selectedExam,
  onRetryExam,
  onReviewExam,
  onResetHome,
}) {
  if (!result) return null;

  const PASS_PERCENTAGE = 0.75;
  const percentage = Math.round((result.score / result.total) * 100);
  const isPassed = percentage >= PASS_PERCENTAGE * 100;
  const passQuestionsCount = Math.ceil(result.total * PASS_PERCENTAGE);

  const minutes = Math.floor(result.timeUsed / 60);
  const seconds = result.timeUsed % 60;
  const timeFormatted = `${minutes}m ${seconds}s`;

  return (
    <div className="result-container">
      <div className="result-card-sample">
        <div className="result-mascot">{isPassed ? "🎉" : "💪"}</div>

        <div className={`status-badge ${isPassed ? "passed" : "failed"}`}>
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
          Đại lý: <b>{currentStudent?.name}</b> ({currentStudent?.agentCode}) •
          Đạt{" "}
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
              ≥ {passQuestionsCount}/{result.total} ({PASS_PERCENTAGE * 100}%)
            </strong>
          </div>
        </div>

        <div className="result-actions-row">
          <button
            className="action-btn retry-btn"
            onClick={() => onRetryExam(selectedExam)}
          >
            🔄 Làm Lại Đề Này
          </button>

          <button className="action-btn review-btn" onClick={onReviewExam}>
            📋 Xem Chi Tiết Đáp Án
          </button>

          <button
            className="action-btn home-btn"
            onClick={() => onResetHome(false)}
          >
            🏠 Về Trang Chủ
          </button>
        </div>
      </div>
    </div>
  );
}
