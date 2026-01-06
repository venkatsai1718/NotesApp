import { Routes, Route, Outlet } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import ProjectDetails from "./pages/ProjectDetails";
import Messages from "./pages/Messages";

import NewProject from "./components/NewProject";
import Projects from "./components/Projects";
import ProtectedRoute from "./components/ProtectedRoute";
import Tasks from './components/Tasks'

import { SelectedNotesProvider } from "./contexts/SelectedNotesContext";
import { SelectedTasksProvider } from "./contexts/SelectedTasksContext";
import { ThemeProvider } from "./contexts/ThemeContext";

// import "./css/App.css";

const NotesLayout = () => (
      <SelectedTasksProvider>

  <SelectedNotesProvider>
    <Outlet />
  </SelectedNotesProvider>
      </SelectedTasksProvider>

);

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<NotesLayout />}>
          <Route
            path="/home"
            element={
              <ThemeProvider>
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              </ThemeProvider>
            }
          >

            <Route path="new-project" element={<NewProject />} />
            <Route path="projects" element={<Projects />} />
            <Route path="tasks" element={<Tasks />} />

            <Route path="projects/:projectId" element={<ProjectDetails />} />

            <Route path="messages" element={<Messages />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default App;
