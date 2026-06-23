import { createContext, useCallback, useContext, useState } from "react";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

const ReportContext = createContext();

export const reportReasons = [
  { value: "fake-profile", label: "Fake profile" },
  { value: "harassment", label: "Harassment or abusive behavior" },
  { value: "spam", label: "Spam or unwanted messages" },
  { value: "inappropriate-content", label: "Inappropriate content" },
  { value: "scam", label: "Scam or suspicious activity" },
  { value: "other", label: "Other" },
];

export const ReportProvider = ({ children }) => {
  const [isReporting, setIsReporting] = useState(false);

  const reportUser = useCallback(async (userId, data) => {
    setIsReporting(true);
    try {
      const res = await axiosInstance.post(`/reports/${userId}`, data);
      toast.success(res.data?.message || "Report submitted");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit report");
      throw error;
    } finally {
      setIsReporting(false);
    }
  }, []);

  return (
    <ReportContext.Provider value={{ isReporting, reportUser }}>
      {children}
    </ReportContext.Provider>
  );
};

export const useReport = () => {
  const context = useContext(ReportContext);
  if (!context) {
    throw new Error("useReport must be used within a ReportProvider");
  }
  return context;
};

export default ReportContext;
