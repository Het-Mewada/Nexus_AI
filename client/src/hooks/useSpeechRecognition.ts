import { useState, useEffect, useRef, useCallback } from "react";
import { aiApi } from "@/services/api";

export interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  preferDeepgram?: boolean;
}

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  isTranscribing: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  provider: "deepgram" | "browser" | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  setTranscript: (text: string) => void;
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const {
    lang = "en-IN",
    continuous = true,
    interimResults = true,
    preferDeepgram = true,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscriptState] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<"deepgram" | "browser" | null>(null);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const shouldListenRef = useRef<boolean>(false);

  const isBrowserSttSupported =
    typeof window !== "undefined" &&
    !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );

  const isMediaRecorderSupported =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    Boolean((window as any).MediaRecorder);


  const isSupported = isMediaRecorderSupported || isBrowserSttSupported;

  // Cleanup helper
  const stopMediaTracks = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  // Transcribe recorded audio blob using Deepgram API
  const sendToDeepgram = useCallback(
    async (audioBlob: Blob) => {
      setIsTranscribing(true);
      try {
        const res = await aiApi.transcribeAudio(audioBlob, lang);
        if (res.success && res.data?.transcript) {
          const dgText = res.data.transcript.trim();
          if (dgText) {
            setTranscriptState((prev) => (prev ? `${prev} ${dgText}` : dgText).trim());
            setProvider("deepgram");
          }
        }
      } catch (err: any) {
        console.warn("Deepgram transcription fallback:", err?.response?.data || err?.message);
        // If Deepgram fails or API key missing, preserve browser STT transcript
        if (!transcript) {
          setError(
            err?.response?.data?.error?.message ||
              "Deepgram transcription error. Displaying browser STT fallback."
          );
        }
      } finally {
        setIsTranscribing(false);
      }
    },
    [lang, transcript]
  );

  useEffect(() => {
    if (!isBrowserSttSupported) return;

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
        setProvider("browser");
      }
      setInterimTranscript(interimStr);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech" && shouldListenRef.current) return;
      if (event.error === "aborted") return;

      console.warn("Browser SpeechRecognition notice:", event.error);
    };

    recognition.onend = () => {
      setInterimTranscript("");
      if (shouldListenRef.current && !preferDeepgram) {
        try {
          recognition.start();
        } catch {
          setIsListening(false);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore cleanup abort
        }
      }
    };
  }, [isBrowserSttSupported, lang, continuous, interimResults, preferDeepgram]);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      setError("Speech recording is not supported in this browser environment.");
      return;
    }

    setError(null);
    setInterimTranscript("");
    shouldListenRef.current = true;
    audioChunksRef.current = [];

    // 1. Start MediaRecorder for Deepgram audio capture
    if (isMediaRecorderSupported && preferDeepgram) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        const options = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? { mimeType: "audio/webm;codecs=opus" }
          : MediaRecorder.isTypeSupported("audio/mp4")
          ? { mimeType: "audio/mp4" }
          : undefined;

        const recorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = async () => {
          stopMediaTracks();
          if (audioChunksRef.current.length > 0) {
            const mimeType = recorder.mimeType || "audio/webm";
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
            await sendToDeepgram(audioBlob);
          }
        };

        recorder.start(500); // Collect audio chunks every 500ms
        setIsListening(true);
      } catch (err: any) {
        console.warn("Microphone access error for MediaRecorder:", err);
        setError("Microphone permission denied. Please allow microphone access.");
        shouldListenRef.current = false;
        return;
      }
    }

    // 2. Start Browser Web Speech for live preview simultaneously
    if (isBrowserSttSupported && recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // already started or minor error
      }
    }
  }, [isSupported, isMediaRecorderSupported, preferDeepgram, isBrowserSttSupported, sendToDeepgram, stopMediaTracks]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    setIsListening(false);

    // Stop MediaRecorder (triggers sendToDeepgram onstop)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error("Error stopping MediaRecorder:", err);
      }
    } else {
      stopMediaTracks();
    }

    // Stop Browser Recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
  }, [stopMediaTracks]);

  const resetTranscript = useCallback(() => {
    setTranscriptState("");
    setInterimTranscript("");
    setError(null);
    setProvider(null);
  }, []);

  const setTranscript = useCallback((text: string) => {
    setTranscriptState(text);
  }, []);

  return {
    isSupported,
    isListening,
    isTranscribing,
    transcript,
    interimTranscript,
    error,
    provider,
    startListening,
    stopListening,
    resetTranscript,
    setTranscript,
  };
}
