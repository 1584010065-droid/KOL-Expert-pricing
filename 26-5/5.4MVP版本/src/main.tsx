import React from "react";
import ReactDOM from "react-dom/client";
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import { AppProvider } from "./state/AppState";
import { AppShell } from "./ui/AppShell";
import { UploadPage } from "./pages/UploadPage";
import { MappingPage } from "./pages/MappingPage";
import { CreatorsPage } from "./pages/CreatorsPage";
import { CreatorDetailPage } from "./pages/CreatorDetailPage";
import "./styles.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/upload" replace /> },
      { path: "upload", element: <UploadPage /> },
      { path: "mapping", element: <MappingPage /> },
      { path: "creators", element: <CreatorsPage /> },
      { path: "creators/:uid", element: <CreatorDetailPage /> }
    ]
  }
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  </React.StrictMode>
);
