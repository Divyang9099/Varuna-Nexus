const auditService = require('./audit.service');
const { success }  = require('../../core/utils/response');

exports.getLogs = async (req, res, next) => {
  try {
    const { entity_type, entity_id, action, limit } = req.query;
    const data = await auditService.getLogs({ entity_type, entity_id, action, limit });
    res.json(success(data));
  } catch (err) {
    next(err);
  }
};
