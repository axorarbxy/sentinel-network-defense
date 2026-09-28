import React, { useState, useEffect, useRef } from 'react';
import { useSentinelStore } from '../store/useSentinelStore';
import { API_BASE_URL } from '../config/endpoints';
import { normalizeStateUpdate } from '../services/websocket';
import type { StateUpdate } from '../types/sentinel';
import { NetworkTwin } from '../components/NetworkTwin';
import { KillChainRail } from '../components/KillChainRail';
import { NodeDeepDivePanel } from '../components/NodeDeepDivePanel';
import { EdgeDetailPopover } from '../components/EdgeDetailPopover';
import { ModeSwitch } from '../components/ModeSwitch';
import { ShapExplainabilityStrip } from '../components/ShapExplainabilityStrip';
import {
  UploadCloud,
  FileCheck,
  AlertTriangle,
  ShieldCheck,
  Loader2,
  Lock,
  Cpu,
  Server,
  ArrowRight,
  Info,
  RefreshCw,
} from 'lucide-react';

interface JobSummary {
  verdict: string;
  verdict_level: 'critical' | 'elevated' | 'moderate' | 'low';
  total_flows: number;
  total_hosts: number;
  filename: string;
  file_size_bytes: number;
  time_range: string;
  top_risk_hosts: Array<{
    id: string;
    label: string;
    role: string;
    risk_score: number;
    mitre_stage: string;
  }>;
  missing_features: string[];
  missing_features_notice: string | null;
}

interface AnalysisReport {
  summary: JobSummary;
  state_update: StateUpdate;
}

export const Analyze: React.FC = () => {
  const { setStateUpdate, isForecastMode } = useSentinelStore();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null); // 'queued' | 'extracting_features' | 'running_inference' | 'done' | 'failed'
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [report, setReport] = useState<AnalysisReport | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const getAuthToken = () => {
    return localStorage.getItem('sentinel_auth_token') || 'sentinel-proto-token-2026';
  };

  // Poll job status until done or failed
  useEffect(() => {
    if (!jobId || jobStatus === 'done' || jobStatus === 'failed') return;

    let consecutiveFailures = 0;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/analyze/${jobId}/status`, {
          headers: { Authorization: `Bearer ${getAuthToken()}` },
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ detail: 'Unable to retrieve analysis status.' }));
          setErrorMessage(errorData.detail || 'Unable to retrieve analysis status.');
          setJobStatus('failed');
          return;
        }

        consecutiveFailures = 0;
        const data = await res.json();
        setJobStatus(data.status);
        if (data.progress_message) setProgressMessage(data.progress_message);

        if (data.status === 'failed') {
          setErrorMessage(data.error || 'Traffic analysis job failed.');
        } else if (data.status === 'done') {
          // Fetch final analysis report
          const reportRes = await fetch(`${API_BASE_URL}/api/analyze/${jobId}/report`, {
            headers: { Authorization: `Bearer ${getAuthToken()}` },
          });
          if (reportRes.ok) {
            const reportData = await reportRes.json();
            const normalizedState = normalizeStateUpdate(reportData.state_update);
            if (normalizedState) {
              setReport({
                ...reportData,
                state_update: normalizedState,
              } as AnalysisReport);
              setStateUpdate(normalizedState);
            } else {
              setErrorMessage('Analysis returned an invalid state update.');
              setJobStatus('failed');
            }
          } else {
            const errorData = await reportRes.json().catch(() => ({ detail: 'Unable to retrieve the completed analysis report.' }));
            setErrorMessage(errorData.detail || 'Unable to retrieve the completed analysis report.');
            setJobStatus('failed');
          }
        }
      } catch (err) {
        console.error('Error polling job status:', err);
        consecutiveFailures += 1;
        if (consecutiveFailures >= 3) {
          setErrorMessage('Unable to reach the analysis service. Please retry the upload.');
          setJobStatus('failed');
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [jobId, jobStatus, setStateUpdate]);

  // File Drag & Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSelectFile(e.target.files[0]);
    }
  };

  const validateAndSelectFile = (file: File) => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.pcap', '.pcapng', '.csv'].includes(ext)) {
      setErrorMessage(`Unsupported file extension '${ext}'. Allowed formats: .pcap, .pcapng, .csv`);
      return;
    }

    if (file.size > 200 * 1024 * 1024) {
      setErrorMessage(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds 200MB limit.`);
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setErrorMessage(null);
    setReport(null);
    setJobId(null);
    setJobStatus('queued');
    setProgressMessage('Uploading file to local analysis engine...');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch(`${API_BASE_URL}/api/analyze/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAuthToken()}` },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(errData.detail || 'Failed to upload traffic file');
      }

      const data = await res.json();
      setJobId(data.job_id);
      setJobStatus(data.status);
      setProgressMessage(data.message || 'Processing capture file...');
    } catch (err: any) {
      console.error('Upload error:', err);
      setErrorMessage(err.message || 'Upload failed');
      setJobStatus('failed');
    } finally {
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setJobId(null);
    setJobStatus(null);
    setReport(null);
    setErrorMessage(null);
    setProgressMessage('');
  };

  const getVerdictStyle = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-rose-500/15 border-rose-500/50 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.25)]';
      case 'elevated':
        return 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]';
      case 'moderate':
        return 'bg-yellow-500/15 border-yellow-500/50 text-yellow-300';
      default:
        return 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300';
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-sentinel-bg text-gray-100 overflow-x-hidden font-sans select-none">
      {/* Top Header */}
      <header className="sticky top-0 h-14 px-4 bg-sentinel-surface/90 border-b border-sentinel-border flex items-center justify-between z-30 shrink-0 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sentinel-cyan/15 border border-sentinel-cyan/40 flex items-center justify-center shadow-[0_0_12px_rgba(61,253,198,0.3)]">
              <UploadCloud className="w-4 h-4 text-sentinel-cyan" />
            </div>
            <div>
              <h1 className="text-sm font-mono font-extrabold tracking-widest text-white flex items-center gap-1.5">
                TRAFFIC ANALYSIS <span className="text-[10px] text-sentinel-cyan font-normal uppercase">Ad-Hoc Ingestion</span>
              </h1>
              <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                <Lock className="w-2.5 h-2.5 text-emerald-400" />
                Local Engine — Zero retention or training storage
              </span>
            </div>
          </div>
        </div>

        <ModeSwitch />

        <div className="flex items-center gap-2">
          {report && (
            <button
              onClick={resetUpload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono bg-sentinel-surface-light border border-sentinel-border text-gray-300 hover:text-white hover:border-sentinel-cyan transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Analyze Another File</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Upload Zone Modal / Card if no active completed report */}
        {(!report || jobStatus !== 'done') && (
          <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
            <div className="w-full max-w-2xl bg-sentinel-surface border border-sentinel-border rounded-xl p-6 shadow-2xl space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-lg font-mono font-bold text-white flex items-center justify-center gap-2">
                  <Cpu className="w-5 h-5 text-sentinel-cyan" />
                  Bring Your Own Traffic
                </h2>
                <p className="text-xs text-gray-400 font-mono max-w-md mx-auto">
                  Upload a <span className="text-sentinel-cyan font-bold">.PCAP</span>, <span className="text-sentinel-cyan font-bold">.PCAPNG</span>, or <span className="text-sentinel-cyan font-bold">.CSV</span> file to analyze network flows using SENTINEL's trained XGBoost classifier, PyTorch LSTM World Model, and SHAP explainability engine.
                </p>
              </div>

              {/* Drag & Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-sentinel-cyan bg-sentinel-cyan/10 shadow-[0_0_20px_rgba(61,253,198,0.2)]'
                    : selectedFile
                    ? 'border-emerald-500/60 bg-emerald-500/10'
                    : 'border-sentinel-border bg-sentinel-bg/60 hover:border-sentinel-cyan/60 hover:bg-sentinel-surface-light'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pcap,.pcapng,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileCheck className="w-10 h-10 text-emerald-400 animate-bounce" />
                    <div className="font-mono text-sm font-bold text-white">{selectedFile.name}</div>
                    <div className="font-mono text-xs text-gray-400">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Click to change file
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <UploadCloud className="w-12 h-12 text-sentinel-cyan/70" />
                    <div>
                      <div className="font-mono text-sm font-medium text-gray-200">
                        Drag and drop your packet capture or flow CSV here
                      </div>
                      <div className="font-mono text-xs text-gray-400 mt-1">
                        Supports <span className="text-gray-300">.PCAP, .PCAPNG, .CSV</span> up to 200 MB
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress State Indicator */}
              {jobStatus && jobStatus !== 'done' && (
                <div className="space-y-3 p-4 rounded-lg bg-sentinel-bg border border-sentinel-border">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-gray-300 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-sentinel-cyan animate-spin" />
                      {progressMessage || 'Processing capture file...'}
                    </span>
                    <span className="text-sentinel-cyan uppercase font-bold text-[10px]">
                      {jobStatus.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="w-full h-2 bg-sentinel-surface rounded-full overflow-hidden border border-sentinel-border">
                    <div
                      className={`h-full transition-all duration-500 ${
                        jobStatus === 'queued'
                          ? 'w-1/4 bg-blue-500'
                          : jobStatus === 'extracting_features'
                          ? 'w-2/4 bg-amber-500'
                          : jobStatus === 'running_inference'
                          ? 'w-3/4 bg-purple-500 animate-pulse'
                          : 'w-full bg-emerald-500'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit Action Button */}
              {selectedFile && (!jobStatus || jobStatus === 'failed') && (
                <button
                  onClick={handleUploadSubmit}
                  disabled={isUploading}
                  className="w-full py-3 rounded-lg bg-sentinel-cyan text-sentinel-bg font-mono font-bold text-sm hover:bg-emerald-300 transition-all shadow-[0_0_20px_rgba(61,253,198,0.4)] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Uploading & Starting Analysis...</span>
                    </>
                  ) : (
                    <>
                      <span>Execute Full Traffic Analysis</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}

              {/* Explicit Privacy Notice */}
              <div className="text-[11px] font-mono text-gray-500 text-center flex items-center justify-center gap-1.5 border-t border-sentinel-border/50 pt-4">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Your uploaded file is analyzed locally in an isolated session and is not stored or used for model training.</span>
              </div>
            </div>
          </div>
        )}

        {/* Completed Report Display Area */}
        {report && jobStatus === 'done' && (
          <div className="flex-1 min-h-[calc(100dvh-3.5rem)] flex flex-col relative">
            {/* Top Summary Verdict Strip */}
            <div className="p-3 bg-sentinel-surface/95 border-b border-sentinel-border z-20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-2 ${getVerdictStyle(report.summary.verdict_level)}`}>
                    <AlertTriangle className="w-4 h-4" />
                    <span>{report.summary.verdict}</span>
                  </div>

                  {report.summary.missing_features_notice && (
                    <div className="px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/40 text-amber-300 text-[11px] font-mono flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-amber-400" />
                      <span>{report.summary.missing_features_notice}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-gray-400">
                  <span>File: <strong className="text-white">{report.summary.filename}</strong></span>
                  <span>Flows: <strong className="text-sentinel-cyan">{report.summary.total_flows}</strong></span>
                  <span>Hosts: <strong className="text-sentinel-blue">{report.summary.total_hosts}</strong></span>
                </div>
              </div>

              {/* Top Risk Hosts Badges */}
              <div className="flex items-center gap-2 overflow-x-auto text-xs font-mono py-1">
                <span className="text-gray-400 text-[10px] font-bold uppercase shrink-0">Highest Risk Hosts:</span>
                {report.summary.top_risk_hosts.map((host) => (
                  <div
                    key={host.id}
                    className="px-2 py-0.5 rounded bg-sentinel-bg border border-sentinel-border text-gray-200 flex items-center gap-1.5 shrink-0"
                  >
                    <Server className="w-3 h-3 text-sentinel-cyan" />
                    <span>{host.id}</span>
                    <span className={`text-[10px] font-bold px-1 rounded ${host.risk_score > 0.7 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                      {Math.round(host.risk_score * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Network Twin Interactive Centerpiece */}
            <div className="h-[52vh] min-h-[320px] max-h-[560px] shrink-0 relative isolate">
              <NetworkTwin
                nodes={report.state_update.nodes}
                edges={report.state_update.edges}
                isForecastMode={isForecastMode}
                wheelScrollsPage
              />
              <NodeDeepDivePanel />
              <EdgeDetailPopover />
            </div>

            {/* Bottom Band: Kill Chain Rail & SHAP Strip */}
            <footer className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-4 px-4 py-3 bg-sentinel-surface/95 border-t border-sentinel-border shrink-0 shadow-2xl">
              <div className="min-w-0">
                <KillChainRail probs={report.state_update.killChainProbs} />
              </div>
              <div className="min-w-0 xl:border-l xl:border-sentinel-border/50 xl:pl-4">
                <ShapExplainabilityStrip features={report.state_update.topShap} compact />
              </div>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analyze;
