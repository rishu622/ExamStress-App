import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { MOCK_VOICE_SAMPLES } from '../mock/mockData';
import { VoiceSample } from '../types';
import { RiskBadge } from '../components/common/RiskBadge';
import { RiskScoreRing } from '../components/common/RiskScoreRing';
import {
  Mic,
  Square,
  Upload,
  Play,
  Volume2,
  Sparkles,
  Zap,
  Clock,
  Activity,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';

export const SimulatorPage: React.FC = () => {
  const { activeVoiceSample, setActiveVoiceSample } = useApp();

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [compareMode, setCompareMode] = useState(false);

  // Custom analysis state for recorded or uploaded audio
  const [currentAnalysis, setCurrentAnalysis] = useState<VoiceSample | null>(activeVoiceSample);

  const timerRef = useRef<number | null>(null);

  // Synchronize when active sample changes
  useEffect(() => {
    if (activeVoiceSample) {
      setCurrentAnalysis(activeVoiceSample);
    }
  }, [activeVoiceSample]);

  // Handle simulated voice recording timer
  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    timerRef.current = window.setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const handleStopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setIsAnalyzing(true);

    // Simulate AI voice analysis processing delay (1.5 seconds)
    setTimeout(() => {
      setIsAnalyzing(false);
      // Create a fresh analysis result simulating user's voice input
      const simulatedResult: VoiceSample = {
        id: `recorded-${Date.now()}`,
        title: 'Your Recorded Attendance Call',
        studentName: 'Student Live Audio Input',
        riskScore: 32,
        zone: 'orange',
        pitchHz: 138,
        speechRateWpm: 104,
        pauseDurationMs: 640,
        energyDb: -28.4,
        sentiment: 'Low Energy / Hesitant',
        transcript: 'Present ma\'am... I think I am present...',
        description: 'Analyzed from live microphone stream: 640ms response latency detected with reduced pitch dynamics.',
      };
      setCurrentAnalysis(simulatedResult);
    }, 1500);
  };

  const handleSelectSample = (sample: VoiceSample) => {
    setIsAnalyzing(true);
    setActiveVoiceSample(sample);
    setTimeout(() => {
      setIsAnalyzing(false);
      setCurrentAnalysis(sample);
    }, 600);
  };

  const healthyBaseline = MOCK_VOICE_SAMPLES[0]; // Healthy Rahul

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Attendance Voice AI Simulator & Biomarker Extractor
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-100 text-brand-blue dark:bg-blue-950 dark:text-blue-300 rounded-full font-mono">
              MVP Demo Studio
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Simulate daily morning school attendance calls ("Present, ma'am"). Upload audio, record live, or select pre-loaded student voice profiles to observe real-time acoustic feature extraction.
          </p>
        </div>

        <button
          onClick={() => setCompareMode(!compareMode)}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-2 border ${
            compareMode
              ? 'bg-brand-blue text-white border-brand-blue shadow-md'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>{compareMode ? 'Exit Comparison Mode' : 'Side-by-Side Comparison'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (4 cols): Recording & Upload + Sample Library */}
        <div className="lg:col-span-4 space-y-6">
          {/* Audio Input Box */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Mic className="w-5 h-5 text-brand-blue" /> Live Audio Capture
            </h3>

            {/* Recording Area */}
            <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-dashed border-slate-200 dark:border-slate-700 text-center space-y-3 relative overflow-hidden">
              {isRecording && (
                <div className="absolute inset-0 bg-rose-50/80 dark:bg-rose-950/40 backdrop-blur-xs flex items-center justify-center flex-col gap-2 z-10">
                  <div className="w-16 h-16 rounded-full bg-rose-500 text-white flex items-center justify-center recording-pulse">
                    <Mic className="w-8 h-8" />
                  </div>
                  <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                    Recording... 0:0{recordingTime}s
                  </span>
                  <span className="text-[10px] text-slate-500">Say: "Present, ma'am!"</span>
                  <button
                    onClick={handleStopRecording}
                    className="mt-2 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" /> Stop & Analyze
                  </button>
                </div>
              )}

              <button
                onClick={handleStartRecording}
                className="w-16 h-16 rounded-full bg-brand-blue text-white shadow-lg shadow-brand-blue/30 hover:scale-105 transition flex items-center justify-center"
              >
                <Mic className="w-7 h-7" />
              </button>

              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Click to Record Attendance Response
                </span>
                <span className="text-[11px] text-slate-400">Simulates 2-3 second morning check-in</span>
              </div>
            </div>

            {/* Or Drag & Drop Upload */}
            <div className="relative">
              <input type="file" accept="audio/*" className="hidden" id="audio-file-input" />
              <label
                htmlFor="audio-file-input"
                className="flex items-center justify-center gap-2 p-3 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl cursor-pointer transition"
              >
                <Upload className="w-4 h-4 text-brand-blue" />
                <span>Upload .WAV or .MP3 Audio File</span>
              </label>
            </div>
          </div>

          {/* Sample Voice Library Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-brand-blue" /> 1-Click Voice Sample Library
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select pre-recorded benchmark voices to test AI acoustic extraction:
            </p>

            <div className="space-y-2 pt-1">
              {MOCK_VOICE_SAMPLES.map(sample => (
                <button
                  key={sample.id}
                  onClick={() => handleSelectSample(sample)}
                  className={`w-full p-3 rounded-2xl border text-left transition flex items-center justify-between ${
                    currentAnalysis?.id === sample.id
                      ? 'bg-blue-50/70 dark:bg-slate-800 border-brand-blue ring-2 ring-brand-blue/30 shadow-xs'
                      : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">{sample.title}</span>
                      <RiskBadge zone={sample.zone} score={sample.riskScore} size="sm" />
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1">"{sample.transcript}"</p>
                  </div>
                  <Play className="w-4 h-4 text-brand-blue shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (8 cols): Real-Time Analysis Display */}
        <div className="lg:col-span-8 space-y-6">
          {isAnalyzing ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center text-center space-y-4">
              <RefreshCw className="w-10 h-10 text-brand-blue animate-spin" />
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  Extracting Acoustic Biomarkers...
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Computing pitch variability, response latency, spectrogram power, and absolutist language frequency.
                </p>
              </div>
            </div>
          ) : currentAnalysis ? (
            <div className="space-y-6">
              {/* Computed Risk Score Ring & Zone Card */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center gap-6">
                <RiskScoreRing score={currentAnalysis.riskScore} size={150} strokeWidth={14} zone={currentAnalysis.zone} />

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="text-xs font-mono uppercase text-slate-400 font-semibold">Voice Profile:</span>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">{currentAnalysis.title}</h3>
                  </div>

                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <RiskBadge zone={currentAnalysis.zone} score={currentAnalysis.riskScore} size="lg" />
                    <span className="text-xs font-semibold text-slate-500">
                      ({currentAnalysis.sentiment})
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    {currentAnalysis.description}
                  </p>
                </div>
              </div>

              {/* 5 Extracted Acoustic Biomarker Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* 1. Pitch (Hz) */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                    <Activity className="w-3.5 h-3.5 text-blue-500" /> Pitch (Fundamental)
                  </div>
                  <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-white block">
                    {currentAnalysis.pitchHz} Hz
                  </span>
                  <span className="text-[10px] text-slate-500">Normal Range: 180-240 Hz</span>
                </div>

                {/* 2. Speech Rate */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                    <Zap className="w-3.5 h-3.5 text-amber-500" /> Speech Rate
                  </div>
                  <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-white block">
                    {currentAnalysis.speechRateWpm} WPM
                  </span>
                  <span className="text-[10px] text-slate-500">Normal Range: 130-160 WPM</span>
                </div>

                {/* 3. Pause Duration */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-rose-500" /> Pause Latency
                  </div>
                  <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-white block">
                    {currentAnalysis.pauseDurationMs} ms
                  </span>
                  <span className="text-[10px] text-slate-500">Baseline Target: &lt; 250 ms</span>
                </div>

                {/* 4. Energy Level */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                    <Volume2 className="w-3.5 h-3.5 text-emerald-500" /> Acoustic Energy
                  </div>
                  <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-white block">
                    {currentAnalysis.energyDb} dB
                  </span>
                  <span className="text-[10px] text-slate-500">Normalized power</span>
                </div>
              </div>

              {/* Side by side comparison view if activated */}
              {compareMode && (
                <div className="p-6 bg-slate-900 text-white rounded-3xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="font-bold text-sm text-brand-mint flex items-center gap-2">
                      <ArrowRightLeft className="w-4 h-4" /> Healthy Baseline vs Current Voice Acoustic Comparison
                    </h4>
                    <span className="text-xs text-slate-400 font-mono">Side-by-Side Analysis</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div className="p-3 bg-slate-800/80 rounded-xl space-y-2">
                      <span className="text-emerald-400 font-bold block">HEALTHY BASELINE (Rahul)</span>
                      <p>• Pitch Range: 195 Hz</p>
                      <p>• Speech Speed: 148 WPM</p>
                      <p>• Response Latency: 160 ms</p>
                      <p>• Absolutist Diction: 0%</p>
                    </div>

                    <div className="p-3 bg-slate-800/80 rounded-xl space-y-2 border border-rose-500/40">
                      <span className="text-rose-400 font-bold block">CURRENT SAMPLE ({currentAnalysis.title})</span>
                      <p>• Pitch Range: {currentAnalysis.pitchHz} Hz</p>
                      <p>• Speech Speed: {currentAnalysis.speechRateWpm} WPM</p>
                      <p>• Response Latency: {currentAnalysis.pauseDurationMs} ms</p>
                      <p>• Risk Score: {currentAnalysis.riskScore}/100</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
