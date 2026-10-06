import { useEffect, useRef, useState } from 'react';
import type { MathLabShareSnapshot } from '../../lib/share/snapshot';
import { decodeShareToken, parseShareSnapshot, stringifyShareSnapshot } from '../../lib/share/snapshot';
import type { MathWorkspaceController } from '../hooks/useMathWorkspace';
import type { WorksheetController } from '../hooks/useWorksheet';
import { MathValue } from './MathValue';
import { operationLabels } from './AlgebraResult';

interface Props {
  workspace: MathWorkspaceController;
  worksheet: WorksheetController;
  onOpenWorkspace: () => void;
}

function currentToken(): string {
  const raw=window.location.hash.replace(/^#\/?/,'');
  if(!raw.startsWith('share/')) return '';
  return raw.slice('share/'.length);
}

function formatDate(value:number){
  try{return new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}
  catch{return new Date(value).toISOString();}
}

function download(snapshot:MathLabShareSnapshot){
  const blob=new Blob([stringifyShareSnapshot(snapshot)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download='mathlab-shared-snapshot.json';
  link.style.display='none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),0);
}

export function SharedSnapshotPage({workspace,worksheet,onOpenWorkspace}:Props){
  const [snapshot,setSnapshot]=useState<MathLabShareSnapshot|null>(null);
  const [status,setStatus]=useState('Loading shared snapshot…');
  const [error,setError]=useState('');
  const fileRef=useRef<HTMLInputElement>(null);

  useEffect(()=>{
    const token=currentToken();
    if(!token){setStatus('Open a MathLab shared snapshot file, or follow a MathLab share link.');return;}
    let active=true;
    void decodeShareToken(token).then((value)=>{
      if(!active)return;setSnapshot(value);setError('');setStatus('');
    }).catch((reason)=>{
      if(!active)return;setSnapshot(null);setStatus('');setError(reason instanceof Error?reason.message:'Could not open this shared snapshot.');
    });
    return()=>{active=false;};
  },[]);

  const openFile=async(file?:File)=>{
    if(!file)return;
    setError('');setStatus('Opening snapshot…');
    try{
      const value=await parseShareSnapshot(await file.text());
      setSnapshot(value);setStatus('');
    }catch(reason){
      setSnapshot(null);setStatus('');setError(reason instanceof Error?reason.message:'Could not open this shared snapshot file.');
    }finally{if(fileRef.current)fileRef.current.value='';}
  };

  const copyIntoMathLab=()=>{
    if(!snapshot)return;
    const warning=workspace.state.objects.length
      ? 'Copy this shared snapshot into MathLab? Your current workspace will be replaced, but its previous autosave will remain available through Recovery.'
      : 'Copy this shared snapshot into your local MathLab workspace?';
    if(!window.confirm(warning))return;
    workspace.importSharedCopy(snapshot.workspace,snapshot.title);
    if(snapshot.worksheet)worksheet.appendSharedSession(snapshot.worksheet,snapshot.title);
    onOpenWorkspace();
  };

  if(!snapshot){
    return <main className="p8-shared-page">
      <section className="p8-share-empty">
        <span className="section-kicker">Sharing &amp; collaboration</span>
        <h1>Open a shared MathLab snapshot</h1>
        <p>Shared snapshots are read-only until you deliberately copy them into your local workspace.</p>
        <button onClick={()=>fileRef.current?.click()}>Open snapshot file</button>
        <input ref={fileRef} className="visually-hidden" type="file" accept="application/json,.json" aria-label="Open shared MathLab snapshot" onChange={(event)=>void openFile(event.target.files?.[0])}/>
        {status&&<div className="p8-share-status" role="status">{status}</div>}
        {error&&<div className="engine-error" role="alert">{error}</div>}
      </section>
    </main>;
  }

  return <main className="p8-shared-page">
    <header className="p8-shared-hero">
      <div>
        <span className="section-kicker">Read-only shared snapshot</span>
        <h1>{snapshot.title}</h1>
        <p>{snapshot.note??'A MathLab workspace snapshot shared for review and reuse.'}</p>
      </div>
      <div className="p8-shared-actions">
        <button className="is-primary" onClick={copyIntoMathLab}>Copy into my MathLab</button>
        <button onClick={()=>download(snapshot)}>Download snapshot</button>
        <button onClick={()=>fileRef.current?.click()}>Open another file</button>
        <input ref={fileRef} className="visually-hidden" type="file" accept="application/json,.json" aria-label="Open another shared MathLab snapshot" onChange={(event)=>void openFile(event.target.files?.[0])}/>
      </div>
    </header>

    <section className="p8-provenance" aria-label="Snapshot provenance">
      <div><span>Created</span><strong>{formatDate(snapshot.createdAt)}</strong></div>
      <div><span>Objects</span><strong>{snapshot.workspace.objects.length}</strong></div>
      <div><span>Assumptions</span><strong>{snapshot.workspace.assumptions.length}</strong></div>
      <div><span>Integrity</span><strong>SHA-256 verified</strong></div>
    </section>

    <section className="p8-shared-section" aria-labelledby="p8-shared-objects">
      <header><div><span className="section-kicker">Workspace</span><h2 id="p8-shared-objects">Shared mathematical objects</h2></div><span>{snapshot.workspace.objects.length}</span></header>
      <div className="p8-object-grid">
        {snapshot.workspace.objects.length===0&&<p>No named objects were included.</p>}
        {snapshot.workspace.objects.map((object)=><article key={object.id}>
          <header><strong>{object.name??object.kind}</strong><span>{object.kind}</span></header>
          <div className="p8-shared-math"><MathValue source={object.source} compact={false}/></div>
          <footer>
            <span>{object.exactness}</span>
            <span>{object.dependencies.length?'Depends on '+object.dependencies.join(', '):'Independent'}</span>
          </footer>
        </article>)}
      </div>
    </section>

    {snapshot.workspace.assumptions.length>0&&<section className="p8-shared-section" aria-labelledby="p8-shared-assumptions">
      <header><div><span className="section-kicker">Context</span><h2 id="p8-shared-assumptions">Assumptions</h2></div><span>{snapshot.workspace.assumptions.length}</span></header>
      <div className="p8-assumption-list">{snapshot.workspace.assumptions.map((item)=><span key={item.id}>{item.label}</span>)}</div>
    </section>}

    {snapshot.worksheet&&<section className="p8-shared-section" aria-labelledby="p8-shared-worksheet">
      <header><div><span className="section-kicker">Worksheet</span><h2 id="p8-shared-worksheet">{snapshot.worksheet.title}</h2></div><span>{snapshot.worksheet.entries.length} entries</span></header>
      <div className="p8-shared-worksheet">
        {snapshot.worksheet.entries.map((entry,index)=><article key={entry.id}>
          <div className="p8-entry-index">{String(index+1).padStart(2,'0')}</div>
          <div>
            <header><span>{entry.type==='input'?'Input':operationLabels[entry.operation]??entry.operation.replace(/-/g,' ')}</span><time>{formatDate(entry.createdAt)}</time></header>
            <div className="p8-shared-math"><MathValue ast={entry.type==='result'?entry.result.resultAst:undefined} source={entry.type==='input'?entry.source:entry.result.display} compact={false}/></div>
            {entry.type==='result'&&<footer><span>{entry.result.exactness}</span>{entry.result.warnings.length>0&&<span>{entry.result.warnings.length} warning{entry.result.warnings.length===1?'':'s'}</span>}</footer>}
          </div>
        </article>)}
      </div>
    </section>}

    <aside className="p8-copy-boundary">
      <strong>Read-only by design.</strong>
      <p>This snapshot cannot edit your local work. “Copy into my MathLab” creates an editable local copy; if you already have workspace objects, the previous autosave remains available through Recovery.</p>
    </aside>
  </main>;
}
