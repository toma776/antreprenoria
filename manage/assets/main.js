/* Pornire: încarcă entitățile și validările, apoi deschide ruta din URL. */
Promise.all([api.get('/api/entitati'), api.get('/api/presa/status')]).then(([e, ps]) => {
  store.entitati = e;
  store.presaStatus = ps || {};
  if (e) indexEntities(e);
  updateCounts();
  go(routeFromPath());
});
