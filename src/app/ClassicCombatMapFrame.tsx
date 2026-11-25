import {forwardRef,type ComponentPropsWithoutRef} from 'react';

/** Shared map shell lifted from the original combat interface. Both combat
 * rules engines render their own authoritative cells and actions inside it. */
export const ClassicCombatMapFrame=forwardRef<HTMLDivElement,ComponentPropsWithoutRef<'div'>>(function ClassicCombatMapFrame({className='',style,children,...events},ref){
 return <div {...events} ref={ref} className={'relative h-[340px] max-h-[55vh] overflow-hidden rounded-lg border border-white/20 bg-[#19201e] '+className} style={{touchAction:'pan-y',...style}}>{children}</div>;
});
