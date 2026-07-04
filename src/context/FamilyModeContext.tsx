/**
 * FamilyModeContext — global state for Family Mode.
 *
 * isEnabled  → persisted (AsyncStorage)
 * isUnlocked → in-memory only; resets every app session for security
 *
 * PINs are stored as SHA-256 hashes (via expo-crypto) — never plaintext.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  FamilyModeSettings,
  getFamilyModeSettings,
  setFamilyModeSettings,
} from '../storage/storage';
import { Movie } from '../api/tmdb';
import { hashPin } from '../utils/pinHash';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FamilyModeContextType {
  /** Whether Family Mode is turned on (persisted). */
  isEnabled: boolean;
  /** Whether the user entered the correct PIN this session. */
  isUnlocked: boolean;
  /** Whether a PIN has been set. */
  hasPin: boolean;
  /** True while loading settings from AsyncStorage on mount. */
  isLoading: boolean;

  /** Enable Family Mode with a new PIN (stored as hash). Also sets isUnlocked = true. */
  enableFamilyMode: (pin: string) => Promise<void>;
  /** Disable Family Mode after verifying PIN. Returns false if PIN is wrong. */
  disableFamilyMode: (pin: string) => Promise<boolean>;
  /** Unlock for this session. Returns false if PIN is wrong. */
  unlock: (pin: string) => Promise<boolean>;
  /** Lock again (in-memory flip, no PIN required). */
  lock: () => void;
  /** Change PIN. Returns false if oldPin doesn't match stored hash. */
  changePin: (oldPin: string, newPin: string) => Promise<boolean>;

  /** Returns true when the movie is flagged as adult content. */
  isAdultContent: (movie: Movie) => boolean;
  /**
   * Filters a movie array.
   * When Family Mode is enabled AND locked, adult movies are removed.
   */
  filterMovies: <T extends Movie>(movies: T[]) => T[];
}

// ── Context ───────────────────────────────────────────────────────────────────

const FamilyModeContext = createContext<FamilyModeContextType | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export const FamilyModeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] = useState<FamilyModeSettings>({
    enabled: false,
    pin: null,
  });
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load persisted settings once on mount
  useEffect(() => {
    (async () => {
      const s = await getFamilyModeSettings();
      setSettings(s);
      setIsLoading(false);
    })();
  }, []);

  const persist = async (next: FamilyModeSettings) => {
    setSettings(next);
    await setFamilyModeSettings(next);
  };

  // ── PIN helpers ────────────────────────────────────────────────────────────

  /** Hash the candidate PIN and compare to the stored hash. */
  const verifyPin = async (candidate: string): Promise<boolean> => {
    if (!settings.pin) return false;
    const h = await hashPin(candidate);
    return h === settings.pin;
  };

  // ── Actions ────────────────────────────────────────────────────────────────

  const enableFamilyMode = async (pin: string) => {
    const h = await hashPin(pin);
    await persist({ enabled: true, pin: h });
    setIsUnlocked(true); // user just set it up — unlock for this session
  };

  const disableFamilyMode = async (pin: string): Promise<boolean> => {
    if (!(await verifyPin(pin))) return false;
    await persist({ enabled: false, pin: null });
    setIsUnlocked(false);
    return true;
  };

  const unlock = async (pin: string): Promise<boolean> => {
    if (!(await verifyPin(pin))) return false;
    setIsUnlocked(true);
    return true;
  };

  const lock = () => setIsUnlocked(false);

  const changePin = async (oldPin: string, newPin: string): Promise<boolean> => {
    if (!(await verifyPin(oldPin))) return false;
    const newHash = await hashPin(newPin);
    await persist({ ...settings, pin: newHash });
    return true;
  };

  // ── Content helpers ────────────────────────────────────────────────────────

  const isAdultContent = useCallback((movie: Movie): boolean => {
    return (movie as any).adult === true;
  }, []);

  const filterMovies = useCallback(
    <T extends Movie>(movies: T[]): T[] => {
      if (!settings.enabled || isUnlocked) return movies;
      return movies.filter(m => !(m as any).adult);
    },
    [settings.enabled, isUnlocked]
  );

  return (
    <FamilyModeContext.Provider
      value={{
        isEnabled: settings.enabled,
        isUnlocked,
        hasPin: settings.pin !== null,
        isLoading,
        enableFamilyMode,
        disableFamilyMode,
        unlock,
        lock,
        changePin,
        isAdultContent,
        filterMovies,
      }}
    >
      {children}
    </FamilyModeContext.Provider>
  );
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useFamilyMode = (): FamilyModeContextType => {
  const ctx = useContext(FamilyModeContext);
  if (!ctx)
    throw new Error('useFamilyMode must be used within a FamilyModeProvider');
  return ctx;
};
