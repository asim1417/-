import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await requireRole(["ADMIN", "REVIEWER", "EDITOR"]);
  if (!s) redirect("/login");
  return <>{children}</>;
}
