import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { AIChatPanel } from "@/components/AIChatPanel";
import { ChatProvider } from "@/lib/chat-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "家庭资产负债表",
  description: "记录和管理家庭资产、负债、现金流",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement,t=localStorage.getItem("theme");if(!t)return;if(t==="custom"){d.setAttribute("data-theme","custom");var c=JSON.parse(localStorage.getItem("theme-custom-colors")||"{}");for(var k in c){if(/^#[0-9a-fA-F]{6}$/.test(c[k]))d.style.setProperty(k,c[k]);}}else if(t==="light"||t==="gray"||t==="lightgray"){d.setAttribute("data-theme",t);}}catch(e){}})();`,
          }}
        />
        <ChatProvider>
          <div className="flex min-h-screen bg-neutral-950">
            <Sidebar />
            <main className="flex-1 overflow-auto">{children}</main>
            <AIChatPanel />
          </div>
        </ChatProvider>
      </body>
    </html>
  );
}
