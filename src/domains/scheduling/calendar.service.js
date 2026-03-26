const db = require('../../core/config/db');

exports.getCalendar = async (query) => {
  const { pilot, drone, project } = query;

  // 1. ALLOCATIONS (Dynamic Filtering)
  let aConditions = ['1=1'];
  let aValues = [];
  if (pilot)   { aValues.push(pilot);   aConditions.push(`a.pilot_id = $${aValues.length}`); }
  if (drone)   { aValues.push(drone);   aConditions.push(`a.drone_id = $${aValues.length}`); }
  if (project) { aValues.push(project); aConditions.push(`a.project_id = $${aValues.length}`); }

  const allocations = await db.query(`
    SELECT 
      a.id,
      'project' as type,
      a.start_date,
      a.end_date,
      p.name as title,
      p.name as project_name,
      pil.name as pilot_name,
      d.name as drone_name
    FROM allocations a
    LEFT JOIN projects p ON a.project_id = p.id
    LEFT JOIN pilots pl ON a.pilot_id = pl.id
    LEFT JOIN users pil ON pl.user_id = pil.id
    LEFT JOIN drones d ON a.drone_id = d.id
    WHERE ${aConditions.join(' AND ')}
  `, aValues);

  // 2. PIPELINE (Dynamic Filtering)
  let pConditions = [
    'estimated_start IS NOT NULL',
    'converted_project_id IS NULL',
    "stage NOT IN ('lost', 'converted')"
  ];
  let pValues = [];
  if (pilot) { pValues.push(pilot); pConditions.push(`tentative_pilot = $${pValues.length}`); }
  if (drone) { pValues.push(drone); pConditions.push(`tentative_drone = $${pValues.length}`); }
  if (project) { 
    pValues.push(project); 
    pConditions.push(`(id = $${pValues.length} OR converted_project_id = $${pValues.length})`); 
  }

  const pipeline = await db.query(`
    SELECT 
      id,
      'pipeline' as type,
      estimated_start as start_date,
      estimated_end as end_date,
      name as title,
      name as project_name
    FROM pipeline
    WHERE ${pConditions.join(' AND ')}
  `, pValues);

  // 3. MANUAL EVENTS (Dynamic Filtering)
  let eConditions = [];
  let eValues = [];
  const resourceFilters = [];

  if (pilot) {
    eValues.push(pilot);
    resourceFilters.push(`(resource_id = $${eValues.length} AND resource_type = 'pilot')`);
  }
  if (drone) {
    eValues.push(drone);
    resourceFilters.push(`(resource_id = $${eValues.length} AND resource_type = 'drone')`);
  }

  if (resourceFilters.length > 0) {
    eConditions.push(`(${resourceFilters.join(' OR ')} OR resource_type = 'all')`);
  } else {
    eConditions.push('1=1');
  }

  // 👇 FIX: Use project ID to restrict events to only those resources on the project
  if (project) {
    eValues.push(project);
    eConditions.push(`(
      resource_id IN (SELECT pilot_id FROM allocations WHERE project_id = $${eValues.length}) OR 
      resource_id IN (SELECT drone_id FROM allocations WHERE project_id = $${eValues.length}) OR
      resource_type = 'all'
    )`);
  }

  const events = await db.query(`
    SELECT 
      id,
      event_type as type,
      start_date,
      end_date,
      title
    FROM calendar_events
    WHERE ${eConditions.join(' AND ')}
  `, eValues);

  return [
    ...allocations.rows,
    ...pipeline.rows,
    ...events.rows
  ];
};
