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

// --- CREAR LAS TABLAS AUTOMÁTICAMENTE ---
const crearTablaUsuarios = `
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    tarjeta_sanitaria VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

const crearTablaRegistros = `
CREATE TABLE IF NOT EXISTS registros (
    id SERIAL PRIMARY KEY,
    tarjeta_sanitaria VARCHAR(50) NOT NULL,
    frecuencia_horas INT NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

const crearTablaEmergencias = `
CREATE TABLE IF NOT EXISTS emergencias (
    id SERIAL PRIMARY KEY,
    tarjeta_sanitaria VARCHAR(50) NOT NULL,
    latitud NUMERIC(10, 7),
    longitud NUMERIC(10, 7),
    fecha_emergencia TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

// Ejecutamos ambas creaciones
pool.query(crearTablaUsuarios)
    .then(() => console.log('Tabla de usuarios OK'))
    .catch(err => console.error('Error tabla usuarios:', err));

pool.query(crearTablaRegistros)
    .then(() => console.log('Tabla de registros (historial) OK'))
    .catch(err => console.error('Error tabla registros:', err));

// Justo debajo de los otros pool.query(...), añade este:
pool.query(crearTablaEmergencias)
    .then(() => console.log('Tabla de emergencias OK'))
    .catch(err => console.error('Error tabla emergencias:', err));    
    
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

// --- RUTA 4: REGISTRAR EMERGENCIA CON UBICACIÓN ---
app.post('/api/emergencia', async (req, res) => {
    const { tarjeta, latitud, longitud } = req.body;

    try {
        const query = 'INSERT INTO emergencias (tarjeta_sanitaria, latitud, longitud) VALUES ($1, $2, $3)';
        await pool.query(query, [tarjeta, latitud, longitud]);
        res.status(201).json({ mensaje: 'Emergencia registrada con ubicación exacta' });
    } catch (err) {
        console.error("Error guardando emergencia:", err);
        res.status(500).json({ mensaje: 'Error en el servidor al guardar la emergencia' });
    }
});

// --- RUTA 5: PANEL DE ADMINISTRACIÓN (VER BD) ---
app.get('/api/admin/datos', async (req, res) => {
    try {
        // Obtenemos los últimos 20 registros normales
        const registros = await pool.query('SELECT * FROM registros ORDER BY fecha_registro DESC LIMIT 20');
        // Obtenemos las últimas 20 emergencias
        const emergencias = await pool.query('SELECT * FROM emergencias ORDER BY fecha_emergencia DESC LIMIT 20');

        res.status(200).json({
            registros: registros.rows,
            emergencias: emergencias.rows
        });
    } catch (err) {
        console.error("Error al obtener datos de admin:", err);
        res.status(500).json({ mensaje: 'Error en el servidor al leer la BD' });
    }
});

// --- ARRANCAR EL SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor Backend corriendo en el puerto ${PORT}`);
});