import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import "antd/dist/reset.css";  // Replace the outdated antd.min.css import
import store from "./redux/store";
import { Provider } from "react-redux";
import { unregisterServiceWorker } from "./serviceWorkerRegistration";

// Unregister any existing service workers to prevent workbox errors
unregisterServiceWorker();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <Provider store={store}>
    <App />
  </Provider>
);
reportWebVitals();
