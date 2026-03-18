const express = require('express');
const { Pool } = require('pg'); 
const cors = require('cors');

const app = express();

// Configuración de middleware
app.use(cors());
app.use(express.json());

// Configuración de base de datos
const conexionPostgres = 'postgresql://estoybien_db_user:bCBoUP6dbR6pQFfs76vMQW8x1os7YCSe@dpg-d6insn7gi27c738mt30g-a.oregon-postgres.render.com/estoybien_db';

const pool = new Pool({
    connectionString: conexionPostgres,
    ssl: {
        rejectUnauthorized: false 
    }
});

// Inicialización de esquemas de base de datos
async function inicializarBaseDatos() {
    const tablas = [
        `CREATE TABLE IF NOT EXISTS usuarios (
            id SERIAL PRIMARY KEY,
            tarjeta_sanitaria VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE TABLE IF NOT EXISTS registros (
            id SERIAL PRIMARY KEY,
            tarjeta_sanitaria VARCHAR(50) NOT NULL,
            frecuencia_horas INT NOT NULL,
            fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE TABLE IF NOT EXISTS emergencias (
            id SERIAL PRIMARY KEY,
            tarjeta_sanitaria VARCHAR(50) NOT NULL,
            latitud NUMERIC(10, 7),
            longitud NUMERIC(10, 7),
            fecha_emergencia TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`
    ];

    try {
        for (let query of tablas) {
            await pool.query(query);
        }
        console.log('Estructura de base de datos verificada/creada correctamente.');
    } catch (error) {
        console.error('Error crítico al inicializar la base de datos:', error);
    }
}

inicializarBaseDatos();

// Rutas de la API

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
        console.error('Error en registro:', err);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
});

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
        console.error('Error en login:', err);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
});

app.post('/api/checkin', async (req, res) => {
    const { tarjeta, frecuencia } = req.body;
    try {
        const query = 'INSERT INTO registros (tarjeta_sanitaria, frecuencia_horas) VALUES ($1, $2)';
        await pool.query(query, [tarjeta, frecuencia]);
        res.status(201).json({ mensaje: 'Check-in registrado con éxito' });
    } catch (err) {
        console.error('Error en checkin:', err);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
});

app.post('/api/emergencia', async (req, res) => {
    const { tarjeta, latitud, longitud } = req.body;
    try {
        const query = 'INSERT INTO emergencias (tarjeta_sanitaria, latitud, longitud) VALUES ($1, $2, $3)';
        await pool.query(query, [tarjeta, latitud, longitud]);
        res.status(201).json({ mensaje: 'Emergencia registrada' });
    } catch (err) {
        console.error('Error en emergencia:', err);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
});

app.get('/api/admin/datos', async (req, res) => {
    try {
        const registros = await pool.query('SELECT * FROM registros ORDER BY fecha_registro DESC LIMIT 20');
        const emergencias = await pool.query('SELECT * FROM emergencias ORDER BY fecha_emergencia DESC LIMIT 20');

        res.status(200).json({
            registros: registros.rows,
            emergencias: emergencias.rows
        });
    } catch (err) {
        console.error('Error obteniendo datos admin:', err);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor en ejecución en el puerto ${PORT}`);
});