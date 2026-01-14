import "../globals.css";
import Sidebar from "../../components/Sidebar";
import ProtectedRoute from "../../context/ProtectedRoute";

export const dynamic = "force-dynamic";


export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
