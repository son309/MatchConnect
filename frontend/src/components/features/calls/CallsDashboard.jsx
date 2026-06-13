import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../../../lib/axios";
import { useChat } from "../../../context/ChatContext";
import { useSocket } from "../../../context/SocketContext";
import { useDating } from "../../../context/DatingContext";
import { OpenCallWindow } from '../../../utils/window';
import CallsHeader from "./CallsHeader";
import CallsList from "./CallsList";

export default function CallsDashboard() {
  const navigate = useNavigate();
  const { setSelectedUser } = useChat();
  const { socket } = useSocket();
  const { matches } = useDating();

  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch call history from API
  const fetchCallHistory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/calls/history");
      if (response.data.success) {
        setCalls(response.data.calls);
      }
    } catch (error) {
      console.error("Error fetching call history:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    //Lấy dữ liệu lần đầu khi vào trang
    fetchCallHistory();

    //Lắng nghe sự kiện từ socket để cập nhật lại danh sách
    if (socket) {
      const handleRefreshHistory = () => {
        console.log("Call ended, refreshing history...");
        fetchCallHistory(); // Gọi lại hàm lấy dữ liệu từ API
      };

      //Lắng nghe khi cuộc gọi kết thúc hoặc bị từ chối
      socket.on("call:ended", handleRefreshHistory);
      socket.on("call:rejected", handleRefreshHistory);
      socket.on("call:busy", handleRefreshHistory);

      // Cleanup function để tránh rò rỉ bộ nhớ khi component bị unmount
      return () => {
        socket.off("call:ended", handleRefreshHistory);
        socket.off("call:rejected", handleRefreshHistory);
        socket.off("call:busy", handleRefreshHistory);
      };
    }
  }, [fetchCallHistory, socket]);

  // Filter calls
  const filteredCalls = calls.filter(call => {
    const matchesSearch = call.contact?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) || call.contact?.email?.toLowerCase().includes(searchQuery.toLowerCase());;

    let matchesFilter = true;
    if (filter === "missed") {
      matchesFilter = call.status === "missed" || call.status === "rejected" || call.status === "busy" || call.status === "unavailable";
    } else if (filter === "incoming") {
      matchesFilter = call.direction === "incoming" && call.status === "answered";
    } else if (filter === "outgoing") {
      matchesFilter = call.direction === "outgoing" && call.status === "answered";
    }

    return matchesSearch && matchesFilter;
  });

  const handleMessage = (call) => {
    const isDatingMatch = matches.some((match) => match._id === call.contact?._id);
    setSelectedUser({ ...call.contact, isDatingMatch });
    navigate("/chat/messages");
  };

  const openCallWindow = (contact, isVideo) => {
    const avatarUrl = contact.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.fullName)}&background=random`;

    const params = {
      name: contact.fullName,
      avatar: avatarUrl,
      id: contact._id,
      video: isVideo ? "true" : "false",
      caller: "true"
    };

    OpenCallWindow(params);
  };

  return (
    <div className="flex flex-col h-full">
      <CallsHeader
        filter={filter}
        setFilter={setFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      <div className="flex-1 overflow-y-auto px-4 md:px-6">
        <CallsList
          calls={filteredCalls}
          loading={loading}
          onMessage={handleMessage}
          onCall={(call) => openCallWindow(call.contact, false)}
          onVideo={(call) => openCallWindow(call.contact, true)}
        />
      </div>
    </div>
  );

}
