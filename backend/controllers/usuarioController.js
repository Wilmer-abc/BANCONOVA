const db = require('../config/db');
const bcrypt = require('bcryptjs');

exports.crearUsuario = async (req, res) => {

    const { nombre, correo, password, id_rol } = req.body;

    try {

        const passwordHash = await bcrypt.hash(password, 10);

        const sql = `
            INSERT INTO usuarios (nombre, correo, password, id_rol)
            VALUES (?, ?, ?, ?)
        `;

        db.query(sql, [nombre, correo, passwordHash, id_rol], (err, result) => {

            if (err) {
                return res.status(500).json(err);
            }

            res.json({
                mensaje: "Usuario creado correctamente"
            });

        });

    } catch (error) {

        res.status(500).json(error);

    }
};

exports.obtenerUsuarios = (req, res) => {

    const sql = "SELECT * FROM usuarios";

    db.query(sql, (err, result) => {

        if (err) {
            return res.status(500).json(err);
        }

        res.json(result);

    });

};
