import {createPortal} from 'react-dom';
import {useLayoutEffect,useState,type ReactNode} from 'react';

/**
 * Relocates the original interactive combat UI without changing its mechanics.
 * Scene hosts can be replaced during saved-campaign restore. Never render into
 * a stale detached node (which leaves a hidden, noninteractive battlefield).
 */
export function ScenePortal({active,targetId,children}:{active:boolean;targetId:string;children:ReactNode}) {
  const [target,setTarget]=useState<HTMLElement|null>(null);
  useLayoutEffect(()=>{
    const live=active?document.getElementById(targetId):null;
    if(target!==live)setTarget(live);
  });
  if(!active)return <>{children}</>;
  return target?.isConnected?createPortal(children,target):null;
}
