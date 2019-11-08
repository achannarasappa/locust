/**
 * site-generator
 *
 * Utility script to generation site.json which defines the structure of the site used for
 * functional testing purposes. site.json should relatively static since there will be
 * assertions made against the specific structure.
 */

const dockerNames = require('docker-names');
const { writeFileSync } = require('fs');

const MAX_DEPTH = 6;
const MIN_LINKS = 1;
const MAX_LINKS = 5;

const randomInt = () => Math.floor(Math.random() * (MAX_LINKS - MIN_LINKS + 1) + MIN_LINKS);

const generatePage = (title, subPageCount, parentPath, depth = 0) => {

  const path = depth === 0 ? '' : [parentPath, title].join('/');
  const subPageTitles = Array(subPageCount)
    .fill(0)
    .map(() => dockerNames.getRandomName());

  return Array.prototype.concat.apply([], [
    {
      title,
      depth,
      path: depth === 0 ? '/' : path,
      links: subPageTitles.map((subPageTitle) => [path, subPageTitle].join('/')),
    },
    ...subPageTitles
      .map((subPageTitle) => generatePage(
        subPageTitle,
        MAX_DEPTH > depth + 1
          ? randomInt()
          : 0,
        path,
        depth + 1,
      )),
  ]);

};

const pages = JSON.stringify(generatePage('home', randomInt()));

writeFileSync(`${__dirname}/pages.json`, pages);
