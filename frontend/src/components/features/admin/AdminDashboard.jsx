import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Flag,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldOff,
  Users,
} from "lucide-react";
import { axiosInstance } from "../../../lib/axios";
import { useAuth } from "../../../context/AuthContext";

const reasonLabels = {
  "fake-profile": "Fake profile",
  harassment: "Harassment",
  spam: "Spam",
  "inappropriate-content": "Inappropriate content",
  scam: "Scam",
  other: "Other",
};

const statusStyles = {
  pending: "bg-amber-50 text-amber-700 border-amber-100",
  reviewed: "bg-blue-50 text-blue-700 border-blue-100",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-100",
  dismissed: "bg-gray-100 text-gray-600 border-gray-200",
};

const StatCard = ({ icon: Icon, label, value, tone = "pink" }) => {
  const tones = {
    pink: "bg-pink-50 text-pink-500",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-emerald-50 text-emerald-600",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone]}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value ?? 0}</p>
        </div>
      </div>
    </div>
  );
};

const UserAvatar = ({ user, size = "md" }) => {
  const sizes = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  return user?.profilePic ? (
    <img src={user.profilePic} alt={user.fullName} className={`${sizes} rounded-full object-cover`} />
  ) : (
    <div className={`${sizes} flex items-center justify-center rounded-full bg-pink-50 text-sm font-bold text-pink-500`}>
      {(user?.fullName || user?.email || "U").charAt(0).toUpperCase()}
    </div>
  );
};

export default function AdminDashboard() {
  const { authUser } = useAuth();
  const [activeTab, setActiveTab] = useState("reports");
  const [overview, setOverview] = useState(null);
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [reportStatus, setReportStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, reportsRes, usersRes] = await Promise.all([
        axiosInstance.get("/admin/overview"),
        axiosInstance.get("/admin/reports", { params: { status: reportStatus } }),
        axiosInstance.get("/admin/users", { params: { search } }),
      ]);
      setOverview(overviewRes.data);
      setReports(reportsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, [reportStatus, search]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const updateReportStatus = async (reportId, status) => {
    setActionId(reportId);
    try {
      const res = await axiosInstance.patch(`/admin/reports/${reportId}`, { status });
      setReports((items) => items.map((item) => (item._id === reportId ? res.data : item)));
      toast.success("Report status updated");
      fetchAdminData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update report");
    } finally {
      setActionId(null);
    }
  };

  const updateUserModeration = async (user, isSuspended) => {
    const reason = isSuspended ? "Suspended after admin review" : "";
    setActionId(user._id);
    try {
      const res = await axiosInstance.patch(`/admin/users/${user._id}/moderation`, {
        isSuspended,
        suspendedReason: reason,
      });
      setUsers((items) => items.map((item) => (item._id === user._id ? res.data : item)));
      setReports((items) =>
        items.map((report) =>
          report.reportedUser?._id === user._id
            ? { ...report, reportedUser: { ...report.reportedUser, isSuspended } }
            : report
        )
      );
      toast.success(isSuspended ? "User suspended" : "User restored");
      fetchAdminData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update user");
    } finally {
      setActionId(null);
    }
  };


  const updateUserVerification = async (user, status) => {
    setActionId(`verify-${user._id}`);
    try {
      const res = await axiosInstance.patch(`/admin/users/${user._id}/verification`, {
        status,
        note: status === "rejected" ? "Profile verification rejected by admin" : "",
      });
      setUsers((items) => items.map((item) => (item._id === user._id ? res.data : item)));
      toast.success(status === "verified" ? "Profile verified" : "Verification rejected");
      fetchAdminData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update verification");
    } finally {
      setActionId(null);
    }
  };

  const filteredReports = useMemo(() => reports, [reports]);

  if (authUser?.role !== "admin") {
    return (
      <div className="flex h-full items-center justify-center bg-[#FAFAFA] p-6">
        <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
          <ShieldOff className="mx-auto mb-4 text-pink-500" size={42} />
          <h2 className="text-2xl font-bold text-gray-900">Admin access required</h2>
          <p className="mt-2 text-gray-500">Only administrator accounts can open this area.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#FAFAFA] p-4 md:p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-pink-500">
              <ShieldCheck size={22} />
              <span className="text-sm font-bold uppercase tracking-wide">Admin</span>
            </div>
            <h1 className="mt-1 text-3xl font-bold text-gray-900">Moderation Dashboard</h1>
            <p className="text-gray-500">Review reports, protect members, and manage account safety.</p>
          </div>
          <button
            onClick={fetchAdminData}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-semibold text-gray-700 shadow-sm transition hover:text-pink-500 hover:shadow-md"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Users} label="Members" value={overview?.totalUsers} tone="pink" />
          <StatCard icon={Flag} label="Pending reports" value={overview?.pendingReports} tone="amber" />
          <StatCard icon={CheckCircle2} label="Resolved reports" value={overview?.resolvedReports} tone="green" />
          <StatCard icon={ShieldCheck} label="Pending verifications" value={overview?.pendingVerifications} tone="amber" />
          <StatCard icon={ShieldOff} label="Suspended users" value={overview?.suspendedUsers} tone="slate" />
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-3xl bg-white p-2 shadow-sm">
          <button
            onClick={() => setActiveTab("reports")}
            className={`rounded-2xl px-5 py-3 font-bold transition ${activeTab === "reports" ? "bg-pink-500 text-white" : "text-gray-500 hover:bg-gray-50"}`}
          >
            Reports
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`rounded-2xl px-5 py-3 font-bold transition ${activeTab === "users" ? "bg-pink-500 text-white" : "text-gray-500 hover:bg-gray-50"}`}
          >
            Users
          </button>
        </div>

        {activeTab === "reports" ? (
          <section className="rounded-3xl bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-gray-100 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">User reports</h2>
                <p className="text-sm text-gray-500">Newest reports are shown first.</p>
              </div>
              <select
                value={reportStatus}
                onChange={(event) => setReportStatus(event.target.value)}
                className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-pink-300"
              >
                <option value="all">All status</option>
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>

            <div className="divide-y divide-gray-100">
              {filteredReports.length === 0 ? (
                <div className="p-10 text-center text-gray-500">No reports found</div>
              ) : (
                filteredReports.map((report) => { return (
                  <article key={report._id} className="p-4 transition hover:bg-gray-50/60">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusStyles[report.status] || statusStyles.pending}`}>
                            {report.status}
                          </span>
                          <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-bold text-pink-600">
                            {reasonLabels[report.reason] || report.reason}
                          </span>
                          <span className="text-xs font-medium text-gray-400">
                            {new Date(report.createdAt).toLocaleString()}
                          </span>
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <div className="flex items-center gap-3 rounded-2xl bg-gray-50 p-3">
                            <UserAvatar user={report.reporter} size="sm" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-400">Reporter</p>
                              <p className="truncate font-bold text-gray-900">{report.reporter?.fullName || "Unknown"}</p>
                              <p className="truncate text-sm text-gray-500">{report.reporter?.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 rounded-2xl bg-gray-50 p-3">
                            <UserAvatar user={report.reportedUser} size="sm" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-400">Reported user</p>
                              <p className="truncate font-bold text-gray-900">{report.reportedUser?.fullName || "Unknown"}</p>
                              <p className="truncate text-sm text-gray-500">{report.reportedUser?.email}</p>
                            </div>
                          </div>
                        </div>

                        {report.details && (
                          <p className="mt-3 rounded-2xl bg-white text-sm leading-6 text-gray-600 md:max-w-3xl">
                            {report.details}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 xl:justify-end">
                        <button
                          disabled={actionId === report._id}
                          onClick={() => updateReportStatus(report._id, "reviewed")}
                          className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-600 transition hover:bg-blue-100 disabled:opacity-60"
                        >
                          Review
                        </button>
                        <button
                          disabled={actionId === report._id}
                          onClick={() => updateReportStatus(report._id, "resolved")}
                          className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-60"
                        >
                          Resolve
                        </button>
                        <button
                          disabled={actionId === report._id}
                          onClick={() => updateReportStatus(report._id, "dismissed")}
                          className="rounded-xl bg-gray-100 px-3 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-200 disabled:opacity-60"
                        >
                          Dismiss
                        </button>
                        {report.reportedUser && report.reportedUser.role !== "admin" && (
                          <button
                            disabled={actionId === report.reportedUser._id}
                            onClick={() => updateUserModeration(report.reportedUser, !report.reportedUser.isSuspended)}
                            className={`rounded-xl px-3 py-2 text-sm font-bold transition disabled:opacity-60 ${
                              report.reportedUser.isSuspended
                                ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                : "bg-red-50 text-red-600 hover:bg-red-100"
                            }`}
                          >
                            {report.reportedUser.isSuspended ? "Restore user" : "Suspend user"}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                  );
                })
              )}
            </div>
          </section>
        ) : (
          <section className="rounded-3xl bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-gray-100 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Members</h2>
                <p className="text-sm text-gray-500">Search and moderate member accounts.</p>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-gray-50 px-4 py-3 md:w-80">
                <Search size={18} className="text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name or email"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <div className="p-10 text-center text-gray-500">No users found</div>
              ) : (
                users.map((user) => {
                  const verificationStatus = user.profileVerification?.status || "none";
                  const verificationClass =
                    verificationStatus === "verified"
                      ? "bg-emerald-50 text-emerald-600"
                      : verificationStatus === "pending"
                        ? "bg-amber-50 text-amber-600"
                        : verificationStatus === "rejected"
                          ? "bg-red-50 text-red-600"
                          : "bg-gray-100 text-gray-500";

                  return (
                  <article key={user._id} className="flex flex-col gap-3 p-4 transition hover:bg-gray-50/60 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar user={user} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-bold text-gray-900">{user.fullName}</p>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${user.role === "admin" ? "bg-pink-50 text-pink-600" : "bg-gray-100 text-gray-500"}`}>
                            {user.role}
                          </span>
                          {user.isSuspended && (
                            <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">Suspended</span>
                          )}
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${verificationClass}`}>
                            {verificationStatus}
                          </span>
                        </div>
                        <p className="truncate text-sm text-gray-500">{user.email}</p>
                        {user.suspendedReason && <p className="text-xs text-red-500">{user.suspendedReason}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="hidden items-center gap-1 text-xs text-gray-400 md:inline-flex">
                        <Clock3 size={14} /> {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                      {user.role !== "admin" && verificationStatus !== "verified" && (
                        <button
                          disabled={actionId === `verify-${user._id}`}
                          onClick={() => updateUserVerification(user, "verified")}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-60"
                          title="Verify profile"
                        >
                          <ShieldCheck size={16} />
                          Verify
                        </button>
                      )}
                      {user.role !== "admin" && verificationStatus === "pending" && (
                        <button
                          disabled={actionId === `verify-${user._id}`}
                          onClick={() => updateUserVerification(user, "rejected")}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-200 disabled:opacity-60"
                        >
                          Reject
                        </button>
                      )}
                      {user.role !== "admin" && (
                        <button
                          disabled={actionId === user._id}
                          onClick={() => updateUserModeration(user, !user.isSuspended)}
                          className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition disabled:opacity-60 ${
                            user.isSuspended
                              ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                              : "bg-red-50 text-red-600 hover:bg-red-100"
                          }`}
                        >
                          {user.isSuspended ? <ShieldCheck size={16} /> : <AlertTriangle size={16} />}
                          {user.isSuspended ? "Restore" : "Suspend"}
                        </button>
                      )}
                    </div>
                  </article>
                  );
                })
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}