import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/NewProject.css";

import api from "../api";

function NewProject() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

const createProject = async () => {
  if (!title.trim()) {
    setError("Project title is required");
    return;
  }

  const newProject = {
    title: title.trim(),
    description: description.trim(),
  };

  try {
    await api.post("/projects", newProject);

    // reset
    setTitle("");
    setDescription("");
    setError("");

    navigate("/home/projects");
  } catch (err) {
    setError("Failed to create project");
  }
};

  return (
    <div className="new-project">
      <h2>Create New Project</h2>

      {error && <p className="error">{error}</p>}

      <input
        type="text"
        placeholder="Project Title *"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        placeholder="Project Description"
        rows="10" cols="50"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <button className="create-btn" onClick={createProject}>
        Create Project
      </button>
    </div>
  );
}

export default NewProject;
