import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createPlan, defaultProfile, eligibleRecipes, weekdays, type PlanEntry, type Profile } from '../data/planner';
import {
  apiConfigured,
  createBackendPlanning,
  loadBackendCatalog,
  updateBackendShoppingItem,
  type BackendPlanning,
  type BackendShoppingItem,
} from '../api/client';
import {
  getValidSession,
  loadSession,
  signIn as apiSignIn,
  signOut as apiSignOut,
  signUp as apiSignUp,
  type AuthSession,
} from '../api/auth';

type Preferences = { dark: boolean; reminders: boolean; weekStart: 'Segunda-feira' | 'Domingo'; language?: 'pt-BR' | 'en' | 'es' };
type SavedState = {
  profile: Profile;
  plan: PlanEntry[];
  favorites: string[];
  checked: string[];
  completed: boolean;
  preferences: Preferences;
  remotePlanning: BackendPlanning | null;
  apiError: string | null;
};
type AuthState = { status: 'loading' | 'anonymous' | 'authenticated'; session: AuthSession | null; error: string | null };

const initial: SavedState = {
  profile: defaultProfile,
  plan: [],
  favorites: [],
  checked: [],
  completed: false,
  preferences: { dark: false, reminders: false, weekStart: 'Segunda-feira', language: 'pt-BR' },
  remotePlanning: null,
  apiError: null,
};
const KEY = 'comprasfit:v1';
const backendIds: Record<string, string> = {
  arroz: 'arroz-feijao-frango',
  macarrao: 'macarrao-molho-tomate',
  salada: 'frango-brocolis-arroz',
  vegetais: 'omelete-arroz-legumes',
};
const localIds: Record<string, string> = Object.fromEntries(Object.entries(backendIds).map(([local, backend]) => [backend, local]));

type Store = {
  state: SavedState;
  loaded: boolean;
  storageError: string | null;
  auth: AuthState;
  apiStatus: 'disabled' | 'checking' | 'connected' | 'error';
  updateProfile: (patch: Partial<Profile>) => void;
  generate: (profile?: Profile) => Promise<void>;
  toggleFavorite: (id: string) => void;
  toggleChecked: (id: string) => void;
  swap: (day: string, recipeId: string) => void;
  updatePreferences: (patch: Partial<Preferences>) => void;
  signUp: (name: string, email: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  reset: () => void;
};

const Context = createContext<Store | null>(null);

function isSavedState(value: unknown): value is SavedState {
  if (!value || typeof value !== 'object') return false;
  const s = value as SavedState;
  const remote = s.remotePlanning;
  return typeof s.completed === 'boolean' &&
    typeof s.profile?.name === 'string' &&
    typeof s.profile.people === 'number' && s.profile.people >= 1 &&
    typeof s.profile.budget === 'number' &&
    Array.isArray(s.profile.days) && Array.isArray(s.profile.goals) &&
    Array.isArray(s.profile.restrictions) && Array.isArray(s.profile.appliances) &&
    typeof s.profile.market === 'string' &&
    Array.isArray(s.plan) && s.plan.every(p => typeof p.day === 'string' && typeof p.recipeId === 'string') &&
    Array.isArray(s.favorites) && Array.isArray(s.checked) &&
    typeof s.preferences?.dark === 'boolean' &&
    (remote === undefined || remote === null || (typeof remote.id === 'string' && Array.isArray(remote.shoppingList?.items)));
}

function toLocalPlan(remote: BackendPlanning, profile: Profile): PlanEntry[] {
  const days = profile.days.length ? profile.days : weekdays;
  return remote.meals.map((meal, index) => ({
    day: days[index % days.length]!,
    recipeId: localIds[meal.recipeId] ?? 'arroz',
  }));
}

function planningInput(profile: Profile) {
  const recipeIds = eligibleRecipes(profile)
    .map(recipe => backendIds[recipe.id])
    .filter((id): id is string => Boolean(id));

  return {
    budget: profile.budget,
    periodDays: Math.max(1, profile.days.length),
    people: profile.people,
    mealsPerDay: 1,
    buyingPreference: 'lowest_price' as const,
    vegetarian: profile.restrictions.includes('Vegetariano') || profile.restrictions.includes('Vegano'),
    recipeIds: recipeIds.length ? recipeIds : undefined,
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Não foi possível sincronizar com o backend.';
}

export function AppProvider({ children }: React.PropsWithChildren) {
  const [state, setState] = useState<SavedState>(initial);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [auth, setAuth] = useState<AuthState>({ status: apiConfigured ? 'loading' : 'anonymous', session: null, error: null });
  const [apiStatus, setApiStatus] = useState<'disabled' | 'checking' | 'connected' | 'error'>(apiConfigured ? 'checking' : 'disabled');
  const writes = useRef(Promise.resolve());

  useEffect(() => {
    AsyncStorage.getItem(KEY).then(raw => {
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isSavedState(parsed)) setState({ ...parsed, remotePlanning: parsed.remotePlanning ?? null, apiError: parsed.apiError ?? null });
        else setStorageError('Os dados salvos não puderam ser recuperados. Configure um novo plano.');
      }
    }).catch(() => setStorageError('Não foi possível recuperar os dados deste dispositivo.'))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    writes.current = writes.current.then(() => AsyncStorage.setItem(KEY, JSON.stringify(state)))
      .catch(() => setStorageError('Não foi possível salvar. As mudanças podem ser perdidas ao fechar o app.'));
  }, [state, loaded]);

  useEffect(() => {
    if (!apiConfigured) return;
    let active = true;
    loadBackendCatalog()
      .then(() => { if (active) setApiStatus('connected'); })
      .catch(() => { if (active) setApiStatus('error'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!apiConfigured) return;
    let active = true;
    loadSession().then(async saved => {
      const session = await getValidSession(saved);
      if (active) setAuth({ status: session ? 'authenticated' : 'anonymous', session, error: null });
    }).catch(() => {
      if (active) setAuth({ status: 'anonymous', session: null, error: null });
    });
    return () => { active = false; };
  }, []);

  const toggle = (key: 'favorites' | 'checked', id: string) =>
    setState(s => ({ ...s, [key]: s[key].includes(id) ? s[key].filter(item => item !== id) : [...s[key], id] }));

  const toggleChecked = (id: string) => {
    const remoteItem = state.remotePlanning?.shoppingList.items.find(item => item.id === id);
    const nextPurchased = remoteItem ? !remoteItem.purchased : !state.checked.includes(id);

    setState(s => {
      const remotePlanning = remoteItem && s.remotePlanning ? {
        ...s.remotePlanning,
        shoppingList: {
          ...s.remotePlanning.shoppingList,
          items: s.remotePlanning.shoppingList.items.map(item => item.id === id ? { ...item, purchased: nextPurchased } : item),
        },
      } : s.remotePlanning;
      return {
        ...s,
        checked: remoteItem ? s.checked : (s.checked.includes(id) ? s.checked.filter(item => item !== id) : [...s.checked, id]),
        remotePlanning,
      };
    });

    if (!remoteItem || !state.remotePlanning || !auth.session) return;
    void getValidSession(auth.session).then(session => {
      if (!session) return;
      if (session.access_token !== auth.session?.access_token) {
        setAuth({ status: 'authenticated', session, error: null });
      }
      return updateBackendShoppingItem(state.remotePlanning!.id, id, nextPurchased, session.access_token)
        .then((updated: BackendShoppingItem) => {
          setState(s => s.remotePlanning ? {
            ...s,
            remotePlanning: {
              ...s.remotePlanning,
              shoppingList: {
                ...s.remotePlanning.shoppingList,
                items: s.remotePlanning.shoppingList.items.map(item => item.id === id ? updated : item),
              },
            },
          } : s);
        });
    }).catch(error => setState(s => ({ ...s, apiError: errorMessage(error) })));
  };

  return <Context.Provider value={{
    state,
    loaded,
    storageError,
    auth,
    apiStatus,
    updateProfile: patch => setState(s => ({ ...s, profile: { ...s.profile, ...patch } })),
    generate: async profile => {
      const nextProfile = { ...(profile ?? state.profile), name: (profile ?? state.profile).name.trim() };
      const localPlan = createPlan(nextProfile);
      const session = await getValidSession(auth.session);

      if (session && session.access_token !== auth.session?.access_token) {
        setAuth({ status: 'authenticated', session, error: null });
      }

      if (session && apiConfigured) {
        try {
          const remote = await createBackendPlanning(planningInput(nextProfile), session.access_token);
          setApiStatus('connected');
          setState(s => ({
            ...s,
            profile: nextProfile,
            plan: toLocalPlan(remote, nextProfile),
            remotePlanning: remote,
            checked: [],
            completed: true,
            apiError: null,
          }));
          return;
        } catch (error) {
          setApiStatus('error');
          setState(s => ({ ...s, apiError: errorMessage(error) }));
        }
      }

      setState(s => ({
        ...s,
        profile: nextProfile,
        plan: localPlan,
        remotePlanning: null,
        checked: [],
        completed: true,
      }));
    },
    toggleFavorite: id => toggle('favorites', id),
    toggleChecked,
    swap: (day, recipeId) => setState(s => ({ ...s, plan: s.plan.map(entry => entry.day === day ? { day, recipeId } : entry), checked: [], remotePlanning: null })),
    updatePreferences: patch => setState(s => ({ ...s, preferences: { ...s.preferences, ...patch } })),
    signUp: async (name, email, password) => {
      const result = await apiSignUp(name, email, password);
      if (result.session) {
        setAuth({ status: 'authenticated', session: result.session, error: null });
        setState(s => ({ ...s, profile: { ...s.profile, name: name.trim() } }));
      } else {
        setAuth({ status: 'anonymous', session: null, error: 'Confirme seu e-mail para concluir o cadastro.' });
      }
      return { needsEmailConfirmation: result.needsEmailConfirmation };
    },
    signIn: async (email, password) => {
      const session = await apiSignIn(email, password);
      setAuth({ status: 'authenticated', session, error: null });
      setState(s => ({ ...s, profile: { ...s.profile, name: s.profile.name || email.split('@')[0] } }));
    },
    signOut: async () => {
      await apiSignOut();
      setAuth({ status: 'anonymous', session: null, error: null });
    },
    reset: () => setState(initial),
  }}>{children}</Context.Provider>;
}

export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error('AppProvider is required');
  return value;
}
