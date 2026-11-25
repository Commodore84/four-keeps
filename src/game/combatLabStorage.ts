import {isCampaign,type Campaign} from './campaign';
import {isCombatLab} from './combatLab';
import type {CampaignStorage} from './storage';

const PREFIX='four-keeps-combat-lab-session:';

/** A per-adventure disposable mode, not another adventure/campaign.
 * Persist the live combat state outside the real campaign record so *all*
 * normal combat transactions can use the same storage facade safely.
 */
export function createCombatLabSessionStorage(base:CampaignStorage,storage:Pick<Storage,'getItem'|'setItem'|'removeItem'>){
 const labKey=(id:string)=>PREFIX+id;
 const origin=(campaign:Campaign)=>campaign.combatLab?.originCampaignId;
 const facade:CampaignStorage&{
  resumeLab:(campaignId:string)=>Campaign|undefined;
  clearLab:(campaignId:string)=>void;
 }={
  async list(){
   const all=await base.list();
   const parents=new Set(all.filter(c=>!isCombatLab(c)).map(c=>c.id));
   // Migrate older separate test campaign cards, without touching real
   // adventures. Delete a legacy test row only after storage succeeds.
   for(const lab of all.filter(c=>isCombatLab(c))){
    const id=origin(lab);
    if(id&&parents.has(id)){
     try{
      if(!storage.getItem(labKey(id)))storage.setItem(labKey(id),JSON.stringify(lab));
      await base.remove(lab.id);
     }catch(error){console.warn('Unable to migrate legacy Combat Lab session',error);}
    }
   }
   return all.filter(c=>!isCombatLab(c));
  },
  async save(campaign,options){
   const id=origin(campaign);
   if(isCombatLab(campaign)){
    if(!id)throw Error('A practice encounter must belong to an existing adventure.');
    storage.setItem(labKey(id),JSON.stringify(campaign));
    return;
   }
   return base.save(campaign,options);
  },
  get:(id)=>base.get(id),
  async remove(id){
   // Deleting a story campaign also removes its disposable preview.
   storage.removeItem(labKey(id));
   await base.remove(id);
  },
  resumeLab(id){
   try{
    const raw=storage.getItem(labKey(id));
    if(!raw)return undefined;
    const parsed:unknown=JSON.parse(raw);
    return isCampaign(parsed)&&isCombatLab(parsed)&&parsed.combatLab?.originCampaignId===id?parsed:undefined;
   }catch{return undefined;}
  },
  clearLab:(id)=>storage.removeItem(labKey(id))
 };
 return facade;
}
