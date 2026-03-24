"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/", label: "总览", icon: "📊" },
  { href: "/assets", label: "资产", icon: "💰" },
  { href: "/liabilities", label: "负债", icon: "💳" },
  { href: "/transactions", label: "账目", icon: "📝" },
  { href: "/reconciliations", label: "对账", icon: "✅" },
  { href: "/statistics", label: "统计", icon: "📈" },
];

interface UserInfo {
  id: number;
  phone: string;
  nickname: string | null;
  avatarUrl: string | null;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <aside className="w-56 bg-neutral-900 border-r border-neutral-800 min-h-screen flex flex-col">
      <div className="p-4 border-b border-neutral-800">
        <h1 className="text-lg font-bold text-white">家庭资产负债表</h1>
        <p className="text-xs text-neutral-400 mt-1">Family Balance Sheet</p>
      </div>
      <nav className="flex-1 p-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-neutral-800">
        {user && (
          <div className="mb-2">
            <p className="text-sm text-white truncate">
              {user.nickname || user.phone}
            </p>
            <p className="text-xs text-neutral-500">{user.phone}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full text-xs text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg px-3 py-2 transition-colors disabled:opacity-50"
        >
          {loggingOut ? "退出中..." : "退出登录"}
        </button>
        <p className="text-xs text-neutral-600 mt-2 text-center">v0.2.0</p>
      </div>
    </aside>
  );
}
