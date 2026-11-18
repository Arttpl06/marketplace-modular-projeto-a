import app from '../src/app.js';
import db from '../src/config/database.js';
// Verificação HTTP local, somente leitura, em porta efêmera.
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
try {
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const path of ['/health', '/ready', '/produtos?limit=1', '/metrics']) {
        const response = await fetch(`${base}${path}`);
        if (!response.ok) throw new Error(`Falha ${response.status} em ${path}`);
        console.log(`OK ${path}: ${response.status}`);
    }
} finally {
    await new Promise(resolve => server.close(resolve));
    await db.destroy();
}
