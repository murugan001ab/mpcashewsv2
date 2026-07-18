import { Outlet } from "react-router-dom";
import Sidebar from "./Components/Sidebar"; // Adjust path if needed

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-[#f8f9fa] font-sans">
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-6 md:p-8 lg:p-10 transition-all w-full overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}