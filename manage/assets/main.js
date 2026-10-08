/* Pornire: încarcă entitățile și deschide ruta din URL. */
api.get('/api/entitati').then((e) => {
  store.entitati = e;
  if (e) indexEntities(e);
  updateCounts();
  go(routeFromPath());
});
