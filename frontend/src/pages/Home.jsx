import { useState } from "react";
import { Link, useOutlet, useNavigate } from "react-router-dom";
import AssistantPanel from "../components/AssistantPanel";
import { useAuth } from "../contexts/AuthContext";

import "../css/Home.css";

function Home() {
  const { currentUser, loading } = useAuth();
  const [assistantOpen, setAssistantOpen] = useState(false);

  const outlet = useOutlet();

  const navigate = useNavigate();
  const logout = () => {
    localStorage.removeItem("token");
    navigate("/", { replace: true });
  };

  const capitalize = (str) => {
    return `${str[0].toUpperCase()}${str.slice(1)}`;
  };
  return (
    <div className="home-container">
      <aside className="sidebar">
        <h3>
          <Link to="/home">{capitalize(currentUser.name)} - Dashboard</Link>
        </h3>

        <nav>
          <ul>
            <li>
              <Link to="new-project">New Project</Link>
            </li>
            <li>
              <Link to="projects">Your Projects</Link>
            </li>
            <li>
              <Link to="/home/messages">Messages</Link>
            </li>
            <li
              onClick={() => setAssistantOpen(true)}
              style={{ cursor: "pointer" }}
            >
              Assistant
            </li>{" "}
            <li>
              <a onClick={logout}>Logout</a>
            </li>
          </ul>
        </nav>
      </aside>

      <main className="main-content">
        {outlet ? (
          outlet
        ) : (
          <>
            <h1>Welcome 👋</h1>
            <p>Vault for your notes.</p>
          </>
        )}
      </main>
      {assistantOpen && (
        <AssistantPanel onClose={() => setAssistantOpen(false)} />
      )}
    </div>
  );
}

export default Home;
