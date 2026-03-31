import { useState } from "react";
import Component from "../imports/1267-50-2751";
import { VoiceAssistant } from "./components/VoiceAssistant";
import { VoiceChatPage } from "./components/VoiceChatPage";

// iPhone 17 dimensions: 393 × 852 pt
const PHONE_W = 393;
const PHONE_H = 852;
const TAB_H = 80;

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
          <div style={{ width: PHONE_W, height: 1400, position: "relative" }}>
            {/* New Figma component fills this container */}
            <div style={{ width: PHONE_W, height: 1400, position: "absolute", inset: 0 }}>
              <Component />
            </div>
          </div>
        </div>

        {/* ── Voice assistant (button + dialog, z-50 above all content) ── */}
        <VoiceAssistant tabHeight={TAB_H} onOpenChatPage={handleOpenVoiceChat} />
      </div>
    </div>
  );
}
