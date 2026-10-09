import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { useAppLogic } from "./useAppLogic";

import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { Modals } from "./components/Modals";
import { HomeView } from "./components/HomeView";
import { ExamsView } from "./components/ExamsView";
import { AdminEditExam } from "./components/AdminEditExam";
import { ExamView } from "./components/ExamView";
import { ExamResult } from "./components/ExamResult";
import { ExamReview } from "./components/ExamReview";
import { WrongBankView } from "./components/WrongBankView";
import { AdminStats } from "./components/AdminStats";
import { AdminWrongQuestions } from "./components/AdminWrongQuestions";

function App() {
  const { state, setters, handlers } = useAppLogic();

  return (
    <div className="app">
      {state.toast && (
        <div className="toast-container">
          <div className={`toast ${state.toast.type}`}>
            <span>{state.toast.type === "error" ? "❌" : "✅"}</span>
            <span>{state.toast.message}</span>
          </div>
        </div>
      )}

      <Header
        currentStudent={state.currentStudent}
        isAdmin={state.isAdmin}
        screen={state.screen}
        onResetHome={handlers.resetHome}
        onChangeStudent={() => {
          if (state.currentStudent) {
            setters.setStudentNameInput(state.currentStudent.name);
            setters.setAgentCodeInput(state.currentStudent.agentCode);
          }
          setters.setShowStudentModal(true);
        }}
        onOpenStudentModal={() => {
          setters.setStudentNameInput("");
          setters.setAgentCodeInput("");
          setters.setShowStudentModal(true);
        }}
        onFetchStats={handlers.onFetchStats}
        onFetchAdminWrong={handlers.refreshAdminWrong}
        onOpenImportModal={() => setters.setShowImportModal(true)}
        onLogoutAdmin={handlers.onAdminLogout}
        onOpenAdminLogin={() => setters.setShowAdminLoginModal(true)}
      />

      <main className="container">
        {state.screen === "home" && (
          <HomeView
            isFetching={state.isFetching}
            examBank={state.examBank}
            subjectList={state.subjectList}
            currentStudent={state.currentStudent}
            wrongQuestionsBank={state.wrongQuestionsBank}
            isAdmin={state.isAdmin}
            onSelectSubject={(subId) => {
              setters.setSubject(subId);
              setters.setScreen("exams");
            }}
            onOpenSubjectModal={() => setters.setShowSubjectModal(true)}
            onDeleteSubject={handlers.onDeleteSubject}
            onViewWrongBank={() => setters.setScreen("wrong-bank-view")}
            onStartWrongPractice={() => {
              const filtered =
                state.selectedWrongSubject === "ALL"
                  ? state.wrongQuestionsBank
                  : state.wrongQuestionsBank.filter(
                      (q) => q.subjectId === state.selectedWrongSubject,
                    );
              if (!filtered.length)
                return handlers.notify(
                  "Không có câu hỏi sai nào trong mục này!",
                  "error",
                );
              handlers.startExam({
                id: "wrong_practice_" + Date.now(),
                name: `Ôn Luyện Câu Sai (${filtered.length} câu)`,
                duration: Math.max(10, Math.ceil(filtered.length * 1.5)),
                questions: filtered.map((item) => ({
                  text: item.questionText,
                  options: item.options,
                  answer: item.correctAnswer,
                  metaSubject: item.subjectName,
                  metaExam: item.examName,
                })),
              });
              setters.setIsWrongPracticeMode(true);
            }}
          />
        )}

        {state.screen === "exams" && (
          <ExamsView
            subjectInfo={state.subjectInfo}
            currentStudent={state.currentStudent}
            isFetching={state.isFetching}
            currentExamList={state.currentExamList}
            isAdmin={state.isAdmin}
            onResetHome={handlers.resetHome}
            onExamClick={handlers.handleExamClick}
            onOpenEditExam={(exam) => {
              setters.setEditingExam(JSON.parse(JSON.stringify(exam)));
              setters.setScreen("edit-exam");
            }}
            onDeleteExam={handlers.onDeleteExam}
          />
        )}

        {state.screen === "edit-exam" && (
          <AdminEditExam
            editingExam={state.editingExam}
            setEditingExam={setters.setEditingExam}
            onCancel={() => setters.setScreen("exams")}
            onSave={handlers.onSaveExamEdits}
          />
        )}

        {state.screen === "exam" && (
          <ExamView
            selectedExam={state.selectedExam}
            subjectInfo={state.subjectInfo}
            currentStudent={state.currentStudent}
            secondsLeft={state.secondsLeft}
            formattedTime={state.formattedTime}
            questions={state.questions}
            current={state.current}
            answers={state.answers}
            answeredCount={state.answeredCount}
            onSelectOption={(optIdx) =>
              setters.setAnswers((prev) => ({
                ...prev,
                [state.current]: optIdx,
              }))
            }
            onNavigateQuestion={(step) =>
              setters.setCurrent((c) =>
                Math.min(Math.max(0, c + step), state.questions.length - 1),
              )
            }
            onFinishExam={handlers.finishExam}
            onOpenQuestionGrid={() => setters.setShowQuestionGridModal(true)}
          />
        )}

        {state.screen === "result" && (
          <ExamResult
            result={state.result}
            currentStudent={state.currentStudent}
            selectedExam={state.selectedExam}
            onRetryExam={handlers.startExam}
            onReviewExam={() => setters.setScreen("review")}
            onResetHome={handlers.resetHome}
          />
        )}

        {state.screen === "review" && (
          <ExamReview
            subjectInfo={state.subjectInfo}
            selectedExam={state.selectedExam}
            result={state.result}
            questions={state.questions}
            answers={state.answers}
            reviewFilter={state.reviewFilter}
            setReviewFilter={setters.setReviewFilter}
            onBackToResult={() => setters.setScreen("result")}
            onChangeExamScreen={() => setters.setScreen("exams")}
          />
        )}

        {state.screen === "wrong-bank-view" && (
          <WrongBankView
            currentStudent={state.currentStudent}
            wrongQuestionsBank={state.wrongQuestionsBank}
            subjectList={state.subjectList}
            examBank={state.examBank}
            selectedWrongSubject={state.selectedWrongSubject}
            setSelectedWrongSubject={setters.setSelectedWrongSubject}
            onStartWrongPractice={() => {
              const filtered =
                state.selectedWrongSubject === "ALL"
                  ? state.wrongQuestionsBank
                  : state.wrongQuestionsBank.filter(
                      (q) => q.subjectId === state.selectedWrongSubject,
                    );
              if (!filtered.length)
                return handlers.notify(
                  "Không có câu hỏi sai nào trong mục này!",
                  "error",
                );
              handlers.startExam({
                id: "wrong_practice_" + Date.now(),
                name: `Ôn Luyện Câu Sai (${filtered.length} câu)`,
                duration: Math.max(10, Math.ceil(filtered.length * 1.5)),
                questions: filtered.map((item) => ({
                  text: item.questionText,
                  options: item.options,
                  answer: item.correctAnswer,
                  metaSubject: item.subjectName,
                  metaExam: item.examName,
                })),
              });
              setters.setIsWrongPracticeMode(true);
            }}
            onClearWrongBank={() => {
              if (!state.currentStudent?.agentCode) return;
              setters.setConfirmModal({
                title: "Xóa danh sách câu sai trên thiết bị?",
                message: `Danh sách câu sai sẽ được ẩn khỏi giao diện ôn tập của đại lý ${state.currentStudent.agentCode}.`,
                confirmText: "Ẩn danh sách",
                danger: true,
                onConfirm: () => {
                  setters.setWrongQuestionsBank([]);
                  handlers.notify(`Đã dọn dẹp giao diện câu sai!`);
                },
              });
            }}
            onResetHome={handlers.resetHome}
          />
        )}

        {state.screen === "admin-stats" && (
          <AdminStats
            isFetchingStats={state.isFetchingStats}
            periodAdminResults={state.periodAdminResults}
            passedCount={state.passedCount}
            passRate={state.passRate}
            subjectStats={state.subjectStats}
            weeklyStats={state.weeklyStats}
            statsPeriod={state.statsPeriod}
            setStatsPeriod={setters.setStatsPeriod}
            searchAgentFilter={state.searchAgentFilter}
            setSearchAgentFilter={setters.setSearchAgentFilter}
            paginatedAdminResults={state.paginatedAdminResults}
            statsPage={state.statsPage}
            setStatsPage={setters.setStatsPage}
            statsPageSize={state.statsPageSize}
            setStatsPageSize={setters.setStatsPageSize}
            statsPageCount={state.statsPageCount}
            filteredAdminResults={state.filteredAdminResults}
            STATS_PAGE_SIZE_OPTIONS={state.STATS_PAGE_SIZE_OPTIONS}
            onBackHome={() => setters.setScreen("home")}
            onViewStudentWrongQuestions={
              handlers.handleViewStudentWrongQuestions
            }
          />
        )}

        {state.screen === "admin-wrong-questions" && (
          <AdminWrongQuestions
            isFetching={state.isFetchingWrongBank}
            filteredList={state.filteredAdminWrongQuestions}
            subjectList={state.subjectList}
            examBank={state.examBank}
            searchTerm={state.adminWrongSearch}
            setSearchTerm={setters.setAdminWrongSearch}
            subjectFilter={state.adminWrongSubjectFilter}
            setSubjectFilter={setters.setAdminWrongSubjectFilter}
            examFilter={state.adminWrongExamFilter}
            setExamFilter={setters.setAdminWrongExamFilter}
            onRefresh={handlers.refreshAdminWrong}
            onBackHome={() => setters.setScreen("home")}
            onDeleteOne={handlers.onDeleteWrongQuestionAdmin}
          />
        )}
      </main>

      <Modals
        showStudentModal={state.showStudentModal}
        setShowStudentModal={setters.setShowStudentModal}
        agentCodeInput={state.agentCodeInput}
        setAgentCodeInput={setters.setAgentCodeInput}
        studentNameInput={state.studentNameInput}
        setStudentNameInput={setters.setStudentNameInput}
        handleSaveStudentInfo={handlers.onSaveStudentInfo}
        pendingExam={state.pendingExam}
        setPendingExam={setters.setPendingExam}
        showAdminLoginModal={state.showAdminLoginModal}
        setShowAdminLoginModal={setters.setShowAdminLoginModal}
        adminUsernameInput={state.adminUsernameInput}
        setAdminUsernameInput={setters.setAdminUsernameInput}
        adminPasswordInput={state.adminPasswordInput}
        setAdminPasswordInput={setters.setAdminPasswordInput}
        handleAdminLogin={handlers.onAdminLogin}
        showImportModal={state.showImportModal}
        setShowImportModal={setters.setShowImportModal}
        importSubject={state.importSubject}
        setImportSubject={setters.setImportSubject}
        importTitle={state.importTitle}
        setImportTitle={setters.setImportTitle}
        importDuration={state.importDuration}
        setImportDuration={setters.setImportDuration}
        subjectList={state.subjectList}
        isDragging={state.isDragging}
        handleDragOver={(e) => {
          e.preventDefault();
          setters.setIsDragging(true);
        }}
        handleDragLeave={(e) => {
          e.preventDefault();
          setters.setIsDragging(false);
        }}
        handleDrop={(e) => {
          e.preventDefault();
          setters.setIsDragging(false);
          if (e.dataTransfer.files?.[0])
            handlers.processFile(e.dataTransfer.files[0]);
        }}
        handleFileSelect={(e) => {
          if (e.target.files?.[0]) handlers.processFile(e.target.files[0]);
        }}
        isLoading={state.isLoading}
        importError={state.importError}
        parsedQuestions={state.parsedQuestions}
        setParsedQuestions={setters.setParsedQuestions}
        openAccordion={state.openAccordion}
        setOpenAccordion={setters.setOpenAccordion}
        handleSaveImport={handlers.onSaveImport}
        showSubjectModal={state.showSubjectModal}
        setShowSubjectModal={setters.setShowSubjectModal}
        newSubName={state.newSubName}
        setNewSubName={setters.setNewSubName}
        newSubSub={state.newSubSub}
        setNewSubSub={setters.setNewSubSub}
        handleAddSubject={handlers.onAddSubject}
        confirmModal={state.confirmModal}
        setConfirmModal={setters.setConfirmModal}
        showQuestionGridModal={state.showQuestionGridModal}
        setShowQuestionGridModal={setters.setShowQuestionGridModal}
        questions={state.questions}
        answers={state.answers}
        current={state.current}
        setCurrent={setters.setCurrent}
        answeredCount={state.answeredCount}
      />

      <Footer />
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
