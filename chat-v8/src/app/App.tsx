import { useState } from "react";
import Component from "../imports/首页";
import { VoiceAssistant } from "./components/VoiceAssistant";
import { VoiceChatPage } from "./components/VoiceChatPage";
import { Car, Users, ShoppingBag, User } from "lucide-react";

const tabs = [
  { icon: Car, label: "车辆", active: true },
  { icon: Users, label: "社区", active: false },
  { icon: ShoppingBag, label: "商城", active: false },
  { icon: User, label: "我的", active: false },
];

// iPhone 17 dimensions: 393 × 852 pt
const PHONE_W = 393;
const PHONE_H = 852;
const TAB_H = 66;

type Page = "home" | "voiceChat";

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("home");

  const handleOpenVoiceChat = () => {
    setCurrentPage("voiceChat");
  };

  const handleCloseVoiceChat = () => {
    setCurrentPage("home");
  };

  // 如果是语音对话页面，直接显示
  if (currentPage === "voiceChat") {
    return (
      <div className="size-full flex items-center justify-center bg-black">
        <div
          className="relative overflow-hidden bg-[#0a0c0f] flex-shrink-0"
          style={{ width: PHONE_W, height: PHONE_H }}
        >
          <VoiceChatPage onClose={handleCloseVoiceChat} />
        </div>
      </div>
    );
  }

  return (
    <div className="size-full flex items-center justify-center bg-black">
      <div
        className="relative overflow-hidden bg-[#0a0c0f] flex-shrink-0"
        style={{ width: PHONE_W, height: PHONE_H }}
      >
        {/* ── Scrollable content (full phone height, content extends beyond) ── */}
        <div
          className="absolute inset-0 overflow-y-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {/* Inner container tall enough for all Figma absolute-positioned content */}
          <div style={{ width: PHONE_W, height: 1320, position: "relative" }}>
            {/* Figma component fills this tall container */}
            <div style={{ width: PHONE_W, height: 1320, position: "absolute", inset: 0 }}>
              <Component />
            </div>
          </div>
        </div>

        {/* ── Fixed bottom tab bar overlay (always visible) ── */}
        <div
          className="absolute bottom-0 left-0 right-0 z-40 flex items-start justify-around pt-[10px] px-2"
          style={{
            height: TAB_H,
            background: "rgba(0,0,0,0.72)",
            backdropFilter: "blur(33px)",
            WebkitBackdropFilter: "blur(33px)",
            borderTop: "0.5px solid rgba(255,255,255,0.07)",
          }}
        >
          {tabs.map((tab) => (
            <div
              key={tab.label}
              className="flex flex-col gap-[2px] items-center cursor-pointer"
              style={{ width: 85 }}
            >
              <tab.icon
                size={22}
                color={tab.active ? "rgba(255,255,255,0.9)" : "rgba(117,127,155,0.5)"}
                strokeWidth={1.5}
              />
              <span
                style={{
                  fontSize: 10,
                  color: tab.active ? "rgba(255,255,255,0.9)" : "rgba(117,127,155,0.5)",
                  fontFamily: "sans-serif",
                }}
              >
                {tab.label}
              </span>
            </div>
          ))}
        </div>

        {/* ── Voice assistant (button + dialog, z-50 above tab) ── */}
        <VoiceAssistant tabHeight={TAB_H} onOpenChatPage={handleOpenVoiceChat} />
      </div>
    </div>
  );
}
