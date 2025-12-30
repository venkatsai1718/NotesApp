import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import "../css/ProjectDetails.css";
import api from "../api";
import { useAuth } from "../contexts/AuthContext";
import { useSelectedNotes } from "../contexts/SelectedNotesContext";

function ProjectDetails() {
  const { projectId } = useParams();
  const { currentUser, loading } = useAuth();
  const [error, setError] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [newNote, setNewNote] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);

  const { selectedNotes, setSelectedNotes } = useSelectedNotes();

  const [project, setProject] = useState({
    id: "",
    title: "",
    description: "",
    members: [],
    notes: [],
    createdBy: "",
    createdAt: "",
  });

  // Fetch project details
  useEffect(() => {
    if (loading || !currentUser) return;

    const fetchProject = async () => {
      try {
        // console.log("1. Fetching project for user:", currentUser);
        const res = await api.get(`/projects/${projectId}`);
        // console.log("2. Project data:", res.data);
        setProject(res.data);
      } catch (err) {
        console.error("Failed to load project", err);
      }
    };

    fetchProject();
  }, [loading, currentUser, projectId]);

  // Save note (add or update)
  const saveNote = async () => {
    if (!noteTitle.trim() || !newNote.trim()) return;

    const notePayload = { title: noteTitle.trim(), body: newNote.trim() };

    try {
      if (editingIndex) {
        // Update existing note
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
        // Add new note
        const res = await api.post(`/projects/${projectId}/notes`, notePayload);
        const newNoteObj = {
          ...notePayload,
          createdAt: new Date().toLocaleString(),
          id: res.data.note_id, // backend-generated ID
        };

        setProject((prev) => ({
          ...prev,
          notes: [...(prev.notes || []), newNoteObj],
        }));
      }

      // Reset modal
      setNoteTitle("");
      setNewNote("");
      setEditingIndex(null);
      setShowModal(false);
    } catch (err) {
      console.error("Failed to save note", err);
    }
  };

const handleDeleteNote = async () => {
  if (!editingIndex) return; // safety check

  const confirmDelete = window.confirm("Are you sure you want to delete this note?");
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
    //console.error("Failed to delete note:", err);
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

  const [selectedMember, setSelectedMember] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const handleMemberClick = (member) => {
    setSelectedMember(member);
    setMessageText("");
  };

  const sendMessageToMember = async () => {
    if (!messageText.trim()) return;

    try {
      setSendingMessage(true);
      const res = await api.post("/messages", {
        receiver_id: selectedMember.id,
        content: messageText.trim(),
      });

      // console.log("Message sent:", res.data);
  sendEmailNotification({'sender_name':currentUser.name, 'receiver_name': selectedMember.name,'email': selectedMember.email, 'message': messageText.trim()});

      // close modal
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
  if (!localStorage.getItem("token")) {
    return null;
  }

  if (loading) {
    return <p>Loading project...</p>;
  }

  // Data not available (after API failure)
  if (!currentUser || !project?.createdBy) {
    return <p>Project not available</p>;
  }

  const isCreator =
    currentUser &&
    project?.createdBy &&
    String(project.createdBy) === String(currentUser.id);
  // console.log("isCreator:", isCreator, "currentUser.id:", currentUser?.id, "project.createdBy:", project?.createdBy);

  const sortedNotes = [...project.notes].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

const sendEmailNotification = (data) => {
  if (!window.emailjs) {
    console.error("EmailJS not loaded");
    return;
  }
  window.emailjs
    .send(
      "service_vdtt318",
      "template_tsl5c89",
      {
        email: data.email,
        sender_name: data.sender_name,
        receiver_name: data.receiver_name,
        message: data.message,
      }
    )
    .then(
      (result) => {
        console.log("Email sent", result.text);
      },
      (error) => {
        console.error("Email failed", error);
      }
    );
};


  return (
    <div className="container">
      {/* Project Info */}
      <section className="project-info">
        <h2 className="project-title">{capitalize(project.title)}</h2>
        <p className="project-description">
          {project.description || "No description"}
        </p>
        <h4 className="members">Members</h4>
        {error && (
          <p
            style={{
              marginTop: "6px",
              marginBottom: "0",
              fontSize: "13px",
              color: "#d32f2f",
            }}
          >
            {error}
          </p>
        )}

        {isCreator && (
          <div className="add-member-section">
            <input
              type="text"
              placeholder="Add member by email"
              value={memberEmail}
              onChange={(e) => {
                setMemberEmail(e.target.value);
                setError("");
              }}
            />
            <button className="add-member-btn" onClick={handleAddMember}>
              Add
            </button>
          </div>
        )}

        <ul className="member-list">
          {project?.members?.map((member) => (
            <li
              key={member.id}
              className="member"
              onClick={() => handleMemberClick(member)}
            >
              {capitalize(member.name)} - {member.email}
            </li>
          ))}
        </ul>
      </section>

      {selectedMember && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>{capitalize(selectedMember.name)}</h3>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your message..."
            />
            <div className="modal-actions">
              <button
                className="cancel"
                onClick={() => setSelectedMember(null)}
              >
                Cancel
              </button>
              <button
                className="add"
                onClick={sendMessageToMember}
                disabled={sendingMessage}
              >
                {sendingMessage ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      <section className="project-notes">
        <div className="notes-header">
          <h4 className="notes-title">Notes</h4>
          <button className="add-note-btn" onClick={() => setShowModal(true)}>
            +
          </button>
        </div>
<div className="notes">
  {project.notes?.length === 0 ? (
    <p>No notes yet.</p>
  ) : (
    sortedNotes.map((note) => {
      const isSelected = selectedNotes.some((n) => n.id === note.id);

      return (
        <div
          key={note.id}
          className={`note-card ${isSelected ? "selected" : ""}`}
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
          <h4 className="note-title">{capitalize(note.title)}</h4>

          <p className="note-text">
            {note.body.length > 100
              ? note.body.substring(0, 100) + " ..."
              : note.body}
          </p>

          <span className="note-date">
            Last Updated: {note.createdAt}
          </span>
        </div>
      );
    })
  )}
</div>

      </section>

{/* Modal */}
{showModal && (
  <div className="modal-backdrop">
    <div className="modal">
      <h3>{editingIndex ? "Edit Note" : "Add Note"}</h3>

      <input
        type="text"
        placeholder="Note title"
        value={noteTitle}
        onChange={(e) => setNoteTitle(e.target.value)}
        className="note-title-input"
      />

      <textarea
        placeholder="Write your note..."
        value={newNote}
        onChange={(e) => setNewNote(e.target.value)}
      />

      <div className="modal-actions">
        {/* LEFT SIDE */}
        {editingIndex && (
          <button className="delete" onClick={handleDeleteNote}>
            Delete
          </button>
        )}

        {/* RIGHT SIDE */}
        <div className="right-actions">
          <button
            className="cancel"
            onClick={() => {
              setShowModal(false);
              setEditingIndex(null);
              setNoteTitle("");
              setNewNote("");
            }}
          >
            Cancel
          </button>

          <button className="add" onClick={saveNote}>
            {editingIndex ? "Save Changes" : "Add"}
          </button>
        </div>
      </div>
    </div>
  </div>
)}

    </div>
  );
}

export default ProjectDetails;
