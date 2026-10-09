import { useState, useEffect, useMemo } from "react";

export function useExamFlow({
  screen,
  setScreen,
  setConfirmModal,
  executeSubmitCallback,
}) {
  const [subject, setSubject] = useState(null);
  const [selectedExam, setSelectedExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(60 * 60);
  const [result, setResult] = useState(null);
  const [pendingExam, setPendingExam] = useState(null);

  useEffect(() => {
    if (screen !== "exam") return;
    if (secondsLeft <= 0) {
      executeSubmitCallback(true);
      return;
    }
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [screen, secondsLeft]);

  const formattedTime = useMemo(() => {
    const m = Math.floor(secondsLeft / 60)
      .toString()
      .padStart(2, "0");
    const s = (secondsLeft % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [secondsLeft]);

  function resetHome(force = false) {
    if (screen === "exam" && !force) {
      setConfirmModal({
        title: "Rời khỏi bài thi?",
        message:
          "Bài làm của bạn chưa được nộp và sẽ bị hủy nếu bạn quay về Trang chủ. Bạn có chắc chắn muốn rời đi?",
        confirmText: "Rời bài thi",
        danger: true,
        onConfirm: () => doResetHome(),
      });
      return;
    }
    doResetHome();
  }

  function doResetHome() {
    setSubject(null);
    setSelectedExam(null);
    setQuestions([]);
    setAnswers({});
    setCurrent(0);
    setResult(null);
    setScreen("home");
  }

  return {
    subject,
    setSubject,
    selectedExam,
    setSelectedExam,
    questions,
    setQuestions,
    answers,
    setAnswers,
    current,
    setCurrent,
    secondsLeft,
    setSecondsLeft,
    result,
    setResult,
    pendingExam,
    setPendingExam,
    formattedTime,
    resetHome,
  };
}
