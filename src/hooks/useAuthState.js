import { useState } from "react";

export function useAuthState() {
  const [isAdmin, setIsAdmin] = useState(
    () => localStorage.getItem("MANULIFE_ADMIN") === "true",
  );
  const [currentStudent, setCurrentStudent] = useState(() => {
    const saved = localStorage.getItem("MANULIFE_STUDENT");
    return saved ? JSON.parse(saved) : null;
  });

  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [studentNameInput, setStudentNameInput] = useState("");
  const [agentCodeInput, setAgentCodeInput] = useState("");
  const [adminUsernameInput, setAdminUsernameInput] = useState("");
  const [adminPasswordInput, setAdminPasswordInput] = useState("");

  return {
    isAdmin,
    setIsAdmin,
    currentStudent,
    setCurrentStudent,
    showStudentModal,
    setShowStudentModal,
    showAdminLoginModal,
    setShowAdminLoginModal,
    studentNameInput,
    setStudentNameInput,
    agentCodeInput,
    setAgentCodeInput,
    adminUsernameInput,
    setAdminUsernameInput,
    adminPasswordInput,
    setAdminPasswordInput,
  };
}
