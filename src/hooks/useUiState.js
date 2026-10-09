import { useState } from "react";

export function useUiState() {
  const [screen, setScreen] = useState("home");
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  function notify(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  return {
    screen,
    setScreen,
    toast,
    setToast,
    confirmModal,
    setConfirmModal,
    isDragging,
    setIsDragging,
    notify,
  };
}
