import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from "redux-persist";

import authReducer from "./slices/authSlice";
import projectReducer from "./slices/projectSlice";
import staffReducer from "./slices/staffSlice";
import taskReducer from "./slices/taskSlice";
import staffAuthReducer from "./slices/staffAuthslice";
import staffSidebarReducer from "./slices/staffSidebarslice";
import leaveRequestReducer from "./slices/leaveRequestSlice";
import chatReducer from "./slices/chatSlice";
import roomChatReducer from "./slices/roomChatSlice";
import presenceReducer from "./slices/presenceSlice";
import notificationReducer from "./slices/notificationSlice";

const safeParse = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    if (!item || item === "undefined") return defaultValue;
    return JSON.parse(item);
  } catch {
    return defaultValue;
  }
};

// ✅ Persist configs
const chatPersistConfig = {
  key: "chat",
  storage,
  whitelist: ["messages"],
};

const authPersistConfig = {
  key: "auth",
  storage,
  whitelist: ["user", "accessToken"], // <-- CHANGED from "token" to "accessToken"
};

const rootPersistConfig = {
  key: "root",
  storage,
  whitelist: ["auth", "chat"], // ✅ Do not persist notifications (expires in 4 days)
};

// ✅ Combine reducers
const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  projects: projectReducer,
  staff: staffReducer,
  tasks: taskReducer,
  staffAuth: staffAuthReducer,
  staffSidebar: staffSidebarReducer,
  leaveRequest: leaveRequestReducer,
  chat: persistReducer(chatPersistConfig, chatReducer),
  roomChat: roomChatReducer,
  presence: presenceReducer,
  notifications: notificationReducer,
});

// ✅ Create persisted root reducer
const persistedReducer = persistReducer(rootPersistConfig, rootReducer);

// ✅ Optional preloaded state
const preloadedState = {
  auth: {
    user: safeParse("user", null),
    isAuthenticated: !!localStorage.getItem("accessToken"), // <-- CHANGED
    status: "idle",
    error: null,
  },
  staffAuth: {
    user: safeParse("user", null),
    token: localStorage.getItem("accessToken") || null,     // <-- CHANGED
    role: localStorage.getItem("role") || null,
    permissions: safeParse("permissions", []),
    loading: false,
    error: null,
  },
  leaveRequest: {
    loading: false,
    data: null,
    error: null,
  },
};

// ✅ Configure store
const store = configureStore({
  reducer: persistedReducer,
  preloadedState,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  devTools: process.env.NODE_ENV !== "production",
});

export const persistor = persistStore(store);
export default store;
