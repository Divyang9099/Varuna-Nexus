const service = require('./map.service');
const { success } = require('../../../../core/utils/response');

exports.saveMapData = async (req, res, next) => {
  try {
    const data = await service.saveMapData(req.params.id, req.body);
    const statusCode = data._created ? 201 : 200;
    delete data._created;
    res.status(statusCode).json(success(data, 'Map data saved', statusCode));
  } catch (err) { next(err); }
};

exports.getMapData = async (req, res, next) => {
  try {
    const data = await service.getMapData(req.params.id);
    res.json(success(data));
  } catch (err) { next(err); }
};

exports.deleteMapData = async (req, res, next) => {
  try {
    await service.deleteMapData(req.params.id);
    res.json(success(null, 'Map data deleted'));
  } catch (err) { next(err); }
};
