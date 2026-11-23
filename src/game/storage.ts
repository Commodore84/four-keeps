import {expandInventoryPacks} from './equipmentPacks';
import {useOwnedConsumable,type ConsumableRequest} from './consumables';
import {useOwnedHealingPotion,type HealingPotionRequest} from './healingPotions';
import {hydratePlayerState} from './playerState';
import { isCampaign, type Campaign } from './campaign';

export interface CampaignStorage {
  list(): Promise<Campaign[]>;
  save(campaign: Campaign, options?: {replaceExisting?: boolean}): Promise<void>;
  get(id: string): Promise<Campaign | undefined>;
  remove(id: string): Promise<void>;
}
const DATABASE = 'four-keeps-local';
const STORE = 'campaigns';
// Remember the exact persisted state observed by this browser tab. Compare
// inside the IndexedDB readwrite transaction to prevent cross-tab lost updates.
const observedSaves = new Map<string,string>();
const snapshot = (campaign: Campaign) => JSON.stringify(campaign);
const observe = (campaign: Campaign) => { observedSaves.set(campaign.id,snapshot(campaign)); return campaign; };
export type CampaignSaveStatus={state:'saving'|'saved'|'failed';campaignId:string;message?:string};
const saveStatusListeners=new Set<(status:CampaignSaveStatus)=>void>();
export function subscribeCampaignSaveStatus(listener:(status:CampaignSaveStatus)=>void):()=>void{
 saveStatusListeners.add(listener);return ()=>{saveStatusListeners.delete(listener)};
}
function publishSaveStatus(status:CampaignSaveStatus){for(const listener of saveStatusListeners)listener(status)}
export class StaleCampaignSaveError extends Error {
  constructor(){super('This adventure changed in another tab. Reload the app before saving to avoid overwriting newer progress.');this.name='StaleCampaignSaveError';}
}

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
        if(mode==='readwrite' && isCampaign(result))observe(result);
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
/** Reconcile legacy saved pack entries on read; preserve the original save until its next write. */
function reconcileSavedPacks(campaign:Campaign):Campaign{
 const ledger=campaign.inventoryLedger;
 if(!ledger)return campaign;
 const gear=expandInventoryPacks(ledger.gear);
 if(gear.length===ledger.gear.length&&gear.every((entry,i)=>entry.name===ledger.gear[i].name&&entry.quantity===ledger.gear[i].quantity))return campaign;
 return {...campaign,inventoryLedger:{...ledger,gear}};
}
export const localCampaignStorage: CampaignStorage = {
  async list() {
    const values = await transact<unknown[]>('readonly', (store, resolve, reject) => requestResult(store.getAll(), resolve, reject));
    return values.filter(isCampaign).map(observe).map(reconcileSavedPacks).map(hydratePlayerState).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  async get(id) {
    const value = await transact<unknown>('readonly', (store, resolve, reject) => requestResult(store.get(id), resolve, reject));
    return isCampaign(value) ? hydratePlayerState(reconcileSavedPacks(observe(value))) : undefined;
  },
  async save(campaign, options) {
    if (!isCampaign(campaign)) throw new Error('Invalid campaign data');
    publishSaveStatus({state:'saving',campaignId:campaign.id});
    try {
    const expected = observedSaves.get(campaign.id);
    await transact<void>('readwrite', (store, resolve, reject) => {
      const read=store.get(campaign.id);
      read.onerror=()=>reject(read.error??new Error('Campaign lookup failed'));
      read.onsuccess=()=>{
        try {
          const persisted=read.result;
          if(!options?.replaceExisting && persisted !== undefined &&
            (expected === undefined || !isCampaign(persisted) || snapshot(persisted)!==expected)) {
            throw new StaleCampaignSaveError();
          }
          requestResult(store.put(campaign),()=>resolve(),reject);
        }catch(error){reject(error instanceof Error?error:new Error(String(error)))}
      };
    });
    observe(campaign);
    publishSaveStatus({state:'saved',campaignId:campaign.id});
    } catch(error) {
      publishSaveStatus({state:'failed',campaignId:campaign.id,message:error instanceof Error?error.message:String(error)});
      throw error;
    }
  },
  async remove(id) {
    await transact<void>('readwrite', (store, resolve, reject) => requestResult(store.delete(id), () => resolve(), reject));
    observedSaves.delete(id);
  },
};

/** Atomic read/validate/update: retries with the same request ID return the saved result. */
export async function commitHealingPotionUse(id:string,request:HealingPotionRequest):Promise<Campaign>{
 return transact<Campaign>('readwrite',(store,resolve,reject)=>{
  const read=store.get(id);
  read.onerror=()=>reject(read.error??new Error('Campaign lookup failed'));
  read.onsuccess=()=>{
   try{
    if(!isCampaign(read.result))throw Error('Campaign not found');
    const current=hydratePlayerState(read.result);
    const next=useOwnedHealingPotion(current,request);
    if(next===current){resolve(current);return}
    const put=store.put(next);
    requestResult(put,()=>resolve(next),reject);
   }catch(error){reject(error instanceof Error?error:new Error(String(error)))}
  };
 });
}

export async function commitConsumableUse(id:string,request:ConsumableRequest):Promise<Campaign>{
 return transact<Campaign>('readwrite',(store,resolve,reject)=>{
  const read=store.get(id);
  read.onerror=()=>reject(read.error??new Error('Campaign lookup failed'));
  read.onsuccess=()=>{
   try{
    if(!isCampaign(read.result))throw Error('Campaign not found');
    const current=hydratePlayerState(read.result),next=useOwnedConsumable(current,request);
    if(next===current){resolve(current);return}
    requestResult(store.put(next),()=>resolve(next),reject);
   }catch(error){reject(error instanceof Error?error:new Error(String(error)))}
  };
 });
}
