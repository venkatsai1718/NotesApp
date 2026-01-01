import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  MessageSquare,
  Plus,
  X,
  Send,
  Reply,
  ChevronDown,
  ChevronRight,
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
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [mentionPosition, setMentionPosition] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [replyingTo, setReplyingTo] = useState(null);
  const [collapsedThreads, setCollapsedThreads] = useState(new Set());
  const messageInputRef = useRef(null);

  const { selectedTasks, setSelectedTasks } = useSelectedTasks();

  const selectedTask = useMemo(() => {
    return tasks.find((t) => t.id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  useEffect(() => {
    api
      .get("/me")
      .then((res) => setCurrentUser(res.data))
      .catch((err) => console.error("Current user fetch failed", err));
  }, []);

  useEffect(() => {
    api
      .get("/users")
      .then((res) => setUsers(res.data))
      .catch((err) => console.error("User fetch failed", err));
  }, []);

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

  const createTaskInDB = async (task) => {
    const res = await api.post("/tasks", task);
    return res.data;
  };

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

  const handleMessageChange = (e) => {
    const value = e.target.value;
    const cursor = e.target.selectionStart;

    setMessage(value);

    const before = value.slice(0, cursor);
    const atIndex = before.lastIndexOf("@");

    if (atIndex !== -1 && !before.slice(atIndex + 1).includes(" ")) {
      setShowUserSuggestions(true);
      setMentionPosition(atIndex);
      setCursorPosition(cursor);
    } else {
      if (showUserSuggestions) {
        setShowUserSuggestions(false);
      }
    }
  };

  const insertMention = (username) => {
    const before = message.slice(0, mentionPosition);
    const after = message.slice(cursorPosition);
    const newMessage = `${before}@${username} ${after}`;
    const newCursorPos = mentionPosition + username.length + 2;

    setMessage(newMessage);
    setShowUserSuggestions(false);

    setTimeout(() => {
      if (messageInputRef.current) {
        messageInputRef.current.focus();
        messageInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

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
    // Extract mentioned usernames from message
    const mentionedUsernames =
      messageText.match(/@(\w+)/g)?.map((m) => m.slice(1)) || [];

    // Find users to notify (mentioned users + person being replied to)
    const usersToNotify = new Set();

    // Add mentioned users
    mentionedUsernames.forEach((username) => {
      const user = users.find((u) => u.username === username);
      if (user && user.email && user.id !== currentUser.id) {
        usersToNotify.add(JSON.stringify(user));
      }
    });

    // Add user being replied to
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

    // Send emails
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

    // Send email notifications to mentioned users and replied user
    sendEmailNotifications(message, selectedTask.title);

    setMessage("");
    setReplyingTo(null);

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

  const filteredUsers = (() => {
    if (!showUserSuggestions || !message) return [];

    const searchTerm = message
      .slice(mentionPosition + 1, cursorPosition)
      .toLowerCase();
    return users.filter(
      (u) => u.username && u.username.toLowerCase().startsWith(searchTerm)
    );
  })();

  const MessageThread = ({ msg, depth = 0 }) => {
    const hasReplies = msg.replies && msg.replies.length > 0;
    const isCollapsed = collapsedThreads.has(msg.id);
    const replyCount = countReplies(msg.replies);

    return (
      <div className={`${depth > 0 ? "ml-6 md:ml-8 mt-2" : "mt-3"}`}>
        <div className="flex gap-2 md:gap-3">
          <div className="flex-shrink-0">
            <div
              className={`w-7 h-7 md:w-8 md:h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs md:text-sm font-semibold`}
            >
              {msg.sender[0]}
            </div>
            {hasReplies && !isCollapsed && (
              <div
                className={`w-0.5 ${
                  theme === "dark" ? "bg-gray-600" : "bg-gray-300"
                } ml-3 md:ml-4 h-full mt-2`}
              ></div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div
              className={`${
                theme === "dark"
                  ? "bg-gray-700 border-gray-600"
                  : "bg-white border-gray-200"
              } p-2 md:p-3 rounded-lg shadow-sm border`}
            >
              <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs md:text-sm font-semibold ${
                      theme === "dark" ? "text-white" : "text-gray-800"
                    }`}
                  >
                    {msg.sender}
                  </span>
                  <span
                    className={`text-xs ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {replyingTo?.id === msg.id && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    Replying...
                  </span>
                )}
              </div>

              <div
                className={`text-xs md:text-sm ${
                  theme === "dark" ? "text-gray-200" : "text-gray-700"
                } mb-2 break-words`}
              >
                {msg.text.split(/(@\w+)/g).map((p, i) =>
                  p.startsWith("@") ? (
                    <span
                      key={i}
                      className="text-blue-600 font-medium bg-blue-50 dark:bg-blue-900/30 px-1 rounded"
                    >
                      {p}
                    </span>
                  ) : (
                    p
                  )
                )}
              </div>

              <div className="flex items-center gap-2 md:gap-3 mt-2 flex-wrap">
                <button
                  onClick={() => {
                    setReplyingTo(msg);
                    messageInputRef.current?.focus();
                  }}
                  className={`flex items-center gap-1 text-xs ${
                    theme === "dark"
                      ? "text-gray-400 hover:text-blue-400"
                      : "text-gray-600 hover:text-blue-600"
                  } transition`}
                >
                  <Reply size={12} />
                  Reply
                </button>

                {hasReplies && (
                  <button
                    onClick={() => toggleThread(msg.id)}
                    className={`flex items-center gap-1 text-xs ${
                      theme === "dark"
                        ? "text-gray-400 hover:text-blue-400"
                        : "text-gray-600 hover:text-blue-600"
                    } transition`}
                  >
                    {isCollapsed ? (
                      <ChevronRight size={12} />
                    ) : (
                      <ChevronDown size={12} />
                    )}
                    {replyCount} {replyCount === 1 ? "reply" : "replies"}
                  </button>
                )}
              </div>
            </div>

            {hasReplies && !isCollapsed && (
              <div className="mt-2">
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

  const TaskHeader = ({ task }) => (
    <div
      className={`p-3 md:p-4 ${
        theme === "dark"
          ? "bg-gray-800 border-gray-700"
          : "bg-white border-gray-200"
      } border-b flex flex-col md:flex-row justify-between md:items-center gap-3`}
    >
      <div>
        <h2
          className={`text-lg md:text-xl font-semibold ${
            theme === "dark" ? "text-white" : "text-gray-800"
          }`}
        >
          {task.title}
        </h2>
        <p
          className={`text-xs md:text-sm ${
            theme === "dark" ? "text-gray-400" : "text-gray-500"
          }`}
        >
          Status:{" "}
          <span
            className={`font-medium ${
              task.status === "completed" ? "text-green-600" : "text-yellow-600"
            }`}
          >
            {task.status}
          </span>
        </p>
      </div>

      <button
        onClick={() => toggleTaskStatus(task.id)}
        className="bg-blue-600 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm md:text-base w-full md:w-auto"
      >
        Mark as {task.status === "pending" ? "Completed" : "Pending"}
      </button>
    </div>
  );

  const TaskChat = ({ task }) => (
    <div
      className={`flex-1 overflow-y-auto no-scrollbar p-3 md:p-4 ${
        theme === "dark" ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      {!task.messages || task.messages.length === 0 ? (
        <div
          className={`text-center ${
            theme === "dark" ? "text-gray-400" : "text-gray-500"
          } mt-8`}
        >
          <p>No messages yet. Start the conversation!</p>
          <p className="text-xs md:text-sm mt-2">
            Type @ to mention team members
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {task.messages
            .filter((msg) => !msg.parentId)
            .map((msg) => (
              <MessageThread key={msg.id} msg={msg} />
            ))}
        </div>
      )}
    </div>
  );

  const TaskInput = () => {
    return (
      <div
        className={`p-3 md:p-4 ${
          theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
        } border-t relative`}
      >
        {replyingTo && (
          <div
            className={`mb-2 p-2 ${
              theme === "dark"
                ? "bg-blue-900/30 border-blue-700"
                : "bg-blue-50 border-blue-200"
            } border rounded-lg flex items-center justify-between`}
          >
            <div className="flex items-center gap-2 text-xs md:text-sm min-w-0">
              <Reply size={14} className="text-blue-600 flex-shrink-0" />
              <span
                className={`${
                  theme === "dark" ? "text-gray-200" : "text-gray-700"
                } truncate`}
              >
                Replying to {" "}
                <span className="font-semibold">{replyingTo.sender}</span>
              </span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
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
            className={`absolute bottom-full left-3 md:left-4 right-3 md:right-4 mb-2 ${
              theme === "dark"
                ? "bg-gray-700 border-gray-600"
                : "bg-white border-gray-200"
            } shadow-lg rounded-lg border max-h-48 overflow-y-auto no-scrollbar z-10`}
          >
            {filteredUsers.map((u) => (
              <div
                key={u.id}
                onClick={() => insertMention(u.username)}
                className={`p-2 md:p-3 ${
                  theme === "dark" ? "hover:bg-gray-600" : "hover:bg-gray-100"
                } cursor-pointer flex items-center gap-2`}
              >
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs md:text-sm font-semibold">
                  {u.username[0].toUpperCase()}
                </div>
                <span
                  className={`font-medium text-sm md:text-base ${
                    theme === "dark" ? "text-white" : "text-gray-800"
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
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !showUserSuggestions) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={
              replyingTo ? "Write a reply..." : "Add a comment... use @username"
            }
            className={`flex-1 border ${
              theme === "dark"
                ? "border-gray-600 bg-gray-700 text-white"
                : "border-gray-300"
            } rounded-lg px-3 md:px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base`}
            autoComplete="off"
          />
          <button
            onClick={sendMessage}
            disabled={!message.trim()}
            className="bg-blue-600 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} className="md:w-[18px] md:h-[18px]" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`h-screen ${
        theme === "dark"
          ? "border-white bg-gray-900"
          : "border-black bg-gray-100"
      } flex flex-col md:flex-row overflow-hidden`}
    >
      {/* Sidebar */}
      <div
        className={`
      w-full md:w-80 md:min-w-[200px]
      border-r
      overflow-y-auto
      no-scrollbar
      ${
        theme === "dark"
          ? "bg-gray-800 border-gray-700"
          : "bg-white border-gray-200"
      }
    `}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-300">
          <h2
            className={`text-2xl font-bold text-gray-800 ${
              theme === "dark" ? "text-white" : "text-black"
            }`}
          >
            Tasks
          </h2>

          <button
            onClick={() => setShowCreateTask(true)}
            className="
      inline-flex items-center justify-center gap-2
      px-4 py-2
      w-fit
      rounded-lg
      bg-blue-600 text-white
      hover:bg-blue-700
      transition
      text-sm
    "
          >
            <Plus size={16} className="md:w-[18px] md:h-[18px]" />
            New
          </button>
        </div>

        <div className="pb-4">
          {tasks.length === 0 ? (
            <p
              className={`text-center ${
                theme === "dark" ? "text-gray-400" : "text-gray-500"
              } text-xs md:text-sm mt-4`}
            >
              No tasks yet
            </p>
          ) : (
            tasks.map((task) => {
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
                  className={`m-1 p-3 md:p-4 cursor-pointer rounded-lg border transition-all
  ${
    theme === "dark"
      ? "border-gray-700 text-gray-200"
      : "border-gray-200 text-gray-800"
  }

  ${
    selectedTaskId === task.id
      ? theme === "dark"
        ? "bg-indigo-900/30 border-indigo-500"
        : "bg-indigo-50 border-indigo-500"
      : theme === "dark"
      ? "hover:bg-gray-700"
      : "hover:bg-gray-50"
  }
                    ${
                      isSelected
                        ? theme === "dark"
                          ? "border-indigo-500 bg-gradient-to-br from-indigo-900/30 to-purple-900/30"
                          : "border-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50"
                        : theme === "dark"
                        ? "border-gray-700 bg-gray-700 hover:border-indigo-400"
                        : "border-gray-200 bg-white hover:border-indigo-300"
                    }`}
                >
                  <div
                    className={`font-medium text-sm md:text-base ${
                      theme === "dark" ? "text-white" : "text-gray-800"
                    }`}
                  >
                    {task.title}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        task.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {task.status}
                    </span>
                    {task.messages && task.messages.length > 0 && (
                      <span
                        className={`text-xs ${
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {task.messages.length} messages
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main content */}
      <div
        className={`
      flex-1 min-w-0 flex flex-col overflow-hidden
      ${theme === "dark" ? "bg-gray-900" : "bg-gray-100"}
    `}
      >
        {selectedTask ? (
          <>
            <TaskHeader task={selectedTask} />
            <TaskChat task={selectedTask} />
            <TaskInput />
          </>
        ) : (
          <div
            className={`flex-1 flex flex-col items-center justify-center ${
              theme === "dark" ? "text-gray-500" : "text-gray-400"
            }`}
          >
            <MessageSquare
              size={48}
              className={`mb-4 md:w-16 md:h-16 ${
                theme === "dark" ? "text-gray-600" : "text-gray-300"
              }`}
            />
            <p className="text-base md:text-lg">
              Select a task to view details
            </p>
          </div>
        )}
      </div>

      {showCreateTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            className={`${
              theme === "dark" ? "bg-gray-800" : "bg-white"
            } p-4 md:p-6 rounded-lg w-full max-w-md shadow-xl`}
          >
            <h3
              className={`font-semibold text-lg md:text-xl mb-4 ${
                theme === "dark" ? "text-white" : "text-gray-800"
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
              } p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base`}
              placeholder="Enter task title..."
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCreateTask(false);
                  setNewTaskTitle("");
                }}
                className={`px-3 md:px-4 py-2 ${
                  theme === "dark"
                    ? "text-gray-300 hover:bg-gray-700"
                    : "text-gray-700 hover:bg-gray-100"
                } rounded-lg transition text-sm md:text-base`}
              >
                Cancel
              </button>
              <button
                onClick={createTask}
                disabled={!newTaskTitle.trim()}
                className="bg-blue-600 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm md:text-base"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
