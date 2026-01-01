import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Bell,
  X,
  Plus,
  Send,
  Trash2,
  Users,
  FileText,
  NotebookPen,
  UserPlus,
} from "lucide-react";
import api from "../api";
import { useAuth } from "../contexts/AuthContext";
import { useSelectedNotes } from "../contexts/SelectedNotesContext";
import { useTheme } from "../contexts/ThemeContext";

function ProjectDetails() {
  const { theme } = useTheme();

  const { projectId } = useParams();
  const { currentUser, loading } = useAuth();
  const [error, setError] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [newNote, setNewNote] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);

  const { selectedNotes, setSelectedNotes } = useSelectedNotes();

  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [notifyMessage, setNotifyMessage] = useState("");

  const [selectedMember, setSelectedMember] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const [project, setProject] = useState({
    id: "",
    title: "",
    description: "",
    members: [],
    notes: [],
    createdBy: "",
    createdAt: "",
  });
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showModal]);

  useEffect(() => {
    if (loading || !currentUser) return;

    const fetchProject = async () => {
      try {
        const res = await api.get(`/projects/${projectId}`);
        setProject(res.data);
      } catch (err) {
        console.error("Failed to load project", err);
      }
    };

    fetchProject();
  }, [loading, currentUser, projectId]);

  const saveNote = async () => {
    if (!noteTitle.trim() || !newNote.trim()) return;

    const notePayload = { title: noteTitle.trim(), body: newNote.trim() };

    try {
      if (editingIndex) {
        await api.put(
          `/projects/${projectId}/notes/${editingIndex}`,
          notePayload
        );

        setProject((prev) => ({
          ...prev,
          notes: prev.notes.map((n) =>
            n.id === editingIndex
              ? { ...n, ...notePayload, createdAt: new Date().toLocaleString() }
              : n
          ),
        }));
      } else {
        const res = await api.post(`/projects/${projectId}/notes`, notePayload);
        const newNoteObj = {
          ...notePayload,
          createdAt: new Date().toLocaleString(),
          id: res.data.note_id,
        };

        setProject((prev) => ({
          ...prev,
          notes: [...(prev.notes || []), newNoteObj],
        }));
      }

      setNoteTitle("");
      setNewNote("");
      setEditingIndex(null);
      setShowModal(false);
    } catch (err) {
      console.error("Failed to save note", err);
    }
  };

  const handleDeleteNote = async () => {
    if (!editingIndex) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this note?"
    );
    if (!confirmDelete) return;

    try {
      await api.delete(`/projects/${projectId}/notes/${editingIndex}`);

      setProject((prev) => ({
        ...prev,
        notes: prev.notes.filter((note) => note.id !== editingIndex),
      }));

      setShowModal(false);
      setEditingIndex(null);
      setNoteTitle("");
      setNewNote("");
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  const handleAddMember = async () => {
    if (!memberEmail.trim()) {
      setError("Email is required");
      return;
    }

    try {
      setError("");

      const res = await api.post(`/projects/${projectId}/members`, {
        email: memberEmail.trim(),
      });

      setProject((prev) => ({
        ...prev,
        members: [...prev.members, res.data.member],
      }));

      setMemberEmail("");
    } catch (err) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Failed to add member");
      }
    }
  };

  const handleMemberClick = (member) => {
    setSelectedMember(member);
    setMessageText("");
  };

  const sendMessageToMember = async () => {
    if (!messageText.trim()) return;

    try {
      setSendingMessage(true);
      await api.post("/messages", {
        receiver_id: selectedMember.id,
        content: messageText.trim(),
      });

      setSelectedMember(null);
      setMessageText("");
    } catch (err) {
      console.error("Failed to send message", err.response?.data || err);
    } finally {
      setSendingMessage(false);
    }
  };

  const capitalize = (str) => {
    return `${str[0].toUpperCase()}${str.slice(1)}`;
  };

  const handleSendNotification = () => {
    selectedMembers.forEach((member) => {
      window.emailjs.send("service_vdtt318", "template_tsl5c89", {
        sender_name: currentUser.name,
        receiver_name: member.name,
        email: member.email,
        message: notifyMessage,
      });
    });

    setShowNotifyModal(false);
    setSelectedMembers([]);
    setNotifyMessage("");
  };

  if (!localStorage.getItem("token")) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!currentUser || !project?.createdBy) {
    return (
      <p className="text-gray-600 dark:text-gray-400">Project not available</p>
    );
  }

  const isCreator =
    currentUser &&
    project?.createdBy &&
    String(project.createdBy) === String(currentUser.id);

  const sortedNotes = [...project.notes].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  return (
    <div
      className="
  max-w-7xl
  text-sm
  leading-relaxed
  space-y-4
  p-7
"
    >
      {/* Project Info */}
      <section
        className={`rounded-xl shadow-lg p-6 border ${
          theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
        }`}
      >
        <h2
          className={`text-2xl font-bold text-gray-800 mb-4 ${
            theme === "dark" ? "text-white" : "text-black"
          }`}
        >
          {capitalize(project.title)}
        </h2>
        <p
          className={`text-lg mb-6 ${
            theme === "dark" ? "text-gray-400" : "text-gray-600"
          }`}
        >
          {project.description || "No description"}
        </p>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h4
              className={`text-lg font-semibold ${
                theme === "dark" ? "text-white" : "text-gray-800"
              }`}
            >
              Team Members
            </h4>
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg transition font-medium shadow-md hover:shadow-lg"
            onClick={() => setShowNotifyModal(true)}
          >
            <Bell className="w-4 h-4" />
            Notify Team
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm flex items-center gap-2">
            <X className="w-4 h-4" />
            {error}
          </div>
        )}

        {isCreator && (
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Add member by email"
              value={memberEmail}
              onChange={(e) => {
                setMemberEmail(e.target.value);
                setError("");
              }}
              className={`flex-1 px-4 py-2 rounded-lg shadow-sm transition
    border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
    ${
      theme === "dark"
        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
        : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
    }
  `}
            />
            <button
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition font-medium shadow-md hover:shadow-lg"
              onClick={handleAddMember}
            >
              <UserPlus className="w-4 h-4" />
              Add
            </button>
          </div>
        )}

        <ul className="space-y-2">
          {project?.members?.map((member) => (
            <li
              key={member.id}
              onClick={() => handleMemberClick(member)}
              className={`w-80 group flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition
    ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"}
  `}
            >
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold text-sm">
                {member.name[0].toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium truncate ${
                    theme === "dark" ? "text-gray-100" : "text-gray-800"
                  }`}
                >
                  {capitalize(member.name)}
                </p>

                <p
                  className={`text-xs truncate ${
                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {member.email}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Notes */}
      <section
        className={`rounded-xl shadow-lg p-6 border transition-colors ${
          theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText
              className={`w-5 h-5 ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            />

            <h4
              className={`text-lg font-semibold ${
                theme === "dark" ? "text-white" : "text-gray-800"
              }`}
            >
              Project Notes
            </h4>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center
        bg-gradient-to-br from-indigo-600 to-purple-600
        hover:from-indigo-700 hover:to-purple-700
        text-white shadow-md hover:shadow-lg transition"
          >
            <Plus className="w-5 h-5 transition group-hover:rotate-90" />
          </button>
        </div>

        {project.notes?.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400">No notes yet.</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Click the + button to create your first note
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedNotes.map((note) => {
              const isSelected = selectedNotes.some((n) => n.id === note.id);

              return (
                <div
                  key={note.id}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition shadow-sm hover:shadow-md
    ${
      isSelected
        ? theme === "dark"
          ? "border-indigo-500 bg-gradient-to-br from-indigo-900/30 to-purple-900/30"
          : "border-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50"
        : theme === "dark"
        ? "border-gray-700 bg-gray-700 hover:border-indigo-400"
        : "border-gray-200 bg-white hover:border-indigo-300"
    }
  `}
                  onClick={(e) => {
                    if (e.ctrlKey || e.metaKey) {
                      setSelectedNotes((prev) =>
                        prev.some((n) => n.id === note.id)
                          ? prev.filter((n) => n.id !== note.id)
                          : [...prev, note]
                      );
                      return;
                    }

                    setNoteTitle(note.title);
                    setNewNote(note.body);
                    setEditingIndex(note.id);
                    setShowModal(true);
                  }}
                >
                  <h4
                    className={`mb-2 flex items-center gap-2 font-bold ${
                      theme === "dark" ? "text-white" : "text-gray-800"
                    }`}
                  >
                    <FileText className="w-4 h-4 text-indigo-600" />
                    {capitalize(note.title)}
                  </h4>

                  <p
                    className={`text-sm mb-2 line-clamp-3 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {note.body.length > 100
                      ? note.body.substring(0, 100) + " ..."
                      : note.body}
                  </p>

                  <span
                    className={`text-xs ${
                      theme === "dark" ? "text-gray-500" : "text-gray-500"
                    }`}
                  >
                    Last Updated: {note.createdAt}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Note Modal */}
      {showModal && (
<div
  className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm
    ${
      theme === "dark"
        ? "bg-black/50"
        : "bg-gray-900/40"
    }
  `}
>
  <div
    className={`rounded-xl shadow-2xl max-w-2xl w-full p-6 border
      ${
        theme === "dark"
          ? "bg-gray-800 border-gray-700"
          : "bg-white border-gray-200"
      }
    `}
  >
    {/* Header */}
    <div className="flex items-center justify-between mb-4">
      <h3
        className={`text-2xl font-bold flex items-center gap-2 ${
          theme === "dark" ? "text-white" : "text-gray-800"
        }`}
      >
        <NotebookPen className="w-6 h-6 text-indigo-600" />
        {editingIndex ? "Edit Note" : "Add Note"}
      </h3>

      <button
        onClick={() => {
          setShowModal(false);
          setEditingIndex(null);
          setNoteTitle("");
          setNewNote("");
        }}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition
          ${
            theme === "dark"
              ? "hover:bg-gray-700 text-gray-400"
              : "hover:bg-gray-100 text-gray-600"
          }
        `}
      >
        <X className="w-5 h-5" />
      </button>
    </div>

    {/* Title input */}
    <input
      type="text"
      placeholder="Note title"
      value={noteTitle}
      onChange={(e) => setNoteTitle(e.target.value)}
      className={`w-full px-4 py-3 mb-4 rounded-lg border transition shadow-sm
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
        ${
          theme === "dark"
            ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
            : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
        }
      `}
    />

    {/* Textarea */}
    <textarea
      placeholder="Write your note..."
      value={newNote}
      onChange={(e) => setNewNote(e.target.value)}
      rows="10"
      className={`w-full px-4 py-3 mb-4 rounded-lg resize-none border transition shadow-sm
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
        ${
          theme === "dark"
            ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
            : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
        }
      `}
    />

    {/* Actions */}
    <div className="flex justify-between">
      {editingIndex && (
        <button
          onClick={handleDeleteNote}
          className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium shadow-md"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      )}

      <div className="flex gap-2 ml-auto">
        <button
          onClick={() => {
            setShowModal(false);
            setEditingIndex(null);
            setNoteTitle("");
            setNewNote("");
          }}
          className={`px-6 py-2 rounded-lg transition font-medium shadow-sm
            ${
              theme === "dark"
                ? "bg-gray-600 hover:bg-gray-500 text-white"
                : "bg-gray-300 hover:bg-gray-400 text-gray-800"
            }
          `}
        >
          Cancel
        </button>

        <button
          onClick={saveNote}
          className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium shadow-md
            bg-gradient-to-r from-indigo-600 to-purple-600
            hover:from-indigo-700 hover:to-purple-700
            text-white transition"
        >
          {editingIndex ? "Save Changes" : "Add Note"}
        </button>
      </div>
    </div>
  </div>
</div>

      )}

      {/* Message Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md">
                {selectedMember.name[0].toUpperCase()}
              </div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                {capitalize(selectedMember.name)}
              </h3>
            </div>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your message..."
              rows="6"
              className="w-full px-4 py-3 mb-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none shadow-sm"
            />
            <div className="flex gap-2 justify-end">
              <button
                className="px-6 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-lg transition font-medium shadow-sm"
                onClick={() => setSelectedMember(null)}
              >
                Cancel
              </button>
              <button
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg transition font-medium shadow-md hover:shadow-lg disabled:opacity-50"
                onClick={sendMessageToMember}
                disabled={sendingMessage}
              >
                <Send className="w-4 h-4" />
                {sendingMessage ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notify Modal */}
      {showNotifyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-md">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                Notify Team Members
              </h3>
            </div>

            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
              {project?.members?.map((member) => {
                const isSelected = selectedMembers.some(
                  (m) => m.id === member.id
                );

                return (
                  <div
                    key={member.id}
                    className={`p-3 rounded-lg cursor-pointer transition border-2 ${
                      isSelected
                        ? "bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 border-indigo-500"
                        : "bg-gray-50 dark:bg-gray-700 border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                    onClick={() => {
                      setSelectedMembers((prev) =>
                        prev.some((m) => m.id === member.id)
                          ? prev.filter((m) => m.id !== member.id)
                          : [...prev, member]
                      );
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                        {member.name[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-800 dark:text-white">
                          {capitalize(member.name)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {member.email}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <textarea
              placeholder="Type message to notify..."
              value={notifyMessage}
              onChange={(e) => setNotifyMessage(e.target.value)}
              rows="4"
              className="w-full px-4 py-3 mb-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none shadow-sm"
            />

            <div className="flex gap-2 justify-end">
              <button
                className="px-6 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-lg transition font-medium shadow-sm"
                onClick={() => {
                  setShowNotifyModal(false);
                  setSelectedMembers([]);
                  setNotifyMessage("");
                }}
              >
                Cancel
              </button>

              <button
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg transition font-medium shadow-md hover:shadow-lg disabled:opacity-50"
                disabled={!notifyMessage || selectedMembers.length === 0}
                onClick={handleSendNotification}
              >
                <Bell className="w-4 h-4" />
                Notify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectDetails;
