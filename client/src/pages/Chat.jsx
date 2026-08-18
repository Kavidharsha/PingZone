import {
  useState,
  useEffect,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import "../Chat.css";

const API_URL = import.meta.env.VITE_API_URL;

function Chat({ currentUser, users, onLogout }) {
  const [message, setMessage] = useState("");
  const [activeChannel, setActiveChannel] =
    useState("General Chat");
  const [selectedUser, setSelectedUser] =
    useState(null);

  const [onlineUsers, setOnlineUsers] =
    useState([]);

  const [messages, setMessages] =
    useState([]);

  const [typingUser, setTypingUser] =
    useState("");

  const [aiLoading, setAiLoading] =
    useState(false);

  const [unreadCounts, setUnreadCounts] =
    useState(() => {
      const savedUnread =
        localStorage.getItem("pingzone_unread");

      return savedUnread
        ? JSON.parse(savedUnread)
        : {};
    });

  const [searchUser, setSearchUser] =
    useState("");

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const messagesEndRef =
    useRef(null);

  const socketRef =
    useRef(null);

  const currentChatKeyRef =
    useRef("");

  const typingTimeoutRef =
    useRef(null);

  const navigate = useNavigate();

  const channels = [
    "General Chat",
    "Tech Talk",
    "Random",
  ];

  // =========================
  // USER ID
  // =========================

  const getUserId = (user) => {
    return user?.id || user?._id;
  };

  // =========================
  // AUTH HEADERS
  // =========================

  const getAuthHeaders = () => {
    const token =
      localStorage.getItem("pingzone_token");

    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  // =========================
  // PRIVATE CHAT KEY
  // =========================

  const getPrivateChatKey = (
    user1,
    user2
  ) => {
    return [
      getUserId(user1),
      getUserId(user2),
    ]
      .sort()
      .join("_");
  };

  // =========================
  // CURRENT CHAT KEY
  // =========================

  const currentChatKey = selectedUser
    ? getPrivateChatKey(
        currentUser,
        selectedUser
      )
    : `channel_${activeChannel}`;

  useEffect(() => {
    currentChatKeyRef.current =
      currentChatKey;

    setTypingUser("");
  }, [currentChatKey]);

  // =========================
  // AUTH ERROR HANDLER
  // =========================

  const handleUnauthorized = () => {
    localStorage.removeItem(
      "pingzone_token"
    );

    onLogout();
    navigate("/login");
  };

  // =========================
  // LOGOUT
  // =========================

  const handleLogout = () => {
    stopTyping();

    localStorage.removeItem(
      "pingzone_token"
    );

    onLogout();
    navigate("/login");
  };

  // =========================
  // SOCKET.IO CONNECTION
  // =========================

  useEffect(() => {
    const socket = io(API_URL);

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log(
        "✅ PingZone Socket.IO connected:",
        socket.id
      );

      socket.emit(
        "user_online",
        getUserId(currentUser)
      );
    });

    // Online users
    socket.on(
      "online_users",
      (usersList) => {
        console.log(
          "🟢 Online users:",
          usersList
        );

        setOnlineUsers(
          usersList.map(String)
        );
      }
    );

    // Real-time messages
    socket.on(
      "receive_message",
      (incomingMessage) => {
        console.log(
          "📩 Real-time message received:",
          incomingMessage
        );

        const activeChat =
          currentChatKeyRef.current;

        if (
          incomingMessage.chatKey ===
          activeChat
        ) {
          setMessages(
            (previousMessages) => [
              ...previousMessages,
              {
                id: incomingMessage.id,
                text:
                  incomingMessage.text,
                sender:
                  incomingMessage.sender ||
                  "Unknown User",
                senderId:
                  incomingMessage.senderId,
                receiverId:
                  incomingMessage.receiverId,
                channel:
                  incomingMessage.channel,
                time:
                  incomingMessage.time ||
                  new Date().toLocaleTimeString(
                    [],
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  ),
              },
            ]
          );
        } else if (
          incomingMessage.receiverId &&
          incomingMessage.senderEmail
        ) {
          setUnreadCounts(
            (previous) => ({
              ...previous,
              [incomingMessage.senderEmail]:
                (previous[
                  incomingMessage.senderEmail
                ] || 0) + 1,
            })
          );
        }
      }
    );

    // Typing indicator
    socket.on(
      "typing",
      (data) => {
        if (
          data.chatKey ===
          currentChatKeyRef.current
        ) {
          setTypingUser(
            data.name || ""
          );
        }
      }
    );

    // Stop typing
    socket.on(
      "stop_typing",
      (data) => {
        if (
          data.chatKey ===
          currentChatKeyRef.current
        ) {
          setTypingUser("");
        }
      }
    );

    socket.on("disconnect", () => {
      console.log(
        "❌ PingZone Socket.IO disconnected"
      );

      setTypingUser("");
    });

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(
          typingTimeoutRef.current
        );
      }

      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUser]);

  // =========================
  // JOIN / LEAVE CHAT ROOMS
  // =========================

  useEffect(() => {
    const socket =
      socketRef.current;

    if (!socket) return;

    const joinCurrentRoom = () => {
      socket.emit(
        "join_chat",
        currentChatKey
      );

      console.log(
        "📥 Joined chat room:",
        currentChatKey
      );
    };

    if (socket.connected) {
      joinCurrentRoom();
    } else {
      socket.once(
        "connect",
        joinCurrentRoom
      );
    }

    return () => {
      if (socket.connected) {
        socket.emit(
          "leave_chat",
          currentChatKey
        );

        console.log(
          "📤 Left chat room:",
          currentChatKey
        );
      }
    };
  }, [currentChatKey]);

  // =========================
  // LOAD MESSAGES
  // =========================

  useEffect(() => {
    const loadMessages =
      async () => {
        try {
          let url;

          if (selectedUser) {
            const currentUserId =
              getUserId(currentUser);

            const selectedUserId =
              getUserId(
                selectedUser
              );

            url =
              `${API_URL}/api/messages/private/${currentUserId}/${selectedUserId}`
          } else {
            if (
              activeChannel ===
              "Gemini AI Lounge"
            ) {
              setMessages([]);
              return;
            }

            url =
              `${API_URL}/api/messages/channel/${encodeURIComponent(
                activeChannel
              )}`;
          }

          const response =
            await fetch(url, {
              headers:
                getAuthHeaders(),
            });

          if (response.status === 401) {
            handleUnauthorized();
            return;
          }

          if (!response.ok) {
            throw new Error(
              "Failed to load messages"
            );
          }

          const data =
            await response.json();

          const formattedMessages =
            data.map((msg) => ({
              id: msg._id,
              text: msg.text,
              sender:
                msg.senderId?.name ||
                "Unknown User",
              senderId:
                msg.senderId?._id,
              receiverId:
                msg.receiverId,
              channel:
                msg.channel,
              time: new Date(
                msg.createdAt
              ).toLocaleTimeString(
                [],
                {
                  hour: "2-digit",
                  minute: "2-digit",
                }
              ),
            }));

          setMessages(
            formattedMessages
          );
        } catch (error) {
          console.error(
            "Failed to load messages:",
            error
          );

          setMessages([]);
        }
      };

    loadMessages();
  }, [
    activeChannel,
    selectedUser,
    currentUser,
  ]);

  // =========================
  // SAVE UNREAD COUNTS
  // =========================

  useEffect(() => {
    localStorage.setItem(
      "pingzone_unread",
      JSON.stringify(
        unreadCounts
      )
    );
  }, [unreadCounts]);

  // =========================
  // AUTO SCROLL
  // =========================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView(
      {
        behavior: "smooth",
      }
    );
  }, [messages, typingUser]);

  // =========================
  // TYPING HANDLER
  // =========================

  const handleTyping = () => {
    const socket =
      socketRef.current;

    if (!socket) return;

    const name =
      currentUser?.name || "";

    socket.emit("typing", {
      chatKey: currentChatKey,
      name,
    });

    if (typingTimeoutRef.current) {
      clearTimeout(
        typingTimeoutRef.current
      );
    }

    typingTimeoutRef.current =
      setTimeout(() => {
        socket.emit(
          "stop_typing",
          {
            chatKey:
              currentChatKey,
            name,
          }
        );
      }, 1500);
  };

  // =========================
  // STOP TYPING
  // =========================

  const stopTyping = () => {
    const socket =
      socketRef.current;

    if (!socket) return;

    if (typingTimeoutRef.current) {
      clearTimeout(
        typingTimeoutRef.current
      );

      typingTimeoutRef.current =
        null;
    }

    socket.emit(
      "stop_typing",
      {
        chatKey: currentChatKey,
        name:
          currentUser?.name || "",
      }
    );
  };

  // =========================
  // DELETE MESSAGE
  // =========================

  const handleDeleteMessage =
    async (messageId) => {
      try {
        const response =
          await fetch(
            `${API_URL}/api/messages/${messageId}`,
            {
              method: "DELETE",
              headers:
                getAuthHeaders(),
            }
          );

        const data =
          await response.json();

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!response.ok) {
          console.error(
            "Delete message failed:",
            data.message
          );
          return;
        }

        setMessages(
          (previousMessages) =>
            previousMessages.filter(
              (msg) =>
                msg.id !== messageId
            )
        );

        console.log(
          "🗑️ Message deleted"
        );
      } catch (error) {
        console.error(
          "Error deleting message:",
          error
        );
      }
    };

  // =========================
  // SEND MESSAGE
  // =========================

  const handleSend = async (e) => {
    e.preventDefault();

    if (!message.trim()) return;

    stopTyping();

    const messageText =
      message.trim();

    // =========================
    // GEMINI AI
    // =========================

    if (
      !selectedUser &&
      activeChannel ===
        "Gemini AI Lounge"
    ) {
      setAiLoading(true);

      const userMessage = {
        id: `user-${Date.now()}`,
        text: messageText,
        sender:
          currentUser?.name ||
          "You",
        time:
          new Date().toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute: "2-digit",
            }
          ),
        isAI: false,
      };

      setMessages(
        (previousMessages) => [
          ...previousMessages,
          userMessage,
        ]
      );

      setMessage("");

      try {
        const response =
          await fetch(`${API_URL}/api/ai/chat`, {
              method: "POST",
              headers:
                getAuthHeaders(),
              body: JSON.stringify({
                message:
                  messageText,
              }),
            }
          );

        const data =
          await response.json();

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!response.ok) {
          throw new Error(
            data.error ||
              data.message ||
              "Gemini request failed"
          );
        }

        const aiMessage = {
          id: `ai-${Date.now()}`,
          text:
            data.reply ||
            "I couldn't generate a response.",
          sender: "Gemini AI",
          time:
            new Date().toLocaleTimeString(
              [],
              {
                hour: "2-digit",
                minute: "2-digit",
              }
            ),
          isAI: true,
        };

        setMessages(
          (previousMessages) => [
            ...previousMessages,
            aiMessage,
          ]
        );
      } catch (error) {
        console.error(
          "Gemini error:",
          error
        );

        setMessages(
          (previousMessages) => [
            ...previousMessages,
            {
              id: `ai-error-${Date.now()}`,
              text:
                "Sorry, I couldn't connect to Gemini right now.",
              sender: "Gemini AI",
              time:
                new Date().toLocaleTimeString(
                  [],
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                ),
              isAI: true,
            },
          ]
        );
      } finally {
        setAiLoading(false);
      }

      return;
    }

    // =========================
    // NORMAL / PRIVATE MESSAGE
    // =========================

    const senderId =
      getUserId(currentUser);

    if (!senderId) {
      console.error(
        "Current user ID not found"
      );
      return;
    }

    try {
      const response =
        await fetch(`${API_URL}/api/messages`, {
            method: "POST",
            headers:
              getAuthHeaders(),
            body: JSON.stringify({
              senderId,

              receiverId:
                selectedUser
                  ? getUserId(
                      selectedUser
                    )
                  : null,

              channel:
                selectedUser
                  ? null
                  : activeChannel,

              text: messageText,
            }),
          }
        );

      const data =
        await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        console.error(
          "Message send failed:",
          data.message
        );
        return;
      }

      const newMessage = {
        id: data._id,
        text: data.text,
        sender:
          data.senderId?.name ||
          currentUser?.name ||
          "Unknown User",
        senderId:
          data.senderId?._id ||
          senderId,
        receiverId:
          data.receiverId,
        channel:
          data.channel,
        time:
          new Date(
            data.createdAt
          ).toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute: "2-digit",
            }
          ),
      };

      setMessages(
        (previousMessages) => [
          ...previousMessages,
          newMessage,
        ]
      );

      if (socketRef.current) {
        socketRef.current.emit(
          "send_message",
          {
            chatKey:
              currentChatKey,

            message: {
              ...newMessage,
              chatKey:
                currentChatKey,
              senderEmail:
                currentUser?.email,
            },
          }
        );
      }

      setMessage("");
    } catch (error) {
      console.error(
        "Error sending message:",
        error
      );
    }
  };

  return (
    <div className="chat-page">

      {/* =========================
          SIDEBAR
      ========================= */}

      <aside
        className={`chat-sidebar ${
          sidebarOpen
            ? "sidebar-open"
            : ""
        }`}
      >

        <div className="sidebar-logo">
          <h2>💬 PingZone</h2>

          <span>
            AI Powered
          </span>
        </div>

        {/* Current User */}
        <div className="user-profile">

          <div className="user-avatar">
            {currentUser?.name
              ?.charAt(0)
              .toUpperCase()}
          </div>

          <div className="user-info">

            <strong>
              {currentUser?.name}
            </strong>

            <div>
              <span>
                🟢 Online
              </span>
            </div>

          </div>

          <button
            onClick={handleLogout}
            className="logout-button"
          >
            Logout
          </button>

        </div>

        {/* Channels */}
        <div className="sidebar-section">

          <h3>
            CHANNELS & AI
          </h3>

          <div
            className={`channel ai-channel ${
              !selectedUser &&
              activeChannel ===
                "Gemini AI Lounge"
                ? "active"
                : ""
            }`}
            onClick={() => {
              stopTyping();
              setSelectedUser(null);
              setActiveChannel(
                "Gemini AI Lounge"
              );
              setMessage("");
              setSidebarOpen(false);
            }}
          >
            🤖 Gemini AI Lounge
          </div>

          {channels.map((channel) => (
            <div
              key={channel}
              className={`channel ${
                !selectedUser &&
                activeChannel ===
                  channel
                  ? "active"
                  : ""
              }`}
              onClick={() => {
                stopTyping();
                setSelectedUser(null);
                setActiveChannel(
                  channel
                );
                setMessage("");
                setSidebarOpen(false);
              }}
            >
              # {channel}
            </div>
          ))}

        </div>

        {/* Other Users */}
        <div className="sidebar-section">

          <h3>
            OTHER USERS
          </h3>

          <input
            type="text"
            placeholder="Search users..."
            value={searchUser}
            onChange={(e) =>
              setSearchUser(
                e.target.value
              )
            }
            className="user-search"
          />

          {users
            .filter(
              (user) =>
                user.email !==
                currentUser?.email
            )
            .filter((user) =>
              user.name
                .toLowerCase()
                .includes(
                  searchUser.toLowerCase()
                )
            )
            .map((user) => (
              <div
                key={
                  user._id ||
                  user.email
                }
                className={`other-user ${
                  selectedUser?.email ===
                  user.email
                    ? "selected"
                    : ""
                }`}
                onClick={() => {
                  stopTyping();

                  setSelectedUser(
                    user
                  );

                  setMessage("");

                  setUnreadCounts(
                    (previous) => ({
                      ...previous,
                      [user.email]: 0,
                    })
                  );

                  setSidebarOpen(false);
                }}
              >

                <div className="other-user-avatar">
                  {user.name
                    ?.charAt(0)
                    .toUpperCase()}
                </div>

                <div className="other-user-info">

                  <strong>
                    {user.name}
                  </strong>

                  <div className="user-status-row">

                    <span>
                      {onlineUsers.includes(
                        String(
                          getUserId(user)
                        )
                      )
                        ? "🟢 Online"
                        : "⚫ Offline"}
                    </span>

                    {unreadCounts[
                      user.email
                    ] > 0 && (
                      <span className="unread-badge">
                        {
                          unreadCounts[
                            user.email
                          ]
                        }
                      </span>
                    )}

                  </div>

                </div>

              </div>
            ))}

        </div>

      </aside>

      {/* =========================
          MAIN CHAT
      ========================= */}

      <main className="chat-main">

        <header className="chat-header">

          <button
            className="mobile-menu-button"
            onClick={() =>
              setSidebarOpen(
                !sidebarOpen
              )
            }
          >
            ☰
          </button>

          <div>

            <h2>
              {selectedUser
                ? `💬 ${selectedUser.name}`
                : activeChannel ===
                  "Gemini AI Lounge"
                ? "🤖 Gemini AI Lounge"
                : `# ${activeChannel}`}
            </h2>

            <span>
              {selectedUser
                ? "Private Conversation"
                : activeChannel ===
                  "Gemini AI Lounge"
                ? "24/7 AI Companion"
                : "Public Channel"}
            </span>

          </div>

        </header>

        {/* Messages */}
        <div className="messages">

          {messages.length === 0 ? (
            <div className="welcome-message">

              <div className="welcome-icon">
                {selectedUser
                  ? "💬"
                  : activeChannel ===
                    "Gemini AI Lounge"
                  ? "🤖"
                  : "💬"}
              </div>

              <h2>
                {selectedUser
                  ? `Start a conversation with ${selectedUser.name}`
                  : `Welcome to ${activeChannel}`}
              </h2>

              <p>
                {selectedUser
                  ? "Send a message to start chatting!"
                  : activeChannel ===
                    "Gemini AI Lounge"
                  ? "Ask Gemini anything!"
                  : "Be the first to say hello!"}
              </p>

            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-message ${
                  msg.sender ===
                  currentUser?.name
                    ? "my-message"
                    : "other-message"
                }`}
              >

                <div className="message-avatar">
                  {msg.isAI
                    ? "🤖"
                    : msg.sender
                        ?.charAt(0)
                        .toUpperCase()}
                </div>

                <div className="message-content">

                  <strong>
                    {msg.sender}
                  </strong>

                  <p>
                    {msg.text}
                  </p>

                  <small className="message-time">
                    {msg.time}
                  </small>

                  {msg.sender ===
                    currentUser?.name &&
                    !msg.isAI && (
                      <button
                        className="delete-message"
                        onClick={() =>
                          handleDeleteMessage(
                            msg.id
                          )
                        }
                      >
                        🗑️
                      </button>
                    )}

                </div>

              </div>
            ))
          )}

          {aiLoading && (
            <div className="chat-message other-message">

              <div className="message-avatar">
                🤖
              </div>

              <div className="message-content">

                <strong>
                  Gemini AI
                </strong>

                <p>
                  Gemini is thinking...
                </p>

              </div>

            </div>
          )}

          <div ref={messagesEndRef} />

        </div>

        {/* Input */}
        <div className="message-area">

          {typingUser &&
            activeChannel !==
              "Gemini AI Lounge" && (
              <div className="typing-indicator">
                {typingUser} is typing...
              </div>
            )}

          <form
            className="message-input"
            onSubmit={handleSend}
          >

            <input
              type="text"
              placeholder={
                selectedUser
                  ? `Message ${selectedUser.name}...`
                  : activeChannel ===
                    "Gemini AI Lounge"
                  ? "Ask Gemini anything..."
                  : `Message #${activeChannel}`
              }
              value={message}
              onChange={(e) => {
                setMessage(
                  e.target.value
                );

                if (
                  activeChannel !==
                    "Gemini AI Lounge" ||
                  selectedUser
                ) {
                  handleTyping();
                }
              }}
              onBlur={stopTyping}
              disabled={aiLoading}
            />

            <button
              type="submit"
              disabled={
                !message.trim() ||
                aiLoading
              }
            >
              ➤
            </button>

          </form>

          <p className="chat-tip">
            Tip: Type{" "}
            <strong>@ai</strong>{" "}
            to ask Gemini for help.
          </p>

        </div>

      </main>

    </div>
  );
}

export default Chat;