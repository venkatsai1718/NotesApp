import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import "../css/Projects.css";

import api from "../api";


function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch all projects
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


  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h2>Your Projects</h2>

      {projects.length === 0 ? (
        <p>No projects created yet.</p>
      ) : (
        <div className="projects-list">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`${project.id}`}
              className="project-card-link"
            >
              <div className="project-card">
                <h3>{project.title}</h3>
                <p>{project.description || "No description"}</p>
                <small>
                  Notes: {project.notes.length} | Created: {project.createdAt}
                </small>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default Projects;
