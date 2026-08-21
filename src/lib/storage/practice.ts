import { emptyPracticeProgress, type ExerciseProgress, type PracticeProgressState } from '../math/practice';
import { mathLabDb } from './database';

const PRACTICE_KEY='practice:p15:default';
const LEGACY_KEY='practice:p14:default';
const RECOVERY_KEY='practice:p15:recovery';
const MAX_RECORDS=5000;
const MAX_HISTORY=50;

function isFiniteNumber(value:unknown):value is number { return typeof value==='number'&&Number.isFinite(value); }
function validRecord(value:unknown):value is ExerciseProgress {
  if(!value||typeof value!=='object')return false;
  const item=value as Partial<ExerciseProgress>;
  return typeof item.exerciseId==='string'&&typeof item.courseId==='string'&&typeof item.topicId==='string'
    && isFiniteNumber(item.attempts)&&isFiniteNumber(item.correct)&&isFiniteNumber(item.streak)&&isFiniteNumber(item.mastery)
    && isFiniteNumber(item.ease)&&isFiniteNumber(item.intervalDays)&&isFiniteNumber(item.dueAt)&&isFiniteNumber(item.lastAttemptAt)
    && Array.isArray(item.history);
}
function isPracticeState(value:unknown):value is PracticeProgressState {
  if(!value||typeof value!=='object')return false;
  const candidate=value as Partial<PracticeProgressState>;
  if(candidate.version!==1||!candidate.records||typeof candidate.records!=='object'||Array.isArray(candidate.records))return false;
  const records=Object.values(candidate.records);
  return records.length<=MAX_RECORDS&&records.every(validRecord)
    && isFiniteNumber(candidate.completedSessions)&&isFiniteNumber(candidate.completedExams)
    && isFiniteNumber(candidate.totalCorrect)&&isFiniteNumber(candidate.totalAttempts)&&isFiniteNumber(candidate.updatedAt);
}
function normalize(state:PracticeProgressState):PracticeProgressState {
  const records=Object.fromEntries(Object.entries(state.records).slice(0,MAX_RECORDS).map(([id,item])=>[id,{...item,history:item.history.slice(0,MAX_HISTORY)}]));
  return {...state,records,updatedAt:Date.now()};
}

export async function loadPracticeProgress():Promise<PracticeProgressState>{
  const stored=await mathLabDb.get<unknown>(PRACTICE_KEY);
  if(isPracticeState(stored?.value))return normalize(stored.value);
  const recovery=await mathLabDb.get<unknown>(RECOVERY_KEY);
  if(isPracticeState(recovery?.value))return normalize(recovery.value);
  const legacy=await mathLabDb.get<unknown>(LEGACY_KEY);
  if(isPracticeState(legacy?.value)){const migrated=normalize(legacy.value);await mathLabDb.put(PRACTICE_KEY,migrated);return migrated;}
  return emptyPracticeProgress();
}

export async function savePracticeProgress(state:PracticeProgressState):Promise<void>{
  const normalized=normalize(state);
  const previous=await mathLabDb.get<unknown>(PRACTICE_KEY);
  if(isPracticeState(previous?.value))await mathLabDb.put(RECOVERY_KEY,previous.value);
  await mathLabDb.put(PRACTICE_KEY,normalized);
}
export async function resetPracticeProgress():Promise<PracticeProgressState>{ const empty=emptyPracticeProgress(); await mathLabDb.put(PRACTICE_KEY,empty); return empty; }
export async function loadPracticeRecovery():Promise<PracticeProgressState|null>{const stored=await mathLabDb.get<unknown>(RECOVERY_KEY);return isPracticeState(stored?.value)?normalize(stored.value):null;}
