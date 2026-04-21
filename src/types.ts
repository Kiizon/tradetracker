export type TradeOutcome = 'win' | 'loss' | 'breakeven';

export interface TradeLeg {
  contracts: number;
  price: number;
}

export interface Trade {
  id: string;
  date: string;
  symbol: string;
  side: 'call' | 'put';
  entries: TradeLeg[];  // scale-in legs
  exits: TradeLeg[];    // partial/full TPs
  // computed and stored for fast display
  avgEntry: number;
  avgExit: number;
  enteredContracts: number;
  exitedContracts: number;
  outcome: TradeOutcome;
  pnl: number;
  notes?: string;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  body: string;
  mood: 1 | 2 | 3 | 4 | 5;
  createdAt: string;
}
