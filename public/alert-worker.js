// /public/alert-worker.js
self.addEventListener('message', (event) => {
    if (event.data.type === 'SHOW_NOTIFICATION') {
        const alert = event.data.payload;

        self.registration.showNotification(`Campus Alert: ${alert.probe_id}`, {
            body: alert.message,
            icon: './vite.svg',
            tag: `alert-${alert.id}`,
            data: { url: `/alerts` },
            badge: './vite.svg'
        });
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.url));
});