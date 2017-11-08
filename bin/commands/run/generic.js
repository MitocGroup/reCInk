'use strict';

const path = require('path');
const Recink = require('../../../src/recink');
const componentsFactory = require('../../../src/component/factory');
const SequentialPromise = require('../../../src/component/helper/sequential-promise');
const ComponentRegistry = require('../component/registry/registry');
const resolvePackage = require('resolve-package');

module.exports = (args, options, logger) => {
  const recink = new Recink();

  if (options.skipModules) {
    recink.skipModules(options.skipModules.map(t => t.trim()));
  }

  let namespace = args.name;
  let disabledComponents = options.s;
  let additionalComponents = options.c;

  if (!Array.isArray(disabledComponents)) {
    disabledComponents = [ disabledComponents ].filter(Boolean);
  }

  if (!Array.isArray(additionalComponents)) {
    additionalComponents = [ additionalComponents ].filter(Boolean);
  }

  switch (namespace.toLowerCase()) {
    case 'e2e':
    case 'unit':
      namespace = namespace.toLowerCase();
      break;
    default:
      additionalComponents.push(namespace);
      namespace = 'generic';
  }

  const availableComponents = require(`./${ namespace }/components`);
  const componentRegistry = ComponentRegistry.create(
    ComponentRegistry.DEFAULT_STORAGE_PATH,
    namespace.toLowerCase()
  );

  logger.debug(
    `Initialize components registry in ${ componentRegistry.storage.registryFile }`
  );

  return componentRegistry.load()
    .then(() => {
      const additionalComponentsInstances = [];

      componentRegistry.listKeys()
        .map(component => {
          additionalComponents.push(component);
        });
      
      return SequentialPromise.all(additionalComponents.map(component => {
        return () => {
          let componentPromise;

          if (/^[a-z0-9]/i.test(component)) {
            let componentName = component;

            if (component.indexOf('recink') !== 0) {
              componentName = `recink-${ component }`;
            }

            componentPromise = resolvePackage(componentName);
          } else {
            componentPromise = Promise.resolve(path.resolve(
              process.cwd(),
              component
            ));
          }

          return componentPromise.then(componentPath => {

            if (!componentPath) {
              logger.warn(`${ logger.emoji.cross } Error initializing component ${ component }`);
              logger.error(new Error(`Unable to resolve path to ${ component } component`));

              return Promise.resolve();
            }

            try {
              const ComponentConstructor = require(componentPath);
              
              additionalComponentsInstances.push(new ComponentConstructor());
            } catch (error) {
              logger.warn(`${ logger.emoji.cross } Error initializing component ${ component }`);
              logger.error(error);
            }
              
            return Promise.resolve();
          });
        };
      })).then(() => {
        const components = availableComponents
          .filter(c => disabledComponents.indexOf(c) === -1)
          .map(c => componentsFactory[c]())
          .concat(additionalComponentsInstances);
          
        return Promise.resolve(components);
      });
    })
    .then(components => {
      const componentConfig = componentRegistry.configs;

      if (componentConfig.length > 0) {
        logger.debug(`Loading component configurations - ${ componentConfig.join(', ') }`);
      }

      return Promise.all([
        recink.components(...components),
        recink.configureExtend(
          path.join(args.path, Recink.CONFIG_FILE_NAME),
          ...componentConfig
        )
      ])
        .then(() => recink.run());
    });
};
