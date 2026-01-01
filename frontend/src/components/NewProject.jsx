import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SquarePlus, TextInitial, FileText, AlertCircle } from "lucide-react";
import api from "../api";
import { useTheme } from "../contexts/ThemeContext";

function NewProject() {
  const { theme } = useTheme();

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

      setTitle("");
      setDescription("");
      setError("");

      navigate("/home/projects");
    } catch (err) {
      setError("Failed to create project");
    }
  };

  return (
    <div className="w-full max-w-screen-xl mx-auto p-7">
      <div className="flex items-center gap-3 mb-6">
        <SquarePlus className="w-8 h-8 text-indigo-500 group-hover:text-indigo-600 transition-colors" />

        <h2
          className={`text-3xl font-bold ${
            theme === "dark" ? "text-white" : "text-black"
          }`}
        >
          Create New Project
        </h2>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div
        className={`rounded-xl shadow-lg p-6 space-y-6 border ${
          theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
        }`}
      >
        <div>
          <label
            className={`flex items-center gap-2 text-sm font-medium mb-2 ${
              theme === "dark" ? "text-gray-300" : "text-gray-700"
            }`}
          >
            <FileText className="w-4 h-4" />
            Project Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter project title"
            className={`w-full px-4 py-3 rounded-lg border transition shadow-sm
    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
    ${
      theme === "dark"
        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
        : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
    }
  `}
          />
        </div>

        <div>
          <label
            className={`flex items-center gap-2 text-sm font-medium mb-2 ${
              theme === "dark" ? "text-gray-300" : "text-gray-700"
            }`}
          >
            <TextInitial className="w-4 h-4" />
            Project Description
          </label>
          <textarea
            placeholder="Describe your project..."
            rows="10"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`w-full px-4 py-3 rounded-lg resize-none transition shadow-sm
    border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
    ${
      theme === "dark"
        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
        : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
    }
  `}
          />
        </div>

        <button
          onClick={createProject}
          className="w-fit px-6 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 rounded-lg transition duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.01]"
        >
          Create Project
        </button>
      </div>
    </div>
  );
}

export default NewProject;
