import { tokenRefreshInterceptor as axiosInstance } from "../utils/axiosInstance";

export const getNotificationsAPI = async () => {
  const res = await axiosInstance.get("/notifications");
  return res.data.data;
};

export const markAsReadAPI = async (id) => {
  return await axiosInstance.put(`/notifications/${id}/read`);
};

export const markAllAsReadAPI = async () => {
  return await axiosInstance.put("/notifications/read-all");
};

export const clearAllNotificationsAPI = async () => {
  return await axiosInstance.delete("/notifications/clear-all");
};
