import { useState, useEffect, useRef, useMemo } from "react";
import {
  MessageSquare,
  Plus,
  X,
  Send,
  Reply,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Check,
  Clock,
} from "lucide-react";
import api from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { useSelectedTasks } from "../contexts/SelectedTasksContext";

export default function CollaborativeTaskManager() {
  const { theme } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [message, setMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [collapsedThreads, setCollapsedThreads] = useState(new Set());

  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [mentionPosition, setMentionPosition] = useState(undefined);
  const messageInputRef = useRef(null);
  const cursorPositionRef = useRef(0);

  const { selectedTasks, setSelectedTasks } = useSelectedTasks();

  const selectedTask = useMemo(() => {
    return tasks.find((t) => t.id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  /* Get current user */
  useEffect(() => {
    api
      .get("/me")
      .then((res) => setCurrentUser(res.data))
      .catch((err) => console.error("Current user fetch failed", err));
  }, []);

  /* Get users */
  useEffect(() => {
    api
      .get("/users")
      .then((res) => setUsers(res.data))
      .catch((err) => console.error("User fetch failed", err));
  }, []);

  /* load tasks*/
  useEffect(() => {
    const loadTasks = async () => {
      try {
        const res = await api.get("/tasks");
        const tasksWithProperDates = res.data.map((task) => ({
          ...task,
          messages: task.messages || [],
        }));
        setTasks(tasksWithProperDates);
      } catch (err) {
        console.error("Task fetch failed", err);
      }
    };
    loadTasks();
  }, []);

  /* Create Task in DB*/
  const createTaskInDB = async (task) => {
    const res = await api.post("/tasks", task);
    return res.data;
  };

  /* update task in db*/
  const updateTaskInDB = async (task) => {
    const convertMessageFormat = (msg) => ({
      id: msg.id,
      text: msg.text,
      sender: msg.sender,
      timestamp: msg.timestamp,
      parentId: msg.parentId,
      replies: (msg.replies || []).map(convertMessageFormat),
    });

    const payload = {
      title: task.title,
      status: task.status,
      messages: (task.messages || []).map(convertMessageFormat),
    };

    try {
      const response = await api.put(`/tasks/${task.id}`, payload);
      return response.data;
    } catch (error) {
      console.error(
        "Update error details:",
        error.response?.data || error.message
      );
      throw error;
    }
  };

  const createTask = async () => {
    if (!newTaskTitle.trim()) return;

    const taskToCreate = {
      title: newTaskTitle,
      status: "pending",
      messages: [],
      created_at: new Date().toISOString(),
    };

    try {
      const createdTask = await createTaskInDB(taskToCreate);
      setTasks((prev) => [...prev, createdTask]);
      setNewTaskTitle("");
      setShowCreateTask(false);
      setSelectedTaskId(createdTask.id);
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  };

  const toggleTaskStatus = async (taskId) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const updatedTask = {
      ...task,
      status: task.status === "pending" ? "completed" : "pending",
    };

    setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));

    try {
      await updateTaskInDB(updatedTask);
    } catch (err) {
      console.error("Failed to update task status:", err);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? task : t)));
    }
  };

  const handleKeyDown = (e) => {
    if (showUserSuggestions && filteredUsers.length > 0) {
      if (e.key === "Escape") {
        e.preventDefault();
        setShowUserSuggestions(false);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (filteredUsers[0]) {
          insertMention(filteredUsers[0].username);
        }
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey && !showUserSuggestions) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleMessageChange = (e) => {
    const value = e.target.value;
    const cursor = e.target.selectionStart;

    cursorPositionRef.current = cursor;

    const before = value.slice(0, cursor);
    const atIndex = before.lastIndexOf("@");
    const shouldShow =
      atIndex !== -1 && !before.slice(atIndex + 1).includes(" ");

    setMessage(value);
    setShowUserSuggestions(shouldShow);
    if (shouldShow) {
      setMentionPosition(atIndex);
    }
  };

  const insertMention = (username) => {
    const input = messageInputRef.current;
    if (!input) return;

    const cursor = cursorPositionRef.current;
    const before = message.slice(0, cursor);
    const atIndex = before.lastIndexOf("@");

    const beforeMention = message.slice(0, atIndex);
    const afterCursor = message.slice(cursor);
    const newMessage = `${beforeMention}@${username} ${afterCursor}`;
    const newPos = atIndex + username.length + 2;

    setMessage(newMessage);
    setShowUserSuggestions(false);
    setMentionPosition(undefined);

    requestAnimationFrame(() => {
      if (input) {
        input.focus();
        input.setSelectionRange(newPos, newPos);
      }
    });
  };

  const filteredUsers = useMemo(() => {
    if (!showUserSuggestions || !message || mentionPosition === undefined) {
      return [];
    }

    const cursor = cursorPositionRef.current;
    const searchTerm = message.slice(mentionPosition + 1, cursor).toLowerCase();

    return users.filter(
      (u) => u.username && u.username.toLowerCase().startsWith(searchTerm)
    );
  }, [showUserSuggestions, message, mentionPosition, users]);

  const addReplyToMessage = (messages, parentId, newReply) => {
    let found = false;

    const updateMessages = (msgs) => {
      return msgs.map((msg) => {
        if (msg.id === parentId) {
          found = true;
          return {
            ...msg,
            replies: [...(msg.replies || []), newReply],
          };
        }

        if (msg.replies && msg.replies.length > 0) {
          const updatedReplies = updateMessages(msg.replies);
          if (found) {
            return {
              ...msg,
              replies: updatedReplies,
            };
          }
        }

        return msg;
      });
    };

    return updateMessages(messages);
  };

  const sendEmailNotifications = async (messageText, taskTitle) => {
    const mentionedUsernames =
      messageText.match(/@(\w+)/g)?.map((m) => m.slice(1)) || [];

    const usersToNotify = new Set();

    mentionedUsernames.forEach((username) => {
      const user = users.find((u) => u.username === username);
      if (user && user.email && user.id !== currentUser.id) {
        usersToNotify.add(JSON.stringify(user));
      }
    });

    if (replyingTo) {
      const repliedUser = users.find((u) => u.name === replyingTo.sender);
      if (
        repliedUser &&
        repliedUser.email &&
        repliedUser.id !== currentUser.id
      ) {
        usersToNotify.add(JSON.stringify(repliedUser));
      }
    }

    for (const userStr of usersToNotify) {
      const user = JSON.parse(userStr);
      try {
        if (window.emailjs) {
          await window.emailjs.send("service_vdtt318", "template_tsl5c89", {
            sender_name: currentUser.name,
            receiver_name: user.name,
            email: user.email,
            message: messageText,
            task_title: taskTitle,
          });
          console.log(`Email notification sent to ${user.email}`);
        } else {
          console.warn("EmailJS not loaded");
        }
      } catch (error) {
        console.error(`Failed to send email to ${user.email}:`, error);
      }
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !selectedTask || !currentUser) return;

    const newMsg = {
      id: Date.now().toString(),
      text: message,
      sender: currentUser.name,
      timestamp: new Date().toISOString(),
      parentId: replyingTo?.id || null,
      replies: [],
    };

    let updatedMessages;

    if (replyingTo) {
      updatedMessages = addReplyToMessage(
        [...(selectedTask.messages || [])],
        replyingTo.id,
        newMsg
      );
    } else {
      updatedMessages = [...(selectedTask.messages || []), newMsg];
    }

    const updatedTask = {
      id: selectedTask.id,
      title: selectedTask.title,
      status: selectedTask.status,
      messages: updatedMessages,
      created_at: selectedTask.created_at,
      mentioned_users: selectedTask.mentioned_users || [],
    };

    setTasks((prev) =>
      prev.map((t) => (t.id === selectedTask.id ? updatedTask : t))
    );

    sendEmailNotifications(message, selectedTask.title);

    setMessage("");
    setReplyingTo(null);
    setShowUserSuggestions(false);
    setMentionPosition(undefined);

    try {
      const result = await updateTaskInDB(updatedTask);
      setTasks((prev) => prev.map((t) => (t.id === result.id ? result : t)));
    } catch (err) {
      console.error("Failed to update task:", err);
      try {
        const res = await api.get("/tasks");
        setTasks(res.data);
      } catch (reloadErr) {
        console.error("Failed to reload tasks:", reloadErr);
      }
    }
  };

  const toggleThread = (messageId) => {
    setCollapsedThreads((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const countReplies = (replies) => {
    if (!replies || replies.length === 0) return 0;
    return replies.reduce((count, reply) => {
      return count + 1 + countReplies(reply.replies);
    }, 0);
  };

  const getRelativeTime = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const MessageThread = ({ msg, depth = 0 }) => {
    const hasReplies = msg.replies && msg.replies.length > 0;
    const isCollapsed = collapsedThreads.has(msg.id);
    const replyCount = countReplies(msg.replies);

    return (
      <div className={`${depth > 0 ? "ml-2" : ""}`}>
        <div className="flex gap-2">
          {/* Vertical line for nested comments */}
          {depth > 0 && (
            <div className="flex flex-col items-center w-6 flex-shrink-0">
              <div
                className={`w-0.5 h-full ${
                  theme === "dark" ? "bg-gray-700" : "bg-gray-300"
                }`}
              />
            </div>
          )}

          {/* Vote arrows placeholder (for visual consistency) */}
          <div className="flex flex-col items-center gap-1 pt-2 flex-shrink-0 w-8">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                theme === "dark" ? "bg-gray-700" : "bg-gray-200"
              }`}
            >
              <span className="text-xs font-bold">{msg.sender[0]}</span>
            </div>
          </div>

          {/* Message content */}
          <div className="flex-1 min-w-0 mt-2 p-4 rounded-xl border border-[oklch(80%_0.02_260)] space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-xs font-bold ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {msg.sender}
              </span>
              {/* <span
                className={`text-xs ${
                  theme === "dark" ? "text-gray-500" : "text-gray-400"
                }`}
              >
                •
              </span> */}
              {/* <span
                className={`text-xs ${
                  theme === "dark" ? "text-gray-500" : "text-gray-400"
                }`}
              >
                {getRelativeTime(msg.timestamp)}
              </span> */}
              {replyingTo?.id === msg.id && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                  Replying...
                </span>
              )}
            </div>

            {!isCollapsed && (
              <>
                <div
                  className={`text-sm leading-relaxed mb-2 ${
                    theme === "dark" ? "text-gray-200" : "text-gray-800"
                  }`}
                >
                  {msg.text.split(/(@\w+)/g).map((p, i) =>
                    p.startsWith("@") ? (
                      <span
                        key={i}
                        className={`font-medium ${
                          theme === "dark"
                            ? "text-blue-400 hover:text-blue-300"
                            : "text-blue-600 hover:text-blue-700"
                        } cursor-pointer`}
                      >
                        {p}
                      </span>
                    ) : (
                      p
                    )
                  )}
                </div>

                <div className="flex items-center gap-4 mt-2">
                  <button
                    onClick={() => {
                      setReplyingTo(msg);
                      const senderUser = users.find(
                        (u) => u.name === msg.sender
                      );
                      if (senderUser && senderUser.username) {
                        setMessage(`@${senderUser.username} `);
                      }
                      messageInputRef.current?.focus();
                    }}
                    className={`text-xs font-bold ${
                      theme === "dark"
                        ? "text-gray-400 hover:text-gray-200"
                        : "text-gray-500 hover:text-gray-700"
                    } transition`}
                  >
                    Reply
                  </button>

                  {hasReplies && (
                    <button
                      onClick={() => toggleThread(msg.id)}
                      className={`text-xs font-bold ${
                        theme === "dark"
                          ? "text-gray-400 hover:text-gray-200"
                          : "text-gray-500 hover:text-gray-700"
                      } transition`}
                    >
                      {replyCount} {replyCount === 1 ? "reply" : "replies"}
                    </button>
                  )}
                </div>
              </>
            )}

            {hasReplies && isCollapsed && (
              <button
                onClick={() => toggleThread(msg.id)}
                className={`text-xs font-bold ${
                  theme === "dark"
                    ? "text-blue-400 hover:text-blue-300"
                    : "text-blue-600 hover:text-blue-700"
                } transition`}
              >
                [{replyCount} more {replyCount === 1 ? "reply" : "replies"}]
              </button>
            )}

            {hasReplies && !isCollapsed && (
              <div className="mt-3 space-y-0">
                {msg.replies.map((reply) => (
                  <MessageThread key={reply.id} msg={reply} depth={depth + 1} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const closeModal = () => {
    setSelectedTaskId(null);
    setMessage("");
    setReplyingTo(null);
    setShowUserSuggestions(false);
    setMentionPosition(undefined);
  };

  return (
    <div
      className={`min-h-screen ${
        theme === "dark" ? "bg-gray-900" : "bg-gray-50"
      } p-4 md:p-6 transition-colors`}
    >
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <h2
            className={`text-3xl md:text-4xl font-bold ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}
          >
            Tasks
          </h2>
          <button
            onClick={() => setShowCreateTask(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition font-medium"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">New Task</span>
          </button>
        </div>
      </div>

      {/* Tasks Grid */}
<div className="w-full min-w-0 max-w-5xl mx-auto px-4 lg:pr-[300px]">
        {" "}
        {/* Adjust 420px to your panel width */}
        {tasks.length === 0 ? (
          <div
            className={`text-center py-16 ${
              theme === "dark" ? "text-gray-400" : "text-gray-500"
            }`}
          >
            <MessageSquare size={64} className="mx-auto mb-4 opacity-30" />
            <p className="text-xl mb-2">No tasks yet</p>
            <p className="text-sm">Create your first task to get started</p>
          </div>
        ) : (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">

            {tasks.map((task) => {
              const isSelected = selectedTasks.some((t) => t.id === task.id);

              return (
                <div
                  key={task.id}
                  onClick={(e) => {
                    if (e.ctrlKey || e.metaKey) {
                      setSelectedTasks((prev) =>
                        prev.some((t) => t.id === task.id)
                          ? prev.filter((t) => t.id !== task.id)
                          : [...prev, task]
                      );
                      return;
                    }

                    setSelectedTaskId(task.id);
                  }}
                  className={`p-4 cursor-pointer rounded-lg border transition-all ${
                    theme === "dark"
                      ? "bg-gray-800 border-gray-700 hover:border-gray-600"
                      : "bg-white border-gray-200 hover:border-gray-300"
                  }
                  ${
                    isSelected
                      ? theme === "dark"
                        ? "border-indigo-500 bg-gradient-to-br from-indigo-900/30 to-purple-900/30"
                        : "border-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div
                      className={`font-semibold text-base ${
                        theme === "dark" ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {task.title}
                    </div>
                    {task.status === "completed" ? (
                      <Check
                        size={18}
                        className="text-green-500 flex-shrink-0"
                      />
                    ) : (
                      <Clock
                        size={18}
                        className="text-yellow-500 flex-shrink-0"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span
                      className={`${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {task.status}
                    </span>
                    {task.messages && task.messages.length > 0 && (
                      <>
                        <span
                          className={`${
                            theme === "dark" ? "text-gray-600" : "text-gray-300"
                          }`}
                        >
                          •
                        </span>
                        <span
                          className={`flex items-center gap-1 ${
                            theme === "dark" ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          <MessageSquare size={12} />
                          {task.messages.length}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div
            className={`${
              theme === "dark" ? "bg-gray-800" : "bg-white"
            } rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl`}
          >
            {/* Modal Header */}
            <div
              className={`p-5 ${
                theme === "dark" ? "border-gray-700" : "border-gray-200"
              } border-b flex items-start justify-between gap-4`}
            >
              <div className="flex-1 min-w-0">
                <h2
                  className={`text-xl md:text-2xl font-bold mb-3 ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}
                >
                  {selectedTask.title}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleTaskStatus(selectedTask.id)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full transition ${
                      selectedTask.status === "completed"
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                    }`}
                  >
                    {selectedTask.status === "completed"
                      ? "✓ Completed"
                      : "⏳ Pending"}
                  </button>
                </div>
              </div>
              <button
                onClick={closeModal}
                className={`${
                  theme === "dark"
                    ? "text-gray-400 hover:text-white"
                    : "text-gray-500 hover:text-gray-700"
                } transition flex-shrink-0`}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body - Messages */}
            <div
              className={`flex-1 overflow-y-auto p-5 ${
                theme === "dark" ? "bg-gray-900" : "bg-gray-50"
              }`}
            >
              {!selectedTask.messages || selectedTask.messages.length === 0 ? (
                <div
                  className={`text-center py-12 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  <MessageSquare
                    size={48}
                    className="mx-auto mb-3 opacity-30"
                  />
                  <p className="mb-2">No Conversation</p>
                  <p className="text-sm">
                    start converation! Type @ to mention team members
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedTask.messages
                    .filter((msg) => !msg.parentId)
                    .map((msg) => (
                      <MessageThread key={msg.id} msg={msg} />
                    ))}
                </div>
              )}
            </div>

            {/* Modal Footer - Input */}
            <div
              className={`p-5 ${
                theme === "dark"
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
              } border-t relative`}
            >
              {replyingTo && (
                <div
                  className={`mb-3 p-2 rounded-lg flex items-center justify-between text-sm ${
                    theme === "dark"
                      ? "bg-gray-700 text-gray-300"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Reply size={14} className="text-blue-600 flex-shrink-0" />
                    <span className="truncate">
                      Replying to <strong>{replyingTo.sender}</strong>
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setReplyingTo(null);
                      setMessage("");
                    }}
                    className={`${
                      theme === "dark"
                        ? "text-gray-400 hover:text-gray-200"
                        : "text-gray-500 hover:text-gray-700"
                    } flex-shrink-0`}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {showUserSuggestions && filteredUsers.length > 0 && (
                <div
                  className={`absolute bottom-full left-5 right-5 mb-2 ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600"
                      : "bg-white border-gray-200"
                  } shadow-xl rounded-lg border max-h-48 overflow-y-auto z-10`}
                >
                  {filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => insertMention(u.username)}
                      className={`p-3 ${
                        theme === "dark"
                          ? "hover:bg-gray-600"
                          : "hover:bg-gray-50"
                      } cursor-pointer flex items-center gap-2`}
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
                        {u.username[0].toUpperCase()}
                      </div>
                      <span
                        className={`font-medium ${
                          theme === "dark" ? "text-white" : "text-gray-900"
                        }`}
                      >
                        @{u.username}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  ref={messageInputRef}
                  type="text"
                  value={message}
                  onChange={handleMessageChange}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    replyingTo
                      ? "Write a reply..."
                      : "Send a Message!! use @user to mention"
                  }
                  className={`flex-1 border ${
                    theme === "dark"
                      ? "border-gray-600 bg-gray-700 text-white placeholder-gray-400"
                      : "border-gray-300 placeholder-gray-400"
                  } rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition`}
                  autoComplete="off"
                />
                <button
                  onClick={sendMessage}
                  disabled={!message.trim()}
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateTask && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div
            className={`${
              theme === "dark" ? "bg-gray-800" : "bg-white"
            } p-6 rounded-xl w-full max-w-md shadow-2xl`}
          >
            <h3
              className={`font-bold text-xl mb-4 ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              Create New Task
            </h3>
            <input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && createTask()}
              className={`border ${
                theme === "dark"
                  ? "border-gray-600 bg-gray-700 text-white"
                  : "border-gray-300"
              } p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Task title..."
              autoFocus
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCreateTask(false);
                  setNewTaskTitle("");
                }}
                className={`px-4 py-2 font-medium rounded-lg transition ${
                  theme === "dark"
                    ? "text-gray-300 hover:bg-gray-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={createTask}
                disabled={!newTaskTitle.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
