import type {Campaign} from '../game/campaign';

/** The historical campaign.combat encounter owns the classic combat controls.
 * Never replace those controls with a separate Phase 3 battlefield when stale
 * or concurrent adventure encounter metadata is present on the same save.
 */
export function shouldRenderTacticalBattlefield(campaign:Campaign|null):campaign is Campaign{
 if(!campaign||campaign.combat)return false;
 const session=campaign.adventureSession;
 return Boolean(session?.pendingEncounter?.scenario||(session?.status==='encounter'&&campaign.companionEncounter?.phaseThree));
}
