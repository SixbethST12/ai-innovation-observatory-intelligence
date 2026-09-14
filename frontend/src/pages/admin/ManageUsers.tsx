/**
 * ManageUsers.tsx — Admin: add/list/remove user accounts (prototype).
 */
import { useEffect, useState } from "react";
import { Users, Plus, Trash2, Shield, UserCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getUsers, createUser, deleteUser, type AppUser } from "@/lib/api";

export default function ManageUsers() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"analyst" | "admin">("analyst");
  const [error, setError] = useState("");

  async function refresh() {
    const list = await getUsers();
    setUsers(list);
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Username and password are required");
      return;
    }
    try {
      await createUser({
        username: username.trim(),
        password,
        role,
        full_name: fullName.trim(),
      });
      setUsername("");
      setPassword("");
      setFullName("");
      await refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create user";
      setError(message);
    }
  }

  async function handleDelete(id: number) {
    setError("");
    try {
      await deleteUser(id);
      await refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete user";
      setError(message);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[var(--bot-navy)] tracking-tight">
          Manage Users
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Add or remove Analyst and Admin accounts
        </p>
      </div>

      <Card className="mb-6 border-amber-200 bg-amber-50">
        <CardContent className="text-xs text-amber-800 p-4 leading-relaxed">
          <strong>Prototype only:</strong> Users are stored in-memory on the backend and
          reset when it restarts. Passwords are not hashed. Not production authentication.
        </CardContent>
      </Card>

      <div className="grid grid-cols-[1fr_1.4fr] gap-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] text-[var(--bot-navy)] flex items-center gap-2">
              <Plus size={14} /> Add User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Username
                </label>
                <Input
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(""); }}
                  placeholder="e.g. jdoe"
                  className="mt-1.5"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Full name
                </label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  className="mt-1.5"
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
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Role
                </label>
                <Select value={role} onValueChange={(v) => setRole(v as "analyst" | "admin")}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue>{role === "analyst" ? "Analyst" : "Admin"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="analyst">Analyst</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full bg-[var(--bot-navy)] hover:bg-[var(--bot-navy-dark)]">
                <Plus size={14} /> Create User
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] text-[var(--bot-navy)] flex items-center gap-2">
              <Users size={14} /> Users ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-10 text-gray-500">Loading users…</div>
            ) : (
              <div className="space-y-3">
                {users.map(u => (
                  <div key={u.id} className="border border-gray-100 rounded-lg p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      u.role === "admin" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                    }`}>
                      {u.role === "admin" ? <Shield size={18} /> : <UserCircle size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-[var(--bot-navy)]">
                        {u.full_name || u.username}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">@{u.username}</div>
                    </div>
                    <Badge className={`capitalize border font-bold ${
                      u.role === "admin"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}>
                      {u.role}
                    </Badge>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="text-gray-400 hover:text-red-500 transition p-1"
                      title="Delete user"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
