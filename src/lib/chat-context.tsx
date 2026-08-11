"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

interface ChatContextValue {
  panelOpen: boolean;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
}

const ChatContext = createContext<ChatContextValue>({
  panelOpen: false,
  togglePanel: () => {},
  openPanel: () => {},
  closePanel: () => {},
});

export function ChatProvider({ children }: { children: ReactNode }) {
  const [panelOpen, setPanelOpen] = useState(false);

  const togglePanel = useCallback(() => setPanelOpen((v) => !v), []);
  const openPanel = useCallback(() => setPanelOpen(true), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);

  return (
    <ChatContext.Provider
      value={{ panelOpen, togglePanel, openPanel, closePanel }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatPanel() {
  return useContext(ChatContext);
}
