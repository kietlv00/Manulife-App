import React from "react";

export function HomeView({
  isFetching,
  examBank,
  subjectList,
  currentStudent,
  wrongQuestionsBank,
  isAdmin,
  onSelectSubject,
  onOpenSubjectModal,
  onDeleteSubject,
  onViewWrongBank,
  onStartWrongPractice,
}) {
  const totalExams = Object.values(examBank).reduce(
    (acc, list) => acc + list.length,
    0,
  );

  return (
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
            Chọn môn học bên dưới để bắt đầu làm bài thi luyện tập trực tiếp.
          </p>
        </div>
        <div className="hero-card">
          <div className="hero-number">{isFetching ? "..." : totalExams}</div>
          <div>Đề thi sẵn có</div>
          <small>Lưu trữ đồng bộ trên hệ thống</small>
        </div>
      </section>

      {/* CHỈ HIỂN THỊ KHO TỰ ÔN TẬP CÁ NHÂN KHI KHÔNG PHẢI ADMIN VÀ CÓ HỌC VIÊN */}
      {!isAdmin && currentStudent && wrongQuestionsBank.length > 0 && (
        <div className="wrong-bank-card">
          <div className="wrong-bank-content">
            <div>
              <span className="eyebrow eyebrow-orange">
                KHO TỰ ÔN TẬP CỦA ĐẠI LÝ {currentStudent.agentCode}
              </span>
              <h2 className="wrong-bank-title">
                🔥 Ngân Hàng Câu Sai ({wrongQuestionsBank.length} câu)
              </h2>
              <p className="wrong-bank-desc">
                Được đồng bộ an toàn từ Database cho đại lý{" "}
                <b>{currentStudent.name}</b>. Luyện tập lại ngay!
              </p>
            </div>

            <div className="wrong-bank-actions">
              <button
                className="primary-btn btn-orange-primary"
                onClick={onViewWrongBank}
              >
                📋 Xem danh sách & Chi tiết
              </button>
              <button
                className="secondary-btn btn-orange-secondary"
                onClick={onStartWrongPractice}
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
          <button className="primary-btn" onClick={onOpenSubjectModal}>
            ➕ Thêm Môn
          </button>
        )}
      </div>

      <div className="subject-grid">
        {subjectList.map((item) => (
          <div
            key={item.id}
            className={`subject-card ${item.color}`}
            onClick={() => onSelectSubject(item.id)}
          >
            <div className="subject-icon">{item.icon}</div>
            <div className="subject-info">
              <span>{item.subtitle}</span>
              <strong>{item.name}</strong>
              <small>{(examBank[item.id] || []).length} đề luyện tập</small>
            </div>

            {isAdmin ? (
              <button
                className="danger-btn"
                style={{ padding: "5px 10px", fontSize: "11px" }}
                onClick={(e) => onDeleteSubject(item.id, item.name, e)}
              >
                🗑️ Xóa
              </button>
            ) : (
              <div className="subject-arrow-icon">→</div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
