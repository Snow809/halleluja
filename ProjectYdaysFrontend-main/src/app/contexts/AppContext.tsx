import React, { createContext, useContext, useState } from "react";

interface AppContextType {
  language: string;
  setLanguage: (lang: string) => void;
  isAiAssistantOpen: boolean;
  setIsAiAssistantOpen: (open: boolean) => void;
  toggleAiAssistant: () => void;
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (open: boolean) => void;
  toggleNotifications: () => void;
  isNotificationsViewOpen: boolean;
  setIsNotificationsViewOpen: (open: boolean) => void;
  toggleNotificationsView: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState("fr");
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isNotificationsViewOpen, setIsNotificationsViewOpen] = useState(false);

  const toggleAiAssistant = () => setIsAiAssistantOpen((prev) => !prev);
  const toggleNotifications = () => setIsNotificationsOpen((prev) => !prev);
  const toggleNotificationsView = () => setIsNotificationsViewOpen((prev) => !prev);

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        isAiAssistantOpen,
        setIsAiAssistantOpen,
        toggleAiAssistant,
        isNotificationsOpen,
        setIsNotificationsOpen,
        toggleNotifications,
        isNotificationsViewOpen,
        setIsNotificationsViewOpen,
        toggleNotificationsView,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
