import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const socket = io("https://chatbackend-rnjl.onrender.com");

function App() {
  const [username, setUsername] = useState("");
  const [toUser, setToUser] = useState("");
  const [registered, setRegistered] = useState(false);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [typingStatus, setTypingStatus] = useState("");
  const [userStatus, setUserStatus] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login"); // or 'signup'

  useEffect(() => {
    const savedUser = localStorage.getItem("chatUser");
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      axios
        .get(`https://chatbackend-rnjl.onrender.com/status/${parsed.username}`)
        .then((res) => {
          setUsername(parsed.username);
          socket.emit("register", parsed.username);
          setRegistered(true);
        })
        .catch((err) => console.log(err));
    }
  }, []);

  useEffect(() => {
    socket.on("receive_message", ({ from, message }) => {
      setChat((prev) => [...prev, { from, message }]);
    });

    socket.on("typing", ({ from }) => {
      setTypingStatus(`${from} is typing...`);
      setTimeout(() => setTypingStatus(""), 2000);
    });

    socket.on("user_status", ({ username: user, status }) => {
      if (user === toUser) {
        setUserStatus(`User is ${status}`);
      }
    });

    return () => {
      socket.off("receive_message");
      socket.off("typing");
      socket.off("user_status");
    };
  }, [toUser]);

  useEffect(() => {
    setUserStatus("Checking status...");
    if (toUser) {
      axios
        .get(`https://chatbackend-rnjl.onrender.com/status/${toUser}`)
        .then((res) =>
          setUserStatus(
            `User is ${res.data.status} ${
              res.data.status === "online" ? "🟢" : "🔴"
            } `
          )
        )
        .catch(() => setUserStatus("User not found 🚫"));
    }
    if (username && toUser) {
      // Loading previous chat
      axios
        .get(
          `https://chatbackend-rnjl.onrender.com/messages/${username}/${toUser}`
        )
        .then((res) => {
          const messages = res.data.map((msg) => ({
            from: msg.from,
            message: msg.message,
          }));
          setChat(messages);
        })
        .catch((err) => console.log(err));
    }
  }, [toUser, username]);

  const register = () => {
    if (username.trim()) {
      socket.emit("register", username);
      setRegistered(true);
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      socket.emit("send_message", { to: toUser, message, from: username });
      setChat((prev) => [...prev, { from: "You", message }]);
      setMessage("");
    }
  };

  const handleTyping = () => {
    socket.emit("typing", { to: toUser, from: username });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-6">
        {!registered ? (
          <>
            <h2 className="text-xl font-semibold mb-4 text-center">
              {mode === "login" ? "Login" : "Sign Up"}
            </h2>
            <input
              className="w-full border border-gray-300 rounded px-3 py-2 mb-2"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="Username"
            />
            <input
              type="password"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />
            <button
              onClick={async () => {
                try {
                  const endpoint = mode === "login" ? "/login" : "/signup";

                  const res = await axios.post(
                    `https://chatbackend-rnjl.onrender.com${endpoint}`,
                    {
                      username,
                      password,
                    }
                  );
                  socket.emit("register", username);
                  toast.success(res.data.message);
                  setRegistered(true);
                  localStorage.setItem(
                    "chatUser",
                    JSON.stringify({ username })
                  );
                } catch (err) {
                  toast.error(err.response?.data?.message || "Error");
                }
              }}
              className="w-full bg-gray-500 hover:bg-gray-700 text-white py-2 rounded"
            >
              {mode === "login" ? "Login" : "Sign Up"}
            </button>
            <p
              className="text-sm text-gray-600 mt-2 text-center cursor-pointer hover:text-black"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login"
                ? "Don't have an account? Sign up"
                : "Already have an account? Login"}
            </p>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold mb-2 text-center">
              Chatting as {username}
            </h2>

            <p
              className="text-sm text-gray-600 mb-2 cursor-pointer text-right hover:text-black"
              onClick={() => {
                localStorage.removeItem("chatUser");
                window.location.reload();
              }}
            >
              Logout
            </p>

            <input
              className="w-full border border-gray-300 rounded px-3 py-2 mb-2"
              placeholder="Recipient username"
              value={toUser}
              onChange={(e) => setToUser(e.target.value.toLowerCase())}
            />

            <p className="text-sm text-gray-600 mb-2">
              {userStatus || "Status unknown"}
            </p>

            <div className="h-48 overflow-y-auto border rounded p-2 bg-gray-50 mb-2 text-sm">
              {chat.map((msg, i) => (
                <div key={i} className="mb-1">
                  <strong>{msg.from}:</strong> {msg.message}
                </div>
              ))}
              {typingStatus && (
                <div className="italic text-gray-500">{typingStatus}</div>
              )}
            </div>

            <form onSubmit={sendMessage} className="flex gap-2">
              <input
                className="flex-1 border border-gray-300 rounded px-3 py-2"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleTyping}
                placeholder="Type your message..."
              />
              <button
                type="submit"
                className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded"
              >
                Send
              </button>
            </form>
          </>
        )}
      </div>
      <ToastContainer position="top-center" autoClose={3000} />
    </div>
  );
}

export default App;
