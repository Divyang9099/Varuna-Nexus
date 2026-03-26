/**
 * Cost Engine — pure calculation, no DB calls.
 * All inputs required; missing values should be defaulted by the caller.
 */
exports.calculate = (data) => {
  const {
    days           = 0,
    pilot_rate     = 0,
    drone_rate     = 0,
    travel_cost    = 0,
    processing_cost = 0,
    margin_percent = 0,
    tax_percent    = 0,
  } = data;

  const pilotCost    = Number(days) * Number(pilot_rate);
  const droneCost    = Number(days) * Number(drone_rate);
  const baseCost     = pilotCost + droneCost + Number(travel_cost) + Number(processing_cost);

  const margin       = (baseCost * Number(margin_percent)) / 100;
  const subtotal     = baseCost + margin;

  const tax          = (subtotal * Number(tax_percent)) / 100;
  const total        = subtotal + tax;

  return {
    pilotCost,
    droneCost,
    travelCost:      Number(travel_cost),
    processingCost:  Number(processing_cost),
    baseCost,
    marginPercent:   Number(margin_percent),
    margin,
    subtotal,
    taxPercent:      Number(tax_percent),
    tax,
    total,
  };
};
