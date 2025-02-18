/**********************************************************************
 * Copyright (C) 2022-2023 Red Hat, Inc.
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

import type { Writable } from 'svelte/store';
import { writable, derived } from 'svelte/store';
import type { ImageInfo } from '../../../main/src/plugin/api/image-info';
import { findMatchInLeaves } from './search-util';

let readyToUpdate = false;

export async function fetchImages() {
  // do not fetch until extensions are all started
  if (!readyToUpdate) {
    return;
  }
  const result = await window.listImages();
  imagesInfos.set(result);
}

export const imagesInfos: Writable<ImageInfo[]> = writable([]);

export const searchPattern = writable('');

export const filtered = derived([searchPattern, imagesInfos], ([$searchPattern, $imagesInfos]) =>
  $imagesInfos.filter(imageInfo => findMatchInLeaves(imageInfo, $searchPattern.toLowerCase())),
);

// need to refresh when extension is started or stopped
window?.events?.receive('extension-started', () => {
  fetchImages();
});
window?.events?.receive('extension-stopped', () => {
  fetchImages();
});

window.addEventListener('image-build', () => {
  fetchImages();
});

window?.events?.receive('provider-change', () => {
  fetchImages();
});

window.events?.receive('image-pull-event', () => {
  fetchImages();
});
window.events?.receive('image-remove-event', () => {
  fetchImages();
});
window.events?.receive('image-build-event', () => {
  fetchImages();
});
window.events?.receive('registry-register', () => {
  fetchImages();
});

window.events?.receive('registry-unregister', () => {
  fetchImages();
});

window.events?.receive('image-tag-event', () => {
  fetchImages();
});

window.events?.receive('image-untag-event', () => {
  fetchImages();
});

window?.events?.receive('extensions-started', async () => {
  readyToUpdate = true;
  await fetchImages();
});

// if client is doing a refresh, we will receive this event and we need to update the data
window.addEventListener('extensions-already-started', async () => {
  readyToUpdate = true;
  await fetchImages();
});
