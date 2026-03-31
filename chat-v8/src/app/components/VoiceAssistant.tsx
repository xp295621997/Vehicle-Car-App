import { useState, useEffect, useRef, useCallback } from "react";

interface VoiceAssistantProps {
  tabHeight?: number;
  onOpenChatPage?: () => void;
}

/** Gemini-style 4-pointed star, rendered in white */
function StarIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2C12 7.523 7.523 12 2 12C7.523 12 12 16.477 12 22C12 16.477 16.477 12 22 12C16.477 12 12 7.523 12 2Z"
        fill="rgba(255,255,255,0.88)"
      />
    </svg>
  );
}

function WaveBar({ delay, isActive }: { delay: number; isActive: boolean }) {
  return (
    <div
      className="rounded-full"
      style={{
        width: 3,
        minHeight: 4,
        backgroundColor: isActive ? "rgba(51,136,255,0.9)" : "rgba(255,255,255,0.3)",
        animationDelay: `${delay}ms`,
        animation: isActive ? `voiceWave 0.75s ease-in-out infinite alternate ${delay}ms` : undefined,
      }}
    />
  );
}

export function VoiceAssistant({ tabHeight = 66, onOpenChatPage }: VoiceAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "listening" | "processing" | "speaking">("idle");

  // 拖动相关状态
  const [position, setPosition] = useState({ x: 16, y: tabHeight + 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 拖动开始
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragStartPos.current = {
      x: clientX - position.x,
      y: clientY - position.y
    };
  }, [position]);

  // 拖动中
  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;

    const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;

    let newX = clientX - dragStartPos.current.x;
    let newY = clientY - dragStartPos.current.y;

    // 边界限制
    const phoneWidth = 393;
    const phoneHeight = 852;
    const buttonWidth = 52;
    const buttonHeight = 52;

    // 限制在手机屏幕范围内
    newX = Math.max(8, Math.min(newX, phoneWidth - buttonWidth - 8));
    newY = Math.max(60, Math.min(newY, phoneHeight - buttonHeight - tabHeight - 20));

    setPosition({ x: newX, y: newY });
  }, [isDragging, tabHeight]);

  // 拖动结束
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 监听拖动事件
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  const handleOpen = () => {
    setIsOpen(true);
    setStatus("idle");
  };

  const handleClose = () => {
    setIsOpen(false);
    setStatus("idle");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const handleMicPress = () => {
    if (status === "listening") {
      setStatus("processing");
      timeoutRef.current = setTimeout(() => {
        setStatus("speaking");
        timeoutRef.current = setTimeout(() => {
          setStatus("idle");
        }, 3000);
      }, 1500);
    } else {
      setStatus("listening");
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  };

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const statusText = {
    idle: "点击麦克风开始语音指令",
    listening: "正在聆听…",
    processing: "处理中…",
    speaking: "已为您找到结果",
  }[status];

  return (
    <>
      <style>{`
        @keyframes voiceWave {
          0%   { height: 4px;  }
          100% { height: 28px; }
        }
        @keyframes subtlePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(51,136,255,0.08), 0 4px 14px rgba(0,0,0,0.55); }
          50%       { box-shadow: 0 0 0 6px rgba(51,136,255,0.12), 0 4px 14px rgba(0,0,0,0.55); }
        }
        @keyframes listenPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(51,136,255,0.25), 0 4px 16px rgba(0,0,0,0.6); }
          50%       { box-shadow: 0 0 0 10px rgba(51,136,255,0.0), 0 4px 16px rgba(0,0,0,0.6); }
        }
        @keyframes orbSpin {
          from { transform: rotate(0deg);   }
          to   { transform: rotate(360deg); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>

      {/* ── Floating trigger button (可拖动) ── */}
      <button
        ref={buttonRef}
        onClick={handleOpen}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        className="absolute z-50 flex items-center justify-center cursor-pointer select-none"
        style={{
          left: position.x,
          top: position.y,
          width: 52,
          height: 52,
          borderRadius: 26,
          background: "rgba(27,33,44,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "0.8px solid rgba(255,255,255,0.11)",
          animation: isDragging ? "none" : "subtlePulse 4s ease-in-out infinite",
          cursor: isDragging ? "grabbing" : "grab",
          transition: isDragging ? "none" : "box-shadow 0.3s ease",
        }}
      >
        <StarIcon size={40} />
      </button>

      {/* ── Full-screen voice dialog ── */}
      {isOpen && (
        <div
          className="absolute inset-0 z-50 flex flex-col justify-end"
          style={{
            background: "rgba(6,9,14,0.82)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div
            className="flex flex-col items-center w-full"
            style={{
              paddingBottom: tabHeight + 32,
              animation: "fadeUp 0.28s ease-out",
            }}
          >
            {/* Speaking reply bubble */}
            {status === "speaking" && (
              <div
                className="mx-6 mb-8 px-5 py-4 rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "0.8px solid rgba(255,255,255,0.12)",
                  animation: "fadeUp 0.28s ease-out",
                }}
              >
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.65, fontFamily: "sans-serif" }}>
                  您好！我可以帮您控制车辆空调、查询续航里程、开启哨兵模式或导航至目的地。请问有什么需要帮助的吗？
                </p>
              </div>
            )}

            {/* Status label */}
            <p
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.45)",
                fontFamily: "sans-serif",
                marginBottom: 28,
                letterSpacing: "0.02em",
              }}
            >
              {statusText}
            </p>

            {/* Waveform bars - 在聆听/说话状态显示 */}
            {(status === "listening" || status === "speaking") && (
              <div className="flex items-center gap-[6px] mb-8" style={{ height: 36 }}>
                {[0, 70, 140, 210, 280, 350, 420].map((d, i) => (
                  <WaveBar key={i} delay={d} isActive={true} />
                ))}
              </div>
            )}

            {/* 三个按钮横向排列：关闭 | 麦克风 | 对话历史 */}
            <div className="flex items-center justify-center gap-8 mb-6">
              {/* 关闭按钮 - 左边 (常驻) */}
              <button
                onClick={handleClose}
                className="flex items-center justify-center rounded-full cursor-pointer"
                style={{
                  width: 44,
                  height: 44,
                  background: "rgba(255,255,255,0.07)",
                  border: "0.8px solid rgba(255,255,255,0.12)",
                }}
              >
                <svg width="25" height="25" viewBox="0 0 14 14" fill="none">
                  <path d="M3 3l8 8M11 3l-8 8" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>

              {/* Central mic button - 中间 */}
              <div className="relative flex items-center justify-center">
                {/* Ripple rings when listening */}
                {status === "listening" && (
                  <>
                    {[0, 0.6].map((delay) => (
                      <div
                        key={delay}
                        className="absolute rounded-full pointer-events-none"
                        style={{
                          width: 76,
                          height: 76,
                          border: "1.5px solid rgba(51,136,255,0.35)",
                          animation: `listenPulse 1.4s ease-out infinite ${delay}s`,
                        }}
                      />
                    ))}
                  </>
                )}

                <button
                  onClick={handleMicPress}
                  className="relative flex items-center justify-center rounded-full cursor-pointer"
                  style={{
                    width: 76,
                    height: 76,
                    background:
                      status === "listening"
                        ? "linear-gradient(145deg, #1a2a40 0%, #162236 100%)"
                        : status === "processing"
                        ? "linear-gradient(145deg, #152030 0%, #1a2a40 100%)"
                        : status === "speaking"
                        ? "linear-gradient(145deg, #0f2a1e 0%, #1a2a40 100%)"
                        : "rgba(27,33,44,0.95)",
                    border:
                      status === "listening"
                        ? "1px solid rgba(51,136,255,0.45)"
                        : status === "speaking"
                        ? "1px solid rgba(47,207,116,0.35)"
                        : "1px solid rgba(255,255,255,0.12)",
                    boxShadow:
                      status === "listening"
                        ? "0 0 24px rgba(51,136,255,0.2), 0 4px 16px rgba(0,0,0,0.5)"
                        : "0 4px 16px rgba(0,0,0,0.5)",
                    transition: "all 0.35s ease",
                  }}
                >
                  {status === "processing" ? (
                    <div style={{ animation: "orbSpin 1.2s linear infinite" }}>
                      <StarIcon size={26} />
                    </div>
                  ) : status === "speaking" ? (
                    /* speaker wave icon */
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                      <path d="M12 5v14M8 8v8M4 10v4M16 7v10M20 9v6" stroke="rgba(47,207,116,0.9)" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  ) : (
                    /* mic icon */
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                      <rect x="9" y="2" width="6" height="11" rx="3"
                        fill={status === "listening" ? "rgba(51,136,255,0.9)" : "rgba(255,255,255,0.85)"} />
                      <path d="M5 10a7 7 0 0014 0"
                        stroke={status === "listening" ? "rgba(51,136,255,0.9)" : "rgba(255,255,255,0.85)"}
                        strokeWidth="1.8" strokeLinecap="round" />
                      <line x1="12" y1="17" x2="12" y2="21"
                        stroke={status === "listening" ? "rgba(51,136,255,0.9)" : "rgba(255,255,255,0.85)"}
                        strokeWidth="1.8" strokeLinecap="round" />
                      <line x1="9" y1="21" x2="15" y2="21"
                        stroke={status === "listening" ? "rgba(51,136,255,0.9)" : "rgba(255,255,255,0.85)"}
                        strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  )}
                </button>
              </div>

              {/* 查看对话历史 - 右边 (常驻) */}
              {onOpenChatPage && (
                <button
                  onClick={onOpenChatPage}
                  className="flex items-center justify-center rounded-full cursor-pointer"
                  style={{
                    width: 44,
                    height: 44,
                    background: "rgba(255,255,255,0.07)",
                    border: "0.8px solid rgba(255,255,255,0.12)",
                  }}
                >
                  {/* 更美观的对话图标 - 两条聊天气泡 */}
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                    {/* 大气泡 */}
                    <path d="M12 3C7.58 3 4 5.92 4 9.5c0 1.7.78 3.2 2 4.5l-2 4.5 4.5-1.5c1.1.5 2.3.5 3.5.5 4.42 0 8-2.92 8-6.5S16.42 3 12 3z" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    {/* 小气泡 */}
                    <circle cx="17" cy="7" r="3" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
