import { useState, useEffect, useRef, useCallback } from "react";

export interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  setTranscript: (text: string) => void;
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const { lang = "en-IN", continuous = true, interimResults = true } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscriptState] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef<boolean>(false);

  const isSupported =
    typeof window !== "undefined" &&
    !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      let finalStr = "";
      let interimStr = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const text = res[0].transcript;
        if (res.isFinal) {
          finalStr += text;
        } else {
          interimStr += text;
        }
      }

      if (finalStr) {
        setTranscriptState((prev) => (prev ? `${prev} ${finalStr}` : finalStr).trim());
      }
      setInterimTranscript(interimStr);
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition error:", event.error);
      
      // Ignore 'no-speech' error if user intends to keep listening persistently
      if (event.error === "no-speech" && shouldListenRef.current) {
        return;
      }

      setIsListening(false);
      shouldListenRef.current = false;

      switch (event.error) {
        case "not-allowed":
          setError("Microphone permission denied. Please allow microphone access in your browser settings.");
          break;
        case "no-speech":
          setError("No speech detected. Click the microphone to try again.");
          break;
        case "audio-capture":
          setError("No microphone found. Please ensure a microphone is connected.");
          break;
        case "network":
          setError("Network error occurred during speech recognition. Please check your internet connection.");
          break;
        default:
          setError(`Speech recognition error: ${event.error}`);
          break;
      }
    };

    recognition.onend = () => {
      setInterimTranscript("");
      // If user hasn't explicitly stopped, keep listening across silence pauses!
      if (shouldListenRef.current) {
        try {
          recognition.start();
        } catch {
          setIsListening(false);
          shouldListenRef.current = false;
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldListenRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore cleanup abort error
        }
      }
    };
  }, [isSupported, lang, continuous, interimResults]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError("Speech recognition is not supported in this browser. Please type your phrase manually below.");
      return;
    }
    setError(null);
    setInterimTranscript("");
    shouldListenRef.current = true;
    try {
      recognitionRef.current?.start();
    } catch (e: any) {
      try {
        recognitionRef.current?.stop();
        setTimeout(() => {
          if (shouldListenRef.current) recognitionRef.current?.start();
        }, 100);
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
      }
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error("Failed to stop speech recognition:", e);
      }
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscriptState("");
    setInterimTranscript("");
    setError(null);
  }, []);

  const setTranscript = useCallback((text: string) => {
    setTranscriptState(text);
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    setTranscript,
  };
}
