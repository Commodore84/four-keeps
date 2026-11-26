/** Personal presentation preferences only. Never modifies authoritative combat state. */
export const sceneActionDefinitions = [
  {id:'attack', label:'Attack'}, {id:'hide',label:'Hide'}, {id:'dash',label:'Dash'},
  {id:'disengage',label:'Disengage'}, {id:'dodge',label:'Dodge'},
  {id:'magic',label:'Magic'}, {id:'steady-aim',label:'Steady Aim'},
  {id:'help',label:'Help'}, {id:'ready',label:'Ready'},
  {id:'search',label:'Search'}, {id:'study',label:'Study'},
  {id:'influence',label:'Influence'}, {id:'utilize',label:'Utilize'}
] as const;
export type SceneActionId = (typeof sceneActionDefinitions)[number]['id'];
export const defaultSceneFavorites: SceneActionId[]=['attack','hide','dash','disengage','magic'];
export type SceneActionPreferences={order:SceneActionId[];favorites:SceneActionId[]};
const ids=new Set<string>(sceneActionDefinitions.map(item=>item.id));
export function sanitizeScenePreferences(value:unknown):SceneActionPreferences {
  const v=value && typeof value==='object'?value as Partial<SceneActionPreferences>:{};
  const valid=(input:unknown):SceneActionId[] => Array.isArray(input)?[...new Set(input.filter((item):item is SceneActionId=>typeof item==='string'&&ids.has(item)))]:[];
  const order=[...valid(v.order),...sceneActionDefinitions.map(item=>item.id).filter(id=>!valid(v.order).includes(id))];
  const favorites=v.favorites===undefined?defaultSceneFavorites:valid(v.favorites);
  return {order,favorites};
}
export function scenePreferencesKey(characterId:string):string {
  return 'four-keeps-scene-actions:'+encodeURIComponent(characterId);
}
export function visibleSceneFavorites(prefs:SceneActionPreferences,available:SceneActionId[],width:number):SceneActionId[] {
  const max=Math.max(1,Math.min(6,Math.floor((Math.max(260,width)-160)/56)));
  return prefs.order.filter(id=>prefs.favorites.includes(id)&&available.includes(id)).slice(0,max);
}
