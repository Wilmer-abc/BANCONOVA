const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


// REGISTRAR USUARIO
exports.register = async (req, res) => {

    const { nombre, correo, password, id_rol } = req.body;

    try {

        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `
        INSERT INTO usuarios (nombre, correo, password, id_rol)
        VALUES (?, ?, ?, ?)
        `;

        db.query(sql, [nombre, correo, hashedPassword, id_rol], (err, result) => {

            if (err) {
                return res.status(500).json(err);
            }

            res.json({
                mensaje: "Usuario registrado correctamente"
            });

        });

    } catch (error) {

        res.status(500).json(error);

    }

};


// LOGIN
exports.login = (req, res) => {

    const { correo, password } = req.body;

    const sql = "SELECT * FROM usuarios WHERE correo = ?";

    db.query(sql, [correo], async (err, result) => {

        if (err) return res.status(500).json(err);

        if (result.length === 0) {

            return res.status(401).json({
                mensaje: "Usuario no encontrado"
            });

        }

        const usuario = result[0];

        const validPassword = await bcrypt.compare(password, usuario.password);

        if (!validPassword) {

            return res.status(401).json({
                mensaje: "Contraseña incorrecta"
            });

        }

        const token = jwt.sign(
            {
                id: usuario.id_usuario,
                correo: usuario.correo,
                rol: usuario.id_rol
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES }
        );

        res.json({
            mensaje: "Login exitoso",
            token,
            usuario: {
                id: usuario.id_usuario,
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol: usuario.id_rol
            }
        });

    });

};
