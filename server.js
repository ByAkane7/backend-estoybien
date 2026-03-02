// --- IMPORTAR LIBRERÍAS ---
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors'); // Permite que tu frontend hable con este backend

const app = express();
app.use(cors());
app.use(express.json()); // Permite leer los datos que envía el frontend

// --- CONEXIÓN A MYSQL ---
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',      // Tu usuario de MySQL (suele ser root en local)
    password: '',      // Tu contraseña de MySQL (suele estar vacía en XAMPP)
    database: 'si_estoy_bien'
});

db.connect(err => {
    if (err) throw err;
    console.log('Conectado a la base de datos MySQL');
});

// --- RUTA 1: REGISTRAR USUARIO ---
app.post('/api/registrar', (req, res) => {
    const { tarjeta, password } = req.body;

    const query = 'INSERT INTO usuarios (tarjeta_sanitaria, password) VALUES (?, ?)';
    db.query(query, [tarjeta, password], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ mensaje: 'Esta tarjeta ya está registrada' });
            }
            return res.status(500).json({ mensaje: 'Error en el servidor' });
        }
        res.status(201).json({ mensaje: 'Usuario registrado con éxito' });
    });
});

// --- RUTA 2: INICIAR SESIÓN ---
app.post('/api/login', (req, res) => {
    const { tarjeta, password } = req.body;

    const query = 'SELECT * FROM usuarios WHERE tarjeta_sanitaria = ? AND password = ?';
    db.query(query, [tarjeta, password], (err, results) => {
        if (err) return res.status(500).json({ mensaje: 'Error en el servidor' });

        if (results.length > 0) {
            res.status(200).json({ mensaje: 'Login correcto' });
        } else {
            res.status(401).json({ mensaje: 'Tarjeta o contraseña incorrectas' });
        }
    });
});

// --- ARRANCAR EL SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor Backend corriendo en el puerto ${PORT}`);
});