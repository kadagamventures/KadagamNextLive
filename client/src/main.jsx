// src/index.jsx (or main.jsx)
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";
import "./index.css";

import store, { persistor } from "./redux/store.js";
import App from "./App.jsx";

// Optional: loading screen during persistence rehydration
const LoadingScreen = () => (
  <div className="flex justify-center items-center min-h-screen bg-white">
    <p className="text-gray-600 text-lg">Loading your workspace...</p>
  </div>
);

// Initialize root container
const root = createRoot(document.getElementById("root"));

root.render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={<LoadingScreen />} persistor={persistor}>
        <App />

        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </PersistGate>
    </Provider>
  </StrictMode>
);
