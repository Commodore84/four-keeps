import {battlefieldObjectCover,type Battlefield,type BattlefieldObject,type BattlefieldObjectKind} from './battlefield';

/** Suggested object AC and HP from 2024 core rules, fixed at the published average.
 * The DM may override the substance/remaining HP on individual fixtures. */
export const fixtureMaterials={
 glass:{ac:13},wood:{ac:15},stone:{ac:17},iron:{ac:19}
} as const;
export const fixtureDefaultMaterial=(kind:BattlefieldObjectKind)=>kind==='window'?'glass':kind==='wall'||kind==='pillar'||kind==='rock'||kind==='statue'?'stone':kind==='cargo'?'iron':'wood';
export function fixtureStats(object:BattlefieldObject){
 const material=object.material??fixtureDefaultMaterial(object.kind);
 const ac=fixtureMaterials[material].ac;
 // DMG 2024 common doors: wooden 18, stone 40, metal 72, glass 4.
 // The default window is a fragile medium glass section (4 HP).
 const hp=object.hp??(object.kind==='window'?4:material==='iron'?72:material==='stone'?40:material==='glass'?4:18);
 const forceDC=object.forceDC??(material==='glass'?10:material==='iron'?25:material==='stone'?20:15);
 return {material,ac,hp,forceDC,lockDC:object.lockDC??15,lockComplexity:object.lockComplexity??'simple'};
}
function update(map:Battlefield,id:string,change:(object:BattlefieldObject)=>BattlefieldObject):Battlefield{
 return {...map,objects:map.objects.map(o=>o.id===id?change(o):o)};
}
function fixture(map:Battlefield,id:string):BattlefieldObject{
 const o=map.objects.find(o=>o.id===id);
 if(!o||!['door','window','crate','cargo','table'].includes(o.kind))throw Error('Select a breakable fixture.');
 if(o.destroyed)throw Error('This fixture is already destroyed.');
 return o;
}
export type FixtureResolution={map:Battlefield;success:boolean;detail:string;dc?:number;hp?:number};
/** Pure deterministic Utilize checks; the d20 test and modifiers are supplied by the campaign rules. */
export function attemptFixtureCheck(map:Battlefield,id:string,mode:'pick'|'force',total:number,naturalRoll?:number):FixtureResolution{
 if(!Number.isSafeInteger(total)||total< -30||total>100||naturalRoll!==undefined&&(!Number.isSafeInteger(naturalRoll)||naturalRoll<1||naturalRoll>20))throw Error('Invalid check total.');
 const checkSuccess=(dc:number)=>naturalRoll===20||naturalRoll!==1&&total>=dc;
 const o=fixture(map,id);
 if(o.kind!=='door'&&o.kind!=='window')throw Error('This fixture has no lock or opening.');
 const stats=fixtureStats(o);
 if(o.open)throw Error('The fixture is already open.');
 if(mode==='pick'&&!o.locked)throw Error('The fixture is not locked.');
 if(mode==='pick'){
  if(o.lockComplexity==='complex'&&(o.lockProgress??0)<9){
   const count=(o.lockProgress??0)+1;
   return {map:update(map,id,old=>({...old,lockProgress:count})),success:false,detail:'Complex lock: '+count+'/10 Utilize actions completed; no check yet.',dc:stats.lockDC};
  }
  const success=checkSuccess(stats.lockDC);
  return {map:update(map,id,old=>{const {lockProgress:previous,...rest}=old;void previous;return {...rest,locked:!success,...(!success&&o.lockComplexity==='complex'?{lockProgress:0}:{})};}),success,dc:stats.lockDC,detail:success?'Lock picked. The fixture may now be opened with an object interaction.':'Lock-picking check failed.'};
 }
 const success=checkSuccess(stats.forceDC);
 return {map:success?update(map,id,old=>({...old,locked:false,open:true})):map,success,dc:stats.forceDC,
 detail:success?'The fixture was forced open.':'The fixture resisted the force.'};
}
/** A weapon attack against an object consumes an Attack action. 2024 objects
 * have immunity to Poison and Psychic damage; their physical cover remains
 * until the last Hit Point is removed. */
export function strikeBattlefieldFixture(map:Battlefield,id:string,attackTotal:number,damage:number,damageType:string,naturalRoll?:number):FixtureResolution{
 if(!Number.isSafeInteger(attackTotal)||attackTotal< -30||attackTotal>100||!Number.isSafeInteger(damage)||damage<0||damage>1000||naturalRoll!==undefined&&(!Number.isSafeInteger(naturalRoll)||naturalRoll<1||naturalRoll>20))throw Error('Invalid attack against object.');
 const o=fixture(map,id),stats=fixtureStats(o);
 if(o.kind==='door'&&o.open)throw Error('The door is already open; move through it.');
 const hit=naturalRoll===20||naturalRoll!==1&&attackTotal>=stats.ac;
 const immune=damageType==='poison'||damageType==='psychic';
 const applied=hit&&!immune?damage:0;
 const hp=Math.max(0,stats.hp-applied),destroyed=hp===0;
 const next=hit?update(map,id,old=>{
  const {lockProgress:previous,...rest}=old;
  const opening=old.kind==='door'||old.kind==='window';
  return {...rest,hp,destroyed,
   ...(opening&&(destroyed||old.locked!==undefined)?{locked:destroyed?false:old.locked}:{}),
   ...(opening&&(destroyed||old.open!==undefined)?{open:destroyed?false:old.open}:{}),
   ...(!destroyed&&previous!==undefined?{lockProgress:previous}:{})};
 }):map;
 return {map:next,success:hit,dc:stats.ac,hp,
 detail:!hit?'Attack missed the fixture.':immune?'The object is immune to '+damageType+' damage.':
 destroyed?'The '+o.kind+' was destroyed; its cover is gone.':
 'The '+o.kind+' takes '+applied+' damage ('+hp+' HP remaining).'};
}
/** Compact UI can report physical effect without using artwork as game state. */
export const fixtureIsCover=(o:BattlefieldObject)=>battlefieldObjectCover(o)!==0;
