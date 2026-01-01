import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useTheme } from "../contexts/ThemeContext";


function Projects() {
  const { theme } = useTheme();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await api.get("/projects/");
      setProjects(res.data);
      setError("");
    } catch (err) {
      setError("Failed to fetch projects");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl p-7">
<h2
  className={`text-2xl font-bold text-gray-800 mb-4 ${
    theme === "dark" ? "text-white" : "text-black"
  }`}
>
        Your Projects
      </h2>

      {projects.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            No projects created yet.
          </p>
          <Link
            to="/home/new-project"
            className="inline-block mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
          >
            Create Your First Project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link key={project.id} to={`${project.id}`} className="block group">
<div
  className={`rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 p-6 h-full flex flex-col border
    ${
      theme === "dark"
        ? "bg-gray-800 border-gray-700"
        : "bg-white border-gray-200"
    }
  `}
>

<h3
  className={`text-xl font-bold mb-2 transition ${
    theme === "dark"
      ? "text-white group-hover:text-indigo-400"
      : "text-gray-800 group-hover:text-indigo-600"
  }`}
>
  {project.title}
</h3>

<p
  className={`mb-4 flex-1 line-clamp-2 ${
    theme === "dark"
      ? "text-gray-400"
      : "text-gray-600"
  }`}
>
  {project.description || "No description"}
</p>

<div
  className={`flex items-center justify-between text-sm pt-4 border-t ${
    theme === "dark"
      ? "text-gray-400 border-gray-700"
      : "text-gray-500 border-gray-200"
  }`}
>

                  <span>📝 {project.notes.length} notes</span>
                  <span>{project.createdAt}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default Projects;
