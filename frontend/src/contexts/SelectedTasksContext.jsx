import { createContext, useContext, useState } from "react";

const SelectedTasksContext = createContext(null);

export const SelectedTasksProvider = ({ children }) => {
  const [selectedTasks, setSelectedTasks] = useState([]);

  return (
    <SelectedTasksContext.Provider
      value={{ selectedTasks, setSelectedTasks }}
    >
      {children}
    </SelectedTasksContext.Provider>
  );
};

export const useSelectedTasks = () => {
  const context = useContext(SelectedTasksContext);
  if (!context) {
    throw new Error(
      "useSelectedNotes must be used inside SelectedNotesProvider"
    );
  }
  return context;
};
