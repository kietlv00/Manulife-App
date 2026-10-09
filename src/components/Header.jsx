import React from "react";

export function Header({
  currentStudent,
  isAdmin,
  screen,
  onResetHome,
  onChangeStudent,
  onOpenStudentModal,
  onFetchStats,
  onFetchAdminWrong,
  onOpenImportModal,
  onLogoutAdmin,
  onOpenAdminLogin,
}) {
  return (
    <header className="topbar">
      <div className="brand" onClick={() => onResetHome(false)}>
        <div className="brand-mark">M</div>
        <div>
          <div className="brand-title">ÔN THI THÔNG MINH</div>
          <div className="brand-sub">Hệ thống Luyện Đề Trực Tuyến</div>
        </div>
      </div>

      <div className="topbar-actions">
        {/* Nút mã đại lý / học viên */}
        {currentStudent ? (
          <span
            className="admin-badge student-badge"
            onClick={onChangeStudent}
            title="Bấm để đổi tên/mã đại lý"
          >
            👤 {currentStudent.name} ({currentStudent.agentCode})
          </span>
        ) : (
          <button className="primary-btn" onClick={onOpenStudentModal}>
            📝 Nhập Mã Đại Lý
          </button>
        )}

        {/* Các nút dành cho Admin hoặc nút Đăng nhập Admin */}
        {isAdmin ? (
          <>
            <button className="secondary-btn" onClick={onFetchStats}>
              📊 Thống Kê
            </button>
            <button
              className="secondary-btn header-wrong-btn"
              onClick={onFetchAdminWrong}
            >
              🔥 Ngân Hàng Sai
            </button>
            <button className="import-btn" onClick={onOpenImportModal}>
              ➕ Import Đề
            </button>
            <button className="ghost-btn" onClick={onLogoutAdmin}>
              Thoát Admin
            </button>
          </>
        ) : (
          <button
            className="ghost-btn"
            style={{ fontSize: "11px", padding: "6px 10px" }}
            onClick={onOpenAdminLogin}
          >
            🔒 Admin
          </button>
        )}

        {/* Nút quay về Trang chủ */}
        {screen !== "home" && (
          <button className="ghost-btn" onClick={() => onResetHome(false)}>
            <span>🏠</span> Trang chủ
          </button>
        )}
      </div>
    </header>
  );
}
