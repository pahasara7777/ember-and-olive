import { AuditLog } from '../models/index.js';

// Records who changed what (prices, roles, order and booking status). Never put secrets in before/after.
export const audit = (req, action, entity, entityId, before, after) =>
  AuditLog.create({ actor: req.user?._id, action, entity, entityId, before, after, ip: req.ip });
