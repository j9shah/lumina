import { DeployButton } from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Floating navigation for paint app */}
      <nav style={{ 
        position: "fixed", 
        top: 0, 
        left: 0, 
        right: 0, 
        zIndex: 1000, 
        background: "rgba(24, 31, 42, 0.9)", 
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        padding: "8px 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", fontSize: 14 }}>
          <Link href={"/"} style={{ color: "#fff", textDecoration: "none", fontWeight: 600 }}>
            Next.js Supabase Starter
          </Link>
          <DeployButton />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
        </div>
      </nav>
      
      {/* Main content - full screen for paint app */}
      <main style={{ paddingTop: "60px", minHeight: "100vh" }}>
        {children}
      </main>
    </>
  );
}
