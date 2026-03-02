// --- IMPORTAR LIBRERÍAS ---
const express = require('express');
const { Pool } = require('pg'); 
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const conexionPostgres = 'postgresql://estoybien_db_user:bCBoUP6dbR6pQFfs76vMQW8x1os7YCSe@dpg-d6insn7gi27c738mt30g-a.oregon-postgres.render.com/estoybien_db';

const pool = new Pool({
    connectionString: conexionPostgres,
    ssl: {
        rejectUnauthorized: false 
    }
});

// --- CREAR LA TABLA AUTOMÁTICAMENTE ---
const crearTabla = `
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    tarjeta_sanitaria VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

pool.query(crearTabla)
    .then(() => console.log('Tabla de usuarios verificada/creada en Postgres'))
    .catch(err => console.error('Error al crear/verificar la tabla:', err));


// --- RUTA 1: REGISTRAR USUARIO ---
app.post('/api/registrar', async (req, res) => {
    const { tarjeta, password } = req.body;

    try {
        const query = 'INSERT INTO usuarios (tarjeta_sanitaria, password) VALUES ($1, $2)';
        await pool.query(query, [tarjeta, password]);
        res.status(201).json({ mensaje: 'Usuario registrado con éxito' });
    } catch (err) {
        if (err.code === '23505') { 
            return res.status(400).json({ mensaje: 'Esta tarjeta ya está registrada' });
        }
        console.error(err);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
});

// --- RUTA 2: INICIAR SESIÓN ---
app.post('/api/login', async (req, res) => {
    const { tarjeta, password } = req.body;

    try {
        const query = 'SELECT * FROM usuarios WHERE tarjeta_sanitaria = $1 AND password = $2';
        const result = await pool.query(query, [tarjeta, password]);

        if (result.rows.length > 0) {
            res.status(200).json({ mensaje: 'Login correcto' });
        } else {
            res.status(401).json({ mensaje: 'Tarjeta o contraseña incorrectas' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
});

// --- ARRANCAR EL SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor Backend corriendo en el puerto ${PORT}`);
});