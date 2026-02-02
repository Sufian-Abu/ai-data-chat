"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onFinalText: (text: string) => void;
  onPartialText?: (text: string) => void;
  disabled?: boolean;
};

export default function VoiceButton({ onFinalText, onPartialText, disabled }: Props) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const w = window as any;
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    setSupported(Boolean(SpeechRecognition));
  }, []);

  function start() {
    if (disabled) return;

    const w = window as any;
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    recRef.current = rec;

    rec.lang = "en-US"; // change if you want bn-BD
    rec.continuous = false;
    rec.interimResults = true;

    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);

    rec.onerror = () => setListening(false);

    rec.onresult = (event: any) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const txt = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += txt;
        else interim += txt;
      }

      if (interim && onPartialText) onPartialText(interim.trim());
      if (final) onFinalText(final.trim());
    };

    rec.start();
  }

  function stop() {
    try {
      recRef.current?.stop?.();
    } catch {}
  }

  if (!supported) {
    return (
      <button type="button" disabled style={btnStyle(true)}>
        🎙️ Not supported
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      disabled={disabled}
      style={btnStyle(disabled)}
      title={listening ? "Stop recording" : "Start voice input"}
    >
      {listening ? "⏹ Stop" : "🎙 Voice"}
    </button>
  );
}

function btnStyle(disabled?: boolean) {
  return {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ddd",
    background: disabled ? "#f5f5f5" : "white",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 700 as const,
    whiteSpace: "nowrap" as const,
  };
}