/**
 * Permission matrix: status × role → capabilities
 *
 * Capabilities:
 * - edit     : can edit chapter content
 * - comment  : can add IE/LE/EDC comments
 * - signoff  : can sign off (LEC → LES)
 * - readOnly : preview/download only
 *
 * Roles resolved: ADM, LE, IE, EDC
 */
const PERMISSIONS = {
  CRT:    { ADM: 'edit',     LE: 'readOnly', IE: 'readOnly', EDC: 'readOnly' },
  LED:    { ADM: 'edit',     LE: 'edit',     IE: 'readOnly', EDC: 'readOnly' },
  IEC:    { ADM: 'edit',     LE: 'readOnly', IE: 'comment',  EDC: 'readOnly' },
  LEC:    { ADM: 'edit',     LE: 'signoff',  IE: 'readOnly', EDC: 'readOnly' },
  LES:    { ADM: 'readOnly', LE: 'readOnly', IE: 'readOnly', EDC: 'readOnly' },
  STU:    { ADM: 'readOnly', LE: 'readOnly', IE: 'readOnly', EDC: 'readOnly' },
  TWD:    { ADM: 'edit',     LE: 'readOnly', IE: 'readOnly', EDC: 'readOnly' },
  // TCD: EDC members get readOnly (removed LE/IE comment rights)
  TCD:    { ADM: 'edit',     LE: 'readOnly', IE: 'readOnly', EDC: 'readOnly' },
  // ECC: NEW — admin and EDC members can comment; TC-EDC session-scoped
  ECC:    { ADM: 'comment',  LE: 'readOnly', IE: 'readOnly', EDC: 'comment'  },
  TDD:    { ADM: 'edit',     LE: 'readOnly', IE: 'readOnly', EDC: 'readOnly' },
  ADT:    { ADM: 'readOnly', LE: 'readOnly', IE: 'readOnly', EDC: 'readOnly' },
  ADC:    { ADM: 'readOnly', LE: 'readOnly', IE: 'readOnly', EDC: 'readOnly' },
  ARC:    { ADM: 'readOnly', LE: 'readOnly', IE: 'readOnly', EDC: 'readOnly' },
};

/**
 * Resolve the effective permission for a user on a TG.
 *
 * @param {string} statusCode       - TG.Status_Code
 * @param {string} techWorkParty    - TG.CPI_TechWorkParty
 * @param {string} roleCode         - 'ADM' | 'LE' | 'IE' | 'EDC'
 * @returns {'edit'|'comment'|'signoff'|'readOnly'}
 */
export function getPermission(statusCode, techWorkParty, roleCode) {
  const statusPerms = PERMISSIONS[statusCode];
  if (!statusPerms) return 'readOnly';

  // Normalise role: anything not ADM/EDC falls back to LE or IE bucket
  let role;
  if (roleCode === 'ADM') role = 'ADM';
  else if (roleCode === 'EDC') role = 'EDC';
  else if (roleCode === 'LE') role = 'LE';
  else role = 'IE';

  return statusPerms[role] || 'readOnly';
}