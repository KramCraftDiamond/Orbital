import { RouterProvider } from "react-router";
import { router } from "./routes";
import { PipelineWorkflowProvider } from "../state/PipelineWorkflowContext";

export default function App() {
  return (
    <PipelineWorkflowProvider>
      <RouterProvider router={router} />
    </PipelineWorkflowProvider>
  );
}
