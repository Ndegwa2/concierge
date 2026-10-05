import React, { useState, useCallback } from 'react';
import { documentsApi, Document, Signature, SignatureAuditEvent } from '@/services/api/documents';
import SignaturePad from './SignaturePad';

type DocType = 'work_order' | 'service_agreement' | 'invoice' | 'other';

const DOC_TYPE_LABELS: Record<string, string> = {
  work_order: 'Work Order',
  service_agreement: 'Service Agreement',
  invoice: 'Invoice',
  other: 'Other',
};

const DOC_TYPE_COLORS: Record<string, string> = {
  work_order: '#3B82F6',
  service_agreement: '#8B5CF6',
  invoice: '#10B981',
  other: '#6B7280',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  sent: '#3B82F6',
  signed: '#10B981',
  declined: '#EF4444',
  cancelled: '#6B7280',
  expired: '#9CA3AF',
};

interface DocumentManagerProps {
  onClose?: () => void;
}

const DocumentManager: React.FC<DocumentManagerProps> = ({ onClose }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [auditLog, setAuditLog] = useState<SignatureAuditEvent[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signerName, setSignerName] = useState('');
  const [signerNote, setSignerNote] = useState('');

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await documentsApi.listDocuments();
      if (res.success) {
        setDocuments(res.data.data);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDocDetails = useCallback(async (docId: number) => {
    setLoading(true);
    try {
      const [docRes, sigRes, auditRes] = await Promise.all([
        documentsApi.getDocument(docId),
        documentsApi.listSignatures(docId),
        documentsApi.getAuditTrail(docId),
      ]);
      if (docRes.success) setSelectedDoc(docRes.data.document);
      if (sigRes.success) setSignatures(sigRes.data.data);
      if (auditRes.success) setAuditLog(auditRes.data.data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setLoading(true);
    setError(null);
    try {
      const res = await documentsApi.createDocument({
        title: formData.get('title') as string,
        doc_type: formData.get('doc_type') as DocType,
        description: (formData.get('description') as string) || undefined,
        reference_id: formData.get('reference_id') ? Number(formData.get('reference_id')) : undefined,
        reference_type: (formData.get('reference_type') as string) || undefined,
        expires_days: formData.get('expires_days') ? Number(formData.get('expires_days')) : undefined,
      });
      if (res.success) {
        setShowCreate(false);
        await loadDocuments();
      } else {
        setError(res.message);
      }
    } catch (er) {
      setError(String(er));
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (docId: number) => {
    setLoading(true);
    try {
      const res = await documentsApi.sendDocument(docId);
      if (res.success) {
        await loadDocDetails(docId);
        await loadDocuments();
      } else {
        setError(res.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!selectedDoc || !signatureData) return;
    setLoading(true);
    setError(null);
    try {
      const res = await documentsApi.captureSignature(selectedDoc.id, {
        signature_data: signatureData,
        signer_name: signerName || undefined,
        note: signerNote || undefined,
      });
      if (res.success) {
        setSignatureData(null);
        setSignerName('');
        setSignerNote('');
        await loadDocDetails(selectedDoc.id);
        await loadDocuments();
      } else {
        setError(res.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async (docId: number, reason: string) => {
    setLoading(true);
    try {
      const res = await documentsApi.declineDocument(docId, reason);
      if (res.success) {
        await loadDocDetails(docId);
        await loadDocuments();
      } else {
        setError(res.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (docId: number) => {
    if (!confirm('Cancel this document?')) return;
    setLoading(true);
    try {
      const res = await documentsApi.cancelDocument(docId);
      if (res.success) {
        await loadDocDetails(docId);
        await loadDocuments();
      } else {
        setError(res.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
      <style>{`
        .doc-card {
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 16px;
          margin-bottom: 12px;
          background: #fff;
          cursor: pointer;
          transition: box-shadow 0.2s;
        }
        .doc-card:hover {
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
        }
        .doc-card.selected {
          border-color: #3B82F6;
          background: #F8FAFC;
        }
        .badge {
          display: inline-block;
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          color: #fff;
        }
      `}</style>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }}>×</button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>Documents & E-Signatures</h2>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: '8px 20px',
            background: '#3B82F6',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          + New Document
        </button>
      </div>

      {showCreate && (
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
          <h3 style={{ marginTop: 0 }}>Create Document</h3>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Title</label>
                <input name="title" required placeholder="Document title"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Type</label>
                <select name="doc_type" defaultValue="work_order"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB' }}>
                  <option value="work_order">Work Order</option>
                  <option value="service_agreement">Service Agreement</option>
                  <option value="invoice">Invoice</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Description</label>
                <textarea name="description" rows={2} placeholder="Optional description"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Reference ID (optional)</label>
                <input name="reference_id" type="number" placeholder="e.g., appointment ID"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Reference Type</label>
                <input name="reference_type" placeholder="e.g., appointment, work_record"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Expires in (days)</label>
                <input name="expires_days" type="number" defaultValue={30}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button type="submit" disabled={loading}
                style={{ padding: '8px 20px', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                {loading ? 'Creating...' : 'Create'}
              </button>
              <button type="button" onClick={() => setShowCreate(false)}
                style={{ padding: '8px 20px', background: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: '6px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', gap: '24px' }}>
        {/* Document List */}
        <div style={{ flex: '1 1 400px', minWidth: '300px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
            All Documents ({documents.length})
          </h3>
          {loading && documents.length === 0 && <p>Loading...</p>}
          {documents.map(doc => (
            <div
              key={doc.id}
              className={`doc-card ${selectedDoc?.id === doc.id ? 'selected' : ''}`}
              onClick={() => loadDocDetails(doc.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '15px' }}>{doc.title}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                    <span className="badge" style={{ background: DOC_TYPE_COLORS[doc.doc_type] }}>
                      {DOC_TYPE_LABELS[doc.doc_type]}
                    </span>
                    {' '}
                    <span className="badge" style={{ background: STATUS_COLORS[doc.status] }}>
                      {doc.status}
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                  {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ''}
                </span>
              </div>
            </div>
          ))}
          {documents.length === 0 && !loading && (
            <p style={{ color: '#9CA3AF', fontSize: '14px' }}>No documents yet. Click + New Document to create one.</p>
          )}
        </div>

        {/* Document Detail */}
        <div style={{ flex: '1 1 500px', minWidth: '350px' }}>
          {selectedDoc && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ marginTop: 0, fontSize: '18px' }}>{selectedDoc.title}</h3>
                <button onClick={() => setSelectedDoc(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#9CA3AF' }}>×</button>
              </div>
              <p style={{ fontSize: '13px', color: '#6B7280' }}>{selectedDoc.description}</p>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <span className="badge" style={{ background: DOC_TYPE_COLORS[selectedDoc.doc_type] }}>
                  {DOC_TYPE_LABELS[selectedDoc.doc_type]}
                </span>
                <span className="badge" style={{ background: STATUS_COLORS[selectedDoc.status] }}>
                  {selectedDoc.status}
                </span>
                {selectedDoc.file_name && (
                  <a href={`/api/documents/${selectedDoc.id}/download`} download
                    className="badge" style={{ background: '#6366F1', textDecoration: 'none' }}>
                    📄 {selectedDoc.file_name}
                  </a>
                )}
              </div>

              {/* Actions based on status */}
              {selectedDoc.status === 'pending' && (
                <button onClick={() => handleSend(selectedDoc.id)} disabled={loading}
                  style={{ padding: '8px 16px', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, marginRight: '8px' }}>
                  Send for Signing
                </button>
              )}
              {(selectedDoc.status === 'pending' || selectedDoc.status === 'sent') && (
                <button onClick={() => handleCancel(selectedDoc.id)} disabled={loading}
                  style={{ padding: '8px 16px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, marginRight: '8px' }}>
                  Cancel
                </button>
              )}

              {/* Signatures section */}
              <div style={{ marginTop: '24px' }}>
                <h4 style={{ marginBottom: '12px' }}>Signatures</h4>
                {signatures.length === 0 && (
                  <p style={{ color: '#9CA3AF', fontSize: '13px' }}>No signatures yet.</p>
                )}
                {signatures.map(sig => (
                  <div key={sig.id} style={{ border: '1px solid #E5E7EB', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 600 }}>{sig.signer_name} {sig.signer_email && `(${sig.signer_email})`}</div>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>
                      Status: {sig.status} | Signed: {sig.verified_at || sig.created_at}
                    </div>
                    {sig.signature_image_path && (
                      <img src={`/api/documents/${selectedDoc.id}/signatures/${sig.id}/image`} alt="Signature"
                        style={{ maxWidth: '300px', border: '1px solid #ddd', marginTop: '8px', borderRadius: '4px' }} />
                    )}
                    {sig.note && <div style={{ fontSize: '12px', marginTop: '4px', fontStyle: 'italic' }}>"{sig.note}"</div>}
                    {sig.status === 'captured' && (
                      <button onClick={() => {/* implement verify */}} style={{ fontSize: '12px', color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                        Verify Signature
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Sign form - visible when document is pending/sent */}
              {(selectedDoc.status === 'pending' || selectedDoc.status === 'sent') && (
                <div style={{ marginTop: '24px', borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
                  <h4>Sign this Document</h4>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Your Name</label>
                    <input value={signerName} onChange={e => setSignerName(e.target.value)}
                      placeholder="Full name"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB' }} />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Signature</label>
                    <SignaturePad onCapture={setSignatureData} width={400} height={150} />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Note (optional)</label>
                    <input value={signerNote} onChange={e => setSignerNote(e.target.value)}
                      placeholder="Add a note to your signature"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB' }} />
                  </div>
                  <button onClick={handleSign} disabled={!signatureData || loading}
                    style={{ padding: '10px 24px', background: '#10B981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }}>
                    Sign Document
                  </button>
                </div>
              )}

              {/* Audit Trail */}
              <div style={{ marginTop: '24px', borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
                <h4>Audit Trail</h4>
                {auditLog.length === 0 && <p style={{ color: '#9CA3AF', fontSize: '13px' }}>No audit events yet.</p>}
                {auditLog.map((evt, idx) => (
                  <div key={evt.id} style={{ borderLeft: '3px solid #3B82F6', padding: '8px 12px', marginBottom: '8px', background: '#F9FAFB' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{evt.event_type}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>
                      {evt.actor_name || 'System'} | {evt.ip_address} | {evt.created_at && new Date(evt.created_at).toLocaleString()}
                    </div>
                    {evt.details && Object.keys(evt.details).length > 0 && (
                      <pre style={{ fontSize: '11px', overflow: 'auto', marginTop: '4px' }}>{JSON.stringify(evt.details, null, 2)}</pre>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
          {!selectedDoc && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' }}>
              <p style={{ fontSize: '16px' }}>Select a document to view details</p>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(255,255,255,0.9)', padding: '20px', borderRadius: '10px' }}>
          Loading...
        </div>
      )}
    </div>
  );
};

export default DocumentManager;
