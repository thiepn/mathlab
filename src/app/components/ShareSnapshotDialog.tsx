import { useEffect, useState } from 'react';
import type { MathWorkspaceState } from '../../lib/math/types';
import type { WorksheetSession } from '../../lib/math/worksheetTypes';
import { createShareBundle, shareLinkForToken, type ShareBundle } from '../../lib/share/snapshot';

interface Props {
  workspace: MathWorkspaceState;
  worksheet?: WorksheetSession;
  onClose: () => void;
}

function download(raw: string, title: string) {
  const blob = new Blob([raw], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mathlab-share-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'snapshot'}.json`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function ShareSnapshotDialog({ workspace, worksheet, onClose }: Props) {
  const [title,setTitle]=useState(worksheet?.title ?? 'MathLab snapshot');
  const [note,setNote]=useState('');
  const [includeWorksheet,setIncludeWorksheet]=useState(Boolean(worksheet));
  const [bundle,setBundle]=useState<ShareBundle|null>(null);
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);

  useEffect(()=>setBundle(null),[title,note,includeWorksheet]);

  const build=async()=>{
    setBusy(true);setStatus('');
    try{
      const next=await createShareBundle(workspace,worksheet,{title,note,includeWorksheet});
      setBundle(next);
      setStatus(next.linkEligible
        ? 'Snapshot ready. The share link contains the snapshot in its URL fragment; MathLab does not upload it.'
        : 'Snapshot ready as a file. It is too large for MathLab’s conservative share-link limit.');
    }catch(error){setStatus(error instanceof Error?error.message:'Could not create the shared snapshot.');}
    finally{setBusy(false);}
  };

  const copyLink=async()=>{
    if(!bundle?.token)return;
    try{
      await navigator.clipboard.writeText(shareLinkForToken(bundle.token));
      setStatus('Share link copied.');
    }catch{setStatus('Clipboard access was blocked. Use the link field to copy it manually.');}
  };

  return <>
    <button className="p8-share-backdrop" onClick={onClose} aria-label="Close sharing dialog" />
    <section className="p8-share-dialog" role="dialog" aria-modal="true" aria-labelledby="p8-share-title">
      <header>
        <div><span className="section-kicker">Sharing &amp; collaboration</span><h2 id="p8-share-title">Create a read-only snapshot</h2></div>
        <button onClick={onClose} aria-label="Close sharing dialog">×</button>
      </header>

      <div className="p8-share-fields">
        <label><span>Snapshot title</span><input value={title} maxLength={180} onChange={(e)=>setTitle(e.target.value)} /></label>
        <label><span>Note for the recipient</span><textarea value={note} maxLength={1000} rows={4} onChange={(e)=>setNote(e.target.value)} placeholder="Optional context, assignment instructions, or what you want them to review." /></label>
        <label className="p8-check"><input type="checkbox" checked={includeWorksheet} disabled={!worksheet} onChange={(e)=>setIncludeWorksheet(e.target.checked)} /><span>Include the current worksheet session</span></label>
      </div>

      <div className="p8-share-privacy">
        <strong>Local-first sharing</strong>
        <p>The snapshot is immutable and SHA-256 checked. Link data stays in the URL fragment and is not sent to MathLab’s static host. A recipient opens it read-only and must explicitly copy it before editing.</p>
      </div>

      <div className="p8-share-actions">
        <button className="is-primary" disabled={busy||!title.trim()} onClick={()=>void build()}>{busy?'Creating…':'Create snapshot'}</button>
        {bundle?.token&&<button onClick={()=>void copyLink()}>Copy share link</button>}
        {bundle&&<button onClick={()=>download(bundle.raw,bundle.snapshot.title)}>Download snapshot file</button>}
      </div>

      {bundle?.token&&<label className="p8-link-field"><span>Share link</span><input readOnly value={shareLinkForToken(bundle.token)} onFocus={(e)=>e.currentTarget.select()} /></label>}
      {status&&<div className="p8-share-status" role="status">{status}</div>}
    </section>
  </>;
}
