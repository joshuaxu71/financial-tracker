import {
   type AbstractPowerSyncDatabase,
   BaseObserver,
   type CrudEntry,
   type PowerSyncBackendConnector,
   type PowerSyncCredentials,
   UpdateType,
} from "@powersync/common";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { type SupabaseClient, type User, createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const POWERSYNC_URL = process.env.EXPO_PUBLIC_POWERSYNC_URL!;

// AsyncStorage's web implementation reads `window.localStorage`, which doesn't
// exist during Expo Router's server-side prerender. Guard storage access so the
// auth client never touches the DOM outside the browser.
const isBrowser = () => typeof window !== "undefined";

const authStorage = {
   async getItem(key: string): Promise<string | null> {
      return isBrowser() ? AsyncStorage.getItem(key) : null;
   },
   async setItem(key: string, value: string): Promise<void> {
      if (isBrowser()) await AsyncStorage.setItem(key, value);
   },
   async removeItem(key: string): Promise<void> {
      if (isBrowser()) await AsyncStorage.removeItem(key);
   },
};

export type SupabaseConnectorListener = {
   initialized: () => void;
   sessionChanged: (session: { user: User | null }) => void;
};

/**
 * Bridges Supabase Auth (email + password) and the PowerSync client.
 *
 * fetchCredentials returns the user's Supabase access token so the PowerSync
 * service can authorize against Supabase's JWKS. uploadData pushes local
 * changes to Supabase via the PostgREST client; RLS scopes every write to the
 * signed-in user.
 */
export class SupabaseConnector
   extends BaseObserver<SupabaseConnectorListener>
   implements PowerSyncBackendConnector
{
   readonly client: SupabaseClient;
   ready: boolean;
   currentSession: { user: User | null } | null;

   constructor() {
      super();
      this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
         auth: {
            storage: authStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            flowType: "pkce",
            skipAutoInitialize: true,
         },
      });
      this.ready = false;
      this.currentSession = null;
   }

   async init(): Promise<void> {
      if (this.ready) return;
      const { data } = await this.client.auth.getSession();
      this.currentSession = { user: data.session?.user ?? null };
      this.client.auth.onAuthStateChange((_event, session) => {
         this.currentSession = { user: session?.user ?? null };
         this.iterateListeners((listener) => listener.sessionChanged?.(this.currentSession!));
      });
      this.ready = true;
      this.iterateListeners((listener) => listener.initialized?.());
   }

   async signUp(email: string, password: string): Promise<boolean> {
      const { data, error } = await this.client.auth.signUp({ email, password });
      if (error) throw error;
      return data.session != null;
   }

   async signIn(email: string, password: string): Promise<void> {
      const { error } = await this.client.auth.signInWithPassword({ email, password });
      if (error) throw error;
   }

   async signOut(): Promise<void> {
      await this.client.auth.signOut();
   }

   async fetchCredentials(): Promise<PowerSyncCredentials | null> {
      const { data } = await this.client.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return null;
      return { endpoint: POWERSYNC_URL, token };
   }

   async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
      const batch = await database.getCrudBatch();
      if (!batch) return;

      try {
         for (const entry of batch.crud) {
            await this.uploadEntry(entry);
         }
         await batch.complete();
      } catch (error) {
         if (isFatalResponse(error)) {
            await batch.complete();
            return;
         }
         throw error;
      }
   }

   private async uploadEntry(entry: CrudEntry): Promise<void> {
      if (entry.op === UpdateType.DELETE) {
         const { error } = await this.client.from(entry.table).delete().eq("id", entry.id);
         if (error) throw error;
         return;
      }

      const row = {
         ...(entry.opData ?? {}),
         // Local rows don't carry user_id; RLS scopes by auth.uid(), so stamp it on insert.
         ...(entry.op === UpdateType.PUT
            ? { id: entry.id, user_id: this.currentSession?.user?.id }
            : {}),
      };
      const { error } =
         entry.op === UpdateType.PUT
            ? await this.client.from(entry.table).upsert(row)
            : await this.client.from(entry.table).update(row).eq("id", entry.id);
      if (error) throw error;
   }
}

/** Errors from these PostgREST codes mean the change can never succeed; drop it. */
const FATAL_RESPONSE_CODES = [new RegExp("^22...$"), new RegExp("^23...$"), new RegExp("^42501$")];

function isFatalResponse(error: unknown): boolean {
   const message = error instanceof Error ? error.message : String(error);
   return FATAL_RESPONSE_CODES.some((code) => code.test(message));
}

export const supabaseConnector = new SupabaseConnector();
