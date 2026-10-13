import { useState, useRef } from 'react';
import { X, UploadCloud, Mic, Square, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import type { SpeechCorpus } from '../types';

interface CustomUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSpeech: SpeechCorpus | null;
  onAnalyzeCustom: (speechId: string, file: File | Blob) => Promise<void>;
  isAnalyzing: boolean;
}

export const CustomUploadModal: React.FC<CustomUploadModalProps> = ({
  isOpen,
  onClose,
  selectedSpeech,
  onAnalyzeCustom,
  isAnalyzing,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !selectedSpeech) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setRecordingBlob(null);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        setRecordingBlob(audioBlob);
        setSelectedFile(null);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordSeconds(0);

      timerRef.current = window.setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Unable to access microphone. Please upload an audio file instead.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleSubmit = async () => {
    const audioPayload = selectedFile || recordingBlob;
    if (!audioPayload) return;
    await onAnalyzeCustom(selectedSpeech.id, audioPayload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-surface-card rounded-2xl border border-border-subtle max-w-lg w-full p-6 relative shadow-2xl space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-surface-elevated transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
            Microphone & File Contrast
          </span>
          <h3 className="text-lg font-bold text-white mt-2">
            Benchmarking Against {selectedSpeech.speaker}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Speak or upload your rendition of the speech transcript to benchmark your delivery against the master gold standard!
          </p>
        </div>

        {/* Target Script Prompt */}
        <div className="p-3.5 rounded-xl bg-surface border border-border-subtle/80 text-xs">
          <span className="font-semibold text-slate-400 block mb-1">Target Script:</span>
          <p className="text-slate-200 italic font-medium leading-relaxed">
            "{selectedSpeech.transcript}"
          </p>
        </div>

        {/* Recording or Upload Area */}
        <div className="space-y-3">
          {/* Record button */}
          <div className="flex flex-col items-center justify-center p-5 rounded-xl bg-surface/70 border border-dashed border-border-subtle text-center">
            {isRecording ? (
              <div className="space-y-3 flex flex-col items-center">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                  <span className="font-mono text-sm font-bold text-rose-400">
                    Recording: {recordSeconds}s
                  </span>
                </div>
                <button
                  onClick={stopRecording}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-rose-600/30 transition-all active:scale-95"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>Stop Recording</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2 flex flex-col items-center">
                <button
                  onClick={startRecording}
                  className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
                >
                  <Mic className="w-5 h-5" />
                </button>
                <span className="text-xs font-semibold text-slate-300">
                  {recordingBlob ? 'Recording Ready! Click to re-record.' : 'Click to Record Microphone'}
                </span>
              </div>
            )}

            {recordingBlob && !isRecording && (
              <div className="mt-3 flex items-center space-x-2 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Recorded clip captured ({recordSeconds}s audio)</span>
              </div>
            )}
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-border-subtle"></div>
            <span className="flex-shrink mx-4 text-slate-500 text-xs uppercase font-mono">
              or upload audio file
            </span>
            <div className="flex-grow border-t border-border-subtle"></div>
          </div>

          {/* File input */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-4 rounded-xl bg-surface/50 border border-border-subtle hover:border-slate-500 hover:bg-surface-elevated/40 cursor-pointer flex items-center justify-center space-x-3 text-xs text-slate-300 transition-colors"
          >
            <UploadCloud className="w-5 h-5 text-indigo-400" />
            <span>
              {selectedFile ? selectedFile.name : 'Choose .WAV or .MP3 audio file'}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border-subtle">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>

          <button
            disabled={(!selectedFile && !recordingBlob) || isAnalyzing}
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Aligning & Scoring...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Run Contrastive Analysis</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
