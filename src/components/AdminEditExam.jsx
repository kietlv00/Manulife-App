import React from "react";

export function AdminEditExam({
  editingExam,
  setEditingExam,
  onCancel,
  onSave,
}) {
  if (!editingExam) return null;

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ADMIN CMS</span>
          <h1>Chỉnh Sửa Đề Thi</h1>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="secondary-btn" onClick={onCancel}>
            Hủy bỏ
          </button>
          <button className="primary-btn" onClick={onSave}>
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
  );
}
