import { Routes, Route, useNavigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import ProjectDetails from "./pages/ProjectDetails";
import Messages from "./pages/Messages";

import NewProject from "./components/NewProject";
import Projects from "./components/Projects";
import ProtectedRoute from "./components/ProtectedRoute";

import "./css/App.css";

function App() {
  return (
    <div className="main-container">
      <Routes>
        <Route path="/" element={<Login />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        >
          <Route path="new-project" element={<NewProject />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:projectId" element={<ProjectDetails />} />
          <Route path="messages" element={<Messages />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
