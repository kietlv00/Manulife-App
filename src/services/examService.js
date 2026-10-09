import { supabase } from "../supabase";

export async function fetchExamsFromSupabase({
  setSubjectList,
  setExamBank,
  setIsFetching,
}) {
  setIsFetching(true);
  try {
    const { data: subData } = await supabase.from("subjects").select("*");
    if (subData?.length) setSubjectList(subData);

    const { data: examData, error } = await supabase.from("exams").select("*");
    if (error) throw error;

    const grouped = {};
    (examData || []).forEach((item) => {
      if (!grouped[item.subject]) grouped[item.subject] = [];
      grouped[item.subject].push(item);
    });
    setExamBank(grouped);
  } catch (err) {
    console.error("Lỗi lấy dữ liệu:", err.message);
  } finally {
    setIsFetching(false);
  }
}

export async function handleAddSubject({
  newSubName,
  newSubSub,
  setShowSubjectModal,
  setNewSubName,
  setNewSubSub,
  refreshExams,
  notify,
}) {
  if (!newSubName.trim()) return notify("Vui lòng nhập tên môn!", "error");

  const newSub = {
    id: "sub_" + Date.now(),
    name: newSubName,
    subtitle: newSubSub || `Ôn thi ${newSubName}`,
    icon: "📚",
    color: "green",
  };

  try {
    const { error } = await supabase.from("subjects").insert([newSub]);
    if (error) throw error;

    await refreshExams();
    setShowSubjectModal(false);
    setNewSubName("");
    setNewSubSub("");
    notify("Thêm môn học thành công!");
  } catch (err) {
    notify("Lỗi thêm môn: " + err.message, "error");
  }
}

export async function handleDeleteSubject({
  subId,
  subName,
  refreshExams,
  notify,
}) {
  try {
    await supabase.from("exams").delete().eq("subject", subId);
    const { error } = await supabase.from("subjects").delete().eq("id", subId);
    if (error) throw error;

    await refreshExams();
    notify(`Đã xóa môn "${subName}" thành công!`);
  } catch (err) {
    notify("Lỗi xóa môn: " + err.message, "error");
  }
}

export async function handleDeleteExam({ examId, refreshExams, notify }) {
  try {
    const { error } = await supabase.from("exams").delete().eq("id", examId);
    if (error) throw error;

    await refreshExams();
    notify("Đã xóa đề thi vĩnh viễn thành công!");
  } catch (err) {
    notify("Xóa thất bại: " + err.message, "error");
  }
}

export async function handleSaveExamEdits({
  editingExam,
  refreshExams,
  setScreen,
  notify,
}) {
  try {
    const { error } = await supabase
      .from("exams")
      .update({
        name: editingExam.name,
        duration: editingExam.duration,
        questions: editingExam.questions,
      })
      .eq("id", editingExam.id);

    if (error) throw error;
    await refreshExams();
    setScreen("exams");
    notify("Cập nhật đề thi thành công!");
  } catch (err) {
    notify("Cập nhật thất bại: " + err.message, "error");
  }
}

export async function handleSaveImport({
  importTitle,
  parsedQuestions,
  importSubject,
  importDuration,
  refreshExams,
  setShowImportModal,
  setParsedQuestions,
  setImportTitle,
  setIsLoading,
  notify,
}) {
  if (!importTitle.trim()) return notify("Vui lòng nhập tên đề thi!", "error");
  if (!parsedQuestions.length)
    return notify("Vui lòng chọn file đề thi!", "error");

  const newExam = {
    id: "exam_" + Date.now(),
    subject: importSubject,
    name: importTitle,
    duration: Number(importDuration) || 60,
    questions: parsedQuestions,
  };

  setIsLoading(true);
  try {
    const { error } = await supabase.from("exams").insert([newExam]);
    if (error) throw error;

    await refreshExams();
    setShowImportModal(false);
    setParsedQuestions([]);
    setImportTitle("");
    notify("Lưu đề thi thành công!");
  } catch (err) {
    notify("Lỗi lưu đề thi: " + err.message, "error");
  } finally {
    setIsLoading(false);
  }
}
