import api from "../api";
import { useState, useEffect } from "react";
import { Loader, Globe, X, Send, FileText, CheckSquare } from "lucide-react";
import { useSelectedNotes } from "../contexts/SelectedNotesContext";
import { useSelectedTasks } from "../contexts/SelectedTasksContext";

function AssistantPanel({ onClose }) {
  const [chatHistory, setChatHistory] = useState([]);
  const [chat, setChat] = useState("");
  const { selectedNotes, setSelectedNotes } = useSelectedNotes();
  const { selectedTasks, setSelectedTasks } = useSelectedTasks();
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const [ isLoading, setIsLoading ] = useState(false);

  // Load chat history on mount
  useEffect(() => {
    const saved = sessionStorage.getItem("chatHistory");
    if (saved) {
      try {
        setChatHistory(JSON.parse(saved));
      } catch (error) {
        console.error("Failed to load chat history:", error);
      }
    }
  }, []);

  // Save chat history whenever it changes
  useEffect(() => {
    if (chatHistory.length > 0) {
      sessionStorage.setItem("chatHistory", JSON.stringify(chatHistory));
    }
  }, [chatHistory]);

  const handleOnClick = async () => {
    if (!chat.trim() || isLoading) return;

    setIsLoading(true);
    // Build context from both notes and tasks
    let contextParts = [];

    if (selectedNotes.length > 0) {
      const notesContext = selectedNotes
        .map((note) => `[NOTE] Title: ${note.title}\n${note.body}`)
        .join("\n\n");
      contextParts.push(notesContext);
    }

    if (selectedTasks.length > 0) {
      const tasksContext = selectedTasks
        .map((task) => {
          let taskInfo = `[TASK] Title: ${task.title}\nStatus: ${task.status}\n`;
          if (task.messages && task.messages.length > 0) {
            const messagesText = task.messages
              .map((msg) => `  - ${msg.sender}: ${msg.text}`)
              .join("\n");
            taskInfo += `\nMessages:\n${messagesText}`;
          }
          return taskInfo;
        })
        .join("\n\n");
      contextParts.push(tasksContext);
    }

    const context = contextParts.join("\n\n");

    // const userMessage = context
    //   ? `Context:\n${context}\n\nQuestion:\n${chat}`
    //   : chat;

    const updatedHistory = [
      ...chatHistory,
      {
        role: "user",
        context: context ? context : "",
        message: chat,
      },
    ];

    console.log(updatedHistory);

    setChatHistory(updatedHistory);
    setChat("");
    setSelectedNotes([]);
    setSelectedTasks([]);

    // Show searching indicator
    if (isSearchEnabled) {
      setChatHistory((prev) => [
        ...prev,
        { role: "system", message: "🔍 Searching the web..." },
      ]);
    }

    try {
      const res = await api.post("/llms", {
        messages: updatedHistory,
        use_search: isSearchEnabled,
      });

      // Remove searching indicator
      if (isSearchEnabled) {
        setChatHistory((prev) => prev.filter((msg) => msg.role !== "system"));
      }

      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          message: res.data.message,
          sources: res.data.sources,
        },
      ]);

      setIsLoading(false);
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          message: "Failed to get response. Please try again.",
        },
      ]);
    }
  };

  const hasContext = selectedNotes.length > 0 || selectedTasks.length > 0;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 shadow-2xl flex flex-col border-l border-gray-200 dark:border-gray-700 z-50">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-900">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 flex items-center justify-center shadow-md">
            <Loader color="#6366f1" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">
            AI Assistant
          </h3>

          {/* Web Search Toggle */}
          <button
            onClick={() => setIsSearchEnabled(!isSearchEnabled)}
            className="ml-3 p-3 rounded-xl transition-all duration-300 hover:scale-110"
          >
            <Globe
              className={`w-6 h-6 transition-all duration-300 ${
                isSearchEnabled
                  ? "text-indigo-500 drop-shadow-lg"
                  : "text-slate-300"
              }`}
            />
          </button>
        </div>
        <button
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition group"
          onClick={onClose}
        >
          <X className="w-5 h-5 group-hover:rotate-90 transition" />
        </button>
      </div>

      {/* Context indicator */}
      {hasContext && (
        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 border-b border-indigo-200 dark:border-indigo-800">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-indigo-700 dark:text-indigo-300 font-medium">
              Context included:
            </span>
            {selectedNotes.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/50 rounded-full text-blue-700 dark:text-blue-300">
                <FileText className="w-3 h-3" />
                <span className="text-xs font-medium">
                  {selectedNotes.length}{" "}
                  {selectedNotes.length === 1 ? "note" : "notes"}
                </span>
              </div>
            )}
            {selectedTasks.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/50 rounded-full text-green-700 dark:text-green-300">
                <CheckSquare className="w-3 h-3" />
                <span className="text-xs font-medium">
                  {selectedTasks.length}{" "}
                  {selectedTasks.length === 1 ? "task" : "tasks"}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
        {chatHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
              How can I help you?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Ask me anything about your notes and tasks
            </p>
            <div className="text-xs text-gray-500 dark:text-gray-500 space-y-1">
              <p className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Select Notes, Tasks with Ctrl+Click to add context
              </p>
            </div>
          </div>
        ) : (
          chatHistory.map((item, index) => (
            <div
              key={index}
              className={`flex ${
                item.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-sm ${
                  item.role === "user"
                    ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-br-none"
                    : "bg-white dark:bg-gray-800 text-gray-800 dark:text-white rounded-bl-none border border-gray-200 dark:border-gray-700"
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {item.message}
                  <br />
                  {item.sources?.length > 0 && (
                    <ol className="mt-2 ml-4 list-decimal text-sm text-slate-500">
                      {item.sources.map((source, index) => (
                        <li key={index} className="break-all">
                          {source}
                        </li>
                      ))}
                    </ol>
                  )}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex gap-2">
          <textarea
            placeholder={
              hasContext
                ? "Ask about your selected notes and tasks..."
                : "Type your message..."
            }
            rows={2}
            value={chat}
            onChange={(e) => setChat(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleOnClick();
              }
            }}
            disabled={isLoading}
            className={`flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none shadow-sm ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          />
          <button
            className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg transition font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleOnClick}
            disabled={isLoading || !chat.trim()}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default AssistantPanel;
