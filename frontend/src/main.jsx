import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.jsx";

const root = createRoot(document.getElementById("root"));

root.render(
  <StrictMode>
    <GoogleOAuthProvider clientId="946117434038-gnhj3mgbkj20olsubc7qmh3optcrtadd.apps.googleusercontent.com">
      <App />
      
    </GoogleOAuthProvider>
  </StrictMode>
);