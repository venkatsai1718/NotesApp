import { useEffect, useState } from "react";
import api from "../api";
import "../css/Messages.css";
import { useAuth } from "../contexts/AuthContext";

function Messages() {
  const { currentUser, loading } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  // Fetch all conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await api.get("/messages/conversations");
        setConversations(res.data);
      } catch (err) {
        console.error("Failed to load conversations", err);
      }
    };
    fetchConversations();
  }, []);

  // Fetch messages when a sender is selected
  useEffect(() => {
    if (!selectedUser) return;

    const fetchMessages = async () => {
      try {
        const res = await api.get(`/messages/${selectedUser._id}`);
        setMessages(res.data);
      } catch (err) {
        console.error("Failed to load messages", err);
      }
    };

    fetchMessages();
  }, [selectedUser]);

  const sendReply = async () => {
    if (!replyText.trim() || !selectedUser) return;

    await api.post("/messages", {
      receiver_id: selectedUser._id,
      content: replyText.trim(),
    });

    setReplyText("");
    // Refresh messages
    const res = await api.get(`/messages/${selectedUser._id}`);
    setMessages(res.data);
  };

  // Render
  if (!selectedUser) {
    // Conversation list
    return (
      <div className="messages-page">
        <h2 className="messages-title">Inbox</h2>
        <div className="messages-container">
          {conversations.map((user) => (
            <div
              key={user._id}
              className="conversation-card"
              onClick={() => setSelectedUser(user)}
            >
              {user.name}
            </div>
          ))}
        </div>
      </div>
    );
  }
const capitalize = (str) => {
  return `${str[0].toUpperCase()}${str.slice(1)}`;
};

  // Messages view
  return (
    <div className="messages-page">
      <h2 className="messages-title">{capitalize(selectedUser.name)}</h2>
      <div className="messages-container">
        {messages.map((msg) => (
          <div
            key={msg._id}
            className={`message-card ${
              msg.sender_id === currentUser.id ? "mine" : "sender"
            }`}
          >
            {/* <div className="message-header">{msg.sender_name}</div> */}
            <div className="message-content">{msg.content}</div>
            <div className="message-time">
              {new Date(msg.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="reply-box">
        <textarea
          value={replyText}
          placeholder="Type your reply..."
          onChange={(e) => setReplyText(e.target.value)}
        />
        <button onClick={sendReply} disabled={sending}>
          {sending ? "Sending..." : "Send"}
        </button>
      </div>

      <button onClick={() => setSelectedUser(null)} className="back-button">
        ← Back to Inbox
      </button>
    </div>
  );
}

export default Messages;
