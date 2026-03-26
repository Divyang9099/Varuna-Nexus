const service = require('./allocation.service');
const { success } = require('../../../../core/utils/response');

exports.createAllocation = async (req, res, next) => {
  try {
    const data = await service.createAllocation(req.params.id, req.body, req.user.id);
    res.status(201).json(success(data, 'Resource allocated', 201));
  } catch (err) {
    next(err);
  }
};

exports.getAllocations = async (req, res, next) => {
  try {
    const data = await service.getAllocations(req.params.id);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
};

exports.updateAllocation = async (req, res, next) => {
  try {
    const data = await service.updateAllocation(req.params.allocationId, req.body, req.user.id);
    res.json(success(data, 'Allocation updated'));
  } catch (err) {
    next(err);
  }
};

exports.deleteAllocation = async (req, res, next) => {
  try {
    await service.deleteAllocation(req.params.allocationId, req.user.id);
    res.json(success(null, 'Allocation deleted'));
  } catch (err) {
    next(err);
  }
};
