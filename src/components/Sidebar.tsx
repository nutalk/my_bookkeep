"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useChatPanel } from "@/lib/chat-context";

interface NavChild {
  href: string;
  label: string;
  icon: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: string;
  children?: NavChild[];
}

const navItems: NavItem[] = [
  { href: "/", label: "总览", icon: "📊" },
  { href: "/assets", label: "资产", icon: "💰" },
  { href: "/liabilities", label: "负债", icon: "💳" },
  { href: "/transactions", label: "记账", icon: "📝" },
  { href: "/reconciliations", label: "对账", icon: "✅" },
  { href: "/statistics", label: "统计", icon: "📈" },
  {
    href: "/settings",
    label: "账号设置",
    icon: "⚙️",
    children: [
      { href: "/settings/data", label: "数据管理", icon: "🗄️" },
      { href: "/settings/ai", label: "AI 设置", icon: "🔑" },
      { href: "/settings/theme", label: "颜色主题", icon: "🎨" },
    ],
  },
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
  const { panelOpen, togglePanel } = useChatPanel();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  // 进入设置相关页面时自动展开子菜单，离开时收起
  useEffect(() => {
    setSettingsExpanded(pathname.startsWith("/settings"));
  }, [pathname]);

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
    <aside className="w-56 bg-neutral-900 border-r border-neutral-800 h-full flex flex-col">
      <div className="p-4 border-b border-neutral-800">
        <h1 className="text-lg font-bold text-white">家庭资产负债表</h1>
        <p className="text-xs text-neutral-400 mt-1">Family Balance Sheet</p>
      </div>
      <nav className="flex-1 p-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          if (item.children) {
            return (
              <div key={item.href}>
                <button
                  onClick={() => {
                    setSettingsExpanded((v) => !v);
                    if (!pathname.startsWith("/settings")) {
                      router.push("/settings/data");
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="flex-1 text-left">{item.label}</span>
                  <span
                    className={`text-[10px] transition-transform ${
                      settingsExpanded ? "rotate-90" : ""
                    }`}
                  >
                    ▶
                  </span>
                </button>
                {settingsExpanded && (
                  <div className="mt-0.5 space-y-0.5 pl-4">
                    {item.children.map((child) => {
                      const childActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                            childActive
                              ? "bg-blue-600/80 text-white"
                              : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                          }`}
                        >
                          <span className="text-xs">{child.icon}</span>
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

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
        <button
          onClick={togglePanel}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors w-full text-left ${
            panelOpen
              ? "bg-blue-600 text-white"
              : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
          }`}
        >
          <span className="text-base">🤖</span>
          <span>AI聊天</span>
        </button>
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
