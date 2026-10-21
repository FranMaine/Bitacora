// Service worker mínimo: existe para que Chrome considere la app "instalable",
// pero no cachea nada — todo pasa por la red igual que sin él. Si en el futuro
// se quiere cachear, se puede implementar fetch; por ahora preferimos que
// siempre se vean los datos actualizados sin complicaciones de invalidación.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
