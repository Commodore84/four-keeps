/** App-wide hamburger navigation order, stored on this device (not per campaign). */
export const NAVIGATION_TAB_IDS = [
  'home','adventure','party','bastion','journal','magic-items','map','settings','development',
] as const;
export type NavigationTabId = typeof NAVIGATION_TAB_IDS[number];
export const NAVIGATION_ORDER_STORAGE_KEY = 'four-keeps-navigation-order:v1';

/** Preserve valid choices and append newly introduced tabs after an app upgrade. */
export function sanitizeNavigationOrder(value: unknown): NavigationTabId[] {
  const result:NavigationTabId[]=[];
  const known:ReadonlySet<string>=new Set(NAVIGATION_TAB_IDS);
  const seen=new Set<string>();
  if(Array.isArray(value)){
    for(const id of value){
      if(typeof id==='string'&&known.has(id)&&!seen.has(id)){
        seen.add(id);
        result.push(id as NavigationTabId);
      }
    }
  }
  for(const id of NAVIGATION_TAB_IDS)if(!seen.has(id))result.push(id);
  return result;
}

export function moveNavigationItem(value:unknown,id:NavigationTabId,direction:-1|1):NavigationTabId[]{
  const order=sanitizeNavigationOrder(value);
  const index=order.indexOf(id),neighbor=index+direction;
  if(index<0||neighbor<0||neighbor>=order.length)return order;
  [order[index],order[neighbor]]=[order[neighbor],order[index]];
  return order;
}
