/**
 * Login.tsx — Simple role-based login (prototype only).
 *
 * NOTE: Credentials are checked client-side. This is NOT real auth
 * and is documented as a prototype limitation.
 */
import { useState } from "react";
import { UserCircle, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CREDS = {
  analyst: { user: "analyst", pass: "analyst123" },
  admin:   { user: "admin",   pass: "admin123"   },
};

type Role = "analyst" | "admin";

export default function Login({ onLogin }: { onLogin: (role: Role) => void }) {
  const [role, setRole] = useState<Role>("analyst");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const c = CREDS[role];
    if (username === c.user && password === c.pass) {
      onLogin(role);
    } else {
      setError(`Invalid ${role} credentials. Try ${c.user} / ${c.pass}`);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bot-cream)]">
      {/* Header */}
      <div className="bg-white border-b-2 border-[var(--bot-gold)] py-5">
        <div className="flex justify-center items-center gap-6">
          <img src="/coat-of-arms.jpg" alt="Tanzania coat of arms" className="h-16 w-auto" />
          <div className="text-center">
            <div className="text-xl font-extrabold tracking-wide text-[#0f2b4a]">
              CENTRAL BANK OF TANZANIA
            </div>
            <div className="text-xs text-gray-500 mt-1">
              AI Innovation Observatory for Central Banking &amp; Financial Sector Intelligence
            </div>
          </div>
          <img src="/bot-crest.jpg" alt="BoT crest" className="h-14 w-auto" />
        </div>
      </div>

      {/* Login */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-extrabold text-[var(--bot-navy)]">Sign in</h1>
              <p className="text-sm text-gray-500 mt-1">Choose your role to continue</p>
            </div>

            {/* Role picker */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                onClick={() => { setRole("analyst"); setError(""); }}
                className={`flex flex-col items-center gap-2 py-4 rounded-lg border-2 transition ${
                  role === "analyst"
                    ? "border-[var(--bot-navy)] bg-[var(--bot-navy-soft)]"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <UserCircle size={28} className={role === "analyst" ? "text-[var(--bot-navy)]" : "text-gray-400"} />
                <span className={`text-sm font-bold ${role === "analyst" ? "text-[var(--bot-navy)]" : "text-gray-500"}`}>
                  Analyst
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setRole("admin"); setError(""); }}
                className={`flex flex-col items-center gap-2 py-4 rounded-lg border-2 transition ${
                  role === "admin"
                    ? "border-[var(--bot-navy)] bg-[var(--bot-navy-soft)]"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <Shield size={28} className={role === "admin" ? "text-[var(--bot-navy)]" : "text-gray-400"} />
                <span className={`text-sm font-bold ${role === "admin" ? "text-[var(--bot-navy)]" : "text-gray-500"}`}>
                  Admin
                </span>
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Username
                </label>
                <Input
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(""); }}
                  placeholder={role === "analyst" ? "analyst" : "admin"}
                  className="mt-1.5"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Password
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••••••"
                  className="mt-1.5"
                />
              </div>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-[var(--bot-navy)] hover:bg-[var(--bot-navy-dark)] text-white"
              >
                Sign in as {role.charAt(0).toUpperCase() + role.slice(1)}
              </Button>
            </form>

            <div className="text-[11px] text-gray-400 text-center mt-6 leading-relaxed">
              Prototype credentials (not for production):<br />
              Analyst: <code className="bg-gray-100 px-1 rounded">analyst / analyst123</code><br />
              Admin: <code className="bg-gray-100 px-1 rounded">admin / admin123</code>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
