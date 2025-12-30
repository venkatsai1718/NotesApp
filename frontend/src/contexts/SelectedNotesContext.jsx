import { createContext, useContext, useState } from "react";

const SelectedNotesContext = createContext(null);

export const SelectedNotesProvider = ({ children }) => {
  const [selectedNotes, setSelectedNotes] = useState([]);

  return (
    <SelectedNotesContext.Provider
      value={{ selectedNotes, setSelectedNotes }}
    >
      {children}
    </SelectedNotesContext.Provider>
  );
};

export const useSelectedNotes = () => {
  const context = useContext(SelectedNotesContext);
  if (!context) {
    throw new Error(
      "useSelectedNotes must be used inside SelectedNotesProvider"
    );
  }
  return context;
};
