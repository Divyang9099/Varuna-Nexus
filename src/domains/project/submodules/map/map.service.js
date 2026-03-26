const db = require('../../../../core/config/db');

exports.saveMapData = async (projectId, mapData) => {
  const projCheck = await db.query('SELECT id FROM projects WHERE id = $1', [projectId]);
  if (!projCheck.rows.length) throw Object.assign(new Error('Project not found'), { statusCode: 404 });

  // Check if map data exists for this project
  const check = await db.query('SELECT id FROM project_maps WHERE project_id = $1', [projectId]);
  
  if (check.rows.length > 0) {
    // Update
    const result = await db.query(
      `UPDATE project_maps 
       SET geojson_data = $1, center_lat = $2, center_lng = $3, zoom_level = $4
       WHERE project_id = $5 RETURNING *`,
      [
        mapData.geojson_data ? JSON.stringify(mapData.geojson_data) : null,
        mapData.center_lat || null,
        mapData.center_lng || null,
        mapData.zoom_level || 12,
        projectId
      ]
    );
    return { ...result.rows[0], _created: false };
  } else {
    // Insert
    const result = await db.query(
      `INSERT INTO project_maps (project_id, geojson_data, center_lat, center_lng, zoom_level)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        projectId,
        mapData.geojson_data ? JSON.stringify(mapData.geojson_data) : null,
        mapData.center_lat || null,
        mapData.center_lng || null,
        mapData.zoom_level || 12
      ]
    );
    return { ...result.rows[0], _created: true };
  }
};

exports.getMapData = async (projectId) => {
  const result = await db.query('SELECT * FROM project_maps WHERE project_id = $1', [projectId]);
  if (!result.rows.length) {
    return null; // No map data yet
  }
  return result.rows[0];
};

exports.deleteMapData = async (projectId) => {
  await db.query('DELETE FROM project_maps WHERE project_id = $1', [projectId]);
};
