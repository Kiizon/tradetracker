import { createContext, useContext, useEffect, useState } from 'react';
import {
  collection, onSnapshot, doc, setDoc, deleteDoc,
  writeBatch, getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Trade, JournalEntry } from '../types';

interface DataContextValue {
  trades: Trade[];
  journal: JournalEntry[];
  addTrade: (trade: Trade) => Promise<void>;
  updateTrade: (trade: Trade) => Promise<void>;
  deleteTrade: (id: string) => Promise<void>;
  bulkImportTrades: (trades: Trade[]) => Promise<{ added: number; skipped: number }>;
  clearTrades: () => Promise<void>;
  addJournalEntry: (entry: JournalEntry) => Promise<void>;
  updateJournalEntry: (entry: JournalEntry) => Promise<void>;
  deleteJournalEntry: (id: string) => Promise<void>;
  restoreBackup: (trades: Trade[], journal: JournalEntry[]) => Promise<void>;
}

const DataContext = createContext<DataContextValue>(null!);

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

export function DataProvider({ uid, children }: { uid: string; children: React.ReactNode }) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);

  useEffect(() => {
    return onSnapshot(collection(db, 'users', uid, 'trades'), snap => {
      const raw = snap.docs.map(d => d.data() as Trade);
      setTrades(raw.filter(t => t.avgEntry !== undefined && t.avgExit !== undefined));
    });
  }, [uid]);

  useEffect(() => {
    return onSnapshot(collection(db, 'users', uid, 'journal'), snap => {
      setJournal(snap.docs.map(d => d.data() as JournalEntry));
    });
  }, [uid]);

  async function addTrade(trade: Trade) {
    await setDoc(doc(db, 'users', uid, 'trades', trade.id), trade);
  }

  async function updateTrade(trade: Trade) {
    await setDoc(doc(db, 'users', uid, 'trades', trade.id), trade);
  }

  async function deleteTrade(id: string) {
    await deleteDoc(doc(db, 'users', uid, 'trades', id));
  }

  async function bulkImportTrades(incoming: Trade[]) {
    const existingKeys = new Set(trades.map(t => `${t.date}|${t.symbol}`));
    const newTrades = incoming.filter(t => !existingKeys.has(`${t.date}|${t.symbol}`));
    for (const chunk of chunkArray(newTrades, 500)) {
      const batch = writeBatch(db);
      for (const t of chunk) batch.set(doc(db, 'users', uid, 'trades', t.id), t);
      await batch.commit();
    }
    return { added: newTrades.length, skipped: incoming.length - newTrades.length };
  }

  async function clearTrades() {
    const snap = await getDocs(collection(db, 'users', uid, 'trades'));
    for (const chunk of chunkArray(snap.docs, 500)) {
      const batch = writeBatch(db);
      for (const d of chunk) batch.delete(d.ref);
      await batch.commit();
    }
  }

  async function addJournalEntry(entry: JournalEntry) {
    await setDoc(doc(db, 'users', uid, 'journal', entry.id), entry);
  }

  async function updateJournalEntry(entry: JournalEntry) {
    await setDoc(doc(db, 'users', uid, 'journal', entry.id), entry);
  }

  async function deleteJournalEntry(id: string) {
    await deleteDoc(doc(db, 'users', uid, 'journal', id));
  }

  async function restoreBackup(newTrades: Trade[], newJournal: JournalEntry[]) {
    // Clear existing
    const [tSnap, jSnap] = await Promise.all([
      getDocs(collection(db, 'users', uid, 'trades')),
      getDocs(collection(db, 'users', uid, 'journal')),
    ]);
    const allDocs = [...tSnap.docs, ...jSnap.docs];
    for (const chunk of chunkArray(allDocs, 500)) {
      const batch = writeBatch(db);
      for (const d of chunk) batch.delete(d.ref);
      await batch.commit();
    }
    // Write new data
    const allNew = [
      ...newTrades.map(t => ({ col: 'trades', id: t.id, data: t })),
      ...newJournal.map(e => ({ col: 'journal', id: e.id, data: e })),
    ];
    for (const chunk of chunkArray(allNew, 500)) {
      const batch = writeBatch(db);
      for (const item of chunk) batch.set(doc(db, 'users', uid, item.col, item.id), item.data);
      await batch.commit();
    }
  }

  return (
    <DataContext.Provider value={{
      trades, journal,
      addTrade, updateTrade, deleteTrade, bulkImportTrades, clearTrades,
      addJournalEntry, updateJournalEntry, deleteJournalEntry, restoreBackup,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
