'use strict';

const path = require('path');
const events = require('./emit/events');
const EmitModule = require('./emit/emit-module');
const SequentialPromise = require('./helper/sequential-promise');
const ConfigBasedComponent = require('./config-based-component');
const ContainerTransformer = require('./helper/container-transformer');

/**
 * Emit component
 */
class EmitComponent extends ConfigBasedComponent {
  /**
   * @param {*} args
   */
  constructor(...args) {
    super(...args);
    
    this._modules = [];
  }
  
  /**
   * @returns {String}
   */
  get name() {
    return 'emit';
  }
  
  /**
   * @param {Emitter} emitter
   * @returns {Promise}
   */
  run(emitter) {
    this._registerDebugers(emitter);
    
    emitter.emit(events.modules.process.start, this._modules, this.container);

    return SequentialPromise.all(this._modules.map(module => {
      return () => {
        return module.check()
          .then(() => emitter.emitBlocking(events.module.process.start, module, this.container))
          .then(() => module.process(this.container))
          .then(() => emitter.emitBlocking(events.module.process.end, module));
      };
    })).then(() => {
      emitter.emit(events.modules.process.end, this._modules, this.container);
    });
  }
  
  /**
   * @param {Emitter} emitter
   * @returns {Promise}
   */
  waitConfig(emitter) {
    return super.waitConfig(emitter)
      .then(container => {
        const moduleKeys = emitter.container.listKeys()
          .filter(key => key !== ConfigBasedComponent.MAIN_CONFIG_KEY);

        if (moduleKeys.length <= 0 || !container) {
          return Promise.resolve(container);
        }
        
        return Promise.all(moduleKeys.map(moduleKey => {
          return this.prepareModuleConfig(
            emitter.container.get(moduleKey),
            container
          ).then(moduleContainer => {
            const emitModule = new EmitModule(
              moduleKey, 
              moduleContainer,
              emitter,
              this.logger
            );
            
            this._modules.push(emitModule);
          });
        })).then(() => {
          this.logger.info(
            this.logger.emoji.gift,
            `Modules to emit - ${ moduleKeys.join(', ') }`
          );
          
          return Promise.resolve(container);
        });
      });
  }
  
  /**
   * @param {*} config
   * @param {String} configFile
   * @returns {Container}
   */
  prepareConfig(config, configFile) {
    return super.prepareConfig(config, configFile)
      .then(container => {
        return (new ContainerTransformer(container))
          .addPattern('pattern')
          .addPattern('ignore')
          .transform();
      });
  }
  
  /**
   * @param {*} moduleConfig
   * @param {Container} mainContainer
   * @returns {Container}
   */
  prepareModuleConfig(moduleConfig, mainContainer) {
    const container = this.createContainer(moduleConfig);
    
    return (new ContainerTransformer(container))
      .add({
        path: 'root',
        transformer: value => {
          if (path.isAbsolute(value)) {
            return Promise.resolve(value);
          }
          
          return Promise.resolve(
            path.join(mainContainer.get('__dir'), value)
          );
        },
      })
      .transform();
  }
  
  /**
   * @param {Emitter} emitter
   * @private
   */
  _registerDebugers(emitter) {
    emitter.on(events.modules.process.start, (modules, container) => {
      const modulesStr = modules.map(m => m.name).join(', ');

      this.logger.info(
        this.logger.emoji.diamond,
        `Start processing modules ${ modules.length ? '- ' + modulesStr : '' }`
      );

      this.logger.debug(container.dump());
    });
    
    emitter.on(events.modules.process.end, modules => {
      const modulesStr = modules.map(m => m.name).join(', ');

      this.logger.info(
        this.logger.emoji.magic,
        `Finish processing modules ${ modules.length ? '- ' + modulesStr : '' }`
      );
    });
    
    emitter.on(events.module.process.start, module => {
      this.logger.debug(`Start processing module ${ module.name }`);
      this.logger.debug(module.container.dump());
    });
    
    emitter.on(events.module.process.end, module => {
      this.logger.debug(`Finish processing module ${ module.name }`);
      this.logger.debug(module.dumpStats());
    });
  }
}

module.exports = EmitComponent;
