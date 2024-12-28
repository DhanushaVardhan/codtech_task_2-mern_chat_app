import React, { useState, useContext, useEffect } from "react";
import ChatContext from "../Context/chat-context";
import MyChats from "../components/MyChats";
import ChatBox from "../components/ChatBox";
import SideDrawer from "../components/miscellaneous/SideDrawer";
import { Box } from "@chakra-ui/react";
import { io } from "socket.io-client";
import "./ChatPage.css";

const ENDPOINT = "http://localhost:5000"; // Local backend server
let socket;

const ChatPage = () => {
  const [fetchAgain, setFetchAgain] = useState(false);
  const [typing, setTyping] = useState(false); // Track user's typing
  const [isTyping, setIsTyping] = useState(false); // Other user's typing
  const { user, selectedChat } = useContext(ChatContext);

  useEffect(() => {
    if (!user) return;

    // Initialize socket connection
    socket = io(ENDPOINT);
    socket.emit("setup", user);
    socket.on("connected", () => console.log("Socket connected"));

    socket.on("showTyping", (data) => {
      if (selectedChat && data.chatId === selectedChat._id) {
        setIsTyping(true);
      }
    });

    socket.on("hideTyping", (data) => {
      if (selectedChat && data.chatId === selectedChat._id) {
        setIsTyping(false);
      }
    });

    // Cleanup on component unmount
    return () => {
      socket.disconnect();
    };
  }, [user, selectedChat]);

  const handleTyping = (e) => {
    if (!selectedChat) return;

    if (e.target.value.length > 0) {
      if (!typing) {
        setTyping(true);
        socket.emit("typing", { chatId: selectedChat._id });
      }
    } else {
      setTyping(false);
      socket.emit("stopTyping", { chatId: selectedChat._id });
    }
  };

  return (
    <div style={{ width: "100%" }}>
      {user && <SideDrawer />}
      <Box
        display="flex"
        justifyContent="space-between"
        width="100%"
        height="90.5vh"
        padding="12px"
      >
        {user && <MyChats fetchAgain={fetchAgain} />}
        {user && (
          <ChatBox
            fetchAgain={fetchAgain}
            setFetchAgain={setFetchAgain}
            onTyping={handleTyping} // Pass typing handler to ChatBox
          />
        )}
      </Box>
      {isTyping && (
        <div className="typing-indicator">The other user is typing...</div>
      )}
    </div>
  );
};

export default ChatPage;
