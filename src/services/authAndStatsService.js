import { supabase } from "../supabase";

export async function handleSaveStudentInfo({
  studentNameInput,
  agentCodeInput,
  setCurrentStudent,
  setShowStudentModal,
  pendingExam,
  setPendingExam,
  startExam,
  notify,
}) {
  if (!studentNameInput.trim() || !agentCodeInput.trim()) {
    return notify("Vui lòng nhập đầy đủ Họ tên và Mã số Đại lý!", "error");
  }

  const cleanCode = agentCodeInput.trim().toUpperCase();
  const cleanName = studentNameInput.trim();

  try {
    const { error } = await supabase
      .from("students")
      .upsert([{ agent_code: cleanCode, name: cleanName }], {
        onConflict: "agent_code",
      });

    if (error) throw error;

    const studentObj = { name: cleanName, agentCode: cleanCode };
    setCurrentStudent(studentObj);
    localStorage.setItem("MANULIFE_STUDENT", JSON.stringify(studentObj));
    setShowStudentModal(false);
    notify(`Xin chào Đại lý ${cleanName} (${cleanCode})!`);

    if (pendingExam) {
      const examToStart = pendingExam;
      setPendingExam(null);
      startExam(examToStart);
    }
  } catch (err) {
    notify("Lỗi lưu thông tin học viên: " + err.message, "error");
  }
}

export async function handleAdminLogin({
  adminUsernameInput,
  adminPasswordInput,
  setIsAdmin,
  setShowAdminLoginModal,
  setAdminUsernameInput,
  setAdminPasswordInput,
  notify,
}) {
  if (!adminUsernameInput || !adminPasswordInput) {
    return notify("Vui lòng nhập đầy đủ tài khoản và mật khẩu!", "error");
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", adminUsernameInput.trim())
      .eq("password", adminPasswordInput.trim())
      .eq("role", "admin")
      .single();

    if (error || !data)
      return notify("Tài khoản Quản trị không chính xác!", "error");

    setIsAdmin(true);
    localStorage.setItem("MANULIFE_ADMIN", "true");
    setShowAdminLoginModal(false);
    setAdminUsernameInput("");
    setAdminPasswordInput("");
    notify("Đăng nhập quyền Admin thành công!");
  } catch (err) {
    notify("Lỗi xác thực Admin: " + err.message, "error");
  }
}

export async function fetchAdminStats({
  setIsFetchingStats,
  setAdminResults,
  setScreen,
  notify,
}) {
  setIsFetchingStats(true);
  try {
    const batchSize = 1000;
    const allResults = [];
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from("exam_results")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, from + batchSize - 1);

      if (error) throw error;
      const batch = data || [];
      allResults.push(...batch);

      if (batch.length < batchSize) break;
      from += batchSize;
    }

    setAdminResults(allResults);
    setScreen("admin-stats");
  } catch (err) {
    notify("Lỗi lấy dữ liệu thống kê: " + err.message, "error");
  } finally {
    setIsFetchingStats(false);
  }
}
