import React from "react";

export function AdminStats({
  isFetchingStats,
  periodAdminResults,
  passedCount,
  passRate,
  subjectStats,
  weeklyStats,
  statsPeriod,
  setStatsPeriod,
  searchAgentFilter,
  setSearchAgentFilter,
  paginatedAdminResults,
  statsPage,
  setStatsPage,
  statsPageSize,
  setStatsPageSize,
  statsPageCount,
  filteredAdminResults,
  STATS_PAGE_SIZE_OPTIONS,
  onBackHome,
  onViewStudentWrongQuestions, // Props mới truyền từ main.jsx
}) {
  return (
    <div>
      <div className="stats-page-heading">
        <div>
          <span className="eyebrow">ADMIN BÁO CÁO</span>
          <h1>Thống Kê Kết Quả Học Viên</h1>
          <p>Theo dõi kết quả làm bài theo kỳ thống kê đã chọn.</p>
        </div>

        <div className="stats-heading-actions">
          <label className="stats-period-select">
            <span>Kỳ thống kê</span>
            <select
              value={statsPeriod}
              onChange={(e) => setStatsPeriod(e.target.value)}
            >
              <option value="month">Tháng này</option>
              <option value="last3months">3 tháng gần nhất</option>
              <option value="year">Năm nay</option>
              <option value="all">Toàn bộ thời gian</option>
            </select>
          </label>

          <button className="secondary-btn" onClick={onBackHome}>
            ← Trang chủ
          </button>
        </div>
      </div>

      {!isFetchingStats && periodAdminResults.length > 0 && (
        <section className="stats-dashboard">
          <article className="stats-chart-card stats-overview-card">
            <div>
              <span className="stats-chart-kicker">TỔNG QUAN</span>
              <h2>Kết quả học viên</h2>
              <p>Tổng lượt làm bài đã được ghi nhận</p>
            </div>
            <strong className="stats-total">{periodAdminResults.length}</strong>
            <div className="stats-overview-footer">
              <span>{passedCount} lượt đạt</span>
              <span>
                {periodAdminResults.length - passedCount} lượt chưa đạt
              </span>
            </div>
          </article>

          <article className="stats-chart-card">
            <span className="stats-chart-kicker">TỶ LỆ ĐẠT</span>
            <h2>Kết quả chung</h2>
            <div
              className="stats-donut"
              style={{
                background: `conic-gradient(#00a758 ${passRate}%, #edf2f0 ${passRate}% 100%)`,
              }}
            >
              <div>
                <strong>{passRate}%</strong>
                <span>đạt</span>
              </div>
            </div>
            <p className="stats-chart-caption">
              {passedCount} trên {periodAdminResults.length} lượt làm bài đạt
              yêu cầu
            </p>
          </article>

          <article className="stats-chart-card stats-subject-card">
            <span className="stats-chart-kicker">PHÂN BỐ</span>
            <h2>Lượt làm theo môn</h2>
            <div className="stats-bars">
              {subjectStats.map((item) => (
                <div className="stats-bar-row" key={item.name}>
                  <div className="stats-bar-label">
                    <span>{item.name}</span>
                    <strong>{item.count}</strong>
                  </div>
                  <div className="stats-bar-track">
                    <div
                      className="stats-bar-fill"
                      style={{
                        width: `${Math.max(
                          6,
                          (item.count /
                            Math.max(
                              ...subjectStats.map((stat) => stat.count),
                            )) *
                            100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="stats-chart-card stats-weekly-card">
            <h2>Hoạt động làm bài</h2>
            <p>Số lượt nộp bài theo từng ngày trong 7 ngày gần nhất</p>
            <svg className="stats-line-chart" viewBox="0 0 600 190">
              <line x1="24" y1="150" x2="576" y2="150" />
              <line x1="24" y1="100" x2="576" y2="100" />
              <line x1="24" y1="50" x2="576" y2="50" />
              <polyline
                points={weeklyStats
                  .map((day, index) => {
                    const max = Math.max(
                      1,
                      ...weeklyStats.map((item) => item.count),
                    );
                    const x = 30 + index * 90;
                    const y = 145 - (day.count / max) * 110;
                    return `${x},${y}`;
                  })
                  .join(" ")}
              />
              {weeklyStats.map((day, index) => {
                const max = Math.max(
                  1,
                  ...weeklyStats.map((item) => item.count),
                );
                const x = 30 + index * 90;
                const y = 145 - (day.count / max) * 110;

                return <circle key={day.key} cx={x} cy={y} r="5" />;
              })}
            </svg>
            <div className="stats-chart-axis">
              {weeklyStats.map((day) => (
                <span key={day.key} className={day.isToday ? "is-today" : ""}>
                  <span className="stats-axis-date">{day.dateLabel}</span>
                  <span className="stats-axis-weekday">
                    {day.weekdayLabel}
                    {day.isToday ? " · Hôm nay" : ""}
                  </span>
                  <strong>{day.count} lượt</strong>
                </span>
              ))}
            </div>
          </article>
        </section>
      )}

      <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
        <input
          type="text"
          placeholder="🔍 Tìm mã đại lý, tên học viên hoặc đề thi..."
          value={searchAgentFilter}
          onChange={(e) => setSearchAgentFilter(e.target.value)}
          style={{
            padding: "10px 14px",
            borderRadius: "10px",
            border: "1px solid #ccc",
            width: "100%",
            maxWidth: "400px",
          }}
        />
      </div>

      {isFetchingStats ? (
        <p>Đang tải dữ liệu thống kê...</p>
      ) : periodAdminResults.length === 0 ? (
        <p>Không có dữ liệu trong kỳ thống kê này.</p>
      ) : filteredAdminResults.length === 0 ? (
        <p>Không tìm thấy kết quả phù hợp với từ khóa.</p>
      ) : (
        <div className="stats-table-wrap">
          <table
            className="stats-table"
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "14px",
              textAlign: "left",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#f0f7f4",
                  borderBottom: "1px solid #e1ebe7",
                }}
              >
                <th style={{ padding: "12px" }}>STT</th>
                <th style={{ padding: "12px" }}>Mã Đại Lý</th>
                <th style={{ padding: "12px" }}>Họ Và Tên</th>
                <th style={{ padding: "12px" }}>Đề Thi</th>
                <th style={{ padding: "12px" }}>Điểm Số</th>
                <th style={{ padding: "12px" }}>Tỷ Lệ</th>
                <th style={{ padding: "12px" }}>Thời Gian</th>
                <th style={{ padding: "12px" }}>Trạng Thái</th>
                <th style={{ padding: "12px" }}>Ngày Làm</th>
                <th style={{ padding: "12px", textAlign: "center" }}>
                  Thao Tác
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedAdminResults.map((row, pageIndex) => {
                const rowNumber =
                  (statsPage - 1) * statsPageSize + pageIndex + 1;
                const pct = row.total
                  ? Math.round((row.score / row.total) * 100)
                  : 0;
                const mins = Math.floor((row.time_used || 0) / 60);
                const secs = (row.time_used || 0) % 60;

                return (
                  <tr
                    key={row.id || rowNumber}
                    className="clickable-row"
                    style={{
                      borderBottom: "1px solid #f0f0f0",
                      cursor: "pointer",
                    }}
                    onClick={() => onViewStudentWrongQuestions(row.agent_code)}
                    title="Bấm để xem danh sách câu làm sai của học viên này"
                  >
                    <td style={{ padding: "12px" }}>{rowNumber}</td>
                    <td style={{ padding: "12px", fontWeight: "bold" }}>
                      {row.agent_code}
                    </td>
                    <td style={{ padding: "12px" }}>{row.student_name}</td>
                    <td style={{ padding: "12px" }}>{row.exam_name}</td>
                    <td style={{ padding: "12px", fontWeight: "bold" }}>
                      {row.score} / {row.total}
                    </td>
                    <td style={{ padding: "12px" }}>{pct}%</td>
                    <td style={{ padding: "12px" }}>
                      {mins}m {secs}s
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "bold",
                          background: row.passed ? "#e8f5e9" : "#ffebee",
                          color: row.passed ? "#2e7d32" : "#c62828",
                        }}
                      >
                        {row.passed ? "✓ ĐẠT" : "✗ CHƯA ĐẠT"}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        fontSize: "12px",
                        color: "#777",
                      }}
                    >
                      {row.created_at
                        ? new Date(row.created_at).toLocaleString("vi-VN")
                        : "—"}
                    </td>
                    <td
                      style={{ padding: "12px", textAlign: "center" }}
                      onClick={(e) => e.stopPropagation()} // Tránh kích hoạt sự kiện tr click 2 lần
                    >
                      <button
                        className="secondary-btn"
                        style={{
                          fontSize: "11px",
                          padding: "4px 8px",
                          borderColor: "#e65100",
                          color: "#e65100",
                        }}
                        onClick={() =>
                          onViewStudentWrongQuestions(row.agent_code)
                        }
                      >
                        🔥 Câu sai
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!isFetchingStats && filteredAdminResults.length > 0 && (
        <div className="stats-pagination">
          <label className="stats-page-size">
            Số dòng mỗi trang
            <select
              value={statsPageSize}
              onChange={(e) => {
                setStatsPageSize(Number(e.target.value));
                setStatsPage(1);
              }}
            >
              {STATS_PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>

          <span>
            {`${(statsPage - 1) * statsPageSize + 1}–${Math.min(
              statsPage * statsPageSize,
              filteredAdminResults.length,
            )} / ${filteredAdminResults.length} kết quả`}
          </span>

          <div>
            <button
              className="secondary-btn"
              disabled={statsPage === 1}
              onClick={() => setStatsPage((page) => Math.max(1, page - 1))}
            >
              ← Trước
            </button>
            <span className="stats-page-number">
              {statsPage} / {statsPageCount}
            </span>
            <button
              className="secondary-btn"
              disabled={statsPage >= statsPageCount}
              onClick={() =>
                setStatsPage((page) => Math.min(statsPageCount, page + 1))
              }
            >
              Sau →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
