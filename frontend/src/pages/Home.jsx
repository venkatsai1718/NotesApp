import { useState } from "react";
import { Link, useOutlet, useNavigate } from "react-router-dom";
import {
  Moon,
  Sun,
  SquarePlus,
  FolderOpen,
  MessageCircle,
  CircleCheckBig,
  Brain,
  LogOut,
  User,
} from "lucide-react";
import AssistantPanel from "../components/AssistantPanel";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

function Home() {
  const { currentUser, loading } = useAuth();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const outlet = useOutlet();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/", { replace: true });
  };

  const capitalize = (str) => {
    return `${str[0].toUpperCase()}${str.slice(1)}`;
  };

  return (
    <div
      className={`flex min-h-screen ${
        theme === "dark" ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      {/* Sidebar */}
      <aside
        className={`w-64 ${
          theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
        } border-r shadow-lg flex flex-col overflow-y-auto no-scrollbar`}
      >
        <div
          className={`p-6 border-b ${
            theme === "dark" ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <Link to="/home" className="block">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    theme === "dark" ? "bg-indigo-900/50" : "bg-indigo-100"
                  }`}
                >
                  <User
                    className={`w-5 h-5 ${
                      theme === "dark" ? "text-indigo-400" : "text-indigo-600"
                    }`}
                  />
                </div>
                <h3
                  className={`text-xl font-bold ${
                    theme === "dark" ? "text-white" : "text-gray-800"
                  } hover:text-indigo-600 transition`}
                >
                  {capitalize(currentUser.name)}
                </h3>
              </div>
            </Link>
            <button
              className={`px-2.5 py-2.5 rounded-full transition-colors duration-300 ease-in-out font-medium ${
                theme === "dark"
                  ? "bg-white/95 hover:bg-white text-gray-900"
                  : "bg-[oklch(27.9%_0.041_260.031)] hover:bg-[oklch(32%_0.05_260)] text-gray-100"
              }`}
              onClick={toggleTheme}
            >
              {theme === "light" ? (
                <>
                  <Moon className="w-4 h-4" strokeWidth={2.5} />
                  {/* <span>Dark Mode</span> */}
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4" strokeWidth={2.5} />
                  {/* <span>Light Mode</span> */}
                </>
              )}
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            <li>
              <Link
                to="new-project"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                  theme === "dark"
                    ? "hover:bg-gray-700 text-gray-200"
                    : "hover:bg-indigo-50 text-gray-700"
                } transition font-medium group`}
              >
<SquarePlus className="w-5 h-5 group-hover:text-indigo-600 transition" />

                <span>New Project</span>
              </Link>
            </li>
            <li>
              <Link
                to="projects"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                  theme === "dark"
                    ? "hover:bg-gray-700 text-gray-200"
                    : "hover:bg-indigo-50 text-gray-700"
                } transition font-medium group`}
              >
                <FolderOpen className="w-5 h-5 group-hover:text-indigo-600 transition" />
                <span>Your Projects</span>
              </Link>
            </li>
            <li>
              <Link
                to="/home/messages"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                  theme === "dark"
                    ? "hover:bg-gray-700 text-gray-200"
                    : "hover:bg-indigo-50 text-gray-700"
                } transition font-medium group`}
              >
                <MessageCircle className="w-5 h-5 group-hover:text-indigo-600 transition" />
                <span>Messages</span>
              </Link>
            </li>
            <li>
              <Link
                to="/home/tasks"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                  theme === "dark"
                    ? "hover:bg-gray-700 text-gray-200"
                    : "hover:bg-indigo-50 text-gray-700"
                } transition font-medium group`}
              >
                <CircleCheckBig className="w-5 h-5 group-hover:text-indigo-600 transition" />
                <span>Tasks</span>
              </Link>
            </li>
            <li>
              <button
                onClick={() => setAssistantOpen(true)}
                className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-lg ${
                  theme === "dark"
                    ? "hover:bg-gray-700 text-gray-200"
                    : "hover:bg-indigo-50 text-gray-700"
                } transition font-medium group`}
              >
                <Brain className="w-5 h-5 group-hover:text-indigo-600 transition" />
                <span>Assistant</span>
              </button>
            </li>
            <li className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 text-left px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition font-medium group"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 no-scrollbar">
        {outlet ? (
          outlet
        ) : (
          <div className="max-w-4xl pt-20 pl-10">
            <div className="flex items-center gap-4 mb-4">
              <h1
                className={`text-4xl font-bold ${
                  theme === "dark" ? "text-white" : "text-gray-800"
                }`}
              >
                Welcome Back 👋
              </h1>
            </div>
            <p
              className={`text-xl ${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              }`}
            >
              Your secure vault for notes and projects.
            </p>
          </div>
        )}
      </main>

      {/* Assistant Panel */}
      {assistantOpen && (
        <AssistantPanel onClose={() => setAssistantOpen(false)} />
      )}
    </div>
  );
}

export default Home;
