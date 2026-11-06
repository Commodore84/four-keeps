  const knockedOut=hp===0;
  next={...next,enemyReactionUsed:pending.enemyId==='second'?c.enemyReactionUsed:true,secondEnemyReactionUsed:pending.enemyId==='second'?true:c.secondEnemyReactionUsed,playerOpportunity:undefined};
  if(knockedOut){next.status='completed';next.outcome='player-defeated';}
  detail='Enemy '+(pending.enemyId==='second'?'2':'1')+' spends its Reaction. Nighthawk has '+hp+' HP.'+(knockedOut?' Nighthawk falls unconscious at square ('+((pending.from.x)+1)+','+((pending.from.y)+1)+').':' Nighthawk resumes movement.');
  if(!knockedOut&&pending.route&&pending.routeIndex!==undefined){
   const resumed=advanceTacticalMovement({...campaign,character,combat:next},pending.route,pending.routeIndex,now);
   return {...resumed,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:detail,createdAt:now},...resumed.journal.slice(campaign.journal.length)]};
  }
  if(!knockedOut){next.playerPosition=pending.to;next.movementUsed=(c.movementUsed??0)+pending.cost;}

 }
 return {...campaign,character,combat:next,updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:detail,createdAt:now}]};
}

export function takeDuelTurnAction(campaign:Campaign, action:'move'|'attack'|'throw-dagger'|'shortbow'|'dash'|'disengage'|'dodge'|'steady-aim'|'cunning-dash'|'cunning-disengage'|'end'):Campaign {
 const combat=campaign.combat;
 if(!combat||combat.status!=='initiative-set'||!combat.order)throw Error('Initiative must be completed first.');
 const current=combat.order[combat.turnIndex??0];
 if(current!=='Nighthawk')throw Error('It is not Nighthawk\'s turn.');
 const next={...combat};let description='';
 const speed=35;
 if(action==='cunning-dash'||action==='cunning-disengage'){
   if(next.bonusActionUsed)throw Error('Bonus action already used this turn.');
   next.bonusActionUsed=true;
   if(action==='cunning-dash'){next.movementAllowance=(next.movementAllowance??speed)+speed;description='Nighthawk uses Cunning Action: Dash as a bonus action. Movement allowance: '+next.movementAllowance+' feet.';}
   else{next.disengaged=true;description='Nighthawk uses Cunning Action: Disengage as a bonus action. Opportunity attacks are avoided for the rest of this turn.';}
 }else if(action==='steady-aim'){
   if(next.bonusActionUsed||next.movementUsed)throw Error('Steady Aim requires no movement this turn and an available bonus action.');
   next.bonusActionUsed=true;next.steadyAim=true;description='Nighthawk uses Steady Aim. The next attack this turn has advantage; movement is unavailable this turn.';
 }else if(action==='move'){
   if(next.steadyAim)throw Error('Steady Aim prevents movement this turn.');
   const allowance=next.movementAllowance??speed;
   if((next.movementUsed??0)>=allowance)throw Error('No movement remaining.');
   next.movementUsed=Math.min(allowance,(next.movementUsed??0)+5);
   description='Nighthawk moves 5 feet ('+next.movementUsed+'/'+allowance+' feet).';
 }else if(action==='end'){
   const turn=nextActiveTurn(combat);next.turnIndex=turn.index;next.round=turn.round;next.lastShoveSave=undefined;next.lastPlayerShoveSave=undefined;next.lastGrappleResult=undefined;next.lastPlayerGrappleResult=undefined;next.movementUsed=0;next.actionUsed=false;next.bonusActionUsed=false;next.attack=undefined;next.steadyAim=false;next.movementAllowance=speed;next.disengaged=false;next.sneakAttackUsedThisTurn=false;
   description='Nighthawk ends their turn. '+combat.order[next.turnIndex]+' is next.';
 }else {
   if(next.actionUsed)throw Error('Action already used this turn.');
   next.actionUsed=true;
   if(action==='dash'){next.lastAction='Dash';next.movementAllowance=(next.movementAllowance??speed)+speed;description='Nighthawk Dashes, gaining another '+speed+' feet of movement this turn.';}
   if(action==='disengage'){next.lastAction='Disengage';next.disengaged=true;description='Nighthawk takes the Disengage action.';}
   if(action==='dodge'){next.lastAction='Dodge';description='Nighthawk takes the Dodge action.';}
   if(action==='attack'||action==='throw-dagger'||action==='shortbow'){
    const p=next.playerPosition??{x:1,y:3},e=next.selectedEnemy==='second'&&next.secondEnemy?next.secondEnemy.position:next.enemyPosition??{x:5,y:3};
    const distance=5*Math.max(Math.abs(p.x-e.x),Math.abs(p.y-e.y));
    const thrown=action==='throw-dagger',bow=action==='shortbow';
    if(action==='attack'&&distance>5)throw Error('Dagger melee requires an adjacent enemy.');
    if(thrown&&distance>60)throw Error('Thrown dagger is out of range (60 ft maximum).');
    if((thrown||action==='attack')&&(next.daggersAvailable??2)<1)throw Error('No dagger available. Recover a thrown dagger after the encounter.');
    if(bow&&distance>320)throw Error('Shortbow is out of range (320 ft maximum).');
    if(bow&&(next.arrowsRemaining??20)<1)throw Error('No arrows remaining.');
    next.lastAction=bow?'Shortbow':thrown?'Thrown Dagger':'Dagger';
    next.attack={phase:'roll-to-hit',weapon:bow?'shortbow':'dagger',thrown,disadvantage:(bow||thrown)&&(distance<=5||distance>(bow?80:20))};
    description='Nighthawk prepares '+(bow?'a shortbow shot':thrown?'a thrown dagger':'a melee dagger strike')+' at '+distance+' feet. Roll to hit next.';
  }
 }
 const now=new Date().toISOString();
 return {...campaign,combat:next,updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:description,createdAt:now}]};
}

export function beginEnemyGrapple(campaign:Campaign):Campaign {
 const c=campaign.combat;
 if(!c||c.status!=='initiative-set'||c.order?.[c.turnIndex??0]==='Nighthawk')throw Error('Enemy Grapple requires the enemy turn.');
 if(c.pendingEnemyShove||c.pendingEnemyGrapple)throw Error('Resolve the pending save first.');
 const p=c.playerPosition??{x:2,y:4},e=c.enemyPosition??{x:6,y:4};
 if(Math.max(Math.abs(p.x-e.x),Math.abs(p.y-e.y))>1)throw Error('Enemy must be within 5 feet to Grapple.');
 return {...campaign,combat:{...c,pendingEnemyGrapple:true,lastPlayerGrappleResult:undefined}};
}
export function rollPlayerGrappleSave(campaign:Campaign,ability:'str'|'dex'):Campaign {
 const c=campaign.combat;
 if(!c?.pendingEnemyGrapple||!c.order||c.order[c.turnIndex??0]==='Nighthawk')throw Error('No enemy Grapple save pending.');
 const character=campaign.character??prototypeNighthawk;
 const modifier=abilityModifier(character.scores[ability])+(ability==='dex'?character.proficiencyBonus:0);
 const roll=crypto.getRandomValues(new Uint32Array(1))[0]%20+1;
 const total=roll+modifier,passed=total>=12;
 const detail='Enemy Grapple: '+(ability==='str'?'Strength':'Dexterity')+' save d20 '+roll+' '+(modifier>=0?'+ ':'- ')+Math.abs(modifier)+' = '+total+' vs DC 12. '+(passed?'Success: not Grappled.':'Failure: Grappled (Speed 0).');
 const now=new Date().toISOString();
 const nextRound=c.order[0]==='Nighthawk'?c.round+1:c.round;
 return {...campaign,combat:{...c,pendingEnemyGrapple:false,playerGrappled:!passed,lastPlayerGrappleResult:detail,turnIndex:c.order.indexOf('Nighthawk'),round:nextRound,movementUsed:0,actionUsed:false,bonusActionUsed:false,attack:undefined},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:detail,createdAt:now}]};
}
export function beginPlayerGrappleEscape(campaign:Campaign):Campaign {
 const c=campaign.combat;
 if(!c||c.order?.[c.turnIndex??0]!=='Nighthawk'||!c.playerGrappled||c.actionUsed||c.attack)throw Error('Escaping requires your available action while Grappled.');
 return {...campaign,combat:{...c,pendingPlayerEscape:true}};
}
export function rollPlayerGrappleEscape(campaign:Campaign,ability:'str'|'dex'):Campaign {
 const c=campaign.combat;
 if(!c?.pendingPlayerEscape||!c.playerGrappled||c.order?.[c.turnIndex??0]!=='Nighthawk')throw Error('No Grapple escape check pending.');
 const character=campaign.character??prototypeNighthawk;
 const proficient=character.proficientSkills.includes(ability==='str'?'Athletics':'Acrobatics');
 const modifier=abilityModifier(character.scores[ability])+(proficient?character.proficiencyBonus:0);
 const roll=crypto.getRandomValues(new Uint32Array(1))[0]%20+1;
 const total=roll+modifier,passed=total>=12;
 const detail='Grapple escape '+(ability==='str'?'Athletics':'Acrobatics')+' check: d20 '+roll+' '+(modifier>=0?'+ ':'- ')+Math.abs(modifier)+' = '+total+' vs DC 12. '+(passed?'Success: Grapple ends.':'Failure: still Grappled.');
 const now=new Date().toISOString();
 return {...campaign,combat:{...c,pendingPlayerEscape:false,playerGrappled:!passed,actionUsed:true,lastAction:'Escape Grapple',lastPlayerGrappleResult:detail},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:detail,createdAt:now}]};
}
export function beginEnemyShove(campaign:Campaign):Campaign {
 const c=campaign.combat;
 if(!c||c.status!=='initiative-set'||c.order?.[c.turnIndex??0]==='Nighthawk')throw Error('Enemy Shove requires the enemy turn.');
 if(c.pendingEnemyShove)throw Error('Resolve the pending saving throw.');
 const p=c.playerPosition??{x:2,y:4},e=c.enemyPosition??{x:6,y:4};
 if(Math.max(Math.abs(p.x-e.x),Math.abs(p.y-e.y))>1)throw Error('Enemy must be within 5 feet to Shove. Move Nighthawk adjacent first.');
 return {...campaign,combat:{...c,pendingEnemyShove:true,lastPlayerShoveSave:undefined}};
}
export function rollPlayerShoveSave(campaign:Campaign,ability:'str'|'dex'):Campaign {
 const c=campaign.combat;
 if(!c?.pendingEnemyShove||!c.order||c.order[c.turnIndex??0]==='Nighthawk')throw Error('No enemy Shove save pending.');
 const character=campaign.character??prototypeNighthawk;
 const modifier=abilityModifier(character.scores[ability])+(ability==='dex'?character.proficiencyBonus:0);
 const roll=crypto.getRandomValues(new Uint32Array(1))[0]%20+1;
 const dc=12; // Temporary dummy STR +2 and proficiency +2.
 const total=roll+modifier;
 const passed=total>=dc;
 const detail='Enemy Shove: Nighthawk '+(ability==='str'?'Strength':'Dexterity')+' save d20 '+roll+' '+(modifier>=0?'+ ':'- ')+Math.abs(modifier)+' = '+total+' vs DC '+dc+'. '+(passed?'Success: remains standing.':'Failure: knocked Prone.');
 const now=new Date().toISOString();
 const nextRound=c.order[0]==='Nighthawk'?c.round+1:c.round;
 return {...campaign,combat:{...c,pendingEnemyShove:false,playerProne:passed?!!c.playerProne:true,lastPlayerShoveSave:detail,turnIndex:c.order.indexOf('Nighthawk'),round:nextRound,movementUsed:0,actionUsed:false,bonusActionUsed:false,attack:undefined,enemyProne:false},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:detail,createdAt:now}]};
}
export function standNighthawk(campaign:Campaign):Campaign {
 const c=campaign.combat;
 if(!c||c.order?.[c.turnIndex??0]!=='Nighthawk'||!c.playerProne)throw Error('You must be Prone on your turn to stand.');
 if(c.playerGrappled)throw Error('Grappled: Speed 0. Escape before standing.');
 const cost=15; // Grid standing cost.
 if((c.movementUsed??0)+cost>(c.movementAllowance??35))throw Error('Not enough movement to stand.');
 const now=new Date().toISOString();
 const detail='Nighthawk stands up, spending 15 feet of movement. '+((c.movementAllowance??35)-(c.movementUsed??0)-cost)+' feet remaining.';
 return {...campaign,combat:{...c,playerProne:false,movementUsed:(c.movementUsed??0)+cost},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:detail,createdAt:now}]};
}
export function resolveDuelEnemyTurn(campaign:Campaign):Campaign {
 const combat=campaign.combat;
 if(!combat||combat.status!=='initiative-set'||!combat.order||combat.order[combat.turnIndex??0]==='Nighthawk')throw Error('It is not the opponent\'s turn.');
 if(combat.opportunity)throw Error('Resolve the opportunity attack before continuing.');
 if(combat.pendingEnemyShove)throw Error('Resolve the pending Shove save first.');
 const currentName=combat.order[combat.turnIndex??0];
 if(currentName===combat.enemyName&&(combat.enemyHp??12)===0||currentName===combat.secondEnemy?.name&&combat.secondEnemy?.hp===0)throw Error('Defeated enemies cannot act.');
 const secondEnemyTurn=currentName===combat.secondEnemy?.name;
 const startingPosition=secondEnemyTurn?combat.secondEnemy!.position:combat.enemyPosition??{x:6,y:4};
 const playerPosition=combat.playerPosition??{x:2,y:4};
 const otherPosition=secondEnemyTurn?(combat.enemyHp??12)>0?combat.enemyPosition:undefined:combat.secondEnemy&&combat.secondEnemy.hp>0?combat.secondEnemy.position:undefined;
 const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
 const isBlocked=(p:{x:number;y:number})=>p.x<0||p.x>=trainingMapSize||p.y<0||p.y>=trainingMapSize||isTrainingPillar(p.x,p.y)||p.x===playerPosition.x&&p.y===playerPosition.y||!!otherPosition&&p.x===otherPosition.x&&p.y===otherPosition.y;
 const standing=!!(secondEnemyTurn?combat.secondEnemy?.prone:combat.enemyProne);
 const grappled=!!(secondEnemyTurn?combat.secondEnemy?.grappled:combat.enemyGrappled);
 const speed=grappled?0:standing?1:2; // Training-only: slow dummies allow ranged testing.
 let position={...startingPosition};
 // Move at most Speed/5 squares along a shortest walkable route.
 const queue=[{pos:startingPosition,steps:0}],seen=new Set([startingPosition.x+','+startingPosition.y]);
 let best={pos:startingPosition,steps:0};
 for(let head=0;head<queue.length;head++){
  const node=queue[head];
  if(distance(node.pos,playerPosition)<distance(best.pos,playerPosition))best=node;
  if(distance(node.pos,playerPosition)<=1){best=node;break;}
  if(node.steps>=speed)continue;
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
   if(!dx&&!dy)continue;
   const pos={x:node.pos.x+dx,y:node.pos.y+dy},key=pos.x+','+pos.y;
   if(!seen.has(key)&&!isBlocked(pos)){seen.add(key);queue.push({pos,steps:node.steps+1});}
  }
 }
 position=best.pos;
 const inReach=distance(position,playerPosition)<=1;
 const standDescription=(standing?'Enemy stands from Prone, spending 15 feet of movement. ':'')+(best.steps?'Moves '+best.steps*5+' feet to ('+(position.x+1)+', '+(position.y+1)+'). ':'')+(!inReach?'Cannot reach Nighthawk; no melee attack. ':'');

 const character=campaign.character??prototypeNighthawk;
 const die=(sides:number)=>crypto.getRandomValues(new Uint32Array(1))[0]%sides+1;
 const first=inReach?die(20):0;
 const dodging=combat.lastAction==='Dodge'||!!combat.playerHidden;
 const second=dodging?die(20):undefined;
 const attackRoll=second===undefined?first:Math.min(first,second);
 const total=attackRoll+4;
 const ac=14; // Temporary training AC; replace with equipment-derived AC later.
 const hit=inReach&&(attackRoll===20||(attackRoll!==1&&total>=ac));
 const critical=attackRoll===20;
 const damage=hit?die(2)+(critical?die(2):0):0; // Training-only: light practice strikes.
 const before=character.currentHitPoints??character.maxHitPoints??10;
 const after=Math.max(0,before-damage);
 const defeated=hit&&after===0;
 const detail=standDescription+(combat.order[combat.turnIndex??0]??combat.enemyName)+(inReach?' training attack: ':' waits out of range. ')+(inReach?(dodging?'disadvantage ('+first+', '+second+') → ':'d20 ')+attackRoll+' + 4 = '+total+' vs temporary AC '+ac+': '+(hit?'HIT':'MISS')+'.'+(hit?' Nonlethal damage: '+damage+'. Nighthawk HP: '+before+' → '+after+'/'+(character.maxHitPoints??10)+'.':'')+(defeated?' Nighthawk is knocked unconscious; sparring ends.':''):'');
 const turn=nextActiveTurn(combat);
 const followingIndex=turn.index;
 const nextRound=turn.round;
 const nextCombat={...combat,enemyPosition:secondEnemyTurn?combat.enemyPosition:position,secondEnemy:secondEnemyTurn&&combat.secondEnemy?{...combat.secondEnemy,position,prone:false}:combat.secondEnemy,enemyProne:secondEnemyTurn?combat.enemyProne:false,turnIndex:followingIndex,round:nextRound,reactionUsed:false,enemyReactionUsed:secondEnemyTurn?combat.enemyReactionUsed:false,secondEnemyReactionUsed:secondEnemyTurn?false:combat.secondEnemyReactionUsed,movementUsed:0,actionUsed:false,bonusActionUsed:false,lastAction:undefined,attack:undefined,enemyLastTurn:detail,status:defeated?'completed' as const:combat.status,outcome:defeated?'player-defeated' as const:combat.outcome};
 const now=new Date().toISOString();
 return {...campaign,character:{...character,currentHitPoints:after},combat:nextCombat,updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:detail,createdAt:now}]};
}

export function moveTrainingDummy(campaign:Campaign):Campaign {
 const c=campaign.combat;
 if(!c||c.enemyName!=='Training Dummy'||c.status!=='initiative-set'||c.order?.[c.turnIndex??0]==='Nighthawk'||c.opportunity)throw Error('Dummy movement is unavailable.');
 if(c.enemyGrappled)throw Error('Grappled: Speed 0. Escape before moving.');
 const p=c.playerPosition??{x:2,y:4},e=c.enemyPosition??{x:6,y:4};
 const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
 const adjacent=distance(p,e)<=1;
 // Patrol around Nighthawk, rather than marching east into the map boundary.
 // Once adjacent, choose a square outside melee reach to trigger a reaction.
 const candidates=[{x:e.x+1,y:e.y},{x:e.x,y:e.y+1},{x:e.x-1,y:e.y},{x:e.x,y:e.y-1},
 {x:e.x+1,y:e.y+1},{x:e.x-1,y:e.y+1},{x:e.x-1,y:e.y-1},{x:e.x+1,y:e.y-1}]
 .filter(q=>q.x>=0&&q.x<=8&&q.y>=0&&q.y<=8&&!(q.x===p.x&&q.y===p.y));
 const options=adjacent?candidates.filter(q=>distance(q,p)>1):candidates;
 if(!options.length)throw Error('No available square for dummy movement.');
 // Prefer an orthogonal square; rotate the direction by round/position to avoid a straight-line march.
 const index=(c.round+e.x*3+e.y*5)%options.length;
 const to=options[index];
 const opportunity=adjacent&&!c.reactionUsed?{from:e,to}:undefined;
 const now=new Date().toISOString();
 return {...campaign,combat:{...c,enemyPosition:opportunity?e:to,opportunity},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:opportunity?'Training dummy starts leaving Nighthawk’s reach. Opportunity attack available before it moves.':'Training dummy moves one square toward Nighthawk.',createdAt:now}]};
}

export function resolveTrainingReaction(campaign:Campaign,choice:'attack'|'decline'):Campaign {
 const c=campaign.combat;
 if(!c||!c.opportunity||c.status!=='initiative-set'||c.reactionUsed||c.reactionAttack)throw Error('No reaction choice pending.');
 const now=new Date().toISOString();
 if(choice==='attack'){
  if((c.daggersAvailable??2)<1)throw Error('No melee dagger available for the reaction.');
  return {...campaign,combat:{...c,reactionUsed:true,reactionAttack:{phase:'roll-to-hit'}},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Nighthawk spends a reaction on an opportunity attack. Roll to hit before the dummy moves.',createdAt:now}]};
 }
 return {...campaign,combat:{...c,opportunity:undefined,enemyPosition:c.opportunity.to},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Nighthawk declines the opportunity attack. The dummy moves away.',createdAt:now}]};
}

export function rollTrainingReaction(campaign:Campaign,kind:'hit'|'damage'|'finish'):Campaign {
 const c=campaign.combat,attack=c?.reactionAttack;
 if(!c||!c.opportunity||!attack)throw Error('No reaction attack in progress.');
 const character=campaign.character??prototypeNighthawk;
 const die=(sides:number)=>crypto.getRandomValues(new Uint32Array(1))[0]%sides+1;
 const now=new Date().toISOString();
 let next:NonNullable<Campaign['combat']>={...c,reactionAttack:{...attack}};let detail='';
 if(kind==='hit'){
  if(attack.phase!=='roll-to-hit')throw Error('Attack roll already resolved.');
  const d20=die(20),bonus=abilityModifier(character.scores.dex)+character.proficiencyBonus,total=d20+bonus;
  const hit=d20===20||(d20!==1&&total>=12);
  next.reactionAttack={phase:hit?'roll-damage':'resolved',d20,total,hit,critical:d20===20};
  detail='Opportunity attack: d20 '+d20+' + '+bonus+' = '+total+' vs AC 12: '+(hit?'HIT. Roll dagger damage.':'MISS. The dummy can finish moving.');
 }else if(kind==='damage'){
  if(attack.phase!=='roll-damage')throw Error('Roll to hit first.');
  const first=die(4),extra=attack.critical?die(4):0,damage=Math.max(0,first+extra+abilityModifier(character.scores.dex));
  next.reactionAttack={...attack,phase:'resolved',damage};
  next.enemyHp=Math.max(0,(c.enemyHp??12)-damage);
  if(next.enemyHp===0){next.status='completed';next.outcome='nonlethal-victory';}
  detail='Opportunity attack dagger damage: '+first+(extra?' + '+extra+' critical die':'')+' + '+abilityModifier(character.scores.dex)+' DEX = '+damage+'. Dummy HP: '+next.enemyHp+'/'+(c.enemyMaxHp??12)+'.';
 }else{
  if(attack.phase!=='resolved')throw Error('Finish rolling the reaction first.');
  next.opportunity=undefined;next.reactionAttack=undefined;
  if(c.status!=='completed')next.enemyPosition=c.opportunity.to;
  detail=c.status==='completed'?'The dummy is defeated before leaving reach.':'Reaction resolved; the dummy completes its movement.';
 }
 return {...campaign,combat:next,updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:detail,createdAt:now}]};
}

export function advanceDuelTestEnemyTurn(campaign:Campaign):Campaign {
 const combat=campaign.combat;
 if(!combat||combat.status!=='initiative-set'||!combat.order||combat.order[combat.turnIndex??0]==='Nighthawk')throw Error('No enemy turn to advance.');
 if(combat.opportunity)throw Error('Resolve the opportunity attack first.');
 const now=new Date().toISOString();
 const nextRound=combat.order[0]==='Nighthawk'?combat.round+1:combat.round;
 return {...campaign,combat:{...combat,turnIndex:combat.order.indexOf('Nighthawk'),round:nextRound,movementUsed:0,actionUsed:false,bonusActionUsed:false,lastAction:undefined,attack:undefined},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'TEST ONLY: '+combat.enemyName+' turn skipped without an attack, damage, or other effect. Nighthawk can act again.',createdAt:now}]};
}

export function rollDuelAttack(campaign:Campaign,kind:'hit'|'damage',applySneakAttack?:boolean):Campaign {
 const combat=campaign.combat;
 if(!combat||combat.status!=='initiative-set'||!combat.attack||combat.order?.[combat.turnIndex??0]!=='Nighthawk')throw Error('No attack awaiting a roll.');
 const next={...combat,attack:{...combat.attack}};
 const die=(sides:number)=>crypto.getRandomValues(new Uint32Array(1))[0]%sides+1;
 let description='';
 if(kind==='hit'){
  if(next.attack.phase!=='roll-to-hit')throw Error('Attack roll already made.');
  const character=campaign.character??prototypeNighthawk;
  const attackBonus=abilityModifier(character.scores.dex)+character.proficiencyBonus;
  const player=combat.playerPosition??{x:2,y:4},enemy=combat.selectedEnemy==='second'&&combat.secondEnemy?combat.secondEnemy.position:combat.enemyPosition??{x:6,y:4},withinFive=Math.max(Math.abs(player.x-enemy.x),Math.abs(player.y-enemy.y))<=1;const hasAdvantage=!!combat.playerHidden||!!combat.steadyAim||(!!combat.enemyProne&&combat.selectedEnemy!=='second'&&withinFive);const hasDisadvantage=!!next.attack.disadvantage||(!!combat.enemyProne&&combat.selectedEnemy!=='second'&&!withinFive);const advantage=hasAdvantage&&!hasDisadvantage;const disadvantage=hasDisadvantage&&!hasAdvantage;const firstD20=die(20),secondD20=(advantage||disadvantage)?die(20):undefined,d20=secondD20===undefined?firstD20:advantage?Math.max(firstD20,secondD20):Math.min(firstD20,secondD20),total=d20+attackBonus,critical=d20===20,hit=critical||(d20!==1&&total>=12);
  next.stats={...(next.stats??{damage:0,movement:0,attacks:0,hits:0,criticalHits:0,sneakDamage:0,finishingBlows:0}),attacks:(next.stats?.attacks??0)+1,hits:(next.stats?.hits??0)+(hit?1:0),criticalHits:(next.stats?.criticalHits??0)+(critical?1:0)};
  next.playerHidden=false;
  next.attack={phase:hit?'roll-damage':'resolved',d20,firstD20,total,critical,hit,advantage,disadvantage,weapon:next.attack.weapon,thrown:next.attack.thrown,secondD20};next.sneakAttackEligible=hit&&!next.sneakAttackUsedThisTurn&&(advantage|| (!!next.trainingAllyAdjacent&&!disadvantage));
  if(next.attack.weapon==='shortbow')next.arrowsRemaining=(next.arrowsRemaining??20)-1;
  if(next.attack.thrown){next.daggersAvailable=(next.daggersAvailable??2)-1;next.daggersThrown=(next.daggersThrown??0)+1;}
  description=(next.attack.weapon==='shortbow'?'Shortbow (ranged)':next.attack.thrown?'Thrown dagger (ranged)':'Dagger (melee)')+': '+(secondD20===undefined?'':(advantage?'advantage ':'disadvantage ')+firstD20+'/'+secondD20+' → ')+'d20 '+d20+' + '+attackBonus+' = '+total+' vs training AC 12: '+(hit?'HIT':'MISS')+'.'+(critical?' Critical hit.':'');
 }else{
  if(next.attack.phase!=='roll-damage')throw Error('Roll to hit first.');
  const modifier=abilityModifier((campaign.character??prototypeNighthawk).scores.dex);
  const includeSneakAttack=applySneakAttack??!!next.sneakAttackEligible;
  if(includeSneakAttack&&!next.sneakAttackEligible)throw Error('Sneak Attack not eligible.');const sides=next.attack.weapon==='shortbow'?6:4;const first=die(sides),second=next.attack.critical?die(sides):0,sneakDice=includeSneakAttack?Math.ceil(((campaign.character??prototypeNighthawk).level??1)/2):0,sneakRolls=Array.from({length:sneakDice*(next.attack.critical?2:1)},()=>die(6)),sneakDamage=sneakRolls.reduce((a,b)=>a+b,0),damage=Math.max(0,first+second+modifier+sneakDamage);
  next.attack={...next.attack,phase:'resolved',damage,sneakAttackDamage:sneakDamage};if(includeSneakAttack)next.sneakAttackUsedThisTurn=true;
  if(next.selectedEnemy==='second'&&next.secondEnemy){next.secondEnemy={...next.secondEnemy,hp:Math.max(0,next.secondEnemy.hp-damage)};}else{next.enemyHp=Math.max(0,(next.enemyHp??12)-damage);}
  next.stats={...(next.stats??{damage:0,movement:0,attacks:0,hits:0,criticalHits:0,sneakDamage:0,finishingBlows:0}),damage:(next.stats?.damage??0)+damage,sneakDamage:(next.stats?.sneakDamage??0)+sneakDamage};
  const bothDown=(next.enemyHp??12)===0&&(!next.secondEnemy||next.secondEnemy.hp===0);
  if(bothDown){next.status='completed';next.outcome='nonlethal-victory';}
  const targetName=next.selectedEnemy==='second'&&next.secondEnemy?next.secondEnemy.name:combat.enemyName;
  const hp=next.selectedEnemy==='second'&&next.secondEnemy?next.secondEnemy.hp:next.enemyHp??12;
  if(hp===0)next.stats={...next.stats!,finishingBlows:(next.stats?.finishingBlows??0)+1};
  description='Damage to '+targetName+': '+damage+' ('+first+' weapon + '+modifier+' DEX'+(sneakDice?' + '+sneakDamage+' Sneak Attack':'')+'). HP '+hp+'/12.'+(hp===0?' '+targetName+' is defeated.':'')+(bothDown?' Encounter complete.':'');
  if(hp===0&&!bothDown){
    const survivors:[('first'|'second'),{x:number;y:number}][]=[];
    if((next.enemyHp??12)>0)survivors.push(['first',next.enemyPosition??{x:6,y:4}]);
    if(next.secondEnemy&&next.secondEnemy.hp>0)survivors.push(['second',next.secondEnemy.position]);
    const player=next.playerPosition??{x:2,y:4};
    survivors.sort((a,b)=>Math.max(Math.abs(a[1].x-player.x),Math.abs(a[1].y-player.y))-Math.max(Math.abs(b[1].x-player.x),Math.abs(b[1].y-player.y))||(next.order??[]).indexOf(a[0]==='first'?next.enemyName:next.secondEnemy!.name)-(next.order??[]).indexOf(b[0]==='first'?next.enemyName:next.secondEnemy!.name));
    next.selectedEnemy=survivors[0][0];
    description+=' Now targeting '+(next.selectedEnemy==='first'?next.enemyName:next.secondEnemy!.name)+'.';
  }
 }
 const now=new Date().toISOString();
 return {...campaign,equipment:{daggers:next.daggersAvailable??campaign.equipment?.daggers??2,arrows:next.arrowsRemaining??campaign.equipment?.arrows??20,caltrops:campaign.equipment?.caltrops??0,ballBearings:campaign.equipment?.ballBearings??0},combat:next,updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:description,createdAt:now}]};
}

export function quitTrainingEncounter(campaign:Campaign):Campaign {
 const combat=campaign.combat;
 if(!combat||combat.enemyName!=='Training Dummy')throw Error('Only encounter training can be reset this way.');
 const character=campaign.character??prototypeNighthawk;
 const maxHp=character.maxHitPoints??24;
 const now=new Date().toISOString();
 const equipment=campaign.equipment??{daggers:2,arrows:20,caltrops:0,ballBearings:0};
 return {...campaign,character:{...character,currentHitPoints:maxHp},
  equipment:{...equipment,daggers:(combat.daggersAvailable??equipment.daggers)+(combat.daggersThrown??0),arrows:combat.arrowsRemaining??equipment.arrows},
  combat:undefined,pendingAftermath:undefined,updatedAt:now,
  journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Encounter training reset. Nighthawk restored to '+maxHp+'/'+maxHp+' HP; dummy reset. Thrown daggers recovered. Start a new encounter when ready.',createdAt:now}]};
}

export function concludeDuel(campaign:Campaign):Campaign {
 const combat=campaign.combat;
 if(!combat||((combat.enemyHp!==0||!!combat.secondEnemy&&combat.secondEnemy.hp!==0)&&combat.outcome!=='player-defeated'))throw Error('The sparring match has not ended.');
 const now=new Date().toISOString();
 if(combat.enemyName==='Training Dummy'){
  const character=campaign.character??prototypeNighthawk;
  const restoredHp=character.maxHitPoints??combat.trainingStartingHp??10;
  return {...campaign,character:{...character,currentHitPoints:restoredHp},equipment:{daggers:(campaign.equipment?.daggers??combat.daggersAvailable??2)+(combat.daggersThrown??0),arrows:campaign.equipment?.arrows??combat.arrowsRemaining??20,caltrops:campaign.equipment?.caltrops??0,ballBearings:campaign.equipment?.ballBearings??0},combat:undefined,pendingAftermath:undefined,updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Training simulation ended; Nighthawk HP restored to '+restoredHp+'. All simulated thrown daggers recovered.',createdAt:now}]};
 }
 return {...campaign,combat:undefined,pendingAftermath:{opponent:combat.enemyName,playerDefeated:combat.outcome==='player-defeated'},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:combat.outcome==='player-defeated'?'Nighthawk was reduced to 0 HP by a nonlethal training strike and is unconscious. The sparring encounter is finished. Resume normal adventure and narrate aid and recovery, without restarting combat.':combat.enemyName+' was reduced to 0 HP by Nighthawk\'s nonlethal training strike and is unconscious, not dead. The sparring encounter is finished. Resume normal adventure; the DM narrates the aftermath and NPC reactions. Do not restart this combat.',createdAt:now}]};
}

export function setTrainingAllyAdjacent(campaign:Campaign,enabled:boolean):Campaign {
 const combat=campaign.combat;
 if(!combat||combat.status!=='initiative-set'||combat.attack?.phase==='roll-damage')throw Error('Finish pending attack first.');
 const now=new Date().toISOString();
 return {...campaign,combat:{...combat,trainingAllyAdjacent:enabled},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:enabled?'Training ally adjacent to dummy; no advantage granted.':'Training ally removed.',createdAt:now}]};
}

export function setTrainingEnemyProne(campaign:Campaign,enabled:boolean):Campaign {
 const combat=campaign.combat;
 if(!combat||combat.status!=='initiative-set'||combat.attack?.phase==='roll-damage')throw Error('Finish pending attack first.');
 const now=new Date().toISOString();
 return {...campaign,combat:{...combat,enemyProne:enabled},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:enabled?'Training enemy is Prone.':'Training enemy stands up.',createdAt:now}]};
}

export function grappleTrainingEnemy(campaign:Campaign):Campaign {
 const c=campaign.combat;
 if(!c||c.status!=='initiative-set'||c.order?.[c.turnIndex??0]!=='Nighthawk')throw Error('Grapple requires your turn.');
 if(c.actionUsed||c.attack)throw Error('Attack action already used.');
 const second=c.selectedEnemy==='second'&&!!c.secondEnemy;
 const p=c.playerPosition??{x:2,y:4},e=second?c.secondEnemy!.position:c.enemyPosition??{x:6,y:4};
 if(Math.max(Math.abs(p.x-e.x),Math.abs(p.y-e.y))>1)throw Error('Target must be within 5 feet.');
 const character=campaign.character??prototypeNighthawk;
 const dc=8+abilityModifier(character.scores.str)+character.proficiencyBonus;
 const roll=crypto.getRandomValues(new Uint32Array(1))[0]%20+1;
 const grabbed=roll<dc;
 const detail='Grapple save: d20 '+roll+' vs DC '+dc+'. '+(grabbed?'Failed: Grappled (Speed 0).':'Passed: not Grappled.');
 const now=new Date().toISOString();
 return {...campaign,combat:{...c,actionUsed:true,lastAction:'Grapple',enemyGrappled:second?c.enemyGrappled:grabbed,secondEnemy:second?{...c.secondEnemy!,grappled:grabbed}:c.secondEnemy,lastGrappleResult:(second?c.secondEnemy!.name:c.enemyName)+': '+detail},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:detail,createdAt:now}]};
}
export function escapeTrainingGrapple(campaign:Campaign,ability:'str'|'dex'):Campaign {
 const c=campaign.combat;
 if(!c||c.order?.[c.turnIndex??0]==='Nighthawk')throw Error('Escape requires an enemy turn.');
 const second=c.order?.[c.turnIndex??0]===c.secondEnemy?.name;
 if(!(second?c.secondEnemy?.grappled:c.enemyGrappled))throw Error('The active enemy is not Grappled.');
 const character=campaign.character??prototypeNighthawk;
 const dc=8+abilityModifier(character.scores.str)+character.proficiencyBonus;
 const roll=crypto.getRandomValues(new Uint32Array(1))[0]%20+1;
 const success=roll>=dc;
 const detail='Escape '+(ability==='str'?'Athletics':'Acrobatics')+' check: d20 '+roll+' vs DC '+dc+'. '+(success?'Success: Grapple ends.':'Failure: still Grappled.');
 const now=new Date().toISOString();
 const nextRound=c.order?.[0]==='Nighthawk'?c.round+1:c.round;
 return {...campaign,combat:{...c,enemyGrappled:second?c.enemyGrappled:!success,secondEnemy:second?{...c.secondEnemy!,grappled:!success}:c.secondEnemy,lastGrappleResult:(second?c.secondEnemy!.name:c.enemyName)+': '+detail,turnIndex:c.order?.indexOf('Nighthawk')??0,round:nextRound,movementUsed:0,actionUsed:false,bonusActionUsed:false,attack:undefined},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:detail,createdAt:now}]};
}
export function shoveTrainingEnemy(campaign:Campaign,outcome:'prone'|'push'):Campaign {
 const c=campaign.combat;
 if(!c||c.status!=='initiative-set'||c.order?.[c.turnIndex??0]!=='Nighthawk')throw Error('Shove requires your turn.');
 if(c.actionUsed||c.attack)throw Error('Attack action already used.');
 const second=c.selectedEnemy==='second'&&!!c.secondEnemy;
 const p=c.playerPosition??{x:2,y:4},e=second?c.secondEnemy!.position:c.enemyPosition??{x:6,y:4};
 if(Math.max(Math.abs(p.x-e.x),Math.abs(p.y-e.y))>1)throw Error('Shove requires an enemy within 5 feet.');
 const character=campaign.character??prototypeNighthawk;
 const dc=8+abilityModifier(character.scores.str)+character.proficiencyBonus;
 // The training dummy has STR and DEX save modifiers of +0, so either save is equivalent.
 const roll=crypto.getRandomValues(new Uint32Array(1))[0]%20+1;
 const succeeds=roll>=dc;
 let target={...e},prone=!!(second?c.secondEnemy?.prone:c.enemyProne),detail='';
 if(!succeeds){
  if(outcome==='prone'){prone=true;detail='The enemy falls Prone.';}
  else{
   const dx=Math.sign(e.x-p.x),dy=Math.sign(e.y-p.y);
   const pushed={x:e.x+dx,y:e.y+dy};
   if(pushed.x>=0&&pushed.x<9&&pushed.y>=0&&pushed.y<9){target=pushed;detail='The enemy is pushed 5 feet away.';}
   else detail='The enemy cannot be pushed beyond the grid boundary.';
  }
 }else detail='The enemy resists the Shove.';
 const now=new Date().toISOString();
 const description='Nighthawk attempts Shove ('+(outcome==='prone'?'Prone':'Push 5 ft')+'). DC '+dc+' Strength/Dexterity save: '+(succeeds?'PASSED':'FAILED')+'. '+detail;
 return {...campaign,combat:{...c,actionUsed:true,lastAction:'Shove',enemyPosition:second?c.enemyPosition:target,enemyProne:second?c.enemyProne:prone,secondEnemy:second?{...c.secondEnemy!,position:target,prone}:c.secondEnemy,lastShoveSave:{passed:succeeds,dc,outcome,effectApplied:!succeeds&&(outcome==='prone'||target.x!==e.x||target.y!==e.y)}},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:description,createdAt:now}]};
}
