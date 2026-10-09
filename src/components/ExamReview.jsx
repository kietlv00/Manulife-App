import React from "react";

export function ExamReview({
  subjectInfo,
  selectedExam,
  result,
  questions,
  answers,
  reviewFilter,
  setReviewFilter,
  onBackToResult,
  onChangeExamScreen,
}) {
  return (
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
          <button className="secondary-btn" onClick={onBackToResult}>
            ← Quay lại kết quả
          </button>
          <button className="primary-btn" onClick={onChangeExamScreen}>
            Chọn đề khác
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button
          className={reviewFilter === "all" ? "primary-btn" : "secondary-btn"}
          onClick={() => setReviewFilter("all")}
        >
          Tất cả câu hỏi ({questions.length})
        </button>
        <button
          className={reviewFilter === "wrong" ? "primary-btn" : "secondary-btn"}
          style={{ background: reviewFilter === "wrong" ? "#d32f2f" : "" }}
          onClick={() => setReviewFilter("wrong")}
        >
          ❌ Câu làm sai ({questions.length - (result?.score || 0)})
        </button>
        <button
          className={
            reviewFilter === "correct" ? "primary-btn" : "secondary-btn"
          }
          style={{ background: reviewFilter === "correct" ? "#2e7d32" : "" }}
          onClick={() => setReviewFilter("correct")}
        >
          ✅ Câu làm đúng ({result?.score || 0})
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
                  {isCorrect ? "✓ Trả lời đúng" : "✗ Trả lời sai / Bỏ trống"}
                </span>
              </div>

              <h3 style={{ fontSize: "16px", marginBottom: "14px" }}>
                {q.text}
              </h3>

              <div className="options">
                {q.options.map((opt, oIdx) => {
                  const isUserSelected = userChoice === oIdx;
                  const isAnswerRight = q.answer === oIdx;

                  return (
                    <div
                      key={oIdx}
                      className="option"
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
                          style={{
                            color: "#d32f2f",
                            fontWeight: "bold",
                            background: "#ffcdd2",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            fontSize: "12px",
                          }}
                        >
                          ✖ Câu bạn đã chọn (Sai)
                        </span>
                      )}

                      {isAnswerRight && (
                        <span
                          style={{
                            color: "#2e7d32",
                            fontWeight: "bold",
                            background: "#c8e6c9",
                            padding: "2px 8px",
                            borderRadius: "6px",
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
          );
        })}
      </div>
    </div>
  );
}
