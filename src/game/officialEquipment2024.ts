/* D&D 2024 Free Rules / SRD 5.2.1 equipment tables. Facts only.
 * Attribution: Wizards of the Coast, CC BY 4.0.
 * https://www.dndbeyond.com/sources/dnd/br-2024/equipment
 * Costs are integer copper. Sling bullets are sold in packs of 20.
 */
import type {Item} from "./creationEquipment";
import {EQUIPMENT_PART_1} from "./officialEquipment2024-part1";
import {EQUIPMENT_PART_2} from "./officialEquipment2024-part2";
import {EQUIPMENT_PART_3} from "./officialEquipment2024-part3";
import {EQUIPMENT_PART_4} from "./officialEquipment2024-part4";
export const OFFICIAL_EQUIPMENT_2024:Item[]=[EQUIPMENT_PART_1,EQUIPMENT_PART_2,EQUIPMENT_PART_3,EQUIPMENT_PART_4].flat();
