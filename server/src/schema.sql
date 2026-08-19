-- Esquema base de CREDITOS: solo la tabla de usuarios.
-- Las tablas de los modulos se crean con sus scripts init correspondientes.

CREATE TABLE IF NOT EXISTS usuarios (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(120) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  rol           VARCHAR(20)  NOT NULL DEFAULT 'Consulta'
                CHECK (rol IN ('Administrador', 'Operador', 'Consulta')),
  activo        BOOLEAN      NOT NULL DEFAULT true,
  password_hash VARCHAR(200),
  fecha_creacion TIMESTAMP   NOT NULL DEFAULT now()
);
