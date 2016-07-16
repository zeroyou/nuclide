'use strict';
/* @noflow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

/* NON-TRANSPILED FILE */
/* eslint-disable babel/func-params-comma-dangle, prefer-object-spread/prefer-object-spread */

const fs = require('fs');
const path = require('path');

const MISSING_MENU_ITEM_ERROR = 'All workspace-level Atom commands ' +
  'should have a corresponding "Nuclide" sub-menu item in the same package.';

const COMMAND_LITERAL_ERROR = 'Please use literals for Atom commands. ' +
  'This improves readability and makes command names easily greppable.';

// Commands with these prefixes will be whitelisted.
const WHITELISTED_PREFIXES = [
  'core:',
  'sample-',
];

function isCommandWhitelisted(command) {
  return WHITELISTED_PREFIXES.some(prefix => command.startsWith(prefix));
}

// Returns the values of literals and simple constant variables.
function resolveValue(node, context) {
  if (node.type === 'Literal') {
    return node.value;
  }
  if (node.type === 'Identifier') {
    const refs = context.getScope().references;
    for (let i = 0; i < refs.length; i++) {
      const ref = refs[i];
      if (ref.identifier.name === node.name) {
        if (ref.writeExpr != null) {
          return resolveValue(ref.writeExpr, context);
        }
        return null;
      }
    }
  }
  // Give up for anything more complex.
  return null;
}

const menuConfigCache = {};

// Returns a list of all JSON (we don't use CSON) configs in the "menus"
// subdirectory of the package that owns `filePath`.
function findMenuConfigs(filePath) {
  let dir = path.dirname(filePath);
  let parent = path.dirname(dir);

  while (dir !== parent) {
    const menuDir = path.join(dir, 'menus');
    if (fs.existsSync(menuDir)) {
      if (menuConfigCache[menuDir] != null) {
        return menuConfigCache[menuDir];
      }
      const configs = [];
      menuConfigCache[menuDir] = configs;
      fs.readdirSync(menuDir).forEach(configFile => {
        if (configFile.endsWith('.json')) {
          const configFilePath = path.join(menuDir, configFile);
          try {
            const contents = fs.readFileSync(configFilePath, 'utf-8');
            configs.push(JSON.parse(contents));
          } catch (e) {
            // ignore
          }
        }
      });
      return configs;
    }
    dir = parent;
    parent = path.dirname(dir);
  }

  return [];
}

function menuItemContainsCommand(item, command) {
  if (item.command != null) {
    return command === item.command;
  }
  if (item.submenu != null) {
    return item.submenu.some(subitem => menuItemContainsCommand(subitem, command));
  }
  return false;
}

function menuContainsCommand(config, command) {
  if (config.menu == null) {
    return false;
  }
  return config.menu.some(item => {
    return item.label === 'Nuclide' && menuItemContainsCommand(item, command);
  });
}

function checkLiterals(literals, context) {
  const configs = findMenuConfigs(context.getFilename());
  for (let i = 0; i < literals.length; i++) {
    if (isCommandWhitelisted(literals[i].value)) {
      continue;
    }
    if (!configs.some(config => menuContainsCommand(config, literals[i].value))) {
      context.report({
        node: literals[i],
        message: MISSING_MENU_ITEM_ERROR + ' (' + literals[i].value + ')',
      });
    }
  }
}

/**
 * Capture calls of the form:
 * - atom.commands.add('atom-workspace', 'command', callback)
 * - atom.commands.add('atom-workspace', {'command': callback, ...})
 *
 * We then look up the `command` in nearby `menus/*.cson` files.
 * Every matching commmand should have a corresponding entry somewhere.
 */
module.exports = function(context) {
  function checkCommandAddCall(node) {
    const args = node.arguments;
    if (args.length !== 2 && args.length !== 3) {
      return;
    }

    const callee = context.getSourceCode().getText(node.callee);
    if (callee !== 'atom.commands.add') {
      return;
    }

    const firstValue = resolveValue(args[0], context);
    if (firstValue == null) {
      // Another common pattern for atom.commands.add. Be lazy and just get the string..
      const stringValue = context.getSourceCode().getText(args[0]);
      if (stringValue.replace(/\s/g, '') !== 'atom.views.getView(atom.workspace)') {
        return;
      }
    } else if (firstValue !== 'atom-workspace') {
      return;
    }

    if (args[1].type === 'Literal') {
      checkLiterals([args[1]], context);
    } else if (args[1].type === 'ObjectExpression') {
      const commands = [];
      args[1].properties.forEach(prop => {
        if (prop.key.type === 'Literal') {
          commands.push(prop.key);
        }
      });
      checkLiterals(commands, context);
    } else if (resolveValue(args[1], context) !== null) {
      context.report({
        node: args[1],
        message: COMMAND_LITERAL_ERROR,
      });
    }
    // Unresolvable or dynamic expressions are ignored.
  }

  return {
    CallExpression: checkCommandAddCall,
  };
};

// For testing
exports.MISSING_MENU_ITEM_ERROR = MISSING_MENU_ITEM_ERROR;
exports.COMMAND_LITERAL_ERROR = COMMAND_LITERAL_ERROR;
