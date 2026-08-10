import React, { useState } from 'react';
import { ProjectDocument, SoftwareRequirement } from '../types';
import { parseDocumentApi } from '../services/api';
import {
  FileText,
  Upload,
  CheckCircle2,
  FileCode,
  Sparkles,
  Layers,
  ListCheck,
  Tag,
  AlertCircle,
  Plus,
  Trash2,
} from 'lucide-react';

interface DocumentUploaderProps {
  documents: ProjectDocument[];
  requirements: SoftwareRequirement[];
  onAddDocument: (doc: ProjectDocument, extractedReqs: SoftwareRequirement[]) => void;
  onRemoveDocument: (docId: string) => void;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  documents,
  requirements,
  onAddDocument,
  onRemoveDocument,
}) => {
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState<ProjectDocument['type']>('SRS');
  const [fileType, setFileType] = useState<'PDF' | 'DOCX' | 'TXT' | 'MD'>('PDF');
  const [rawText, setRawText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(documents[0]?.id || null);

  const [pdfBase64, setPdfBase64] = useState<string | null>(null);

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocName(file.name.replace(/\.[^/.]+$/, ''));
    const ext = file.name.split('.').pop()?.toUpperCase();
    if (ext === 'PDF' || ext === 'DOCX' || ext === 'TXT' || ext === 'MD') {
      setFileType(ext as any);
    }

    if (ext === 'PDF') {
      // Read PDF as binary, convert to base64 — never readAsText for PDFs
      const reader = new FileReader();
      reader.onload = (evt) => {
        const arrayBuffer = evt.target?.result as ArrayBuffer;
        if (arrayBuffer) {
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
          const b64 = btoa(binary);
          setPdfBase64(b64);
          setRawText(''); // not used for PDFs
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Plain text formats
      setPdfBase64(null);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        if (text) setRawText(text);
      };
      reader.readAsText(file);
    }
  };

  const loadPresetSample = (type: 'healthcare' | 'ecommerce' | 'fintech') => {
    if (type === 'healthcare') {
      setDocName('Patient Healthcare Portal SRS');
      setDocType('SRS');
      setFileType('PDF');
      setRawText(`Software Requirement Specification: Patient Healthcare System

Module 1: Patient Management & Onboarding
- REQ-001: Patient Registration - Allow patients to create account, upload ID credentials, and log personal details.
- REQ-002: Doctor Appointment Scheduling - Search doctor catalog by specialty and book calendar time slots.
- REQ-003: Electronic Health Records (EHR) - View medical history, lab test reports, and doctor clinical notes.

Module 2: Prescriptions & Billing
- REQ-004: Digital Prescription Management - Physicians issue electronic prescriptions routed to partner pharmacies.
- REQ-[#005]: Medical Invoice & Billing - Generate patient treatment invoices and process insurance claim submissions.`);
    } else if (type === 'ecommerce') {
      setDocName('Global E-Commerce Logistics SRS');
      setDocType('SRS');
      setFileType('DOCX');
      setRawText(`Software Requirement Specification: E-Commerce & Inventory System

Module 1: Customer Storefront
- REQ-001: Product Catalog Search - Filter product listings by category, stock availability, and price range.
- REQ-002: Shopping Cart & Checkout - Add items to cart, apply coupon codes, and execute payment checkout.
- REQ-003: Real-Time Shipment Tracking - Provide live courier location tracking and delivery status alerts.

Module 2: Merchant Inventory & Fulfillment
- REQ-004: Inventory Stock Management - Track warehouse inventory levels, trigger re-orders, and manage SKUs.
- REQ-005: Customer Returns & Refunds - Process customer return requests, issue refund credits, and print return labels.`);
    } else {
      setDocName('FinTech Digital Wallet SRS');
      setDocType('SRS');
      setFileType('TXT');
      setRawText(`Software Requirement Specification: FinTech Wallet System

Module 1: Core Banking & Transactions
- REQ-001: User Identity Verification (KYC) - Submit passport/national ID documents for anti-money laundering compliance.
- REQ-002: Peer-to-Peer Fund Transfer - Instant money transfer between user wallets using QR code or phone number.
- REQ-003: Currency Exchange & Forex - Live foreign currency conversion with real-time exchange rates.

Module 2: Payment Gateway & Security
- REQ-004: Bank Account Linking - Link external debit/credit cards and bank accounts via secure API tokens.
- REQ-005: Automated Fraud Detection - Monitor high-risk transaction patterns and trigger multi-factor authentication.`);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    const isPdf = fileType === 'PDF';
    if (isPdf && !pdfBase64) return; // PDF not yet loaded
    if (!isPdf && !rawText.trim()) return; // text not yet loaded

    setIsProcessing(true);
    try {
      const name = docName.trim() || `${docType} Document (${fileType})`;
      const result = await parseDocumentApi(
        name,
        docType,
        isPdf ? '' : rawText,
        fileType,
        isPdf ? (pdfBase64 ?? undefined) : undefined,
      );

      const newDocId = `doc-${Date.now()}`;
      const newDoc: ProjectDocument = {
        id: newDocId,
        projectId: 'current',
        name,
        type: docType,
        fileType,
        content: isPdf ? '[PDF — text extracted server-side]' : rawText,
        sections: result.sections || [],
        uploadDate: new Date().toISOString(),
      };

      const extractedReqs: SoftwareRequirement[] = (result.extractedRequirements || []).map((r: any, idx: number) => ({
        id: r.id || `REQ-GEN-${idx + 1}`,
        projectId: 'current',
        title: r.title || 'Software Component Requirement',
        module: r.module || 'General',
        priority: r.priority || 'High',
        category: r.category || 'Functional',
        expectedComponents: r.expectedComponents || ['API Endpoint', 'UI View'],
        description: r.description || 'Extracted software requirement from specification document.',
        sourceDocument: name,
      }));

      onAddDocument(newDoc, extractedReqs);
      setSelectedDocId(newDocId);
      setDocName('');
      setRawText('');
      setPdfBase64(null);
    } catch (err: any) {
      console.error('Document processing failed', err);
      const msg = err?.message || '';
      if (msg.startsWith('OCR_REQUIRED')) {
        alert('This PDF appears to be a scanned image. Please use a text-based PDF or paste the content as plain text.');
      } else if (msg.includes('Unable to extract')) {
        alert(msg);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedDoc = documents.find((d) => d.id === selectedDocId) || documents[0];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[var(--panel)] border border-[var(--border-1)] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Step 2 & Step 3
            </span>
            <h2 className="text-xl font-bold text-[var(--text-1)]">Project Documents & Software Specifications</h2>
          </div>
          <p className="text-xs text-[var(--text-4)]">
            Upload SRS, Proposals, Sprint Reports, and Design Docs representing the <strong className="text-[var(--text-2)]">planned software system</strong>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[var(--surface-3)]/80 px-3.5 py-2 rounded-xl border border-[var(--border-2)]/80 text-center">
            <span className="text-xs text-[var(--text-4)] block">Uploaded Specs</span>
            <span className="text-lg font-bold text-indigo-400">{documents.length} Docs</span>
          </div>
          <div className="bg-[var(--surface-3)]/80 px-3.5 py-2 rounded-xl border border-[var(--border-2)]/80 text-center">
            <span className="text-xs text-[var(--text-4)] block">Extracted SRS Reqs</span>
            <span className="text-lg font-bold text-[var(--accent)]">{requirements.length} REQs</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Upload & Preset Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[var(--panel)] border border-[var(--border-1)] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between text-[var(--text-1)] font-semibold text-sm">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-400" />
                <span>Upload / Paste Specification</span>
              </div>
            </div>

            {/* Quick SRS Presets */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-mono text-[var(--text-4)] uppercase font-bold block">Load Sample SRS Document:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => loadPresetSample('healthcare')}
                  className="px-2 py-1 rounded bg-[var(--surface-3)] hover:bg-[var(--surface-5)] text-[11px] font-medium text-[var(--accent)] border border-[var(--border-2)] transition-colors cursor-pointer"
                >
                  Healthcare SRS
                </button>
                <button
                  type="button"
                  onClick={() => loadPresetSample('ecommerce')}
                  className="px-2 py-1 rounded bg-[var(--surface-3)] hover:bg-[var(--surface-5)] text-[11px] font-medium text-emerald-300 border border-[var(--border-2)] transition-colors cursor-pointer"
                >
                  E-Commerce SRS
                </button>
                <button
                  type="button"
                  onClick={() => loadPresetSample('fintech')}
                  className="px-2 py-1 rounded bg-[var(--surface-3)] hover:bg-[var(--surface-5)] text-[11px] font-medium text-purple-300 border border-[var(--border-2)] transition-colors cursor-pointer"
                >
                  FinTech SRS
                </button>
              </div>
            </div>

            {/* Local File Picker Input */}
            <div className="pt-2 border-t border-[var(--border-1)]">
              <label className="block text-[11px] font-medium text-[var(--text-4)] uppercase tracking-wider mb-1">
                Select Local File (PDF / DOCX / TXT / MD)
              </label>
              <input
                type="file"
                accept=".pdf,.docx,.txt,.md,.json"
                onChange={handleFilePicked}
                className="w-full text-xs text-[var(--text-4)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600/30 file:text-indigo-200 hover:file:bg-indigo-600/40 cursor-pointer"
              />
            </div>

            <form onSubmit={handleFileUpload} className="space-y-3 pt-2 border-t border-[var(--border-1)]">
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-4)] uppercase tracking-wider mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="e.g. Software Requirement Specification v1.0"
                  className="w-full bg-[var(--surface-4)] border border-[var(--border-2)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-2)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-4)] uppercase tracking-wider mb-1">
                    Doc Type
                  </label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as any)}
                    className="w-full bg-[var(--surface-4)] border border-[var(--border-2)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-2)]"
                  >
                    <option value="SRS">SRS</option>
                    <option value="Proposal">Proposal</option>
                    <option value="Sprint Report">Sprint Report</option>
                    <option value="Meeting Notes">Meeting Notes</option>
                    <option value="Design Doc">Design Doc</option>
                    <option value="Timeline">Timeline</option>
                    <option value="Feature List">Feature List</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-4)] uppercase tracking-wider mb-1">
                    File Format
                  </label>
                  <select
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value as any)}
                    className="w-full bg-[var(--surface-4)] border border-[var(--border-2)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-2)]"
                  >
                    <option value="PDF">PDF</option>
                    <option value="DOCX">DOCX</option>
                    <option value="TXT">TXT</option>
                    <option value="MD">MD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--text-4)] uppercase tracking-wider mb-1">
                  Document Content Text
                </label>
                <textarea
                  rows={4}
                  required
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste section details, features, deliverables, APIs expected..."
                  className="w-full bg-[var(--surface-4)] border border-[var(--border-2)] rounded-lg p-2.5 text-xs text-[var(--text-2)] focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-[var(--text-6)] resize-none font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-[var(--text-1)] font-semibold text-xs shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-indigo-300" />
                    <span>Processing Document Engine...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Process & Extract Requirements</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Uploaded Documents List */}
          <div className="bg-[var(--panel)] border border-[var(--border-1)] rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--accent)]" />
              Project Document Registry ({documents.length})
            </h3>

            <div className="space-y-2">
              {documents.map((doc) => {
                const isSelected = selectedDoc?.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDocId(doc.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500/50 text-[var(--text-1)] shadow-sm'
                        : 'bg-[var(--surface-4)]/50 border-[var(--border-1)] text-[var(--text-3)] hover:border-[var(--border-2)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-[var(--surface-3)] flex items-center justify-center text-xs font-bold text-indigo-400 border border-[var(--border-2)] shrink-0">
                        {doc.fileType}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate text-[var(--text-1)]">{doc.name}</p>
                        <p className="text-[10px] text-[var(--text-4)]">
                          {doc.type} • {doc.sections?.length || 1} Sections
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveDocument(doc.id);
                      }}
                      className="text-[var(--text-5)] hover:text-rose-400 p-1 transition-colors"
                      title="Remove Document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Document Section Inspector & Extracted Requirements */}
        <div className="lg:col-span-2 space-y-6">
          {/* Document Section Inspector */}
          {selectedDoc && (
            <div className="bg-[var(--panel)] border border-[var(--border-1)] rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-1)] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center border border-[var(--accent)]/30">
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-1)]">{selectedDoc.name}</h3>
                    <p className="text-xs text-[var(--text-4)]">
                      Uploaded {new Date(selectedDoc.uploadDate).toLocaleDateString()} • Format: {selectedDoc.fileType}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {selectedDoc.type}
                </span>
              </div>

              {/* Sections Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-3)] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  Extracted Document Sections & Headings
                </h4>

                <div className="space-y-2">
                  {selectedDoc.sections?.map((sec) => (
                    <div key={sec.id} className="bg-[var(--surface-4)] border border-[var(--border-1)] rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--accent)]">{sec.title}</span>
                        {sec.headings && (
                          <div className="flex gap-1 flex-wrap">
                            {sec.headings.map((h, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] px-2 py-0.5 rounded bg-[var(--surface-3)] text-[var(--text-3)] border border-[var(--border-2)]"
                              >
                                {h}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-3)] leading-relaxed font-sans">{sec.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Extracted Software Requirements View */}
          <div className="bg-[var(--panel)] border border-[var(--border-1)] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-1)] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <ListCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-1)]">Extracted Planned Software Requirements</h3>
                  <p className="text-xs text-[var(--text-4)]">
                    Requirements detected from uploaded documents for GitHub comparison
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                {requirements.length} Active Requirements
              </span>
            </div>

            <div className="space-y-3">
              {requirements.length === 0 ? (
                <div className="bg-[var(--surface-4)] border border-[var(--border-1)] rounded-xl p-8 text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-[var(--text-5)] mx-auto" />
                  <p className="font-bold text-[var(--text-2)]">No Requirements Extracted Yet</p>
                  <p className="text-xs text-[var(--text-4)] max-w-md mx-auto">
                    Upload your project documents (SRS, Proposal, Sprint Report, or Design Doc) or select a sample SRS document above to dynamically extract software requirements.
                  </p>
                </div>
              ) : (
                requirements.map((req) => (
                  <div
                    key={req.id}
                    className="bg-[var(--surface-4)] border border-[var(--border-1)] hover:border-[var(--border-2)] rounded-xl p-4 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {req.id}
                        </span>
                        <h4 className="text-sm font-bold text-[var(--text-1)]">{req.title}</h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--surface-3)] text-[var(--text-3)] border border-[var(--border-2)]">
                          {req.module}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            req.priority === 'High'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : req.priority === 'Medium'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {req.priority} Priority
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-[var(--text-3)]">{req.description}</p>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-[var(--text-4)] block mb-1">
                        Expected Software Components ({req.expectedComponents.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {req.expectedComponents.map((comp, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded text-xs font-mono bg-[var(--panel)] text-[var(--text-2)] border border-[var(--border-1)] flex items-center gap-1"
                          >
                            <Tag className="w-3 h-3 text-[var(--accent)]" />
                            {comp}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
