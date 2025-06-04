import { tokenRefreshInterceptor as axiosInstance } from "../utils/axiosInstance";

export const getNotificationsAPI = async () => {
  const res = await axiosInstance.get("/notifications");
  return res.data.data;
};

export const markAsReadAPI = async (id) => {
  return await axiosInstance.put(`/notifications/${id}/read`);
};
