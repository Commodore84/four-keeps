import {OFFICIAL_EQUIPMENT_2024} from './officialEquipment2024';

/** Each bundle is a shop offer, not a separate inventory container. */
const PACK_CONTENTS:Record<string,readonly (readonly [string,number])[]>={
 'burglar-s-pack':[['backpack',1],['ball-bearings',1],['bell',1],['candle',10],['crowbar',1],['lantern-hooded',1],['oil',7],['rations',5],['rope',1],['tinderbox',1],['waterskin',1]],
 'diplomat-s-pack':[['chest',1],['clothes-fine',1],['ink',1],['ink-pen',5],['lamp',1],['case-map-or-scroll',2],['oil',4],['paper',5],['parchment',5],['perfume',1],['tinderbox',1]],
 'dungeoneer-s-pack':[['backpack',1],['caltrops',1],['crowbar',1],['oil',2],['rations',10],['rope',1],['tinderbox',1],['torch',10],['waterskin',1]],
 'entertainer-s-pack':[['backpack',1],['bedroll',1],['bell',1],['lantern-bullseye',1],['costume',3],['mirror',1],['oil',8],['rations',9],['tinderbox',1],['waterskin',1]],
 'explorer-s-pack':[['backpack',1],['bedroll',1],['oil',2],['rations',10],['rope',1],['tinderbox',1],['torch',10],['waterskin',1]],
 'priest-s-pack':[['backpack',1],['blanket',1],['holy-water',1],['lamp',1],['rations',7],['robe',1],['tinderbox',1]],
 'scholar-s-pack':[['backpack',1],['book',1],['ink',1],['ink-pen',1],['lamp',1],['oil',10],['parchment',10],['tinderbox',1]],
};
export function equipmentPackContents(id:string){
 const contents=PACK_CONTENTS[id];
 if(!contents)return null;
 return contents.map(([itemId,quantity])=>{
  const item=OFFICIAL_EQUIPMENT_2024.find(item=>item.id===itemId);
  if(!item)throw new Error('Missing official equipment for pack: '+id+' / '+itemId);
  return {item,quantity};
 });
}
export function equipmentPackIndividualValue(id:string):number|null{
 const contents=equipmentPackContents(id);
 return contents?contents.reduce((total,{item,quantity})=>total+item.costCp*quantity,0):null;
}

/** Summarize items contributed by packs in a cart without adding them as separate purchases. */
export function packCartContents(cart:Readonly<Record<string,number>>):Map<string,{quantity:number;packs:string[]}>{
 const result=new Map<string,{quantity:number;packs:string[]}>();
 for(const [packId,count] of Object.entries(cart)){
  if(!Number.isSafeInteger(count)||count<=0)continue;
  const contents=equipmentPackContents(packId);
  if(!contents)continue;
  const pack=OFFICIAL_EQUIPMENT_2024.find(item=>item.id===packId);
  for(const {item,quantity} of contents){
   const previous=result.get(item.id);
   result.set(item.id,{quantity:(previous?.quantity??0)+quantity*count,packs:[...(previous?.packs??[]),`${pack?.name??packId}${count>1?' ×'+count:''}`]});
  }
 }
 return result;
}
