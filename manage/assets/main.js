/* Pornire: încarcă entitățile și starea CMS-ului, apoi deschide ruta din URL. */
CMS.refresh().then(() => go(routeFromPath()));
