import { supabase } from "../supabase";

export async function loadWrongBankFromSupabase({
  currentStudent,
  subjectList,
  setWrongQuestionsBank,
}) {
  if (!currentStudent?.agentCode) {
    setWrongQuestionsBank([]);
    return;
  }

  try {
    const { data: wrongData, error } = await supabase
      .from("wrong_questions")
      .select("*")
      .eq("agent_code", currentStudent.agentCode)
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!wrongData?.length) return setWrongQuestionsBank([]);

    const examIds = [...new Set(wrongData.map((item) => item.exam_id))];
    const { data: examsData } = await supabase
      .from("exams")
      .select("id, name, subject, questions")
      .in("id", examIds);

    const examMap = new Map((examsData || []).map((e) => [e.id, e]));

    const formatted = wrongData
      .map((wq) => {
        const exam = examMap.get(wq.exam_id);
        if (!exam?.questions) return null;

        const fullQuestion =
          exam.questions.find((q) => q.id && q.id === wq.question_id) ||
          exam.questions[wq.question_index];

        if (!fullQuestion) return null;
        const sub = subjectList.find((s) => s.id === exam.subject);

        return {
          dbId: wq.id,
          questionText: fullQuestion.text,
          options: fullQuestion.options,
          correctAnswer: fullQuestion.answer,
          userAnswer: wq.user_answer,
          subjectId: exam.subject,
          subjectName: sub ? sub.name : "Môn học",
          examId: exam.id,
          examName: exam.name,
          savedAt: new Date(wq.created_at).toLocaleDateString("vi-VN"),
        };
      })
      .filter(Boolean);

    setWrongQuestionsBank(formatted);
  } catch (err) {
    console.error("Lỗi lấy ngân hàng câu sai:", err.message);
    setWrongQuestionsBank([]);
  }
}

export async function saveWrongQuestionsToSupabase({
  examQuestions,
  userAnswers,
  examObj,
  currentStudent,
  reloadWrongBank,
}) {
  if (!currentStudent || !currentStudent.agentCode) return;

  try {
    const wrongList = [];

    examQuestions.forEach((q, idx) => {
      const userAns = userAnswers[idx];
      const origIndex = q.originalIndex !== undefined ? q.originalIndex : idx;
      const qId = q.id || `q_idx_${origIndex}`;

      if (userAns === undefined || userAns !== q.answer) {
        wrongList.push({
          agent_code: currentStudent.agentCode,
          exam_id: examObj.id,
          question_index: origIndex,
          question_id: qId,
          user_answer: userAns !== undefined ? userAns : -1,
          created_at: new Date().toISOString(),
        });
      }
    });

    if (wrongList.length > 0) {
      const { error } = await supabase
        .from("wrong_questions")
        .upsert(wrongList, { onConflict: "agent_code,exam_id,question_id" });

      if (error) console.error("Lỗi upsert câu sai:", error.message);
    }

    reloadWrongBank();
  } catch (err) {
    console.error("Lỗi lưu câu sai vào Database:", err.message);
  }
}

export async function fetchAdminWrongQuestions({
  subjectList,
  setIsFetchingWrongBank,
  setAdminWrongQuestions,
  setScreen,
  notify,
}) {
  setIsFetchingWrongBank(true);
  try {
    const { data: wrongData, error } = await supabase
      .from("wrong_questions")
      .select("*, students(name)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!wrongData || wrongData.length === 0) {
      setAdminWrongQuestions([]);
      setScreen("admin-wrong-questions");
      return;
    }

    const examIds = [...new Set(wrongData.map((item) => item.exam_id))];
    const { data: examsData } = await supabase
      .from("exams")
      .select("id, name, subject, questions")
      .in("id", examIds);

    const examMap = new Map((examsData || []).map((e) => [e.id, e]));
    const groupedMap = new Map();

    wrongData.forEach((wq) => {
      const exam = examMap.get(wq.exam_id);
      if (!exam || !exam.questions) return;

      const fullQuestion =
        exam.questions.find((q) => q.id && q.id === wq.question_id) ||
        exam.questions[wq.question_index];

      if (!fullQuestion) return;

      const groupKey = `${wq.agent_code}_${wq.exam_id}_${wq.question_id || wq.question_index}`;

      if (groupedMap.has(groupKey)) {
        const existing = groupedMap.get(groupKey);
        existing.wrong_count += 1;
      } else {
        const sub = subjectList.find((s) => s.id === exam.subject);
        groupedMap.set(groupKey, {
          id: wq.id,
          agent_code: wq.agent_code,
          student_name: wq.students?.name || "N/A",
          subject_id: exam.subject,
          subject_name: sub ? sub.name : "Môn học",
          exam_id: String(wq.exam_id),
          exam_name: exam.name,
          question_text: fullQuestion.text,
          options: fullQuestion.options,
          correct_answer: fullQuestion.answer,
          user_answer: wq.user_answer,
          created_at: wq.created_at,
          wrong_count: 1,
        });
      }
    });

    setAdminWrongQuestions(Array.from(groupedMap.values()));
    setScreen("admin-wrong-questions");
  } catch (err) {
    notify("Lỗi lấy danh sách câu sai Admin: " + err.message, "error");
  } finally {
    setIsFetchingWrongBank(false);
  }
}

export async function handleDeleteWrongQuestionAdmin({
  id,
  refreshAdminWrong,
  notify,
}) {
  try {
    const { error } = await supabase
      .from("wrong_questions")
      .delete()
      .eq("id", id);
    if (error) throw error;
    notify("Đã xóa câu hỏi sai khỏi Database!");
    refreshAdminWrong();
  } catch (err) {
    notify("Lỗi xóa dữ liệu: " + err.message, "error");
  }
}
