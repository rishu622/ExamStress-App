import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Mic, ShieldCheck, AlertTriangle, Play, Pause, Upload, Clock3, CheckCircle2, Sparkles, BrainCircuit, ChevronRight, FileAudio, ArrowRightLeft } from 'lucide-react';

type ConsentState = 'pending' | 'accepted' | 'declined';
type AnalysisLabel = 'Stable' | 'Small Change' | 'Notable Change';
type SupportTier = 'Stable Trend' | 'Mild Change' | 'Review Suggested' | 'Priority Human Review';

type VoiceInsight = {
  supportIndex: number;
  confidence: number;
  confidenceLabel: 'Low' | 'Moderate' | 'High';
  label: AnalysisLabel;
  trend: 'stable' | 'slight change' | 'notable change';
  recommendation: string;
  explanation: string[];
  features: {
    pitch: number;
    speechRate: number;
    pauseDuration: number;
    energy: number;
  };
};

type AudioMetrics = {
  durationSeconds: number;
  pitchHz: number;
  speechRate: number;
  pauseDuration: number;
  silenceRatio: number;
  energy: number;
  confidence: number;
};

type VoiceAnalysisApiResponse = {
  recording_id?: string;
  analysis_id?: string;
  student_id?: string;
  support_index?: number;
  overall_score?: number;
  semantic_score?: number;
  confidence?: number;
  confidence_label?: VoiceInsight['confidenceLabel'];
  risk_category?: 'Low' | 'Moderate' | 'High';
  trend?: VoiceInsight['trend'];
  baseline_status?: string;
  recommendation?: string;
  transcript_text?: string;
  prompt_text?: string;
  semantic_indicators?: string[];
  explanation?: string[] | string;
  features?: {
    pitch_mean?: number;
    pitch?: number;
    speech_rate?: number;
    pause_duration?: number;
    energy?: number;
  };
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const confidenceLabelFor = (confidence: number): VoiceInsight['confidenceLabel'] => {
  if (confidence < 0.66) return 'Low';
  if (confidence < 0.82) return 'Moderate';
  return 'High';
};

const estimatePitchHz = (samples: Float32Array, sampleRate: number) => {
  const minLag = Math.floor(sampleRate / 300);
  const maxLag = Math.floor(sampleRate / 75);
  let bestLag = 0;
  let bestScore = 0;

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let score = 0;
    for (let i = 0; i < samples.length - lag; i += 1) {
      score += samples[i] * samples[i + lag];
    }

    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }

  if (!bestLag || bestScore <= 0) {
    return 120;
  }

  return clamp(sampleRate / bestLag, 85, 255);
};

const analyzeAudioBuffer = (audioBuffer: AudioBuffer): AudioMetrics => {
  const sampleRate = audioBuffer.sampleRate;
  const channels = audioBuffer.numberOfChannels;
  const frameSize = 2048;
  const hopSize = 512;

  const mixedSamples = new Float32Array(audioBuffer.length);
  for (let channelIndex = 0; channelIndex < channels; channelIndex += 1) {
    const channel = audioBuffer.getChannelData(channelIndex);
    for (let sampleIndex = 0; sampleIndex < channel.length; sampleIndex += 1) {
      mixedSamples[sampleIndex] += channel[sampleIndex] / channels;
    }
  }

  let rmsSum = 0;
  let peak = 0;
  let frameCount = 0;
  let silentFrames = 0;
  let voicedSegments = 0;
  let pauseSegments: number[] = [];
  let currentPause = 0;
  let inVoice = false;
  let loudestFrameStart = 0;
  let loudestFrameRms = 0;

  for (let offset = 0; offset < mixedSamples.length; offset += hopSize) {
    const end = Math.min(offset + frameSize, mixedSamples.length);
    if (end <= offset) break;

    let frameEnergy = 0;
    let framePeak = 0;
    for (let sampleIndex = offset; sampleIndex < end; sampleIndex += 1) {
      const value = mixedSamples[sampleIndex];
      frameEnergy += value * value;
      framePeak = Math.max(framePeak, Math.abs(value));
    }

    const frameLength = end - offset;
    const frameRms = Math.sqrt(frameEnergy / frameLength);
    rmsSum += frameRms;
    peak = Math.max(peak, framePeak);
    frameCount += 1;

    if (frameRms > loudestFrameRms) {
      loudestFrameRms = frameRms;
      loudestFrameStart = offset;
    }

    const isSilent = frameRms < 0.018;
    if (isSilent) {
      silentFrames += 1;
      currentPause += hopSize;
      inVoice = false;
    } else {
      if (!inVoice) {
        voicedSegments += 1;
        if (currentPause > 0) {
          pauseSegments.push(currentPause);
          currentPause = 0;
        }
        inVoice = true;
      }
    }
  }

  if (currentPause > 0) {
    pauseSegments.push(currentPause);
  }

  const meanRms = frameCount > 0 ? rmsSum / frameCount : 0;
  const silenceRatio = frameCount > 0 ? silentFrames / frameCount : 0;
  const averagePauseSamples = pauseSegments.length > 0 ? pauseSegments.reduce((sum, value) => sum + value, 0) / pauseSegments.length : silenceRatio * audioBuffer.length;
  const averagePause = (averagePauseSamples / sampleRate) * 1000;
  const estimatedSpeechRate = clamp(72 + (voicedSegments * 12) + ((1 - silenceRatio) * 24) - (averagePause / 60), 72, 180);

  const pitchWindow = mixedSamples.slice(loudestFrameStart, Math.min(loudestFrameStart + 4096, mixedSamples.length));
  const pitchHz = estimatePitchHz(pitchWindow.length > 128 ? pitchWindow : mixedSamples.slice(0, Math.min(4096, mixedSamples.length)), sampleRate);
  const energy = 20 * Math.log10(meanRms + 1e-6);

  const signalConfidence = clamp(0.35 + (audioBuffer.duration / 90) + (peak * 0.25) + ((1 - silenceRatio) * 0.2), 0.35, 0.94);

  return {
    durationSeconds: audioBuffer.duration,
    pitchHz,
    speechRate: estimatedSpeechRate,
    pauseDuration: averagePause,
    silenceRatio,
    energy,
    confidence: signalConfidence,
  };
};

const buildInsightFromMetrics = (metrics: AudioMetrics, prompt: string, responseText: string): VoiceInsight => {
  const pausePressure = clamp((metrics.pauseDuration - 220) / 18, 0, 35);
  const silencePressure = clamp((metrics.silenceRatio - 0.18) * 120, 0, 25);
  const energyPressure = clamp((-20 - metrics.energy) * 1.35, 0, 20);
  const speechPressure = clamp((115 - metrics.speechRate) * 0.45, 0, 20);
  const supportIndex = Math.round(clamp(pausePressure + silencePressure + energyPressure + speechPressure, 0, 100));

  const label: AnalysisLabel = supportIndex <= 25 ? 'Stable' : supportIndex <= 50 ? 'Small Change' : 'Notable Change';
  const trend: VoiceInsight['trend'] = supportIndex <= 25 ? 'stable' : supportIndex <= 50 ? 'slight change' : 'notable change';
  const confidence = clamp(metrics.confidence + (metrics.durationSeconds >= 18 ? 0.1 : 0) + (metrics.durationSeconds >= 35 ? 0.05 : 0), 0.52, 0.95);

  const explanation: string[] = [];
  if (metrics.pauseDuration >= 650) {
    explanation.push('The recording contains long pauses and uneven pacing, which can show hesitation or difficulty organizing thoughts.');
  }
  if (metrics.speechRate <= 98) {
    explanation.push('Speech rate is slower than expected, which often aligns with fatigue, low energy, or feeling overwhelmed.');
  }
  if (metrics.energy <= -27) {
    explanation.push('Voice energy is lower than typical, which may indicate low mood or reduced engagement.');
  }
  if (metrics.silenceRatio >= 0.34) {
    explanation.push('There are more silent gaps than usual, so the response sounds less fluid and more tentative.');
  }
  if (explanation.length === 0) {
    explanation.push('The audio sounds broadly stable, with no strong stress markers in pacing or energy.');
    explanation.push('The response matches a relatively even speaking pattern for the selected prompt.');
  }

  if (prompt) {
    explanation.unshift(`Prompt context: ${prompt}`);
  }

  if (responseText) {
    explanation.unshift(`Captured response: ${responseText}`);
  }

  const recommendation =
    supportIndex <= 25
      ? 'Keep using the check-in to track your baseline over time.'
      : supportIndex <= 50
        ? 'A brief counselor or mentor check-in could help verify whether this is situational.'
        : supportIndex <= 75
          ? 'Supportive counselor check-in recommended to review the recording context.'
          : 'Priority human review recommended to follow up on the recording quickly.';

  return {
    supportIndex,
    confidence,
    confidenceLabel: confidenceLabelFor(confidence),
    label,
    trend,
    recommendation,
    explanation: explanation.slice(0, 3),
    features: {
      pitch: Math.round(metrics.pitchHz),
      speechRate: Math.round(metrics.speechRate),
      pauseDuration: Math.round(metrics.pauseDuration),
      energy: Number(metrics.energy.toFixed(1)),
    }
  };
};

const analyzeAudioFile = async (file: File, prompt: string, responseText: string): Promise<VoiceInsight> => {
  const arrayBuffer = await file.arrayBuffer();
  const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) {
    throw new Error('Audio analysis is not supported in this browser.');
  }

  const audioContext = new AudioContextCtor();

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const metrics = analyzeAudioBuffer(audioBuffer);
    return buildInsightFromMetrics(metrics, prompt, responseText);
  } finally {
    await audioContext.close().catch(() => undefined);
  }
};

const mapApiResponseToInsight = (payload: VoiceAnalysisApiResponse, prompt: string, responseText: string): VoiceInsight => {
  const confidence = payload.confidence ?? 0.82;
  const supportIndex = payload.overall_score ?? payload.support_index ?? 68;
  const explanation = Array.isArray(payload.explanation)
    ? payload.explanation.filter(Boolean).map(item => String(item))
    : payload.explanation
      ? String(payload.explanation).split(';').map(item => item.trim()).filter(Boolean)
      : [];

  if (payload.prompt_text || prompt) {
    explanation.unshift(`Prompt context: ${payload.prompt_text ?? prompt}`);
  }
  if (payload.transcript_text || responseText) {
    explanation.unshift(`Transcript: ${payload.transcript_text ?? responseText}`);
  }
  if (payload.semantic_indicators?.length) {
    explanation.push(`Semantic cues: ${payload.semantic_indicators.join(', ')}`);
  }

  return {
    supportIndex,
    confidence,
    confidenceLabel: payload.confidence_label ?? confidenceLabelFor(confidence),
    label: supportIndex <= 25 ? 'Stable' : supportIndex <= 50 ? 'Small Change' : 'Notable Change',
    trend: payload.trend ?? (supportIndex <= 25 ? 'stable' : supportIndex <= 50 ? 'slight change' : 'notable change'),
    recommendation: payload.recommendation ?? 'Supportive counselor check-in recommended.',
    explanation: explanation.slice(0, 3),
    features: {
      pitch: Math.round(payload.features?.pitch_mean ?? payload.features?.pitch ?? 118),
      speechRate: Math.round(payload.features?.speech_rate ?? 104),
      pauseDuration: Math.round(payload.features?.pause_duration ?? 620),
      energy: Number((payload.features?.energy ?? -24.2).toFixed(1)),
    },
  };
};

const defaultInsight: VoiceInsight = {
  supportIndex: 68,
  confidence: 0.81,
  confidenceLabel: 'Moderate',
  label: 'Notable Change',
  trend: 'notable change',
  recommendation: 'Supportive counselor check-in recommended.',
  explanation: [
    'Speech rate is lower than the student\'s recent personal baseline.',
    'Average pause duration has increased and linguistic engagement is reduced.',
    'Recent responses show a gradual change from the student\'s own pattern over the last 2–4 weeks.'
  ],
  features: {
    pitch: 118,
    speechRate: 104,
    pauseDuration: 620,
    energy: -24.2,
  }
};

const promptOptions = [
  'How are you feeling this morning?',
  'Tell me one thing you are looking forward to today.',
  'How was your sleep last night?',
  'Describe your day in your own words.',
  'Is there anything bothering you today?'
];

export const VoiceSensePage: React.FC = () => {
  const [consent, setConsent] = useState<ConsentState>('pending');
  const [selectedPrompt, setSelectedPrompt] = useState(promptOptions[0]);
  const [spokenResponse, setSpokenResponse] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [insight, setInsight] = useState<VoiceInsight>(defaultInsight);
  const [savedClips, setSavedClips] = useState<string[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);

  const analyzeVoiceNote = async (file: File): Promise<VoiceInsight> => {
    const formData = new FormData();
    formData.append('student_id', 'demo-student');
    formData.append('prompt_text', selectedPrompt);
    formData.append('transcript_text', spokenResponse.trim());
    formData.append('consent_version', 'v1');
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/voice/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Backend analysis failed with status ${response.status}`);
    }

    const payload = (await response.json()) as VoiceAnalysisApiResponse;
    return mapApiResponseToInsight(payload, selectedPrompt, spokenResponse.trim());
  };

  const consentText = useMemo(() => (
    'VoiceSense uses your voice recording to extract speech and language features that may help identify changes in your wellbeing patterns. This is a decision-support tool, not a diagnosis. Raw audio is retained only for the configured retention period and derived features are stored for trend analysis. Participation is voluntary and you may withdraw consent at any time.'
  ), []);

  const handleConsent = (accepted: boolean) => {
    setConsent(accepted ? 'accepted' : 'declined');
  };

  const stopRecording = () => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (stopTimerRef.current) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }

    setIsRecording(false);
  };

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
      if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleRecordingStart = async () => {
    if (consent !== 'accepted') return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setInsight(defaultInsight);
      alert('Microphone recording is not supported in this browser. Use audio upload instead.');
      return;
    }

    setIsRecording(true);
    setHasRecorded(false);
    setRecordingSeconds(0);
    recordedChunksRef.current = [];

    const timer = window.setInterval(() => {
      setRecordingSeconds(prev => prev + 1);
    }, 1000);
    recordingTimerRef.current = timer;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = event => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const clip = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const clipFile = new File([clip], `voice-check-in-${Date.now()}.webm`, { type: clip.type || 'audio/webm' });

        setIsProcessing(true);
        setHasRecorded(true);
        setSavedClips(prev => [clipFile.name, ...prev].slice(0, 5));

        try {
          const nextInsight = await analyzeVoiceNote(clipFile);
          setInsight(nextInsight);
        } catch {
          try {
            const fallbackInsight = await analyzeAudioFile(clipFile, selectedPrompt, spokenResponse.trim());
            setInsight(fallbackInsight);
          } catch {
            setInsight({
              ...defaultInsight,
              recommendation: 'The browser could not analyze this recording. Try a clear WAV, MP3, or M4A upload instead.',
              explanation: [
                'The live recording could not be decoded after capture.',
                'Try a quieter room, a clearer microphone, or a supported uploaded file.',
                'A cleaner recording improves the reliability of the wellbeing signal.'
              ]
            });
          }
        } finally {
          setIsProcessing(false);
          if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach(track => track.stop());
            audioStreamRef.current = null;
          }
        }
      };

      recorder.start();
      stopTimerRef.current = window.setTimeout(() => {
        stopRecording();
      }, 18000);
    } catch {
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setIsRecording(false);
      setIsProcessing(false);
      alert('Microphone access was denied or is unavailable. Use audio upload instead.');
    }
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.includes('audio')) {
      alert('Unsupported file type. Please upload a WAV, MP3, or M4A audio file.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      alert('Audio file is too large. Please upload a file under 20 MB.');
      return;
    }

    setSavedClips(prev => [file.name, ...prev].slice(0, 5));
    setIsProcessing(true);
    setHasRecorded(true);

    analyzeVoiceNote(file)
      .then(nextInsight => {
        setInsight(nextInsight);
      })
      .catch(async () => {
        try {
          const fallbackInsight = await analyzeAudioFile(file, selectedPrompt, spokenResponse.trim());
          setInsight(fallbackInsight);
        } catch {
          setInsight({
            ...defaultInsight,
            recommendation: 'The browser could not analyze this file. Try a standard WAV, MP3, or M4A recording with clearer speech.',
            explanation: [
              'The audio file could not be decoded in the browser.',
              'Try uploading a standard speech recording with fewer artifacts or a different supported format.',
              'A clearer recording usually produces a more reliable wellbeing signal.'
            ]
          });
        }
      })
      .finally(() => {
        window.setTimeout(() => {
          setIsProcessing(false);
        }, 250);
      });

    event.target.value = '';
  };

  const supportTier: SupportTier =
    insight.supportIndex <= 25
      ? 'Stable Trend'
      : insight.supportIndex <= 50
        ? 'Mild Change'
        : insight.supportIndex <= 75
          ? 'Review Suggested'
          : 'Priority Human Review';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">VoiceSense AI</h1>
              <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-blue-100 text-brand-blue dark:bg-blue-950 dark:text-blue-300">MVP / AI Decision Support</span>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Your private daily wellbeing check-in</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>VoiceSense provides wellbeing indicators, not medical diagnoses.</span>
          </div>
        </div>
      </div>

      {consent === 'pending' && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-brand-blue flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Before you continue</p>
                <h2 className="text-2xl font-bold">Consent to VoiceSense AI</h2>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-6">{consentText}</p>

            <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-800/70 p-4 text-sm text-slate-200">
              <ul className="space-y-2">
                <li>• What data is collected: voice, speech timing, language patterns, and derived wellbeing indicators.</li>
                <li>• Why it is collected: to support personal baseline tracking and counselor review.</li>
                <li>• Retention: raw audio is retained only for the configured retention policy; derived features remain for trend analysis.</li>
                <li>• Access: only authorized student, counselor, and admin roles can access the relevant data.</li>
                <li>• Voluntary use: participation is optional, and consent can be withdrawn at any time.</li>
                <li>• Limits: the system does not diagnose mental illness and is not a medical assessment.</li>
              </ul>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => handleConsent(false)} className="px-4 py-2 rounded-xl border border-slate-600 text-slate-200 hover:bg-slate-800">Cancel</button>
              <button onClick={() => handleConsent(true)} className="px-5 py-2 rounded-xl bg-brand-blue text-white font-semibold hover:bg-blue-600">Agree & Continue</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
              <Mic className="w-5 h-5 text-brand-blue" /> Daily Voice Check-In
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">How are you feeling today?</p>

            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
                <label className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Prompt</label>
                <select
                  value={selectedPrompt}
                  onChange={e => setSelectedPrompt(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
                  disabled={consent !== 'accepted'}
                >
                  {promptOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <label className="mt-3 block text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Optional reference text</label>
                <textarea
                  value={spokenResponse}
                  onChange={e => setSpokenResponse(e.target.value)}
                  placeholder="Optional: type the expected response or add notes. Whisper will transcribe the audio automatically."
                  rows={4}
                  className="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
                  disabled={consent !== 'accepted'}
                />
              </div>

              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-6 text-center">
                {isRecording ? (
                  <div className="space-y-3">
                    <div className="mx-auto h-20 w-20 rounded-full bg-rose-500/15 flex items-center justify-center animate-pulse">
                      <Mic className="w-10 h-10 text-rose-500" />
                    </div>
                    <div className="text-sm font-mono text-rose-500">Recording... {recordingSeconds}s</div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-rose-500 to-orange-400" style={{ width: `${Math.min((recordingSeconds / 60) * 100, 100)}%` }} />
                    </div>
                    <button onClick={stopRecording} className="px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold">Stop Recording</button>
                  </div>
                ) : isProcessing ? (
                  <div className="space-y-3">
                    <div className="mx-auto h-16 w-16 rounded-full border-4 border-brand-blue border-t-transparent animate-spin" />
                    <div className="text-base font-semibold text-slate-800 dark:text-slate-100">Analyzing your recording...</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Processing voice activity, acoustic features, and trend comparison.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="mx-auto h-20 w-20 rounded-full bg-blue-500/10 flex items-center justify-center text-brand-blue">
                      <Mic className="w-10 h-10" />
                    </div>
                    <button
                      onClick={handleRecordingStart}
                      disabled={consent !== 'accepted'}
                      className="px-5 py-3 rounded-xl bg-brand-blue text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Start Recording
                    </button>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Recommended: 20–60 seconds. Minimum approximately 10 seconds.</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-center">
                  <label className="w-full cursor-pointer rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 py-3 text-sm font-semibold flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4 text-brand-blue" />
                    Upload audio file
                    <input type="file" accept="audio/wav,audio/mpeg,audio/mp4,audio/x-m4a" className="hidden" onChange={handleUpload} />
                  </label>
                </div>
                {savedClips.length > 0 && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-2">Saved clips</div>
                    <div className="space-y-2">
                      {savedClips.map(clip => (
                        <div key={clip} className="flex items-center justify-between rounded-lg bg-white dark:bg-slate-900 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200">
                          <span className="truncate">{clip}</span>
                          <FileAudio className="w-3.5 h-3.5 text-brand-blue" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Voice profile</p>
                  <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">Your recent signal</h3>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                {supportTier}
              </div>
            </div>

            <div className="grid grid-cols-[140px_1fr] gap-4 items-center rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-4">
              <div className="relative mx-auto h-28 w-28">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                  <circle cx="60" cy="60" r="48" stroke="rgba(148,163,184,.25)" strokeWidth="10" fill="none" />
                  <circle cx="60" cy="60" r="48" stroke="url(#scoreGradient)" strokeWidth="10" strokeLinecap="round" fill="none" strokeDasharray="301.6" strokeDashoffset={301.6 - (301.6 * insight.supportIndex) / 100} />
                  <defs>
                    <linearGradient id="scoreGradient" x1="0%" x2="100%" y1="0%" y2="0%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{insight.supportIndex}</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Support Index</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">AI confidence</span>
                  <span className="rounded-full bg-blue-100 dark:bg-blue-950 text-brand-blue px-2 py-1 text-[10px] font-bold">{insight.confidenceLabel}</span>
                </div>
                <div className="text-sm text-slate-700 dark:text-slate-200 leading-7">
                  {insight.explanation.map(item => (
                    <div key={item} className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-brand-blue" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-700 dark:text-amber-300">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="w-4 h-4" />
                    AI-generated wellbeing indicator. This is not a medical diagnosis. Counselor judgment is required.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4">
              <FeatureCard label="Pitch" current={insight.features.pitch} unit="Hz" baseline={180} />
              <FeatureCard label="Speech Rate" current={insight.features.speechRate} unit="WPM" baseline={145} />
              <FeatureCard label="Pause Duration" current={insight.features.pauseDuration} unit="ms" baseline={250} />
              <FeatureCard label="Voice Energy" current={insight.features.energy} unit="dB" baseline={-18} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Your Voice Trend</h3>
              <div className="text-xs uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">{insight.label}</div>
            </div>

            <div className="grid grid-cols-7 gap-2 items-end h-32 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
              {[42, 45, 47, 53, 61, 65, 68].map((value, idx) => (
                <div key={value + idx} className="flex flex-col items-center justify-end h-full">
                  <div className="w-full rounded-t-xl bg-gradient-to-t from-brand-blue to-cyan-400" style={{ height: `${value}%` }} />
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">D{idx + 1}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface FeatureCardProps {
  label: string;
  current: number;
  unit: string;
  baseline: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ label, current, unit, baseline }) => {
  const delta = Math.round(((current - baseline) / Math.max(1, baseline)) * 100);
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        <span>{label}</span>
        <Activity className="w-3.5 h-3.5 text-brand-blue" />
      </div>
      <div className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">{current}</div>
      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Baseline: {baseline} {unit}</div>
      <div className={`mt-2 text-xs font-semibold ${delta <= 0 ? 'text-emerald-500' : 'text-amber-500'}`}>{delta > 0 ? '+' : ''}{delta}%</div>
    </div>
  );
};
