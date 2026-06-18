import { Outlet } from "react-router-dom";
import Sidebar from "./Components/Sidebar";

export default function AdminLayout() {
  return (
    <div>
      <Sidebar />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
