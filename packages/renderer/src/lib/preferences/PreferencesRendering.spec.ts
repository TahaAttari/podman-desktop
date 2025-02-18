/**********************************************************************
 * Copyright (C) 2023 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ***********************************************************************/

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-function */

import '@testing-library/jest-dom';
import { test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import type { IConfigurationPropertyRecordedSchema } from '../../../../main/src/plugin/configuration-registry';
import PreferencesRendering from './PreferencesRendering.svelte';
import { CONFIGURATION_DEFAULT_SCOPE } from '../../../../main/src/plugin/configuration-registry-constants';

beforeAll(() => {
  (window as any).getConfigurationValue = vi.fn().mockResolvedValue(true);
  (window as any).telemetryPage = vi.fn();
});

const record: IConfigurationPropertyRecordedSchema = {
  title: 'my boolean property',
  id: 'myid',
  parentId: 'key',
  type: 'boolean',
  default: true,
  description: 'record',
  scope: CONFIGURATION_DEFAULT_SCOPE,
};
const record2: IConfigurationPropertyRecordedSchema = {
  title: 'my second property',
  id: 'myid2',
  parentId: 'key',
  type: 'boolean',
  default: true,
  markdownDescription: 'record2',
  scope: CONFIGURATION_DEFAULT_SCOPE,
};
const records = [record, record2];

test('Expect to see two record if no active filter', async () => {
  render(PreferencesRendering, { properties: records, key: 'key' });
  const record2Input = screen.getByRole('checkbox', { name: 'record2' });
  expect(record2Input).toBeInTheDocument();
  const recordInput = screen.getByRole('checkbox', { name: 'record' });
  expect(recordInput).toBeInTheDocument();
});

test('Expect to see one record when filtering with boolean keyword', async () => {
  render(PreferencesRendering, { properties: records, key: 'key', searchValue: 'boolean' });
  const recordInput = screen.getByRole('checkbox', { name: 'record' });
  expect(recordInput).toBeInTheDocument();
});

test('Expect to see one record when filtering with unknown keyword', async () => {
  render(PreferencesRendering, { properties: records, key: 'key', searchValue: 'unknwon' });
  const noSettingsDiv = screen.getAllByText('No Settings Found');
  expect(noSettingsDiv.length > 0).toBe(true);
});
