const Hapi = require('@hapi/hapi');
const Vision = require('@hapi/vision');
const { readFileSync } = require('fs');

const MAX_EXTRA_LATENCY = 1000;
const MIN_EXTRA_LATENCY = 500;

const addRoutes = async (server) => {

  await server.register(Vision);

  server.views({
    engines: { html: require('handlebars') },
    path: `${__dirname}/templates`,
  });

  JSON.parse(readFileSync(`${__dirname}/pages.json`))
    .map(({
      title, links, depth, path,
    }) => server.route({
      method: 'GET',
      path,
      handler: (r, h) => new Promise((resolve) => {

        setTimeout(() => resolve(h.view('page', {
          title,
          links,
          depth,
        })), Math.floor(Math.random() * (MAX_EXTRA_LATENCY - MIN_EXTRA_LATENCY + 1) + MIN_EXTRA_LATENCY));

      }),
    }));

  server.route({
    method: 'GET',
    path: '/page-fixture',
    handler: (r, h) => {

      const response = h.response(h.view('page', {
        title: 'page-fixture',
        links: [
          '/a',
          '/b',
          '/c',
        ],
        depth: 0,
      }));
      response.header('x-custom-header', 'locust');
      return response;

    },

  });

  server.route({
    method: 'GET',
    path: '/page-fixture-error',
    handler: (r, h) => {

      const response = h.response('error');
      response.code(500);
      return response;

    },

  });

};

const init = async () => {

  const server = Hapi.server({
    port: 3001,
    host: 'localhost',
  });

  await addRoutes(server);

  await server.start();
  console.log('Test server running on %s', server.info.uri);

};

process.on('unhandledRejection', (err) => {

  console.log(err);
  process.exit(1);

});

init();
