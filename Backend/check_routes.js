import express from 'express';
import canvasRoutes from './routes/canvasRoutes.js';

const app = express();
app.use('/api/canvas', canvasRoutes);

function print(path, layer) {
    if (layer.route) {
        layer.route.stack.forEach(print.bind(null, path + layer.route.path));
    } else if (layer.name === 'router' && layer.handle.stack) {
        layer.handle.stack.forEach(print.bind(null, path + layer.regexp.source.replace('\\/?', '').replace('(?=\\/|$)', '')));
    } else if (layer.method) {
        console.log('%s /api/canvas%s', layer.method.toUpperCase(), path);
    }
}

app._router.stack.forEach(print.bind(null, ''));
