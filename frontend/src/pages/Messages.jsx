import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

function Messages() {
  const { theme } = useTheme();

  const { currentUser } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

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
    const res = await api.get(`/messages/${selectedUser._id}`);
    setMessages(res.data);
  };

  const capitalize = (str) => {
    return `${str[0].toUpperCase()}${str.slice(1)}`;
  };

  if (!selectedUser) {
    return (
      <div className="max-w-4xl p-7">
        <h2
          className={`text-2xl font-bold text-gray-800 mb-3 ${
            theme === "dark" ? "text-white" : "text-black"
          }`}
        >
          Inbox
        </h2>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {conversations.map((user) => (
    <div
      key={user._id}
      onClick={() => setSelectedUser(user)}
      className={`p-6 rounded-xl shadow-lg hover:shadow-xl border transition cursor-pointer
        ${
          theme === "dark"
            ? "bg-gray-800 border-gray-700 hover:border-indigo-500"
            : "bg-white border-gray-200 hover:border-indigo-500"
        }
      `}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg
            ${
              theme === "dark"
                ? "bg-indigo-900/30 text-indigo-400"
                : "bg-indigo-100 text-indigo-600"
            }
          `}
        >
          {user.name[0].toUpperCase()}
        </div>

        <div>
          <h3
            className={`font-semibold ${
              theme === "dark" ? "text-white" : "text-gray-800"
            }`}
          >
            {capitalize(user.name)}
          </h3>

          <p
            className={`text-sm ${
              theme === "dark" ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Click to view messages
          </p>
        </div>
      </div>
    </div>
  ))}
</div>

      </div>
    );
  }

  return (
<div className="h-full flex flex-col text-sm max-w-4xl p-7">
  {/* Header */}
  <div className="flex items-center gap-4 mb-4">
    <button
      onClick={() => setSelectedUser(null)}
      className={`px-4 py-2 rounded-lg transition font-medium
        ${
          theme === "dark"
            ? "bg-gray-700 hover:bg-gray-600 text-white"
            : "bg-gray-200 hover:bg-gray-300 text-gray-800"
        }
      `}
    >
      ← Back
    </button>

    <h2
      className={`text-2xl font-bold ${
        theme === "dark" ? "text-white" : "text-gray-800"
      }`}
    >
      {capitalize(selectedUser.name)}
    </h2>
  </div>

  {/* Messages container */}
  <div
    className={`flex-1 rounded-xl p-4 overflow-y-auto no-scrollbar space-y-2
      ${
        theme === "dark"
          ? "bg-gray-900"
          : "bg-[#F9FAFB]"
      }
    `}
  >
    {messages.map((msg) => {
      const isMe = msg.sender_id === currentUser.id;

      return (
        <div
          key={msg._id}
          className={`flex ${isMe ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`relative max-w-[75%] px-3 pt-2 pb-1 text-sm leading-relaxed shadow-sm
              ${
                isMe
                  ? "bg-[#dcf8c6] text-gray-900 rounded-2xl rounded-br-sm"
                  : theme === "dark"
                  ? "bg-gray-700 text-white rounded-2xl rounded-bl-sm"
                  : "bg-white text-gray-900 rounded-2xl rounded-bl-sm"
              }
            `}
          >
            {/* Message text */}
            <p className="whitespace-pre-wrap break-words">
              {msg.content}
            </p>

            {/* Timestamp */}
            <div className="flex justify-end mt-1">
              <span
                className={`text-[11px] leading-none ${
                  isMe
                    ? "text-gray-600"
                    : theme === "dark"
                    ? "text-gray-400"
                    : "text-gray-500"
                }`}
              >
                {new Date(msg.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        </div>
      );
    })}
  </div>

  {/* Input area */}
  <div className="mt-4 mb-4 flex gap-5">
    <textarea
      value={replyText}
      placeholder="Type your reply..."
      onChange={(e) => setReplyText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          sendReply();
        }
      }}
      rows="1"
      className={`flex-1 px-4 py-3 rounded-lg resize-none transition
        border focus:outline-none focus:ring-2 focus:ring-indigo-500
        ${
          theme === "dark"
            ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
            : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
        }
      `}
    />

    <button
      onClick={sendReply}
      disabled={sending}
      className="px-4 py-3 rounded-lg font-medium transition
        bg-indigo-600 hover:bg-indigo-700 text-white
        disabled:bg-gray-400"
    >
      {sending ? "Sending..." : "Send"}
    </button>
  </div>
</div>

  );
}

export default Messages;
