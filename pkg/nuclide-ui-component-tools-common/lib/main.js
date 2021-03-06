/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */
import {
  getComponentNameFromUri,
  getRequiredPropsFromAst,
  getDefaultPropNames,
} from './uiComponentAst';

import type {NuclideUri} from 'nuclide-commons/nuclideUri';
import type {ComponentDefinition} from './types';

export function getComponentDefinitionFromAst(
  fileUri: NuclideUri,
  ast: File,
): ?ComponentDefinition {
  // The component must have a matching file name and component.
  const componentName = getComponentNameFromUri(fileUri);
  if (componentName == null) {
    return null;
  }
  const requiredProps = getRequiredPropsFromAst(componentName, ast);
  const defaultProps = getDefaultPropNames(componentName, ast);
  return {
    name: componentName,
    requiredProps,
    defaultProps,
  };
}

export {UI_COMPONENT_TOOLS_INDEXING_GK} from './constants';
