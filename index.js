const Hapi = require('@hapi/hapi');
const HapiSwagger = require('hapi-swagger');
const Inert = require('@hapi/inert');
const Vision = require('@hapi/vision');
const Package = require('./package');
const {pool} = require('./db/db');
const Good = require("@hapi/good");
const init = async () => {

    const server = Hapi.server({
        port: 3000,
        host: 'localhost'
    });

    //Configuraciones de swagger
    const swaggerOptions = {
        info: {
            title: 'Test API Documentation',
            version: Package.version
        },
        grouping: 'tags'
    };

    await server.register([
        Inert,
        Vision,
        {
            plugin: HapiSwagger,
            options: swaggerOptions
        },
        {
            plugin: Good,
            options: {
              ops: {
                interval: 1000 * 60,
              },
              reporters: {
                myConsoleReporter: [
                  {
                    module: "@hapi/good-squeeze",
                    name: "Squeeze",
                    args: [{ ops: "*", log: "*", error: "*", response: "*" }],
                  },
                  {
                    module: "@hapi/good-console",
                  },
                  "stdout",
                ],
              },
            },
        }
    ])

    server.route({
        method: 'GET',
        path: '/login',
        handler: async (request, h) => {
            let cliente = await pool.connect()
            const { user, password } = request.query

            try {
                let result = await cliente.query(
                    `SELECT * FROM actores WHERE contrasena = $1 AND correo = $2`,
                    [password, user]
                )
                console.log(result.rows)
                return result.rows
            } catch (err) {
                console.log({ err })
                return h.code(500).response({ error: 'Internal error server' })
            } finally {
                //(Liberar) libera un cliente adquirido de vuelta al pool.
                //Debes llamar a client.release cuando hayas terminado con un cliente. Si te olvidas de liberar al cliente, tu aplicación agotará rápidamente los clientes disponibles e inactivos en el pool y todas las llamadas posteriores a pool.connect se agotarán con un error o se colgarán indefinidamente si tienes configurado connectionTimeoutMillis a 0.
                // El true significa que indicará al pool que desconecte y destruya este cliente, dejando un espacio dentro de sí mismo para un nuevo cliente.
                // indicar al pool que destruya a este cliente
                cliente.release(true)
            }
        },
        options: {
            description: 'Consultar si una persona existe',
            tags: ['api', 'login']
        }
    })

    await server.start();
    console.log('Server running on port 3000');
};

init();