const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    console.log('=== DEPURACIÓN DE TOKEN ===');
    console.log('Token recibido:', token ? token.substring(0, 20) + '...' : 'No hay token');

    if (!token) {
        return res.status(401).json({ mensaje: 'Token requerido' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_secreto_super_seguro');

        console.log('✅ Token válido para usuario:', decoded.id_usuario);

        req.user = decoded;   // 👈 CAMBIO IMPORTANTE

        next();
    } catch (error) {
        console.log('❌ Token inválido:', error.message);
        return res.status(401).json({ mensaje: 'Token inválido' });
    }
};

module.exports = { verificarToken };
