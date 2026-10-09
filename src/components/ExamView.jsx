import React from "react";

export function ExamView({
  selectedExam,
  subjectInfo,
  currentStudent,
  secondsLeft,
  formattedTime,
  questions,
  current,
  answers,
  answeredCount,
  onSelectOption,
  onNavigateQuestion,
  onFinishExam,
  onOpenQuestionGrid,
}) {
  const currentQuestion = questions[current];

  if (!currentQuestion) return null;

  return (
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
        onClick={onOpenQuestionGrid}
        title="Bấm để xem danh sách toàn bộ câu hỏi"
      >
        <span>
          📋 Đã trả lời {answeredCount} / {questions.length} câu
        </span>
        <span style={{ fontSize: "12px", color: "#666", fontWeight: "normal" }}>
          (Bấm để mở danh sách câu)
        </span>
      </div>

      <div
        onClick={onOpenQuestionGrid}
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
                onClick={() => onSelectOption(index)}
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
          onClick={() => onNavigateQuestion(-1)}
        >
          ← Câu trước
        </button>

        <button className="finish-btn" onClick={() => onFinishExam(false)}>
          Nộp bài ngay
        </button>

        {current < questions.length - 1 ? (
          <button className="primary-btn" onClick={() => onNavigateQuestion(1)}>
            Câu tiếp →
          </button>
        ) : (
          <button
            className="primary-btn"
            style={{ background: "#2e7d32" }}
            onClick={() => onFinishExam(false)}
          >
            Hoàn tất & Nộp bài →
          </button>
        )}
      </div>
    </div>
  );
}
