import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import type { SceneAnalysis } from '../lib/claude-fallback';
import type { AlertResult } from '../lib/twilio';
import type { AgentResult } from '../lib/adk-agent';

export type GpsCoords = { lat: number; lng: number };

export type UserProfile = {
  id: string;
  name: string;
  conditions: string[];
  medications: string[];
};

export type EmergencyContact = {
  id: string;
  name: string;
  phone: string;
  relationship: string;
};

export type CurrentQuestion = {
  text: string;
  index: number;
};

type EmergencyState = {
  sceneAnalysis: SceneAnalysis | null;
  gpsCoords: GpsCoords | null;
  dialogueAnswers: boolean[];
  alertStatus: AlertResult | null;
  userProfile: UserProfile;
  emergencyContacts: EmergencyContact[];
  currentQuestion: CurrentQuestion | null;
  loadingStatus: string;
  alertResult: AgentResult | null;
  agentAbort: (() => void) | null;

  setSceneAnalysis: (s: SceneAnalysis) => void;
  setGpsCoords: (c: GpsCoords) => void;
  addAnswer: (answer: boolean) => void;
  setAlertStatus: (r: AlertResult) => void;
  setUserProfile: (p: UserProfile) => void;
  setEmergencyContacts: (c: EmergencyContact[]) => void;
  setCurrentQuestion: (q: CurrentQuestion | null) => void;
  setLoadingStatus: (s: string) => void;
  setAlertResult: (r: AgentResult | null) => void;
  setAgentAbort: (fn: (() => void) | null) => void;
  setPendingAnswer: (resolver: (v: boolean) => void) => void;
  resolveAnswer: (answer: boolean) => void;
  reset: () => void;
};

const defaultProfile: UserProfile = { id: '', name: '', conditions: [], medications: [] };
const EmergencyContext = createContext<EmergencyState | null>(null);

export function EmergencyProvider({ children }: { children: ReactNode }) {
  const [sceneAnalysis, setSceneAnalysis] = useState<SceneAnalysis | null>(null);
  const [gpsCoords, setGpsCoords] = useState<GpsCoords | null>(null);
  const [dialogueAnswers, setDialogueAnswers] = useState<boolean[]>([]);
  const [alertStatus, setAlertStatus] = useState<AlertResult | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>(defaultProfile);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<CurrentQuestion | null>(null);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [alertResult, setAlertResult] = useState<AgentResult | null>(null);
  const [agentAbort, setAgentAbort] = useState<(() => void) | null>(null);

  const answerResolverRef = useRef<((v: boolean) => void) | null>(null);

  function setPendingAnswer(resolver: (v: boolean) => void) {
    answerResolverRef.current = resolver;
  }

  function resolveAnswer(answer: boolean) {
    const resolver = answerResolverRef.current;
    answerResolverRef.current = null;
    resolver?.(answer);
  }

  function addAnswer(answer: boolean) {
    setDialogueAnswers((prev) => [...prev, answer]);
  }

  function reset() {
    setSceneAnalysis(null);
    setGpsCoords(null);
    setDialogueAnswers([]);
    setAlertStatus(null);
    setCurrentQuestion(null);
    setLoadingStatus('');
    setAlertResult(null);
    setAgentAbort(null);
    answerResolverRef.current = null;
  }

  return (
    <EmergencyContext.Provider
      value={{
        sceneAnalysis, gpsCoords, dialogueAnswers, alertStatus,
        userProfile, emergencyContacts, currentQuestion, loadingStatus,
        alertResult, agentAbort,
        setSceneAnalysis, setGpsCoords, addAnswer, setAlertStatus,
        setUserProfile, setEmergencyContacts, setCurrentQuestion,
        setLoadingStatus, setAlertResult, setAgentAbort,
        setPendingAnswer, resolveAnswer, reset,
      }}
    >
      {children}
    </EmergencyContext.Provider>
  );
}

export function useEmergency(): EmergencyState {
  const ctx = useContext(EmergencyContext);
  if (!ctx) throw new Error('useEmergency must be used inside EmergencyProvider');
  return ctx;
}
