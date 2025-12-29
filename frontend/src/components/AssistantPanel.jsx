import api from "../api";
import { useState } from "react";
import "../css/AssistantPanel.css";

function AssistantPanel({ onClose }) {
  const [chatHistory, setChatHistory] = useState([]);
  const [chat, setChat] = useState("");

  const handleOnClick = async () => {
    if (!chat.trim()) return;

    try {
      const newMessage = { role: "user", message: chat };
      const updatedHistory = [...chatHistory, newMessage];

      setChatHistory(updatedHistory);
      setChat("");
      const res = await api.post("/llms", {
        messages: updatedHistory,
      });

      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", message: JSON.stringify(res.data.message) },
      ]);
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          message: "⚠️ Failed to get response",
        },
      ]);
    }
  };

  return (
    <div className="assistant-panel">
      <div className="panel-header">
        <h3>Assistant</h3>

        <button className="close-btn" onClick={onClose}>
          X
        </button>
      </div>

      <div className="assistant-body">
        {chatHistory.map((item, index) => (
          <div key={index} className={`chat-row ${item.role}`}>
            <div className="chat-bubble">{item.message}</div>
          </div>
        ))}
      </div>

      <div className="input-bar">
        <textarea
          placeholder="Type your message..."
          rows={1}
          value={chat}
          onChange={(e) => setChat(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleOnClick();
            }
          }}
        />
        <button
          className="send-btn"
          onClick={handleOnClick}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default AssistantPanel;
