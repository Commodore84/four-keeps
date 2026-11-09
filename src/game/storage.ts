import { isCampaign, type Campaign } from './campaign';

export interface CampaignStorage {
  list(): Promise<Campaign[]>;
  save(campaign: Campaign): Promise<void>;
  get(id: string): Promise<Campaign | undefined>;
  remove(id: string): Promise<void>;
}
const DATABASE = 'four-keeps-local';
const STORE = 'campaigns';
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local saves'));
    request.onblocked = () => reject(new Error('Local saves are blocked by another open tab'));
  });
}
async function transact<T>(mode: IDBTransactionMode, execute: (store: IDBObjectStore, resolve: (value: T) => void, reject: (error: Error) => void) => void): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    let resultReady = false;
    let transactionComplete = false;
    let result: T;
    const fail = (error: Error) => { if (!settled) { settled = true; db.close(); reject(error); } };
    const finish = () => {
      if (!settled && resultReady && transactionComplete) {
        settled = true;
        db.close();
        resolve(result);
      }
    };
    const done = (value: T) => { result = value; resultReady = true; finish(); };
    try {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      tx.oncomplete = () => { transactionComplete = true; finish(); };
      tx.onabort = () => fail(tx.error ?? new Error('Local save transaction aborted'));
      tx.onerror = () => fail(tx.error ?? new Error('Local save transaction failed'));
      execute(store, done, fail);
    } catch (error) { fail(error instanceof Error ? error : new Error(String(error))); }
  });
}
function requestResult<T>(request: IDBRequest<T>, resolve: (value: T) => void, reject: (error: Error) => void) {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error('Local save request failed'));
}
export const localCampaignStorage: CampaignStorage = {
  async list() {
    const values = await transact<unknown[]>('readonly', (store, resolve, reject) => requestResult(store.getAll(), resolve, reject));
    return values.filter(isCampaign).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  async get(id) {
    const value = await transact<unknown>('readonly', (store, resolve, reject) => requestResult(store.get(id), resolve, reject));
    return isCampaign(value) ? value : undefined;
  },
  async save(campaign) {
    if (!isCampaign(campaign)) throw new Error('Invalid campaign data');
    await transact<void>('readwrite', (store, resolve, reject) => {
      const request = store.put(campaign);
      requestResult(request, () => resolve(), reject);
    });
  },
  async remove(id) {
    await transact<void>('readwrite', (store, resolve, reject) => requestResult(store.delete(id), () => resolve(), reject));
  },
};
