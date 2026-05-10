import { createBrowserRouter } from "react-router";
import Layout from "./components/Layout";
import Dashboard from "./components/pages/Dashboard";
import DataCollection from "./components/pages/DataCollection";
import Annotation from "./components/pages/Annotation";
import KnowledgeGraph from "./components/pages/KnowledgeGraph";
import History from "./components/pages/History";
import Settings from "./components/pages/Settings";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "data-collection", Component: DataCollection },
      { path: "annotation", Component: Annotation },
      { path: "knowledge-graph", Component: KnowledgeGraph },
      { path: "history", Component: History },
      { path: "settings", Component: Settings },
    ],
  },
]);
